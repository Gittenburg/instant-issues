const searchInput = document.getElementById('search');
const resultsContainer = document.getElementById('results');
const repoInput = document.getElementById('repo');
const selectedLabelContainer = document.getElementById('selectedLabels');
const suggestedLabelContainer = document.getElementById('suggestedLabels');
const downstreamDatalist = document.getElementById('downstreams');

let repoData = null;
let downstreams = null;
const labelFilters = {};

let activeTab = document.querySelector('[role=tab][aria-selected=true]');

document.querySelector('[role=tablist]').addEventListener('click', e => {
	activeTab.setAttribute('aria-selected', 'false');
	activeTab = e.target;
	e.target.setAttribute('aria-selected', 'true');
	refreshResults();
	searchInput.focus();
});

document.body.addEventListener('keypress', e => {
	if (['button', 'tab'].includes(e.target.getAttribute('role')) && e.keyCode === 13) {
		e.target.click();
	}
});


suggestedLabelContainer.addEventListener('click', e => {
	selectedLabelContainer.appendChild(e.target);
	labelFilters[e.target.textContent] = true;
	searchInput.value = '';
	refreshResults();
	suggestLabels();
	searchInput.focus();
});

selectedLabelContainer.addEventListener('click', e => {
	e.target.remove();
	delete labelFilters[e.target.textContent];
	refreshResults();
	suggestLabels();
	searchInput.focus();
});

let pattern;

function suggestLabels(){
	suggestedLabelContainer.innerHTML = '';
	if (searchInput.value.length > 1){
		repoData.labels.filter(
			label =>
			(
				label.name.toLowerCase().indexOf(searchInput.value.toLowerCase()) != -1
				||
				(label.description ?? '').toLowerCase().search(pattern) != -1
			)
			&& !labelFilters[label.name]
		).forEach(label => {
			let div = document.createElement('div');
			div.className = 'label';
			div.textContent = label.name;
			div.title = label.description;
			div.tabIndex = 0;
			div.setAttribute('role', 'button');
			suggestedLabelContainer.appendChild(div);
		});
	}
}

function refreshResults(){
	resultsContainer.innerHTML = '';
	pattern = '(^| )' + searchInput.value.toLowerCase();

	(activeTab.textContent == 'Issues' ? repoData.issues : repoData.pulls)
	.filter(
		issue =>
		issue.title.toLowerCase().search(pattern) != -1
		&& Object.keys(labelFilters).filter(l => issue.labels.includes(l)).length == Object.keys(labelFilters).length
	).forEach(issue => {
		const a = document.createElement('a');
		a.href = `https://github.com/${repoData.repo}/issues/${issue.num}`;
		a.className = 'result';
		a.textContent = issue.title;
		a.target = '_blank';
		a.title = issue.labels.join(', ');
		resultsContainer.appendChild(a);
	});
}
searchInput.addEventListener('input', e => {
	refreshResults();
	suggestLabels();
});

async function loadIssues(data){
	repoData = data;
	refreshResults();
	document.body.classList.add('loaded');
	searchInput.focus();
}

(async function load(){
	downstreams = await (await fetch('https://raw.githubusercontent.com/instant-issues/instant-issues.github.io/downstreams/downstreams.json')).json();
	Object.keys(downstreams).forEach(downstream => {
		const opt = document.createElement('option');
		opt.value = downstream;
		downstreamDatalist.appendChild(opt);
	});

	const urlParams = new URL(document.location).searchParams;
	if (urlParams.has('url')){
		const res = await fetch(urlParams.get('url'));
		if (res.ok){
			loadIssues(await res.json());
		} else {
			resultsContainer.innerHTML = "couldn't load URL";
		}
	} else if (urlParams.get('repo')){
		const repo = urlParams.get('repo');
		repoInput.value = repo;
		let res = await fetch(`https://raw.githubusercontent.com/${repo}/issues/${repo}.json`);
		if (res.ok){
			loadIssues(await res.json());
		} else if (repo in downstreams){
			res = await fetch(`https://raw.githubusercontent.com/${downstreams[repo]}/issues/${repo}.json`);
			if (res.ok){
				loadIssues(await res.json());
			} else {
				resultsContainer.innerHTML = 'failed to load downstream';
			}
		} else if ((await fetch('https://api.github.com/repos/' + repo, {method: 'head'})).ok){
			resultsContainer.innerHTML = 'not yet aggregated, checkout the <a href="https://github.com/instant-issues/instant-issues.github.io#readme">the README</a> for instructions';
		} else {
			resultsContainer.innerHTML = 'repository not found';
		}
	} else {
		resultsContainer.innerHTML = 'Which repository\'s issues do you want to view?<p><a href="/?repo=zulip/zulip">Try out zulip/zulip.</a></p>';
	}
})();

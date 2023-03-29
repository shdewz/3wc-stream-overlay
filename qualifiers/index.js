let teams, beatmaps;
(async () => {
	$.ajaxSetup({ cache: false });
	teams = (await $.getJSON('teams.json'));
	beatmaps = (await $.getJSON('beatmaps.json'));
	last_team_seed = teams.length;
	init();
})();

let seed = 0;
let last_team_seed = 0;

const first_team = () => { seed = 1; update(); }
const prev_team = () => { seed = Math.max(1, seed - 1); update(); }
const next_team = () => { seed = Math.min(last_team_seed, seed + 1); update(); }
const last_team = () => { seed = last_team_seed; update(); }
const reload = () => { update(); }

const init = () => {
	seed = 0;
	document.getElementById('player-stats-right').innerHTML = '';
	const maps = beatmaps.beatmaps;
	for (let map of maps) {
		const bm = new Beatmap(map.mods, map.identifier);
		bm.generate();
	}

	update();
	$('#current-seed').html(`INITIALIZATION DONE`);
	$('#current-team').html(`READY!`);
}

const update = () => {
	$('#current-seed').html(`Seed ${seed}`);
	let team = teams.find(t => t.seed == seed);
	if (!team) team = empty_team;

	$('#current-team').html(team.team);

	$('#team-stats-seed').html(`#${team.seed}`);
	$('#team-stats-lastyear').html(team.last_year);
	$('#team-stats-placement').html(team.placement);
	$('#team-name').html(team.team);
	$('#flag').css('background-image', `url(https://assets.ppy.sh/old-flags/${team.flag}.png)`);

	for (let i = 0; i < 6; i++) {
		if (i >= team.players.length || team.seed == 0) {
			$(`#p${i + 1}-name`).html('');
			$(`#p${i + 1}-rank`).html('');
		}
		else {
			$(`#p${i + 1}-name`).html(team.players[i].username);
			$(`#p${i + 1}-rank`).html(`#${team.players[i].rank}`);
		}
	}

	const maps = beatmaps.beatmaps;
	for (let i = 0; i < maps.length; i++) {
		let map = maps[i];
		let sc = team.maps[i];
		for (let j = 0; j < 6; j++) {
			$(`#${map.identifier.toLowerCase()}-score-${j}`).html(sc.scores[j] == 0 ? '–' : sc.scores[j]?.toLocaleString() || '');
		}
		$(`#${map.identifier.toLowerCase()}-bottomscore-0`).html(sc.totals[0] == 0 ? '–' : sc.totals[0]?.toLocaleString() || '–');
		$(`#${map.identifier.toLowerCase()}-bottomscore-1`).html(sc.totals[1] == 0 ? '–' : `#${sc.totals[1]?.toLocaleString()}` || '–');
	}
}

class Beatmap {
	constructor(mod, modID) {
		this.mod = mod.toLowerCase();
		this.modID = modID.toLowerCase();
	}
	generate() {
		let container = document.getElementById('player-stats-right');

		this.map = document.createElement('div');
		this.map.id = `map-${this.modID}`;
		this.map.setAttribute('class', 'map');

		container.appendChild(this.map);
		let mapObj = document.getElementById(this.map.id);

		this.top = document.createElement('div');
		this.top.setAttribute('class', `map-section-top mod-${this.mod}`);

		this.bottom = document.createElement('div');
		this.bottom.setAttribute('class', `map-section-bottom mod-${this.mod}`);

		this.title = document.createElement('div');
		this.title.setAttribute('class', `map-title mod-${this.mod}`);
		this.title.innerHTML = this.modID.toUpperCase();

		this.scores = document.createElement('div');
		this.scores.setAttribute('class', `map-scores`);

		for (let i = 0; i < 6; i++) {
			let score = document.createElement('div');
			score.setAttribute('class', `map-score mod-${this.mod}`);
			score.id = `${this.modID}-score-${i}`
			score.innerHTML = '–';
			this.scores.appendChild(score);
		}

		this.bottomScores = document.createElement('div');
		this.bottomScores.setAttribute('class', `map-scores-bottom`);

		for (let i = 0; i < 2; i++) {
			let score = document.createElement('div');
			score.setAttribute('class', `map-score-bottom mod-${this.mod}`);
			score.id = `${this.modID}-bottomscore-${i}`
			score.innerHTML = '–';
			this.bottomScores.appendChild(score);
		}

		this.top.appendChild(this.title);
		this.top.appendChild(this.scores);
		this.bottom.appendChild(this.bottomScores);

		mapObj.appendChild(this.top);
		mapObj.appendChild(this.bottom);
	}
}

const empty_team = {
	"seed": 0,
	"team": "",
	"flag": "",
	"last_year": "",
	"placement": "",
	"players": [
		{ "username": "", "rank": 0 },
		{ "username": "", "rank": 0 },
		{ "username": "", "rank": 0 },
		{ "username": "", "rank": 0 },
		{ "username": "", "rank": 0 },
		{ "username": "", "rank": 0 }
	],
	"maps": [
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] },
		{ "scores": [0, 0, 0, 0, 0, 0], "totals": [0, 0] }
	]
}

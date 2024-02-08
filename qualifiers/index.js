let data, beatmaps;
(async () => {
	$.ajaxSetup({ cache: false });
	data = (await $.getJSON('q_data.json'));
	beatmaps = (await $.getJSON('../_data/beatmaps.json'));
	last_team_seed = data.length;
	init();
})();

let seed = 0;
let last_team_seed = 0;

const first_team = () => { seed = 1; update(); }
const prev_team = () => { seed = Math.max(1, seed - 1); update(); }
const next_team = () => { seed = Math.min(last_team_seed, seed + 1); update(); }
const last_team = () => { seed = last_team_seed; update(); }
const toggle = () => {
	if ($('#middle').css('opacity') == 1) $('#middle').css('opacity', 0);
	else $('#middle').css('opacity', 1);
}
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
	let team = data.find(t => t.seed == seed);
	if (!team) team = empty_team;

	$('#current-team').html(team.team);

	$('#team-stats-seed').html(`${team.seed}`);
	$('#team-stats-lastyear').html(team?.last_year ? `Seed ${team?.last_year}` : 'DNP');
	$('#team-stats-placement').html(team.placement);
	$('#team-name').html(team.team);
	$('#flag').css('background-image', `url(${team.flag_url})`);

	for (let i = 0; i < 6; i++) {
		if (i >= team.players.length || team.seed == 0) {
			$(`#p${i + 1}-name`).html('');
			$(`#p${i + 1}-rank`).html('');
		}
		else {
			$(`#p${i + 1}-name`).html(team.players[i].username);
			if (team.players[i].rank == -1) $(`#p${i + 1}-rank`).html('');
			else $(`#p${i + 1}-rank`).html(`<span class="prank">#${team.players[i].rank}</span> ${team.players[i].pscore.toFixed(2)}`);
		}
	}

	for (let map of team.maps) {
		for (let i = 0; i < 6; i++) {
			if (!team.players[i]) $(`#${map.identifier.toLowerCase()}-score-${i}`).html('–');
			else {
				let score = map.scores.find(s => s.username == team.players[i].username);
				$(`#${map.identifier.toLowerCase()}-score-${i}`).html(score ? score.score.toLocaleString() : '–');
			}
		}
		$(`#${map.identifier.toLowerCase()}-bottomscore-0`).html(map?.total ? map.total.toLocaleString() : '–');
		$(`#${map.identifier.toLowerCase()}-bottomscore-1`).html(map?.rank ? `#${map.rank.toLocaleString()}` : '–');
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
	seed: 0,
	team: '',
	flag: 'XX',
	flag_url: 'https://assets.ppy.sh/old-flags/XX.png',
	last_year: '',
	placement: '',
	players: [],
	maps: [
		{ identifier: 'NM1', scores: [] },
		{ identifier: 'NM2', scores: [] },
		{ identifier: 'NM3', scores: [] },
		{ identifier: 'NM4', scores: [] },
		{ identifier: 'HD1', scores: [] },
		{ identifier: 'HD2', scores: [] },
		{ identifier: 'HR1', scores: [] },
		{ identifier: 'HR2', scores: [] },
		{ identifier: 'DT1', scores: [] },
		{ identifier: 'DT2', scores: [] }
	]
}

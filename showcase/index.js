let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let image_container = document.getElementById('mapimage-container');
let strain_background = document.getElementById('strain-background');
let title = document.getElementById('title');
let diff = document.getElementById('diff');
let mapper = document.getElementById('mapper');

let len = document.getElementById('len');
let bpm = document.getElementById('bpm');
let sr = document.getElementById('sr');
let cs = document.getElementById('cs');
let ar = document.getElementById('ar');
let od = document.getElementById('od');

let replay = document.getElementById('replay');
let replay_cont = document.getElementById('replay-container');
let nowplaying = document.getElementById('nowplaying');
let nowplaying_cont = document.getElementById('nowplaying-container');

let progressChart = document.getElementById('progress');
let strain_container = document.getElementById('strain-container');

let mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	mappool = (await $.getJSON('../_data/beatmaps.json'));
})();

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let image, title_, diff_, artist_, replay_, id;
let len_, bpm_, sr_, cs_, ar_, od_, md5;
let mods, state, state2;
let strains, seek, fulltime;
let last_strain_update = 0;
let new_strains = [];
let strain_seed = 0;


socket.onmessage = async event => {
	let data = JSON.parse(event.data);

	if (state !== data.menu.state) {
		state = data.menu.state;
		if (state !== 2) {
			replay_cont.style.opacity = 0;
			nowplaying_cont.style.opacity = 0;
		}
		else {
			replay_cont.style.opacity = 1;
			nowplaying_cont.style.opacity = 1;
		}
	}

	// update now playing
	if (mappool && id !== data.menu.bm.id) {
		id = data.menu.bm.id;
		let map = mappool.beatmaps.find(m => m.beatmap_id == id);
		nowplaying.innerHTML = map ? map.identifier : 'XX';
	}

	// update replayer
	if ((!data.resultsScreen.name && replay_ !== data.gameplay.name) || (data.resultsScreen.name && replay_ !== data.resultsScreen.name)) {
		replay_ = data.resultsScreen.name || data.gameplay.name;
		replay.innerHTML = replay_ || '';
		if (replay_ && state === 2) replay_cont.style.opacity = 1;
		else replay_cont.style.opacity = 0;
	}

	// update background image
	if (image !== data.menu.bm.path.full) {
		image = data.menu.bm.path.full;
		data.menu.bm.path.full = data.menu.bm.path.full.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/');
		image_container.style.backgroundImage = `url('http://${location.host}/Songs/${data.menu.bm.path.full}')`;
		strain_background.style.backgroundImage = `url('http://${location.host}/Songs/${data.menu.bm.path.full}')`;
	}

	// update title
	if (title_ !== `${data.menu.bm.metadata.artist} - ${data.menu.bm.metadata.title}`) {
		title_ = `${data.menu.bm.metadata.artist} - ${data.menu.bm.metadata.title}`;
		title.innerHTML = title_;
	}

	// update diff/mapper
	if (diff_ !== data.menu.bm.metadata.difficulty) {
		diff_ = data.menu.bm.metadata.difficulty;
		diff.innerHTML = `[${diff_}]`;
		mapper.innerHTML = data.menu.bm.metadata.mapper;
	}

	// update map stats
	if (mappool && (md5 !== data.menu.bm.md5 || (mods !== state2 == 7 ? data.resultsScreen.mods.str : data.menu.mods.str) || state2 !== data.menu.state)) {
		let map = mappool ? mappool.beatmaps.find(m => m.beatmap_id == data.menu.bm.id) || { id: data.menu.bm.id, mods: 'NM', identifier: '', sr: 0.00 } : { mods: 'NM' };
		md5 = data.menu.bm.md5;
		state2 = data.menu.state;
		mods = state2 == 7 ? data.resultsScreen.mods.str : data.menu.mods.str;

		if (state2 == 7) {
			stats = getModStats(data.menu.bm.stats.CS, data.menu.bm.stats.AR, data.menu.bm.stats.OD, data.menu.bm.stats.BPM.max, mods);
			bpm.innerHTML = Math.floor(stats.bpm);
			sr.innerHTML = map?.sr ? map?.sr + ' ★' || 0.00 : data.menu.bm.stats.fullSR.toFixed(2) + ' ★';
			cs.innerHTML = stats.cs;
			ar.innerHTML = stats.ar;
			od.innerHTML = stats.od;
		}
		else {
			bpm.innerHTML = Math.round(data.menu.bm.stats.BPM.max * 10) / 10;
			sr.innerHTML = map?.sr && mods.includes(map?.mods) ? map?.sr + ' ★' || 0.00 : data.menu.bm.stats.fullSR.toFixed(2) + ' ★';
			cs.innerHTML = Math.round(data.menu.bm.stats.CS * 10) / 10;
			ar.innerHTML = Math.round(data.menu.bm.stats.AR * 10) / 10;
			od.innerHTML = Math.round(data.menu.bm.stats.OD * 10) / 10;
		}

		let length_modifier = mods.includes('DT') ? 1.5 : 1;
		len_ = data.menu.bm.time.full - data.menu.bm.time.firstObj;
		let mins = Math.trunc((len_ / length_modifier) / 1000 / 60);
		let secs = Math.trunc((len_ / length_modifier) / 1000 % 60);
		len.innerHTML = `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	if (window.strainGraph && strain_seed !== data.menu.pp.strains.length * data.menu.pp.strains[Math.floor(data.menu.pp.strains.length / 2)]) {
		strain_seed = data.menu.pp.strains.length * data.menu.pp.strains[Math.round(data.menu.pp.strains.length / 2)] || 0;
		strains = data.menu.pp.strains || null;
		if (!strains || strains.length < 5) {
			document.getElementById('strains').style.visibility = 'hidden';
			document.getElementById('strainsProgress').style.visibility = 'hidden';
			return;
		}
		else {
			document.getElementById('strains').style.visibility = 'visible';
			document.getElementById('strainsProgress').style.visibility = 'visible';
		}

		let temp_strains = smooth(data.menu.pp.strains, 3);
		new_strains = [];
		for (let i = 0; i < Math.min(temp_strains.length, 400); i++) {
			new_strains.push(temp_strains[Math.floor(i * (temp_strains.length / Math.min(temp_strains.length, 400)))]);
		}

		config.data.datasets[0].data = new_strains;
		config.data.labels = new_strains;
		config.options.scales.y.max = Math.max(...new_strains) * 1.3;
		configProgress.data.datasets[0].data = new_strains;
		configProgress.data.labels = new_strains;
		configProgress.options.scales.y.max = Math.max(...new_strains) * 1.3;
		window.strainGraph.update();
		window.strainGraphProgress.update();
	}

	let now = Date.now();
	if (fulltime !== data.menu.bm.time.mp3) { fulltime = data.menu.bm.time.mp3; onepart = 1420 / fulltime; }
	if (seek !== data.menu.bm.time.current && fulltime !== undefined && fulltime != 0 && now - last_strain_update > 500) {
		last_strain_update = now;
		seek = data.menu.bm.time.current;
		let width = onepart * seek + 'px';
		progressChart.style.width = width;
	}
}

window.onload = function () {
	let ctx = document.getElementById('strains').getContext('2d');
	window.strainGraph = new Chart(ctx, config);

	let ctxProgress = document.getElementById('strainsProgress').getContext('2d');
	window.strainGraphProgress = new Chart(ctxProgress, configProgress);
};

let config = {
	type: 'line',
	data: {
		labels: [],
		datasets: [{
			borderColor: 'rgba(5, 5, 5, 0)',
			backgroundColor: 'rgba(255, 255, 255, 0.1)',
			data: [],
			fill: true,
		}]
	},
	options: {
		tooltips: { enabled: false },
		legend: { display: false, },
		elements: { point: { radius: 0 } },
		responsive: false,
		scales: {
			x: { display: false, },
			y: {
				display: false,
				min: 0,
				max: 100
			}
		},
		animation: { duration: 0 }
	}
}

let configProgress = {
	type: 'line',
	data: {
		labels: [],
		datasets: [{
			borderColor: 'rgba(245, 245, 245, 0)',
			backgroundColor: 'rgba(255, 255, 255, 0.1)',
			data: [],
			fill: true,
		}]
	},
	options: {
		tooltips: { enabled: false },
		legend: { display: false, },
		elements: { point: { radius: 0 } },
		responsive: false,
		scales: {
			x: { display: false, },
			y: {
				display: false,
				min: 0,
				max: 100
			}
		},
		animation: { duration: 0 }
	}
}

const getModStats = (cs_raw, ar_raw, od_raw, bpm_raw, mods) => {
	mods = mods.replace('NC', 'DT');
	mods = mods.replace('FM', 'HR');

	let speed = mods.includes('DT') ? 1.5 : mods.includes('HT') ? 0.75 : 1;
	let ar = mods.includes('HR') ? ar_raw * 1.4 : mods.includes('EZ') ? ar_raw * 0.5 : ar_raw;

	let ar_ms = Math.max(Math.min(ar <= 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5), 1800), 450) / speed;
	ar = ar <= 5 ? (1800 - ar_ms) / 120 : 5 + (1200 - ar_ms) / 150;

	let cs = Math.round(Math.min(mods.includes('HR') ? cs_raw * 1.3 : mods.includes('EZ') ? cs_raw * 0.5 : cs_raw, 10) * 10) / 10;

	let od = mods.includes('HR') ? od_raw * 1.4 : mods.includes('EZ') ? od_raw * 0.5 : od_raw;
	od = Math.round(Math.min((79.5 - Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * od))) / speed) / 6, 11) * 10) / 10;

	return {
		cs: Math.round(cs * 10) / 10,
		ar: Math.round(ar * 10) / 10,
		od: Math.round(od * 10) / 10,
		bpm: Math.round(bpm_raw * speed * 10) / 10,
		speed
	}
}

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
	mappool = (await $.getJSON('../_data/beatmaps.json')).beatmaps;
})();

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let image, title_, diff_, artist_, replay_, id, md5;
let len_, bpm_, sr_, cs_, ar_, od_;
let strains, seek, fulltime;
let state;
let last_strain_update = 0;
let update_stats = false;
let update_stats_check = true;


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

	if (update_stats_check && mappool && (id !== data.menu.bm.id || md5 !== data.menu.bm.md5)) {
		update_stats_check = false;
		await delay(500);
		update_stats = true;
		update_stats_check = true;
	}

	// update now playing
	if (update_stats) {
		update_stats = false;
		let map = mappool.find(m => m.beatmap_id === id || m.md5 === md5);
		await delay(200);
		id = data.menu.bm.id;
		md5 = data.menu.bm.md5;
		nowplaying.innerHTML = map ? map.identifier : 'XX';

		bpm_ = map?.bpm || data.menu.bm.stats.BPM.max;
		sr_ = map?.sr || data.menu.bm.stats.fullSR;
		cs_ = data.menu.bm.stats.CS;
		cs_base = data.menu.bm.stats.memoryCS;
		ar_ = data.menu.bm.stats.AR;
		ar_base = data.menu.bm.stats.memoryAR;
		od_ = data.menu.bm.stats.OD;
		od_base = data.menu.bm.stats.memoryOD;

		let mod_ = map?.mods || 'NM';
		let stats = getModStats(cs_base, ar_base, od_base, 0, mod_);

		console.log({cs_base, ar_base, od_base, stats});
		bpm.innerHTML = Math.round(bpm_ * 10) / 10;
		cs.innerHTML = Math.round((mod_ == 'FM' ? cs_base : map ? stats.cs : cs_) * 10) / 10;
		ar.innerHTML = Math.round((mod_ == 'FM' ? ar_base : map ? stats.ar : ar_) * 10) / 10;
		od.innerHTML = Math.round((mod_ == 'FM' ? od_base : map ? stats.od : od_) * 10) / 10;
		sr.innerHTML = sr_.toFixed(2) + '★';

		let length_modifier = map ? (mod_?.includes('DT') ? 1.5 : 1) : data.resultsScreen.mods.str.includes('DT') || data.menu.mods.str.includes('DT') ? 1.5 : 1;
		len_ = data.menu.bm.time.full - data.menu.bm.time.firstObj;
		let mins = Math.trunc((len_ / length_modifier) / 1000 / 60);
		let secs = Math.trunc((len_ / length_modifier) / 1000 % 60);
		len.innerHTML = `${mins}:${secs.toString().padStart(2, '0')}`;

		if (map?.beatmapset_id && map?.beatmapset_id !== 334460) {
			image_container.style.backgroundImage = `url('https://assets.ppy.sh/beatmaps/${map?.beatmapset_id}/covers/cover@2x.jpg')`;
			strain_background.style.backgroundImage = `url('https://assets.ppy.sh/beatmaps/${map?.beatmapset_id}/covers/cover@2x.jpg')`;
		}
		else {
			let path = data.menu.bm.path.full.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/');
			image_container.style.backgroundImage = `url('http://${location.host}/Songs/${path}')`;
			strain_background.style.backgroundImage = `url('http://${location.host}/Songs/${path}')`;
		}
	}

	// update replayer
	if ((!data.resultsScreen.name && replay_ !== data.gameplay.name) || (data.resultsScreen.name && replay_ !== data.resultsScreen.name)) {
		replay_ = data.resultsScreen.name || data.gameplay.name;
		replay.innerHTML = replay_ || '';
		if (replay_ && state === 2) replay_cont.style.opacity = 1;
		else replay_cont.style.opacity = 0;
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

	// update strains
	if (strains != JSON.stringify(data.menu.pp.strains) && window.strainGraph) {
		strains = JSON.stringify(data.menu.pp.strains) || null;

		let temp_strains = smooth(data.menu.pp.strains, 3);
		let new_strains = [];
		for (let i = 0; i < Math.min(temp_strains.length, 100); i++) {
			new_strains.push(temp_strains[Math.floor(i * (temp_strains.length / Math.min(temp_strains.length, 100)))]);
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
	if (seek !== data.menu.bm.time.current && fulltime !== undefined && fulltime != 0 && now - last_strain_update > 200) {
		last_strain_update = now;
		seek = data.menu.bm.time.current;
		let maskPosition = `${-1420 + onepart * seek}px 0px`;
		progressChart.style.maskPosition = maskPosition;
		progressChart.style.webkitMaskPosition = maskPosition;
	}
}

const delay = async time => new Promise(resolve => setTimeout(resolve, time));

const getModStats = (cs_raw, ar_raw, od_raw, hp_raw, mods) => {
	let speed = mods.includes('DT') ? 1.5 : mods.includes('HT') ? 0.75 : 1;
	let ar = mods.includes('HR') ? ar_raw * 1.4 : mods.includes('EZ') ? ar_raw * 0.5 : ar_raw;
	let ar_ms = Math.max(Math.min(ar <= 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5), 1800), 450) / speed;
	ar = ar_ms > 1200 ? (1800 - ar_ms) / 120 : 5 + (1200 - ar_ms) / 150;

	let cs = Math.min(mods.includes('HR') ? cs_raw * 1.3 : mods.includes('EZ') ? cs_raw * 0.5 : cs_raw, 10);
	let hp = Math.min(mods.includes('HR') ? hp_raw * 1.4 : mods.includes('EZ') ? hp_raw * 0.5 : hp_raw, 10);

	let od = mods.includes('HR') ? Math.min(od_raw * 1.4, 10) : mods.includes('EZ') ? od_raw * 0.5 : od_raw;
	od = Math.min((79.5 - (Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * od))) / speed)) / 6, speed > 1.5 ? 12 : 11);

	return { cs, ar, od, hp, ar_ms }
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
			borderColor: 'rgba(200, 200, 200, 0)',
			borderWidth: 1,
			backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
			borderColor: 'rgba(70, 100, 70, 0)',
			backgroundColor: 'rgba(200, 200, 200, 0.1)',
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

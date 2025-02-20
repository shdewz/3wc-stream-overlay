const socket = new ReconnectingWebSocket('ws://' + location.host + '/websocket/v2');

let mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	let stage = await $.getJSON('../_data/beatmaps.json');
	mappool = stage.beatmaps;
	if (mappool) $('#stage_name').html(`${stage.stage} MAPPOOL SHOWCASE`).css('opacity', 1);
	else $('#stage_name').html('').css('opacity', 0);
})();

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

const cache = {
	update_stats: false,
	stats_updated: false
};

socket.onmessage = async event => {
	let data = JSON.parse(event.data);

	if (cache.state !== data.state.number) {
		cache.state = data.state.number;
		if (cache.state !== 2) $('#header').css('opacity', 0);
		else $('#header').css('opacity', 1);
	}

	if (mappool && cache.md5 !== data.beatmap.checksum && !cache.stats_updated) {
		cache.md5 = data.beatmap.checksum;
		cache.stats_updated = true;
		setTimeout(() => { cache.update_stats = true; }, 500);
	}

	if (cache.update_stats) {
		cache.stats_updated = false;
		cache.update_stats = false;

		const map = mappool.find(m => m.beatmap_id === data.beatmap.id || m.md5 === cache.md5);
		$('#now_playing').html(map?.identifier ?? 'XX');

		const mod_ = map?.mods || 'NM';
		const stats = getModStats(data.beatmap.stats.cs.original, data.beatmap.stats.ar.original, data.beatmap.stats.od.original, 0, mod_);

		$('#bpm').html(Math.round((map?.bpm || data.beatmap.stats.bpm.common) * 10) / 10);
		$('#cs').html(Math.round((mod_ == 'FM' ? data.beatmap.stats.cs.original : map ? stats.cs : data.beatmap.stats.cs.converted) * 10) / 10);
		$('#ar').html(Math.round((mod_ == 'FM' ? data.beatmap.stats.ar.original : map ? stats.ar : data.beatmap.stats.ar.converted) * 10) / 10);
		$('#od').html(Math.round((mod_ == 'FM' ? data.beatmap.stats.od.original : map ? stats.od : data.beatmap.stats.od.converted) * 10) / 10);
		$('#sr').html((map?.sr || data.beatmap.stats.stars.total).toFixed(2) + '★');

		let length_modifier = map ? (mod_?.includes('DT') ? 1.5 : 1) : data.resultsScreen.mods.name.includes('DT') || data.play.mods.name.includes('DT') ? 1.5 : 1;
		len_ = data.beatmap.time.lastObject - data.beatmap.time.firstObject;
		let mins = Math.trunc((len_ / length_modifier) / 1000 / 60);
		let secs = Math.trunc((len_ / length_modifier) / 1000 % 60);
		$('#length').html(`${mins}:${secs.toString().padStart(2, '0')}`);

		if (map?.beatmapset_id) {
			$('#map_background').css('background-image', `url('https://assets.ppy.sh/beatmaps/${map?.beatmapset_id}/covers/cover@2x.jpg')`);
			$('#map_stats_background').css('background-image', `url('https://assets.ppy.sh/beatmaps/${map?.beatmapset_id}/covers/cover@2x.jpg')`);
		}
		else {
			const path = `http://${location.host}/Songs/${data.folders.beatmap}/${data.files.background}`.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/');
			$('#map_stats_background').css('background-image', `url('${path}')`);
			$('#map_background').css('background-image', `url('${path}')`);
		}

		if (map?.custom) { $('#custom_mapper').text(map?.mapper ?? data.beatmap.mapper); $('#custom').css('display', 'flex').css('opacity', 1); }
		else { $('#custom_mapper').text(''); $('#custom').css('display', 'none').css('opacity', 0); }

		if (map?.original) { $('#custom_artist').text(map?.artist ?? data.beatmap.artist); $('#original').css('display', 'flex').css('opacity', 1); }
		else { $('#custom_artist').text(''); $('#original').css('display', 'none').css('opacity', 0); }

		$('#mapper').text(map?.mapper ?? data.beatmap.mapper);
	}

	if (cache.replayer !== data.play.playerName) {
		cache.replayer = data.play.playerName;
		$('#replayer').html(cache.replayer ?? 'Unknown');
	}

	if (cache.artist !== data.beatmap.artist) { cache.artist = data.beatmap.artist; $('#artist').text(cache.artist); }
	if (cache.title !== data.beatmap.title) { cache.title = data.beatmap.title; $('#title').text(cache.title); }
	if (cache.difficulty !== data.beatmap.version) { cache.difficulty = data.beatmap.version; $('#difficulty').text(cache.difficulty); }
}

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

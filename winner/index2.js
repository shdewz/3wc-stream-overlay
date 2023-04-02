let teams = null;
let mappool = null;
let points_r, points_b;
(async () => {
	$.ajaxSetup({ cache: false });
	teams = await $.getJSON('../_data/teams.json');
	mappool = await $.getJSON('../_data/beatmaps.json');
	document.getElementById('stage').innerHTML = mappool.stage.toUpperCase();
})();

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let title = document.getElementById('title');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempTime, tempMapName;

socket.onmessage = event => {
	let data = JSON.parse(event.data);

	if (tempMapName !== `${data.menu.bm.metadata.artist} - <b>${data.menu.bm.metadata.title}</b>`) {
		tempMapName = `${data.menu.bm.metadata.artist} - <b>${data.menu.bm.metadata.title}</b>`;
		title.innerHTML = `<span id="note">♪</span> ${tempMapName}`;
	}

	if (teams && (points_r !== data.tourney.manager.stars.left || points_b !== data.tourney.manager.stars.right)) {
		points_r = data.tourney.manager.stars.left;
		points_b = data.tourney.manager.stars.right;
		let winner = teams.find(t => t.name === (points_r < points_b ? data.tourney.manager.teamName.right : data.tourney.manager.teamName.left));

		if (winner) {
			document.getElementById('red-team').innerHTML = winner.name;
			document.getElementById('red-flag').src = `https://assets.ppy.sh/old-flags/${winner.flag}.png`;
			for (let i = 0; i < 6; i++) {
				let player = winner.players[i]?.username || '';
				document.getElementById(`red-player-${i + 1}`).innerHTML = player;
			}
		}
	}
}

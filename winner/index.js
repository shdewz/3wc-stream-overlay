let teams = null;
let mappool = null;
let points_r, points_b;
(async () => {
	$.ajaxSetup({ cache: false });
	teams = await $.getJSON('../_data/teams.json');
	mappool = await $.getJSON('../_data/beatmaps.json');
	document.getElementById('stage-name').innerHTML = mappool.stage.toUpperCase();
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
		let red = teams.find(t => t.name === data.tourney.manager.teamName.left);
		let blue = teams.find(t => t.name === data.tourney.manager.teamName.right);

		if (red && blue) {
			document.getElementById('red-team').innerHTML = red.name;
			document.getElementById('red-flag').src = `https://assets.ppy.sh/old-flags/${red.flag}.png`;
			document.getElementById('blue-team').innerHTML = blue.name;
			document.getElementById('blue-flag').src = `https://assets.ppy.sh/old-flags/${blue.flag}.png`;
			document.getElementById('score').innerHTML = `${points_r} – ${points_b}`;
			for (let i = 0; i < 6; i++) {
				let player = red.players[i]?.username || '';
				document.getElementById(`red-player-${i + 1}`).innerHTML = player;
			}
			for (let i = 0; i < 6; i++) {
				let player = blue.players[i]?.username || '';
				document.getElementById(`blue-player-${i + 1}`).innerHTML = player;
			}
		}
	}
}

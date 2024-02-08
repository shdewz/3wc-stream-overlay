let desc = document.getElementById('title-desc');

let socket = new ReconnectingWebSocket('ws://' + location.host + '/ws');

let title = document.getElementById('title');
let time = document.getElementById('time');
let timer = document.getElementById('timer');

socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let tempMapName;

socket.onmessage = event => {
	let data = JSON.parse(event.data);

	if (tempMapName !== `${data.menu.bm.metadata.artist} - <b>${data.menu.bm.metadata.title}</b>`) {
		tempMapName = `${data.menu.bm.metadata.artist} - <b>${data.menu.bm.metadata.title}</b>`;
		title.innerHTML = `<span id="note">♪</span> ${tempMapName}`;
	}
}

let width = 180;
let height = 180;

let box = document.getElementById('dvd'),
	xMin = 1220,
	yMin = -1080,
	xMax = 1920 - width,
	yMax = -height,
	translateX = 1300,
	translateY = -900,
	request = null,
	direction = 'ne',
	speed = 1.5,
	timeout = null;

const init = () => { request = requestAnimationFrame(init); move(); }
const move = () => { setDirection(); box.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)` }

const setDirection = () => {
	switch (direction) {
		case 'ne':
			translateX += speed;
			translateY -= speed;
			break;
		case 'nw':
			translateX -= speed;
			translateY -= speed;
			break;
		case 'se':
			translateX += speed;
			translateY += speed;
			break;
		case 'sw':
			translateX -= speed;
			translateY += speed;
			break;
	}
	setLimits();
}

const setLimits = () => {
	if (translateY <= yMin) {
		if (direction == 'nw') direction = 'sw';
		else if (direction == 'ne') direction = 'se';
	}
	if (translateY >= yMax) {
		if (direction == 'se') direction = 'ne';
		else if (direction == 'sw') direction = 'nw';
	}
	if (translateX <= xMin) {
		if (direction == 'nw') direction = 'ne';
		else if (direction == 'sw') direction = 'se';
	}
	if (translateX >= xMax) {
		if (direction == 'ne') direction = 'nw';
		else if (direction == 'se') direction = 'sw';
	}
}

init();
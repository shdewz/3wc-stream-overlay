const socket = new ReconnectingWebSocket('ws://localhost:62932');

socket.onopen = () => { console.log('Successfully Connected'); };

socket.onmessage = async event => {
	const data = JSON.parse(event.data);
    
    if (data.command === 'state') {
        const artist = data.value.currentArtists.map(e => e.name).join(', ');
        const title = data.value.currentTrack.name;
        const albumURL = data.value.currentAlbum.image_medium;

        $('#artist').text(artist);
        $('#track').text(title);
        $('#album').css('background-image', `url('${albumURL}')`);
    }
}
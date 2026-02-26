const params = new URLSearchParams(window.location.search);
const useOsu = params.get('useOsu') || false;
const cache = {};

const socket = new ReconnectingWebSocket(
  useOsu ? `ws://${location.host}/websocket/v2` : 'ws://localhost:62932'
);
socket.onopen = () => {
  console.log('Successfully Connected');
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (useOsu) {
    // osu
    if (cache.checksum !== data.beatmap.checksum) {
      cache.checksum = data.beatmap.checksum;
      $('#artist').text(data.beatmap.artist);
      $('#track').text(data.beatmap.title);
      const path =
        `http://${location.host}/Songs/${data.folders.beatmap}/${data.files.background}`
          .replace(/#/g, '%23')
          .replace(/%/g, '%25')
          .replace(/\\/g, '/')
          .replace(/'/g, `\\'`);
      $('#album').css('background-image', `url('${path}')`);
    }
  } else {
    // spotify
    if (data.command === 'state') {
      const artist = data.value.currentArtists.map((e) => e.name).join(', ');
      const title = data.value.currentTrack.name;
      const albumURL = data.value.currentAlbum.image_medium;

      $('#artist').text(artist);
      $('#track').text(title);
      $('#album').css('background-image', `url('${albumURL}')`);
    }
  }
};

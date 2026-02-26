let comingup, teams, mappool;
(async () => {
  $.ajaxSetup({ cache: false });
  comingup = await $.getJSON('../../_data/coming_up.json');
  teams = await $.getJSON('../../_data/teams.json');
  mappool = await $.getJSON('../../_data/beatmaps.json');
  $('#stage').text(mappool.stage);
})();

const cache = {};

const socket = new ReconnectingWebSocket(`ws://${location.host}/websocket/v2`);
socket.onopen = () => {
  console.log('Successfully Connected');
};
socket.onclose = (event) => {
  console.log('Socket Closed Connection: ', event);
  socket.send('Client Closed!');
};
socket.onerror = (error) => {
  console.log('Socket Error: ', error);
};

const update_team = (color, team) => {
  $(`#name_${color}`).text(team.team);
  $(`#flag_${color}`).css(
    'background-image',
    `url('../../_shared/assets/flags/${team.flag}.png')`
  );
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (
    teams &&
    (cache.points_r !== data.tourney.points.left ||
      cache.points_b !== data.tourney.points.right)
  ) {
    cache.points_r = data.tourney.points.left;
    cache.points_b = data.tourney.points.right;
    const red_team = teams.find((team) => team.team === data.tourney.team.left);
    const blue_team = teams.find(
      (team) => team.team === data.tourney.team.right
    );

    if (red_team && blue_team) {
      update_team('red', red_team);
      update_team('blue', blue_team);
      $('#score_red').text([cache.points_r]);
      $('#score_blue').text([cache.points_b]);
    }
  }
};

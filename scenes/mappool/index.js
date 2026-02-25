const obsGetCurrentScene = window.obsstudio?.getCurrentScene ?? (() => { });
const obsGetScenes = window.obsstudio?.getScenes ?? (() => { });
const obsSetCurrentScene = window.obsstudio?.setCurrentScene ?? (() => { });
const obsGetControlLevel = window.obsstudio?.getControlLevel ?? (() => { });

const scenes = {
    gameplay: 'gameplay',
    mappool: 'mappool'
};

const pick_to_transition_delay_ms = 10000;

window.addEventListener('contextmenu', (e) => e.preventDefault());

const beatmaps = new Set();
let mappool;
(async () => {
    $.ajaxSetup({ cache: false });
    mappool = await $.getJSON('../../_data/beatmaps.json');
})();

const socket = new ReconnectingWebSocket(`ws://${location.host}/websocket/v2`);
socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

const toggles = {
    enableAutoAdvance: false,
    enableAutoPick: false
};

const cache = {
    currentPicker: 'red'
};
let selectedMaps = [];

const sceneCollection = document.getElementById('sceneCollection');

let autoadvance_timer_container = document.getElementById('autoAdvanceTimer');
let autoadvance_timer_label = document.getElementById('autoAdvanceTimerLabel');
let autoadvance_timer_time = new CountUp('autoAdvanceTimerTime', 10, 0, 1, 10, { useEasing: false, suffix: 's' });
autoadvance_timer_container.style.opacity = '0';

let sceneTransitionTimeoutID;
let lastState;
let selectedMapsTransitionTimeout = {};

/**
 * @typedef {number} Level - The level of permissions.
 * 0 for NONE,
 * 1 for READ_OBS (OBS data),
 * 2 for READ_USER (User data),
 * 3 for BASIC,
 * 4 for ADVANCED
 * 5 for ALL
 */
obsGetControlLevel(level => {
    // don't display auto advance if access level to OBS isn't sufficient
    if (level < 4) $('#autoAdvanceSection').css('display', 'none');
});

obsGetScenes(scenes => {
    if (scenes === null) return;

    for (const scene of scenes) {
        const clone = document.getElementById('sceneButtonTemplate').content.cloneNode(true);
        const buttonNode = clone.querySelector('div');
        buttonNode.id = `scene__${scene}`;
        buttonNode.textContent = `GO TO: ${scene}`;
        buttonNode.onclick = function () { obsSetCurrentScene(scene); };
        sceneCollection.appendChild(clone);
    }

    obsGetCurrentScene((scene) => { $(`#scene__${scene.name}`).addClass('activeScene'); });
});

window.addEventListener('obsSceneChanged', function (event) {
    if (!toggles.enableAutoAdvance) return;

    let activeButton = document.getElementById(`scene__${event.detail.name}`);
    for (const scene of sceneCollection.children) {
        scene.classList.remove('activeScene');
    }
    activeButton.classList.add('activeScene');
});

class Beatmap {
    constructor(beatmap) {
        this.id = beatmap.beatmap_id;
        this.beatmap = beatmap;
    }
    generate() {
        this.parent = $('<div></div>').addClass('map').attr('id', `map-${this.beatmap.identifier.toLowerCase()}`);
        const image = $('<div></div>').addClass('map-image').css('background-image', `url('https://assets.ppy.sh/beatmaps/${this.beatmap.beatmapset_id}/covers/cover.jpg?1')`);
        this.parent.append($('<div></div>').addClass('map-image-container').append($('<div></div>').addClass('map-image-container-inside').append(image)));

        const content = $('<div></div>').addClass('map-content');
        this.picked_by_label = $('<div></div>').addClass('picked-by-label').attr('id', `picked-by-label-${this.beatmap.identifier.toLowerCase()}`);
        content.append(this.picked_by_label);
        this.mod_icon = $('<div></div>').addClass(`mod-icon ${this.beatmap.mods.toLowerCase()}`).text(this.beatmap.identifier.toUpperCase());
        content.append(this.mod_icon);

        const stats = $('<div></div>').addClass('map-stats');
        stats.append($('<div></div>').addClass('map-stats-section map-top').append($('<div></div>').addClass('map-title').text(`${this.beatmap.artist} - ${this.beatmap.title}`)));
        const bottom = $('<div></div>').addClass('map-stats-section map-bottom');
        bottom.append($('<div></div>').addClass('map-difficulty-container').append($('<div></div>').addClass('map-difficulty').text(this.beatmap.difficulty)));
        bottom.append($('<div></div>').addClass('map-mapper').text(this.beatmap.mapper));
        stats.append(bottom);
        content.append(stats);
        this.parent.append(content);

        this.blink_overlay = $('<div></div>').addClass('blink-overlay');
        this.parent.append(this.blink_overlay);
        this.parent.append($('<div></div>').addClass('noise'));
        if (this.beatmap.custom) {
            this.parent.append($('<div></div>').addClass('custom-label').text(this.beatmap.original ? 'ORIGINAL!' : 'CUSTOM!'));
        }
        $(`#mod-container-${this.beatmap.mods.toLowerCase()}`).append(this.parent);
    }
};

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (mappool && !cache.hasSetup) setupBeatmaps();

    if (cache.redName !== data.tourney.team.left && data.tourney.team.left) {
        cache.redName = data.tourney.team.left || 'Red Team';
    }

    if (cache.blueName !== data.tourney.team.right && data.tourney.team.right) {
        cache.blueName = data.tourney.team.right || 'Blue Team';
    }

    if (mappool && cache.beatmap_id !== data.beatmap.id && data.beatmap.id !== 0) {
        if (!cache.beatmap_id) cache.beatmap_id = data.beatmap.id;
        else {
            cache.beatmap_id = data.beatmap.id;
            const pickedMap = Array.from(beatmaps).find(b => b.id === cache.beatmap_id);
            if (pickedMap && toggles.enableAutoPick && !selectedMaps.includes(cache.beatmap_id)) pickMap(pickedMap, cache.currentPicker === 'red' ? cache.redName : cache.blueName, cache.currentPicker);
        }
    }

    await transitionToMappool(data);
};

const transitionToMappool = async (data) => {
    const newState = data.tourney.ipcState;
    if (toggles.enableAutoAdvance) {
        if (cache.lastState === TourneyState.Ranking && newState === TourneyState.Idle) {
            sceneTransitionTimeoutID = setTimeout(() => {
                obsGetCurrentScene((scene) => {
                    if (scene.name !== scenes.gameplay) return; // e.g. on winner screen
                    obsSetCurrentScene(scenes.mappool);
                });
            }, 1000);
        }
        if (cache.lastState !== newState && newState !== TourneyState.Idle) {
            clearTimeout(sceneTransitionTimeoutID);
        }
    }
    cache.lastState = newState;
};

const setupBeatmaps = async () => {
    cache.hasSetup = true;
    const maps = mappool.beatmaps;
    if (!maps || maps.length === 0) return;

    localStorage.setItem('current_pick', '');
    $('#mappool_container').html('');
    for (const mod of [... new Set(maps.map(b => b.mods))]) {
        $('#mappool_container').append($('<div></div>').addClass('mod-container').attr('id', `mod-container-${mod.toLowerCase()}`));
    }

    for (const beatmap of maps) {
        const bm = new Beatmap(beatmap);
        bm.generate();
        bm.parent.on('click', event => {
            if (!event.originalEvent.shiftKey) event.originalEvent.ctrlKey ? banMap(bm, cache.redName, 'red') : pickMap(bm, cache.redName, 'red');
            else resetMap(bm);
        });
        bm.parent.on('contextmenu', event => {
            if (!event.originalEvent.shiftKey) event.originalEvent.ctrlKey ? banMap(bm, cache.blueName, 'blue') : pickMap(bm, cache.blueName, 'blue');
            else resetMap(bm);
        });
        beatmaps.add(bm);
    }
};

const getDataSet = (stored_beatmaps, beatmap_id) => stored_beatmaps.find(b => b.beatmap_id == beatmap_id) || null;

const pickMap = (bm, teamName, color) => {
    console.log(`picking`);
    if (cache.lastPicked) cache.lastPicked.blink_overlay.css('animation', 'none');
    cache.lastPicked = bm;
    switchPick(color);

    if (bm.beatmap.mods.includes('TB')) {
        localStorage.setItem('current_pick', '');
        bm.parent.addClass(`picked`).removeClass('banned red blue');
        bm.picked_by_label.text('Tiebreaker').addClass(`picked`).removeClass('banned red blue');
    }
    else {
        localStorage.setItem('current_pick', `${bm.id}/${color.toLowerCase()}`);
        bm.parent.addClass(`picked ${color}`).removeClass(`banned ${opposite_team(color)}`);
        bm.picked_by_label.text(`Picked by ${teamName}`).addClass(`picked ${color}`).removeClass(`banned ${opposite_team(color)}`);
    }

    bm.mod_icon.removeClass('banned');
    bm.blink_overlay.css('animation', 'blinker 1s cubic-bezier(.36,.06,.01,.57) 300ms 8, slowPulse 5000ms ease-in-out 8000ms 18');
    selectedMaps.push(bm.id);

    if (toggles.enableAutoAdvance) {
        // idempotent on pick color (none/red/blue). Consider making it idempotent on pick state? (not picked/picked)
        if (selectedMapsTransitionTimeout[bm.id]?.color !== color) {
            clearTimeout(selectedMapsTransitionTimeout[bm.id]?.timeoutId)
            selectedMapsTransitionTimeout[bm.id] = {
                color: color,
                timeoutId: setTimeout(() => {
                    obsSetCurrentScene(scenes.gameplay);
                    autoadvance_timer_container.style.opacity = '0';
                }, pick_to_transition_delay_ms)
            };

            autoadvance_timer_time = new CountUp('autoAdvanceTimerTime',
                pick_to_transition_delay_ms / 1000, 0, 1, pick_to_transition_delay_ms / 1000,
                { useEasing: false, suffix: 's' });
            autoadvance_timer_time.start();
            autoadvance_timer_container.style.opacity = '1';
            autoadvance_timer_label.textContent = `Switching to ${scenes.gameplay} in`;
        }
    }
};

const banMap = (bm, teamName, color) => {
    console.log(bm);
    if (bm.beatmap.mods.includes('TB')) return;

    bm.parent.addClass(`banned ${color}`).removeClass(`picked ${opposite_team(color)}`);
    bm.picked_by_label.text(`Banned by ${teamName}`).addClass(`banned ${color}`).removeClass(`picked ${opposite_team(color)}`);
    bm.blink_overlay.css('animation', 'none');
    bm.mod_icon.addClass('banned');
    selectedMaps.push(bm.id);
    console.log(selectedMaps);
};

const resetMap = bm => {
    const current_pick = localStorage.getItem('current_pick').split('/')[0];
    if (current_pick == bm.id) localStorage.setItem('current_pick', '');

    bm.parent.removeClass('banned picked red blue');
    bm.picked_by_label.text('').removeClass('banned picked red blue');
    bm.blink_overlay.css('animation', 'none');
    bm.mod_icon.removeClass('banned');
    selectedMaps = selectedMaps.filter(e => e !== bm.id);
};

const switchPick = color => {
    cache.currentPicker = color ? opposite_team(color) : opposite_team(cache.currentPicker);
    $('#current_pick').text(`${cache.currentPicker.toUpperCase()} PICK`).addClass(cache.currentPicker).removeClass(opposite_team(cache.currentPicker));
};

const switchAutoPick = () => {
    if (toggles.enableAutoPick) {
        toggles.enableAutoPick = false;
        $('#auto_pick').text('AUTOPICK: OFF').removeClass('enabled');
    }
    else {
        toggles.enableAutoPick = true;
        $('#auto_pick').text('AUTOPICK: ON').addClass('enabled');
    }
};

const switchAutoAdvance = () => {
    if (toggles.enableAutoAdvance) {
        toggles.enableAutoAdvance = false;
        $('#auto_advance').text('AUTO ADVANCE: OFF').removeClass('enabled');
    }
    else {
        toggles.enableAutoAdvance = true;
        $('#auto_advance').text('AUTO ADVANCE: ON').addClass('enabled');
    }
};

const TourneyState = {
    'Initialising': 0,
    'Idle': 1,
    'WaitingForClients': 2,
    'Playing': 3,
    'Ranking': 4,
};

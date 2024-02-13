window.addEventListener('contextmenu', (e) => e.preventDefault());

// START
let socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');

// NOW PLAYING
let stats = document.getElementById('stats');
let red_button = document.getElementById('redPickButton');
let blue_button = document.getElementById('bluePickButton');
let autopick_button = document.getElementById('autoPickButton');

const sceneCollection = document.getElementById("sceneCollection");
let autoadvance_button = document.getElementById('autoAdvanceButton');
let autoadvance_timer_container = document.getElementById('autoAdvanceTimer');
let autoadvance_timer_label = document.getElementById('autoAdvanceTimerLabel');
let autoadvance_timer_time = new CountUp('autoAdvanceTimerTime', 10, 0, 1, 10, {useEasing: false, suffix: 's'});
autoadvance_timer_container.style.opacity = '0';

let enableAutoAdvance = false;
let sceneTransitionTimeoutID;
let lastState;
const gameplay_scene_name = "gameplay";
const mappool_scene_name = "mappool";
let selectedMapsTransitionTimeout = {};
const pick_to_transition_delay_ms = 10000;


const beatmaps = new Set();


obsGetScenes(scenes => {
    for (const scene of scenes) {
        let clone = document.getElementById("sceneButtonTemplate").content.cloneNode(true);
        let buttonNode = clone.querySelector('div');
        buttonNode.id = `scene__${scene}`;
        buttonNode.textContent = `GO TO: ${scene}`;
        buttonNode.onclick = function() { obsSetCurrentScene(scene); };
        sceneCollection.appendChild(clone);
    }

    obsGetCurrentScene((scene) => {
        document.getElementById(`scene__${scene.name}`).classList.add("activeScene");
    });
});

window.addEventListener('obsSceneChanged', function(event) {
    let activeButton = document.getElementById(`scene__${event.detail.name}`);

    for (const scene of sceneCollection.children) {
        scene.classList.remove("activeScene");
    }
    activeButton.classList.add("activeScene");

});


socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

let gameState;
let hasSetup = false;
let lastPicked = null;
let redName = 'Red Team', blueName = 'Blue Team';
let tempMapID = 0;
let currentPicker = 'Red';
let enableAutoPick = false;
let selectedMaps = [];

class Beatmap {
    constructor(mods, modID, beatmapID, layerName) {
        this.mods = mods;
        this.modID = modID;
        this.beatmapID = beatmapID;
        this.layerName = layerName;
    }
    generate() {
        let mappoolContainer = document.getElementById(`${this.mods}`);

        this.clicker = document.createElement('div');
        this.clicker.id = `${this.layerName}Clicker`;

        mappoolContainer.appendChild(this.clicker);
        let clickerObj = document.getElementById(this.clicker.id);

        this.bg = document.createElement('div');
        this.map = document.createElement('div');
        this.overlay = document.createElement('div');
        this.blinkoverlay = document.createElement('div');
        this.artist = document.createElement('div');
        this.title = document.createElement('div');
        this.difficulty = document.createElement('div');
        this.stats = document.createElement('div');
        this.modIcon = document.createElement('div');
        this.pickedStatus = document.createElement('div');

        this.bg.id = this.layerName;
        this.map.id = `${this.layerName}BG`;
        this.overlay.id = `${this.layerName}Overlay`;
        this.blinkoverlay.id = `${this.layerName}BlinkOverlay`;
        this.artist.id = `${this.layerName}ARTIST`;
        this.title.id = `${this.layerName}TITLE`;
        this.difficulty.id = `${this.layerName}DIFF`;
        this.stats.id = `${this.layerName}Stats`;
        this.modIcon.id = `${this.layerName}ModIcon`;
        this.pickedStatus.id = `${this.layerName}STATUS`;

        this.artist.setAttribute('class', 'mapInfo artist');
        this.title.setAttribute('class', 'mapInfo title');
        this.difficulty.setAttribute('class', 'mapInfo diff');
        this.map.setAttribute('class', 'map');
        this.pickedStatus.setAttribute('class', 'pickingStatus');
        this.overlay.setAttribute('class', 'overlay');
        this.blinkoverlay.setAttribute('class', 'blinkoverlay');
        this.bg.setAttribute('class', 'statBG');
        this.modIcon.setAttribute('class', `modIcon icon-${this.mods.toLowerCase()}`);
        this.modIcon.innerHTML = `${this.modID}`;
        this.clicker.setAttribute('class', 'clicker');
        clickerObj.appendChild(this.map);
        document.getElementById(this.map.id).appendChild(this.overlay);
        document.getElementById(this.map.id).appendChild(this.blinkoverlay);
        document.getElementById(this.map.id).appendChild(this.artist);
        document.getElementById(this.map.id).appendChild(this.title);
        document.getElementById(this.map.id).appendChild(this.difficulty);
        clickerObj.appendChild(this.pickedStatus);
        clickerObj.appendChild(this.bg);
        clickerObj.appendChild(this.modIcon);

        this.clicker.style.transform = 'translateY(0)';
    }
    grayedOut() {
        this.overlay.style.opacity = '1';
    }
}

socket.onmessage = async (event) => {
    let data = JSON.parse(event.data);

    if (!hasSetup) setupBeatmaps();

    /**
     * switch to mappool scene after ranking screen
     */
    {
        let newState = data.tourney.manager.ipcState;
        if (enableAutoAdvance) {
            if (lastState === TourneyState.Ranking && newState === TourneyState.Idle) {
                sceneTransitionTimeoutID = setTimeout(() => {
                    obsGetCurrentScene((scene) => {
                        if (scene.name !== gameplay_scene_name)  // e.g. on winner screen
                            return
                        obsSetCurrentScene(mappool_scene_name);
                    });
                }, 2000);
            }
            if (lastState !== newState && newState !== TourneyState.Idle) {
                clearTimeout(sceneTransitionTimeoutID);
            }
        }
        lastState = newState;
    }

    if (blueName !== data.tourney.manager.teamName.right && data.tourney.manager.teamName.right) {
        blueName = data.tourney.manager.teamName.right || 'Blue';
    }
    if (redName !== data.tourney.manager.teamName.left && data.tourney.manager.teamName.left) {
        redName = data.tourney.manager.teamName.left || 'Red';
    }

    if (tempMapID !== data.menu.bm.id && data.menu.bm.id != 0) {
        if (tempMapID == 0) tempMapID = data.menu.bm.id;
        else {
            tempMapID = data.menu.bm.id;
            let pickedMap = Array.from(beatmaps).find(b => b.beatmapID == tempMapID);
            if (pickedMap && enableAutoPick && !selectedMaps.includes(tempMapID)) pickMap(Array.from(beatmaps).find(b => b.beatmapID == tempMapID), currentPicker == 'Red' ? redName : blueName, currentPicker);
        }
    }
};

async function setupBeatmaps() {
    hasSetup = true;

    const bms = [];
    try {
        $.ajaxSetup({ cache: false });
        const jsonData = await $.getJSON(`../_data/beatmaps.json`);
        jsonData.beatmaps.map((beatmap) => { bms.push(beatmap); });
    } catch (error) { console.error('Could not read JSON file', error); }

    let row = -1;
    let preMod = 0;
    let colIndex = 0;

    bms.map(async (beatmap, index) => {
        if (beatmap.mods !== preMod || colIndex % 3 === 0) {
            preMod = beatmap.mods;
            colIndex = 0;
            row++;
        }
        const bm = new Beatmap(beatmap.mods, beatmap.identifier, beatmap.beatmap_id, `map${index}`);
        bm.generate();
        bm.clicker.addEventListener('mousedown', () => {
            bm.clicker.addEventListener('click', event => {
                if (!event.shiftKey) event.ctrlKey ? banMap(bm, redName, 'Red') : pickMap(bm, redName, 'Red');
                else resetMap(bm);
            });
            bm.clicker.addEventListener('contextmenu', event => {
                if (!event.shiftKey) event.ctrlKey ? banMap(bm, blueName, 'Blue') : pickMap(bm, blueName, 'Blue');
                else resetMap(bm);
            });
        });
        bm.map.style.backgroundImage = `url('https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover.jpg')`;
        bm.artist.innerHTML = `${beatmap.artist}`;
        bm.title.innerHTML = `${beatmap.title}`;
        bm.difficulty.innerHTML = `[${beatmap.difficulty}]${beatmap.mapper? ` by ${beatmap.mapper || '' }` : ''}`;
        beatmaps.add(bm);
    });
}

const getDataSet = (stored_beatmaps, beatmap_id) => stored_beatmaps.find(b => b.beatmap_id == beatmap_id) || null;

const pickMap = (bm, teamName, color) => {
    if (lastPicked !== null) lastPicked.blinkoverlay.style.animation = 'none';
    lastPicked = bm;
    switchPick(color);

    document.cookie = `lastPick=${bm.beatmapID}-${color.toLowerCase()};path=/`;

    bm.pickedStatus.style.color = '#f5f5f5';
    bm.overlay.style.opacity = '0.85';
    bm.blinkoverlay.style.animation = 'blinker 1s cubic-bezier(.36,.06,.01,.57) 300ms 8, slowPulse 5000ms ease-in-out 8000ms 18';
    bm.artist.style.opacity = '0.3';
    bm.title.style.opacity = '0.3';
    bm.difficulty.style.opacity = '0.3';
    bm.modIcon.style.opacity = '0.3';
    bm.bg.style.opacity = '0';
    selectedMaps.push(bm.beatmapID);

    setTimeout(() => {
        bm.pickedStatus.style.opacity = 1;
        bm.pickedStatus.style.outline = bm.mods.includes('TB') ? '3px solid #ffffff' : `3px solid ${color == 'Red' ? '#ff8d8d' : '#93b5ff'}`;
        bm.pickedStatus.innerHTML = bm.mods.includes('TB') ? 'Tiebreaker' : `<b class="pick${color}">${teamName}</b> pick`;
    }, 300);

    if (enableAutoAdvance) {
        // idempotent on pick color (none/red/blue). Consider making it idempotent on pick state? (not picked/picked)
        if (selectedMapsTransitionTimeout[bm.beatmapID]?.color !== color) {
            clearTimeout(selectedMapsTransitionTimeout[bm.beatmapID]?.timeoutId)
            selectedMapsTransitionTimeout[bm.beatmapID] = {
                color: color,
                timeoutId: setTimeout(() => {
                    obsSetCurrentScene(gameplay_scene_name);
                    autoadvance_timer_container.style.opacity = '0';
                }, pick_to_transition_delay_ms)
            };

            autoadvance_timer_time = new CountUp('autoAdvanceTimerTime',
                pick_to_transition_delay_ms/1000, 0, 1, pick_to_transition_delay_ms/1000,
                {useEasing: false, suffix: 's'});
            autoadvance_timer_time.start();
            autoadvance_timer_container.style.opacity = '1';
            autoadvance_timer_label.textContent = `Switching to ${gameplay_scene_name} in`;
        }
    }
}

const banMap = (bm, teamName, color) => {
    if (bm.mods.includes('TB')) return;
    bm.pickedStatus.style.color = '#f5f5f5';
    bm.overlay.style.opacity = '0.95';
    bm.blinkoverlay.style.animation = 'none';
    bm.artist.style.opacity = '0.3';
    bm.title.style.opacity = '0.3';
    bm.difficulty.style.opacity = '0.3';
    bm.modIcon.style.opacity = '0.3';
    bm.bg.style.opacity = '0';
    selectedMaps.push(bm.beatmapID);

    setTimeout(() => {
        bm.pickedStatus.style.opacity = 1;
        bm.pickedStatus.style.outline = 'none';
        bm.pickedStatus.innerHTML = `<b class="pick${color}">${teamName}</b> ban`;
    }, 300);
}

const resetMap = bm => {
    clearTimeout(selectedMapsTransitionTimeout[bm.beatmapID]?.timeoutId);
    autoadvance_timer_container.style.opacity = '0';

    document.cookie = `lastPick=;path=/`;

    bm.overlay.style.opacity = '0.6';
    bm.blinkoverlay.style.animation = 'none';
    bm.artist.style.opacity = '0.8';
    bm.title.style.opacity = '1';
    bm.difficulty.style.opacity = '0.8';
    bm.modIcon.style.opacity = '1';
    bm.bg.style.opacity = '1';
    bm.pickedStatus.style.opacity = '0';
    bm.pickedStatus.style.boxShadow = 'none';
    bm.pickedStatus.style.outline = 'none';
    selectedMaps = selectedMaps.filter(e => e !== bm.beatmapID);

    setTimeout(() => {
        bm.pickedStatus.style.opacity = 0;
        bm.pickedStatus.style.outline = 'none';
        bm.pickedStatus.innerHTML = '';
    }, 100);
}

const switchPick = color => {
    if (!color) currentPicker = currentPicker == 'Red' ? 'Blue' : 'Red';
    else currentPicker = color == 'Red' ? 'Blue' : 'Red';
    if (currentPicker == 'Red') {
        red_button.style.opacity = 1;
        blue_button.style.opacity = 0.5;
    }
    else {
        red_button.style.opacity = 0.5;
        blue_button.style.opacity = 1;
    }
}

const switchAutoPick = () => {
    if (enableAutoPick) {
        enableAutoPick = false;
        autopick_button.innerHTML = 'ENABLE AUTOPICK';
        autopick_button.style.backgroundColor = '#fc9f9f';
    }
    else {
        enableAutoPick = true;
        autopick_button.innerHTML = 'DISABLE AUTOPICK';
        autopick_button.style.backgroundColor = '#9ffcb3';
    }
}
const switchAutoAdvance = () => {
    if (enableAutoAdvance) {
        enableAutoAdvance = false;
        autoadvance_button.innerHTML = 'AUTO ADVANCE: OFF';
        autoadvance_button.style.backgroundColor = '#fc9f9f';
    }
    else {
        enableAutoAdvance = true;
        autoadvance_button.innerHTML = 'AUTO ADVANCE: ON';
        autoadvance_button.style.backgroundColor = '#9ffcb3';
    }
}

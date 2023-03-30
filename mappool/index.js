window.addEventListener('contextmenu', (e) => e.preventDefault());

// START
let socket = new ReconnectingWebSocket('ws://127.0.0.1:24050/ws');
let user = {};

// NOW PLAYING
let mapContainer = document.getElementById('mapContainer');
let mapArtist = document.getElementById('mapName');
let mapInfo = document.getElementById('mapInfo');
let mapper = document.getElementById('mapper');
let stars = document.getElementById('stars');
let stats = document.getElementById('stats');

const beatmaps = new Set(); // Store beatmapID;
const load_maps = async () => await $.getJSON('../_data/beatmap_data.json');

socket.onopen = async () => {
    console.log('Successfully Connected');
};

socket.onclose = (event) => {
    console.log('Socket Closed Connection: ', event);
    socket.send('Client Closed!');
};

socket.onerror = (error) => {
    console.log('Socket Error: ', error);
};

let tempMapID, tempImg, tempMapArtist, tempMapTitle, tempMapDiff, tempMapper;

let tempSR, tempCS, tempAR, tempOD, tempHP;

let gameState;

let hasSetup = false;

let redName = 'Red Team', blueName = 'Blue Team';

const mods = {
    NM: 0,
    HD: 1,
    HR: 2,
    DT: 3,
    FM: 4,
    TB: 5,
};

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

    if (blueName !== data.tourney.manager.teamName.right && data.tourney.manager.teamName.right) {
        blueName = data.tourney.manager.teamName.right || 'Blue';
    }
    if (redName !== data.tourney.manager.teamName.left && data.tourney.manager.teamName.left) {
        redName = data.tourney.manager.teamName.left || 'Red';
    }

    if (tempImg !== data.menu.bm.path.full) {
        tempImg = data.menu.bm.path.full;
        data.menu.bm.path.full = data.menu.bm.path.full.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/');
    }
    if (tempMapID !== data.menu.bm.id || tempSR !== data.menu.bm.stats.fullSR) {
        tempMapID = data.menu.bm.id;
        tempMapArtist = data.menu.bm.metadata.artist;
        tempMapTitle = data.menu.bm.metadata.title;
        tempMapDiff = '[' + data.menu.bm.metadata.difficulty + ']';
        tempMapper = data.menu.bm.metadata.mapper;

        tempCS = data.menu.bm.stats.CS;
        tempAR = data.menu.bm.stats.AR;
        tempOD = data.menu.bm.stats.OD;
        tempHP = data.menu.bm.stats.HP;
        tempSR = data.menu.bm.stats.fullSR;
    }
};

async function setupBeatmaps() {
    hasSetup = true;
    let lastPicked = null;

    const modsCount = {
        NM: 0,
        HD: 0,
        HR: 0,
        DT: 0,
        FM: 0,
        TB: 0,
    };

    const bms = [];
    try {
        $.ajaxSetup({ cache: false });
        const jsonData = await $.getJSON(`../_data/beatmaps.json`);
        console.log(jsonData.beatmaps.map(b => b.beatmap_id));
        jsonData.beatmaps.map((beatmap) => {
            bms.push(beatmap);
        });
    } catch (error) {
        console.error('Could not read JSON file', error);
    }

    (function countMods() {
        bms.map((beatmap) => {
            modsCount[beatmap.mods]++;
        });
    })();

    let row = -1;
    let preMod = 0;
    let colIndex = 0;

    function setPickedMap(bm, event) {
        if (lastPicked !== null) {
            lastPicked.blinkoverlay.style.animation = 'none';
        }
        lastPicked = bm;
        bm.pickedStatus.style.color = '#f5f5f5';
        bm.overlay.style.opacity = event.ctrlKey ? '0.95' : '0.85';
        bm.blinkoverlay.style.animation = event.ctrlKey
            ? 'none'
            : 'blinker 1s cubic-bezier(.36,.06,.01,.57) 300ms 8, slowPulse 5000ms ease-in-out 8000ms 18'; // 36 * 5s -> 180s of slow pulse (+8s), enough to run down 120s countdown but short enough to reset before next time mappool is shown
        bm.artist.style.opacity = '0.3';
        bm.title.style.opacity = '0.3';
        bm.difficulty.style.opacity = '0.3';
        bm.modIcon.style.opacity = '0.3';
        bm.bg.style.opacity = '0';
    }

    function resetMapPick(bm) {
        bm.overlay.style.opacity = '0.5';
        bm.blinkoverlay.style.animation = 'none';
        bm.artist.style.opacity = '1';
        bm.title.style.opacity = '1';
        bm.difficulty.style.opacity = '1';
        bm.modIcon.style.opacity = '1';
        bm.bg.style.opacity = '1';
        bm.pickedStatus.style.opacity = '0';
        bm.pickedStatus.style.boxShadow = 'none';
        bm.pickedStatus.style.outline = 'none';
    }

    bms.map(async (beatmap, index) => {
        if (beatmap.mods !== preMod || colIndex % 3 === 0) {
            preMod = beatmap.mods;
            colIndex = 0;
            row++;
        }
        let oddRow = Math.round(modsCount[beatmap.mods] / 3) + 1;
        let leftCol = modsCount[beatmap.mods] % 3;
        const bm = new Beatmap(beatmap.mods, beatmap.identifier, beatmap.beatmap_id, `map${index}`);
        bm.generate();
        bm.clicker.addEventListener('mousedown', function () {
            bm.clicker.addEventListener('click', function (event) {
                if (!event.shiftKey) {
                    setPickedMap(bm, event);
                    document.cookie = `lastPick=${bm.beatmapID}-red;path=/`;
                    setTimeout(function () {
                        bm.pickedStatus.style.opacity = '1';
                        bm.pickedStatus.style.outline = bm.mods.includes("TB") ? "3px solid #FFF" : event.ctrlKey ? 'none' : '3px solid #ff8d8d';
                        bm.pickedStatus.innerHTML = bm.mods.includes("TB") ? "Tiebreaker" : event.ctrlKey ? `<b class="pickRed">${redName}</b> ban` : `<b class="pickRed">${redName}</b> pick`;
                    }, 300);
                } else {
                    resetMapPick(bm);
                    document.cookie = `lastPick=;path=/`;
                    setTimeout(function () {
                        bm.pickedStatus.style.opacity = '1';
                        bm.pickedStatus.innerHTML = '';
                    }, 300);
                }
            });
            bm.clicker.addEventListener('contextmenu', function (event) {
                if (!event.shiftKey) {
                    setPickedMap(bm, event);
                    document.cookie = `lastPick=${bm.beatmapID}-blue;path=/`;
                    setTimeout(function () {
                        bm.pickedStatus.style.opacity = '1';
                        bm.pickedStatus.style.outline = bm.mods.includes("TB") ? "3px solid #FFF" : event.ctrlKey ? 'none' : '3px solid #93b5ff';
                        bm.pickedStatus.innerHTML = bm.mods.includes("TB") ? "Tiebreaker" : event.ctrlKey ? `<b class="pickBlue">${blueName}</b> ban` : `<b class="pickBlue">${blueName}</b> pick`;
                    }, 150);
                } else {
                    resetMapPick(bm);
                    document.cookie = `lastPick=;path=/`;
                    setTimeout(function () {
                        bm.pickedStatus.style.opacity = '1';
                        bm.pickedStatus.innerHTML = '';
                    }, 150);
                }
            });
        });
        const stored_beatmaps = await load_maps();
        const mapData = await getDataSet(stored_beatmaps, beatmap.beatmap_id);
        bm.map.style.backgroundImage = `url('https://assets.ppy.sh/beatmaps/${mapData.beatmapset_id}/covers/cover.jpg')`;
        bm.artist.innerHTML = `${mapData.artist}`;
        bm.title.innerHTML = `${mapData.title}`;
        bm.difficulty.innerHTML = `[${mapData.version}] by ${mapData.creator}`;
        beatmaps.add(bm);
    });
}

function getDataSet(stored_beatmaps, beatmap_id) {
    let beatmap = stored_beatmaps.find(b => b.beatmap_id == beatmap_id);
    return beatmap || null;
};

# 3wc-stream-overlay

## OBS Setup

### main scene  
| source        | url/path                                        | width | height | x         | y         |
|---------------|-------------------------------------------------|-------|--------|-----------|-----------|
| vc_overlay*   |                                                 | 480   | 100    | 0         | 880       |
| osu clients** |                                                 | 480   | 360    | see below | see below |
| main_overlay  | http://localhost:24050/3wc-stream-overlay/main/ | 1920  | 1080   | 0         | 0         |

<sup>*url from discord, replace custom css with [vc.css](vc.css)</sup><br>
<sup>**place in the standard "triangle" 3v3 configuration as shown below</sup>

| client | x    | y    |
|--------|------|------|
| 0      | 240  | 160  |
| 1      | 0    | 520  |
| 2      | 480  | 520  |
| 3      | 1200 | 160  |
| 4      | 960  | 520  |
| 5      | 1440 | 520  |

### mappool
| source             | url/path                                           | width | height | x | y   |
|--------------------|----------------------------------------------------|-------|--------|---|-----|
| vc_overlay         |                                                    | 480   | 100    | 0 | 880 |
| mappool_overlay*†  | http://localhost:24050/3wc-stream-overlay/mappool/ | 1920  | 700    | 0 | 220 |
| main_overlay       | http://localhost:24050/3wc-stream-overlay/main/    | 1920  | 1080   | 0 | 0   |

<sup>*: position changes per round depending on mappool size to center in the middle</sup>
#### !!!! IMPORTANT !!!!
For scene autoswitcher to work, you must give the `mappool_overlay` web source "Advanced access to OBS" 
_as well as_ making a copy of the `mappool_overlay` web source to every other scene. The copies should be
positioned off-screen as to not appear on stream.

### intro*
| source           | url/path                                           | width | height | x | y   |
|------------------|----------------------------------------------------|-------|--------|---|-----|
| intro_overlay    | http://localhost:24050/3wc-stream-overlay/intro/   | 1920  | 1080   | 0 | 0   |

<sup>*data pulled from `_data/coming_up.json`, requires exchanging between matches</sup>

### winner
| source           | url/path                                           | width | height | x | y   |
|------------------|----------------------------------------------------|-------|--------|---|-----|
| winner_overlay   | http://localhost:24050/3wc-stream-overlay/winner/  | 1920  | 1080   | 0 | 0   |

Intro and winner scenes can also have the vc overlay bottom left if needed

Add a 300ms luma wipe transition between the scenes

### Interacting with the mappool
- Left click: left (red) team pick
- Right click: right (blue) team pick
- Ctrl+Click: ban
- Shift+Click: clear

## Other

### _data folder

Not included here. Contains the following items:
- `teams.json` - list of teams, static
- `beatmaps.json` - mappool data, exchanged weekly
- `coming_up.json` - time and team names for a match, exchanged every match, used for intro screen

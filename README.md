# 3wc-stream-overlay

## OBS Setup

### main scene  
| source        | url/path                     | width | height | x         | y         |
|---------------|------------------------------|-------|--------|-----------|-----------|
| vc_overlay*   |                              | 480   | 100    | 0         | 880       |
| osu clients** |                              | 480   | 360    | see below | see below |
| logo          | `/main/static/logo.png`      | 256   | 256    | 832       | 209       |
| main_overlay  | http://localhost:24050/main/ | 1920  | 1080   | 0         | 0         |

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
| source           | url/path                        | width | height | x | y   |
|------------------|---------------------------------|-------|--------|---|-----|
| vc_overlay       |                                 | 480   | 100    | 0 | 880 |
| mappool_overlay* | http://localhost:24050/mappool/ | 1920  | 700    | 0 | 220 |
| main_overlay     | http://localhost:24050/main/    | 1920  | 1080   | 0 | 0   |

<sup>*position changes per round depending on mappool size to center in the middle</sup>

Add a 300ms luma wipe transition between the scenes

### Interacting with the mappool
- Left click: left (red) team pick
- Right click: right (blue) team pick
- Ctrl+Click: ban
- Shift+Click: clear

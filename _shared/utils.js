const obsGetCurrentScene = window.obsstudio?.getCurrentScene ?? (() => {
});
const obsGetScenes = window.obsstudio?.getScenes ?? (() => {
});
const obsSetCurrentScene = window.obsstudio?.setCurrentScene ?? (() => {
});


/**
 * ipcState as defined in osu.Game.Tournament/IPC/TourneyState.cs:
 *     public enum TourneyState
 *     {
 *         Initialising,
 *         Idle,
 *         WaitingForClients,
 *         Playing,
 *         Ranking
 *     }
 * @type {{WaitingForClients: number, Playing: number, Ranking: number, Idle: number, Initialising: number}}
 */
const TourneyState = {
    "Initialising": 0,
    "Idle": 1,
    "WaitingForClients": 2,
    "Playing": 3,
    "Ranking": 4,
}

/**
 * @typedef  {{
 *     tourney: {
 *         manager: {
 *             bools: {
 *                 scoreVisible: boolean,
 *                 starsVisible: boolean
 *             },
 *             bestOF: number,
 *             stars: {
 *                 left:number,
 *                 right:number,
 *             },
 *             teamName: {
 *                 left:string,
 *                 right:string,
 *             },
 *             ipcState: number,
 *             ipcClients: [{gameplay: { accuracy: number }}],
 *             chat: [{messageBody: string, team: string}],
 *         }
 *     },
 *     menu: {
 *         bm:{
 *             md5: string,
 *             path: {
 *                 full:string,
 *             },
 *             metadata:{
 *                artist:string,
 *                title:string,
 *                mapper:string,
 *                },
 *            stats:{
 *                    fullSR:number,
 *                    SR:number,
 *                    AR:number,
 *                    CS:number,
 *                    OD:number,
 *                    HP:number,
 *                    BPM:{
 *                        min:number,
 *                        max:number,
 *                    },
 *                    memoryAR:number,
 *                    memoryCS:number,
 *                    memoryOD:number,
 *                    memoryHP:number,
 *                },
 *            time:{
 *                firstObj:number,
 *                current:number,
 *                full:number,
 *                mp3:number,
 *            }
 *            },
 *      pp:{
 *                strains:[number],
 *            }
 *        }
 *    }
 * } GosuData
 */

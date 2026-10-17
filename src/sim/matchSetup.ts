import type {Team} from './types';
import type {FactionId} from './factions';
import type {FactionDeck} from './deck';
export type MatchFormat='duel'|'teams'|'ffa';
export interface MatchParticipant {faction:FactionId;deck:FactionDeck|null;alliance:number;bot?:boolean;difficulty?:'easy'|'normal'|'hard'}
export const participantTeams=(count:number):Team[]=>{if(count!==2&&count!==4)throw new Error('Lahing vajab kaht või nelja osapoolt');return ([0,1,2,3] as Team[]).slice(0,count);};

import type {MissionDef} from '../sim/types';
const key='rogue-front.prepared-mission';
/** Navigation may reload the page; carry the exact validated geometry instead of regenerating it. */
export function storePreparedMission(storage:Pick<Storage,'setItem'>,mission:MissionDef):void {
 try{storage.setItem(key,JSON.stringify(mission));}catch{/* Storage quota must not prevent starting by seed. */}
}
export function readPreparedMission(storage:Pick<Storage,'getItem'>,id:string):MissionDef|undefined {
 try{const m=JSON.parse(storage.getItem(key)??'null') as MissionDef|null;
  if(m?.id===id&&m.map?.id===id&&Array.isArray(m.map.features)&&m.map.bases?.length===2&&Number.isFinite(m.seed))return m;
 }catch{/* Fall back to deterministic reconstruction. */}return undefined;
}

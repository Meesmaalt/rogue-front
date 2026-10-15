import {expect,it} from 'vitest';
import {storePreparedMission,readPreparedMission} from './PreparedMission';
import type {MissionDef} from '../sim/types';
it('carries exact prepared geometry through navigation, keyed to the selected map',()=>{
 const values=new Map<string,string>(),storage={setItem:(k:string,v:string)=>{values.set(k,v);},getItem:(k:string)=>values.get(k)??null};
 const mission={id:'procedural-v12-balanced-2048-42',seed:42,map:{id:'procedural-v12-balanced-2048-42',bases:[{x:-1,z:1},{x:1,z:-1}],features:[{id:'hill',x:42,z:17}]}} as MissionDef;
 storePreparedMission(storage,mission);expect(readPreparedMission(storage,mission.id)).toEqual(mission);expect(readPreparedMission(storage,'another-map')).toBeUndefined();
});
it('bad storage and exceeded quotas fall back to the seeded path without stopping launch',()=>{
 expect(readPreparedMission({getItem:()=>'{broken'},'map')).toBeUndefined();
 expect(()=>storePreparedMission({setItem:()=>{throw new Error('quota');}},{} as MissionDef)).not.toThrow();
});

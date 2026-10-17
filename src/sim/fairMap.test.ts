import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {validateFreshMap} from './freshMap';
import {resetHeightmap} from './heightmap';
afterEach(resetHeightmap);
it.each([2048,4096,6144])('v16 pairs strategic resource distance and output while preserving real paths at %s',size=>{
 const m=generateProceduralMap(43,'balanced',size,16),r=m.map.resources;
 for(const [a,b] of [[0,1],[3,4],[5,6],[7,8]]){
  expect(r[a].x).toBe(-r[b].x);expect(r[a].z).toBe(-r[b].z);expect(r[a].facility).toBe(r[b].facility);
  expect(r[a].amount).toBe(r[b].amount);
 }
 const lakes=m.map.features!.filter(f=>f.waterBody==='lake');
 for(let i=0;i<lakes.length;i+=2){expect(lakes[i].x).toBe(-lakes[i+1].x);expect(lakes[i].z).toBe(-lakes[i+1].z);}
 expect(r.every(p=>p.amount<p.maxStock!)).toBe(true);
 const bridges=m.map.features!.filter(f=>f.id.startsWith('bridge-'));
 expect(bridges[0].z).toBe(-bridges[2].z);expect(bridges[1].x).toBe(0);expect(bridges[1].z).toBe(0);
 let reason='';expect(validateFreshMap(m,r=>{reason=r;}),reason).toBe(true);
 expect(getPlayableMap(m.id)).toEqual(m);
},30000);

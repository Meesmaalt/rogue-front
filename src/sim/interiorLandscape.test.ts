import {expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {parcelArea} from './regionalLandscape';
it('v12 puts compact ridges inside the battlefield and preserves older generation',()=>{
 for(const size of [2048,4096,6144]){
  const map=generateProceduralMap(42,'balanced',size,12),forms=map.map.landforms!;
  expect(forms.some(f=>Math.abs(f.x)<size*.33&&Math.abs(f.z)<size*.33&&f.height>=18),String(size)).toBe(true);
  expect(getPlayableMap(map.id)).toEqual(map);const old=generateProceduralMap(42,'balanced',size===6144?6144:4096,11);expect(getPlayableMap(old.id)).toEqual(old);
 }
},60000);
it('adjacent woodland parcels join without artificial all-round clear corridors',()=>{
 const m=generateProceduralMap(42,'forest',4096,12),woods=m.map.features!.filter(f=>f.appearance==='forest'&&f.polygon);
 const vertices=new Map<string,number>();for(const f of woods)for(const p of f.polygon!){const k=`${p.x}/${p.z}`;vertices.set(k,(vertices.get(k)??0)+1);}
 expect([...vertices.values()].some(n=>n>1)).toBe(true);
 const area=woods.reduce((sum,f)=>sum+parcelArea(f.polygon!),0);expect(area).toBeGreaterThan(4096**2*.12);expect(area).toBeLessThan(4096**2*.7);
},30000);

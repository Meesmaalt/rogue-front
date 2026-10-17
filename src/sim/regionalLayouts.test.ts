import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap,mapOptionsMask,decodeMapOptions,METRIC_MAP_SIZES} from './proceduralMap';
import {REGION_IDS,regionDefaults} from './regions';
import type {RegionLayoutIndex} from './regionPlans';
import {validateFreshMap,generateFreshMap} from './freshMap';
import {resetHeightmap} from './heightmap';
afterEach(resetHeightmap);
it.each(REGION_IDS)('%s layouts have real connected navigation, paired resources and exact reconstruction at every size, with navigation at 2 and 6 km',region=>{
 for(const layout of [0,1,2] as RegionLayoutIndex[])for(const size of METRIC_MAP_SIZES){
  const options={...regionDefaults(region),layout},m=generateProceduralMap(43,'balanced',size,18,options);let reason='';
  expect(m.id).toContain('procedural-v18-');expect(getPlayableMap(m.id)).toEqual(m);
  expect(m.map.layout).toBeDefined();expect(m.map.landforms!.length).toBeGreaterThan(10);if(size===2048||size===6144)expect(validateFreshMap(m,r=>reason=r),`${m.id}: ${reason}`).toBe(true);
  const r=m.map.resources;for(const [a,b] of [[0,1],[3,4],[5,6],[7,8]]){expect(r[a].x).toBe(-r[b].x);expect(r[a].z).toBe(-r[b].z);expect(r[a].facilityOffset!.x).toBe(-r[b].facilityOffset!.x);}
  const decoded=decodeMapOptions(mapOptionsMask(options));expect({...decoded,lakes:decoded.lakes!==false}).toMatchObject(options);
 }
},180000);
it('v18 preserves explicit layouts with every optional terrain layer disabled and bounds new mask bits',()=>{
 const m=generateProceduralMap(0,'balanced',2048,18,{...regionDefaults('canyon'),layout:2,mountains:false,forest:false,river:false,lakes:false,sea:false});
 expect(m.map.layout!.id).toBe('branching-valley');expect(m.map.landforms).toHaveLength(0);expect(m.map.features!.some(f=>f.kind==='water'||f.appearance==='forest')).toBe(false);expect(getPlayableMap(m.id)).toEqual(m);
 for(const suffix of ['512','01','NaN'])expect(getPlayableMap(`procedural-v18-balanced-2048-43-o${suffix}`)).toBeUndefined();
 expect(getPlayableMap('procedural-v17-balanced-2048-43-o128')).toBeUndefined();
});

it.each(REGION_IDS)('%s fresh preparation succeeds at seed boundaries without changing an explicitly selected layout',region=>{
 for(const seed of [0,4294967295]){const m=generateFreshMap(seed,'balanced',2048,{...regionDefaults(region),layout:2});expect(m.map.layout!.id).toBe((region==='italy'?'farm-roads':region==='siberia'?'ridge-passes':region==='canyon'?'branching-valley':'rock-basin'));expect(m.id).toContain('procedural-v18-');}
},90000);

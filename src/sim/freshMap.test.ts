import {afterEach,expect,it} from 'vitest';
import {generateFreshMap,validateFreshMap} from './freshMap';
import {generateProceduralMap,getPlayableMap,METRIC_MAP_SIZES,type MapArchetype} from './proceduralMap';
import {naturalWoodlandAt} from './naturalLandscape';
import {resetHeightmap} from './heightmap';
import {Vision} from './Vision';
import {setMapSize} from './heightmap';
afterEach(resetHeightmap);
it('every current size and region has a reconstructible current-version map',()=>{
 for(const size of METRIC_MAP_SIZES)for(const region of ['balanced','forest','highlands','urban','river','coastal'] as MapArchetype[]){
  // Generation can reject a seed before validation; fresh generation retries those seeds.
  let map:ReturnType<typeof generateProceduralMap>|undefined;
  for(const seed of [62510,42,0,123,4294967295]){try{map=generateProceduralMap(seed,region,size,11);break;}catch{ /* next seed */ }}
  expect(map,`${size}/${region}`).toBeDefined();expect(getPlayableMap(map!.id)).toEqual(map);expect(map!.map.resources).toHaveLength(9);
 }
},120000);
it('a fresh compact map passes navigation and runway checks, reconstructs and rejects a blocked base',()=>{
 const map=generateFreshMap(62510,'balanced',2048);expect(map.id).toContain('procedural-v14-');expect(getPlayableMap(map.id)).toEqual(map);
 const broken=structuredClone(map);broken.map.features!.push({id:'blocked-base',kind:'building',x:map.map.bases[0].x,z:map.map.bases[0].z,width:50,depth:50});
 expect(validateFreshMap(broken)).toBe(false);
 expect(()=>generateFreshMap(1,'balanced',1000)).toThrow();
},120000);
it('regional woodland decisions are deterministic and correlated across nearby positions',()=>{
 let same=0,forest=0,urban=0;
 for(let i=0;i<200;i++){const x=i*39,z=i*17;const a=naturalWoodlandAt(x,z,42,'balanced');same+=Number(a===naturalWoodlandAt(x+3,z+3,42,'balanced'));forest+=Number(naturalWoodlandAt(x,z,42,'forest'));urban+=Number(naturalWoodlandAt(x,z,42,'urban'));}
 expect(same).toBeGreaterThan(180);expect(forest).toBeGreaterThan(urban);
});
it('compact metric maps use the same bounded incremental visibility budget as large battles',()=>{
 for(const size of METRIC_MAP_SIZES){setMapSize(size);expect(new Vision(true).width).toBeLessThanOrEqual(256);}
 setMapSize(2048);expect(new Vision().width).toBe(512);
});

it('new intermediate sizes default to a reconstructible generator version',()=>{
 for(const size of [2560,3072,5120]){const m=generateProceduralMap(42,'balanced',size);expect(m.id).toContain('procedural-v11-');expect(getPlayableMap(m.id)).toEqual(m);}
});

import {afterEach,expect,it} from 'vitest';
import {addInteriorLakes,refineRoadConnections} from './mapRefinement';
import {Rng} from './rng';
import {generateProceduralMap,getPlayableMap,mapOptionsMask} from './proceduralMap';
import {validateFreshMap} from './freshMap';
import {resetHeightmap} from './heightmap';
import {footprintsOverlap} from './settlements';
import type {MapFeatureDef} from './mapFeatures';
afterEach(resetHeightmap);

it('joins near-miss T junctions and splits true crossings without changing bridge decks',()=>{
 const features:MapFeatureDef[]=[{id:'main',kind:'road',x:0,z:0,width:4,depth:60},{id:'spur',kind:'road',x:17,z:0,width:4,depth:26,rotation:Math.PI/2},{id:'bridge',kind:'bridge',x:100,z:0,width:12,depth:40}];
 const bridge=structuredClone(features[2]);refineRoadConnections(features);
 expect(features.filter(f=>f.id.startsWith('main-junction-'))).toHaveLength(2);
 expect(features.find(f=>f.id==='spur')!.x).toBeLessThan(17);
 expect(features.find(f=>f.id==='bridge')).toEqual(bridge);
});

it('places multiple seed-dependent lake shores clear of the whole road footprint',()=>{
 const features:MapFeatureDef[]=[{id:'road',kind:'road',x:0,z:0,width:12,depth:4000,rotation:Math.PI/4}];
 addInteriorLakes(4096,new Rng(43),features,[{x:-1400,z:1400,r:250},{x:1400,z:-1400,r:250}]);
 const lakes=features.filter(f=>f.waterBody==='lake');expect(lakes.length).toBeGreaterThanOrEqual(2);
 for(const lake of lakes){expect(lake.polygon).toHaveLength(64);expect(footprintsOverlap(lake,features[0],10)).toBe(false);expect(Math.max(lake.width,lake.depth)).toBeGreaterThan(200);}
});

it.each([2048,4096,6144])('v15 creates visible lake basins and retains all resource/base routes at size %s',size=>{
 const m=generateProceduralMap(43,'balanced',size,15),lakes=m.map.features!.filter(f=>f.waterBody==='lake');
 expect(lakes.length).toBeGreaterThanOrEqual(2);expect(m.map.resources).toHaveLength(9);
 let reason='';expect(validateFreshMap(m,message=>{reason=message;}),reason).toBe(true);
},30000);

it('lakes can be disabled independently and v15 terrain options reconstruct without broadening old IDs',()=>{
 const options={sea:false,mountains:false,forest:false,river:false,lakes:false};
 const m=generateProceduralMap(43,'balanced',2048,15,options);
 expect(mapOptionsMask(options)).toBe(16);expect(m.map.features!.some(f=>f.kind==='water')).toBe(false);
 expect(getPlayableMap(m.id)).toEqual(m);expect(getPlayableMap('procedural-v14-balanced-2048-43-o16')).toBeUndefined();
 let reason='';expect(validateFreshMap({...m,id:'procedural-v15-balanced-2048-43'},message=>{reason=message;})).toBe(false);expect(reason).toContain('Järvedele');
});

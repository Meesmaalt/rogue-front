import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap,type MapArchetype} from './proceduralMap';
import {setMapSize,setBases,setTerrainProfile,setProceduralSeed,resetHeightmap} from './heightmap';
import {World} from './World';
import {findPath} from './nav/Pathfinder';
afterEach(resetHeightmap);
it('4 and 6 km versions reconstruct each archetype without inflating buildings',()=>{
 for(const size of [4096,6144])for(const type of ['balanced','river','urban','highlands','forest','coastal'] as MapArchetype[]){const m=generateProceduralMap(62510,type,size);expect(m.id).toBe(`procedural-v9-${type}-${size}-62510`);expect(getPlayableMap(m.id)).toEqual(m);expect(m.map.features!.filter(f=>f.kind==='building').every(f=>f.width<100)).toBe(true);}
 expect(getPlayableMap('procedural-v8-balanced-6144-1')).toBeUndefined();expect(getPlayableMap('procedural-v9-balanced-2048-1')).toBeUndefined();
},20000);
it('large map grids remain bounded and have routes across bridges to bases and resources',()=>{
 for(const size of [4096,6144]){const m=generateProceduralMap(62510,'balanced',size),map=m.map;setMapSize(size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(m.seed);const w=new World(m.seed,false,map.resources,map.features,map.bases,false);
 expect(w.mapSize).toBe(size);expect(w.nav.width).toBe(1024);expect(w.vision.width).toBe(256);expect(w.waterNav.width).toBe(1024);expect(findPath(w.nav,map.bases[0],map.bases[1],1).length).toBeGreaterThan(1);
 for(const r of w.resourcePoints)expect(findPath(w.nav,map.bases[0],r,1).length,r.label).toBeGreaterThan(0);
 }
},30000);

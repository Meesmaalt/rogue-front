import {afterEach,expect,it} from 'vitest';
import {buildVariedSettlement,footprintsOverlap} from './settlements';
import {Rng} from './rng';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {setMapSize,setBases,setTerrainProfile,setProceduralSeed,resetHeightmap} from './heightmap';
import {World} from './World';
import {findPath} from './nav/Pathfinder';
afterEach(resetHeightmap);
it('refined settlements retain clear connected streets and group taller buildings in the center',()=>{
 const layouts=new Set<string>();let parks=0,civic=0;
 for(let seed=1;seed<=10;seed++){
  const town={x:0,z:0,angle:.3,blocks:4},f=buildVariedSettlement(0,town,new Rng(seed),[],false,true),houses=f.filter(x=>x.kind==='building'),roads=f.filter(x=>x.kind==='road');
  expect(buildVariedSettlement(0,town,new Rng(seed),[],false,true)).toEqual(f);
  layouts.add(roads.map(x=>x.id.split('-')[2]).join('/'));
  parks+=f.filter(x=>x.id.includes('-park-')).length;civic+=houses.filter(x=>x.buildingStyle==='civic').length;
  for(const house of houses){
   expect(roads.some(r=>footprintsOverlap(house,r,.5)),house.id).toBe(false);
   expect(house.facadeColor).toBeDefined();
   if(house.buildingStyle==='apartment')expect(house.district).toBe('center');
  }
  for(let i=0;i<houses.length;i++)for(let j=i+1;j<houses.length;j++)expect(footprintsOverlap(houses[i],houses[j],.5)).toBe(false);
  expect(houses.filter(x=>x.buildingStyle==='civic').length).toBeLessThanOrEqual(1);
 }
 expect(layouts.size).toBeGreaterThan(4);expect(parks).toBeGreaterThan(0);expect(civic).toBeGreaterThan(0);
});
it('v8 map geometry stays clear of later streets and water across representative seeds',()=>{
 for(const seed of [0,27,62510,8103,4294967295]){
  const m=generateProceduralMap(seed),f=m.map.features!;

  expect(m.id).toContain('procedural-v8-');expect(getPlayableMap(m.id)).toEqual(m);
  for(const house of f.filter(x=>x.kind==='building')){const hit=f.find(x=>(x.kind==='road'||x.kind==='water')&&footprintsOverlap(house,x,.5));expect(hit,house.id+' / '+hit?.id).toBeUndefined();}
 }
 const old=generateProceduralMap(62510,'balanced',1792,7);expect(getPlayableMap(old.id)).toEqual(old);
},20000);
it('v8 generation covers all region profiles without breaking the nine economic sites',()=>{
 for(const seed of [0,1,27,62510,8103,4294967295])for(const type of ['balanced','river','highlands','urban','coastal','forest'] as const){
  const m=generateProceduralMap(seed,type);expect(m.map.resources).toHaveLength(9);expect(m.map.features!.filter(f=>f.kind==='building').length).toBeGreaterThan(100);
 }
},30000);
it('v8 bases and economic loading sites remain connected on small and large maps',()=>{
 for(const [seed,type,size] of [[62510,'balanced',1792],[27,'urban',1536],[8103,'highlands',2048]] as const){
  const m=generateProceduralMap(seed,type,size),map=m.map;setMapSize(size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(seed);
  const w=new World(seed,false,map.resources,map.features,map.bases,false);
  expect(findPath(w.nav,map.bases[0],map.bases[1],1.5).length).toBeGreaterThan(1);
  for(const p of map.resources)expect(findPath(w.nav,map.bases[0],p,1.5).length).toBeGreaterThan(0);
 }
},25000);

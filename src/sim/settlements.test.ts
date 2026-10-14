import {afterEach,expect,it} from 'vitest';
import {buildVariedSettlement,footprintsOverlap} from './settlements';
import {Rng} from './rng';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {resetHeightmap,setMapSize,setBases,setTerrainProfile,setProceduralSeed} from './heightmap';
import {World} from './World';
import {findPath} from './nav/Pathfinder';
afterEach(resetHeightmap);
it('rotated footprints admit close neighbours while rejecting genuine overlaps',()=>{
 const a={id:'a',kind:'building' as const,x:0,z:0,width:8,depth:9,rotation:.3};
 expect(footprintsOverlap(a,{...a,id:'b',x:1},.8)).toBe(true);
 expect(footprintsOverlap(a,{...a,id:'b',x:15},.8)).toBe(false);
});
it('seeded settlements mix real footprints and sizes and retain clear roads and neighbours',()=>{
 const styles=new Set<string>(),shapes=new Set<string>(),counts:number[]=[];
 for(const seed of [1,2,3,4,27]){
  const town={x:0,z:0,angle:.3,blocks:4},f=buildVariedSettlement(0,town,new Rng(seed),[]),houses=f.filter(f=>f.kind==='building'),roads=f.filter(f=>f.kind==='road');
  expect(buildVariedSettlement(0,town,new Rng(seed),[])).toEqual(f);
  counts.push(houses.length);shapes.add(roads.map(r=>r.id.split('-')[2]).join('/'));
  for(const house of houses){styles.add(house.buildingStyle!);expect(roads.some(r=>footprintsOverlap(house,r,.5))).toBe(false);}
  for(let i=0;i<houses.length;i++)for(let j=i+1;j<houses.length;j++)expect(footprintsOverlap(houses[i],houses[j],.5)).toBe(false);
 }
 expect(styles.has('apartment')).toBe(true);expect(styles.has('shop')).toBe(true);expect(styles.has('rowhouse')).toBe(true);expect(shapes.size).toBeGreaterThan(1);expect(new Set(counts).size).toBeGreaterThan(1);
 const hamlet=buildVariedSettlement(2,{x:0,z:0,angle:0,blocks:1},new Rng(1),[]);
 expect(hamlet.filter(f=>f.kind==='building').length).toBeLessThan(Math.min(...counts));
});
it('v7 includes connected three-building factory yards and restores older v6 identities',()=>{
 for(const seed of [27,62510,8103]){
  const m=generateProceduralMap(seed),f=m.map.features!;
  for(const house of f.filter(x=>x.kind==='building')){const hit=f.find(x=>(x.kind==='road'||x.kind==='water')&&footprintsOverlap(house,x,.5));expect(hit,house.id+' / '+hit?.id).toBeUndefined();}
  expect(m.id).toContain('procedural-v7-');expect(getPlayableMap(m.id)).toEqual(m);
  const factories=f.filter(f=>f.id.startsWith('industry-')&&f.buildingStyle==='industrial');expect(factories.length).toBeGreaterThan(0);
  for(const factory of factories){const prefix=factory.id.split('-').slice(0,2).join('-');expect(f.filter(x=>x.id.startsWith(prefix+'-')&&x.kind==='building')).toHaveLength(3);expect(f.some(x=>x.id===prefix+'-access')).toBe(true);}
 }
 const old=generateProceduralMap(62510,'balanced',1792,6);expect(getPlayableMap(old.id)).toEqual(old);
});
it('dense v7 streets and industries preserve regional economic routes',()=>{
 for(const [seed,type,size] of [[62510,'balanced',1792],[27,'urban',1536],[8103,'highlands',2048]] as const){
  const m=generateProceduralMap(seed,type,size),map=m.map;
  setMapSize(size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(seed);
  const w=new World(seed,false,map.resources,map.features,map.bases,false);
  expect(findPath(w.nav,map.bases[0],map.bases[1],1.5).length).toBeGreaterThan(1);
  for(const p of map.resources)expect(findPath(w.nav,map.bases[0],p,1.5).length).toBeGreaterThan(0);
 }
},25000);

it('v7 generation succeeds over seed boundaries and all archetypes',()=>{
 for(const seed of [0,1,2,3,27,8103,62510,4294967295])for(const type of ['balanced','river','highlands','urban','coastal','forest'] as const){
  const m=generateProceduralMap(seed,type);
  expect(m.map.resources).toHaveLength(9);expect(m.map.features!.filter(f=>f.kind==='building').length).toBeGreaterThan(100);
 }
},30000);

import {afterEach,expect,it} from 'vitest';
import {naturalHills,naturalForestEdge} from './naturalLandscape';
import {Rng} from './rng';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {resetHeightmap,setMapSize,setBases,setProceduralSeed,setTerrainProfile,heightAt} from './heightmap';
import {World} from './World';
import {createSkirmish} from './scenario';
import {findPath} from './nav/Pathfinder';
afterEach(resetHeightmap);
it('rolling hills have varied compact support while keeping protected bases and roads clear',()=>{
 const roads:MapFeatureDef[]=[{id:'road',kind:'road',x:0,z:0,width:10,depth:4096}],points=[{x:1000,z:1000,r:100}],a=naturalHills(4096,'balanced',new Rng(42),roads,points);
 expect(a.length).toBeGreaterThan(8);expect(a).toEqual(naturalHills(4096,'balanced',new Rng(42),roads,points));expect(new Set(a.map(f=>Math.round(f.height))).size).toBeGreaterThan(5);
 for(const f of a){expect(pointInFeature(f.x,f.z,roads[0],Math.max(f.width,f.depth))).toBe(false);expect(Math.hypot(f.x-1000,f.z-1000)).toBeGreaterThan(100+Math.max(f.width,f.depth));}
});
it('irregular forest boundaries remain inside the original clear parcel',()=>{
 const points=[{x:-200,z:-200},{x:200,z:-200},{x:200,z:200},{x:-200,z:200}],f:MapFeatureDef={id:'parcel',kind:'cover',appearance:'forest',x:0,z:0,width:400,depth:400,polygon:points},edge=naturalForestEdge(points,new Rng(7));
 expect(edge.length).toBeGreaterThan(points.length);expect(edge.every(p=>pointInFeature(p.x,p.z,f))).toBe(true);expect(edge).toEqual(naturalForestEdge(points,new Rng(7)));
});
it('natural 4/6 km maps preserve old v9 reconstruction and start both teams with serviced aircraft',()=>{
 for(const size of [4096,6144]){const m=generateProceduralMap(62510,'balanced',size),map=m.map;expect(m.id).toContain('procedural-v10-');expect(map.terrainProfile).toBe('farmland-natural');expect(getPlayableMap(m.id)).toEqual(m);expect(map.landforms!.length).toBeGreaterThan(10);
 setMapSize(size);setBases(map.bases);setProceduralSeed(m.seed);setTerrainProfile(map.terrainProfile,map.landforms);const w=new World(m.seed,false,map.resources,map.features,map.bases,false);w.metricBattle=true;w.networkMode=true;createSkirmish(w,true,true);
 for(const team of [0,1] as const){const airports=w.entities.filter(e=>e.team===team&&e.kind==='airbase'),planes=w.entities.filter(e=>e.team===team&&e.kind==='fighter');expect(airports).toHaveLength(1);expect(planes).toHaveLength(2);expect(w.nearestSupplyDepot(team,airports[0],false)).toBeTruthy();for(const p of planes){expect(p.airState).toBe('grounded');expect(p.airMissionHomeId).toBe(airports[0].id);expect(p.ammo).toBe(p.maxAmmo);}expect(planes.some(p=>p.equipment?.weapon==='multirole'&&p.def.weapons?.some(s=>s.targets!=='air'))).toBe(true);}
 expect(findPath(w.nav,map.bases[0],map.bases[1],1).length).toBeGreaterThan(1);for(const r of w.resourcePoints)expect(findPath(w.nav,map.bases[0],r,1).length,r.label).toBeGreaterThan(0);
 }
 const old=generateProceduralMap(27,'balanced',4096,9);expect(old.map.terrainProfile).toBe('farmland');expect(getPlayableMap(old.id)).toEqual(old);
},30000);
it('natural surface detail adds relief without changing the legacy farmland profile',()=>{
 setMapSize(4096);setBases([{x:0,z:0,r:100}]);setProceduralSeed(123);setTerrainProfile('farmland',[]);const old=heightAt(600,600);setTerrainProfile('farmland-natural',[]);expect(heightAt(600,600)).not.toBe(old);setTerrainProfile('farmland',[]);expect(heightAt(600,600)).toBe(old);
});
it('natural generation succeeds across archetypes and seed/size boundaries',()=>{
 for(const [size,seed] of [[4096,0],[6144,4294967295]] as const)for(const type of ['balanced','river','forest','urban','highlands','coastal'] as const){const m=generateProceduralMap(seed,type,size);expect(m.map.resources).toHaveLength(9);expect(m.map.landforms!.length).toBeGreaterThan(0);expect(m.map.features!.some(f=>f.appearance==='forest'&&f.polygon)).toBe(true);}
},30000);

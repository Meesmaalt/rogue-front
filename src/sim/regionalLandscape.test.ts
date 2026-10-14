import {afterEach,expect,it} from 'vitest';
import {buildOrganicTown,parcelArea,ridgeReliefAt,subtractParcel} from './regionalLandscape';
import {Rng} from './rng';
import {pointInFeature} from './mapFeatures';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {setMapSize,setBases,setTerrainProfile,setProceduralSeed,resetHeightmap} from './heightmap';
import {World} from './World';
import {findPath} from './nav/Pathfinder';
afterEach(resetHeightmap);

it('convex subtraction retains farmland on both sides of a crossing',()=>{
 const field=[{x:0,z:0},{x:100,z:0},{x:100,z:100},{x:0,z:100}];
 const road=[{x:45,z:-10},{x:55,z:-10},{x:55,z:110},{x:45,z:110}];
 const pieces=subtractParcel(field,road);
 expect(pieces.reduce((n,p)=>n+parcelArea(p),0)).toBeCloseTo(9000);
 expect(pieces.length).toBe(2);
 expect(subtractParcel(field,[{x:-10,z:-10},{x:110,z:-10},{x:110,z:110},{x:-10,z:110}])).toEqual([]);
});
it('organic lots align to curved connected streets and stay clear of physical footprints',()=>{
 const town={x:0,z:0,angle:.24,blocks:3},features=buildOrganicTown(0,town,'residential',[4,7],.95,new Rng(12),[]);
 const roads=features.filter(f=>f.kind==='road'),houses=features.filter(f=>f.kind==='building');
 expect(houses.length).toBeGreaterThan(40);
 expect(new Set(roads.map(f=>f.rotation!.toFixed(2))).size).toBeGreaterThan(15);
 for(const h of houses){
  expect(roads.some(r=>pointInFeature(h.x,h.z,r,Math.hypot(h.width,h.depth)/2))).toBe(false);
  expect(roads.some(r=>pointInFeature(h.x,h.z,r,18))).toBe(true);
 }
 expect(buildOrganicTown(0,town,'residential',[4,7],.95,new Rng(12),[])).toEqual(features);
});
it('v6 maps preserve v5 reconstruction and maintain usable geography across seeds and archetypes',()=>{
 for(const seed of [0,27,8103,62510,4294967295])for(const type of ['balanced','river','highlands','urban','coastal','forest'] as const){
  const m=generateProceduralMap(seed,type);
  expect(m.map.landforms!.length).toBeGreaterThanOrEqual(3);
  if(type==='highlands'){
    const forms=m.map.landforms!;
    expect(forms.some((a,i)=>forms.some((b,j)=>i!==j&&Math.hypot(a.x-b.x,a.z-b.z)<a.width+b.width))).toBe(true);
  }
  expect(getPlayableMap(m.id)).toEqual(m);
  expect(m.id).toContain('procedural-v6-');
  expect(m.map.resources.length).toBe(9);
  for(const p of m.map.resources)expect(ridgeReliefAt(p,m.map.landforms!)).toBeLessThanOrEqual(2);
 }
 const old=generateProceduralMap(27,'highlands',1792,5);expect(getPlayableMap(old.id)).toEqual(old);
},20000);

it('v6 resources and opposing bases remain connected on the smallest and largest regions',()=>{
 for(const [seed,size,type] of [[0,1536,'urban'],[27,2048,'highlands'],[62510,1792,'coastal']] as const){
  const m=generateProceduralMap(seed,type,size),map=m.map;
  setMapSize(size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(seed);
  const w=new World(seed,false,map.resources,map.features,map.bases,false);
  expect(findPath(w.nav,map.bases[0],map.bases[1],1.5).length,`${seed}: bases`).toBeGreaterThan(1);
  for(const p of map.resources){
   expect(w.nav.isWalkableWorld(p.x,p.z,1.5),`${seed}: resource loading area`).toBe(true);
   expect(findPath(w.nav,map.bases[0],p,1.5).length,`${seed}: resource route`).toBeGreaterThan(0);
  }
 }
},20000);

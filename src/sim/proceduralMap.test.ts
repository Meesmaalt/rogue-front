import {afterEach,expect,it} from "vitest";
import {generateProceduralMap,getPlayableMap} from "./proceduralMap";
import {pointInFeature,featureCorners} from "./mapFeatures";
import {MAP_SIZE,setMapSize,setBases,setTerrainProfile,setProceduralSeed,heightAt,resetHeightmap} from "./heightmap";
import {World} from "./World";
import {createSkirmish} from "./scenario";
import {findPath} from "./nav/Pathfinder";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
afterEach(resetHeightmap);
it("versioned seeded maps are reproducible and create dense wards and polygonal land use",()=>{
 const m=generateProceduralMap(62510,"balanced",1280),same=getPlayableMap(m.id)!;
 expect(same).toEqual(m);expect(getPlayableMap("procedural-balanced-62510")!.id).toBe("procedural-balanced-62510");expect(generateProceduralMap(8103).map.features).not.toEqual(m.map.features);
 const f=m.map.features!;expect(f.filter(x=>x.kind==="building").length).toBeGreaterThan(130);
 expect(f.filter(x=>x.polygon).length).toBeGreaterThan(30);
 expect(f.some(x=>x.waterBody==="lake"&&x.polygon)).toBe(true);
 expect(m.map.landforms!.length).toBe(2);
});
it("houses and physical resource facilities stay clear of road and water footprints",()=>{
 for(const seed of [62510,8103,27]){
  const m=generateProceduralMap(seed,"balanced",1280),f=m.map.features!;
  for(const house of f.filter(x=>x.kind==="building"))expect(f.some(x=>(x.kind==="road"||x.kind==="water")&&pointInFeature(house.x,house.z,x,Math.max(house.width,house.depth)/2+.8)),`${seed}: ${house.id}`).toBe(false);
  for(const r of m.map.resources){const p={x:r.x+r.facilityOffset!.x,z:r.z+r.facilityOffset!.z};expect(f.some(x=>(x.kind==="road"||x.kind==="water"||x.kind==="building")&&pointInFeature(p.x,p.z,x,8)),`${seed}: ${r.label}`).toBe(false);}
 }
});
it("polygon cover respects its actual edges and a lake has a curved footprint",()=>{
 const m=generateProceduralMap(62510,"balanced",1280),f=m.map.features!,lake=f.find(x=>x.waterBody==="lake")!;
 expect(pointInFeature(lake.x,lake.z,lake)).toBe(true);expect(pointInFeature(lake.x+lake.width*.49,lake.z+lake.depth*.49,lake)).toBe(false);
 expect(featureCorners(lake).length).toBeGreaterThan(20);
 const parcel=f.find(x=>x.polygon)!;expect(pointInFeature(parcel.polygon![0].x,parcel.polygon![0].z,parcel)).toBe(true);
});
it("the generated match connects bases and resource loading areas and restores deterministic play",()=>{
 const m=generateProceduralMap(62510,"balanced",1280),map=m.map;setMapSize(map.size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(m.seed);
 const w=new World(m.seed,false,map.resources,map.features,map.bases,false);w.networkMode=true;
 expect(findPath(w.nav,map.bases[0],map.bases[1],1.5).length).toBeGreaterThan(1);
 for(const r of w.resourcePoints){expect(w.nav.isWalkableWorld(r.x,r.z,1.5)).toBe(true);expect(findPath(w.nav,map.bases[0],r,1.5).length).toBeGreaterThan(0);}
 const u=w.spawn("tank",0,map.bases[0].x,map.bases[0].z);w.issue({type:"move",ids:[u.id],x:map.bases[0].x+30,z:map.bases[0].z});for(let i=0;i<60;i++)w.tick(1/30);
 const copy=new World(m.seed,false,map.resources,map.features,map.bases,false);loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<30;i++){w.tick(1/30);copy.tick(1/30);}expect(worldHash(copy)).toBe(worldHash(w));
},20000);

it("ready generated deployment starts on dry navigable land and activates physical resource deliveries",()=>{
 const m=generateProceduralMap(62510),map=m.map;setMapSize(map.size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(m.seed);
 const w=new World(m.seed,false,map.resources,map.features,map.bases,false);w.networkMode=true;createSkirmish(w,true,true);
 for(const e of w.entities.filter(e=>e.def.speed>0&&e.def.domain==="land"&&e.kind!=="engineer"))expect(w.nav.isWalkableWorld(e.x,e.z,e.def.radius),e.kind).toBe(true);
 for(let i=0;i<360*30&&w.roadCargoDelivered[0]<100;i++)w.tick(1/30);
 expect(w.resourcePoints[0].active).toBe(true);expect(w.roadCargoDelivered[0]).toBeGreaterThanOrEqual(100);
},20000);

it("regional maps encode size and seed and add playable settlements and economic zones",()=>{
 for(const size of [1536,1792,2048]){
  const m=generateProceduralMap(62510,"balanced",size,6);expect(getPlayableMap(m.id)).toEqual(m);
  expect(m.map.size).toBe(size);expect(m.map.resources.length).toBe(9);
  expect(m.map.features!.filter(f=>f.kind==="building").length).toBeGreaterThan(220);
  expect(m.map.features!.some(f=>f.id.startsWith("farm-"))).toBe(true);
  const f=m.map.features!;
  for(const house of f.filter(f=>f.kind==="building"))expect(f.some(r=>(r.kind==="road"||r.kind==="water")&&pointInFeature(house.x,house.z,r,Math.max(house.width,house.depth)/2+.8)),`${size}: ${house.id}`).toBe(false);
 }
 expect(getPlayableMap("procedural-v3-balanced-9999-1")).toBeUndefined();
});

it("large regional deployment has routes to both bases and all nine resource loading yards",()=>{
 const m=generateProceduralMap(8103,"highlands",2048),map=m.map;
 setMapSize(map.size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(m.seed);
 expect(MAP_SIZE).toBe(map.size);
 const w=new World(m.seed,false,map.resources,map.features,map.bases,false);w.networkMode=true;createSkirmish(w,true,true);
 expect(findPath(w.nav,map.bases[0],map.bases[1],1.5).length).toBeGreaterThan(1);
 for(const r of w.resourcePoints){expect(w.nav.isWalkableWorld(r.x,r.z,1.5),r.label).toBe(true);expect(findPath(w.nav,map.bases[0],r,1.5).length,r.label).toBeGreaterThan(0);}
 for(const e of w.entities.filter(e=>e.def.speed>0&&e.def.domain==="land"&&e.kind!=="engineer"))expect(w.nav.isWalkableWorld(e.x,e.z,e.def.radius),e.kind).toBe(true);
},20000);

it("v4 archetypes change relief and settlement silhouettes while preserving v3 reconstruction",()=>{
 const hills=generateProceduralMap(27,"highlands",1792,4),river=generateProceduralMap(27,"river",1792,4),city=generateProceduralMap(27,"urban",1792,4),forest=generateProceduralMap(27,"forest",1792,4);
 expect(Math.max(...hills.map.landforms!.map(f=>f.height))).toBeGreaterThan(32);
 expect(Math.max(...river.map.landforms!.map(f=>f.height))).toBeLessThanOrEqual(10);
 const houses=(m:ReturnType<typeof generateProceduralMap>)=>m.map.features!.filter(f=>f.kind==="building");
 expect(houses(city).length).toBeGreaterThan(houses(forest).length);
 expect(houses(city).some(f=>f.buildingStyle==="industrial")).toBe(true);
 expect(houses(forest).filter(f=>f.id.startsWith("town-")).every(f=>f.buildingStyle==="rural")).toBe(true);
 const old=generateProceduralMap(62510,"balanced",1792,3);expect(old.id).toBe("procedural-v3-balanced-1792-62510");expect(getPlayableMap(old.id)).toEqual(old);
 expect(getPlayableMap(city.id)).toEqual(city);
});

it("v5 mountain relief uses compact rotated ridges while v4 maps retain the previous hills",()=>{
 const m=generateProceduralMap(27,"highlands",1792,5),old=generateProceduralMap(27,"highlands",1792,4);
 expect(m.id).toContain("procedural-v5-");expect(getPlayableMap(old.id)).toEqual(old);expect(getPlayableMap(m.id)).toEqual(m);
 expect(m.map.landforms!.length).toBeGreaterThan(0);expect(m.map.landforms!.every(f=>f.shape==="ridge"&&f.width<=185&&f.depth<=120)).toBe(true);
 expect(old.map.landforms!.every(f=>!f.shape&&f.width>=230)).toBe(true);
 const ridge=m.map.landforms![0],angle=ridge.rotation!;setMapSize(m.map.size);setBases([]);setTerrainProfile("farmland",[ridge]);setProceduralSeed(m.seed);
 expect(heightAt(ridge.x,ridge.z)-heightAt(ridge.x+Math.cos(angle)*ridge.width*1.1,ridge.z-Math.sin(angle)*ridge.width*1.1)).toBeGreaterThan(30);
});

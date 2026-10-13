import {afterEach,expect,it} from "vitest";
import {generateProceduralMap,getPlayableMap} from "./proceduralMap";
import {pointInFeature,featureCorners} from "./mapFeatures";
import {setMapSize,setBases,setTerrainProfile,setProceduralSeed,resetHeightmap} from "./heightmap";
import {World} from "./World";
import {createSkirmish} from "./scenario";
import {findPath} from "./nav/Pathfinder";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
afterEach(resetHeightmap);
it("versioned seeded maps are reproducible and create dense wards and polygonal land use",()=>{
 const m=generateProceduralMap(62510),same=getPlayableMap(m.id)!;
 expect(same).toEqual(m);expect(getPlayableMap("procedural-balanced-62510")!.id).toBe("procedural-balanced-62510");expect(generateProceduralMap(8103).map.features).not.toEqual(m.map.features);
 const f=m.map.features!;expect(f.filter(x=>x.kind==="building").length).toBeGreaterThan(130);
 expect(f.filter(x=>x.polygon).length).toBeGreaterThan(30);
 expect(f.some(x=>x.waterBody==="lake"&&x.polygon)).toBe(true);
 expect(m.map.landforms!.length).toBe(2);
});
it("houses and physical resource facilities stay clear of road and water footprints",()=>{
 for(const seed of [62510,8103,27]){
  const m=generateProceduralMap(seed),f=m.map.features!;
  for(const house of f.filter(x=>x.kind==="building"))expect(f.some(x=>(x.kind==="road"||x.kind==="water")&&pointInFeature(house.x,house.z,x,Math.max(house.width,house.depth)/2+.8)),`${seed}: ${house.id}`).toBe(false);
  for(const r of m.map.resources){const p={x:r.x+r.facilityOffset!.x,z:r.z+r.facilityOffset!.z};expect(f.some(x=>(x.kind==="road"||x.kind==="water"||x.kind==="building")&&pointInFeature(p.x,p.z,x,8)),`${seed}: ${r.label}`).toBe(false);}
 }
});
it("polygon cover respects its actual edges and a lake has a curved footprint",()=>{
 const m=generateProceduralMap(62510),f=m.map.features!,lake=f.find(x=>x.waterBody==="lake")!;
 expect(pointInFeature(lake.x,lake.z,lake)).toBe(true);expect(pointInFeature(lake.x+lake.width*.49,lake.z+lake.depth*.49,lake)).toBe(false);
 expect(featureCorners(lake).length).toBeGreaterThan(20);
 const parcel=f.find(x=>x.polygon)!;expect(pointInFeature(parcel.polygon![0].x,parcel.polygon![0].z,parcel)).toBe(true);
});
it("the generated match connects bases and resource loading areas and restores deterministic play",()=>{
 const m=generateProceduralMap(62510),map=m.map;setMapSize(map.size);setBases(map.bases);setTerrainProfile(map.terrainProfile,map.landforms);setProceduralSeed(m.seed);
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
 for(let i=0;i<260*30&&w.roadCargoDelivered[0]<100;i++)w.tick(1/30);
 expect(w.resourcePoints[0].active).toBe(true);expect(w.roadCargoDelivered[0]).toBeGreaterThanOrEqual(100);
},20000);

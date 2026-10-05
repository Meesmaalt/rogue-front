import {it,expect,afterEach} from "vitest";
import {World} from "./World";
import {resetHeightmap,setMapSize,setBases,heightAt,setTerrainProfile,setProceduralSeed} from "./heightmap";
import {FOCUS_MAP} from "./proceduralMap";
import {findPath} from "./nav/Pathfinder";
import type {MapFeatureDef} from "./mapFeatures";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
import {updateProjectiles} from "./systems/projectiles";
import {fireGroundProjectile} from "./systems/combat";
import {detectionScore,coverValueAt} from "./systems/sensors";
const features:MapFeatureDef[]=[{id:"forest",kind:"cover",appearance:"forest",x:0,z:-200,width:112,depth:96,height:8,blocksMovement:false},{id:"track",kind:"road",x:38,z:-200,width:6,depth:110}];
function fixture(){const bases=[{x:0,z:-200,r:200},{x:200,z:200,r:30}];setBases(bases);const w=new World(61,false,[],features,bases,false);w.networkMode=true;return w;}
afterEach(resetHeightmap);
it("terrain: infantry and armor traverse woods, roads clear canopy, movement and firing expose troops",()=>{
 const w=fixture(),u=w.spawn("inf",0,0,-200),tank=w.spawn("tank",0,0,-205),observer=w.spawn("reconInf",1,-15,-200);
 expect(w.nav.isWalkableWorld(u.x,u.z,u.def.radius)).toBe(true);expect(w.nav.isWalkableWorld(tank.x,tank.z,tank.def.radius)).toBe(true);
 expect(w.terrain.movementFactor(u)).toBeGreaterThan(w.terrain.movementFactor(tank));expect(w.terrain.densityAt(38,-200)).toBe(0);
 const hidden=detectionScore(observer,u,coverValueAt(w,u.x,u.z),10);u.motionSpeed=2;expect(detectionScore(observer,u,24,10)).toBeGreaterThan(hidden);
 u.motionSpeed=0;u.lastCombatTime=9;expect(detectionScore(observer,u,24,10)).toBeGreaterThan(hidden);
});
it("terrain: real HE impact starts fire, smoke blocks sight, casualties and char survive save continuation",()=>{
 const w=fixture(),arty=w.spawn("artillery",0,-75,-200),u=w.spawn("inf",1,8,-200);w.spatial.rebuild(w.entities);
 fireGroundProjectile(w,arty,8,-200);for(let i=0;i<180;i++)updateProjectiles(w,1/30);
 expect(w.terrain.fireAt(8,-200)).toBe(true);
 const observer=w.spawn("reconInf",0,-40,-200),far=w.spawn("inf",1,32,-200),hp=u.hp;
 const obscured=w.vision.forestDepth(observer,far);expect(obscured).toBeGreaterThan(40);
 w.terrain.tick(w,1);expect(u.hp).toBeLessThan(hp);expect(u.suppression).toBeGreaterThan(0);
 const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=fixture();loadWorld(copy,saved);expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<50;i++){w.terrain.tick(w,1);copy.terrain.tick(copy,1);}expect(worldHash(copy)).toBe(worldHash(w));
 expect(w.terrain.burntAt(8,-200)).toBe(true);expect(coverValueAt(w,8,-200)).toBeLessThan(10);
});
it("terrain: 960m Roheorg connects both bases with full-sized navigation and vision",()=>{
 setMapSize(FOCUS_MAP.map.size);setBases(FOCUS_MAP.map.bases);setTerrainProfile("farmland");setProceduralSeed(FOCUS_MAP.seed);
 const m=FOCUS_MAP.map,w=new World(FOCUS_MAP.seed,false,m.resources,m.features,m.bases,false);
 expect(w.mapSize).toBe(960);expect(w.nav.width).toBe(480);expect(w.vision.width).toBe(240);
 const path=findPath(w.nav,{x:m.bases[0].x+20,z:m.bases[0].z},{x:m.bases[1].x-20,z:m.bases[1].z},1.5);expect(path.length).toBeGreaterThan(1);
 expect(m.features!.filter(f=>f.kind==="building").length).toBeGreaterThan(40);expect(heightAt(450,450)).toBeGreaterThanOrEqual(0);
});

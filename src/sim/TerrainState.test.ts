import {it,expect,afterEach} from "vitest";
import {World} from "./World";
import {resetHeightmap,setMapSize,setBases,heightAt,setTerrainProfile,setProceduralSeed,groundHeightAt} from "./heightmap";
import {FOCUS_MAP} from "./proceduralMap";
import {findPath} from "./nav/Pathfinder";
import {pointInFeature} from "./mapFeatures";
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
it("terrain: 1088m Roheorg connects both bases with full-sized navigation and vision",()=>{
 setMapSize(FOCUS_MAP.map.size);setBases(FOCUS_MAP.map.bases);setTerrainProfile("farmland");setProceduralSeed(FOCUS_MAP.seed);
 const m=FOCUS_MAP.map,w=new World(FOCUS_MAP.seed,false,m.resources,m.features,m.bases,false);
 expect(w.mapSize).toBe(1088);expect(w.nav.width).toBe(544);expect(w.vision.width).toBe(272);
 const path=findPath(w.nav,{x:m.bases[0].x+20,z:m.bases[0].z},{x:m.bases[1].x-20,z:m.bases[1].z},1.5);expect(path.length).toBeGreaterThan(1);
 expect(m.features!.filter(f=>f.kind==="building").length).toBeGreaterThan(40);expect(heightAt(450,450)).toBeGreaterThanOrEqual(0);
});

it("Rohe river blocks ground passage except real decks; collapse and save restore close crossings",()=>{
 const m=FOCUS_MAP.map;setMapSize(m.size);setBases(m.bases);setTerrainProfile("farmland");
 const features=m.features as MapFeatureDef[],bridges=features.filter(f=>f.kind==="bridge"),water=features.filter(f=>f.kind==="water");
 // Bridge precedence does not depend on JSON array order.
 const w=new World(FOCUS_MAP.seed,false,m.resources,[...bridges,...features.filter(f=>f.kind!=="bridge")],m.bases,false);
 const mid=water[0];expect(w.nav.isWalkableWorld(mid.x,mid.z,1)).toBe(false);
 const b=bridges.find(f=>Math.hypot(f.x,f.z)<20)!;
 expect(w.nav.isWalkableWorld(b.x,b.z,2)).toBe(true);
 expect(heightAt(b.x,b.z)).toBeCloseTo(b.surfaceHeight!,1);
 expect(groundHeightAt(b.x,b.z)).toBeLessThan(-2);
 const path=findPath(w.nav,{x:-100,z:50},{x:100,z:-50},2);
 expect(path.length).toBeGreaterThan(1);
 const onBridge=path.some((p,i)=>i>0&&Array.from({length:20},(_,j)=>({x:path[i-1].x+(p.x-path[i-1].x)*j/19,z:path[i-1].z+(p.z-path[i-1].z)*j/19})).some(q=>bridges.some(f=>pointInFeature(q.x,q.z,f))));
 expect(onBridge).toBe(true);
 const arty=w.spawn("artillery",0,b.x-60,b.z);fireGroundProjectile(w,arty,b.x,b.z);
 const shell=w.projectiles[w.projectiles.length-1];shell.damage=2000;shell.impactDamage=2000;
 for(let i=0;i<240&&w.projectiles.length;i++)updateProjectiles(w,1/30);
 expect(w.infrastructureDamage.get(b.id)).toBeGreaterThanOrEqual(1);
 for(const bridge of bridges)w.damageInfrastructure(bridge.id,1);
 expect(w.nav.isWalkableWorld(b.x,b.z,2)).toBe(false);
 expect(heightAt(b.x,b.z)).toBeLessThan(-2);
 const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=new World(FOCUS_MAP.seed,false,m.resources,features,m.bases,false);loadWorld(copy,saved);
 expect(copy.nav.isWalkableWorld(b.x,b.z,2)).toBe(false);
 expect(findPath(copy.nav,{x:-100,z:50},{x:100,z:-50},2)).toHaveLength(0);
});

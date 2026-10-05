import {heightAt} from "./heightmap";
import {fireProjectile,canEngage} from "./systems/combat";
import {updateProjectiles} from "./systems/projectiles";
import {afterEach,expect,it} from "vitest";
import {World} from "./World";
import {FOCUS_MAP} from "./proceduralMap";
import {resetHeightmap,setTerrainProfile,setBases,setProceduralSeed} from "./heightmap";
import {pointInFeature,featureCorners,type MapFeatureDef} from "./mapFeatures";
import {createSkirmish} from "./scenario";
import {SIM_STEP} from "./constants";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
afterEach(resetHeightmap);
const run=(w:World,s:number)=>{for(let i=0;i<s*30;i++)w.tick(SIM_STEP);};
function world(features=FOCUS_MAP.map.features!):World{setBases(FOCUS_MAP.map.bases);setProceduralSeed(FOCUS_MAP.seed);setTerrainProfile("farmland");const w=new World(FOCUS_MAP.seed,false,FOCUS_MAP.map.resources,features,FOCUS_MAP.map.bases,FOCUS_MAP.map.baseDefenses);w.networkMode=true;return w;}
it("rotated visible geometry agrees with navigation and attack-move routes around a house",()=>{
 const f:MapFeatureDef={id:"house",kind:"building",x:0,z:0,width:12,depth:24,rotation:Math.PI/4,height:5};
 for(const p of featureCorners(f))expect(pointInFeature(p.x,p.z,f,.001)).toBe(true);
 const w=world([f]);const u=w.spawn("tank",0,-30,0);w.issue({type:"amove",ids:[u.id],x:30,z:0});
 for(let i=0;i<600;i++){w.tick(SIM_STEP);expect(pointInFeature(u.x,u.z,f)).toBe(false);}
 expect(Math.hypot(u.x-30,u.z)).toBeLessThan(5);
});
it("the ready deployment has powered production, actual combat damage and reproducible save continuation",()=>{
 const w=world();createSkirmish(w,true);run(w,2);
 const factory=w.entities.find(e=>e.kind==="factory"&&e.team===0)!;
 expect(w.productionOperational(factory,"tank").operational).toBe(true);
 const group=w.entities.filter(e=>e.team===0&&["tank","apc","inf","reconVehicle"].includes(e.kind));
 const enemy=w.entities.filter(e=>e.team===1&&e.def.damage>0&&e.def.speed>0);
 w.issue({type:"amove",ids:group.map(e=>e.id),x:32,z:-8});
 w.issue({type:"amove",team:1,ids:enemy.map(e=>e.id),x:-32,z:8});run(w,35);
 expect(w.entities.some(e=>e.def.speed>0&&e.kind!=="engineer"&&e.hp<e.def.hp)||enemy.some(e=>e.dead)).toBe(true);
 expect([...group,...enemy].some(e=>(e.ammo??0)<(e.maxAmmo??0))).toBe(true);
 const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=world();loadWorld(copy,saved);expect(worldHash(copy)).toBe(worldHash(w));run(w,1);run(copy,1);expect(worldHash(copy)).toBe(worldHash(w));
});

// Small integration checks only; no repeated full match / browser battle runs.
it("weapon-logistics smoke: guided missile flight and physical depot delivery",()=>{
 const w=world([]);createSkirmish(w,true);
 const source=w.resourcePoints[0];source.controlledBy=0;source.controlProgress=1;source.active=true;source.amount=500;
 run(w,.1);
 const depot=w.entities.find(e=>e.kind==="supply"&&e.team===0)!;
 const h=w.entities.find(e=>e.kind==="transport"&&e.team===0&&e.supplyDepotId===depot.id)!;
 expect(h).toBeTruthy();expect(depot.nextLogisticsDispatch).toBeGreaterThan(w.time);
 h.x=source.x;h.z=source.z;h.y=heightAt(h.x,h.z);h.fuel=800;h.motionSpeed=0;
 run(w,7);expect(h.cargo).toBeGreaterThan(0);
 const amount=h.cargo,before=w.teamResources[0];h.x=h.logisticsHome!.x;h.z=h.logisticsHome!.z;h.y=heightAt(h.x,h.z);h.motionSpeed=0;
 run(w,3.5);expect(h.cargo).toBe(0);expect(w.teamResources[0]).toBeGreaterThanOrEqual(before+amount*.6);
 const a=w.spawn("heli",0,-95,-220),t=w.spawn("tank",1,-5,-220);a.y=heightAt(a.x,a.z)+30;
 const ammo=a.ammo!;fireProjectile(w,a,t,a.x,a.y,a.z);const missile=w.projectiles[w.projectiles.length-1]!;missile.hitChance=1;
 expect(missile.weapon).toBe("missile");expect(a.ammo).toBe(ammo-1);expect(canEngage(a,t)).toBe(true);expect(canEngage(t,a)).toBe(false);
 updateProjectiles(w,SIM_STEP);expect(missile.x).toBeGreaterThan(a.x);expect(missile.y).toBeLessThan(a.y);
 const hp=t.hp;for(let i=0;i<150;i++)updateProjectiles(w,SIM_STEP);expect(t.hp).toBeLessThan(hp);
 const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=world([]);loadWorld(copy,saved);expect(worldHash(copy)).toBe(worldHash(w));
});

it("tactical movement: legal formation slots, one-way queues and convoy controls",()=>{
 const obstacle:MapFeatureDef={id:"test-block",kind:"building",x:0,z:-200,width:14,depth:24,height:5};
 const w=world([obstacle]);const group=Array.from({length:4},(_,i)=>w.spawn("tank",0,-35,-209+i*6.8));
 w.issue({type:"move",ids:group.map(u=>u.id),x:0,z:-200});run(w,.1);
 for(const u of group){expect(w.nav.isWalkableWorld(u.dest!.x,u.dest!.z,u.def.radius)).toBe(true);expect(pointInFeature(u.dest!.x,u.dest!.z,obstacle,u.def.radius)).toBe(false);}
 w.issue({type:"move",ids:group.map(u=>u.id),x:35,z:-200});w.issue({type:"move",ids:group.map(u=>u.id),x:65,z:-200,append:true});run(w,20);
 expect(group.filter(u=>u.x>50).length).toBeGreaterThanOrEqual(3);expect(group.every(u=>u.mode!=="patrol")).toBe(true);
 const d=w.spawn("supply",0,-160,140);w.issue({type:"logistics-source",ids:[d.id],sourceIndex:0,paused:true});w.issue({type:"logistics-route",ids:[d.id],x:-140,z:110});run(w,.1);
 expect(d.logisticsPaused).toBe(true);expect(d.preferredResourceIndex).toBe(0);expect(d.logisticsWaypoints).toEqual([{x:-140,z:110}]);
 const save=JSON.parse(JSON.stringify(saveWorld(w))),copy=world([obstacle]);loadWorld(copy,save);expect(worldHash(copy)).toBe(worldHash(w));
});

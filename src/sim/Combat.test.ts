import { describe, expect, it } from "vitest";
import { SIM_STEP } from "./constants";
import { World } from "./World";

describe("combat", () => {
  it("tekitab tule ja tabamuse sündmused", () => {
    const w = new World(3); w.spawn("tank", 0, 0, 0); w.spawn("inf", 1, 20, 0);
    for (let i = 0; i < 120; i++) w.tick(SIM_STEP);
    const events = w.drainEvents();
    expect(events.some((e) => e.type === "fire")).toBe(true);
    expect(events.some((e) => e.type === "hit" || e.type === "death")).toBe(true);
  });
});

import {afterEach} from "vitest";
import {setBases,resetHeightmap} from "./heightmap";
import {fireProjectile,fireGroundProjectile,selectWeapon,weaponAmmo,canEngage} from "./systems/combat";
import {updateProjectiles} from "./systems/projectiles";
import {updateSensors,detectionScore,coverValueAt} from "./systems/sensors";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
import type {MapFeatureDef} from "./mapFeatures";
import {updateTacticalSupply} from "./systems/tacticalSupply";
afterEach(resetHeightmap);
function tacticalWorld(features:MapFeatureDef[]=[]):World {
  const bases=[{x:0,z:-200,r:120},{x:180,z:180,r:40}];setBases(bases);
  const w=new World(55,false,[{x:270,z:270,radius:5,amount:0}],features,bases,false);w.networkMode=true;return w;
}
it("combined weapons: live selection, independent rounds, finite resupply and saved flight",()=>{
  const w=tacticalWorld(),u=w.spawn("ifv",0,-20,-200),tank=w.spawn("tank",1,20,-200),inf=w.spawn("inf",1,20,-190),air=w.spawn("fighter",1,20,-200);
  expect(selectWeapon(u,tank)).toBe(1);expect(selectWeapon(u,inf)).toBe(0);expect(canEngage(u,air)).toBe(false);
  u.mode="hold";u.holdPosition=true;u.heading=Math.PI/2;u.target=tank;tank.spottedUntil[0]=10;u.cooldown=100;tank.standingOrder="holdfire";inf.standingOrder="holdfire";air.airState="grounded";
  const primary=u.ammo;w.tick(SIM_STEP);expect(w.projectiles.some(p=>p.sourceId===u.id&&p.profile==="atgm")).toBe(true);expect(u.ammo).toBe(primary);expect(weaponAmmo(u,1)).toBe(5);
  const depot=w.spawn("supply",0,-30,-200);depot.ammoStock=.2;u.ammo=u.maxAmmo;const before=weaponAmmo(u,1);updateTacticalSupply(w,.1);expect(weaponAmmo(u,1)).toBeGreaterThan(before);expect(depot.ammoStock).toBeGreaterThanOrEqual(0);expect(depot.ammoStock).toBeCloseTo(0);
  const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=tacticalWorld();loadWorld(copy,saved);expect(worldHash(copy)).toBe(worldHash(w));
  for(let i=0;i<5;i++){w.tick(SIM_STEP);copy.tick(SIM_STEP);}expect(worldHash(copy)).toBe(worldHash(w));
});
it("physical flight: ballistic arc, delayed HE impact and a wall intercepts a direct round",()=>{
  const w=tacticalWorld(),arty=w.spawn("artillery",0,-40,-200),target=w.spawn("inf",1,65,-200);w.spatial.rebuild(w.entities);
  const hp=target.hp;fireGroundProjectile(w,arty,target.x,target.z);const p=w.projectiles[0];expect(p.flight).toBe("ballistic");expect(p.vy).toBeGreaterThan(0);
  const y=p.y;for(let i=0;i<15;i++)updateProjectiles(w,SIM_STEP);expect(p.y).toBeGreaterThan(y);expect(target.hp).toBe(hp);
  for(let i=0;i<100;i++)updateProjectiles(w,SIM_STEP);expect(target.hp).toBeLessThan(hp);expect(w.events.some(e=>e.type==="impact"&&e.visual==="howitzer")).toBe(true);
  const blocked=tacticalWorld([{id:"wall",kind:"wall",x:0,z:-200,width:3,depth:15,height:5}]),a=blocked.spawn("tank",0,-20,-200),b=blocked.spawn("tank",1,20,-200);blocked.spatial.rebuild(blocked.entities);
  const bhp=b.hp;fireProjectile(blocked,a,b,a.x,a.y+2.2,a.z,0);for(let i=0;i<30;i++)updateProjectiles(blocked,SIM_STEP);expect(b.hp).toBe(bhp);expect(blocked.events.some(e=>e.type==="impact"&&e.x<0)).toBe(true);
});
it("forest recon: infantry can move through cover, recon sees a concealed contact ordinary troops miss",()=>{
  const forest:MapFeatureDef={id:"woods",kind:"cover",appearance:"forest",x:20,z:-200,width:32,depth:50,height:5,blocksMovement:false};
  const w=tacticalWorld([forest]),recon=w.spawn("reconInf",0,0,-200),line=w.spawn("inf",0,0,-205),enemy=w.spawn("reconInf",1,20,-200);w.spatial.rebuild(w.entities);
  const penalty=coverValueAt(w,enemy.x,enemy.z)+w.vision.forestDepth(recon,enemy)*.35;
  expect(w.nav.isWalkableWorld(20,-200,enemy.def.radius)).toBe(true);expect(detectionScore(recon,enemy,penalty)).toBeGreaterThanOrEqual(22);expect(detectionScore(line,enemy,penalty)).toBeLessThan(22);
  updateSensors(w);expect(enemy.spottedUntil[0]).toBeGreaterThan(0);
  recon.standingOrder="holdfire";line.standingOrder="holdfire";enemy.standingOrder="holdfire";w.issue({type:"move",ids:[recon.id],x:25,z:-200});for(let i=0;i<90;i++)w.tick(SIM_STEP);expect(recon.x).toBeGreaterThan(3);
});

it("tactical firing position: approaches to weapon range instead of driving into the target",()=>{
  const w=tacticalWorld(),u=w.spawn("tank",0,-65,-200),target=w.spawn("tank",1,60,-200);target.standingOrder="holdfire";target.mode="hold";target.holdPosition=true;target.spottedUntil[0]=100;
  w.issue({type:"attack",ids:[u.id],targetId:target.id});for(let i=0;i<120;i++)w.tick(SIM_STEP);
  expect(u.combatPosition).toBeDefined();expect(Math.hypot(u.combatPosition!.x-target.x,u.combatPosition!.z-target.z)).toBeGreaterThan(u.def.range*.6);
  for(let i=0;i<420;i++)w.tick(SIM_STEP);expect(Math.hypot(u.x-target.x,u.z-target.z)).toBeGreaterThan(u.def.range*.6);expect(w.events.some(e=>e.type==="fire"&&e.sourceId===u.id)).toBe(true);
});

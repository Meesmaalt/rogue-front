import { describe, expect, it } from "vitest";
import { SIM_STEP } from "./constants";
import { World } from "./World";

describe("combat", () => {
  it("tekitab tule ja tabamuse sündmused", () => {
    const w = tacticalWorld(); const tank=w.spawn("tank", 0, -20, -200),inf=w.spawn("inf", 1, 20, -200);tank.heading=Math.PI/2;inf.spottedUntil[0]=20;inf.standingOrder="holdfire";
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

import {factionUnitDefinition} from "./units";
import {weaponSpec,weaponImpactEstimate,hitFace,movingFireFactor,weaponMuzzle} from "./systems/combat";
it("faction loadouts: rifle squad has finite AT, Stinger cannot hit tanks, Javelin and RPG fly differently",()=>{
  const w=tacticalWorld(),rifles=w.spawn("inf",0,-20,-200),tank=w.spawn("tank",1,15,-200),us=w.spawn("atInf",0,-15,-210),ru=w.spawn("atInf",1,15,-210);
  expect(rifles.def.weapons?.length).toBe(3);expect(selectWeapon(rifles,tank)).toBe(2);const spec=weaponSpec(rifles,2);
  expect(weaponImpactEstimate(spec,tank.def,"rear")).toBeGreaterThan(weaponImpactEstimate(spec,tank.def,"front"));
  expect(weaponSpec(us).guidance).toBe("infrared");expect(weaponSpec(ru).flight).toBe("direct");expect(us.squadMembers).toBe(4);
  const stinger=factionUnitDefinition("manpad","usa");expect(stinger.weapons![0].name).toContain("Stinger");expect(weaponImpactEstimate(stinger.weapons![0],tank.def)).toBe(0);expect(weaponImpactEstimate(stinger.weapons![0],factionUnitDefinition("heli","russia"))).toBeGreaterThan(30);
  rifles.secondaryAmmo![2]=0;expect(selectWeapon(rifles,tank)).not.toBe(2);const copy=tacticalWorld();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it("faction loadouts: displayed tank damage agrees with the actual penetrating hit",()=>{
  const w=tacticalWorld(),u=w.spawn("atInf",0,-15,-200),t=w.spawn("tank",1,15,-200);t.heading=Math.atan2(u.x-t.x,u.z-t.z);t.spottedUntil[0]=100;w.spatial.rebuild(w.entities);
  const spec=weaponSpec(u),expected=weaponImpactEstimate(spec,t.def,hitFace(u.x,u.z,t)),hp=t.hp,ammo=u.ammo!;
  fireProjectile(w,u,t,u.x,u.y+1.4,u.z,0);w.projectiles[0].hitChance=1;w.projectiles[0].hitRoll=0;
  for(let i=0;i<120;i++)updateProjectiles(w,SIM_STEP);
  expect(hp-t.hp).toBeCloseTo(expected,3);expect(u.ammo).toBe(ammo-1);
});

it("vehicle depth: stopped IFV missile, moving cannon and shared stabilizer factor",()=>{
  const w=tacticalWorld(),u=w.spawn("ifv",0,-20,-200),t=w.spawn("tank",1,20,-200);
  u.cooldown=0;expect(selectWeapon(u,t,true)).toBe(1);
  u.motionSpeed=5;expect(selectWeapon(u,t,true)).toBe(0);
  expect(movingFireFactor(u.def,weaponSpec(u,1))).toBe(0);
  expect(movingFireFactor(u.def,weaponSpec(u,0))).toBe(1);
  u.motionSpeed=0;expect(selectWeapon(u,t,true)).toBe(1);
  const tank=factionUnitDefinition("tank","usa"),light=factionUnitDefinition("lightTank","usa");
  expect(tank.armorFront).toBeGreaterThan(light.armorFront!);
  expect(weaponImpactEstimate(light.weapons![0],tank,"front",60)).toBe(0);
  expect(weaponImpactEstimate(light.weapons![0],tank,"rear",60)).toBeGreaterThan(0);
});
it("vehicle depth: AA selects long range missiles and short range guns with independent ammunition",()=>{
  const w=tacticalWorld(),u=w.spawn("spaa",0,-20,-200),t=w.spawn("heli",1,60,-200),inf=w.spawn("inf",1,0,-200);
  u.cooldown=0;expect(selectWeapon(u,t,true)).toBe(1);expect(selectWeapon(u,inf,true)).toBe(0);
  u.secondaryAmmo![1]=0;expect(selectWeapon(u,t,true)).toBe(-1);
  t.x=10;expect(selectWeapon(u,t,true)).toBe(0);
  u.secondaryAmmo![1]=4;t.x=60;u.motionSpeed=5;expect(selectWeapon(u,t,true)).toBe(-1);
  const copy=tacticalWorld();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it("vehicle depth: helicopter rockets launch from separate racks and cannot rearm over a depot",()=>{
  const w=tacticalWorld(),u=w.spawn("heli",0,-20,-200);
  expect(u.ammo).toBe(8);expect(weaponAmmo(u,2)).toBe(38);
  const a=weaponMuzzle(u,weaponSpec(u,0),0);u.ammo!--;const b=weaponMuzzle(u,weaponSpec(u,0),0);
  expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeCloseTo(3.3*(u.def.modelScale??1));expect(a.y).toBeCloseTo(u.y+.89*(u.def.modelScale??1));
  const depot=w.spawn("supply",0,-25,-200);depot.ammoStock=.2;
  const before=u.ammo!;updateTacticalSupply(w,.1);
  expect(u.ammo).toBe(before);expect(depot.ammoStock).toBeCloseTo(.2);
  const cas=factionUnitDefinition("casHeli","usa");expect(cas.weapons!.some(s=>s.targets==="armor")).toBe(false);
});

import {shotAccuracy,weaponRange,type AccuracyStep} from "./systems/combat";
import {combatStatus} from "./systems/units";
it("combat readout: probability equals launched shot and preview preserves simulation/RNG",()=>{
  const w=tacticalWorld(),u=w.spawn("tank",0,-20,-200),target=w.spawn("tank",1,25,-200);
  u.motionSpeed=2;u.supply=65;u.suppression=35;u.morale=72;u.veteran=2;
  target.motionSpeed=3;u.components={engine:0,tracks:0,turret:15,weapon:0,crew:20,ammo:0};
  const spec=weaponSpec(u,0),steps:AccuracyStep[]=[],before=worldHash(w);
  const chance=shotAccuracy(w,u,target,spec,undefined,steps);
  expect(worldHash(w)).toBe(before);expect(steps.at(-1)?.chance).toBe(chance);
  fireProjectile(w,u,target,u.x,u.y+2,u.z,0);
  expect(w.projectiles.at(-1)?.hitChance).toBe(chance);
  expect(shotAccuracy(w,u,target,spec,10)).toBeGreaterThan(shotAccuracy(w,u,target,spec,spec.range));
});
it("combat readout: per-slot range includes upgrades, low supply and target radius at boundary",()=>{
  const w=tacticalWorld(),u=w.spawn("manpad",0,-20,-200),target=w.spawn("fighter",1,20,-200),spec=weaponSpec(u,0);
  u.upgrades.add("range");u.supply=5;u.cooldown=0;
  const range=weaponRange(u,spec);expect(range).toBeCloseTo(spec.range*1.2*.9);
  target.x=u.x+range+target.def.radius-.01;target.z=u.z;
  expect(selectWeapon(u,target,true)).toBe(0);
  target.x+=.02;expect(selectWeapon(u,target,true)).toBe(-1);
  const battery=w.spawn("artillery",0,-20,-210),ground=w.spawn("tank",1,-15,-210);battery.cooldown=0;
  expect(weaponSpec(battery).minimumRange).toBeGreaterThan(0);
  ground.x=battery.x+weaponSpec(battery).minimumRange-.01;expect(selectWeapon(battery,ground,true)).toBe(-1);
});
it("combat readout: lost contact never reports enemy live range or firing status",()=>{
  const w=tacticalWorld(),u=w.spawn("tank",0,-20,-200),target=w.spawn("tank",1,20,-200);
  u.target=target;target.spottedUntil[0]=0;
  expect(combatStatus(w,u)).toBe("Luurekontakt kadunud");
  target.x=240;expect(combatStatus(w,u)).toBe("Luurekontakt kadunud");
});

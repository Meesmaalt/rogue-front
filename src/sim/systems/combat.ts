import {garrisonWeaponAllowed,garrisonCover,garrisonProtection} from "../garrison";
import {maxHitPoints,effectiveArmor,slotRange,weaponPenetration,weaponDamage} from "../unitStats";
import mobility from "../../data/mobility.json";
import raw from "../../data/damage.json";
import type { World } from "../World";
import type { Entity,UnitDef,WeaponSpec,Projectile } from "../types";
import {isSpottedBy} from "./sensors";
import {moraleState} from "./morale";
import {heightAt} from "../heightmap";
import { wrapAngle } from "../math";
import { pointInFeature } from "../mapFeatures";

export type DamageWeapon = keyof typeof raw;
const MATRIX = raw as Record<string, Record<string, number>>;

export function weaponDamageMultiplier(weapon:string,armor:string):number {return MATRIX[weapon]?.[armor]??1;}

export function weaponSpec(u:Entity,index=0):WeaponSpec {
  const w=u.def.weapons?.[index];if(w)return w;
  const d=u.def;return {profile:"legacy",name:d.name,visual:d.weapon==="missile"?"atgm":d.weapon==="cannon"?"autocannon":"rifle",weapon:d.weapon==="none"?"bullet":d.weapon,flight:d.weapon==="missile"?"guided":"direct",guidance:d.weapon==="missile"?"radar":"none",warhead:"he",targets:d.targetClass==="air"?"air":d.targetClass==="armor"?"armor":d.targetClass==="all"?"all":"ground",range:d.range,minimumRange:d.minimumRange??0,damage:d.damage,cooldown:d.cooldown,penetration:d.penetration??5,accuracy:d.accuracy??.6,splash:d.splash??0,ammoCapacity:d.ammoCapacity??0,ammoUsePerShot:d.ammoUsePerShot??1,suppressionPower:d.suppressionPower??1,speed:d.projectileSpeed,launchSpeed:d.missileLaunchSpeed??d.projectileSpeed,acceleration:d.missileAcceleration??75,turnRate:d.missileTurnRate??3.2,gravity:0,minFlight:0,muzzle:1.4,muzzleHeight:2};
}
/** Shared impact math: the HUD never maintains a separate damage table. */
export function penetrationFactor(warhead:string,penetration:number,armor:number,unarmored:boolean,distance=0):number {
  if(unarmored)return 1;
  const pen=penetration*(warhead==="kinetic"?Math.max(.65,1-distance/500):1),ratio=pen/Math.max(1,armor);
  if(warhead==="kinetic")return ratio>=1?Math.min(1.35,.8+ratio*.2):ratio>.85?.12:0;
  if(warhead==="heat")return ratio>=1?Math.min(1.4,.75+ratio*.25):.1*ratio;
  return Math.max(.12,Math.min(1,.22+ratio*.65));
}
export function weaponImpactEstimate(spec:WeaponSpec,target:UnitDef,face:"front"|"side"|"rear"="front",distance=0):number {
  if(!weaponCanTarget(spec,{def:target}))return 0;
  const armor=face==="front"?target.armorFront:face==="side"?target.armorSide:target.armorRear;
  return spec.damage*weaponDamageMultiplier(spec.weapon,target.armor)*penetrationFactor(spec.warhead,spec.penetration,armor??8,target.category==="infantry"||target.armor==="air",distance);
}
/** Live target comparison includes both sides' purchased upgrades. */
export function weaponImpactAgainst(u:Entity,spec:WeaponSpec,target:Entity,distance=Math.hypot(target.x-u.x,target.z-u.z)):number {
  if(!weaponCanTarget(spec,target))return 0;
  return weaponDamage(u,spec)*weaponDamageMultiplier(spec.weapon,target.def.armor)*penetrationFactor(spec.warhead,weaponPenetration(u,spec),armorValue(target,hitFace(u.x,u.z,target)),target.def.category==="infantry"||target.def.armor==="air",distance);
}
export function weaponAmmo(u:Pick<Entity,"ammo"|"secondaryAmmo">,index:number):number {return index===0?u.ammo??0:u.secondaryAmmo?.[index]??0;}
export function weaponCooldown(u:Pick<Entity,"cooldown"|"weaponCooldowns">,index:number):number {return index===0?u.cooldown:u.weaponCooldowns?.[index]??0;}
/** Identical moving-fire modifier for live shots and loadout inspection. */
export function movingFireFactor(def:UnitDef,spec:WeaponSpec):number {
  if(spec.fireOnMove===false)return 0;
  const stabilizer=spec.stabilizer??def.stabilizer??(def.turret?"full":"none");
  return stabilizer==="full"?1:stabilizer==="partial"?.72:.45;
}
export function weaponMuzzle(u:Entity,spec:WeaponSpec,index:number):{x:number;y:number;z:number} {
  const a=u.heading+(u.def.turret?u.turretYaw:0),wing=u.def.armor==="air"&&spec.weapon==="missile"?(Math.floor(weaponAmmo(u,index))%2?1:-1)*(spec.muzzleSide??1.4):spec.muzzleSide??0;
  const crew=u.squadMaxMembers&&!u.garrisonId?mobility.infantry.squadLayout[Math.min(index,Math.max(0,(u.squadMembers??1)-1))]:[0,0];
  const scale=u.def.modelScale??1;
  return {x:u.x+(Math.sin(a)*(spec.muzzle+crew[1])+Math.cos(a)*(wing+crew[0]))*scale,y:u.y+spec.muzzleHeight*scale,z:u.z+(Math.cos(a)*(spec.muzzle+crew[1])-Math.sin(a)*(wing+crew[0]))*scale};
}
export function weaponCanTarget(spec:WeaponSpec,t:Pick<Entity,"def">):boolean {
  const air=t.def.armor==="air";
  return spec.targets==="naval"?t.def.domain==="sea":spec.targets==="air"?air:spec.targets==="armor"?!air&&t.def.speed>0&&t.def.category!=="infantry"&&t.def.domain!=="sea":spec.targets==="all"?true:!air||!!spec.targetHelicopters&&t.def.category==="heli";
}
export function selectWeapon(u:Entity,t:Entity,ready=false):number {
  if(t.dead||t.loadedIntoId!=null||t.team===u.team)return -1;
  let best=-1,score=-Infinity,bestReach=-Infinity,bestInRange=false;const distance=Math.hypot(t.x-u.x,t.z-u.z);
  for(let i=0;i<(u.def.weapons?.length??1);i++){
    const spec=weaponSpec(u,i);if(!weaponCanTarget(spec,t)||!garrisonWeaponAllowed(u,spec,t,ready)||spec.damage<=0)continue;
    if(ready&&(u.motionSpeed??0)>mobility.combat.weaponMotionThreshold&&spec.fireOnMove===false)continue;
    if(spec.warhead==="kinetic"&&penetrationFactor(spec.warhead,weaponPenetration(u,spec),armorValue(t,hitFace(u.x,u.z,t)),t.def.category==="infantry"||t.def.armor==="air",distance)<=0)continue;
    if(spec.ammoCapacity>0&&weaponAmmo(u,i)<spec.ammoUsePerShot)continue;
    if(ready&&(weaponCooldown(u,i)>0||distance-t.def.radius>weaponRange(u,spec)||distance<spec.minimumRange))continue;
    const infantry=t.def.category==="infantry";
    let value=weaponImpactAgainst(u,spec,t,distance)*spec.accuracy/Math.max(.15,spec.cooldown);
    if(infantry&&spec.visual==="sabot")value*=.12;
    if(infantry&&spec.targets==="armor")continue;
    if(spec.targets==="armor")value*=2.4;
    if(distance<spec.minimumRange)value*=.15;
    else if(distance<=weaponRange(u,spec))value*=1.25;
    // Never close on a short-range high-DPS slot while another loaded slot can fire here.
    // Outside all reaches, approach using the longest suitable weapon, not the highest DPS.
    const reach=weaponRange(u,spec),inRange=distance-t.def.radius<=reach&&distance>=spec.minimumRange;
    if(best<0||inRange&&!bestInRange||inRange===bestInRange&&(inRange?value>score:reach>bestReach||reach===bestReach&&value>score)){
      score=value;best=i;bestReach=reach;bestInRange=inRange;
    }
  }return best;
}
export function canEngage(u:Entity,t:Entity):boolean {return selectWeapon(u,t)>=0;}
/** The actual shot and HUD share these gates; null means this slot may fire. */
export function weaponFireBlocker(w:World,u:Entity,t:Entity,index:number):string|null {
  const spec=weaponSpec(u,index),distance=Math.hypot(t.x-u.x,t.z-u.z);
  if(t.dead||t.loadedIntoId!=null||t.team===u.team)return "Sihtmärk pole rünnatav";
  if(!isSpottedBy(t,u.team,w.time))return "Luurekontakt kadunud";
  if(u.standingOrder==="holdfire")return "Tuli keelatud";
  if((u.disabledUntil??0)>w.time)return "Relvasüsteem häiritud";
  if(moraleState(u)==="routing")return "Taandub · ei ava tuld";
  if(u.flightAttackExit)return "Eemaldub ründeläbimiselt";
  if(!weaponCanTarget(spec,t)||spec.damage<=0)return "Sobimatu sihtmärgi liik";
  if(!garrisonWeaponAllowed(u,spec,t))return "Garnisoni relv või laskesektor ei võimalda tuld";
  if(spec.warhead==="kinetic"&&penetrationFactor(spec.warhead,weaponPenetration(u,spec),armorValue(t,hitFace(u.x,u.z,t)),t.def.category==="infantry"||t.def.armor==="air",distance)<=0)return "Soomus peatab selle mürsu";
  if(spec.ammoCapacity>0&&weaponAmmo(u,index)<spec.ammoUsePerShot)return "Moon otsas · vaja varustust";
  if(distance<spec.minimumRange)return "Sihtmärk liiga lähedal";
  if(distance-t.def.radius>weaponRange(u,spec))return "Väljaspool relva ulatust";
  if(spec.fireOnMove===false){
    if((u.motionSpeed??0)>mobility.combat.weaponMotionThreshold)return "Peatub · relv nõuab paigalolekut";
    if(w.time<(u.stationaryFireReadyAt??0))return "Stabiliseerib relva · "+((u.stationaryFireReadyAt??0)-w.time).toFixed(1)+" s";
  }
  if(["artillery","mlrs","mortar"].includes(u.kind)&&(u.def.stabilizer??"none")==="none"&&(u.motionSpeed??0)>.6)return "Peatub kaudtule avamiseks";
  if(weaponCooldown(u,index)>0)return "Laadib · "+weaponCooldown(u,index).toFixed(1)+" s";
  if(spec.visual!=="cruise"&&!["artillery","mortar","mlrs"].includes(u.kind)&&!w.vision.hasLineOfSight(u,t))return "Tulejoon blokeeritud";
  const angle=Math.atan2(t.x-u.x,t.z-u.z),delta=Math.abs(wrapAngle(angle-u.heading));
  if(u.firingArc<Math.PI*2-.01&&delta>u.firingArc*.5)return "Sihtmärk väljaspool laskesektorit";
  if(!(u.def.domain==="sea"&&spec.weapon==="missile")){
    const error=Math.abs(wrapAngle(angle-u.heading-(u.def.turret?u.turretYaw:0)));
    if(error>=(u.def.turret?mobility.combat.turretAimTolerance:mobility.combat.hullAimTolerance))return u.def.turret?"Pöörab torni sihtmärgile":"Pöörab relva sihtmärgile";
  }
  return null;
}

/** Same per-slot reach used by firing, movement, HUD and world overlays. */
export function weaponRange(u:Entity,spec:WeaponSpec):number {
  return slotRange(u,spec);
}
export function effectiveWeaponRange(u:Entity,target?:Entity):number {
  if(!target){
    let maximum=0;
    for(let i=0;i<(u.def.weapons?.length??1);i++){const spec=weaponSpec(u,i);if(spec.damage>0&&(spec.ammoCapacity<=0||weaponAmmo(u,i)>=spec.ammoUsePerShot))maximum=Math.max(maximum,weaponRange(u,spec));}
    return maximum;
  }
  const index=target?selectWeapon(u,target):-1;
  const range=index>=0?weaponSpec(u,index).range:u.def.range;
  return slotRange(u,{range});
}

/** Which face of target is hit from shooter position. */
export type ArmorFace = "front" | "side" | "rear";

export function hitFace(shooterX: number, shooterZ: number, target: Entity): ArmorFace {
  const toShooter = Math.atan2(shooterX - target.x, shooterZ - target.z);
  const rel = Math.abs(wrapAngle(toShooter - target.heading));
  // front: within ~55°, rear: within ~55° of back, else side
  if (rel <= 0.95) return "front";
  if (rel >= Math.PI - 0.95) return "rear";
  return "side";
}

export function armorValue(target: Entity, face: ArmorFace): number {
  return effectiveArmor(target,face);
}

function isInfantrySquad(u: Entity): boolean {
  return (u.squadMaxMembers ?? 0) > 0 && u.def.category === "infantry";
}

function isPlatform(u: Entity): boolean {
  return u.def.speed > 0 && !isInfantrySquad(u) && !["cargoPlane"].includes(u.kind);
}

/** Phase 75: determine which vehicle system was hit and apply persistent damage. */
function applyComponentDamage(w: World, target: Entity, amount: number, face: ArmorFace, weapon: string): void {
  if (!isPlatform(target)) return;
  const c = target.components ?? (target.components = { engine: 0, tracks: 0, turret: 0, weapon: 0, crew: 0, ammo: 0 });
  const guided = weapon === "missile" || weapon === "cannon";
  const scale = Math.max(0.5, Math.min(2.4, amount / Math.max(1, maxHitPoints(target) * 0.16)));
  const r = w.rng();
  let key: keyof typeof c;
  if (face === "rear") key = r < 0.48 ? "engine" : r < 0.70 ? "tracks" : r < 0.88 ? "ammo" : "weapon";
  else if (face === "side") key = r < 0.28 ? "tracks" : r < 0.48 ? "crew" : r < 0.70 ? "weapon" : r < 0.88 ? "turret" : "engine";
  else key = r < 0.32 ? "turret" : r < 0.56 ? "weapon" : r < 0.76 ? "crew" : r < 0.91 ? "engine" : "ammo";
  c[key] = Math.min(100, c[key] + scale * (guided ? 8.5 : 5.5));

  if (c.engine >= 72 || c.tracks >= 82) target.disabledUntil = Math.max(target.disabledUntil ?? 0, w.time + 4);
  if (c.ammo >= 78 && guided && w.rng() < 0.10) {
    target.hp = Math.max(0, target.hp - maxHitPoints(target) * 0.30);
    c.ammo = Math.min(100, c.ammo + 15);
    target.suppression = Math.min(100, (target.suppression ?? 0) + 28);
    target.morale = Math.max(0, (target.morale ?? 100) - 22);
  }
}

/** Phase 74: convert combat damage into physical squad casualties without creating one entity per soldier. */
function applySquadCasualties(w: World, u: Entity, damageAmount: number): void {
  if (!isInfantrySquad(u) || u.dead) return;
  const max = u.squadMaxMembers ?? 1;
  const current = u.squadMembers ?? max;
  if (current <= 1) return;
  const pressure = Math.max(0.05, Math.min(0.75, damageAmount / Math.max(1, maxHitPoints(u) * 0.28)));
  const chance = pressure * ((u.suppression ?? 0) > 55 ? 0.95 : 0.58);
  if (w.rng() < chance) {
    u.squadMembers = Math.max(1, current - 1);
    u.squadFirepower = u.squadMembers / max;
    // Squad HP remains the aggregate survivability value; member loss visibly and mechanically reduces output.
    u.suppression = Math.min(100, (u.suppression ?? 0) + 5);
    u.morale = Math.max(0, (u.morale ?? 100) - 4);
  }
}

export function targetCoverValue(w: World, t: Entity): number {
  if(t.garrisonId)return garrisonCover(w,t);
  let v = 0;
  for (const f of w.terrain.coverFeaturesAt(t.x,t.z)) {
    if (!pointInFeature(t.x, t.z, f, 0.2)) continue;
    if(f.appearance==="forest")v=Math.max(v,(t.squadMaxMembers||t.def.category==="infantry"?.30:.18)*w.terrain.foliageAt(t.x,t.z));
    else if (f.kind === "cover" && f.appearance!=="field" && f.appearance!=="yard") v = Math.max(v, 0.14);
    else if (f.kind === "wall" || f.kind === "chokepoint") v = Math.max(v, 0.22);
    else if (f.kind === "building") v = Math.max(v, 0.30);
  }
  return v;
}

function heSuppression(weapon: string, damage: number, power = 1): number {
  const base = weapon === "bullet" ? 0.85 : weapon === "cannon" ? 0.35 : weapon === "missile" ? 0.25 : 0.4;
  return damage * base * power;
}

export interface AccuracyStep { label:string; chance:number }
/** Read-only shot probability; preview consumes no RNG and uses the live shot formula.
 * Distance uses the weapon's nominal range: range upgrades extend reach, not accuracy.
 * This is hit probability conditional on launch, not permission to fire. */
export function shotAccuracy(w:World,u:Entity,t:Entity,spec:WeaponSpec,distance=Math.hypot(t.x-u.x,t.z-u.z),steps?:AccuracyStep[]):number {
  const note=(label:string)=>{if(steps)steps.push({label,chance:hitChance});};
  let hitChance = spec.accuracy ?? 0.6;
  note("Relva baas");
  hitChance *= 0.5 + Math.min(100, u.supply ?? 100) / 200;
  note("Varustus");
  if (!w.hasCommandLink(u)) hitChance *= 0.85;
  note("Juhtimisvõrk");

  const rangeRatio = Math.min(1, distance / Math.max(1, spec.range));
  hitChance *= 1 - rangeRatio * 0.32;
  note("Kaugus");
  const sizeBonus: Record<string, number> = { small: -0.16, medium: 0, large: 0.08, very_large: 0.16 };
  hitChance += sizeBonus[t.def.size ?? "medium"] ?? 0;
  note("Sihtmärgi suurus");
  hitChance += (u.def.optics === "exceptional" ? 0.06 : u.def.optics === "very_good" ? 0.04 : u.def.optics === "good" ? 0.02 : 0);
  note("Laskuri optika");
  if ((u.motionSpeed??0)>.5) {
    hitChance *= movingFireFactor(u.def,spec);
    note("Laskuri liikumine");
  }
  if ((t.motionSpeed??0)>.5 && t.def.speed > 0) hitChance *= 0.86;
  note("Sihtmärgi liikumine");
  hitChance *= Math.max(0.25, 1 - (u.suppression ?? 0) / 150);
  note("Surve");
  hitChance *= 0.72 + ((u.morale ?? 100) / 100) * 0.28;
  note("Moraal");
  if (u.components) {
    hitChance *= Math.max(0.45, 1 - (u.components.crew ?? 0) / 180);
    note("Meeskonna kahjustus");
    if (u.def.turret) hitChance *= Math.max(0.55, 1 - (u.components.turret ?? 0) / 220);
    note("Torni kahjustus");
  }
  if (u.veteran > 0) hitChance += Math.min(0.08, u.veteran * 0.016);
  note("Kogemus");
  // ECM disrupts guided weapons, but does not make aircraft invulnerable.
  if (spec.weapon === "missile" || u.def.category === "air") {
    const ecm = w.entities.find(e => !e.dead && e.team !== u.team && e.kind === "ecm" && Math.hypot(e.x-u.x,e.z-u.z) < 46);
    if (ecm) hitChance *= 0.68;
    note("Elektrooniline häiring");
  }
  if (t.def.category === "infantry" && u.kind !== "artillery" && u.kind !== "mortar" && u.kind !== "mlrs") {
    hitChance *= 1 - targetCoverValue(w, t);
    note("Sihtmärgi kate");
  }
  hitChance = Math.max(0.05, Math.min(0.98, hitChance));
  note("Lõplik piirang");
  return hitChance;
}

export function fireProjectile(w: World, u: Entity, t: Entity, x: number, y: number, z: number,index=selectWeapon(u,t)): void {
  if(index<0)return;const spec=weaponSpec(u,index);u.activeWeapon=index;
  const squadMul = spec.weapon==="bullet"?u.squadFirepower??1:1;
  const weaponCondition = u.components ? Math.max(0.35, 1 - (u.components.weapon ?? 0) / 140) : 1;
  const base = weaponDamage(u,spec) * squadMul * weaponCondition * (1 + u.veteran * 0.08);
  const classMult = MATRIX[spec.weapon]?.[t.def.armor] ?? 1;
  const penetration=weaponPenetration(u,spec);
  // Facing is already represented by the armor value at impact.
  const fMult = 1;

  const hitChance=shotAccuracy(w,u,t,spec);

  const dealt=base*classMult*fMult;
  const eta=Math.hypot(t.x-x,t.z-z)/Math.max(1,spec.speed);
  const tx=t.x+Math.sin(t.heading)*(t.motionSpeed??0)*eta,tz=t.z+Math.cos(t.heading)*(t.motionSpeed??0)*eta;
  const hitRoll=w.rng(),angle=w.rng()*Math.PI*2,miss=1.5+t.def.radius+(1-hitChance)*5;
  const missX=Math.cos(angle)*miss,missZ=Math.sin(angle)*miss;
  const missShot=hitRoll>hitChance;
  launchProjectile(w,u,spec,index,x,y,z,spec.flight==="guided"?t.x:tx+(missShot?missX:0),t.y+t.def.height*.45,spec.flight==="guided"?t.z:tz+(missShot?missZ:0),t,dealt,hitChance,penetration,hitRoll,missX,missZ);
  w.projectiles[w.projectiles.length-1].damage=base;
}

function launchProjectile(w:World,u:Entity,spec:WeaponSpec,index:number,x:number,y:number,z:number,tx:number,ty:number,tz:number,target:Entity|null,dealt:number,hitChance:number,penetration:number,hitRoll:number,missX=0,missZ=0):void {
  const dx=tx-x,dz=tz-z,dy=ty-y,length=Math.hypot(dx,dy,dz)||1;
  const speed=spec.flight==="guided"?spec.launchSpeed:spec.speed;
  const flightTime=Math.max(spec.minFlight,Math.hypot(dx,dz)/Math.max(1,speed),.1);
  const ballistic=spec.flight==="ballistic";
  const vertical=spec.launch==="vertical";
  const vx=vertical?0:ballistic?dx/flightTime:dx/length*speed,vz=vertical?0:ballistic?dz/flightTime:dz/length*speed;
  const vy=vertical?speed:ballistic?(dy+.5*spec.gravity*flightTime*flightTime)/flightTime:dy/length*speed;
  const p:Projectile={id:w.nextId++,team:u.team,x,y,z,px:x,py:y,pz:z,vx,vy,vz,tx,tz,aimY:ty,target,sourceId:u.id,damage:dealt,impactDamage:dealt,speed,splash:spec.splash,weapon:spec.weapon,profile:spec.profile,visual:spec.visual,flight:spec.flight,guidance:spec.guidance,warhead:spec.warhead,gravity:spec.gravity,flightTime,suppressionPower:spec.suppressionPower,launchX:u.x,launchZ:u.z,age:0,lifetime:Math.max(8,flightTime+4,length/Math.max(1,speed)+4),turnRate:spec.turnRate,acceleration:spec.acceleration,maxSpeed:spec.speed,boostTime:spec.boostTime,cruiseAltitude:spec.cruiseAltitude,penetration,hitChance,hitRoll,missX,missZ};
  w.projectiles.push(p);
  if(index===0&&spec.weapon==="cannon")u.gunElevation=Math.atan2(vy,Math.hypot(vx,vz));
  if(index===0){if(spec.ammoCapacity>0)u.ammo=Math.max(0,(u.ammo??0)-spec.ammoUsePerShot);}else {u.secondaryAmmo??=[];u.secondaryAmmo[index]=Math.max(0,weaponAmmo(u,index)-spec.ammoUsePerShot);}
  w.events.push({type:"fire",team:u.team,x,y,z,sourceId:u.id,weapon:spec.weapon,caliber:spec.damage,visual:spec.visual,dx:dx/length,dy:dy/length,dz:dz/length,weaponIndex:index});
}

export function damage(w: World, t: Entity, amount: number, opts?: {
  weapon?: string;
  fromX?: number;
  fromZ?: number;
  sourceId?: number;
  penetration?:number;suppressionPower?:number;
}): void {
  if (t.dead) return;
  if (t.def.speed === 0 && t.kind !== "bunker" && t.kind !== "aa" && t.kind !== "hq" && amount < 10) amount *= 0.55;
  if (t.def.category === "infantry") {
    const cover = targetCoverValue(w, t);
    amount *= 1 - cover * 0.55;
  }

  amount*=garrisonProtection(w,t,opts?.weapon==="bullet");
  t.hp -= amount;
  applySquadCasualties(w, t, amount);
  const componentFace = opts?.fromX != null && opts?.fromZ != null ? hitFace(opts.fromX, opts.fromZ, t) : "front";
  applyComponentDamage(w, t, amount, componentFace, opts?.weapon ?? "bullet");

  // A penetrative hit can temporarily disable a platform without destroying it.
  // This is deliberately short so disabled vehicles recover through logistics/repair.
  if (opts?.sourceId != null && t.def.speed > 0) {
    const source = w.byId.get(opts.sourceId);
    const face = opts.fromX != null && opts.fromZ != null ? hitFace(opts.fromX, opts.fromZ, t) : "front";
    const armor = armorValue(t, face);
    const pen = opts.penetration??source?.def.penetration ?? 0;
    if (pen >= armor * 0.9 && w.rng() < 0.10) {
      t.disabledUntil = Math.max(t.disabledUntil ?? 0, w.time + 2.5);
      t.cooldown = Math.max(t.cooldown, 1.2);
    }
  }

  // Suppression (Wargame stress)
  const wpn = opts?.weapon ?? "bullet";
  const supAdd = heSuppression(wpn, amount, (t.def.category === "armor" ? 1 : 1.15) * (opts?.suppressionPower??(opts?.sourceId != null ? w.byId.get(opts.sourceId)?.def.suppressionPower ?? 1 : 1)));
  t.suppression = Math.min(100, (t.suppression ?? 0) + supAdd);

  // Moraal hit – rear shots and high damage sting more
  let moraleHit = amount * 0.15;
  if (opts?.fromX != null && opts?.fromZ != null) {
    const face = hitFace(opts.fromX, opts.fromZ, t);
    if (face === "rear") moraleHit *= 1.8;
    else if (face === "side") moraleHit *= 1.25;
  }
  if (t.def.discipline === "high") moraleHit *= 0.65;
  else if (t.def.discipline === "low") moraleHit *= 1.35;
  t.morale = Math.max(0, (t.morale ?? 100) - moraleHit);

  w.events.push({ type: "hit", x: t.x, y: t.y + t.def.height * 0.6, z: t.z });
  if (t.hp <= 0) {
    t.dead = true;
    for (const id of [...t.cargoUnitIds]) { const passenger = w.byId.get(id); if (passenger && !passenger.dead) damage(w, passenger, maxHitPoints(passenger) * 10, opts); }
    t.cargoUnitIds = [];
    w.lossValue[t.team] += t.def.cost;
    // Nearby friendlies take morale shock
    for (const e of w.entities) {
      if (e.dead || e.team !== t.team || e === t) continue;
      const d = Math.hypot(e.x - t.x, e.z - t.z);
      if (d < 28) e.morale = Math.max(0, (e.morale ?? 100) - (14 - d * 0.3));
    }
    w.events.push({ type: "death", x: t.x, y: t.y + t.def.height * 0.5, z: t.z, big: t.def.speed === 0, kind: t.kind });
  }
}

export function fireGroundProjectile(w:World,u:Entity,x:number,z:number):void {
  if(u.garrisonId||u.loadedIntoId!=null||u.dead)return;
  const spec=weaponSpec(u);if(spec.ammoCapacity>0&&weaponAmmo(u,0)<spec.ammoUsePerShot)return;
  const muzzle=weaponMuzzle(u,spec,0);
  launchProjectile(w,u,spec,0,muzzle.x,muzzle.y,muzzle.z,x,heightAt(x,z)+.15,z,null,weaponDamage(u,spec)*(1+u.veteran*.08),1,weaponPenetration(u,spec),0);
}

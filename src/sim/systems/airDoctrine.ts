import type { World } from "../World";
import mobility from "../../data/mobility.json";
import {heightAt} from "../heightmap";
import {canEngage,weaponAmmo,weaponSpec,weaponRange} from "./combat";
import type { Entity, Point, Team,AirMission } from "../types";

/** The same facility-local points drive production, taxi, landing and the model. */
export function airFacilityPoint(pad:Entity,forward:number,side=0):Point {
  return {x:pad.x+Math.sin(pad.heading)*forward+Math.cos(pad.heading)*side,z:pad.z+Math.cos(pad.heading)*forward-Math.sin(pad.heading)*side};
}
export function airFacilityCapacity(w:World,pad:Entity):number {
  const cfg=pad.kind==="helipad"?mobility.helicopter:mobility.aircraft;
  return cfg.baseCapacity+cfg.capacityPerLevel*w.producerLevel(pad);
}
export function freeAirSlot(w:World,pad:Entity):number {
  const used=new Set(w.entities.filter(e=>!e.dead&&e.airMissionHomeId===pad.id).map(e=>e.airHomeSlot??0));
  for(let i=0;i<airFacilityCapacity(w,pad);i++)if(!used.has(i))return i;return -1;
}
export function airParkingPoint(u:Entity,pad:Entity):Point {
  const slot=u.airHomeSlot??0;
  return pad.kind==="helipad"?airFacilityPoint(pad,mobility.helicopter.padOffset+Math.floor(slot/3)*mobility.helicopter.parkingSpacing,(slot%3===0?0:slot%3===1?-1:1)*mobility.helicopter.parkingSpacing):airFacilityPoint(pad,-4+Math.floor(slot/2)*mobility.aircraft.parkingSpacing,mobility.aircraft.parkingOffset+(slot%2)*mobility.aircraft.parkingSpacing);
}
export function stationAircraft(w:World,u:Entity,pad:Entity,slot=freeAirSlot(w,pad)):void {
  u.airMissionHomeId=pad.id;u.airHomeSlot=Math.max(0,slot);u.airState="grounded";u.airSortieTime=0;u.airTaxiPhase="apron";u.motionSpeed=0;
  const p=airParkingPoint(u,pad);u.x=u.px=p.x;u.z=u.pz=p.z;u.y=u.py=heightAt(p.x,p.z);u.pFlightBank=u.flightBank=0;u.pFlightPitch=u.flightPitch=0;u.heading=u.pHeading=pad.heading;
}
export function airUnitsForOrder(w:World,ids:number[],team:Team):Entity[] {
  const facilities=new Set(ids.filter(id=>{const e=w.byId.get(id);return e&&e.team===team&&!e.dead&&!e.underConstruction&&["airbase","helipad"].includes(e.kind);}));
  const selected=new Set(ids);
  return w.entities.filter(e=>!e.dead&&e.team===team&&e.def.armor==="air"&&e.loadedIntoId==null&&e.supplyDepotId==null&&e.kind!=="cargoPlane"&&(selected.has(e.id)||facilities.has(e.airMissionHomeId??-1)));
}
export function supportsAirMission(u:Entity,mission:AirMission):boolean {
  if(mission==null)return true;
  return (u.def.weapons??[weaponSpec(u)]).some(s=>s.damage>0&&(mission==="cap"?s.targets==="air"||s.targets==="all":s.targets!=="air"));
}
export function hasAirMissionAmmo(u:Entity):boolean {
  if((u.maxAmmo??0)===0)return true;
  const mission=u.airMission;
  return (u.def.weapons??[weaponSpec(u)]).some((s,i)=>s.damage>0&&(mission==null||mission==="cap"?(mission==null||s.targets==="air"||s.targets==="all"):s.targets!=="air")&&(s.ammoCapacity<=0||weaponAmmo(u,i)>=s.ammoUsePerShot));
}
export function requestAirReturn(u:Entity):void {
  u.holdPosition=false;u.standingOrder=null;u.flightOrbitCenter=undefined;u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;
  u.transportQueue=[];u.transportTargetId=null;u.transportPickupPoint=undefined;u.unloadPoint=null;
  u.target=null;u.dest=null;u.mode="idle";u.airMission=null;u.airMissionPoint=null;u.patrolPoints=[];u.moveQueue=[];
  if(u.airState==="grounded"||u.airState==="rearming")return;
  u.airState=u.airState==="taxi"&&u.def.category!=="heli"?"landing":"returning";u.airReturnReason="manual";u.airLandingPhase="approach";
}
export function airOperationStatus(w:World,u:Entity):string {
  const pad=w.byId.get(u.airMissionHomeId??-1);
  if(u.airState==="grounded"&&pad&&!pad.dead&&w.productionOperational(pad).operational){if(!hasAirMissionAmmo(u))return "Baasis · missiooni laskemoon otsas";if((u.fuel??0)<=(u.maxFuel??0)*.3)return "Baasis · tankimise ootel";}
  if(u.airState==="grounded")return pad&&!pad.dead?(w.productionOperational(pad).operational?"Baasis · valmis missiooniks":"Baasis · "+w.productionOperational(pad).reason):"Baasis · lennurajatis puudub";
  if(u.airState==="taxi")return u.def.category==="heli"?"Kopteriplatsilt õhkutõus":u.airTaxiPhase==="runway"?"Stardirada · hoovõtt":"Ruleerib · ootab vaba rada";
  if(u.airState==="landing")return "Maandunud · ruleerib parkimiskohale";
  if(u.airState==="rearming")return "Baasis · laskemoona, kütuse ja remondi ootel";
  if(u.airState==="returning")return "Naaseb baasi · "+({fuel:"kütus",ammo:"laskemoon",damage:"kahjustus",threat:"tugev õhutõrjeoht",manual:"mängija käsk",base:"baas kadunud või rada suletud"}[u.airReturnReason??"manual"])+(pad&&!pad.dead?"":" · lennurajatis puudub");
  if(u.flightAttackExit)return u.def.category==="heli"?"Lennul · eemaldub õhutõrjeohust":"Lennul · eemaldub pärast ründeläbimist";
  return "Lennul · "+({cap:"õhukaitse",strike:"baasirünnak",sead:"õhutõrje rünnak",ground:"maaväe toetus"}[u.airMission??"ground"]);
}

/** Threat reach follows the actual anti-air slots, including secondary missiles. */
export function aaThreatRadius(e:Entity):number {
  if(e.loadedIntoId!=null||e.def.armor==="air"&&e.airState!=="airborne")return 0;
  let reach=0;
  for(let i=0;i<(e.def.weapons?.length??1);i++){
    const spec=weaponSpec(e,i);
    if(spec.damage>0&&(spec.targets==="air"||spec.targets==="all"))reach=Math.max(reach,weaponRange(e,spec));
  }
  return reach;
}
/** Automatic acquisition stays within the designated operation area and role. */
export function airMissionAllowsTarget(u:Entity,t:Entity):boolean {
  if(!u.airMission)return true;
  if(u.airMissionPoint&&Math.hypot(t.x-u.airMissionPoint.x,t.z-u.airMissionPoint.z)>mobility.combat.airMissionRadius)return false;
  if(u.airMission==="cap")return t.def.armor==="air";
  if(t.def.armor==="air")return false;
  if(u.airMission==="sead")return aaThreatRadius(t)>0;
  if(u.airMission==="strike")return t.def.building===true;
  return true;
}

/** Strongest enemy AA threat near a point (0 = safe). */
export function aaThreatAt(w: World, team: Team, x: number, z: number): number {
  let threat = 0;
  for (const e of w.entities) {
    if (e.dead || e.team === team || e.underConstruction || !w.isSpottedByTeam(e,team)) continue;
    const r = aaThreatRadius(e);
    if (r <= 0) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < r) threat = Math.max(threat, 1 - d / r);
  }
  return threat;
}

export function assignAirMission(
  u: Entity,
  mission: "cap" | "strike" | "sead" | "ground",
  point?: Point | null,
): void {
  if(!supportsAirMission(u,mission))return;
  u.target=null;u.moveQueue=[];u.transportQueue=[];u.transportTargetId=null;u.unloadPoint=null;u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;
  u.holdPosition=false;u.standingOrder=null;u.priorityFocus=null;u.patrolPoints=[];u.patrolIndex=0;u.flightOrbitCenter=undefined;
  u.airMission = mission;
  u.airMissionPoint = point ? { x: point.x, z: point.z } : null;
  if (mission === "cap") {
    u.mode = "patrol";
    u.dest=point?{...point}:null;
    if (point) {
      u.patrolPoints = [
        { x: point.x + 18, z: point.z },
        { x: point.x, z: point.z + 18 },
        { x: point.x - 18, z: point.z },
        { x: point.x, z: point.z - 18 },
      ];
      u.patrolIndex = 0;
      u.dest = u.patrolPoints[0];
    }
  } else if (mission === "sead" || mission === "strike" || mission === "ground") {
    u.mode = "amove";
    u.dest = point ? { x: point.x, z: point.z } : null;
    u.priorityFocus = mission === "sead" ? "aa" : mission === "strike" ? "generator" : null;
  }
}

/**
 * Per-tick air logic: RTB on fuel/ammo, SEAD target priority, avoid AA when CAP.
 */
export function updateAirDoctrine(w: World, u: Entity, dt: number): void {
  if (u.def.armor !== "air" && u.def.category !== "heli") return;
  if (u.dead || u.airState === "returning" || u.airState === "rearming" || u.airState === "grounded" || u.airState === "taxi" || u.airState === "landing") return;
  if(u.flightAttackExit&&w.time>=(u.flightAttackExitUntil??0)){u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;}
  if(u.target&&(u.target.dead||!w.isSpottedByTeam(u.target,u.team)||!airMissionAllowsTarget(u,u.target)))u.target=null;
  if(u.airMission&&!u.target&&u.mode==="attack"){
    u.mode=u.airMission==="cap"?"patrol":"amove";
    u.dest=u.airMission==="cap"?(u.patrolPoints[u.patrolIndex]??u.airMissionPoint??null):u.airMissionPoint??null;
  }
  u.airSortieCount = u.airSortieCount ?? 0;
  u.airThreat = u.airThreat ?? 0;
  u.airWeaponCooldown = Math.max(0, (u.airWeaponCooldown ?? 0) - dt);

  const mission = u.airMission ?? (u.kind === "fighter" || u.kind === "interceptor" ? "cap" : "ground");
  const threat = aaThreatAt(w, u.team, u.x, u.z);
  u.airThreat = threat;
  if (threat > mobility.combat.aaRetreatThreat && mission !== "sead" && u.airState === "airborne") {
    u.airState = "returning";
    u.airReturnReason = "threat";
    u.target=null;u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;u.airLandingPhase="approach";
    const home = u.airMissionHomeId ? w.byId.get(u.airMissionHomeId) : null;
    if (home) { u.dest = {x: home.x, z: home.z}; u.mode = "move"; }
    return;
  }

  // SEAD: actively hunt AA
  if (mission === "sead" && (!u.target || u.target.dead || aaThreatRadius(u.target)<=0)) {
    let best: Entity | null = null;
    let bestD = 1e9;
    for (const e of w.entities) {
      if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team) || !airMissionAllowsTarget(u,e)||!canEngage(u,e)) continue;
      const d = Math.hypot(e.x - u.x, e.z - u.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      u.target = best;
      u.dest = { x: best.x, z: best.z };
      u.mode = "attack";
    }
  }

  // Strike: prefer generators, supply, production
  if (mission === "strike" && (!u.target || u.target.dead)) {
    const prio = ["supply", "generator", "factory", "helipad", "airbase", "barracks", "hq"];
    let best: Entity | null = null;
    let bestScore = 1e9;
    for (const e of w.entities) {
      if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team) || !airMissionAllowsTarget(u,e)||e.def.speed > 0||!canEngage(u,e)) continue;
      const pi = prio.indexOf(e.kind);
      if (pi < 0) continue;
      const d = Math.hypot(e.x - u.x, e.z - u.z);
      const score = d + pi * 15;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) {
      u.target = best;
      u.dest = { x: best.x, z: best.z };
      u.mode = "attack";
    }
  }

  // CAP: engage enemy air only
  if (mission === "cap") {
    if (u.target && u.target.def.armor !== "air" && u.target.def.category !== "heli") {
      u.target = null;
    }
    if (!u.target || u.target.dead) {
      let best: Entity | null = null;
      let bestD = 1e9;
      for (const e of w.entities) {
        if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team)||!airMissionAllowsTarget(u,e)) continue;
        if (e.def.armor !== "air" && e.def.category !== "heli" || !canEngage(u,e)) continue;
        const d = Math.hypot(e.x - u.x, e.z - u.z);
        if (d < Math.max(u.aggro, u.def.range + 20) && d < bestD) {
          bestD = d; best = e;
        }
      }
      if (best) {
        u.target = best;
        u.mode = "attack";
      }
    }
  }

  if(mission==="cap"&&!u.target&&u.mode==="attack"){u.mode="patrol";u.dest=u.patrolPoints[u.patrolIndex]??u.airMissionPoint??null;}

  // Temporary avoidance preserves the mission anchor and works for unarmed transports too.
  if(mission!=="sead"&&u.def.category==="heli"&&threat>mobility.combat.helicopterAvoidThreat){
    let nx=0,nz=0;
    for(const e of w.entities){
      if(e.dead||e.team===u.team||e.underConstruction||!w.isSpottedByTeam(e,u.team))continue;
      const r=aaThreatRadius(e),d=Math.hypot(e.x-u.x,e.z-u.z)||1;
      if(r>0&&d<r){nx+=(u.x-e.x)/d;nz+=(u.z-e.z)/d;}
    }
    if(nx||nz){
      const m=Math.hypot(nx,nz),edge=w.mapSize/2-20,span=mobility.combat.helicopterAvoidDistance;
      u.flightAttackExit={x:Math.max(-edge,Math.min(edge,u.x+nx/m*span)),z:Math.max(-edge,Math.min(edge,u.z+nz/m*span))};
      u.flightAttackExitUntil=w.time+mobility.combat.helicopterAvoidTime;
    }
  }
}

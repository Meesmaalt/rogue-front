import logisticsRules from "../../data/logistics.json";
import {weaponSpec,weaponAmmo} from "./combat";
import {heightAt} from "../heightmap";
import type { World } from "../World";
import type { Entity } from "../types";
import { FACTIONS } from "../factions";

/** Wargame-style tactical logistics on top of Real War airbridge income. */
const SUPPLY_RADIUS_HQ = 70;
const SUPPLY_RADIUS_DEPOT = 55;
const SUPPLY_RADIUS_FORWARD = 42; // depots far from HQ act as forward


export function supplyRadiusFor(depot: Entity, w: World): number {
  if (depot.kind === "hq") return SUPPLY_RADIUS_HQ;
  if (depot.kind !== "supply") return 0;
  const hq = w.hq[depot.team];
  if (!hq || hq.dead) return SUPPLY_RADIUS_FORWARD;
  const d = Math.hypot(depot.x - hq.x, depot.z - hq.z);
  // Closer to HQ = main depot (larger); far = forward (smaller, riskier placement)
  return (d > 90 ? SUPPLY_RADIUS_FORWARD : SUPPLY_RADIUS_DEPOT) * (1 + ((depot.buildingLevel??1)-1)*.18);
}

export function isTacticallySupplied(w: World, e: Entity): boolean {
  if (e.def.speed === 0) return true;
  if(e.def.armor==="air"&&((e.motionSpeed??0)>.5||e.y-heightAt(e.x,e.z)>3))return false;
  const nodes = w.entities.filter(n=>!n.dead&&!n.underConstruction&&(n.disabledUntil??0)<=w.time&&n.team===e.team&&["hq","supply"].includes(n.kind));
  for (const n of nodes) {
    const r = supplyRadiusFor(n, w);
    if (Math.hypot(n.x - e.x, n.z - e.z) <= r) {
      if ((n.ammoStock ?? 0) > 0 || (n.fuelStock ?? 0) > 0) return true;
    }
  }
  return false;
}

function defaultMaxAmmo(kind: string): number {
  // Legacy fallback for old saved games; Phase 58 normally gets this from UnitDef.
  if (kind === "tank") return 40;
  if (kind === "artillery") return 60;
  if (kind === "mlrs") return 12;
  if (kind === "fighter" || kind === "interceptor" || kind === "bomber") return 8;
  return 0;
}

function defaultMaxFuel(kind: string, armor: string): number {
  if (armor === "air" || kind === "heli" || kind === "gunship" || kind === "transport") return 1000;
  if (["tank", "ifv", "apc", "artillery", "mlrs", "aa"].includes(kind)) return 600;
  return 0;
}

/** Call once after spawn to ensure ground vehicles have ammo/fuel pools. */
export function ensureLogisticsPools(e: Entity): void {
  const maxA = defaultMaxAmmo(e.kind);
  if (maxA > 0 && (e.maxAmmo ?? 0) === 0) {
    e.maxAmmo = maxA;
    e.ammo = maxA;
  }
  const maxF = defaultMaxFuel(e.kind, e.def.armor);
  if (maxF > 0 && (e.maxFuel ?? 0) === 0) {
    e.maxFuel = maxF;
    e.fuel = maxF;
  }
}

/**
 * Each tick: drain fuel when moving, rearm/refuel in supply, apply out-of-supply pressure.
 */
export function updateTacticalSupply(w: World, dt: number): void {
  const depots=w.entities.filter(n=>!n.dead&&!n.underConstruction&&(n.disabledUntil??0)<=w.time&&["hq","supply"].includes(n.kind));
  const commands=[w.commandNodes(0),w.commandNodes(1)];
  for (const e of w.entities) {
    if (e.dead || e.loadedIntoId != null) continue;
    if((e.maxAmmo??0)===0&&(e.maxFuel??0)===0) ensureLogisticsPools(e);
    const fac = e.team === w.playerTeam ? w.playerFaction : w.enemyFaction;
    const eff = FACTIONS[fac].bonuses.supplyEfficiency ?? 1;
    let depot:Entity|null=null,best=Infinity;
    const needsFuel=(e.fuel??0)<(e.maxFuel??0),needsAmmo=(e.ammo??0)<(e.maxAmmo??0)||!!e.secondaryAmmo?.some((_,i)=>i>0&&weaponAmmo(e,i)<weaponSpec(e,i).ammoCapacity);
    for(const n of depots){if(n.team!==e.team)continue;const distance=Math.hypot(n.x-e.x,n.z-e.z);const available=(!needsFuel&&!needsAmmo)||needsFuel&&(n.fuelStock??0)>0||needsAmmo&&(n.ammoStock??0)>0;const score=distance+(available?0:1000);if(distance<=supplyRadiusFor(n,w)&&score<best){best=score;depot=n;}}
    const inRadius=!!depot && (e.def.armor!=="air" || e.kind==="transport" && e.y-depot.y<3 && (e.motionSpeed??0)<.5);
    const home=w.byId.get(e.airMissionHomeId??-1);
    const groundAirService=e.def.armor==='air'&&['grounded','rearming'].includes(e.airState??'')&&!!home&&!home.dead&&!home.underConstruction&&(home.disabledUntil??0)<=w.time&&w.hasCommandLink(home)&&w.powerStatus(e.team).ratio>=.25&&Math.hypot(e.x-home.x,e.z-home.z)<35&&e.y-heightAt(e.x,e.z)<3;
    const supplied=(inRadius||groundAirService)&&!!depot&&((depot.ammoStock??0)>0||(depot.fuelStock??0)>0);
    const commandLinked=e.kind==="hq"||commands[e.team].some(n=>Math.hypot(n.x-e.x,n.z-e.z)<=w.commandNodeRange(n));
    const maxS=e.maxSupply??100;
    if (supplied) e.supply=Math.min(maxS,(e.supply??100)+22*dt);
    else e.supply=Math.max(0,(e.supply??100)-(e.def.supplyUsePerSec??(e.role==="siege"?1.8:e.def.armor==="air"?2.4:0.9))*dt);

    if ((e.maxFuel??0)>0) {
      const moving=(e.motionSpeed??0)>.1 || e.def.armor==="air" && !["grounded","rearming"].includes(e.airState??"") && e.y>heightAt(e.x,e.z)+3;
      if (moving && (e.fuel??0)>0) e.fuel=Math.max(0,(e.fuel??0)-(e.def.fuelUsePerSec??1)*dt);
      if (inRadius && depot && (depot.fuelStock??0)>0 && (e.fuel??0)<(e.maxFuel??0)) {
        const need=Math.min((e.maxFuel??0)-(e.fuel??0),(e.def.resupplyRate??1)*18*eff*dt);
        const take=Math.min(need,depot.fuelStock??0); depot.fuelStock=(depot.fuelStock??0)-take; e.fuel=(e.fuel??0)+take;
      }
    }
    // A stranded ground vehicle can be rescued by a nearby physical fuel convoy.
    if(e.def.domain==="land"&&needsFuel&&(!inRadius||!depot||(depot.fuelStock??0)<=0)){
      const donor=w.entities.find(n=>n!==e&&!n.dead&&n.team===e.team&&n.kind==="logiTruck"&&(n.logisticsPayload?.fuel??0)>0&&Math.hypot(n.x-e.x,n.z-e.z)<=logisticsRules.mobileRefuelRadius);
      if(donor?.logisticsPayload){const take=Math.max(0,Math.min((e.maxFuel??0)-(e.fuel??0),donor.logisticsPayload.fuel,logisticsRules.mobileRefuelRate*eff*dt));donor.logisticsPayload.fuel-=take;donor.cargo=Math.max(0,donor.cargo-take);e.fuel=(e.fuel??0)+take;}
    }
    if (inRadius && depot && (e.maxAmmo??0)>0 && (e.ammo??0)<(e.maxAmmo??0)) {
      const need=Math.min((e.maxAmmo??0)-(e.ammo??0),(e.def.resupplyRate??1)*4.5*eff*dt);
      const take=Math.min(need,depot.ammoStock??0); depot.ammoStock=(depot.ammoStock??0)-take; e.ammo=(e.ammo??0)+take;
    }
    if(inRadius&&depot&&e.secondaryAmmo&&e.def.armor!=="air")for(let i=1;i<(e.def.weapons?.length??0);i++){
      const spec=weaponSpec(e,i),need=Math.max(0,spec.ammoCapacity-weaponAmmo(e,i));
      const take=Math.min(need,(e.def.resupplyRate??1)*4.5*eff*dt,depot.ammoStock??0);e.secondaryAmmo[i]+=take;depot.ammoStock=(depot.ammoStock??0)-take;
    }
    // Soft operational degradation instead of an instant out-of-supply switch.
    if (!supplied || !commandLinked) {
      const s=e.supply??0;
      if (s<20 || !commandLinked) e.morale=Math.max(0,(e.morale??100)-((commandLinked?3.5:1.2)*dt));
    }
  }
}

export function outOfFuel(e: Entity): boolean {
  return (e.maxFuel ?? 0) > 0 && (e.fuel ?? 0) <= 0.5;
}

export function outOfAmmo(e: Entity): boolean {
  return (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) < (e.def.ammoUsePerShot??1) && !(e.def.weapons??[]).some((w,i)=>i>0&&weaponAmmo(e,i)>=w.ammoUsePerShot);
}

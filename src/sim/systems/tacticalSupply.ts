import logisticsRules from "../../data/logistics.json";
import {maxHitPoints} from "../unitStats";
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

/** A caller may reuse this view within one synchronous refresh, never across ticks. */
export function tacticalSupplyNodes(w:World,team:Entity["team"]):Entity[] {
  return w.entities.filter(n=>!n.dead&&!n.underConstruction&&(n.disabledUntil??0)<=w.time&&n.team===team&&(n.kind==="hq"||n.kind==="supply"));
}
/** Finite physical repair stock remains usable even while its upstream route is cut. */
export function repairDepotFor(w:World,e:Entity):Entity|null {
 return tacticalSupplyNodes(w,e.team).filter(n=>(n.repairStock??0)>0&&Math.hypot(n.x-e.x,n.z-e.z)<=logisticsRules.groundRepair.radius).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)||a.id-b.id)[0]??null;
}
/** A harbour consumes its connected land depot's real stock, never a free naval pool. */
export function navalServiceDepot(w:World,e:Entity):Entity|null {
 if(e.def.domain!=="sea")return null;
 for(const port of w.entities){
  if(port.kind!=="shipyard"||port.team!==e.team||port.dead||port.underConstruction||(port.disabledUntil??0)>w.time||Math.hypot(port.x-e.x,port.z-e.z)>logisticsRules.naval.serviceRadius||!w.hasCommandLink(port)||w.powerStatus(e.team).ratio<.25)continue;
  const depot=w.nearestSupplyDepot(e.team,port,true,true);
  if(depot?.kind==="supply"&&Math.hypot(depot.x-port.x,depot.z-port.z)<=80)return depot;
 }return null;
}
export function isTacticallySupplied(w: World, e: Entity, supplyNodes?:readonly Entity[]): boolean {
  if (e.def.speed === 0) return true;
  if(e.def.domain==="sea"){const naval=navalServiceDepot(w,e);return !!naval&&((naval.ammoStock??0)>0||(naval.fuelStock??0)>0);}
  if(e.def.armor==="air"&&((e.motionSpeed??0)>.5||e.y-heightAt(e.x,e.z)>3))return false;
  const nodes=supplyNodes??tacticalSupplyNodes(w,e.team);
  for (const n of nodes) {
    if(n.team!==e.team)continue;
    const r = supplyRadiusFor(n, w);
    if (Math.hypot(n.x - e.x, n.z - e.z) <= r) {
      if ((n.ammoStock ?? 0) > 0 || (n.fuelStock ?? 0) > 0) return true;
    }
  }
  return false;
}

/** The same stock-aware local source is used by simulation and tactical readouts. */
export function tacticalSupplyDepot(w:World,e:Entity,nodes:readonly Entity[]=tacticalSupplyNodes(w,e.team)):Entity|null {
 if(e.def.domain==="sea")return navalServiceDepot(w,e);
 let depot:Entity|null=null,best=Infinity;
 const needsFuel=(e.fuel??0)<(e.maxFuel??0),needsAmmo=(e.ammo??0)<(e.maxAmmo??0)||!!e.secondaryAmmo?.some((_,i)=>i>0&&weaponAmmo(e,i)<weaponSpec(e,i).ammoCapacity);
 for(const n of nodes){
  if(n.dead||n.underConstruction||(n.disabledUntil??0)>w.time||n.team!==e.team)continue;
  const distance=Math.hypot(n.x-e.x,n.z-e.z),available=(!needsFuel&&!needsAmmo)||needsFuel&&(n.fuelStock??0)>0||needsAmmo&&(n.ammoStock??0)>0;
  const score=distance+(available?0:1000);
  if(distance<=supplyRadiusFor(n,w)&&score<best){best=score;depot=n;}
 }
 return depot;
}
export function tacticalSupplyStatus(w:World,e:Entity,depot=tacticalSupplyDepot(w,e)):string {
 if(e.loadedIntoId!=null)return 'Pardal · välju varustamiseks';
 if(e.def.armor==='air'&&(e.y-heightAt(e.x,e.z)>3||(e.motionSpeed??0)>.5))return 'Õhus · teenindamine pärast maandumist';
 if(!depot)return e.def.domain==='sea'?'Väljaspool töötava sadama teenindusala':'Väljaspool lao varustusala';
 const name=depot.kind==='hq'?'Peakorter':w.isFOB(depot)?'FOB':'Ladu';
 const missing:string[]=[];
 if((depot.ammoStock??0)<=0)missing.push('moon');
 if((depot.fuelStock??0)<=0)missing.push('kütus');
 return `${name} #${depot.id} · ${missing.length?'otsas: '+missing.join(', '):'moon ja kütus saadaval'}`;
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
  const fuelConvoys:[Entity[],Entity[]]=[[],[]];
  for(const n of w.entities)if(!n.dead&&n.kind==="logiTruck")fuelConvoys[n.team].push(n);
  const commands=[w.commandNodes(0),w.commandNodes(1)];
  for (const e of w.entities) {
    if (e.dead || e.loadedIntoId != null) continue;
    if((e.maxAmmo??0)===0&&(e.maxFuel??0)===0) ensureLogisticsPools(e);
    const fac = e.team === w.playerTeam ? w.playerFaction : w.enemyFaction;
    const eff = FACTIONS[fac].bonuses.supplyEfficiency ?? 1;
    const needsFuel=(e.fuel??0)<(e.maxFuel??0);
    const depot=tacticalSupplyDepot(w,e,depots),portDepot=e.def.domain==="sea"?depot:null;
    if(portDepot&&(portDepot.repairStock??0)>0&&(e.hp<maxHitPoints(e)||Math.max(0,...Object.values(e.components??{}))>0)){const hp=Math.min(Math.max(maxHitPoints(e)-e.hp,Math.max(0,...Object.values(e.components??{}))),logisticsRules.naval.repairPerSecond*eff*dt,(portDepot.repairStock??0)*logisticsRules.naval.repairPerStock);e.hp=Math.min(maxHitPoints(e),e.hp+hp);portDepot.repairStock=(portDepot.repairStock??0)-hp/logisticsRules.naval.repairPerStock;if(e.components)for(const key of ["engine","tracks","turret","weapon","crew","ammo"] as const)e.components[key]=Math.max(0,e.components[key]-hp);}
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
      const donor=fuelConvoys[e.team].find(n=>n!==e&&!n.dead&&n.team===e.team&&n.kind==="logiTruck"&&(n.logisticsPayload?.fuel??0)>0&&Math.hypot(n.x-e.x,n.z-e.z)<=logisticsRules.mobileRefuelRadius);
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

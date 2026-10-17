import {updateAirportSupport} from '../airportSupport';
import mobility from "../../data/mobility.json";
import type { World } from "../World";
import {freeAirSlot,stationAircraft} from "./airDoctrine";
import type { Entity, UnitKind } from "../types";
import { BUILDINGS } from "../buildings";
import { deckRemaining } from "../deck";

export function producerKind(kind: UnitKind): "barracks" | "factory" | "helipad" | "airbase" | "shipyard" | "missileCommand" | null {
  if(kind==="cruiseLauncher")return "missileCommand";
  if(kind==="transportVan")return "barracks";
  if(kind==="airTransport")return "airbase";
  if (["inf","engineer","special","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm"].includes(kind)) return "barracks";
  if (["irSam","sam","howitzer","tank","apc","ifv","artillery","mlrs","reconVehicle","lightTank","tankDestroyer","spaa"].includes(kind)) return "factory";
  if (["heli","transport","scoutHeli","gunship","casHeli"].includes(kind)) return "helipad";
  if (["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(kind)) return "airbase";
  if (["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(kind)) return "shipyard";
  return null;
}

const UNIT_LIMITS: Partial<Record<string, number>> = {
  inf: 40, engineer: 8, special: 4, atInf: 12, mgInf: 10, reconInf: 10, sniper: 6, mortar: 8, manpad: 8, atgm: 8,
  tank: 18, apc: 16, ifv: 14, artillery: 8, mlrs: 6, reconVehicle: 8, lightTank: 8, tankDestroyer: 8, spaa: 8,
  transportVan: 12, scoutHeli: 6, heli: 6, gunship: 6, transport: 6, casHeli: 6, fighter: 8, interceptor: 6, bomber: 4, ecm: 4, multirole: 6, attackAircraft: 6,
  destroyer: 4, submarine: 4, landingcraft: 6, frigate: 6, missileBoat: 8,
};

/**
 * Why a "produce" order would be rejected (empty string = accepted). The command handler and the build
 * buttons share this, so a button is never enabled for an order the simulation silently drops.
 */
export function orderBlockReason(w:World,producer:Entity,kind:UnitKind):string {
  const team=producer.team,def=w.unitDefinition(kind,team);
  const deck=w.deckForTeam(team),battlegroup=w.battlegroupForTeam(team);
  if(deck&&kind!=="engineer"){
    let queued=0;
    for(const e of w.entities)if(!e.dead&&e.team===team)queued+=e.productionQueue.filter(k=>k===kind).length;
    if(deckRemaining(deck,kind,w.producedForTeam(team)[kind]??0)-queued<=0)return "Koosseisu limiit täis";
    if(battlegroup&&!battlegroup.canDeploy(kind,queued+1))return "Lahingugrupi limiit täis";
  }
  const limit=UNIT_LIMITS[kind];
  if(limit!==undefined&&w.entities.filter(e=>!e.dead&&e.team===team&&e.kind===kind).length+producer.productionQueue.filter(k=>k===kind).length>=limit)return `Üksuse limiit täis (${limit})`;
  if(def.category==="air"&&producer.kind==="airbase"){
    const air=w.airbaseStatus(team);
    const queuedAir=w.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="airbase").reduce((n,e)=>n+e.productionQueue.length,0);
    if(air.aircraft+queuedAir>=air.capacity)return `Lennuväe limiit täis (${air.aircraft+queuedAir}/${air.capacity}) · uuenda lennujaama`;
  }
  if(w.powerStatus(team).ratio<0.25&&kind!=="inf"&&kind!=="engineer")return "Energiapuudus";
  return "";
}

function exitPoint(producer: Entity, distance: number): { x: number; z: number } {
  const dx = Math.sin(producer.heading), dz = Math.cos(producer.heading);
  return { x: producer.x + dx * distance, z: producer.z + dz * distance };
}

/** A free point inside a sealed pocket is not a usable factory exit. Bounded local flood. */
function canLeaveProductionArea(w:World,producer:Entity,point:{x:number;z:number},radius:number):boolean {
  const grid=w.nav,start=grid.worldToCell(point.x,point.z);
  if(grid.isBlocked(start.x,start.z,radius))return false;
  const reach=producer.def.radius+radius+4+Math.max(...mobility.production.exitRings)+grid.cellSize;
  const center=grid.worldToCell(producer.x,producer.z),extent=Math.ceil(reach/grid.cellSize)+1;
  const queue=[start],seen=new Set([grid.index(start.x,start.z)]);
  const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
  for(let i=0;i<queue.length;i++){
    const cell=queue[i],world=grid.cellToWorld(cell.x,cell.z);
    if(Math.hypot(world.x-producer.x,world.z-producer.z)>=reach)return true;
    for(const [dx,dz] of directions){
      const x=cell.x+dx,z=cell.z+dz,id=grid.index(x,z);
      if(Math.abs(x-center.x)>extent||Math.abs(z-center.z)>extent||seen.has(id)||grid.isBlocked(x,z,radius))continue;
      if(dx&&dz&&(grid.isBlocked(cell.x+dx,cell.z,radius)||grid.isBlocked(cell.x,cell.z+dz,radius)))continue;
      seen.add(id);queue.push({x,z});
    }
  }
  return false;
}

/** Find a real unoccupied ground exit before consuming deck availability. */
function groundExit(w:World,producer:Entity,kind:UnitKind):{x:number;z:number}|null {
  const def=w.unitDefinition(kind,producer.team),distance=Math.max(10,producer.def.radius+def.radius+4);
  for(const ring of mobility.production.exitRings)for(let i=0;i<mobility.production.exitSamples;i++){
    const angle=producer.heading+i*Math.PI*2/mobility.production.exitSamples;
    const p={x:producer.x+Math.sin(angle)*(distance+ring),z:producer.z+Math.cos(angle)*(distance+ring)};
    if(!w.nav.isWalkableWorld(p.x,p.z,def.radius))continue;
    if(w.entities.some(e=>!e.dead&&e.loadedIntoId==null&&!e.garrisonId&&e.def.armor!=="air"&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+def.radius+mobility.production.exitClearance))continue;
    if(!canLeaveProductionArea(w,producer,p,def.radius))continue;
    return p;
  }
  return null;
}

/** Shared work rate for simulation and the player's time estimate. */
export function productionWorkRate(w:World,producer:Entity):number {
  const powerRatio=w.powerStatus(producer.team).ratio;
  const baseSpeed=BUILDINGS[producer.kind as keyof typeof BUILDINGS]?.productionSpeed??1;
  const level=w.producerLevel(producer),levelSpeed=level>=3?1.65:level>=2?1.35:1;
  const commandKind=["missileCommand","barracks","factory"].includes(producer.kind)?"landCommand":["helipad","airbase"].includes(producer.kind)?"airCommand":"seaCommand";
  let commandLevel=1;for(const e of w.entities)if(!e.dead&&!e.underConstruction&&e.team===producer.team&&e.kind===commandKind)commandLevel=Math.max(commandLevel,w.producerLevel(e));
  const strategyKind=commandKind==="landCommand"?"landStrategy":commandKind==="airCommand"?"airStrategy":"seaStrategy";
  return Math.max(.2,powerRatio)*baseSpeed*levelSpeed*(1+(commandLevel-1)*.12)*(w.hasBuilding(producer.team,strategyKind)?1.12:1);
}

export function productionStatus(w:World,producer:Entity):string {
  const kind=producer.productionQueue[0];if(!kind)return "Järjekord tühi";
  const def=w.unitDefinition(kind,producer.team),remaining=Math.max(0,def.buildTime-producer.productionProgress);
  if(producer.underConstruction)return "Tootmine ootab hoone valmimist";
  if(!w.canProduceAtLevel(producer,kind))return "Tootmine ootab sobivat hoonetaset";
  const operation=w.productionOperational(producer,kind);if(!operation.operational)return "Tootmine peatatud · "+operation.reason;
  if(remaining<=.001&&def.domain==="land"&&!groundExit(w,producer,kind))return "Valmis · vabasta tehase väljumisala";
  if(remaining<=.001)return "Valmis · ootab väljumist";
  return "Toodab · ligikaudu "+Math.ceil(remaining/productionWorkRate(w,producer))+" s";
}

function spawnProduced(w: World, producer: Entity, kind: UnitKind): boolean {
  const def=w.unitDefinition(kind,producer.team);
  const air=def.armor==="air",slot=air?freeAirSlot(w,producer):-1;
  if(air&&slot<0)return false;
  let waterPoint=def.domain==="sea"?w.waterNav.nearestWater(producer,def.radius,64):null;
  if(def.domain==="sea"){
    if(!waterPoint)return false;
    const origin=waterPoint,free=(p:{x:number;z:number})=>w.waterNav.isWalkableWorld(p.x,p.z,def.radius)&&!w.entities.some(e=>!e.dead&&e.def.domain==="sea"&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+def.radius+2);
    if(!free(origin)){waterPoint=null;for(let r=8;r<=48&&!waterPoint;r+=8)for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:origin.x+Math.sin(a)*r,z:origin.z+Math.cos(a)*r};if(free(p)){waterPoint=p;break;}}}
    if(!waterPoint)return false;
  }
  const groundPoint=def.domain==="land"?groundExit(w,producer,kind):null;
  if(def.domain==="land"&&!groundPoint)return false;
  const battlegroup = w.battlegroupForTeam(producer.team);
  if (battlegroup && kind !== "engineer" && !battlegroup.deploy(kind, 1)) return false;
  const counts = w.producedForTeam(producer.team);
  if (w.networkMode || producer.team === w.playerTeam) counts[kind] = (counts[kind] ?? 0) + 1;
  const p = groundPoint??waterPoint??exitPoint(producer,Math.max(10,producer.def.radius+def.radius+4));
  const u = w.spawn(kind, producer.team, p.x, p.z);
  if(def.domain==="sea"){u.y=w.waterNav.surfaceAt(u.x,u.z)+.15;u.heading=producer.heading;u.pHeading=u.heading;}
  if (air) stationAircraft(w,u,producer,slot);
  if (producer.preDeployOrder) { const o = producer.preDeployOrder; u.mode = o.mode === "attack" ? "amove" : o.mode; u.dest = o.x !== undefined && o.z !== undefined ? {x:o.x,z:o.z} : null; if (o.mode === "hold") u.holdPosition = true; }
  if (kind === "special") { u.supply = 100; }
  if (producer.preDeployOrder) return true;
  if (kind === "transport") {
    // Toodetud transport on taktikaline vägede transport.
    // Lao kogumiskopterid kuuluvad eraldi füüsilise ressursiveo tsüklisse.
    u.mode = "idle";
    u.dest = null;
  } else {
    const rally = producer.rallyPoint;
    u.mode = rally ? "move" : "idle";
    u.dest = rally ? { ...rally } : null;
  }
  return true;
}

export function updateProduction(w: World, dt: number): void {
  updateAirportSupport(w);
  for (const producer of w.entities) {
    if (producer.dead || producer.underConstruction || (producer.disabledUntil ?? 0) > w.time || !producer.productionQueue.length) continue;
    const kind = producer.productionQueue[0];
    const def=w.unitDefinition(kind,producer.team);
    const buildingKind = producerKind(kind);
    if (producer.kind !== buildingKind) continue;
    if (!w.canProduceAtLevel(producer, kind)) { producer.productionQueue.shift(); continue; }
    // Phase 71: queued production is persistent, but progress stops while the
    // producer loses command, power, logistics or its strategic branch.
    // This makes destroying a command node/logistics route materially affect the base.
    if(def.armor==="air"&&freeAirSlot(w,producer)<0)continue;
    const operational = w.productionOperational(producer, kind);
    if (!operational.operational) continue;
    // Barracks and helipads produce without a nearby supply depot (no material draw); factories, shipyards and missile commands still need one.
    const infantry=producer.kind==='barracks'||producer.kind==='helipad';
    const depot=producer.kind==='airbase'?producer:infantry?null:w.nearestSupplyDepot(producer.team,producer,true,true);
    if(!infantry&&!depot)continue;
    const wanted=dt*productionWorkRate(w,producer);
    const materialRate = Math.max(1, def.cost / Math.max(1, def.buildTime) * 0.12);
    const progress = Math.min(wanted, Math.max(0,def.buildTime-producer.productionProgress), infantry?Infinity:(depot!.ammoStock ?? 0) / materialRate, infantry?Infinity:(depot!.fuelStock ?? 0) / materialRate);
    if(!infantry&&depot){depot.ammoStock = Math.max(0, (depot.ammoStock ?? 0) - progress * materialRate);depot.fuelStock = Math.max(0, (depot.fuelStock ?? 0) - progress * materialRate);}
    producer.productionProgress += progress;
    if (producer.productionProgress < def.buildTime) continue;
    if (!spawnProduced(w, producer, kind)) continue;
    producer.productionProgress = 0;
    producer.productionQueue.shift();
  }
  const first = w.entities.find(e => !e.dead && e.team === w.playerTeam && e.productionQueue.length);
  w.queue = first ? [...first.productionQueue] : [];
  w.queueProgress = first?.productionProgress ?? 0;
}

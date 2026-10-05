import type { World } from "../World";
import {freeAirSlot,stationAircraft} from "./airDoctrine";
import type { Entity, UnitKind } from "../types";
import { BUILDINGS } from "../buildings";

function producerKind(kind: UnitKind): "barracks" | "factory" | "helipad" | "airbase" | "shipyard" | null {
  if (["inf","engineer","special","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm"].includes(kind)) return "barracks";
  if (["tank","apc","ifv","artillery","mlrs","reconVehicle","lightTank","tankDestroyer","spaa"].includes(kind)) return "factory";
  if (["heli","transport","gunship","casHeli"].includes(kind)) return "helipad";
  if (["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(kind)) return "airbase";
  if (["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(kind)) return "shipyard";
  return null;
}

function exitPoint(producer: Entity, distance: number): { x: number; z: number } {
  const dx = Math.sin(producer.heading), dz = Math.cos(producer.heading);
  return { x: producer.x + dx * distance, z: producer.z + dz * distance };
}

function spawnProduced(w: World, producer: Entity, kind: UnitKind): boolean {
  const def=w.unitDefinition(kind,producer.team);
  const air=def.armor==="air",slot=air?freeAirSlot(w,producer):-1;
  if(air&&slot<0)return false;
  const battlegroup = w.battlegroupForTeam(producer.team);
  if (battlegroup && kind !== "engineer" && !battlegroup.deploy(kind, 1)) return false;
  const counts = w.producedForTeam(producer.team);
  if (w.networkMode || producer.team === w.playerTeam) counts[kind] = (counts[kind] ?? 0) + 1;
  const p = exitPoint(producer,Math.max(10,producer.def.radius+def.radius+4));
  const u = w.spawn(kind, producer.team, p.x, p.z);
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
    const powerRatio = w.powerStatus(producer.team).ratio;
    const baseSpeed = BUILDINGS[producer.kind as keyof typeof BUILDINGS]?.productionSpeed ?? 1;
    const level = w.producerLevel(producer);
    const levelSpeed = level >= 3 ? 1.65 : level >= 2 ? 1.35 : 1;
    const commandKind=["barracks","factory"].includes(producer.kind)?"landCommand":["helipad","airbase"].includes(producer.kind)?"airCommand":"seaCommand";
    const commandLevel=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===producer.team&&e.kind===commandKind).reduce((n,e)=>Math.max(n,w.producerLevel(e)),1);
    const commandBonus=1+(commandLevel-1)*.12;
    const strategyBonus =
      (["barracks","factory"].includes(producer.kind) && w.hasBuilding(producer.team, "landStrategy")) ||
      (["helipad","airbase"].includes(producer.kind) && w.hasBuilding(producer.team, "airStrategy")) ||
      (producer.kind === "shipyard" && w.hasBuilding(producer.team, "seaStrategy")) ? 1.12 : 1;
    const depot = w.nearestSupplyDepot(producer.team, producer, true, true);
    if (!depot) continue;
    const wanted = dt * Math.max(0.2, powerRatio) * baseSpeed * levelSpeed * strategyBonus * commandBonus;
    const materialRate = Math.max(1, def.cost / Math.max(1, def.buildTime) * 0.12);
    const progress = Math.min(wanted, Math.max(0,def.buildTime-producer.productionProgress), (depot.ammoStock ?? 0) / materialRate, (depot.fuelStock ?? 0) / materialRate);
    depot.ammoStock = Math.max(0, (depot.ammoStock ?? 0) - progress * materialRate);
    depot.fuelStock = Math.max(0, (depot.fuelStock ?? 0) - progress * materialRate);
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

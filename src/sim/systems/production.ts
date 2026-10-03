import type { World } from "../World";
import { UNITS } from "../units";
import type { Entity, UnitKind } from "../types";

function producerKind(kind: UnitKind): "barracks" | "factory" | "helipad" | "airbase" | "shipyard" | null {
  if (kind === "inf" || kind === "engineer" || kind === "special") return "barracks";
  if (kind === "tank" || kind === "apc" || kind === "ifv" || kind === "artillery" || kind === "mlrs") return "factory";
  if (kind === "heli" || kind === "transport" || kind === "gunship") return "helipad";
  if (kind === "fighter" || kind === "interceptor" || kind === "bomber") return "airbase";
  if (kind === "destroyer" || kind === "submarine" || kind === "landingcraft") return "shipyard";
  return null;
}

function exitPoint(producer: Entity, distance: number): { x: number; z: number } {
  const dx = Math.sin(producer.heading), dz = Math.cos(producer.heading);
  return { x: producer.x + dx * distance, z: producer.z + dz * distance };
}

function spawnProduced(w: World, producer: Entity, kind: UnitKind): void {
  const p = exitPoint(producer, (producer.kind === "helipad" || producer.kind === "airbase") ? 10 : 9);
  const u = w.spawn(kind, producer.team, p.x + (w.rng() - 0.5) * 3, p.z + (w.rng() - 0.5) * 3);
  if (u.def.armor === "air") { u.airState = "grounded"; u.airMissionHomeId = producer.id; u.airSortieTime = 0; }
  if (producer.preDeployOrder) { const o = producer.preDeployOrder; u.mode = o.mode === "attack" ? "amove" : o.mode; u.dest = o.x !== undefined && o.z !== undefined ? {x:o.x,z:o.z} : null; if (o.mode === "hold") u.holdPosition = true; }
  if (kind === "special") { u.supply = 100; }
  if (kind === "transport") {
    // Toodetud transport on taktikaline vägede transport.
    // Supply-helicopterid tulevad Supply Depotidele automaatselt väljastpoolt kaarti.
    u.mode = "idle";
    u.dest = null;
  } else {
    const rally = producer.rallyPoint;
    u.mode = rally ? "move" : "idle";
    u.dest = rally ? { ...rally } : null;
  }
}

export function updateProduction(w: World, dt: number): void {
  for (const producer of w.entities) {
    if (producer.dead || producer.underConstruction || (producer.disabledUntil ?? 0) > w.time || !producer.productionQueue.length) continue;
    const kind = producer.productionQueue[0];
    const buildingKind = producerKind(kind);
    if (producer.kind !== buildingKind) continue;
    const powerRatio = w.powerStatus(producer.team).ratio;
    producer.productionProgress += dt * Math.max(0.2, powerRatio);
    if (producer.productionProgress < UNITS[kind].buildTime) continue;
    producer.productionProgress = 0;
    producer.productionQueue.shift();
    spawnProduced(w, producer, kind);
  }
  const first = w.entities.find(e => !e.dead && e.team === w.playerTeam && e.productionQueue.length);
  w.queue = first ? [...first.productionQueue] : [];
  w.queueProgress = first?.productionProgress ?? 0;
}

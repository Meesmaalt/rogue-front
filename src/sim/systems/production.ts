import type { World } from "../World";
import { UNITS } from "../units";
import type { Entity, UnitKind } from "../types";

function producerKind(kind: UnitKind): "barracks" | "factory" | "helipad" | null {
  if (kind === "inf" || kind === "engineer") return "barracks";
  if (kind === "tank" || kind === "artillery") return "factory";
  if (kind === "heli" || kind === "transport" || kind === "gunship" || kind === "fighter") return "helipad";
  return null;
}

function exitPoint(producer: Entity, distance: number): { x: number; z: number } {
  const dx = Math.sin(producer.heading), dz = Math.cos(producer.heading);
  return { x: producer.x + dx * distance, z: producer.z + dz * distance };
}

function spawnProduced(w: World, producer: Entity, kind: UnitKind): void {
  const p = exitPoint(producer, producer.kind === "helipad" ? 10 : 9);
  const u = w.spawn(kind, producer.team, p.x + (w.rng() - 0.5) * 3, p.z + (w.rng() - 0.5) * 3);
  if (kind === "transport") {
    const rp = w.resourcePoints.find(r => r.amount > 0);
    u.logisticsHome = { x: producer.x, z: producer.z };
    u.logisticsTarget = rp ? { x: rp.x, z: rp.z } : null;
    u.mode = rp ? "patrol" : "idle";
    u.dest = u.logisticsTarget;
  } else {
    const rally = producer.rallyPoint;
    u.mode = rally ? "move" : "idle";
    u.dest = rally ? { ...rally } : null;
  }
}

export function updateProduction(w: World, dt: number): void {
  for (const producer of w.entities) {
    if (producer.dead || producer.underConstruction || !producer.productionQueue.length) continue;
    const kind = producer.productionQueue[0];
    const buildingKind = producerKind(kind);
    if (producer.kind !== buildingKind) continue;
    producer.productionProgress += dt;
    if (producer.productionProgress < UNITS[kind].buildTime) continue;
    producer.productionProgress = 0;
    producer.productionQueue.shift();
    spawnProduced(w, producer, kind);
  }
  const first = w.entities.find(e => !e.dead && e.team === w.playerTeam && e.productionQueue.length);
  w.queue = first ? [...first.productionQueue] : [];
  w.queueProgress = first?.productionProgress ?? 0;
}

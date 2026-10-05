import {maxHitPoints} from "./unitStats";
import type { World } from "./World";
import type { Entity, Point, Team } from "./types";

export type FrontlinePosture = "advance" | "hold" | "fallback";
export interface FrontlineSector {
  id: string;
  center: Point;
  width: number;
  control: number;
  pressure: [number, number];
  posture: [FrontlinePosture, FrontlinePosture];
  friendlyStrength: [number, number];
  enemyStrength: [number, number];
  supply: [number, number];
}

/** Phase 86: dynamic frontline derived from the operational map. */
export class FrontlineController {
  readonly sectors: FrontlineSector[];
  readonly deploymentPoints: [Point[], Point[]] = [[], []];

  constructor(private readonly world: World) {
    const a = world.bases[0], b = world.bases[1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const count = 5;
    this.sectors = Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / (count + 1);
      return {
        id: `front-${i + 1}`,
        center: { x: a.x + dx * t, z: a.z + dz * t },
        width: 42,
        control: 0,
        pressure: [0, 0] as [number, number],
        posture: ["hold", "hold"] as [FrontlinePosture, FrontlinePosture],
        friendlyStrength: [0, 0] as [number, number],
        enemyStrength: [0, 0] as [number, number],
        supply: [0, 0] as [number, number],
      };
    });
    for (const team of [0, 1] as const) {
      const base = world.bases[team];
      const enemy = world.bases[team === 0 ? 1 : 0];
      const vx = enemy.x - base.x, vz = enemy.z - base.z;
      const l = Math.hypot(vx, vz) || 1;
      const gate = { x: base.x + vx / l * Math.min(60, base.r), z: base.z + vz / l * Math.min(60, base.r) };
      this.deploymentPoints[team].push(gate);
    }
  }

  tick(_dt: number): void {
    if (this.world.time < 2) return;
    for (const s of this.sectors) this.measure(s);
    this.updatePostures();
  }

  sectorForPoint(p: Point): FrontlineSector | null {
    return this.sectors.reduce<FrontlineSector | null>((best, s) => {
      const d = Math.hypot(s.center.x - p.x, s.center.z - p.z);
      return d <= s.width && (!best || d < Math.hypot(best.center.x - p.x, best.center.z - p.z)) ? s : best;
    }, null);
  }

  status(team: Team): { advance: number; hold: number; fallback: number; strongest: string | null } {
    const posture = this.sectors.map(s => s.posture[team]);
    const strongest = [...this.sectors].sort((a, b) => b.pressure[team] - a.pressure[team])[0]?.id ?? null;
    return { advance: posture.filter(x => x === "advance").length, hold: posture.filter(x => x === "hold").length, fallback: posture.filter(x => x === "fallback").length, strongest };
  }

  private measure(s: FrontlineSector): void {
    const own: [number, number] = [0, 0], strength: [number, number] = [0, 0];
    for (const e of this.world.entities) {
      if (e.dead || e.loadedIntoId != null) continue;
      const d = Math.hypot(e.x - s.center.x, e.z - s.center.z);
      if (d > s.width) continue;
      const value = this.value(e);
      own[e.team] += e.def.speed > 0 ? 1 : 0;
      strength[e.team] += value;
      e.frontlineSector = s.id;
    }
    s.friendlyStrength = own;
    s.enemyStrength = strength;
    s.pressure = [strength[0] / Math.max(1, strength[1]), strength[1] / Math.max(1, strength[0])];
    const depot = ([0, 1] as const).map(t => this.world.nearestSupplyDepot(t, s.center, true));
    s.supply = [0, 0];
    for (const t of [0, 1] as const) if (depot[t]) s.supply[t] = Math.max(0, 1 - Math.hypot(depot[t]!.x-s.center.x, depot[t]!.z-s.center.z) / 220);
    s.control = Math.max(-1, Math.min(1, (strength[0] - strength[1]) / Math.max(1, strength[0] + strength[1])));
  }

  private updatePostures(): void {
    for (const s of this.sectors) for (const team of [0, 1] as const) {
      const enemy = team === 0 ? 1 : 0;
      const ratio = s.enemyStrength[team] / Math.max(1, s.enemyStrength[enemy]);
      const supply = s.supply[team];
      if (ratio > 1.45 && supply > 0.35) s.posture[team] = "advance";
      else if (ratio < 0.72 || supply < 0.12) s.posture[team] = "fallback";
      else s.posture[team] = "hold";
    }
  }

  private value(e: Entity): number {
    if (e.def.speed <= 0) return .2;
    const hp = Math.max(.1, e.hp / Math.max(1, maxHitPoints(e)));
    const supply = e.maxSupply ? Math.max(.2, (e.supply ?? 100) / e.maxSupply) : 1;
    return Math.max(.4, (e.def.damage || 1) / 12) * hp * supply * (1 + e.veteran * .1);
  }
}

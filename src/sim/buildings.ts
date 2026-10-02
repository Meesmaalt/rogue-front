import type { Point, UnitKind } from "./types";

export type BuildableKind = "barracks" | "factory" | "helipad" | "refinery" | "bunker" | "aa";

export interface BuildingSpec {
  kind: BuildableKind;
  cost: number;
  buildTime: number;
  footprint: number;
  repairPerSec: number;
  maxBuilders: number;
}

export const BUILDINGS: Record<BuildableKind, BuildingSpec> = {
  barracks: { kind: "barracks", cost: 160, buildTime: 8, footprint: 7, repairPerSec: 28, maxBuilders: 2 },
  factory: { kind: "factory", cost: 220, buildTime: 11, footprint: 9, repairPerSec: 24, maxBuilders: 2 },
  helipad: { kind: "helipad", cost: 200, buildTime: 9, footprint: 9, repairPerSec: 24, maxBuilders: 2 },
  refinery: { kind: "refinery", cost: 180, buildTime: 8, footprint: 8, repairPerSec: 26, maxBuilders: 2 },
  bunker: { kind: "bunker", cost: 120, buildTime: 7, footprint: 6, repairPerSec: 34, maxBuilders: 2 },
  aa: { kind: "aa", cost: 160, buildTime: 8, footprint: 6, repairPerSec: 30, maxBuilders: 2 },
};

export function isBuildable(kind: UnitKind): kind is BuildableKind {
  return kind in BUILDINGS;
}

export function buildCost(kind: BuildableKind): number { return BUILDINGS[kind].cost; }
export function buildTime(kind: BuildableKind): number { return BUILDINGS[kind].buildTime; }
export function buildFootprint(kind: BuildableKind): number { return BUILDINGS[kind].footprint; }

export function overlapsCircle(a: Point, ar: number, b: Point, br: number): boolean {
  return Math.hypot(a.x - b.x, a.z - b.z) < ar + br;
}

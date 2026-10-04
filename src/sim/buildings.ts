import type { Point, UnitKind } from "./types";

export type BuildableKind = "hq" | "barracks" | "factory" | "helipad" | "airbase" | "refinery" | "supply" | "radar" | "bunker" | "aa" | "generator" | "shipyard" | "landCommand" | "airCommand" | "seaCommand" | "combatEngineer" | "landStrategy" | "airStrategy" | "seaStrategy";

export interface BuildingSpec {
  kind: BuildableKind;
  cost: number;
  buildTime: number;
  footprint: number;
  repairPerSec: number;
  maxBuilders: number;
  requires?: BuildableKind[];
  powerUse?: number;
  powerSupply?: number;
  limit?: number;
  /** Phase 58: explicit military/economic function shown to the player. */
  role: "command" | "production" | "logistics" | "power" | "sensor" | "defense" | "upgrade";
  supplyCapacity?: number;
  fuelCapacity?: number;
  ammoCapacity?: number;
  productionSpeed?: number;
}

export const BUILDINGS: Record<BuildableKind, BuildingSpec> = {
  hq: {kind:"hq",cost:500,buildTime:20,footprint:10,repairPerSec:20,maxBuilders:3,powerUse:0,limit:1,role:"command"},
  barracks: { kind: "barracks", cost: 160, buildTime: 8, footprint: 7, repairPerSec: 28, maxBuilders: 2, requires: ["landCommand"], powerUse: 10, limit: 2 , role: "production", productionSpeed: 1},
  factory: { kind: "factory", cost: 220, buildTime: 11, footprint: 9, repairPerSec: 24, maxBuilders: 2, requires: ["landCommand"], powerUse: 18, limit: 2 , role: "production", productionSpeed: 1},
  helipad: { kind: "helipad", cost: 200, buildTime: 9, footprint: 9, repairPerSec: 24, maxBuilders: 2, requires: ["airCommand"], powerUse: 12, limit: 2 , role: "production", productionSpeed: 1},
  airbase: { kind: "airbase", cost: 320, buildTime: 14, footprint: 13, repairPerSec: 22, maxBuilders: 3, requires: ["airCommand"], powerUse: 20, limit: 1 , role: "production", productionSpeed: 1},
  supply: { kind: "supply", cost: 130, buildTime: 7, footprint: 6, repairPerSec: 32, maxBuilders: 2, requires: ["generator"], powerUse: 6, limit: 3 , role: "logistics", supplyCapacity: 1600, fuelCapacity: 900, ammoCapacity: 1200},
  radar: { kind: "radar", cost: 190, buildTime: 9, footprint: 6, repairPerSec: 25, maxBuilders: 2, requires: ["supply"], powerUse: 15, limit: 2 , role: "sensor"},
  refinery: { kind: "refinery", cost: 180, buildTime: 8, footprint: 8, repairPerSec: 26, maxBuilders: 2, requires: ["landCommand"], powerUse: 8, limit: 3 , role: "logistics", fuelCapacity: 1800},
  bunker: { kind: "bunker", cost: 120, buildTime: 7, footprint: 6, repairPerSec: 34, maxBuilders: 2, requires: ["barracks"], powerUse: 5, limit: 5 , role: "defense"},
  aa: { kind: "aa", cost: 160, buildTime: 8, footprint: 6, repairPerSec: 30, maxBuilders: 2, requires: ["radar"], powerUse: 15, limit: 4 , role: "defense"},
  generator: { kind: "generator", cost: 140, buildTime: 7, footprint: 6, repairPerSec: 30, maxBuilders: 2, powerSupply: 100, limit: 4 , role: "power", productionSpeed: 1},
  shipyard: { kind: "shipyard", cost: 360, buildTime: 15, footprint: 12, repairPerSec: 20, maxBuilders: 3, requires: ["seaCommand"], powerUse: 22, limit: 1 , role: "production", productionSpeed: 1},
  landCommand: { kind: "landCommand", cost: 100, buildTime: 7, footprint: 8, repairPerSec: 26, maxBuilders: 2, powerUse: 8, limit: 2 , role: "command"},
  airCommand: { kind: "airCommand", cost: 120, buildTime: 8, footprint: 8, repairPerSec: 24, maxBuilders: 2, powerUse: 9, limit: 1 , role: "command"},
  seaCommand: { kind: "seaCommand", cost: 120, buildTime: 8, footprint: 9, repairPerSec: 24, maxBuilders: 2, powerUse: 10, limit: 1 , role: "command"},
  combatEngineer: { kind: "combatEngineer", cost: 150, buildTime: 8, footprint: 7, repairPerSec: 30, maxBuilders: 2, requires: ["landCommand"], powerUse: 7, limit: 1 , role: "upgrade"},
  landStrategy: { kind: "landStrategy", cost: 240, buildTime: 12, footprint: 8, repairPerSec: 22, maxBuilders: 2, requires: ["landCommand"], powerUse: 14, limit: 1 , role: "upgrade", productionSpeed: 1.15},
  airStrategy: { kind: "airStrategy", cost: 260, buildTime: 13, footprint: 8, repairPerSec: 22, maxBuilders: 2, requires: ["airCommand"], powerUse: 15, limit: 1 , role: "upgrade", productionSpeed: 1.15},
  seaStrategy: { kind: "seaStrategy", cost: 260, buildTime: 13, footprint: 9, repairPerSec: 22, maxBuilders: 2, requires: ["seaCommand"], powerUse: 15, limit: 1 , role: "upgrade", productionSpeed: 1.15},
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

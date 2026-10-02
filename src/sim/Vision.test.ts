import { describe, expect, it } from "vitest";
import { Vision } from "./Vision";
import type { Entity } from "./types";
import { UNITS } from "./units";

function unit(id: number, team: 0 | 1, x: number, z: number, kind: "tank" | "hq" = "tank"): Entity {
  return {
    id, kind, team, def: UNITS[kind], x, y: 0, z, heading: 0, turretYaw: 0,
    px: x, pz: z, pHeading: 0, pTurretYaw: 0, hp: UNITS[kind].hp, cooldown: 0,
    mode: "idle", dest: null, target: null, aggro: 0, dead: false,
    navPath: [], navPathIndex: 0, flowField: null, stuckTime: 0, stuckX: x, stuckZ: z,
    xp: 0, veteran: 0, holdPosition: false, patrolPoints: [], patrolIndex: 0, upgrades: new Set<string>(), cargo: 0, logisticsTarget: null, logisticsHome: null, logisticsPhase: "idle", productionQueue: [], productionProgress: 0, rallyPoint: null, constructionProgress: 1, constructionTime: 0, builderIds: [], underConstruction: false, cargoUnitIds: [], loadedIntoId: null, transportTargetId: null, unloadPoint: null,
  };
}

describe("Vision", () => {
  it("keeps separate visibility state per team", () => {
    const v = new Vision();
    v.update([unit(1, 0, -100, -100), unit(2, 1, 100, 100)]);
    expect(v.isVisible(0, -100, -100)).toBe(true);
    expect(v.isVisible(0, 100, 100)).toBe(false);
    expect(v.isVisible(1, 100, 100)).toBe(true);
    expect(v.isVisible(1, -100, -100)).toBe(false);
  });

  it("retains explored state after a unit moves away", () => {
    const v = new Vision();
    const u = unit(1, 0, 0, 0);
    v.update([u]);
    expect(v.isVisible(0, 0, 0)).toBe(true);
    u.x = 80;
    v.update([u]);
    expect(v.isVisible(0, 0, 0)).toBe(false);
    expect(v.isExplored(0, 0, 0)).toBe(true);
  });

  it("hq has a larger vision radius than a tank", () => {
    const v = new Vision();
    v.update([unit(1, 0, 0, 0, "hq")]);
    expect(v.isVisible(0, 40, 0)).toBe(true);
    expect(v.isVisible(0, 55, 0)).toBe(false);
  });
});

import type { World } from "../World";
import type { Entity } from "../types";
import { BUILDINGS, isBuildable } from "../buildings";
import { dist2d } from "../math";

function buildersFor(w: World, target: Entity): Entity[] {
  return target.builderIds
    .map(id => w.byId.get(id))
    .filter((e): e is Entity => !!e && !e.dead && e.team === target.team && e.kind === "engineer");
}

export function updateConstruction(w: World, dt: number): void {
  for (const building of w.entities) {
    if (building.dead || !building.def.building) continue;
    const spec = isBuildable(building.kind) ? BUILDINGS[building.kind] : null;
    if (!spec) continue;

    const builders = buildersFor(w, building);
    if (building.underConstruction) {
      building.builderIds = builders.map(b => b.id).slice(0, spec.maxBuilders);
      const active = builders.filter(b => dist2d(b, building) <= 13).slice(0, spec.maxBuilders);
      const rate = (building.upgrading ? 1 : active.length) * dt;
      if (rate > 0) {
        building.constructionProgress += rate;
        if (building.upgrading) building.upgradeProgress = building.constructionProgress;
        for (const b of active) {
          b.mode = "build";
          b.dest = { x: building.x, z: building.z };
          b.target = building;
        }
      }
      if (building.constructionProgress >= building.constructionTime) {
        building.constructionProgress = building.constructionTime;
        building.underConstruction = false;
        if (building.upgrading && building.upgradeKind === "producer") {
          building.buildingLevel = Math.min(3, (building.buildingLevel ?? (building.upgrades.has("producer-3") ? 3 : building.upgrades.has("producer-2") ? 2 : 1)) + 1);
          if (building.buildingLevel >= 2) building.upgrades.add("producer-2");
          if (building.buildingLevel >= 3) building.upgrades.add("producer-3");
          building.upgrading = false; building.upgradeProgress = building.upgradeTime = 0; building.upgradeKind = undefined;
          building.def = { ...building.def, hp: building.def.hp * 1.15 };
          building.hp = building.def.hp;
        }
        if (!building.upgrading) building.hp=building.def.hp;
        if (building.kind === "supply") {
          building.supplyLevel=Math.max(building.supplyLevel??0,(building.buildingLevel??1)-1);
          building.logisticsMaxStorage=900+((building.buildingLevel??1)-1)*700;
        }
        w.invalidateNavigation();
        building.builderIds = [];
        for (const b of builders) {
          if (b.target === building) { b.target = null; b.dest = null; b.mode = "idle"; }
        }
        w.events.push({ type: "build-complete", team: building.team, x: building.x, y: building.y, z: building.z, kind: building.kind });
      }
      continue;
    }

    // Engineers can repair a friendly damaged structure by being assigned through a repair command.
    if (building.hp < building.def.hp && building.builderIds.length) {
      const active = builders.filter(b => dist2d(b, building) <= 13);
      if (active.length) {
        const depot = w.nearestSupplyDepot(building.team, {x:building.x,z:building.z}, true);
        const available = depot && dist2d(depot,building)<80 ? depot.repairStock??0 : 0;
        const wanted = active.length * spec.repairPerSec * w.repairMultiplier(building.team) * dt;
        const repair = Math.min(wanted, available);
        if (depot) depot.repairStock = Math.max(0, available - repair);
        building.hp = Math.min(building.def.hp, building.hp + repair);
        for (const b of active) { b.mode = "repair"; b.dest = { x: building.x, z: building.z }; b.target = building; }
        if (building.hp >= building.def.hp - 0.01) {
          building.hp = building.def.hp; building.builderIds = [];
          for (const b of active) { b.target = null; b.dest = null; b.mode = "idle"; }
          w.events.push({ type: "repair-complete", team: building.team, x: building.x, y: building.y, z: building.z, kind: building.kind });
        }
      }
    }
  }
}

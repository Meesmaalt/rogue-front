import policy from '../../data/construction-policy.json';
import {dispatchConstruction,constructionReach} from '../automaticConstruction';
import baseLife from '../../data/base-life.json';
import {stockCapacity,stockTotal} from "../stockLogistics";
import {maxHitPoints} from "../unitStats";
import type { World } from "../World";
import type { Entity } from "../types";
import { BUILDINGS, isBuildable } from "../buildings";
import { dist2d } from "../math";

function buildersFor(w: World, target: Entity): Entity[] {
  return target.builderIds
    .map(id => w.byId.get(id))
    .filter((e): e is Entity => !!e && !e.dead && e.team === target.team && e.kind === "engineer" && e.target===target && (e.mode==="build"||e.mode==="repair"));
}

export function updateConstruction(w: World, dt: number): void {
  dispatchConstruction(w);
  for (const building of w.entities) {
    if (building.dead || !building.def.building) continue;
    const spec = isBuildable(building.kind) ? BUILDINGS[building.kind] : null;
    if (!spec) continue;

    if(!building.underConstruction||building.upgrading||building.constructionProgress>0)w.terrain.clearBuilding(building);
    const builders = buildersFor(w, building);
    if (building.underConstruction) {
      building.builderIds = builders.map(b => b.id).slice(0, spec.maxBuilders);
      const active = builders.filter(b => b.loadedIntoId==null&&(!b.engineerDuty||b.engineerDuty.phase==='working')&&dist2d(b, building) <= (b.constructionCrew?constructionReach(w,building):baseLife.engineer.workDistance)).slice(0, spec.maxBuilders);
      const rate = (building.upgrading ? 1 : active.length) * dt;
      if (rate > 0) {
        building.constructionProgress += rate;
        w.terrain.clearBuilding(building);
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
          building.def = { ...building.def, hp: maxHitPoints(building) * 1.15 };
          building.hp = maxHitPoints(building);
        }
        if (!building.upgrading) building.hp=maxHitPoints(building);
        if (building.kind === "supply") {
          building.supplyLevel=Math.max(building.supplyLevel??0,(building.buildingLevel??1)-1);
          const cap=stockCapacity(w,building);building.logisticsMaxStorage=cap.ammo+cap.fuel+cap.repair;building.logisticsStorage=stockTotal(building);
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
    if (building.hp < maxHitPoints(building) && building.builderIds.length) {
      const active = builders.filter(b => b.loadedIntoId==null&&(!b.engineerDuty||b.engineerDuty.phase==='working')&&dist2d(b, building) <= (b.constructionCrew?constructionReach(w,building):baseLife.engineer.workDistance));
      if (active.length) {
        const depot = w.nearestSupplyDepot(building.team, {x:building.x,z:building.z}, true);
        const available = depot && dist2d(depot,building)<80 ? depot.repairStock??0 : 0;
        const wanted = active.length * spec.repairPerSec * w.repairMultiplier(building.team) * dt;
        const repair = Math.min(wanted, available);
        if (depot&&repair>0) depot.repairStock = Math.max(0, available - repair);
        building.hp = Math.min(maxHitPoints(building), building.hp + repair);
        for (const b of active) { b.mode = "repair"; b.dest = { x: building.x, z: building.z }; b.target = building; }
        if (building.hp >= maxHitPoints(building) - 0.01) {
          building.hp = maxHitPoints(building); building.builderIds = [];
          for (const b of active) { b.target = null; b.dest = null; b.mode = "idle"; }
          w.events.push({ type: "repair-complete", team: building.team, x: building.x, y: building.y, z: building.z, kind: building.kind });
        }
      }
    }
  }
}

/** Explains the actual construction gate instead of displaying a motionless unexplained bar. */
export function constructionStatus(w:World,building:Entity):string {
 const progress=Math.round(w.buildingProgress(building)*100);
 if(building.upgrading)return `Paigaldab hoone uusi osi · ${progress}%`;
 const builders=buildersFor(w,building),working=builders.some(e=>(!e.engineerDuty||e.engineerDuty.phase==='working')&&dist2d(e,building)<=(e.constructionCrew?constructionReach(w,building):baseLife.engineer.workDistance));
 if(working){const fraction=w.buildingProgress(building);return `${fraction<policy.stages.clearingEnd?'Platsi ettevalmistus':fraction<policy.stages.foundationEnd?'Vundamendi rajamine':fraction<policy.stages.structureEnd?'Karkassi ja seinte ehitus':'Viimistlus ja paigaldus'} · ${progress}%`;}
 if(builders.some(e=>e.engineerDuty?.phase==='to-van'||e.engineerDuty?.phase==='boarding'))return `Insenerid võtavad tööriistaautot · ${progress}%`;
 if(builders.some(e=>e.constructionCrew?.transportId!=null||e.loadedIntoId!=null))return `Chinook toob ehitusmeeskonda · ${progress}%`;
 if(builders.length)return `Tööauto liigub ehitusplatsile · ${progress}%`;
 return `HQ / FOB korraldab ehitusmeeskonda · ${progress}%`;
}

import { describe, expect, it } from "vitest";
import { Vision } from "./Vision";
import type { Entity } from "./types";
import { heightAt } from "./heightmap";
import {featureBlocksMovement,type MapFeatureDef} from "./mapFeatures";
import { UNITS } from "./units";

function unit(id: number, team: 0 | 1, x: number, z: number, kind: "tank" | "hq" = "tank"): Entity {
  return {
    id, kind, team, def: UNITS[kind], spottedUntil: [0,0], firingArc: Math.PI*2, firingRange: UNITS[kind].range, facingLocked: false, lastCombatTime: 0, x, y: heightAt(x,z), z, heading: 0, turretYaw: 0,
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
    v.update([u]);v.update([u]);
    expect(v.isVisible(0, 0, 0)).toBe(false);
    expect(v.isExplored(0, 0, 0)).toBe(true);
  });

  it("spatial candidates preserve rotated obstacle LOS and complete fog state",()=>{
    const features:MapFeatureDef[]=Array.from({length:120},(_,i)=>({id:`wall-${i}`,kind:"wall",x:(i%12)*32-180,z:Math.floor(i/12)*32-150,width:18,depth:3,height:8,rotation:i*.37}));
    const indexed=new Vision(),reference=new Vision();indexed.setFeatures(features);reference.setFeatures(features);
    const blockers=features.filter(f=>featureBlocksMovement(f)&&f.kind!=="water");
    // Reference broad phase examines all features, as the old implementation did.
    Object.defineProperty(reference,"blockersAt",{value:()=>blockers});
    const observers=[unit(1,0,-34,-32),unit(2,1,32,35),unit(3,0,64,-64)];
    indexed.update(observers);reference.update(observers);
    expect(indexed.snapshot()).toEqual(reference.snapshot());
    for(let i=0;i<30;i++){
      const a=unit(10,0,i*5-70,-52),b=unit(11,1,64,60-i*3);
      expect(indexed.hasLineOfSight(a,b)).toBe(reference.hasLineOfSight(a,b));
    }
    const bins=indexed as unknown as {blockersAt(x:number,z:number):readonly MapFeatureDef[]};
    expect(bins.blockersAt(0,0).length).toBeLessThan(blockers.length/10);
  });

  it("hq exposes a defined command observation radius", () => {
    const v = new Vision();
    v.update([unit(1, 0, 0, 0, "hq")]);
    expect(v.getVisionRadius(unit(1,0,0,0,"hq"))).toBeGreaterThanOrEqual(48);
    expect(v.isVisible(0, 0, 0)).toBe(true);
    expect(v.isVisible(0, 55, 0)).toBe(false);
  });
});

import type { World } from "../World";
import type { Entity, Team } from "../types";
import { pointInFeature } from "../mapFeatures";
import { heightAt } from "../heightmap";

const SIZE_DETECT: Record<string, number> = {
  small: -8,
  medium: 0,
  large: 10,
  very_large: 18,
};

const OPTICS_MUL: Record<string, number> = {
  poor: 0.75,
  normal: 1,
  good: 1.2,
  very_good: 1.45,
  exceptional: 1.75,
};

/** Phase 76: tactical cover score at a point. Sandbags/crates/tents give light cover; walls/buildings are hard cover. */
export function coverValueAt(w: World, x: number, z: number): number {
  let value = 0;
  for (const f of w.mapFeatures) {
    if (!pointInFeature(x, z, f, 0.25)) continue;
    if(f.appearance==="forest")value=Math.max(value,24);
    else if (f.kind === "cover" && f.appearance!=="field" && f.appearance!=="yard") value = Math.max(value, (f.height ?? 1.5) >= 2 ? 22 : 16);
    else if (f.kind === "wall" || f.kind === "chokepoint") value = Math.max(value, 28);
    else if (f.kind === "building") value = Math.max(value, 34);
  }
  return value;
}

/** Extra terrain ridge check used by sensors; Vision already performs the main reveal grid calculation. */
export function terrainLineOfSight(a: Entity, b: Entity): boolean {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
  if (d < 5) return true;
  const ay = a.y + Math.max(1.2, a.def.height * 0.7);
  const by = b.y + Math.max(1.2, b.def.height * 0.65);
  const steps = Math.max(2, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a.x + dx * t, z = a.z + dz * t;
    if (heightAt(x, z) + 0.9 > ay + (by - ay) * t) return false;
  }
  return true;
}

/**
 * Wargame-style detection: does observer spot target right now?
 * Score uses optics, stealth, size, distance, movement, cover (forest features).
 */
export function detectionScore(observer: Entity, target: Entity, coverPenalty = 0): number {
  const optics = observer.def.optics ?? "normal";
  const baseRange = (observer.def.opticsRange ?? 40) * (OPTICS_MUL[optics] ?? 1);
  // Radar buildings / radar units get bonus vs air
  let range = baseRange;
  if (observer.kind === "radar") {
    const level = observer.buildingLevel ?? 1;
    const levelMul = level >= 3 ? 1.35 : level >= 2 ? 1.15 : 1;
    range = target.def.armor==="air"?Math.max(range,110*levelMul):28;
  }
  if (target.def.armor === "air" || target.def.category === "heli" || target.def.category === "air") {
    if (observer.kind === "radar" || observer.kind === "aa" || observer.def.weapon === "missile") range *= 1.35;
  }

  const dist = Math.hypot(target.x - observer.x, target.z - observer.z);
  if (dist > range * 1.15) return -999;

  const stealth = target.def.stealthLevel ?? (target.def.stealth ? 2 : 0);
  const size = SIZE_DETECT[target.def.size ?? "medium"] ?? 0;
  const moving = (target.motionSpeed??0)>.2 ? 12 : 0;
  // Distance falloff 0..100 inside range
  const proximity = (1 - dist / Math.max(range, 1)) * 100;
  const score = proximity + size + moving - stealth * 8 - coverPenalty;
  return score;
}

export function canSpot(observer: Entity, target: Entity, coverPenalty = 0): boolean {
  if (observer.dead || target.dead || observer.team === target.team) return false;
  if (observer.underConstruction) return false;
  return detectionScore(observer, target, coverPenalty) >= 22;
}

/** How long a spot lasts once achieved (seconds). */
export const SPOT_DURATION = 8;
export const SPOT_DURATION_RADAR = 14;

/**
 * Update spottedUntil for all entities. Throttled by caller.
 * Also refreshes intel contacts with last-known positions.
 */
export function updateSensors(w: World): void {
  const now = w.time;
  // Decay is implicit via timestamps

  for (const observer of w.entities) {
    if(observer.def.armor==="air"&&["grounded","rearming","taxi","landing"].includes(observer.airState??""))continue;
    if (observer.dead || observer.underConstruction || observer.loadedIntoId!=null || (observer.disabledUntil??0)>w.time) continue;
    if (observer.def.speed === 0 && observer.kind !== "radar" && observer.kind !== "bunker" && observer.kind !== "aa" && observer.kind !== "hq") {
      // Most buildings don't spot except radar/bunker/aa/hq
      if (!["radar", "bunker", "aa", "hq"].includes(observer.kind)) continue;
    }

    const team = observer.team as Team;
    const range = observer.kind==="radar" ? Math.max(observer.def.opticsRange??40,110*(1+((observer.buildingLevel??1)-1)*.175))*1.35 : (observer.def.opticsRange??40)*(OPTICS_MUL[observer.def.optics??"normal"]??1)*1.35;

    w.spatial.queryRadius(observer.x, observer.z, range, (target) => {
      if (target.dead || target.loadedIntoId!=null || target.team === team) return;
      if (!w.vision.hasLineOfSight(observer, target)) return;
      const forest=w.vision.forestDepth(observer,target);
      const cover=coverValueAt(w,target.x,target.z)+forest*.35;
      const close=Math.hypot(target.x-observer.x,target.z-observer.z)<7;
      const signature=target.lastCombatTime>0&&now-target.lastCombatTime<3?26:0;
      if(!close&&!canSpot(observer,target,cover-signature))return;
      const radarLevel = observer.kind === "radar" ? (observer.buildingLevel ?? 1) : 1;
      const dur = observer.kind === "radar" ? SPOT_DURATION_RADAR * (radarLevel >= 3 ? 1.45 : radarLevel >= 2 ? 1.2 : 1) : SPOT_DURATION;
      const until = now + dur;
      if (until > target.spottedUntil[team]) target.spottedUntil[team] = until;

      // Refresh intel contact
      w.intel[team].set(target.id, {
        entityId: target.id,
        team: target.team,
        kind: target.kind,
        x: target.x,
        z: target.z,
        lastSeen: now,
        shared: true,
      });
    });
  }

  // Expire old intel
  for (const team of [0, 1] as const) {
    for (const [id, c] of w.intel[team]) {
      if (now - c.lastSeen > 90) w.intel[team].delete(id);
    }
  }
}

/** Is this entity currently spotted by team? */
export function isSpottedBy(target: Entity, team: Team, now: number): boolean {
  return (target.spottedUntil[team] ?? 0) > now;
}

import type { World } from "../World";
import type { Entity, Team } from "../types";

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

/**
 * Wargame-style detection: does observer spot target right now?
 * Score uses optics, stealth, size, distance, movement, cover (forest features).
 */
export function detectionScore(observer: Entity, target: Entity, coverPenalty = 0): number {
  const optics = observer.def.optics ?? "normal";
  const baseRange = (observer.def.opticsRange ?? 40) * (OPTICS_MUL[optics] ?? 1);
  // Radar buildings / radar units get bonus vs air
  let range = baseRange;
  if (observer.kind === "radar" || observer.def.category === "building" && observer.kind === "radar") {
    range = Math.max(range, 110);
  }
  if (target.def.armor === "air" || target.def.category === "heli" || target.def.category === "air") {
    if (observer.kind === "radar" || observer.kind === "aa" || observer.def.weapon === "missile") range *= 1.35;
  }

  const dist = Math.hypot(target.x - observer.x, target.z - observer.z);
  if (dist > range * 1.15) return -999;

  const stealth = target.def.stealthLevel ?? (target.def.stealth ? 2 : 0);
  const size = SIZE_DETECT[target.def.size ?? "medium"] ?? 0;
  const moving = target.mode !== "idle" && target.mode !== "hold" && target.def.speed > 0 ? 6 : 0;
  // Distance falloff 0..100 inside range
  const proximity = (1 - dist / Math.max(range, 1)) * 100;
  const score = proximity + size + moving - stealth * 18 - coverPenalty;
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
    if (observer.dead || observer.underConstruction) continue;
    if (observer.def.speed === 0 && observer.kind !== "radar" && observer.kind !== "bunker" && observer.kind !== "aa" && observer.kind !== "hq") {
      // Most buildings don't spot except radar/bunker/aa/hq
      if (!["radar", "bunker", "aa", "hq"].includes(observer.kind)) continue;
    }

    const team = observer.team as Team;
    const range = (observer.def.opticsRange ?? 40) * 1.2;

    w.spatial.queryRadius(observer.x, observer.z, range, (target) => {
      if (target.dead || target.team === team) return;
      if (!canSpot(observer, target)) return;
      const dur = observer.kind === "radar" ? SPOT_DURATION_RADAR : SPOT_DURATION;
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

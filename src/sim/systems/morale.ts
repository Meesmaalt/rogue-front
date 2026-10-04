import type { World } from "../World";
import type { Entity } from "../types";
import { FACTIONS } from "../factions";

export type MoraleState = "steady" | "shaken" | "pinned" | "routing";

export function moraleState(u: Entity): MoraleState {
  const m = u.morale ?? 100;
  const s = u.suppression ?? 0;
  if (m < 18 || s > 85) return "routing";
  if (m < 40 || s > 60) return "pinned";
  if (m < 65 || s > 35) return "shaken";
  return "steady";
}

/**
 * Decay suppression, slowly recover morale when safe / in supply.
 * Routing units seek friendly supply or HQ.
 */
export function updateMorale(w: World, dt: number): void {
  for (const u of w.entities) {
    if (u.dead || u.def.speed === 0) continue;

    // Suppression decays
    if ((u.suppression ?? 0) > 0) {
      const decay = (u.def.discipline === "high" ? 18 : u.def.discipline === "low" ? 10 : 14) * dt;
      u.suppression = Math.max(0, (u.suppression ?? 0) - decay);
    }

    // Morale recovery when not suppressed and near supply/HQ
    const st = moraleState(u);
    if (st !== "routing" && (u.suppression ?? 0) < 20) {
      const fac = u.team === w.playerTeam ? w.playerFaction : w.enemyFaction;
      let regen = 2.5 * dt * (FACTIONS[fac].bonuses.moraleMul ?? 1);
      if (u.def.discipline === "high") regen *= 1.3;
      // Near own supply or HQ
      for (const b of w.entities) {
        if (b.dead || b.team !== u.team) continue;
        if (b.kind === "hq" || b.kind === "supply" || b.kind === "barracks") {
          if (Math.hypot(b.x - u.x, b.z - u.z) < 40) {
            regen *= 1.8;
            break;
          }
        }
      }
      // Out of tactical supply decays morale slowly
      if ((u.supply ?? 100) < 15) regen *= 0.25;
      u.morale = Math.min(100, (u.morale ?? 100) + regen);
    }

    // Routing behaviour: run toward HQ / supply
    if (st === "routing" && u.mode !== "transport-load" && u.mode !== "build") {
      const hq = w.hq[u.team];
      let dest = hq && !hq.dead ? { x: hq.x, z: hq.z } : null;
      let best = dest ? Math.hypot((hq?.x ?? 0) - u.x, (hq?.z ?? 0) - u.z) : 9999;
      for (const b of w.entities) {
        if (b.dead || b.team !== u.team || b.kind !== "supply") continue;
        const d = Math.hypot(b.x - u.x, b.z - u.z);
        if (d < best) { best = d; dest = { x: b.x, z: b.z }; }
      }
      if (dest) {
        u.mode = "move";
        u.dest = dest;
        u.target = null;
        u.holdPosition = false;
      }
      // Rally if morale recovers
      if ((u.morale ?? 0) > 35 && (u.suppression ?? 0) < 40) {
        u.morale = Math.min(55, (u.morale ?? 0) + 5 * dt);
      }
    }
  }
}

export function moraleSpeedMul(u: Entity): number {
  const st = moraleState(u);
  if (st === "routing") return 1.15; // flee faster
  if (st === "pinned") return 0.45;
  if (st === "shaken") return 0.8;
  return 1;
}

export function moraleAccuracyMul(u: Entity): number {
  const st = moraleState(u);
  if (st === "routing") return 0.15;
  if (st === "pinned") return 0.45;
  if (st === "shaken") return 0.75;
  return 1;
}

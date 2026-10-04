import type { World } from "../World";
import type { Entity, Point, Team } from "../types";

/** Approximate AA threat radius by kind. */
export function aaThreatRadius(e: Entity): number {
  if (e.kind === "aa") return Math.max(38, e.def.range * 0.95);
  if (e.kind === "spaa" || e.kind === "manpad") return e.def.range;
  if (e.kind === "destroyer") return Math.max(40, e.def.range * 0.85);
  if (e.kind === "fighter" || e.kind === "interceptor") return e.def.range * 0.7;
  return 0;
}

/** Strongest enemy AA threat near a point (0 = safe). */
export function aaThreatAt(w: World, team: Team, x: number, z: number): number {
  let threat = 0;
  for (const e of w.entities) {
    if (e.dead || e.team === team || e.underConstruction || !w.isSpottedByTeam(e,team)) continue;
    const r = aaThreatRadius(e);
    if (r <= 0) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < r) threat = Math.max(threat, 1 - d / r);
  }
  return threat;
}

export function assignAirMission(
  u: Entity,
  mission: "cap" | "strike" | "sead" | "ground",
  point?: Point | null,
): void {
  u.airMission = mission;
  u.airMissionPoint = point ? { x: point.x, z: point.z } : null;
  if (u.airState === "grounded") {
    u.airState = "taxi";
  }
  if (mission === "cap") {
    u.mode = "patrol";
    if (point) {
      u.patrolPoints = [
        { x: point.x + 18, z: point.z },
        { x: point.x, z: point.z + 18 },
        { x: point.x - 18, z: point.z },
        { x: point.x, z: point.z - 18 },
      ];
      u.patrolIndex = 0;
      u.dest = u.patrolPoints[0];
    }
  } else if (mission === "sead" || mission === "strike" || mission === "ground") {
    u.mode = "amove";
    u.dest = point ? { x: point.x, z: point.z } : null;
    u.priorityFocus = mission === "sead" ? "aa" : mission === "strike" ? "generator" : null;
  }
}

/**
 * Per-tick air logic: RTB on fuel/ammo, SEAD target priority, avoid AA when CAP.
 */
export function updateAirDoctrine(w: World, u: Entity, dt: number): void {
  if (u.def.armor !== "air" && u.def.category !== "heli") return;
  if (u.dead || u.airState === "returning" || u.airState === "rearming") return;
  u.airSortieCount = u.airSortieCount ?? 0;
  u.airThreat = u.airThreat ?? 0;
  u.airWeaponCooldown = Math.max(0, (u.airWeaponCooldown ?? 0) - dt);

  const mission = u.airMission ?? (u.kind === "fighter" || u.kind === "interceptor" ? "cap" : "ground");
  const threat = aaThreatAt(w, u.team, u.x, u.z);
  u.airThreat = threat;
  if (threat > 0.78 && mission !== "sead" && u.airState === "airborne") {
    u.airState = "returning";
    u.airReturnReason = "damage";
    const home = u.airMissionHomeId ? w.byId.get(u.airMissionHomeId) : null;
    if (home) { u.dest = {x: home.x, z: home.z}; u.mode = "move"; }
  }

  // SEAD: actively hunt AA
  if (mission === "sead" && (!u.target || u.target.dead || u.target.kind !== "aa")) {
    let best: Entity | null = null;
    let bestD = 1e9;
    for (const e of w.entities) {
      if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team) || e.kind !== "aa") continue;
      const d = Math.hypot(e.x - u.x, e.z - u.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      u.target = best;
      u.dest = { x: best.x, z: best.z };
      u.mode = "attack";
    }
  }

  // Strike: prefer generators, supply, production
  if (mission === "strike" && (!u.target || u.target.dead)) {
    const prio = ["supply", "generator", "factory", "helipad", "airbase", "barracks", "hq"];
    let best: Entity | null = null;
    let bestScore = 1e9;
    for (const e of w.entities) {
      if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team) || e.def.speed > 0) continue;
      const pi = prio.indexOf(e.kind);
      if (pi < 0) continue;
      const d = Math.hypot(e.x - u.x, e.z - u.z);
      const score = d + pi * 15;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) {
      u.target = best;
      u.dest = { x: best.x, z: best.z };
      u.mode = "attack";
    }
  }

  // CAP: engage enemy air only
  if (mission === "cap") {
    if (u.target && u.target.def.armor !== "air" && u.target.def.category !== "heli") {
      u.target = null;
    }
    if (!u.target || u.target.dead) {
      let best: Entity | null = null;
      let bestD = 1e9;
      for (const e of w.entities) {
        if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team)) continue;
        if (e.def.armor !== "air" && e.def.category !== "heli") continue;
        const d = Math.hypot(e.x - u.x, e.z - u.z);
        if (d < Math.max(u.aggro, u.def.range + 20) && d < bestD) {
          bestD = d; best = e;
        }
      }
      if (best) {
        u.target = best;
        u.mode = "attack";
      }
    }
  }

  // Soft AA avoidance for non-SEAD helis (steer away)
  if (mission !== "sead" && (u.kind === "heli" || u.kind === "gunship" || u.kind === "transport")) {
    const threat = aaThreatAt(w, u.team, u.x, u.z);
    if (threat > 0.55 && u.airState !== "returning") {
      // Nudge destination away from nearest AA
      let nx = 0, nz = 0;
      for (const e of w.entities) {
        if (e.dead || e.team === u.team || !w.isSpottedByTeam(e,u.team) || e.kind !== "aa") continue;
        const d = Math.hypot(e.x - u.x, e.z - u.z) || 1;
        if (d < aaThreatRadius(e)) {
          nx += (u.x - e.x) / d;
          nz += (u.z - e.z) / d;
        }
      }
      if (nx || nz) {
        const m = Math.hypot(nx, nz) || 1;
        u.dest = { x: u.x + (nx / m) * 28, z: u.z + (nz / m) * 28 };
        u.mode = "move";
      }
    }
  }
}

import type { World } from "../World";
import type { Entity, Point } from "../types";
import { heightAt } from "../heightmap";
import { dist2d, turnToward, wrapAngle } from "../math";
import { fireProjectile } from "./combat";
import { findPath } from "../nav/Pathfinder";

export function nearestEnemy(w: World, u: Entity, range: number): Entity | null {
  let best: Entity | null = null, bd = range;
  for (const e of w.entities) {
    if (e.dead || e.team === u.team || !w.vision.isVisible(u.team, e.x, e.z)) continue;
    if (e.def.armor === "air" && u.def.weapon !== "missile") continue;
    const d = dist2d(u, e) - e.def.radius;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function updateUnits(w: World, dt: number): void {
  for (const u of w.entities) if (!u.dead) stepUnit(w, u, dt);
}

function stepUnit(w: World, u: Entity, dt: number): void {
  const d = u.def;
  const effectiveRange = d.range * (u.upgrades.has("range") ? 1.2 : 1);
  u.cooldown = Math.max(0, u.cooldown - dt);
  if (!d.damage && d.speed === 0) return;

  // sihtmärgi valik
  if (u.mode === "attack" && (!u.target || u.target.dead)) { u.target = null; u.mode = "idle"; }
  if (u.mode !== "attack") {
    const lim = u.mode === "move" ? effectiveRange : Math.max(effectiveRange, u.aggro);
    if (!u.target || u.target.dead || dist2d(u, u.target) - u.target.def.radius > lim * 1.15) u.target = nearestEnemy(w, u, lim);
  }
  const t = u.target;
  if (t && !w.vision.isVisible(u.team, t.x, t.z)) {
    u.target = null;
    if (u.mode === "attack") u.mode = "idle";
  }
  if (u.mode === "patrol" && u.dest && Math.hypot(u.x-u.dest.x,u.z-u.dest.z) < 3) {
    u.patrolIndex = (u.patrolIndex + 1) % u.patrolPoints.length; u.dest = u.patrolPoints[u.patrolIndex]; u.navPath = []; u.navPathIndex = 0;
  }
  const target = u.target;
  const inRange = !!target && dist2d(u, target) - target.def.radius <= effectiveRange * 0.92;
  let goal: Point | null = null;
  if (target && u.mode !== "move") {
    if (!inRange) {
      goal = target;
      if (u.navPath.length === 0) { u.navPath = findPath(w.nav, u, target, u.def.radius); u.navPathIndex = 1; }
    }
  } else if (u.mode === "move" || u.mode === "amove") goal = u.dest;

  // liikumine
  if (d.speed > 0) {
    const isAir = d.armor === "air";
    let sx = 0, sz = 0;
    for (const o of w.entities) {
      if (o === u || o.dead) continue;
      const ox = u.x - o.x, oz = u.z - o.z, m = d.radius + o.def.radius + 0.6, d2 = ox * ox + oz * oz;
      if (d2 < m * m && d2 > 1e-4) {
        const dd = Math.sqrt(d2), k = ((m - dd) / m) * (o.def.speed === 0 ? 3 : 1);
        sx += (ox / dd) * k; sz += (oz / dd) * k;
      }
    }
    let dx = 0, dz = 0, moving = false;
    if (goal) {
      const gx = goal.x - u.x, gz = goal.z - u.z, gd = Math.hypot(gx, gz);
      if (goal === u.dest && gd < 2.5) { u.mode = "idle"; u.dest = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; }
      else { dx = gx / gd; dz = gz / gd; moving = true; }
    }
    if (moving) {
      let navDx = dx, navDz = dz;
      if (u.navPath.length && u.mode !== "amove") {
        while (u.navPathIndex < u.navPath.length && Math.hypot(u.x - u.navPath[u.navPathIndex].x, u.z - u.navPath[u.navPathIndex].z) < 2.2) u.navPathIndex++;
        if (u.navPathIndex < u.navPath.length) { const p = u.navPath[u.navPathIndex], m = Math.hypot(p.x-u.x,p.z-u.z)||1; navDx=(p.x-u.x)/m; navDz=(p.z-u.z)/m; }
      } else if (u.flowField) {
        const f = u.flowField.directionAt(u, u.def.radius);
        if (f) { navDx=f.x; navDz=f.z; }
      }
      let ex = navDx + sx * 1.2, ez = navDz + sz * 1.2;
      const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l;
      const want = Math.atan2(ex, ez);
      u.heading = turnToward(u.heading, want, d.turnRate * dt);
      const diff = Math.abs(wrapAngle(want - u.heading));
      const slope = (heightAt(u.x + ex * 2, u.z + ez * 2) - u.y) / 2;
      const sp = d.speed * Math.min(1.3, Math.max(0.35, 1 - slope * 1.2)) * Math.max(0.15, Math.cos(Math.min(diff, 1.5)));
      u.x += Math.sin(u.heading) * sp * dt; u.z += Math.cos(u.heading) * sp * dt;
    } else if (sx || sz) {
      u.x += sx * d.speed * 0.4 * dt; u.z += sz * d.speed * 0.4 * dt;
    }
    u.x = Math.max(-190, Math.min(190, u.x)); u.z = Math.max(-190, Math.min(190, u.z));
    u.y = isAir ? 10 + Math.sin(w.time * 1.7 + u.id) * 1.5 : heightAt(u.x, u.z);
    const moved = Math.hypot(u.x - u.stuckX, u.z - u.stuckZ);
    if (moving && moved < 0.15 * dt) u.stuckTime += dt;
    else if (moved > 0.5) { u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z; }
    if (u.stuckTime > 0.8 && goal && !isAir) {
      u.navPath = findPath(w.nav, u, goal, u.def.radius); u.navPathIndex = 1;
      u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
    }
  }

  // torn ja tuli
  let aligned = true;
  if (d.turret) {
    const want = target ? Math.atan2(target.x - u.x, target.z - u.z) - u.heading : 0;
    u.turretYaw = turnToward(u.turretYaw, wrapAngle(want), 3 * dt);
    aligned = !target || Math.abs(wrapAngle(want - u.turretYaw)) < 0.12;
  }
  if (target && aligned && u.cooldown === 0 && d.damage && dist2d(u, target) - target.def.radius <= effectiveRange) {
    const a = u.heading + (d.turret ? u.turretYaw : 0), m = u.kind === "tank" ? 3.6 : 1;
    fireProjectile(w, u, target, u.x + Math.sin(a) * m, u.y + (u.kind === "inf" ? 1 : 2.4), u.z + Math.cos(a) * m);
    u.cooldown = d.cooldown * (0.9 + w.rng() * 0.2);
  }
}

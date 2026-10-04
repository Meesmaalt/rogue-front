import type { World } from "../World";
import { heightAt } from "../heightmap";
import { damage } from "./combat";

export function updateProjectiles(w: World, dt: number): void {
  const ps = w.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.tz = p.target.z; }
    const ty = heightAt(p.tx, p.tz) + (p.target ? p.target.def.height * 0.45 : 0.25);
    const dx = p.tx - p.x, dy = ty - p.y, dz = p.tz - p.z;
    const d = Math.hypot(dx, dy, dz);
    const step = p.speed * dt;

    const ballistic = p.speed < 100 || p.weapon === "cannon" && (p.splash ?? 0) >= 6;
    if (d <= step + 0.35 || d < 0.4) {
      const hitOpts = { weapon: p.weapon, fromX: p.x, fromZ: p.z, sourceId: p.sourceId };
      if (p.target && !p.target.dead) {
        const pp = p as typeof p & { hitChance?: number; penetration?: number; impactDamage?: number };
        const chance = pp.hitChance ?? 1;
        if (w.rng() <= chance) {
          const face = pp.face ?? "front";
          const armor = face === "front" ? (p.target.def.armorFront ?? 8) : face === "rear" ? (p.target.def.armorRear ?? 4) : (p.target.def.armorSide ?? 6);
          const pen = pp.penetration ?? 0;
          const ratio = pen / Math.max(1, armor);
          const penMul = p.weapon === "bullet" ? Math.max(0.12, ratio >= 1 ? 0.85 + ratio * 0.05 : 0.45 * ratio) : Math.max(0.18, Math.min(1.45, 0.55 + ratio * 0.58));
          damage(w, p.target, (pp.impactDamage ?? p.damage) * penMul, hitOpts);
        } else {
          p.target.suppression = Math.min(100, (p.target.suppression ?? 0) + 2.5 + (p.weapon === "missile" ? 2 : 0));
        }
      } else {
        // Area-fire shells suppress and damage everything inside the impact ellipse.
        for (const e of w.entities) {
          if (e.dead || e.team === p.team) continue;
          const d2 = Math.hypot(e.x - p.tx, e.z - p.tz);
          if (d2 <= (p.splash ?? 0) + e.def.radius * 0.5) {
            damage(w, e, p.damage * Math.max(0.2, 1 - d2 / Math.max(1, (p.splash ?? 1) * 1.5)), hitOpts);
          }
        }
      }
      const shooter = w.byId.get(p.sourceId);
      if (shooter && p.target?.dead) {
        shooter.xp += 1;
        shooter.veteran = Math.min(5, Math.floor(shooter.xp / 2));
        // Small morale boost for a kill
        shooter.morale = Math.min(100, (shooter.morale ?? 100) + 4);
      }
      ps.splice(i, 1);
    } else {
      let vx = (dx / d) * p.speed;
      let vy = (dy / d) * p.speed;
      let vz = (dz / d) * p.speed;
      if (ballistic && d > 8) {
        const loft = Math.sin(Math.min(1, (Math.hypot(dx, dz) / Math.max(p.speed * 1.2, 1)) * Math.PI)) * Math.min(12, Math.hypot(dx, dz) * 0.08);
        vy += loft * 0.35;
      }
      p.vx = vx; p.vy = vy; p.vz = vz;
      p.x += vx * dt;
      p.y += vy * dt;
      p.z += vz * dt;
      const floor = heightAt(p.x, p.z) + 0.15;
      if (p.y < floor) p.y = floor;
    }
  }
}

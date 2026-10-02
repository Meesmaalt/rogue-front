import type { World } from "../World";
import { heightAt } from "../heightmap";
import { damage } from "./combat";

export function updateProjectiles(w: World, dt: number): void {
  const ps = w.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.tz = p.target.z; }
    const ty = heightAt(p.tx, p.tz) + (p.target ? p.target.def.height * 0.5 : 0.2);
    const dx = p.tx - p.x, dy = ty - p.y, dz = p.tz - p.z;
    const d = Math.hypot(dx, dy, dz), step = p.speed * dt;
    if (d <= step + 0.6) {
      if (p.target) damage(w, p.target, p.damage);
      if ((p.splash ?? 0) > 0) {
        for (const e of w.entities) {
          if (e.dead || e === p.target || e.team === p.team) continue;
          const d2 = Math.hypot(e.x - p.tx, e.z - p.tz);
          if (d2 <= (p.splash ?? 0)) damage(w, e, p.damage * Math.max(0.25, 1 - d2 / ((p.splash ?? 0) * 1.4)));
        }
      }
      const shooter = w.byId.get(p.sourceId);
      if (shooter && p.target?.dead) { shooter.xp += 1; shooter.veteran = Math.min(5, Math.floor(shooter.xp / 2)); }
      ps.splice(i, 1);
    } else {
      p.vx = (dx / d) * p.speed; p.vy = (dy / d) * p.speed; p.vz = (dz / d) * p.speed;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
  }
}

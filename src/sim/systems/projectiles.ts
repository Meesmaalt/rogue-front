import type { World } from "../World";
import { heightAt } from "../heightmap";
import { damage } from "./combat";

export function updateProjectiles(w: World, dt: number): void {
  const ps = w.projectiles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    if (!p.target.dead) { p.tx = p.target.x; p.tz = p.target.z; }
    const ty = heightAt(p.tx, p.tz) + p.target.def.height * 0.5;
    const dx = p.tx - p.x, dy = ty - p.y, dz = p.tz - p.z;
    const d = Math.hypot(dx, dy, dz), step = p.speed * dt;
    if (d <= step + 0.6) {
      damage(w, p.target, p.damage);
      const shooter = w.byId.get(p.sourceId);
      if (shooter && p.target.dead) { shooter.xp += 1; shooter.veteran = Math.min(5, Math.floor(shooter.xp / 2)); }
      ps.splice(i, 1);
    } else {
      p.vx = (dx / d) * p.speed; p.vy = (dy / d) * p.speed; p.vz = (dz / d) * p.speed;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
  }
}

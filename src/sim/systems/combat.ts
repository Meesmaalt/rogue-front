import raw from "../../data/damage.json";
import type { World } from "../World";
import type { Entity } from "../types";

export type DamageWeapon = keyof typeof raw;
const MATRIX = raw as Record<string, Record<string, number>>;

export function fireProjectile(w: World, u: Entity, t: Entity, x: number, y: number, z: number): void {
  const base = u.def.damage * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  const mult = MATRIX[u.def.weapon]?.[t.def.armor] ?? 1;
  w.projectiles.push({ id: w.nextId++, team: u.team, x, y, z, vx: 0, vy: 0, vz: 0, tx: t.x, tz: t.z, target: t, sourceId: u.id, damage: base * mult, speed: u.def.projectileSpeed });
  w.events.push({ type: "fire", team: u.team, x, y, z });
}

export function damage(w: World, t: Entity, amount: number): void {
  if (t.dead) return;
  t.hp -= amount;
  w.events.push({ type: "hit", x: t.x, y: t.y + t.def.height * 0.6, z: t.z });
  if (t.hp <= 0) {
    t.dead = true;
    w.events.push({ type: "death", x: t.x, y: t.y + t.def.height * 0.5, z: t.z, big: t.def.speed === 0 });
  }
}

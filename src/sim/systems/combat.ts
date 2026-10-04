import raw from "../../data/damage.json";
import type { World } from "../World";
import type { Entity } from "../types";

export type DamageWeapon = keyof typeof raw;
const MATRIX = raw as Record<string, Record<string, number>>;

export function fireProjectile(w: World, u: Entity, t: Entity, x: number, y: number, z: number): void {
  const base = u.def.damage * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  const mult = MATRIX[u.def.weapon]?.[t.def.armor] ?? 1;
  // Lead moving targets slightly
  let tx = t.x, tz = t.z;
  if (t.def.speed > 0 && u.def.projectileSpeed > 0) {
    const dist = Math.hypot(t.x - u.x, t.z - u.z);
    const eta = dist / u.def.projectileSpeed;
    // crude velocity from heading
    const spd = t.def.speed * (t.mode === "idle" || t.mode === "hold" ? 0 : 0.55);
    tx = t.x + Math.sin(t.heading) * spd * eta;
    tz = t.z + Math.cos(t.heading) * spd * eta;
  }
  w.projectiles.push({
    id: w.nextId++, team: u.team, x, y, z, vx: 0, vy: 0, vz: 0,
    tx, tz, target: t, sourceId: u.id,
    damage: base * mult,
    speed: u.def.projectileSpeed,
    splash: u.def.splash ?? 0,
  });
  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - 1);
  w.events.push({ type: "fire", team: u.team, x, y, z, sourceId: u.id });
}

export function damage(w: World, t: Entity, amount: number): void {
  if (t.def.speed === 0 && t.kind !== "bunker" && t.kind !== "aa" && t.kind !== "hq" && amount < 10) amount *= 0.55;
  if (t.dead) return;
  t.hp -= amount;
  w.events.push({ type: "hit", x: t.x, y: t.y + t.def.height * 0.6, z: t.z });
  if (t.hp <= 0) {
    t.dead = true;
    w.events.push({ type: "death", x: t.x, y: t.y + t.def.height * 0.5, z: t.z, big: t.def.speed === 0, kind: t.kind });
  }
}

export function fireGroundProjectile(w: World, u: Entity, x: number, z: number): void {
  const base = u.def.damage * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  w.projectiles.push({
    id: w.nextId++, team: u.team, x: u.x, y: u.y + 2.2, z: u.z,
    vx: 0, vy: 0, vz: 0, tx: x, tz: z, target: null, sourceId: u.id,
    damage: base, speed: u.def.projectileSpeed * 0.85, splash: u.def.splash ?? 8,
  });
  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - 1);
  w.events.push({ type: "fire", team: u.team, x: u.x, y: u.y + 2.2, z: u.z, sourceId: u.id });
}

import raw from "../../data/damage.json";
import type { World } from "../World";
import type { Entity } from "../types";
import { wrapAngle } from "../math";

export type DamageWeapon = keyof typeof raw;
const MATRIX = raw as Record<string, Record<string, number>>;

/** Which face of target is hit from shooter position. */
export type ArmorFace = "front" | "side" | "rear";

export function hitFace(shooterX: number, shooterZ: number, target: Entity): ArmorFace {
  const toShooter = Math.atan2(shooterX - target.x, shooterZ - target.z);
  const rel = Math.abs(wrapAngle(toShooter - target.heading));
  // front: within ~55°, rear: within ~55° of back, else side
  if (rel <= 0.95) return "front";
  if (rel >= Math.PI - 0.95) return "rear";
  return "side";
}

export function armorValue(target: Entity, face: ArmorFace): number {
  const d = target.def;
  if (face === "front") return d.armorFront ?? 8;
  if (face === "rear") return d.armorRear ?? 4;
  return d.armorSide ?? 6;
}

/** KE (cannon) vs HEAT-ish (missile) vs HE/SA (bullet) penetration feel. */
function penFactor(weapon: string, armor: number, face: ArmorFace): number {
  // Higher armor reduces damage; rear is already lower armor value
  const soft = Math.max(0.2, 1 - armor / 28);
  if (weapon === "missile") {
    // HEAT less sensitive to raw thickness, still hates extreme front
    return 0.55 + soft * 0.55;
  }
  if (weapon === "cannon") {
    return 0.4 + soft * 0.7;
  }
  // bullets / HE – soft targets, suppressed by armor
  return 0.35 + soft * 0.5;
}

function faceMult(face: ArmorFace): number {
  if (face === "rear") return 1.55;
  if (face === "side") return 1.22;
  return 1.0;
}

function heSuppression(weapon: string, damage: number): number {
  if (weapon === "bullet") return damage * 0.85;
  if (weapon === "cannon") return damage * 0.35;
  if (weapon === "missile") return damage * 0.25;
  return damage * 0.4;
}

export function fireProjectile(w: World, u: Entity, t: Entity, x: number, y: number, z: number): void {
  const base = u.def.damage * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  const classMult = MATRIX[u.def.weapon]?.[t.def.armor] ?? 1;
  const face = hitFace(u.x, u.z, t);
  const arm = armorValue(t, face);
  const pen = penFactor(u.def.weapon, arm, face);
  const fMult = faceMult(face);

  // Accuracy: suppression + movement + partial stabilizer
  let accuracy = 1;
  const sup = u.suppression ?? 0;
  accuracy *= Math.max(0.35, 1 - sup / 120);
  if (u.mode === "move" || u.mode === "amove") {
    const stab = u.def.stabilizer ?? (u.def.turret ? "full" : "none");
    if (stab === "none") accuracy *= 0.35;
    else if (stab === "partial") accuracy *= 0.7;
  }
  if (t.mode !== "idle" && t.mode !== "hold" && t.def.speed > 0) accuracy *= 0.85;
  // Discipline / morale of shooter
  const morale = u.morale ?? 100;
  accuracy *= 0.7 + (morale / 100) * 0.3;

  const dealt = base * classMult * pen * fMult * accuracy;

  let tx = t.x, tz = t.z;
  if (t.def.speed > 0 && u.def.projectileSpeed > 0) {
    const dist = Math.hypot(t.x - u.x, t.z - u.z);
    const eta = dist / Math.max(1, u.def.projectileSpeed);
    const spd = t.def.speed * (t.mode === "idle" || t.mode === "hold" ? 0 : 0.55);
    tx = t.x + Math.sin(t.heading) * spd * eta;
    tz = t.z + Math.cos(t.heading) * spd * eta;
  }

  w.projectiles.push({
    id: w.nextId++, team: u.team, x, y, z, vx: 0, vy: 0, vz: 0,
    tx, tz, target: t, sourceId: u.id,
    damage: dealt,
    speed: u.def.projectileSpeed,
    splash: u.def.splash ?? 0,
    // carry meta for impact suppression
    weapon: u.def.weapon,
    face,
  } as typeof w.projectiles[0] & { weapon?: string; face?: ArmorFace });

  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - 1);
  w.events.push({ type: "fire", team: u.team, x, y, z, sourceId: u.id });
}

export function damage(w: World, t: Entity, amount: number, opts?: {
  weapon?: string;
  fromX?: number;
  fromZ?: number;
  sourceId?: number;
}): void {
  if (t.dead) return;
  if (t.def.speed === 0 && t.kind !== "bunker" && t.kind !== "aa" && t.kind !== "hq" && amount < 10) amount *= 0.55;

  t.hp -= amount;

  // Suppression (Wargame stress)
  const wpn = opts?.weapon ?? "bullet";
  const supAdd = heSuppression(wpn, amount);
  t.suppression = Math.min(100, (t.suppression ?? 0) + supAdd);

  // Moraal hit – rear shots and high damage sting more
  let moraleHit = amount * 0.15;
  if (opts?.fromX != null && opts?.fromZ != null) {
    const face = hitFace(opts.fromX, opts.fromZ, t);
    if (face === "rear") moraleHit *= 1.8;
    else if (face === "side") moraleHit *= 1.25;
  }
  if (t.def.discipline === "high") moraleHit *= 0.65;
  else if (t.def.discipline === "low") moraleHit *= 1.35;
  t.morale = Math.max(0, (t.morale ?? 100) - moraleHit);

  w.events.push({ type: "hit", x: t.x, y: t.y + t.def.height * 0.6, z: t.z });
  if (t.hp <= 0) {
    t.dead = true;
    // Nearby friendlies take morale shock
    for (const e of w.entities) {
      if (e.dead || e.team !== t.team || e === t) continue;
      const d = Math.hypot(e.x - t.x, e.z - t.z);
      if (d < 28) e.morale = Math.max(0, (e.morale ?? 100) - (14 - d * 0.3));
    }
    w.events.push({ type: "death", x: t.x, y: t.y + t.def.height * 0.5, z: t.z, big: t.def.speed === 0, kind: t.kind });
  }
}

export function fireGroundProjectile(w: World, u: Entity, x: number, z: number): void {
  const base = u.def.damage * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  w.projectiles.push({
    id: w.nextId++, team: u.team, x: u.x, y: u.y + 2.2, z: u.z,
    vx: 0, vy: 0, vz: 0, tx: x, tz: z, target: null, sourceId: u.id,
    damage: base, speed: u.def.projectileSpeed * 0.85, splash: u.def.splash ?? 8,
    weapon: u.def.weapon,
  } as typeof w.projectiles[0] & { weapon?: string });
  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - 1);
  w.events.push({ type: "fire", team: u.team, x: u.x, y: u.y + 2.2, z: u.z, sourceId: u.id });
}

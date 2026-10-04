import raw from "../../data/damage.json";
import type { World } from "../World";
import type { Entity } from "../types";
import { wrapAngle } from "../math";
import { pointInFeature } from "../mapFeatures";

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

function isInfantrySquad(u: Entity): boolean {
  return (u.squadMaxMembers ?? 0) > 0 && u.def.category === "infantry";
}

function isPlatform(u: Entity): boolean {
  return u.def.speed > 0 && !isInfantrySquad(u) && !["cargoPlane"].includes(u.kind);
}

/** Phase 75: determine which vehicle system was hit and apply persistent damage. */
function applyComponentDamage(w: World, target: Entity, amount: number, face: ArmorFace, weapon: string): void {
  if (!isPlatform(target)) return;
  const c = target.components ?? (target.components = { engine: 0, tracks: 0, turret: 0, weapon: 0, crew: 0, ammo: 0 });
  const guided = weapon === "missile" || weapon === "cannon";
  const scale = Math.max(0.5, Math.min(2.4, amount / Math.max(1, target.def.hp * 0.16)));
  const r = w.rng();
  let key: keyof typeof c;
  if (face === "rear") key = r < 0.48 ? "engine" : r < 0.70 ? "tracks" : r < 0.88 ? "ammo" : "weapon";
  else if (face === "side") key = r < 0.28 ? "tracks" : r < 0.48 ? "crew" : r < 0.70 ? "weapon" : r < 0.88 ? "turret" : "engine";
  else key = r < 0.32 ? "turret" : r < 0.56 ? "weapon" : r < 0.76 ? "crew" : r < 0.91 ? "engine" : "ammo";
  c[key] = Math.min(100, c[key] + scale * (guided ? 8.5 : 5.5));

  if (c.engine >= 72 || c.tracks >= 82) target.disabledUntil = Math.max(target.disabledUntil ?? 0, w.time + 4);
  if (c.ammo >= 78 && guided && w.rng() < 0.10) {
    target.hp = Math.max(0, target.hp - target.def.hp * 0.30);
    c.ammo = Math.min(100, c.ammo + 15);
    target.suppression = Math.min(100, (target.suppression ?? 0) + 28);
    target.morale = Math.max(0, (target.morale ?? 100) - 22);
  }
}

/** Phase 74: convert combat damage into physical squad casualties without creating one entity per soldier. */
function applySquadCasualties(w: World, u: Entity, damageAmount: number): void {
  if (!isInfantrySquad(u) || u.dead) return;
  const max = u.squadMaxMembers ?? 1;
  const current = u.squadMembers ?? max;
  if (current <= 1) return;
  const pressure = Math.max(0.05, Math.min(0.75, damageAmount / Math.max(1, u.def.hp * 0.28)));
  const chance = pressure * ((u.suppression ?? 0) > 55 ? 0.95 : 0.58);
  if (w.rng() < chance) {
    u.squadMembers = Math.max(1, current - 1);
    u.squadFirepower = u.squadMembers / max;
    // Squad HP remains the aggregate survivability value; member loss visibly and mechanically reduces output.
    u.suppression = Math.min(100, (u.suppression ?? 0) + 5);
    u.morale = Math.max(0, (u.morale ?? 100) - 4);
  }
}

function targetCoverValue(w: World, t: Entity): number {
  let v = 0;
  for (const f of w.mapFeatures) {
    if (!pointInFeature(t.x, t.z, f, 0.2)) continue;
    if (f.kind === "cover") v = Math.max(v, 0.14);
    else if (f.kind === "wall" || f.kind === "chokepoint") v = Math.max(v, 0.22);
    else if (f.kind === "building") v = Math.max(v, 0.30);
  }
  return v;
}

function heSuppression(weapon: string, damage: number, power = 1): number {
  const base = weapon === "bullet" ? 0.85 : weapon === "cannon" ? 0.35 : weapon === "missile" ? 0.25 : 0.4;
  return damage * base * power;
}

export function fireProjectile(w: World, u: Entity, t: Entity, x: number, y: number, z: number): void {
  const squadMul = u.squadFirepower ?? 1;
  const weaponCondition = u.components ? Math.max(0.35, 1 - (u.components.weapon ?? 0) / 140) : 1;
  const base = u.def.damage * squadMul * weaponCondition * (1 + u.veteran * 0.08) * (u.upgrades.has("weapon") ? 1.15 : 1);
  const classMult = MATRIX[u.def.weapon]?.[t.def.armor] ?? 1;
  const face = hitFace(u.x, u.z, t);
  const penetration = (u.def.penetration ?? (u.def.weapon === "missile" ? 20 : u.def.weapon === "cannon" ? 18 : 5)) *
    (u.upgrades.has("weapon") ? 1.08 : 1);
  // Facing is already represented by the armor value at impact.
  const fMult = 1;

  // Accuracy is deliberately separate from damage. Recon, veteran crews, stabilizers,
  // morale, range and target size now matter without making raw damage inflation the
  // only way to improve a weapon.
  let hitChance = u.def.accuracy ?? 0.6;
  hitChance *= 0.5 + Math.min(100, u.supply ?? 100) / 200;
  if (!w.hasCommandLink(u)) hitChance *= 0.85;
  const dist = Math.hypot(t.x - u.x, t.z - u.z);
  const rangeRatio = Math.min(1, dist / Math.max(1, u.def.range));
  hitChance *= 1 - rangeRatio * 0.32;
  const sizeBonus: Record<string, number> = { small: -0.16, medium: 0, large: 0.08, very_large: 0.16 };
  hitChance += sizeBonus[t.def.size ?? "medium"] ?? 0;
  hitChance += (u.def.optics === "exceptional" ? 0.06 : u.def.optics === "very_good" ? 0.04 : u.def.optics === "good" ? 0.02 : 0);
  if (u.mode === "move" || u.mode === "amove") {
    const stab = u.def.stabilizer ?? (u.def.turret ? "full" : "none");
    if (stab === "none") hitChance *= 0.45;
    else if (stab === "partial") hitChance *= 0.72;
  }
  if (t.mode !== "idle" && t.mode !== "hold" && t.def.speed > 0) hitChance *= 0.86;
  hitChance *= Math.max(0.25, 1 - (u.suppression ?? 0) / 150);
  hitChance *= 0.72 + ((u.morale ?? 100) / 100) * 0.28;
  if (u.components) {
    hitChance *= Math.max(0.45, 1 - (u.components.crew ?? 0) / 180);
    if (u.def.turret) hitChance *= Math.max(0.55, 1 - (u.components.turret ?? 0) / 220);
  }
  if (u.veteran > 0) hitChance += Math.min(0.08, u.veteran * 0.016);
  // ECM disrupts guided weapons, but does not make aircraft invulnerable.
  if (u.def.weapon === "missile" || u.def.category === "air") {
    const ecm = w.entities.find(e => !e.dead && e.team !== u.team && e.kind === "ecm" && Math.hypot(e.x-u.x,e.z-u.z) < 46);
    if (ecm) hitChance *= 0.68;
  }
  if (t.def.category === "infantry" && u.kind !== "artillery" && u.kind !== "mortar" && u.kind !== "mlrs") {
    hitChance *= 1 - targetCoverValue(w, t);
  }
  hitChance = Math.max(0.05, Math.min(0.98, hitChance));

  const dealt = base * classMult * fMult;
  let tx = t.x, tz = t.z;
  if (t.def.speed > 0 && u.def.projectileSpeed > 0) {
    const eta = dist / Math.max(1, u.def.projectileSpeed);
    const spd = t.def.speed * (t.mode === "idle" || t.mode === "hold" ? 0 : 0.55);
    tx = t.x + Math.sin(t.heading) * spd * eta;
    tz = t.z + Math.cos(t.heading) * spd * eta;
  }

  w.projectiles.push({
    id: w.nextId++, team: u.team, x, y, z, vx: 0, vy: 0, vz: 0,
    tx, tz, target: t, sourceId: u.id,
    damage: dealt, speed: u.def.projectileSpeed, splash: u.def.splash ?? 0,
    weapon: u.def.weapon, face, hitChance, penetration, impactDamage: dealt,
  } as typeof w.projectiles[0] & { weapon?: string; face?: ArmorFace; hitChance?: number; penetration?: number; impactDamage?: number });

  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - (u.def.ammoUsePerShot ?? 1));
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
  if (t.def.category === "infantry") {
    const cover = targetCoverValue(w, t);
    amount *= 1 - cover * 0.55;
  }

  t.hp -= amount;
  applySquadCasualties(w, t, amount);
  const componentFace = opts?.fromX != null && opts?.fromZ != null ? hitFace(opts.fromX, opts.fromZ, t) : "front";
  applyComponentDamage(w, t, amount, componentFace, opts?.weapon ?? "bullet");

  // A penetrative hit can temporarily disable a platform without destroying it.
  // This is deliberately short so disabled vehicles recover through logistics/repair.
  if (opts?.sourceId != null && t.def.speed > 0) {
    const source = w.byId.get(opts.sourceId);
    const face = opts.fromX != null && opts.fromZ != null ? hitFace(opts.fromX, opts.fromZ, t) : "front";
    const armor = armorValue(t, face);
    const pen = source?.def.penetration ?? 0;
    if (pen >= armor * 0.9 && w.rng() < 0.10) {
      t.disabledUntil = Math.max(t.disabledUntil ?? 0, w.time + 2.5);
      t.cooldown = Math.max(t.cooldown, 1.2);
    }
  }

  // Suppression (Wargame stress)
  const wpn = opts?.weapon ?? "bullet";
  const supAdd = heSuppression(wpn, amount, (t.def.category === "armor" ? 1 : 1.15) * (opts?.sourceId != null ? w.byId.get(opts.sourceId)?.def.suppressionPower ?? 1 : 1));
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
    for (const id of [...t.cargoUnitIds]) { const passenger = w.byId.get(id); if (passenger && !passenger.dead) damage(w, passenger, passenger.def.hp * 10, opts); }
    t.cargoUnitIds = [];
    w.lossValue[t.team] += t.def.cost;
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
  if ((u.maxAmmo ?? 0) > 0) u.ammo = Math.max(0, (u.ammo ?? 0) - (u.def.ammoUsePerShot ?? 1));
  w.events.push({ type: "fire", team: u.team, x: u.x, y: u.y + 2.2, z: u.z, sourceId: u.id });
}

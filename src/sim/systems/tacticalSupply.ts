import type { World } from "../World";
import type { Entity } from "../types";
import { FACTIONS } from "../factions";

/** Wargame-style tactical logistics on top of Real War airbridge income. */
const SUPPLY_RADIUS_HQ = 70;
const SUPPLY_RADIUS_DEPOT = 55;
const SUPPLY_RADIUS_FORWARD = 42; // depots far from HQ act as forward
const SUPPLY_RADIUS_HELI = 22;

export function supplyRadiusFor(depot: Entity, w: World): number {
  if (depot.kind === "hq") return SUPPLY_RADIUS_HQ;
  if (depot.kind !== "supply") return 0;
  const hq = w.hq[depot.team];
  if (!hq || hq.dead) return SUPPLY_RADIUS_FORWARD;
  const d = Math.hypot(depot.x - hq.x, depot.z - hq.z);
  // Closer to HQ = main depot (larger); far = forward (smaller, riskier placement)
  return d > 90 ? SUPPLY_RADIUS_FORWARD : SUPPLY_RADIUS_DEPOT;
}

export function isTacticallySupplied(w: World, e: Entity): boolean {
  if (e.def.speed === 0) return true;
  if (e.kind === "transport" && e.supplyDepotId != null) return true;
  const nodes = w.connectedSupplyNodes(e.team);
  for (const n of nodes) {
    const r = supplyRadiusFor(n, w);
    if (Math.hypot(n.x - e.x, n.z - e.z) <= r) return true;
  }
  // Logistics heli with cargo acts as mobile supply pulse
  for (const h of w.entities) {
    if (h.dead || h.team !== e.team || h.kind !== "transport") continue;
    if (h.supplyDepotId == null) continue;
    if ((h.cargo ?? 0) <= 0) continue;
    if (Math.hypot(h.x - e.x, h.z - e.z) <= SUPPLY_RADIUS_HELI) return true;
  }
  return false;
}

function defaultMaxAmmo(kind: string): number {
  if (kind === "tank") return 24;
  if (kind === "ifv") return 40;
  if (kind === "apc") return 50;
  if (kind === "artillery") return 12;
  if (kind === "mlrs") return 8;
  if (kind === "aa") return 30;
  if (kind === "inf" || kind === "special") return 60;
  if (kind === "gunship" || kind === "heli") return 12;
  if (kind === "fighter" || kind === "interceptor" || kind === "bomber") return 6;
  return 0;
}

function defaultMaxFuel(kind: string, armor: string): number {
  if (armor === "air" || kind === "heli" || kind === "gunship" || kind === "transport") return 100;
  if (["tank", "ifv", "apc", "artillery", "mlrs", "aa"].includes(kind)) return 100;
  return 0;
}

/** Call once after spawn to ensure ground vehicles have ammo/fuel pools. */
export function ensureLogisticsPools(e: Entity): void {
  const maxA = defaultMaxAmmo(e.kind);
  if (maxA > 0 && (e.maxAmmo ?? 0) === 0) {
    e.maxAmmo = maxA;
    e.ammo = maxA;
  }
  const maxF = defaultMaxFuel(e.kind, e.def.armor);
  if (maxF > 0 && (e.maxFuel ?? 0) === 0) {
    e.maxFuel = maxF;
    e.fuel = maxF;
  }
}

/**
 * Each tick: drain fuel when moving, rearm/refuel in supply, apply out-of-supply pressure.
 */
export function updateTacticalSupply(w: World, dt: number): void {
  for (const e of w.entities) {
    if (e.dead || e.def.speed === 0) continue;
    ensureLogisticsPools(e);
    const fac = e.team === w.playerTeam ? w.playerFaction : w.enemyFaction;
    const eff = FACTIONS[fac].bonuses.supplyEfficiency ?? 1;

    const supplied = isTacticallySupplied(w, e);
    // Soft flag via supply points (existing field)
    const maxS = e.maxSupply ?? 100;
    if (supplied) e.supply = Math.min(maxS, (e.supply ?? 100) + 22 * dt);
    else e.supply = Math.max(0, (e.supply ?? 100) - (e.role === "siege" ? 1.8 : e.def.armor === "air" ? 2.4 : 0.9) * dt);

    // Fuel drain while moving
    if ((e.maxFuel ?? 0) > 0) {
      const moving = e.mode === "move" || e.mode === "amove" || e.mode === "patrol" || e.mode === "attack";
      if (moving && (e.fuel ?? 0) > 0) {
        const use = (e.def.armor === "air" || e.def.category === "heli" ? 2.8 : 1.1) * dt;
        e.fuel = Math.max(0, (e.fuel ?? 0) - use);
      }
      // Refuel in supply
      if (supplied && (e.fuel ?? 0) < (e.maxFuel ?? 0)) {
        e.fuel = Math.min(e.maxFuel ?? 0, (e.fuel ?? 0) + 14 * eff * dt);
      }
    }

    // Rearm in supply
    if (supplied && (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) < (e.maxAmmo ?? 0)) {
      const rate = (e.kind === "artillery" || e.kind === "mlrs" ? 1.2 : e.kind === "tank" ? 2.5 : 4) * eff;
      e.ammo = Math.min(e.maxAmmo ?? 0, (e.ammo ?? 0) + rate * dt);
    }

    // Out of supply: morale bleed
    if (!supplied && (e.supply ?? 100) < 20) {
      e.morale = Math.max(0, (e.morale ?? 100) - 3.5 * dt);
    }
  }
}

export function outOfFuel(e: Entity): boolean {
  return (e.maxFuel ?? 0) > 0 && (e.fuel ?? 0) <= 0.5;
}

export function outOfAmmo(e: Entity): boolean {
  return (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) <= 0;
}

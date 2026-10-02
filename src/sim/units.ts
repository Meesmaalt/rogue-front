import raw from "../data/units.json";
import type { UnitDef, UnitKind } from "./types";

const NUM: (keyof UnitDef)[] = ["hp", "speed", "turnRate", "range", "damage", "cooldown", "radius", "height", "cost", "buildTime", "projectileSpeed"];
const BOOL: (keyof UnitDef)[] = ["producible", "turret"];
const STR: (keyof UnitDef)[] = ["armor", "weapon"];
const KINDS: UnitKind[] = ["tank", "inf", "bunker", "hq", "engineer", "heli", "fighter", "aa", "refinery"];

export function parseUnits(data: unknown): Record<UnitKind, UnitDef> {
  const obj = data as Record<string, Record<string, unknown>>;
  for (const k of KINDS) {
    const d = obj?.[k];
    if (!d || typeof d.name !== "string") throw new Error(`units.json: puudub '${k}' või selle nimi`);
    for (const f of NUM) if (typeof d[f] !== "number" || !Number.isFinite(d[f] as number)) throw new Error(`units.json: ${k}.${f} peab olema number`);
    for (const f of BOOL) if (typeof d[f] !== "boolean") throw new Error(`units.json: ${k}.${f} peab olema boolean`);
    for (const f of STR) if (typeof d[f] !== "string") throw new Error(`units.json: ${k}.${f} peab olema string`);
  }
  return obj as unknown as Record<UnitKind, UnitDef>;
}

export const UNITS = parseUnits(raw);

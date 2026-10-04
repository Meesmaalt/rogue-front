import raw from "../data/units.json";
import type { UnitDef, UnitKind, OpticsRating, UnitSize, Stabilizer, Discipline, UnitCategory } from "./types";

const NUM: (keyof UnitDef)[] = ["hp", "speed", "turnRate", "range", "damage", "cooldown", "radius", "height", "cost", "buildTime", "projectileSpeed"];
const BOOL: (keyof UnitDef)[] = ["producible", "turret"];
const STR: (keyof UnitDef)[] = ["armor", "weapon"];
const KINDS: UnitKind[] = ["tank", "apc", "ifv", "inf", "bunker", "hq", "engineer", "heli", "transport", "gunship", "fighter", "interceptor", "bomber", "artillery", "mlrs", "aa", "refinery", "barracks", "factory", "helipad", "airbase", "supply", "radar", "generator", "destroyer", "submarine", "landingcraft", "special", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"];

/** Kind → schema v2 defaults (Wargame-oriented). */
function defaultsFor(kind: UnitKind, d: Record<string, unknown>): Partial<UnitDef> {
  const building = !!d.building || ["hq","bunker","aa","refinery","barracks","factory","helipad","airbase","supply","radar","generator","shipyard","landCommand","airCommand","seaCommand","combatEngineer","landStrategy","airStrategy","seaStrategy"].includes(kind);
  const armor = String(d.armor ?? "light");
  const category: UnitCategory =
    building ? "building" :
    kind === "special" || kind === "engineer" ? "recon" :
    kind === "inf" ? "infantry" :
    ["tank","apc","ifv"].includes(kind) ? "armor" :
    ["artillery","mlrs","aa"].includes(kind) ? "support" :
    ["heli","gunship","transport"].includes(kind) ? "heli" :
    ["fighter","interceptor","bomber"].includes(kind) ? "air" :
    ["destroyer","submarine","landingcraft"].includes(kind) ? "naval" :
    "logistics";

  const size: UnitSize =
    kind === "inf" || kind === "special" || kind === "engineer" ? "small" :
    kind === "tank" || kind === "artillery" || kind === "mlrs" ? "large" :
    building || kind === "hq" ? "very_large" :
    kind === "destroyer" || kind === "submarine" ? "large" :
    "medium";

  const optics: OpticsRating =
    kind === "radar" ? "exceptional" :
    kind === "special" || kind === "fighter" || kind === "interceptor" ? "very_good" :
    kind === "tank" || kind === "ifv" || kind === "heli" || kind === "gunship" ? "good" :
    kind === "aa" || kind === "destroyer" ? "good" :
    kind === "inf" || kind === "apc" ? "normal" :
    "poor";

  const opticsBase: Record<OpticsRating, number> = {
    poor: 28, normal: 38, good: 52, very_good: 68, exceptional: 95,
  };

  const stealthLevel =
    kind === "special" || kind === "submarine" ? 2 :
    kind === "inf" || kind === "engineer" ? 1 :
    kind === "fighter" || kind === "interceptor" ? 1 :
    0;

  const armorClass = armor === "heavy" ? 12 : armor === "medium" ? 8 : armor === "air" ? 3 : 4;
  const armorFront = building ? armorClass + 6 : kind === "tank" ? 14 : kind === "ifv" ? 9 : kind === "apc" ? 6 : armorClass;
  const armorSide = Math.round(armorFront * 0.7);
  const armorRear = Math.round(armorFront * 0.45);

  const stabilizer: Stabilizer =
    kind === "tank" || kind === "ifv" || kind === "aa" || kind === "gunship" || kind === "heli" ? "full" :
    kind === "apc" || kind === "fighter" ? "partial" :
    "none";

  const discipline: Discipline =
    kind === "special" || kind === "tank" || kind === "fighter" ? "high" :
    kind === "inf" || kind === "apc" ? "medium" :
    "medium";

  return {
    category,
    size,
    optics,
    stealthLevel,
    armorFront,
    armorSide,
    armorRear,
    stabilizer,
    discipline,
    opticsRange: opticsBase[optics],
    domain: d.domain as UnitDef["domain"] ?? (
      category === "air" || category === "heli" ? "air" :
      category === "naval" ? "sea" : "land"
    ),
  };
}

export function parseUnits(data: unknown): Record<UnitKind, UnitDef> {
  const obj = data as Record<string, Record<string, unknown>>;
  const out = {} as Record<UnitKind, UnitDef>;
  for (const k of KINDS) {
    const d = obj?.[k];
    if (!d || typeof d.name !== "string") throw new Error(`units.json: puudub '${k}' või selle nimi`);
    for (const f of NUM) if (typeof d[f] !== "number" || !Number.isFinite(d[f] as number)) throw new Error(`units.json: ${k}.${f} peab olema number`);
    for (const f of BOOL) if (typeof d[f] !== "boolean") throw new Error(`units.json: ${k}.${f} peab olema boolean`);
    for (const f of STR) if (typeof d[f] !== "string") throw new Error(`units.json: ${k}.${f} peab olema string`);
    const def = { ...d, ...defaultsFor(k, d) } as UnitDef;
    // Optional overrides from JSON
    if (typeof d.optics === "string") def.optics = d.optics as OpticsRating;
    if (typeof d.stealthLevel === "number") def.stealthLevel = d.stealthLevel;
    if (typeof d.size === "string") def.size = d.size as UnitSize;
    if (typeof d.stabilizer === "string") def.stabilizer = d.stabilizer as Stabilizer;
    if (typeof d.armorFront === "number") def.armorFront = d.armorFront;
    if (typeof d.armorSide === "number") def.armorSide = d.armorSide;
    if (typeof d.armorRear === "number") def.armorRear = d.armorRear;
    if (typeof d.opticsRange === "number") def.opticsRange = d.opticsRange;
    // Legacy stealth boolean
    if (d.stealth === true && (def.stealthLevel ?? 0) < 1) def.stealthLevel = 2;
    out[k] = def;
  }
  return out;
}

export const UNITS = parseUnits(raw);

import type { UnitKind } from "./types";

/** Playable nations – equipment names + doctrine skew (Wargame identity). */
export type FactionId = "usa" | "russia" | "china";

export interface FactionDoctrine {
  /** Multipliers applied at spawn (kept mild). */
  armorMul: number;
  speedMul: number;
  damageMul: number;
  buildCostMul: number;
  /** Optics range multiplier (USA recon/sensor edge). */
  opticsMul: number;
  /** Ammo/fuel resupply rate in supply radius. */
  supplyEfficiency: number;
  /** Morale recovery and resist. */
  moraleMul: number;
  /** Preferred AI composition weights. */
  prefer: Partial<Record<UnitKind, number>>;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  color: number;
  unitNames: Partial<Record<UnitKind, string>>;
  landExtra: UnitKind[];
  airExtra: UnitKind[];
  seaExtra: UnitKind[];
  bonuses: FactionDoctrine;
  /** One-line doctrine blurb for briefing UI. */
  doctrineBlurb: string;
}

const USA: FactionDef = {
  id: "usa",
  name: "United States",
  short: "USA",
  color: 0x4a7ab0,
  unitNames: {
    inf: "Rifle Squad",
    engineer: "Combat Engineer",
    special: "Delta Force",
    tank: "M1A2 Abrams",
    apc: "Stryker ICV",
    ifv: "M2 Bradley",
    artillery: "M109 Paladin",
    mlrs: "M270 MLRS",
    heli: "AH-64 Apache",
    gunship: "AH-1Z Viper",
    transport: "CH-47 Chinook",
    fighter: "F-16C Viper",
    interceptor: "F-22 Raptor",
    bomber: "B-1B Lancer",
    destroyer: "Arleigh Burke DDG",
    submarine: "Virginia SSN",
    landingcraft: "LCAC",
    aa: "NASAMS",
    bunker: "Hardened Bunker",
  },
  landExtra: ["apc", "ifv", "mlrs"],
  airExtra: ["interceptor", "bomber"],
  seaExtra: [],
  bonuses: {
    armorMul: 1.04,
    speedMul: 1.0,
    damageMul: 1.0,
    buildCostMul: 1.06,
    opticsMul: 1.18,
    supplyEfficiency: 1.1,
    moraleMul: 1.08,
    prefer: { fighter: 1.3, interceptor: 1.2, ifv: 1.15, gunship: 1.1, tank: 1.0 },
  },
  doctrineBlurb: "Kvaliteet, optika ja õhuvõime. Kallim, aga näeb esimesena.",
};

const RUSSIA: FactionDef = {
  id: "russia",
  name: "Russia",
  short: "RUS",
  color: 0xb05040,
  unitNames: {
    inf: "Motor Rifle Squad",
    engineer: "Combat Engineer",
    special: "Spetsnaz",
    tank: "T-90M Proryv",
    apc: "BTR-82A",
    ifv: "BMP-3",
    artillery: "2S19 Msta-S",
    mlrs: "BM-30 Smerch",
    heli: "Ka-52 Alligator",
    gunship: "Mi-28 Havoc",
    transport: "Mi-26 Halo",
    fighter: "Su-35S Flanker-E",
    interceptor: "MiG-31BM",
    bomber: "Tu-22M3 Backfire",
    destroyer: "Admiral Gorshkov FFG",
    submarine: "Yasen-class SSN",
    landingcraft: "Zubr LCAC",
    aa: "Pantsir-S1",
    bunker: "Fortified Bunker",
  },
  landExtra: ["apc", "ifv", "mlrs"],
  airExtra: ["interceptor", "bomber"],
  seaExtra: [],
  bonuses: {
    armorMul: 1.1,
    speedMul: 0.95,
    damageMul: 1.06,
    buildCostMul: 0.92,
    opticsMul: 0.92,
    supplyEfficiency: 0.95,
    moraleMul: 1.0,
    prefer: { tank: 1.25, artillery: 1.3, mlrs: 1.2, aa: 1.25, inf: 1.1 },
  },
  doctrineBlurb: "Raske soomus, suurtükivägi ja AA. Odavam mass, aeglasem manööver.",
};

const CHINA: FactionDef = {
  id: "china",
  name: "China",
  short: "CHN",
  color: 0xc0a030,
  unitNames: {
    inf: "PLA Infantry",
    engineer: "Combat Engineer",
    special: "Snow Leopard SOF",
    tank: "Type 99A",
    apc: "ZBL-08",
    ifv: "ZBD-04A",
    artillery: "PLZ-05",
    mlrs: "PHL-03",
    heli: "Z-10",
    gunship: "Z-19",
    transport: "Z-8G",
    fighter: "J-10C",
    interceptor: "J-20",
    bomber: "H-6K",
    destroyer: "Type 055 DDG",
    submarine: "Type 093 SSN",
    landingcraft: "Type 726 LCAC",
    aa: "HQ-16",
    bunker: "Hardened Bunker",
  },
  landExtra: ["apc", "ifv", "mlrs"],
  airExtra: ["interceptor", "bomber"],
  seaExtra: [],
  bonuses: {
    armorMul: 1.0,
    speedMul: 1.06,
    damageMul: 0.98,
    buildCostMul: 0.9,
    opticsMul: 1.0,
    supplyEfficiency: 1.15,
    moraleMul: 0.98,
    prefer: { ifv: 1.25, apc: 1.2, mlrs: 1.25, inf: 1.15, fighter: 1.05 },
  },
  doctrineBlurb: "Mobiilsus, IFV/APC tihedus, odav logistika. Rocket arty kaal.",
};

export const FACTIONS: Record<FactionId, FactionDef> = {
  usa: USA,
  russia: RUSSIA,
  china: CHINA,
};

export const FACTION_LIST: FactionId[] = ["usa", "russia", "china"];

export function factionUnitName(faction: FactionId, kind: UnitKind, fallback: string): string {
  return FACTIONS[faction].unitNames[kind] ?? fallback;
}

export function factionLandUnits(_faction: FactionId): UnitKind[] {
  return ["inf", "engineer", "special", "tank", "apc", "ifv", "artillery", "mlrs"];
}

export function factionAirUnits(_faction: FactionId): UnitKind[] {
  return ["heli", "gunship", "transport", "fighter", "interceptor", "bomber"];
}

export function factionSeaUnits(_faction: FactionId): UnitKind[] {
  return ["destroyer", "submarine", "landingcraft"];
}

export function factionForTeam(
  w: { playerTeam: 0 | 1; playerFaction: FactionId; enemyFaction: FactionId },
  team: 0 | 1,
): FactionId {
  return team === w.playerTeam ? w.playerFaction : w.enemyFaction;
}

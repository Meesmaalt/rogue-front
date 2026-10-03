import type { UnitKind } from "./types";

/** Playable nations – each has its own equipment names for the same roles. */
export type FactionId = "usa" | "russia" | "china";

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  color: number;
  /** Display name override per unit kind (fallback = units.json name). */
  unitNames: Partial<Record<UnitKind, string>>;
  /** Extra producible kinds this faction unlocks beyond the shared core. */
  landExtra: UnitKind[];
  airExtra: UnitKind[];
  seaExtra: UnitKind[];
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

/** Core land / air / sea production lists for a faction. */
export function factionLandUnits(_faction: FactionId): UnitKind[] {
  return ["inf", "engineer", "special", "tank", "apc", "ifv", "artillery", "mlrs"];
}

export function factionAirUnits(faction: FactionId): UnitKind[] {
  return ["heli", "gunship", "transport", "fighter", "interceptor", "bomber"];
}

export function factionSeaUnits(_faction: FactionId): UnitKind[] {
  return ["destroyer", "submarine", "landingcraft"];
}

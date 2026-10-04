import type { FactionId } from "./factions";
import { FACTIONS, factionLandUnits, factionAirUnits, factionSeaUnits } from "./factions";
import type { UnitKind } from "./types";
import { UNITS } from "./units";

const STORAGE_KEY = "rogue-front.decks.v1";

/** Wargame-inspired deck: activation points budget + per-category caps. */
export interface DeckSlot {
  kind: UnitKind;
  count: number;
}

export interface FactionDeck {
  faction: FactionId;
  name: string;
  /** Selected unit cards with counts */
  slots: DeckSlot[];
  updatedAt: number;
}

export interface DeckRules {
  maxActivation: number;
  maxPerCard: number;
  maxLand: number;
  maxAir: number;
  maxSea: number;
  maxLog: number;
}

export const DEFAULT_RULES: DeckRules = {
  maxActivation: 120,
  maxPerCard: 8,
  maxLand: 14,
  maxAir: 8,
  maxSea: 4,
  maxLog: 4,
};

/** Activation cost ≈ unit cost / 20 (rounded). */
export function activationCost(kind: UnitKind): number {
  const c = UNITS[kind]?.cost ?? 50;
  return Math.max(1, Math.round(c / 20));
}

export function deckActivationTotal(deck: FactionDeck): number {
  return deck.slots.reduce((s, sl) => s + activationCost(sl.kind) * sl.count, 0);
}

export function categoryOf(kind: UnitKind): "land" | "air" | "sea" | "log" {
  if (["transport","landingcraft"].includes(kind)) return "log";
  if (factionAirUnits("usa").includes(kind) || UNITS[kind]?.armor === "air") return "air";
  if (factionSeaUnits("usa").includes(kind)) return "sea";
  return "land";
}

export function loadAllDecks(): Record<FactionId, FactionDeck> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<FactionId, FactionDeck>;
      for (const id of ["usa", "russia", "china"] as FactionId[]) {
        if (!parsed[id]) parsed[id] = defaultDeck(id);
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return {
    usa: defaultDeck("usa"),
    russia: defaultDeck("russia"),
    china: defaultDeck("china"),
  };
}

export function saveAllDecks(decks: Record<FactionId, FactionDeck>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function defaultDeck(faction: FactionId): FactionDeck {
  const land = factionLandUnits(faction).filter(k => UNITS[k]?.producible);
  const air = factionAirUnits(faction).filter(k => UNITS[k]?.producible);
  const slots: DeckSlot[] = [];
  // A useful combined-arms starter deck: line infantry, AT, recon, MBT, indirect fire and AA.
  const preferredLand: UnitKind[] = ["inf","atInf","reconInf","tank","ifv","mortar","atgm","manpad"];
  for (const k of preferredLand.filter(k => land.includes(k)).slice(0, 8)) {
    slots.push({ kind: k, count: k === "inf" ? 6 : k === "tank" ? 4 : k === "reconInf" ? 2 : 2 });
  }
  const preferredAir: UnitKind[] = ["heli","casHeli","fighter","multirole"];
  for (const k of preferredAir.filter(k => air.includes(k)).slice(0, 4)) slots.push({ kind: k, count: 2 });
  return {
    faction,
    name: `${FACTIONS[faction].short} standard`,
    slots,
    updatedAt: Date.now(),
  };
}

export function rosterForFaction(faction: FactionId): UnitKind[] {
  const all = [
    ...factionLandUnits(faction),
    ...factionAirUnits(faction),
    ...factionSeaUnits(faction),
  ];
  return all.filter(k => UNITS[k]?.producible);
}

/** Validate deck against rules; returns error strings. */
export function validateDeck(deck: FactionDeck, rules: DeckRules = DEFAULT_RULES): string[] {
  const errs: string[] = [];
  const total = deckActivationTotal(deck);
  if (total > rules.maxActivation) errs.push(`Aktiveerimine ${total}/${rules.maxActivation}`);
  let land = 0, air = 0, sea = 0, log = 0;
  for (const s of deck.slots) {
    if (s.count > rules.maxPerCard) errs.push(`${s.kind}: max ${rules.maxPerCard}/kaart`);
    const cat = categoryOf(s.kind);
    if (cat === "land") land += s.count;
    else if (cat === "air") air += s.count;
    else if (cat === "sea") sea += s.count;
    else log += s.count;
  }
  if (land > rules.maxLand) errs.push(`Maa ${land}/${rules.maxLand}`);
  if (air > rules.maxAir) errs.push(`Õhk ${air}/${rules.maxAir}`);
  if (sea > rules.maxSea) errs.push(`Meri ${sea}/${rules.maxSea}`);
  if (log > rules.maxLog) errs.push(`Logistika ${log}/${rules.maxLog}`);
  return errs;
}

/** Soft production limit from deck during match (optional). */
export function deckRemaining(deck: FactionDeck, kind: UnitKind, produced: number): number {
  const slot = deck.slots.find(s => s.kind === kind);
  if (!slot) return 0;
  return Math.max(0, slot.count - produced);
}

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
      const parsed: unknown = JSON.parse(raw);
      const stored = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
      const result = {} as Record<FactionId, FactionDeck>;
      for (const id of ["usa", "russia", "china"] as FactionId[]) {
        const entry = stored[id] as Partial<FactionDeck> | undefined;
        const roster = rosterForFaction(id);
        const slots = entry?.slots;
        const valid = entry?.faction === id && Array.isArray(slots) &&
          slots.every(s => s && roster.includes(s.kind) && Number.isInteger(s.count) && s.count > 0) &&
          new Set(slots.map(s => s.kind)).size === slots.length;
        result[id] = valid ? { faction:id, name:typeof entry!.name === "string" ? entry!.name : `${FACTIONS[id].short} standard`,
          slots:slots!.map(s=>({...s})), updatedAt:typeof entry!.updatedAt === "number" && Number.isFinite(entry!.updatedAt) ? entry!.updatedAt : 0 } : defaultDeck(id);
      }
      return result;
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
  const roster = rosterForFaction(faction);
  const deck: FactionDeck = { faction, name:`${FACTIONS[faction].short} standard`, slots:[], updatedAt:Date.now() };
  // Keep construction, transport, recon, indirect fire and AA available in a legal starter.
  const preferred: UnitKind[] = ["inf","engineer","reconInf","tank","apc","ifv","spaa","artillery","heli","fighter","transport"];
  for (const kind of preferred.filter(k=>roster.includes(k))) {
    const candidate = { ...deck, slots:[...deck.slots,{kind,count:1}] };
    if (!validateDeck(candidate).length) deck.slots = candidate.slots;
  }
  for (const kind of ["inf","inf","tank"] as UnitKind[]) {
    const candidate = { ...deck, slots:deck.slots.map(s=>s.kind===kind ? {...s,count:s.count+1} : s) };
    if (!validateDeck(candidate).length) deck.slots = candidate.slots;
  }
  return deck;
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
  if (!deck || !["usa","russia","china"].includes(deck.faction) || !Array.isArray(deck.slots)) return ["Vigane koosseis"];
  if (!deck.slots.length) errs.push("Vali vähemalt üks üksus");
  const roster = rosterForFaction(deck.faction), seen = new Set<UnitKind>();
  for (const slot of deck.slots) {
    if (!slot || !roster.includes(slot.kind) || !Number.isInteger(slot.count) || slot.count <= 0) return ["Vigane üksus või kogus koosseisus"];
    if (seen.has(slot.kind)) errs.push("Sama üksuse korduv kaart");
    seen.add(slot.kind);
  }
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

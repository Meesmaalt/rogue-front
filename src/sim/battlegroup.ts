import type { FactionDeck } from "./deck";
import { activationCost, categoryOf, deckActivationTotal } from "./deck";
import type { UnitKind } from "./types";
import { UNITS } from "./units";

export type BattleGroupPhase = "reserve" | "deployed" | "recovering";
export interface BattleGroupCardState {
  kind: UnitKind;
  purchased: number;
  deployed: number;
  lost: number;
  veterancy: number;
  phase: BattleGroupPhase;
}
export interface BattleGroupState {
  activationBudget: number;
  activationUsed: number;
  cards: Record<string, BattleGroupCardState>;
  commandReserve: number;
  reinforcementPool: number;
}

/** Phase 80: match-level battlegroup state layered on top of the existing deck. */
export class BattleGroupController {
  readonly state: BattleGroupState;
  constructor(readonly deck: FactionDeck) {
    this.state = {
      activationBudget: deckActivationTotal(deck), activationUsed: 0,
      cards: Object.fromEntries(deck.slots.map(s => [s.kind, {
        kind: s.kind, purchased: s.count, deployed: 0, lost: 0, veterancy: 0, phase: "reserve" as BattleGroupPhase,
      }])),
      commandReserve: Math.max(2, Math.floor(deckActivationTotal(deck) * 0.15)),
      reinforcementPool: 0,
    };
  }
  card(kind: UnitKind): BattleGroupCardState | undefined { return this.state.cards[kind]; }
  remaining(kind: UnitKind): number { const c = this.card(kind); return c ? Math.max(0, c.purchased - c.deployed - c.lost) : 0; }
  activationRemaining(): number { return Math.max(0, this.state.activationBudget - this.state.activationUsed); }
  canDeploy(kind: UnitKind, count = 1): boolean {
    const c = this.card(kind); if (!c || this.remaining(kind) < count) return false;
    return activationCost(kind) * count <= this.activationRemaining() + this.state.commandReserve;
  }
  deploy(kind: UnitKind, count = 1): boolean {
    if (!this.canDeploy(kind, count)) return false;
    const c = this.card(kind)!; c.deployed += count; c.phase = "deployed";
    this.state.activationUsed += activationCost(kind) * count;
    this.state.commandReserve = Math.max(0, this.state.commandReserve - activationCost(kind) * count);
    return true;
  }
  recordLoss(kind: UnitKind): void {
    const c = this.card(kind); if (!c || c.deployed <= 0) return;
    c.deployed--; c.lost++; c.veterancy = Math.max(0, c.veterancy - 0.15); c.phase = c.deployed ? "deployed" : "recovering";
  }
  recordVeterancy(kind: UnitKind, amount = 0.05): void {
    const c = this.card(kind); if (c) c.veterancy = Math.min(3, c.veterancy + amount);
  }
  summary(): string {
    const land = Object.values(this.state.cards).filter(c => categoryOf(c.kind) === "land").reduce((n,c)=>n+c.deployed,0);
    const air = Object.values(this.state.cards).filter(c => categoryOf(c.kind) === "air").reduce((n,c)=>n+c.deployed,0);
    const sea = Object.values(this.state.cards).filter(c => categoryOf(c.kind) === "sea").reduce((n,c)=>n+c.deployed,0);
    return `BG ${land}L / ${air}A / ${sea}S · AP ${this.activationRemaining()}`;
  }
  snapshot(): BattleGroupState { return JSON.parse(JSON.stringify(this.state)) as BattleGroupState; }
  restore(state: BattleGroupState): void {
    this.state.activationBudget = state.activationBudget; this.state.activationUsed = state.activationUsed; this.state.commandReserve = state.commandReserve; this.state.reinforcementPool = state.reinforcementPool;
    for (const [k,v] of Object.entries(state.cards)) this.state.cards[k] = { ...v };
  }
  cardInfo(kind: UnitKind): string {
    const c = this.card(kind); if (!c) return "Pole deckis";
    const role = UNITS[kind]?.roleLabel ?? "combat";
    return `${role} · ${c.deployed}/${c.purchased} väljas · ${c.lost} kaotatud · vet ${c.veterancy.toFixed(1)}`;
  }
}

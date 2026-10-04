import "./deck.css";
import type { FactionId } from "../sim/factions";
import { FACTIONS, FACTION_LIST } from "../sim/factions";
import {
  type FactionDeck,
  activationCost,
  deckActivationTotal,
  defaultDeck,
  loadAllDecks,
  rosterForFaction,
  saveAllDecks,
  validateDeck,
  DEFAULT_RULES,
  categoryOf,
} from "../sim/deck";
import { UNITS } from "../sim/units";
import type { UnitKind } from "../sim/types";

/**
 * Pre-match deck planner (Wargame-style): pick nation, fill cards under activation budget.
 * Persists to localStorage per faction.
 */
export class DeckBuilder {
  private root: HTMLElement;
  private decks = loadAllDecks();
  private faction: FactionId = "usa";
  onClose: () => void = () => {};
  onPlay: (faction: FactionId, deck: FactionDeck) => void = () => {};

  constructor(host: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "deck-builder hidden";
    host.appendChild(this.root);
    this.render();
  }

  open(faction?: FactionId): void {
    if (faction) this.faction = faction;
    this.decks = loadAllDecks();
    this.root.classList.remove("hidden");
    this.render();
  }

  close(): void {
    this.root.classList.add("hidden");
    this.onClose();
  }

  private deck(): FactionDeck {
    return this.decks[this.faction] ?? defaultDeck(this.faction);
  }

  private setCount(kind: UnitKind, count: number): void {
    const d = this.deck();
    const slots = [...d.slots];
    const i = slots.findIndex(s => s.kind === kind);
    count = Math.max(0, Math.min(DEFAULT_RULES.maxPerCard, count));
    if (count === 0) {
      if (i >= 0) slots.splice(i, 1);
    } else if (i >= 0) slots[i] = { kind, count };
    else slots.push({ kind, count });
    this.decks[this.faction] = { ...d, slots, updatedAt: Date.now() };
    saveAllDecks(this.decks);
    this.render();
  }

  private render(): void {
    const d = this.deck();
    const total = deckActivationTotal(d);
    const errs = validateDeck(d);
    const roster = rosterForFaction(this.faction);
    const fac = FACTIONS[this.faction];

    const slotMap = new Map(d.slots.map(s => [s.kind, s.count]));

    this.root.innerHTML = `
      <div class="deck-panel">
        <header class="deck-head">
          <h1>Doktriini deck</h1>
          <p class="deck-blurb">${fac.doctrineBlurb}</p>
          <div class="deck-factions">
            ${FACTION_LIST.map(id => `
              <button type="button" class="deck-fac ${id === this.faction ? "active" : ""}" data-fac="${id}">
                ${FACTIONS[id].short}
              </button>`).join("")}
          </div>
        </header>
        <div class="deck-budget ${total > DEFAULT_RULES.maxActivation ? "over" : ""}">
          Aktiveerimine <b>${total}</b> / ${DEFAULT_RULES.maxActivation}
          ${errs.length ? `<span class="deck-errs">${errs.join(" · ")}</span>` : '<span class="deck-ok">Kehtiv deck</span>'}
        </div>
        <div class="deck-grid">
          ${roster.map(kind => {
            const n = slotMap.get(kind) ?? 0;
            const name = fac.unitNames[kind] ?? UNITS[kind].name;
            const cat = categoryOf(kind);
            const act = activationCost(kind);
            return `<div class="deck-card ${n > 0 ? "in" : ""}" data-kind="${kind}">
              <div class="deck-card-top"><span class="cat">${cat}</span><span class="act">${act} AP</span></div>
              <div class="deck-name">${name}</div>
              <div class="deck-meta">${UNITS[kind].cost} · ${UNITS[kind].armor} · ${UNITS[kind].roleLabel ?? "Combat"}</div><div class="deck-ability">${UNITS[kind].ability ?? ""}</div>
              <div class="deck-stepper">
                <button type="button" data-del="${kind}">−</button>
                <span>${n}</span>
                <button type="button" data-add="${kind}">+</button>
              </div>
            </div>`;
          }).join("")}
        </div>
        <footer class="deck-foot">
          <button type="button" class="deck-reset">Lähtesta</button>
          <button type="button" class="deck-close">Sulge</button>
          <button type="button" class="deck-play" ${errs.length ? "disabled" : ""}>Skirmish selle deckiga</button>
        </footer>
      </div>`;

    this.root.querySelectorAll<HTMLButtonElement>("[data-fac]").forEach(b => {
      b.onclick = () => { this.faction = b.dataset.fac as FactionId; this.render(); };
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-add]").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.add as UnitKind;
        this.setCount(k, (slotMap.get(k) ?? 0) + 1);
      };
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-del]").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.del as UnitKind;
        this.setCount(k, (slotMap.get(k) ?? 0) - 1);
      };
    });
    this.root.querySelector<HTMLButtonElement>(".deck-reset")!.onclick = () => {
      this.decks[this.faction] = defaultDeck(this.faction);
      saveAllDecks(this.decks);
      this.render();
    };
    this.root.querySelector<HTMLButtonElement>(".deck-close")!.onclick = () => this.close();
    this.root.querySelector<HTMLButtonElement>(".deck-play")!.onclick = () => {
      if (validateDeck(this.deck()).length) return;
      this.onPlay(this.faction, this.deck());
      this.close();
    };
  }
}

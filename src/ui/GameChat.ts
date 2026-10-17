import type { ChatEntry, PeerInfo, PlayerLag } from "../net/LockstepClient";
import "./game-chat.css";

const TEAM_COLORS = ["#6db3f2", "#e8665d", "#7fcf6b", "#f2c14e"];
const FADE_MS = 9000;
const MAX_LINES = 60;

export interface GameChatOptions {
  canSend: boolean;
  /** Team-only chat is available in 2v2 games. */
  teamChat: () => boolean;
  send: (text: string, scope: "all" | "team") => void;
}

/** In-game chat: Enter = message to everyone, Shift+Enter = allies only (2v2), Esc = close. */
export class GameChat {
  private readonly root = document.createElement("div");
  private readonly log = document.createElement("div");
  private readonly warn = document.createElement("div");
  private readonly form = document.createElement("form");
  private readonly tag = document.createElement("span");
  private readonly input = document.createElement("input");
  private scope: "all" | "team" = "all";
  private open = false;
  private selfBehind = 0;
  private peerNotes = new Map<number, string>();
  private lagNotes: string[] = [];

  constructor(parent: HTMLElement, private readonly options: GameChatOptions) {
    this.root.className = "game-chat";
    this.log.className = "game-chat-log";
    this.log.setAttribute("role", "log");
    this.log.setAttribute("aria-live", "polite");
    this.warn.className = "game-chat-warn";
    this.form.className = "game-chat-form";
    this.tag.className = "game-chat-tag";
    this.input.maxLength = 300;
    this.input.autocomplete = "off";
    this.input.setAttribute("aria-label", "Vestlus");
    this.form.append(this.tag, this.input);
    this.root.append(this.warn, this.log, this.form);
    parent.appendChild(this.root);
    this.setOpen(false);

    // Keystrokes typed into the chat must never reach camera / hotkey handlers.
    for (const type of ["keydown", "keyup", "keypress"]) this.input.addEventListener(type, e => e.stopPropagation());
    this.input.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); this.setOpen(false); } });
    this.input.addEventListener("blur", () => { if (this.open && !this.input.value) this.setOpen(false); });
    this.form.addEventListener("submit", e => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (text) this.options.send(text, this.scope);
      this.input.value = "";
      this.setOpen(false);
    });
    addEventListener("keydown", e => {
      if (e.key !== "Enter" || e.repeat || this.open || !this.options.canSend) return;
      if (e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      e.preventDefault();
      this.scope = e.shiftKey && this.options.teamChat() ? "team" : "all";
      this.setOpen(true);
    });
    setInterval(() => this.fade(), 1000);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.root.classList.toggle("open", open);
    this.form.hidden = !open;
    this.tag.textContent = this.scope === "team" ? "TIIM" : "KÕIK";
    this.tag.dataset.scope = this.scope;
    if (open) this.input.focus(); else this.input.blur();
    this.fade();
  }

  add(entry: ChatEntry, historical = false, localTeam = 0): void {
    const row = document.createElement("div");
    row.className = "game-chat-line" + (entry.system ? " system" : "");
    row.dataset.at = String(historical ? 0 : Date.now());
    if (entry.scope === "team") {
      const t = document.createElement("span");
      t.className = "game-chat-scope";
      t.textContent = "[TIIM] ";
      row.append(t);
    }
    if (!entry.system) {
      const name = document.createElement("b");
      name.style.color = TEAM_COLORS[entry.team] ?? "#ccd5d5";
      name.textContent = entry.team === localTeam ? `${entry.displayName} (sina): ` : `${entry.displayName}: `;
      row.append(name);
    }
    const text = document.createElement("span");
    text.textContent = entry.message;
    row.append(text);
    this.log.append(row);
    while (this.log.childElementCount > MAX_LINES) this.log.firstElementChild?.remove();
    this.log.scrollTop = this.log.scrollHeight;
    this.fade();
  }

  system(message: string): void {
    this.add({ id: String(Date.now()), userId: null, displayName: "SERVER", message, createdAt: Date.now(), scope: "all", team: -1, alliance: -1, system: true });
  }

  setPeer(peer: PeerInfo): void {
    if (peer.connected) this.peerNotes.delete(peer.team); else this.peerNotes.set(peer.team, `${peer.name}: ühendus katkes`);
    this.renderWarn();
  }

  /** Server-reported lag of other players (ticks behind the server clock). */
  setLag(players: PlayerLag[], localTeam: number): void {
    this.lagNotes = [];
    for (const p of players) {
      if (p.team === localTeam) continue;
      if (!p.connected) this.peerNotes.set(p.team, `${p.name}: ühendus katkes`);
      else {
        this.peerNotes.delete(p.team);
        if (p.behind !== null && p.behind > 90) this.lagNotes.push(`${p.name} on ${Math.round(p.behind / 30)} s maas`);
      }
    }
    this.renderWarn();
  }

  setSelfBehind(ticks: number): void {
    this.selfBehind = ticks;
    this.renderWarn();
  }

  private renderWarn(): void {
    const lines = [...this.peerNotes.values(), ...this.lagNotes];
    if (this.selfBehind > 45) lines.unshift(`Sinu mäng on serverist ${Math.round(this.selfBehind / 30)} s maas — järeleaitamine…`);
    this.warn.textContent = lines.join(" · ");
    this.warn.hidden = lines.length === 0;
  }

  private fade(): void {
    const now = Date.now();
    for (const row of Array.from(this.log.children) as HTMLElement[]) {
      const at = Number(row.dataset.at ?? 0);
      row.classList.toggle("old", !this.open && now - at > FADE_MS);
    }
  }
}

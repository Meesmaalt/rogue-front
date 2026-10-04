import type { FactionId } from "../sim/factions";
import type { FactionDeck } from "../sim/deck";
import type { Command, Team } from "../sim/types";

export type NetStatus = "connecting" | "lobby" | "running" | "reconnecting" | "disconnected" | "error";
export interface NetworkTick { tick: number; commands: Command[]; hash?: string; }
export interface NetworkMember { faction: FactionId; deck: FactionDeck | null; }
export interface LockstepCallbacks {
  status?: (status: NetStatus, text: string) => void;
  assigned?: (team: Team, playerCount: number, rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" }, members?: NetworkMember[]) => void;
  started?: (seed: number, tick: number) => void;
  tick?: (packet: NetworkTick) => void;
  desync?: (tick: number, expected: string, actual: string) => void;
}

type ServerMessage =
  | { type: "welcome"; playerId: string; team: Team; playerCount: number; reconnectToken: string; faction?: string; deck?: unknown; members?: NetworkMember[]; rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" } }
  | { type: "lobby"; playerCount: number; ready: number }
  | { type: "start"; seed: number; tick: number; missionId?: string; rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" } }
  | { type: "tick"; tick: number; commands: Command[]; hashes?: Record<string, string> }
  | { type: "peer-left"; playerCount: number }
  | { type: "error"; message: string }
  | { type: "desync"; tick: number; hashes: Record<string, string> };

export class LockstepClient {
  private ws: WebSocket | null = null;
  private url = "";
  private reconnectTimer: number | null = null;
  private intentionalClose = false;
  private token = "";
  private authToken = "";
  private room = "";
  private missionId = "";
  private pending: NetworkTick[] = [];
  private currentTick = 0;
  private lastAppliedTick = 0;
  private callbacks: LockstepCallbacks;
  private spectator = false;
  private spectatorToken = "";

  constructor(callbacks: LockstepCallbacks = {}) { this.callbacks = callbacks; }

  setCallbacks(callbacks: LockstepCallbacks): void { this.callbacks = callbacks; }

  connect(room: string, missionId: string, url = defaultWsUrl(), authToken = localStorage.getItem("rogue-front.authToken") || "", spectator = false, spectatorToken = ""): void {
    this.room = room; this.authToken = authToken; this.missionId = missionId; this.url = url; this.intentionalClose = false; this.spectator = spectator; this.spectatorToken = spectatorToken;
    this.open();
  }

  private open(): void {
    this.callbacks.status?.("connecting", "Ühendun lobby serveriga…");
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.send({ type: "join", room: this.room, missionId: this.missionId, token: this.authToken, reconnectToken: this.token || undefined, lastAppliedTick: this.lastAppliedTick, spectate: this.spectator, spectatorToken: this.spectatorToken || undefined });
      this.callbacks.status?.("lobby", "Ootan teist mängijat…");
    };
    ws.onmessage = (e) => { try { this.message(JSON.parse(String(e.data)) as ServerMessage); } catch { this.callbacks.status?.("error", "Vigane serveri sõnum"); this.close(); } };
    ws.onerror = () => this.callbacks.status?.("error", "Multiplayer ühenduse viga");
    ws.onclose = () => {
      this.ws = null;
      if (!this.intentionalClose) {
        this.callbacks.status?.("reconnecting", "Ühendus katkes — proovin uuesti…");
        this.reconnectTimer = window.setTimeout(() => this.open(), 1500);
      }
    };
  }

  private message(m: ServerMessage): void {
    if (m.type === "welcome") {
      this.token = m.reconnectToken;
      this.callbacks.assigned?.(m.team, m.playerCount, m.rules, m.members);
    } else if (m.type === "lobby") {
      this.callbacks.status?.("lobby", `Lobby: ${m.playerCount}/2 mängijat`);
    } else if (m.type === "start") {
      this.currentTick = m.tick;
      this.callbacks.status?.("running", "Mäng algas");
      this.callbacks.started?.(m.seed, m.tick);
    } else if (m.type === "tick") {
      this.currentTick = Math.max(this.currentTick, m.tick);
      const packet = { tick: m.tick, commands: m.commands, hash: m.hashes?.[this.token] };
      if (m.tick <= this.lastAppliedTick) return;
      if (this.callbacks.tick) this.callbacks.tick(packet);
      else this.pending.push(packet);
    } else if (m.type === "peer-left") {
      this.callbacks.status?.("reconnecting", "Teine mängija lahkus — ootan taasühendust…");
    } else if (m.type === "error") {
      this.callbacks.status?.("error", m.message);
      this.close();
    } else if (m.type === "desync") {
      const values = Object.values(m.hashes);
      this.callbacks.desync?.(m.tick, values[0] || "", values[1] || "");
    }
  }

  /** Saada järgmise turvalise ticki käsk. Server ei luba liiga kaugele ette saata. */
  submit(command: Command): void { if (this.spectator) return; this.send({ type: "command", tick: this.currentTick + 2, command }); }

  /** Iga tick vajab kohalolu kinnitust isegi siis, kui mängijal pole käsku. */
  ack(hash = "", appliedTick = this.lastAppliedTick): void { this.lastAppliedTick = appliedTick; if (this.spectator) return; this.send({ type: "ready", tick: appliedTick + 1, hash }); }

  consume(tick: number): NetworkTick | null {
    const i = this.pending.findIndex((p) => p.tick === tick);
    if (i < 0) return null;
    return this.pending.splice(i, 1)[0]!;
  }

  close(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.ws?.close(); this.ws = null;
  }

  get appliedTick(): number { return this.lastAppliedTick; }

  get tick(): number { return this.currentTick; }

  private send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }
}

function defaultWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${import.meta.env.BASE_URL}ws`;
}

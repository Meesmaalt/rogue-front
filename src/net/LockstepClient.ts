import type { FactionId } from "../sim/factions";
import type { FactionDeck } from "../sim/deck";
import type { Command, Team } from "../sim/types";

export type NetStatus = "connecting" | "lobby" | "running" | "reconnecting" | "disconnected" | "error";
export interface NetworkTick { tick: number; commands: Command[]; hash?: string; }
export interface ChatEntry { id: string; userId: string | null; displayName: string; message: string; createdAt: number; scope: "all" | "team"; team: number; alliance: number; system?: boolean; }
export interface PeerInfo { team: number; name: string; connected: boolean; }
export interface PlayerLag { team: number; name: string; connected: boolean; /** ticks behind the server clock, null when unknown */ behind: number | null; }
export interface NetworkMember { faction: FactionId; deck: FactionDeck | null; alliance?:number;bot?:boolean;difficulty?:"easy"|"normal"|"hard"; }
export interface LockstepCallbacks {
  status?: (status: NetStatus, text: string) => void;
  assigned?: (team: Team, playerCount: number, rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" }, members?: NetworkMember[]) => void;
  started?: (seed: number, tick: number) => void;
  tick?: (packet: NetworkTick) => void;
  desync?: (tick: number, expected: string, actual: string) => void;
  chat?: (entry: ChatEntry, historical: boolean) => void;
  chatError?: (message: string) => void;
  peer?: (peer: PeerInfo) => void;
  lag?: (tick: number, players: PlayerLag[]) => void;
}

type ServerMessage =
  | { type: "welcome"; hashInterval?: number; tickRate?: number; playerId: string; team: Team; playerCount: number; reconnectToken: string; faction?: string; deck?: unknown; members?: NetworkMember[]; rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" } }
  | { type: "lobby"; playerCount: number; ready: number }
  | { type: "start"; seed: number; tick: number; missionId?: string; rules?: { income?: "standard" | "high" | "low"; fog?: "wargame" | "reduced" | "off"; victory?: "hq" | "annihilation" } }
  | { type: "tick"; tick: number; commands: Command[]; hashes?: Record<string, string> }
  | { type: "ticks"; packets: Array<{ tick: number; commands: Command[] }> }
  | { type: "chat"; message: ChatEntry }
  | { type: "chat-history"; messages: ChatEntry[] }
  | { type: "chat-error"; message: string }
  | { type: "peer"; team: number; name: string; connected: boolean }
  | { type: "status"; tick: number; players: PlayerLag[] }
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
  private hashInterval = 30;

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
      this.callbacks.status?.("lobby", "Ootan mängijate ühendusi…");
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
      if (m.hashInterval && m.hashInterval > 0) this.hashInterval = m.hashInterval;
      this.callbacks.assigned?.(m.team, m.playerCount, m.rules, m.members);
    } else if (m.type === "lobby") {
      this.callbacks.status?.("lobby", `Lobby: ${m.playerCount} mängijat`);
    } else if (m.type === "start") {
      this.currentTick = m.tick;
      this.callbacks.status?.("running", "Mäng algas");
      this.callbacks.started?.(m.seed, m.tick);
    } else if (m.type === "tick") {
      this.receiveTick(m.tick, m.commands);
    } else if (m.type === "ticks") {
      for (const packet of m.packets) this.receiveTick(packet.tick, packet.commands);
    } else if (m.type === "chat") {
      this.callbacks.chat?.(m.message, false);
    } else if (m.type === "chat-history") {
      for (const entry of m.messages) this.callbacks.chat?.(entry, true);
    } else if (m.type === "chat-error") {
      this.callbacks.chatError?.(m.message);
    } else if (m.type === "peer") {
      // Another player dropped or came back. The game itself keeps running: the server never waits for anyone.
      this.callbacks.peer?.({ team: m.team, name: m.name, connected: m.connected });
    } else if (m.type === "status") {
      this.callbacks.lag?.(m.tick, m.players);
    } else if (m.type === "error") {
      this.callbacks.status?.("error", m.message);
      this.close();
    } else if (m.type === "desync") {
      const values = Object.values(m.hashes);
      this.callbacks.desync?.(m.tick, values[0] || "", values[1] || "");
    }
  }

  private receiveTick(tick: number, commands: Command[]): void {
    this.currentTick = Math.max(this.currentTick, tick);
    if (tick <= this.lastAppliedTick) return;
    const packet = { tick, commands };
    if (this.callbacks.tick) this.callbacks.tick(packet);
    else this.pending.push(packet);
  }

  /** Saada käsk serverile. Server määrab ise, millisel tickil see täidetakse (praegune tick + sisendviide). */
  submit(command: Command): void { if (this.spectator) return; this.send({ type: "command", command }); }

  /** Anna serverile teada, et kaart ja maailm on laaditud ning kell võib käima minna. Server ei oota selle järel kedagi. */
  loaded(): void { if (!this.spectator) this.send({ type: "loaded" }); }

  /**
   * Teata, et tick on rakendatud. Kontrollsummat (kallis) arvutatakse ja saadetakse ainult iga `hashInterval` tick järel,
   * ning server ei oota seda — see on ainult desünkroonimise tuvastamiseks.
   */
  applied(tick: number, hash: () => string): void {
    this.lastAppliedTick = tick;
    if (this.spectator || tick % this.hashInterval !== 0) return;
    this.send({ type: "sync", tick, hash: hash() });
  }

  sendChat(message: string, scope: "all" | "team" = "all"): void { if (!this.spectator) this.send({ type: "chat", message, scope }); }

  /** Mitu tick'i on see klient serveri kellast maas (puhverdatud, veel rakendamata). */
  get behind(): number { return Math.max(0, this.currentTick - this.lastAppliedTick); }

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

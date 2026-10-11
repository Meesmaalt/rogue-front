import { FACTION_LIST, type FactionId } from "../sim/factions";
import { MODE_RULES, type MatchMode } from "../sim/gameModes";
import type { WorldSave } from "../sim/SaveState";

export const SAVE_PREFIX = "rogue-front.save.v2.";
const INDEX_KEY = "rogue-front.save-index.v1";
type SaveStorage = Pick<Storage, "getItem" | "setItem">;
export interface SavedSession {
  key: string;
  mission: string;
  name: string;
  faction: FactionId;
  mode: MatchMode | "campaign";
  difficulty: "easy" | "normal" | "hard";
  deployment: "base" | "ready";
  savedAt: string;
  time: number;
  status: "running" | "won" | "lost";
}

function isSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<SavedSession>;
  return typeof s.key === "string" && s.key.startsWith(SAVE_PREFIX)
    && typeof s.mission === "string" && /^[a-z0-9_-]+$/.test(s.mission)
    && typeof s.name === "string" && s.name.length <= 200
    && FACTION_LIST.includes(s.faction as FactionId)
    && (s.mode === "campaign" || Object.hasOwn(MODE_RULES, s.mode ?? ""))
    && ["easy", "normal", "hard"].includes(s.difficulty ?? "")
    && ["base", "ready"].includes(s.deployment ?? "")
    && typeof s.savedAt === "string" && Number.isFinite(Date.parse(s.savedAt))
    && typeof s.time === "number" && Number.isFinite(s.time) && s.time >= 0
    && ["running", "won", "lost"].includes(s.status ?? "");
}

/** Menu reads only a small index, never parses every full simulation snapshot. */
export function readSavedSessions(storage: SaveStorage): SavedSession[] {
  try {
    const values: unknown = JSON.parse(storage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(values) ? values.filter(isSession).slice(0, 8) : [];
  } catch { return []; }
}

/** Snapshot is authoritative; failure of the optional menu index cannot undo it. */
export function writeSavedSession(storage: SaveStorage, session: SavedSession, context: string, world: WorldSave): boolean {
  storage.setItem(session.key, JSON.stringify({ format: "rogue-front-session", context, savedAt: session.savedAt, world }));
  const sessions = [session, ...readSavedSessions(storage).filter(s => s.key !== session.key)].slice(0, 8);
  try { storage.setItem(INDEX_KEY, JSON.stringify(sessions)); return true; }
  catch { return false; }
}

/** Explicit launch fields: never replay room IDs, spectator tokens or arbitrary URL parameters. */
export function savedSessionQuery(session: SavedSession): string {
  const query = new URLSearchParams({ mission: session.mission, faction: session.faction, resume: session.key });
  if (session.mode !== "campaign") {
    query.set("mode", "skirmish"); query.set("gameMode", session.mode);
    query.set("difficulty", session.difficulty); query.set("deployment", session.deployment);
  }
  return query.toString();
}

/** Legacy raw snapshots still load; envelope context is checked before touching World. */
export function readSessionWorld(raw: string, context: string): WorldSave {
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== "object") throw new Error("Salvestuse andmed on vigased");
  if ("format" in saved) {
    if (saved.format !== "rogue-front-session") throw new Error("Tundmatu salvestuse formaat");
    if (!("context" in saved) || saved.context !== context)
      throw new Error("Salvestuse kaart, fraktsioon või režiim ei vasta sellele lahingule");
    if (!("world" in saved) || !saved.world || typeof saved.world !== "object")
      throw new Error("Salvestuse simulatsiooniseisund puudub");
    return saved.world as WorldSave; // loadWorld validates version, geometry and runtime atomically.
  }
  return saved as WorldSave;
}

/** A retry is a fresh offline battle, never another resume or a stale network-room join. */
export function restartBattleUrl(currentUrl: string): string {
  const url = new URL(currentUrl), previous = new URLSearchParams(url.search);
  url.search = ""; url.hash = "";
  if (["multiplayer", "spectator"].includes(previous.get("mode") ?? "")) return url.toString();
  for (const key of ["mission", "faction", "mode", "gameMode", "difficulty", "deployment"]) {
    const value = previous.get(key); if (value !== null) url.searchParams.set(key, value);
  }
  return url.toString();
}

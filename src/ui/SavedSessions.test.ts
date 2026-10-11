import { describe, expect, it } from "vitest";
import { World } from "../sim/World";
import { saveWorld } from "../sim/SaveState";
import { readSavedSessions, readSessionWorld, savedSessionQuery, writeSavedSession, SAVE_PREFIX, type SavedSession } from "./SavedSessions";

function memoryStorage() {
  const values = new Map<string, string>();
  const reads: string[] = [];
  return { values, reads, getItem(key: string) { reads.push(key); return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); } };
}
const session: SavedSession = { key: SAVE_PREFIX + "roheorg.layout13.conquest.usa", mission: "roheorg", name: "Roheorg",
  faction: "usa", mode: "conquest", difficulty: "hard", deployment: "base", savedAt: "2026-10-11T12:00:00Z", time: 142, status: "running" };

describe("saved battle menu", () => {
  it("indexes one authoritative snapshot and updates its existing summary without reading the world", () => {
    const storage = memoryStorage(), world = saveWorld(new World(7));
    expect(writeSavedSession(storage, session, "map", world)).toBe(true);
    writeSavedSession(storage, { ...session, time: 200 }, "map", world);
    storage.reads.length = 0;
    expect(readSavedSessions(storage)).toEqual([{ ...session, time: 200 }]);
    expect(storage.reads).not.toContain(session.key);
    expect(readSessionWorld(storage.values.get(session.key)!, "map").rngState).toBe(world.rngState);
    const query = new URLSearchParams(savedSessionQuery(session));
    expect(Object.fromEntries(query)).toEqual({ mission: "roheorg", faction: "usa", resume: session.key,
      mode: "skirmish", gameMode: "conquest", difficulty: "hard", deployment: "base" });
    const campaign = new URLSearchParams(savedSessionQuery({ ...session, mode: "campaign" }));
    expect(campaign.has("mode")).toBe(false);
  });
  it("keeps a usable snapshot when writing the menu index exceeds quota", () => {
    const storage = memoryStorage(), world = saveWorld(new World(9));
    const quota = { getItem: storage.getItem, setItem(key: string, value: string) {
      if (key !== session.key) throw new Error("QuotaExceeded"); storage.setItem(key, value);
    } };
    expect(writeSavedSession(quota, session, "map", world)).toBe(false);
    expect(readSessionWorld(storage.values.get(session.key)!, "map").time).toBe(world.time);
  });
  it("ignores damaged index entries and rejects envelope mismatches while accepting legacy saves", () => {
    const storage = memoryStorage(), world = saveWorld(new World(11));
    writeSavedSession(storage, session, "map", world);
    const index = storage.reads[0];
    storage.setItem(index, JSON.stringify([null, { ...session, faction: "unknown" }, { ...session, mode: "toString" }, session]));
    expect(readSavedSessions(storage)).toEqual([session]);
    expect(() => readSessionWorld(storage.values.get(session.key)!, "other-map")).toThrow(/kaart/);
    expect(readSessionWorld(JSON.stringify(world), "legacy").version).toBe(world.version);
    expect(() => readSessionWorld('{"format":"rogue-front-session","context":"map"}', "map")).toThrow(/simulatsioon/);
    storage.setItem(index, "broken-json"); expect(readSavedSessions(storage)).toEqual([]);
  });
});

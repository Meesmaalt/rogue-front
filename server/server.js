import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8787);
const TICK_RATE = 30;
const MAX_AHEAD = 4;
const rooms = new Map();

const json = (x) => JSON.stringify(x);
const send = (ws, message) => { if (ws.readyState === 1) ws.send(json(message)); };
const roomKey = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);

function createRoom(id, missionId) {
  return { id, missionId, seed: 0, started: false, tick: 0, players: new Map(), ready: new Map(), commands: new Map() };
}
function broadcast(room, message) { for (const p of room.players.values()) send(p.ws, message); }
function lobby(room) { broadcast(room, { type: "lobby", playerCount: room.players.size, ready: [...room.ready.values()].filter(Boolean).length }); }
function cleanup(room) { if (!room.players.size) rooms.delete(room.id); }

const httpServer = http.createServer((req, res) => {
  if (req.url === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); res.end("ok\n"); return; }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 });

wss.on("connection", (ws) => {
  let player = null;
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { send(ws, { type: "error", message: "Vigane JSON" }); return; }
    if (m.type === "join") {
      const id = roomKey(m.room);
      if (!id) return send(ws, { type: "error", message: "Ruumi nimi puudub" });
      let room = rooms.get(id);
      if (!room) { room = createRoom(id, String(m.missionId || "")); rooms.set(id, room); }
      if (room.missionId !== String(m.missionId || "")) return send(ws, { type: "error", message: "Sama ruum peab kasutama sama missiooni" });
      let token = String(m.reconnectToken || "");
      let existing = token && [...room.players.values()].find((p) => p.token === token);
      if (existing) {
        existing.ws = ws; player = existing;
      } else {
        if (room.players.size >= 2) return send(ws, { type: "error", message: "Lobby on täis" });
        player = { id: randomUUID(), token: randomUUID(), team: room.players.size === 0 ? 0 : 1, ws };
        room.players.set(player.id, player);
      }
      send(ws, { type: "welcome", playerId: player.id, team: player.team, playerCount: room.players.size, reconnectToken: player.token });
      lobby(room);
      if (room.players.size === 2 && !room.started) {
        room.started = true; room.tick = 0;
        broadcast(room, { type: "start", seed: room.seed, tick: room.tick });
        for (const id of room.players.keys()) room.ready.set(id, 1);
        advance(room);
      }
      return;
    }
    if (!player) return send(ws, { type: "error", message: "Liitu esmalt lobbyga" });
    const room = [...rooms.values()].find((r) => r.players.has(player.id));
    if (!room) return;
    if (m.type === "ready") {
      const tick = Number(m.tick);
      if (!Number.isInteger(tick) || tick < room.tick || tick > room.tick + MAX_AHEAD) return;
      room.ready.set(player.id, { tick, hash: typeof m.hash === "string" ? m.hash : "" });
      advance(room);
    } else if (m.type === "command") {
      const tick = Number(m.tick);
      if (!Number.isInteger(tick) || tick < room.tick || tick > room.tick + MAX_AHEAD) return;
      if (!m.command || typeof m.command.type !== "string") return;
      const list = room.commands.get(tick) || [];
      if (list.length >= 64) return;
      list.push({ ...m.command, team: player.team });
      room.commands.set(tick, list);
    }
  });
  ws.on("close", () => {
    if (!player) return;
    const room = [...rooms.values()].find((r) => r.players.has(player.id));
    if (!room) return;
    // Keep the player slot for reconnect; only close the room after a grace period.
    player.ws = null;
    broadcast(room, { type: "peer-left", playerCount: [...room.players.values()].filter((p) => p.ws).length });
    setTimeout(() => { if (!player.ws) { room.players.delete(player.id); room.ready.delete(player.id); cleanup(room); } }, 15000);
  });
});

function advance(room) {
  if (!room.started || room.players.size !== 2) return;
  const ids = [...room.players.keys()];
  if (!ids.every((id) => room.ready.get(id)?.tick === room.tick + 1)) return;
  const hashes = Object.fromEntries(ids.map((id) => [room.players.get(id).token, room.ready.get(id)?.hash || ""]));
  const hashValues = Object.values(hashes).filter(Boolean);
  if (hashValues.length === 2 && hashValues[0] !== hashValues[1]) {
    broadcast(room, { type: "desync", tick: room.tick + 1, hashes });
  }
  room.tick++;
  const commands = room.commands.get(room.tick) || [];
  room.commands.delete(room.tick);
  for (const id of ids) room.ready.set(id, { tick: room.tick, hash: "" });
  broadcast(room, { type: "tick", tick: room.tick, commands });
}

httpServer.listen(PORT, () => console.log(`Rogue Front lockstep server listening on :${PORT}`));

import http from "node:http";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8787);
const TICK_RATE = 30;
const MAX_AHEAD = 4;
const MAX_BODY = 256 * 1024;
const DB_PATH = process.env.ROGUE_FRONT_DB || join(process.cwd(), "data", "accounts.json");
const sessions = new Map();
const rooms = new Map();
const sockets = new Map();
const matchmaking = new Map();
const invites = new Map();
const reconnects = new Map();
const spectators = new Map();

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = loadDb();

function loadDb() {
  if (!existsSync(DB_PATH)) return { version: 3, users: {} };
  try {
    const parsed = JSON.parse(readFileSync(DB_PATH, "utf8"));
    if (parsed?.users) {
      for (const user of Object.values(parsed.users)) {
        user.stats ??= { games: 0, wins: 0, losses: 0, draws: 0 };
        user.stats.rating ??= 1000;
        user.stats.xp ??= 0;
        user.stats.level ??= 1;
        user.stats.streak ??= 0;
        user.decks ??= {};
      }
      return parsed;
    }
  } catch (err) {
    console.error("Failed to read account DB:", err);
  }
  return { version: 3, users: {} };
}

function saveDb() {
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  writeFileSync(DB_PATH, readFileSync(tmp));
}

function json(x) { return JSON.stringify(x); }
function send(ws, message) { if (ws.readyState === 1) ws.send(json(message)); }
function roomKey(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24); }
function cleanUsername(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20); }
function displayName(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 28); }
function now() { return Date.now(); }
function safeUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName, country: user.country, createdAt: user.createdAt, lastSeen: user.lastSeen, stats: user.stats, friends: [...user.friends], decks: user.decks || {} };
}
function publicPlayer(user) {
  const online = [...sessions.values()].some((s) => s.userId === user.id);
  return { id: user.id, username: user.username, displayName: user.displayName, country: user.country, online, stats: user.stats };
}
function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "hex");
  return target.length === actual.length && timingSafeEqual(target, actual);
}
function userById(id) { return Object.values(db.users).find(user => user.id === id) || null; }
function authToken() { return randomUUID() + randomUUID().replaceAll("-", ""); }
function getUser(req) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = sessions.get(token);
  if (!session) return null;
  const user = userById(session.userId);
  if (!user) return null;
  user.lastSeen = now();
  return { user, token };
}
function response(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}
function eloAfter(a, b, score) {
  const expected = 1 / (1 + Math.pow(10, (b - a) / 400));
  return Math.round(a + 32 * (score - expected));
}
function addProgress(user, result, opponentRating = 1000) {
  const score = result === "win" ? 1 : result === "loss" ? 0 : 0.5;
  const oldRating = user.stats.rating ?? 1000;
  user.stats.rating = Math.max(0, eloAfter(oldRating, opponentRating, score));
  user.stats.games += 1;
  if (result === "win") { user.stats.wins += 1; user.stats.streak = Math.max(0, user.stats.streak || 0) + 1; }
  else if (result === "loss") { user.stats.losses += 1; user.stats.streak = 0; }
  else user.stats.draws += 1;
  const gain = result === "win" ? 100 : result === "draw" ? 40 : 25;
  user.stats.xp = (user.stats.xp ?? 0) + gain;
  user.stats.level = Math.floor(user.stats.xp / 500) + 1;
}
function createRoom(hostUser, input) {
  const id = roomKey(input.id || randomUUID().slice(0, 8));
  if (!id || rooms.has(id)) return null;
  const missionId = String(input.missionId || "").slice(0, 80);
  const name = displayName(input.name) || `${hostUser.displayName} lobby`;
  const room = {
    id,
    name,
    missionId,
    mapId: String(input.mapId || "").slice(0, 80),
    rules: sanitizeRules(input.rules),
    hostId: hostUser.id,
    status: "waiting",
    createdAt: now(),
    startedAt: null,
    members: new Map(),
    tick: 0,
    commands: new Map(),
    wsState: new Map(),
    history: new Map(),
    desynced: false,
    chat: [],
    spectators: new Set(),
    resultRecorded: false,
    resultByUser: new Map(),
    reconnect: new Map(),
  };
  room.members.set(hostUser.id, makeMember(hostUser, input.faction, input.deck, true));
  rooms.set(id, room);
  return room;
}
function sanitizeRules(rules) {
  const r = rules && typeof rules === "object" ? rules : {};
  return {
    income: ["standard", "high", "low"].includes(r.income) ? r.income : "standard",
    fog: ["wargame", "reduced", "off"].includes(r.fog) ? r.fog : "wargame",
    victory: ["hq", "annihilation"].includes(r.victory) ? r.victory : "hq",
  };
}
function makeMember(user, faction = "usa", deck = null, ready = false) {
  return { userId: user.id, username: user.username, displayName: user.displayName, faction: ["usa", "russia", "china"].includes(faction) ? faction : "usa", deck: deck && typeof deck === "object" ? deck : null, ready: !!ready, joinedAt: now() };
}
function roomView(room) {
  return {
    id: room.id,
    name: room.name,
    missionId: room.missionId,
    mapId: room.mapId,
    rules: room.rules,
    hostId: room.hostId,
    status: room.status,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    members: [...room.members.values()].map((m) => ({ ...m, deck: m.deck ? { name: m.deck.name, faction: m.deck.faction, slots: m.deck.slots } : null, online: [...sessions.values()].some((s) => s.userId === m.userId) })),
  };
}
function isMember(room, userId) { return room.members.get(userId) || null; }
function findRoomForUser(userId) { return [...rooms.values()].find((r) => r.members.has(userId) && r.status !== "finished"); }
function ensureRoomCanEdit(room, userId) { return room.hostId === userId && room.status === "waiting"; }
function broadcastRoom(room, message) {
  for (const member of room.members.values()) {
    const set = sockets.get(member.userId);
    if (!set) continue;
    for (const ws of set) send(ws, message);
  }
}
function leaveRoom(room, userId) {
  if (room.status === "started") {
    return;
  }
  room.members.delete(userId);
  room.reconnect?.delete(userId);
  if (room.hostId === userId) {
    const next = room.members.values().next().value;
    room.hostId = next?.userId || null;
    if (next) next.ready = false;
  }
  if (!room.members.size) rooms.delete(room.id);
  else broadcastRoom(room, { type: "room", room: roomView(room) });
}

function tryMatchmake() {
  const candidates = [...matchmaking.values()].sort((a,b) => a.joinedAt - b.joinedAt);
  for (let i=0; i<candidates.length; i++) {
    const a = candidates[i];
    if (!matchmaking.has(a.userId)) continue;
    let best = null;
    for (let j=i+1; j<candidates.length; j++) {
      const b = candidates[j]; if (!matchmaking.has(b.userId)) continue;
      if (Math.abs((a.rating ?? 1000) - (b.rating ?? 1000)) <= 250) { best=b; break; }
    }
    if (!best) continue;
    const ua=userById(a.userId), ub=userById(best.userId);
    const room=createRoom(ua,{ name:`Ranked: ${ua.displayName} vs ${ub.displayName}`, missionId:"operation-coast", mapId:"coast", rules:{income:"standard",fog:"wargame",victory:"hq"}, faction:a.faction, deck:a.deck });
    if (!room) continue;
    room.members.set(ub.id, makeMember(ub,best.faction,best.deck,false)); room.ranked=true; room.ratings={ [ua.id]:a.rating ?? 1000, [ub.id]:best.rating ?? 1000 };
    matchmaking.delete(ua.id); matchmaking.delete(ub.id);
    broadcastRoom(room,{type:"match-found",room:roomView(room)});
  }
}

const httpServer = http.createServer(async (req, res) => {
  try {
    if (req.url === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); res.end("ok\n"); return; }
    if (!req.url?.startsWith("/api/")) { res.writeHead(404); res.end(); return; }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const path = url.pathname;

    if (path === "/api/auth/register" && req.method === "POST") {
      const b = await body(req);
      const username = cleanUsername(b.username);
      const password = String(b.password || "");
      const name = displayName(b.displayName) || username;
      if (!/^[a-z0-9_-]{3,20}$/.test(username)) return response(res, 400, { error: "Kasutajanimi peab olema 3–20 tähemärki." });
      if (password.length < 8 || password.length > 128) return response(res, 400, { error: "Parool peab olema 8–128 tähemärki." });
      if (db.users[username]) return response(res, 409, { error: "See kasutajanimi on juba kasutusel." });
      const user = { id: randomUUID(), username, displayName: name, country: String(b.country || "EE").slice(0, 2).toUpperCase(), password: hashPassword(password), createdAt: now(), lastSeen: now(), friends: [], stats: { games: 0, wins: 0, losses: 0, draws: 0, rating: 1000, xp: 0, level: 1, streak: 0 }, decks: {} };
      db.users[username] = user;
      saveDb();
      const token = authToken(); sessions.set(token, { userId: user.id, createdAt: now() });
      return response(res, 201, { token, user: safeUser(user) });
    }

    if (path === "/api/auth/login" && req.method === "POST") {
      const b = await body(req);
      const username = cleanUsername(b.username);
      const user = db.users[username];
      if (!user || !verifyPassword(String(b.password || ""), user.password)) return response(res, 401, { error: "Vale kasutajanimi või parool." });
      user.lastSeen = now(); saveDb();
      const token = authToken(); sessions.set(token, { userId: user.id, createdAt: now() });
      return response(res, 200, { token, user: safeUser(user) });
    }

    const auth = getUser(req);
    if (!auth) return response(res, 401, { error: "Autentimine nõutud." });
    const { user, token } = auth;

    if (path === "/api/auth/logout" && req.method === "POST") { sessions.delete(token); return response(res, 200, { ok: true }); }
    if (path === "/api/me" && req.method === "GET") return response(res, 200, { user: safeUser(user), activeRoom: findRoomForUser(user.id) ? roomView(findRoomForUser(user.id)) : null });
    if (path === "/api/decks" && req.method === "GET") return response(res, 200, { decks: user.decks || {} });
    if (path === "/api/decks" && req.method === "PUT") {
      const b = await body(req); const faction = String(b.faction || ""); const deck = b.deck;
      if (!["usa", "russia", "china"].includes(faction) || !deck || typeof deck !== "object") return response(res, 400, { error: "Vigane deck." });
      const slots = Array.isArray(deck.slots) ? deck.slots.slice(0, 40).map((x) => ({ kind: String(x.kind || "").slice(0, 40), count: Math.max(0, Math.min(20, Number(x.count) || 0)) })).filter((x) => x.kind && x.count) : [];
      user.decks[faction] = { faction, name: displayName(deck.name) || `${faction} deck`, slots, updatedAt: now() }; saveDb();
      return response(res, 200, { deck: user.decks[faction] });
    }
    if (path === "/api/leaderboard" && req.method === "GET") {
      const players = Object.values(db.users).sort((a,b) => (b.stats.rating ?? 1000) - (a.stats.rating ?? 1000)).slice(0, 50).map(publicPlayer);
      return response(res, 200, { players });
    }
    if (path === "/api/live-games" && req.method === "GET") {
      const games = [...rooms.values()].filter(r => r.status === "started").map(r => ({ ...roomView(r), spectators: r.spectators?.size || 0, ranked: !!r.ranked }));
      return response(res, 200, { games });
    }
    if (path === "/api/matchmaking/status" && req.method === "GET") {
      const q = matchmaking.get(user.id); return response(res, 200, { queued: !!q, joinedAt: q?.joinedAt || null, room: q?.roomId && rooms.get(q.roomId) ? roomView(rooms.get(q.roomId)) : null });
    }
    if (path === "/api/matchmaking/leave" && req.method === "POST") { matchmaking.delete(user.id); return response(res, 200, { ok: true }); }
    if (path === "/api/matchmaking/join" && req.method === "POST") {
      if (findRoomForUser(user.id)) return response(res, 409, { error: "Lahku enne olemasolevast mänguruumist." });
      const b = await body(req); const faction = ["usa","russia","china"].includes(b.faction) ? b.faction : "usa"; const deck = b.deck && typeof b.deck === "object" ? b.deck : user.decks?.[faction] || null;
      matchmaking.set(user.id, { userId: user.id, faction, deck, joinedAt: now(), rating: user.stats.rating ?? 1000 });
      tryMatchmake();
      const q = matchmaking.get(user.id); return response(res, 200, { queued: !!q, room: q?.roomId ? roomView(rooms.get(q.roomId)) : null });
    }
    if (path === "/api/invites" && req.method === "GET") {
      const list = [...invites.values()].filter((i) => i.toUserId === user.id && i.status === "pending").map((i) => ({ ...i, from: publicPlayer(userById(i.fromUserId)) }));
      return response(res, 200, { invites: list });
    }
    if (path === "/api/invites" && req.method === "POST") {
      const b = await body(req); const target = Object.values(db.users).find((u) => u.id === b.userId); const room = rooms.get(roomKey(b.roomId));
      if (!target || !room || room.hostId !== user.id || !room.members.has(user.id)) return response(res, 400, { error: "Kutset ei saa luua." });
      const invite = { id: randomUUID(), roomId: room.id, fromUserId: user.id, toUserId: target.id, createdAt: now(), status: "pending" }; invites.set(invite.id, invite);
      return response(res, 201, { invite });
    }
    if (path.startsWith("/api/invites/") && req.method === "POST") {
      const id = path.split("/").pop(); const invite = invites.get(id); if (!invite || invite.toUserId !== user.id) return response(res, 404, { error: "Kutset ei leitud." });
      const b = await body(req); const room = rooms.get(invite.roomId); if (!room || room.status !== "waiting" || room.members.size >= 2) return response(res, 409, { error: "Mänguruum pole enam saadaval." });
      if (b.accept === false) { invite.status = "declined"; return response(res, 200, { ok: true }); }
      const existing = findRoomForUser(user.id); if (existing) return response(res, 409, { error: "Oled juba mänguruumis." });
      const member = makeMember(user, b.faction || "usa", b.deck || user.decks?.[b.faction || "usa"] || null, false); room.members.set(user.id, member); invite.status = "accepted"; broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
    }

    if (path === "/api/players" && req.method === "GET") {
      const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
      const players = Object.values(db.users).filter((u) => u.id !== user.id && (!q || u.username.includes(q) || u.displayName.toLowerCase().includes(q))).slice(0, 30).map(publicPlayer);
      return response(res, 200, { players });
    }
    if (path === "/api/friends" && req.method === "GET") {
      const friends = user.friends.map((id) => Object.values(db.users).find((u) => u.id === id)).filter(Boolean).map(publicPlayer);
      return response(res, 200, { friends });
    }
    if (path === "/api/friends/add" && req.method === "POST") {
      const b = await body(req); const target = Object.values(db.users).find((u) => u.id === b.userId || u.username === cleanUsername(b.username));
      if (!target || target.id === user.id) return response(res, 404, { error: "Mängijat ei leitud." });
      if (!user.friends.includes(target.id)) user.friends.push(target.id);
      if (!target.friends.includes(user.id)) target.friends.push(user.id);
      saveDb(); return response(res, 200, { user: safeUser(user), friend: publicPlayer(target) });
    }

    if (path === "/api/rooms" && req.method === "GET") {
      return response(res, 200, { rooms: [...rooms.values()].filter((r) => r.status === "waiting" && r.members.size < 2).map(roomView), myRoom: findRoomForUser(user.id) ? roomView(findRoomForUser(user.id)) : null });
    }
    if (path === "/api/rooms" && req.method === "POST") {
      const existing = findRoomForUser(user.id); if (existing) return response(res, 409, { error: "Sa oled juba mänguruumis." });
      const room = createRoom(user, await body(req));
      if (!room) return response(res, 409, { error: "Selle ruumi ID on juba kasutusel." });
      return response(res, 201, { room: roomView(room) });
    }

    if (path.match(/^\/api\/rooms\/[^/]+\/spectate$/) && req.method === "POST") {
      const id = roomKey(path.split("/")[3]); const room=rooms.get(id); if (!room || room.status !== "started") return response(res,404,{error:"Mäng ei ole alanud."});
      const token=randomUUID(); spectators.set(token,{userId:user.id,roomId:room.id,createdAt:now()}); room.spectators.add(user.id); return response(res,200,{token,room:roomView(room)});
    }
    const roomMatch = path.match(/^\/api\/rooms\/([^/]+)(?:\/(.+))?$/);
    if (roomMatch) {
      const id = roomKey(roomMatch[1]); const action = roomMatch[2] || ""; const room = rooms.get(id);
      if (!room) return response(res, 404, { error: "Mänguruumi ei leitud." });
      if (req.method === "GET" && !action) return response(res, 200, { room: roomView(room) });
      if (req.method === "POST" && action === "join") {
        if (room.status !== "waiting" || room.members.size >= 2) return response(res, 409, { error: "Mänguruum on täis või juba alanud." });
        const existing = findRoomForUser(user.id); if (existing && existing.id !== room.id) return response(res, 409, { error: "Sa oled juba teises mänguruumis." });
        const b = await body(req); room.members.set(user.id, makeMember(user, b.faction, b.deck, false));
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if (req.method === "POST" && action === "leave") {
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        leaveRoom(room, user.id); return response(res, 200, { ok: true });
      }
      if (req.method === "POST" && action === "ready") {
        const member = isMember(room, user.id); if (!member) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        if (room.status !== "waiting") return response(res, 409, { error: "Lobby on lukus." });
        const b = await body(req); member.ready = !!b.ready; if (["usa", "russia", "china"].includes(b.faction)) member.faction = b.faction;
        if (b.deck && typeof b.deck === "object") member.deck = b.deck;
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if (req.method === "POST" && action === "settings") {
        if (!ensureRoomCanEdit(room, user.id)) return response(res, 403, { error: "Ainult host saab lobby seadeid muuta." });
        const b = await body(req); if (b.name != null) room.name = displayName(b.name) || room.name; if (b.missionId) room.missionId = String(b.missionId).slice(0, 80); if (b.mapId) room.mapId = String(b.mapId).slice(0, 80); room.rules = sanitizeRules(b.rules); for (const m of room.members.values()) m.ready = false;
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if (req.method === "GET" && action === "chat") {
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        return response(res, 200, { messages: room.chat.slice(-60) });
      }
      if (req.method === "POST" && action === "chat") {
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        const b = await body(req); const message = String(b.message || "").trim().slice(0, 500);
        if (!message) return response(res, 400, { error: "Sõnum on tühi." });
        room.chat.push({ id: randomUUID(), userId: user.id, displayName: user.displayName, message, createdAt: now() });
        room.chat = room.chat.slice(-60); broadcastRoom(room, { type: "chat", roomId: room.id, message: room.chat.at(-1) });
        return response(res, 200, { messages: room.chat.slice(-60) });
      }
      if (req.method === "POST" && action === "start") {
        if (!ensureRoomCanEdit(room, user.id)) return response(res, 403, { error: "Ainult host saab mängu alustada." });
        if (room.members.size !== 2) return response(res, 409, { error: "Mängu alustamiseks on vaja kahte mängijat." });
        if (![...room.members.values()].every((m) => m.ready)) return response(res, 409, { error: "Mõlemad mängijad peavad olema READY." });
        room.status = "started"; room.startedAt = now();
        broadcastRoom(room, { type: "started", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
    }

    if (path === "/api/match/result" && req.method === "POST") {
      const b = await body(req); const result = ["win","loss","draw"].includes(b.result) ? b.result : "draw"; const room=rooms.get(roomKey(b.roomId));
      if (!room || room.status !== "started" || !room.members.has(user.id)) return response(res,409,{error:"Kehtivat mängu ei leitud."});
      if (room.resultByUser.has(user.id)) return response(res,200,{stats:user.stats,duplicate:true});
      const opponent=[...room.members.values()].find(m=>m.userId!==user.id); const opponentUser=opponent?db.users[Object.values(db.users).find(u=>u.id===opponent.userId)?.username || ""]:null;
      addProgress(user,result,opponentUser?.stats?.rating ?? 1000); room.resultByUser.set(user.id,result);
      if (room.resultByUser.size >= room.members.size) { room.status="finished"; room.finishedAt=now(); broadcastRoom(room,{type:"finished",room:roomView(room)}); }
      saveDb(); return response(res,200,{stats:user.stats});
    }

    return response(res, 404, { error: "API endpointi ei leitud." });
  } catch (err) {
    console.error(err); return response(res, 400, { error: err instanceof Error ? err.message : "Vigane päring." });
  }
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws", maxPayload: 64 * 1024 });

function addSocket(userId, ws) { if (!sockets.has(userId)) sockets.set(userId, new Set()); sockets.get(userId).add(ws); }
function removeSocket(userId, ws) { const set = sockets.get(userId); if (!set) return; set.delete(ws); if (!set.size) sockets.delete(userId); }

wss.on("connection", (ws) => {
  let player = null;
  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(String(raw)); } catch { send(ws, { type: "error", message: "Vigane JSON" }); return; }
    if (!player) {
      if (m.type !== "join") return send(ws, { type: "error", message: "Autentimine ja lobbyga liitumine on nõutud." });
      const session = sessions.get(String(m.token || "")); const user = session ? userById(session.userId) : null; const id = roomKey(m.room); const room = rooms.get(id);
      if (!user || !room) return send(ws, { type: "error", message: "Sessioon või mänguruum ei kehti." });
      if (m.missionId !== room.missionId) return send(ws,{type:"error",message:"Valitud kaart ei ühti mänguruumi kaardiga."});
      if (room.status !== "started") return send(ws, { type: "error", message: "Mäng ei ole veel alanud." });
      const member = room.members.get(user.id);
      const lastAppliedTick = Number(m.lastAppliedTick ?? 0);
      if (!Number.isInteger(lastAppliedTick) || lastAppliedTick < 0 || lastAppliedTick > room.tick || lastAppliedTick < room.tick - 1800) return send(ws,{type:"error",message:"Taastatava mängu olek on liiga vana. Alusta uut lahingut."});
      const members = [...room.members.values()].map(p => ({faction:p.faction,deck:p.deck}));
      if (m.spectate) {
        const grant = spectators.get(String(m.spectatorToken || ""));
        if (!grant || grant.userId !== user.id || grant.roomId !== room.id) return send(ws,{type:"error",message:"Pealtvaataja token ei kehti."});
        player={userId:user.id,team:-1,room,ws,tick:room.tick,token:String(m.spectatorToken),spectator:true}; addSocket(user.id,ws);
        send(ws,{type:"welcome",team:0,playerId:user.id,reconnectToken:String(m.spectatorToken),members,playerCount:room.members.size,rules:room.rules});
        send(ws,{type:"start",seed:0,tick:room.tick,missionId:room.missionId,rules:room.rules});
        for (const packet of room.history.values()) if(packet.tick>lastAppliedTick) send(ws,packet);
        return;
      }
      if (!member) return send(ws, { type: "error", message: "Sa ei kuulu sellesse mänguruumi." });
      let reconnect = room.reconnect.get(user.id);
      if (m.reconnectToken && reconnect && reconnect.token === m.reconnectToken) { reconnect.ws = ws; reconnect.connected = true; }
      const team = [...room.members.keys()].indexOf(user.id);
      player = { userId: user.id, team, room, ws, tick: lastAppliedTick, token: reconnect?.token || randomUUID(), spectator:false };
      const previousSocket = room.reconnect.get(user.id)?.ws;
      if(previousSocket && previousSocket !== ws) previousSocket.close();
      room.wsState.delete(user.id);
      room.reconnect.set(user.id,{token:player.token,connected:true,ws}); addSocket(user.id, ws);
      send(ws, { type: "welcome", playerId: user.id, team, playerCount: room.members.size, reconnectToken: player.token, faction: member.faction, deck: member.deck, members, rules: room.rules, reconnect: !!reconnect });
      send(ws, { type: "start", seed: 0, tick: room.tick, missionId: room.missionId, rules: room.rules });
      for (const packet of room.history.values()) if(packet.tick>lastAppliedTick) send(ws,packet);
      return;
    }
    const room = player.room;
    if(player.spectator || room.reconnect.get(player.userId)?.ws !== ws || room.desynced) return;
    if (m.type === "ready") {
      const tick = Number(m.tick); if (!Number.isInteger(tick) || tick < player.tick || tick > player.tick + MAX_AHEAD) return;
      player.tick = tick; player.hash = typeof m.hash === "string" ? m.hash : ""; room.wsState.set(player.userId, { tick, hash: player.hash }); advance(room); return;
    }
    if (m.type === "command") {
      const tick = Number(m.tick); if (!Number.isInteger(tick) || tick <= room.tick || tick > room.tick + MAX_AHEAD) return;
      if (!m.command || typeof m.command.type !== "string") return;
      const list = room.commands?.get(tick) || [];
      if (list.length >= 64) return;
      list.push({ ...m.command, team: player.team }); room.commands ??= new Map(); room.commands.set(tick, list);
    }
  });
  ws.on("close", () => { if (!player) return; removeSocket(player.userId, ws); if (!player.spectator) { const r=player.room.reconnect.get(player.userId); if (r && r.ws===ws) { r.connected=false; player.room.wsState.delete(player.userId); broadcastRoom(player.room,{type:"peer-left",playerCount:1}); } } });
});

function advance(room) {
  if(room.desynced) return;
  const playerStates = [...room.members.keys()].map(id => ({id,ws:room.reconnect.get(id)?.ws}));
  if (playerStates.length !== 2 || !playerStates.every(p => p.ws?.readyState === 1 && room.wsState.get(p.id)?.tick === room.tick + 1)) return;
  const hashes = Object.fromEntries(playerStates.map(p => [p.id,room.wsState.get(p.id).hash]));
  const values = Object.values(hashes);
  if(values.every(Boolean) && values[0] !== values[1]) {
    room.desynced = true;
    for(const p of playerStates) send(p.ws,{type:"desync",tick:room.tick,hashes});
    return;
  }
  room.tick += 1;
  const commands = room.commands.get(room.tick) || []; room.commands.delete(room.tick);
  const packet = { type: "tick", tick: room.tick, commands };
  room.history.set(room.tick,packet);
  room.history.delete(room.tick-1800);
  for (const p of playerStates) send(p.ws,packet);
  for (const spec of room.spectators) for (const ws of sockets.get(spec) || []) send(ws,packet);
}

httpServer.listen(PORT, () => console.log(`Rogue Front server listening on :${PORT}`));

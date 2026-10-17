import {generateServerMap,generateServerMission,mapOptions} from "./map-generation.js";
import {isProceduralMapId} from "./map-policy.js";
import http from "node:http";
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8787);
const TICK_RATE = 30;
const TICK_MS = 1000 / TICK_RATE;
// Server-clocked lockstep: the server owns the game clock and never waits for slow clients.
const INPUT_DELAY = 3;                       // ticks between receiving a command and executing it
const HASH_INTERVAL = Math.max(1, Number(process.env.ROGUE_HASH_INTERVAL) || 30); // clients report world hash every N ticks
const HISTORY_TICKS = 9000;                  // 5 min of tick packets kept for reconnect / catch-up
const MAX_BUFFERED = 4 * 1024 * 1024;        // drop a socket whose send buffer grows beyond this (it resyncs on reconnect)
const MAX_CATCHUP_TICKS = 5;                 // max ticks run per clock wake-up if the server itself is late
const LOAD_TIMEOUT_MS = 60000;               // start the clock this long after the first player joined even if others still load
const IDLE_PAUSE_MS = 20000;                 // pause the clock when no human has been connected this long
const IDLE_DELETE_MS = 30 * 60000;           // drop a room nobody came back to
const STATUS_EVERY = 60;                     // broadcast lag status every N ticks
const CHAT_MAX = 300;
const CHAT_RATE_WINDOW_MS = 8000;
const CHAT_RATE_LIMIT = 6;
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
async function createRoom(hostUser, input) {
  const id = roomKey(input.id || randomUUID().slice(0, 8));
  if (!id || rooms.has(id)) return null;
  const requestedId=String(input.missionId||"").slice(0,80);
  if(requestedId&&!isProceduralMapId(requestedId))return null;
  const format=['duel','teams','ffa'].includes(input.format)?input.format:'duel';
  const capacity=format==='duel'?2:4;const mapInput=input.mapOptions??mapOptions(requestedId);
  const missionId=await generateServerMap({...mapInput,options:{...mapInput.options,players:capacity}});
  if(rooms.has(id)||findRoomForUser(hostUser.id))return null;
  const name = displayName(input.name) || `${hostUser.displayName} lobby`;
  const room = {
    id,
    name,
    missionId,
    mapId: missionId,
    rules: sanitizeRules(input.rules),
    format,capacity,hostId: hostUser.id,
    status: "waiting",
    createdAt: now(),
    startedAt: null,
    members: new Map(),
    tick: 0,
    commands: new Map(),
    history: new Map(),
    desynced: false,
    running: false,
    nextTickAt: 0,
    firstJoinAt: 0,
    idleSince: 0,
    loaded: new Set(),
    applied: new Map(),
    hashes: new Map(),
    chatRate: new Map(),
    chat: [],
    spectators: new Set(),
    resultRecorded: false,
    resultByUser: new Map(),
    reconnect: new Map(),
  };
  room.members.set(hostUser.id, {...makeMember(hostUser, input.faction, input.deck, true),alliance:0});
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
function joinMember(room,user,faction,deck){const used=[...room.members.values()];let alliance=[0,1,2,3].find(a=>!used.some(m=>m.alliance===a))??0;if(room.format==='teams')alliance=[0,1].sort((a,b)=>used.filter(m=>m.alliance===a).length-used.filter(m=>m.alliance===b).length||a-b)[0];return {...makeMember(user,faction,deck,false),alliance};}
function humanMembers(room){return [...room.members.values()].filter(m=>!m.bot);}
function roomView(room) {
  return {
    format:room.format,capacity:room.capacity,id: room.id,
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
function ensureRoomCanEdit(room, userId) { return room.hostId === userId && room.status === "waiting" && !room.generating; }
function broadcastRoom(room, message) {
  for (const member of room.members.values()) {
    const set = sockets.get(member.userId);
    if (!set) continue;
    for (const ws of set) send(ws, message);
  }
}
function memberTeam(room, userId) { return [...room.members.keys()].indexOf(userId); }
function cleanChat(value, max) { return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max); }
function chatEntry(room, user, message, scope) {
  const team = memberTeam(room, user.id);
  return { id: randomUUID(), userId: user.id, displayName: user.displayName, message, createdAt: now(), scope, team, alliance: room.members.get(user.id)?.alliance ?? team };
}
function systemChat(room, message) {
  pushChat(room, { id: randomUUID(), userId: null, displayName: "SERVER", message, createdAt: now(), scope: "all", team: -1, alliance: -1, system: true });
}
function chatVisible(room, entry, userId) {
  if (entry.scope !== "team") return true;
  const m = room.members.get(userId);
  return !!m && (m.alliance ?? -1) === entry.alliance;
}
function pushChat(room, entry) {
  room.chat.push(entry); room.chat = room.chat.slice(-60);
  const message = { type: "chat", roomId: room.id, message: entry };
  for (const member of room.members.values()) {
    if (member.bot || !chatVisible(room, entry, member.userId)) continue;
    for (const ws of sockets.get(member.userId) || []) send(ws, message);
  }
  if (entry.scope !== "team") for (const spec of room.spectators) for (const ws of sockets.get(spec) || []) send(ws, message);
}
function handleGameChat(room, player, m) {
  const message = cleanChat(m.message, CHAT_MAX);
  if (!message) return;
  const t = now();
  const times = (room.chatRate.get(player.userId) || []).filter(x => t - x < CHAT_RATE_WINDOW_MS);
  if (times.length >= CHAT_RATE_LIMIT) { send(player.ws, { type: "chat-error", message: "Liiga kiire vestlus — oota hetk." }); return; }
  times.push(t); room.chatRate.set(player.userId, times);
  const user = userById(player.userId); if (!user) return;
  const scope = m.scope === "team" && room.format === "teams" ? "team" : "all";
  pushChat(room, chatEntry(room, user, message, scope));
}
function leaveRoom(room, userId) {
  if (room.status === "started") {
    return;
  }
  room.members.delete(userId);
  room.reconnect?.delete(userId);
  if (room.hostId === userId) {
    const next = humanMembers(room)[0];
    room.hostId = next?.userId || null;
    if (next) next.ready = false;
  }
  if (!humanMembers(room).length) rooms.delete(room.id);
  else broadcastRoom(room, { type: "room", room: roomView(room) });
}

async function tryMatchmake() {
  const candidates = [...matchmaking.values()].sort((a,b) => a.joinedAt - b.joinedAt);
  for (let i=0; i<candidates.length; i++) {
    const a = candidates[i];
    if (!matchmaking.has(a.userId)||a.generating) continue;
    let best = null;
    for (let j=i+1; j<candidates.length; j++) {
      const b = candidates[j]; if (!matchmaking.has(b.userId)||b.generating) continue;
      if (Math.abs((a.rating ?? 1000) - (b.rating ?? 1000)) <= 250) { best=b; break; }
    }
    if (!best) continue;
    const ua=userById(a.userId), ub=userById(best.userId);
    a.generating=true;best.generating=true;
    let room;
    try{room=await createRoom(ua,{ name:`Ranked: ${ua.displayName} vs ${ub.displayName}`, mapOptions:{archetype:"balanced",size:4096}, rules:{income:"standard",fog:"wargame",victory:"hq"}, faction:a.faction, deck:a.deck });}
    catch{continue;}
    finally{a.generating=false;best.generating=false;}
    if (!room) continue;
    if(matchmaking.get(ua.id)!==a||matchmaking.get(ub.id)!==best||findRoomForUser(ub.id)){rooms.delete(room.id);continue;}
    room.members.set(ub.id, joinMember(room,ub,best.faction,best.deck)); room.ranked=true; room.ratings={ [ua.id]:a.rating ?? 1000, [ub.id]:best.rating ?? 1000 };
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

    if(path==="/api/maps/generate"&&req.method==="POST"){
      try{const mission=await generateServerMission(await body(req));return response(res,200,{missionId:mission.id,mission});}
      catch(error){return response(res,503,{error:error.message});}
    }

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
      if(matchmaking.get(user.id)?.generating)return response(res,409,{error:"Sinu lahingu kaarti alles luuakse."});
      const b = await body(req); const faction = ["usa","russia","china"].includes(b.faction) ? b.faction : "usa"; const deck = b.deck && typeof b.deck === "object" ? b.deck : user.decks?.[faction] || null;
      matchmaking.set(user.id, { userId: user.id, faction, deck, joinedAt: now(), rating: user.stats.rating ?? 1000 });
      await tryMatchmake();
      const q = matchmaking.get(user.id); return response(res, 200, { queued: !!q, room: q?.roomId ? roomView(rooms.get(q.roomId)) : null });
    }
    if (path === "/api/invites" && req.method === "GET") {
      const list = [...invites.values()].filter((i) => i.toUserId === user.id && i.status === "pending" && rooms.get(i.roomId)?.status === "waiting" && rooms.get(i.roomId)?.members.size < rooms.get(i.roomId)?.capacity).map((i) => ({ ...i, from: publicPlayer(userById(i.fromUserId)) }));
      return response(res, 200, { invites: list });
    }
    if (path === "/api/invites" && req.method === "POST") {
      const b = await body(req); const target = Object.values(db.users).find((u) => u.id === b.userId); const room = rooms.get(roomKey(b.roomId));
      if (!target || !room || room.hostId !== user.id || !room.members.has(user.id)) return response(res, 400, { error: "Kutset ei saa luua." });
      const invite = { id: randomUUID(), roomId: room.id, fromUserId: user.id, toUserId: target.id, createdAt: now(), status: "pending" }; invites.set(invite.id, invite);
      return response(res, 201, { invite });
    }
    if (path.startsWith("/api/invites/") && req.method === "POST") {
      const id = path.split("/").pop(); const invite = invites.get(id); if (!invite || invite.toUserId !== user.id || invite.status !== "pending") return response(res, 404, { error: "Kutset ei leitud." });
      const b = await body(req); if(invite.status!=="pending")return response(res,409,{error:"Kutsele on juba vastatud."}); if (b.accept === false) { invite.status = "declined"; return response(res, 200, { ok: true }); }
      const room = rooms.get(invite.roomId); if (!room || room.status !== "waiting" || room.members.size >= room.capacity) return response(res, 409, { error: "Mänguruum pole enam saadaval." });
      const existing = findRoomForUser(user.id); if (existing) return response(res, 409, { error: "Oled juba mänguruumis." });
      const member = joinMember(room,user,b.faction||"usa",b.deck||user.decks?.[b.faction||"usa"]||null); room.members.set(user.id, member); invite.status = "accepted"; broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
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
      return response(res, 200, { rooms: [...rooms.values()].filter((r) => r.status === "waiting" && r.members.size < r.capacity).map(roomView), myRoom: findRoomForUser(user.id) ? roomView(findRoomForUser(user.id)) : null });
    }
    if (path === "/api/rooms" && req.method === "POST") {
      const existing = findRoomForUser(user.id); if (existing) return response(res, 409, { error: "Sa oled juba mänguruumis." });
      const room = await createRoom(user, await body(req));
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
        const b = await body(req);
        if (rooms.get(id)!==room || room.status !== "waiting" || room.members.size >= room.capacity) return response(res, 409, { error: "Mänguruum on täis või juba alanud." });
        const existing = findRoomForUser(user.id); if (existing && existing.id !== room.id) return response(res, 409, { error: "Sa oled juba teises mänguruumis." });
        room.members.set(user.id, joinMember(room,user,b.faction,b.deck));
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if (req.method === "POST" && action === "leave") {
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        if(room.status!=="waiting")return response(res,409,{error:"Lahing on juba alanud."});
        leaveRoom(room, user.id); return response(res, 200, { ok: true });
      }
      if (req.method === "POST" && action === "ready") {
        const b = await body(req);
        const member = isMember(room, user.id); if (!member) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        if (room.status !== "waiting" || room.generating) return response(res, 409, { error: "Lobby on lukus. Oota kaardi valmimist." });
        const faction=["usa","russia","china"].includes(b.faction)?b.faction:member.faction;
        if(b.deck&&b.deck.faction!==faction)return response(res,400,{error:"Koosseis peab kuuluma valitud fraktsioonile."});
        if(room.format==='teams'&&b.alliance!=null){
          if(![0,1].includes(b.alliance)||[...room.members.values()].filter(m=>m.userId!==user.id&&m.alliance===b.alliance).length>=2)return response(res,409,{error:'Selles tiimis on juba kaks mängijat.'});
          if(member.alliance!==b.alliance){member.alliance=b.alliance;for(const m of room.members.values())if(!m.bot)m.ready=false;}
        }
        member.ready = !!b.ready; if (["usa", "russia", "china"].includes(b.faction)) member.faction = b.faction;
        if (b.deck && typeof b.deck === "object") member.deck = b.deck;
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if(req.method==='POST'&&action==='bot'){
        const b=await body(req);if(!ensureRoomCanEdit(room,user.id))return response(res,403,{error:'Ainult host saab AI kohti muuta.'});
        if(b.remove){const member=room.members.get(b.remove);if(!member?.bot)return response(res,400,{error:'Vali AI mängija.'});room.members.delete(b.remove);}
        else{
          if(room.members.size>=room.capacity)return response(res,409,{error:'Kõik mängijakohad on täis.'});
          const aiUser={id:'bot-'+randomUUID(),username:'AI',displayName:'AI '+(room.members.size+1)};
          const member=joinMember(room,aiUser,b.faction,null);member.bot=true;member.ready=true;member.difficulty=['easy','normal','hard'].includes(b.difficulty)?b.difficulty:'normal';
          if(room.format==='teams'&&b.alliance!=null){if(![0,1].includes(b.alliance)||[...room.members.values()].filter(m=>m.alliance===b.alliance).length>=2)return response(res,409,{error:'Valitud tiim on täis.'});member.alliance=b.alliance;}
          room.members.set(member.userId,member);
        }
        for(const m of room.members.values())if(!m.bot)m.ready=false;
        broadcastRoom(room,{type:'room',room:roomView(room)});return response(res,200,{room:roomView(room)});
      }
      if (req.method === "POST" && action === "settings") {
        const b = await body(req);
        if (!ensureRoomCanEdit(room, user.id)) return response(res, 403, { error: "Ainult host saab lobby seadeid muuta." });
        if(!isProceduralMapId(String(b.missionId??room.missionId)))return response(res,400,{error:"Vali protseduurkaart."});
        room.generating=true;
        try{
          const nextId=(b.missionId&&b.missionId!==room.missionId||b.mapOptions)?await generateServerMap((()=>{const input=b.mapOptions??mapOptions(b.missionId);return {...input,options:{...input.options,players:room.capacity}};})()):room.missionId;
          if(rooms.get(room.id)!==room||room.status!=="waiting"||room.hostId!==user.id)return response(res,409,{error:"Mänguruumi olek muutus. Ava seaded uuesti."});
          if(b.name!=null)room.name=displayName(b.name)||room.name;
          room.missionId=nextId;room.mapId=nextId;room.rules=sanitizeRules(b.rules);
          for(const m of room.members.values())m.ready=!!m.bot;
        }finally{room.generating=false;}
        broadcastRoom(room, { type: "room", room: roomView(room) }); return response(res, 200, { room: roomView(room) });
      }
      if (req.method === "GET" && action === "chat") {
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        return response(res, 200, { messages: room.chat.filter(e => chatVisible(room, e, user.id)).slice(-60) });
      }
      if (req.method === "POST" && action === "chat") {
        const b = await body(req);
        if (!room.members.has(user.id)) return response(res, 403, { error: "Sa ei ole selles ruumis." });
        const message = cleanChat(b.message, 500);
        if (!message) return response(res, 400, { error: "Sõnum on tühi." });
        pushChat(room, chatEntry(room, user, message, "all"));
        return response(res, 200, { messages: room.chat.filter(e => chatVisible(room, e, user.id)).slice(-60) });
      }
      if (req.method === "POST" && action === "start") {
        if (!ensureRoomCanEdit(room, user.id)) return response(res, 403, { error: "Ainult host saab mängu alustada." });
        if(room.members.size!==room.capacity)return response(res,409,{error:`Täida kõik ${room.capacity} kohta mängija või AI-ga.`});
        if(room.format==='teams'&&![0,1].every(a=>[...room.members.values()].filter(m=>m.alliance===a).length===2))return response(res,409,{error:'Mõlemas tiimis peab olema kaks mängijat.'});
        if (![...room.members.values()].every((m) => m.ready)) return response(res, 409, { error: "Kõik inimmängijad peavad olema valmis." });
        if(room.format==='teams'){const sides=[0,1].map(a=>[...room.members.entries()].filter(([,m])=>m.alliance===a));room.members=new Map([sides[0][0],sides[1][0],sides[0][1],sides[1][1]]);}
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
      if (room.resultByUser.size >= humanMembers(room).length) { room.status="finished"; room.finishedAt=now(); broadcastRoom(room,{type:"finished",room:roomView(room)}); }
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
function sendRaw(ws, data) {
  if (!ws || ws.readyState !== 1) return;
  // A client that cannot drain its socket must not make the server buffer without bound.
  // It reconnects and re-requests everything after its last applied tick.
  if (ws.bufferedAmount > MAX_BUFFERED) { ws.close(4008, "slow"); return; }
  ws.send(data);
}
function playerSocket(room, userId) { return room.reconnect.get(userId)?.ws; }
function isConnected(room, userId) { const r = room.reconnect.get(userId); return !!(r?.connected && r.ws?.readyState === 1); }
function sendHistory(ws, room, after) {
  let batch = [];
  for (const packet of room.history.values()) {
    if (packet.tick <= after) continue;
    batch.push(packet);
    if (batch.length >= 300) { send(ws, { type: "ticks", packets: batch }); batch = []; }
  }
  if (batch.length) send(ws, { type: "ticks", packets: batch });
}
function broadcastPeer(room, userId, connected) {
  const member = room.members.get(userId); if (!member) return;
  const data = json({ type: "peer", team: memberTeam(room, userId), name: member.displayName, connected });
  for (const m of humanMembers(room)) if (m.userId !== userId) sendRaw(playerSocket(room, m.userId), data);
}

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
      if (!Number.isInteger(lastAppliedTick) || lastAppliedTick < 0 || lastAppliedTick > room.tick || lastAppliedTick < room.tick - HISTORY_TICKS) return send(ws,{type:"error",message:"Taastatava mängu olek on liiga vana. Alusta uut lahingut."});
      const members = [...room.members.values()].map(p => ({faction:p.faction,deck:p.deck,alliance:p.alliance,bot:!!p.bot,difficulty:p.difficulty}));
      const chatHistory = () => { const messages = room.chat.filter(e => chatVisible(room, e, user.id)).slice(-30); if (messages.length) send(ws, { type: "chat-history", messages }); };
      if (m.spectate) {
        const grant = spectators.get(String(m.spectatorToken || ""));
        if (!grant || grant.userId !== user.id || grant.roomId !== room.id) return send(ws,{type:"error",message:"Pealtvaataja token ei kehti."});
        player={userId:user.id,team:-1,room,ws,token:String(m.spectatorToken),spectator:true}; addSocket(user.id,ws);
        send(ws,{type:"welcome",team:0,playerId:user.id,reconnectToken:String(m.spectatorToken),members,playerCount:room.members.size,rules:room.rules,hashInterval:HASH_INTERVAL,tickRate:TICK_RATE});
        send(ws,{type:"start",seed:0,tick:room.tick,missionId:room.missionId,rules:room.rules});
        sendHistory(ws, room, lastAppliedTick); chatHistory();
        return;
      }
      if (!member) return send(ws, { type: "error", message: "Sa ei kuulu sellesse mänguruumi." });
      const reconnect = room.reconnect.get(user.id);
      const team = memberTeam(room, user.id);
      player = { userId: user.id, team, room, ws, token: reconnect?.token || randomUUID(), spectator:false };
      const previousSocket = reconnect?.ws;
      if(previousSocket && previousSocket !== ws) previousSocket.close();
      room.reconnect.set(user.id,{token:player.token,connected:true,ws}); addSocket(user.id, ws);
      room.firstJoinAt ||= performance.now();
      send(ws, { type: "welcome", playerId: user.id, team, playerCount: room.members.size, reconnectToken: player.token, faction: member.faction, deck: member.deck, members, rules: room.rules, reconnect: !!reconnect, hashInterval: HASH_INTERVAL, tickRate: TICK_RATE });
      send(ws, { type: "start", seed: 0, tick: room.tick, missionId: room.missionId, rules: room.rules });
      sendHistory(ws, room, lastAppliedTick); chatHistory();
      if (reconnect) { broadcastPeer(room, user.id, true); systemChat(room, `${member.displayName} liitus mänguga uuesti.`); }
      return;
    }
    const room = player.room;
    if (player.spectator || playerSocket(room, player.userId) !== ws) return;
    if (m.type === "chat") { handleGameChat(room, player, m); return; }
    if (room.desynced) return;
    if (m.type === "loaded") { room.loaded.add(player.userId); return; }
    if (m.type === "sync") {
      // Periodic checkpoint: the client reports its world hash at a tick that is a multiple of HASH_INTERVAL.
      // Nobody waits for it; the server only compares reports for the same tick as they arrive.
      const tick = Number(m.tick);
      if (!Number.isInteger(tick) || tick <= 0 || tick % HASH_INTERVAL || tick > room.tick || typeof m.hash !== "string" || m.hash.length > 16) return;
      room.applied.set(player.userId, Math.max(tick, room.applied.get(player.userId) ?? 0));
      let byTick = room.hashes.get(tick); if (!byTick) room.hashes.set(tick, byTick = new Map());
      byTick.set(player.userId, m.hash);
      if (new Set(byTick.values()).size > 1) {
        room.desynced = true;
        const data = json({ type: "desync", tick, hashes: Object.fromEntries(byTick) });
        for (const p of humanMembers(room)) sendRaw(playerSocket(room, p.userId), data);
        return;
      }
      if (byTick.size >= humanMembers(room).length) room.hashes.delete(tick);
      for (const key of room.hashes.keys()) { if (key < room.tick - HISTORY_TICKS) room.hashes.delete(key); else break; }
      return;
    }
    if (m.type === "command") {
      // The server decides when a command runs: current server tick + INPUT_DELAY. Clients cannot pick the tick.
      if (!m.command || typeof m.command.type !== "string") return;
      const tick = room.tick + INPUT_DELAY;
      const list = room.commands.get(tick) || [];
      if (list.length >= 64) return;
      list.push({ ...m.command, team: player.team }); room.commands.set(tick, list);
    }
  });
  ws.on("close", () => {
    if (!player) return;
    removeSocket(player.userId, ws);
    if (player.spectator) return;
    const room = player.room, r = room.reconnect.get(player.userId);
    if (r && r.ws === ws) {
      r.connected = false;
      const member = room.members.get(player.userId);
      broadcastPeer(room, player.userId, false);
      if (member && room.status === "started") systemChat(room, `${member.displayName} ühendus katkes — mäng jätkub.`);
    }
  });
});

// ---- Server clock -------------------------------------------------------------------------------
// The server produces tick N+1 on its own 30 Hz timer. It does not wait for any client: a laggy or
// disconnected player only falls behind (and fast-forwards through the buffered ticks once able to),
// everybody else keeps playing at full speed.
function stepRoom(room) {
  room.tick += 1;
  const commands = room.commands.get(room.tick) || []; room.commands.delete(room.tick);
  const packet = { type: "tick", tick: room.tick, commands };
  room.history.set(room.tick, packet); room.history.delete(room.tick - HISTORY_TICKS);
  const data = json(packet);
  for (const m of humanMembers(room)) sendRaw(playerSocket(room, m.userId), data);
  for (const spec of room.spectators) for (const ws of sockets.get(spec) || []) sendRaw(ws, data);
  if (room.tick % STATUS_EVERY === 0) broadcastStatus(room);
}
function broadcastStatus(room) {
  const players = humanMembers(room).map(m => {
    const connected = isConnected(room, m.userId), applied = room.applied.get(m.userId);
    return { team: memberTeam(room, m.userId), name: m.displayName, connected, behind: connected && applied != null ? Math.max(0, room.tick - applied) : null };
  });
  const data = json({ type: "status", tick: room.tick, players });
  for (const m of humanMembers(room)) sendRaw(playerSocket(room, m.userId), data);
}
function runClock() {
  const t = performance.now();
  for (const room of rooms.values()) {
    if (room.status !== "started" || room.desynced) continue;
    if (!room.running) {
      // Wait for everyone to finish loading, but never longer than LOAD_TIMEOUT_MS after the first join.
      const humans = humanMembers(room);
      if (room.firstJoinAt && (humans.every(m => room.loaded.has(m.userId)) || t - room.firstJoinAt > LOAD_TIMEOUT_MS)) { room.running = true; room.nextTickAt = t + TICK_MS; }
      else if (!room.firstJoinAt && now() - (room.startedAt || now()) > IDLE_DELETE_MS) { room.status = "finished"; rooms.delete(room.id); }
      continue;
    }
    if (humanMembers(room).some(m => isConnected(room, m.userId))) {
      if (room.idleSince) { room.idleSince = 0; room.nextTickAt = t + TICK_MS; }
    } else {
      room.idleSince ||= t;
      if (t - room.idleSince > IDLE_DELETE_MS) { room.status = "finished"; rooms.delete(room.id); continue; }
      if (t - room.idleSince > IDLE_PAUSE_MS) continue; // nobody is playing: stop burning CPU
    }
    let n = 0;
    while (t >= room.nextTickAt && n < MAX_CATCHUP_TICKS) { stepRoom(room); room.nextTickAt += TICK_MS; n++; }
    if (t >= room.nextTickAt) room.nextTickAt = t + TICK_MS; // server itself overloaded: drop the debt instead of spiralling
  }
}
setInterval(runClock, 10).unref?.();

httpServer.listen(PORT, () => console.log(`Rogue Front server listening on :${PORT}`));

export interface UserStats { games: number; wins: number; losses: number; draws: number; rating: number; xp: number; level: number; streak: number; }
export interface User { id: string; username: string; displayName: string; country: string; createdAt: number; lastSeen: number; friends: string[]; stats: UserStats; decks: Record<string, unknown>; }
export interface PublicPlayer { id: string; username: string; displayName: string; country: string; online: boolean; stats: UserStats; }
export interface RoomMember { userId: string; username: string; displayName: string; faction: string; deck: { name: string; faction: string; slots: unknown[] } | null; ready: boolean; online: boolean; joinedAt: number; }
export interface Room { ranked?: boolean; id: string; name: string; missionId: string; mapId: string; rules: { income: string; fog: string; victory: string }; hostId: string; status: "waiting" | "started" | "finished"; createdAt: number; startedAt: number | null; members: RoomMember[]; }

let token = localStorage.getItem("rogue-front.authToken") || "";

export function setAuthToken(value: string): void { token = value; if (value) localStorage.setItem("rogue-front.authToken", value); else localStorage.removeItem("rogue-front.authToken"); }
export function getAuthToken(): string { return token; }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  register: async (username: string, password: string, displayName: string, country: string) => { const r = await request<{ token: string; user: User }>("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password, displayName, country }) }); setAuthToken(r.token); return r; },
  login: async (username: string, password: string) => { const r = await request<{ token: string; user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }); setAuthToken(r.token); return r; },
  logout: async () => { try { await request("/api/auth/logout", { method: "POST" }); } finally { setAuthToken(""); } },
  me: () => request<{ user: User; activeRoom: Room | null }>("/api/me"),
  players: (q: string) => request<{ players: PublicPlayer[] }>(`/api/players?q=${encodeURIComponent(q)}`),
  friends: () => request<{ friends: PublicPlayer[] }>("/api/friends"),
  addFriend: (userId: string) => request("/api/friends/add", { method: "POST", body: JSON.stringify({ userId }) }),
  rooms: () => request<{ rooms: Room[]; myRoom: Room | null }>("/api/rooms"),
  createRoom: (payload: object) => request<{ room: Room }>("/api/rooms", { method: "POST", body: JSON.stringify(payload) }),
  room: (id: string) => request<{ room: Room }>(`/api/rooms/${encodeURIComponent(id)}`),
  joinRoom: (id: string, payload: object) => request<{ room: Room }>(`/api/rooms/${encodeURIComponent(id)}/join`, { method: "POST", body: JSON.stringify(payload) }),
  leaveRoom: (id: string) => request(`/api/rooms/${encodeURIComponent(id)}/leave`, { method: "POST" }),
  ready: (id: string, payload: object) => request<{ room: Room }>(`/api/rooms/${encodeURIComponent(id)}/ready`, { method: "POST", body: JSON.stringify(payload) }),
  settings: (id: string, payload: object) => request<{ room: Room }>(`/api/rooms/${encodeURIComponent(id)}/settings`, { method: "POST", body: JSON.stringify(payload) }),
  start: (id: string) => request<{ room: Room }>(`/api/rooms/${encodeURIComponent(id)}/start`, { method: "POST" }),
  chat: (id: string) => request<{ messages: Array<{ id: string; userId: string; displayName: string; message: string; createdAt: number }> }>(`/api/rooms/${encodeURIComponent(id)}/chat`),
  sendChat: (id: string, message: string) => request<{ messages: Array<{ id: string; userId: string; displayName: string; message: string; createdAt: number }> }>(`/api/rooms/${encodeURIComponent(id)}/chat`, { method: "POST", body: JSON.stringify({ message }) }),
  matchResult: (roomId: string, result: "win" | "loss" | "draw") => request<{ stats: UserStats }>("/api/match/result", { method: "POST", body: JSON.stringify({ roomId, result }) }),
  saveDeck: (faction: string, deck: object) => request("/api/decks", { method: "PUT", body: JSON.stringify({ faction, deck }) }),
  leaderboard: () => request<{ players: PublicPlayer[] }>("/api/leaderboard"),
  liveGames: () => request<{ games: Room[] }>("/api/live-games"),
  matchmaking: (faction: string, deck: object | null) => request<{ queued: boolean; room: Room | null }>("/api/matchmaking/join", { method: "POST", body: JSON.stringify({ faction, deck }) }),
  matchmakingStatus: () => request<{ queued: boolean; room: Room | null }>("/api/matchmaking/status"),
  matchmakingLeave: () => request("/api/matchmaking/leave", { method: "POST" }),
  invites: () => request<{ invites: Array<{ id: string; roomId: string; from: PublicPlayer }> }>("/api/invites"),
  invite: (userId: string, roomId: string) => request("/api/invites", { method: "POST", body: JSON.stringify({ userId, roomId }) }),
  answerInvite: (id: string, accept: boolean) => request<{ room: Room }>(`/api/invites/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ accept }) }),
  spectate: (roomId: string) => request<{ token: string; room: Room }>(`/api/rooms/${encodeURIComponent(roomId)}/spectate`, { method: "POST" }),
};

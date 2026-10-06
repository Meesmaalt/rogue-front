import {bindFullscreen} from "./Fullscreen";
import "./online.css";
import { api, getAuthToken, type Room, type User, type PublicPlayer } from "../net/Api";
import { MISSIONS } from "../data/missions";
import { CURATED_MAPS, FOCUS_MAP } from "../sim/proceduralMap";
import { FACTIONS, FACTION_LIST, type FactionId } from "../sim/factions";
import { CAMPAIGN, loadCampaign, isUnlocked } from "../sim/campaign";
import { MODE_RULES, type MatchMode } from "../sim/gameModes";
import { loadAllDecks } from "../sim/deck";

export class OnlineShell {
  private root: HTMLElement;
  private user: User | null = null;
  private room: Room | null = null;
  private selectedFaction: FactionId = "usa";
  private tab: "lobby" | "ranked" | "live" | "friends" | "profile" = "lobby";
  private timer: number | null = null;
  private message = "";
  private busy = false;

  constructor(root: HTMLElement) { this.root = root; }

  showOffline(): void {
    this.stopPoll();
    const stored = localStorage.getItem("rogue-front.faction") as FactionId;
    this.selectedFaction = FACTION_LIST.includes(stored) ? stored : "usa";
    const maps = [FOCUS_MAP, ...MISSIONS.filter(m=>m.id==="operation-tidebreaker")];
    const campaign = loadCampaign();
    this.root.innerHTML = `<div class="online-app offline-app"><header class="online-top"><div class="brand-block"><div class="eyebrow">TACTICAL OPERATIONS</div><h1>ROGUE FRONT</h1></div><div><button data-fullscreen></button> <button data-arsenal>3D ARSENAL</button> <button data-online>MITMIKMÄNG</button></div></header><main class="offline-main"><section class="room-panel"><div class="eyebrow">ÜKSIKMÄNG</div><h2>Uus lahing</h2><p>Ehita baas. Kindlusta varustus. Juhi rindel kombineeritud vägesid.</p><form data-skirmish><label>Fraktsioon<select name="faction">${FACTION_LIST.map(f=>`<option value="${f}" ${f===this.selectedFaction?"selected":""}>${FACTIONS[f].name}</option>`).join("")}</select></label><p data-doctrine></p><div class="offline-map-cards">${maps.map(m=>{const size=m.map.size??640;return `<button type="button" data-map-card="${m.id}"><svg viewBox="${-size/2} ${-size/2} ${size} ${size}" aria-hidden="true"><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" fill="#687851"/>${(m.map.features??[]).filter(f=>["water","road","building","bridge"].includes(f.kind)).map(f=>`<rect x="${-f.width/2}" y="${-f.depth/2}" width="${f.width}" height="${f.depth}" transform="translate(${f.x} ${f.z}) rotate(${-(f.rotation??0)*180/Math.PI})" fill="${f.kind==="water"?"#345d70":f.kind==="building"?"#c0b99c":"#a9aa95"}"/>`).join("")}${m.map.bases.map(b=>`<circle cx="${b.x}" cy="${b.z}" r="${b.r}" fill="none" stroke="#eddd94" stroke-width="6"/>`).join("")}</svg><strong>${m.id==="operation-tidebreaker"?"MURDLAINE · MERI":"ROHEORG · JÕED"}</strong><small>${size} m · ${m.id==="operation-tidebreaker"?"Laevad, sadamad ja ranniku lahing":"Külad, metsad ja viis silda"}</small></button>`;}).join("")}</div><label>Kaart<select name="map">${maps.map(m=>`<option value="${m.id}">${m.map.name}${m.id==="operation-tidebreaker"?" · merevägi":""}</option>`).join("")}</select></label><div class="choice-grid"><label>Režiim<select name="mode">${(["skirmish","conquest","breakthrough","attrition","assault"] as MatchMode[]).map(m=>`<option value="${m}" ${m==="conquest"?"selected":""}>${m.toUpperCase()}</option>`).join("")}</select></label><label>AI raskus<select name="difficulty"><option value="easy">Lihtne</option><option value="normal" selected>Normaalne</option><option value="hard">Raske</option></select></label></div><p data-rules></p><label>Algus<select name="deployment"><option value="ready">Valmis baas + lahingugrupp</option><option value="base">HQ + insenerid — ehita baas</option></select></label><label>Koosseis<select name="deck"><option value="open">Vaba koosseis — kogu fraktsiooni roster</option><option value="deck" ${new URLSearchParams(location.search).get("setup")==="deck"?"selected":""}>Minu salvestatud battlegroup / deck</option></select></label><p data-deck></p><div class="room-actions"><button type="button" data-edit-deck>MUUDA DECKI</button><button class="primary" type="submit">ALUSTA LAHINGUT</button></div></form></section><section class="room-panel"><div class="eyebrow">KAMPAANIA</div><h2>Operatsioonide rada</h2><p>Õpetus → Liivakell → Kõrgem positsioon → Must linn → Murrang</p><div class="campaign-list">${CAMPAIGN.map(node=>`<button data-mission="${node.missionId}" ${isUnlocked(node,campaign)?"":"disabled"}><strong>${node.title}</strong><small>${campaign.completed.includes(node.id)?"LÕPETATUD":isUnlocked(node,campaign)?node.briefing:"LUKUS — lõpeta eelmine operatsioon"}</small></button>`).join("")}</div><p class="section-note">Juhtimine: parem hiir liigub või ründab; A + parem hiir ründab liikudes; X peatab. Inseneriga vali ehitis ja paiguta kaardile. Saada insener ressursipunkti, et käivitada majandus.</p></section></main></div>`;
    this.root.querySelector<HTMLButtonElement>("[data-arsenal]")!.onclick=()=>{location.href="./arsenal.html";};
    const form=this.root.querySelector<HTMLFormElement>("[data-skirmish]")!;
    const map=form.elements.namedItem("map") as HTMLSelectElement;
    const storedMap=localStorage.getItem("rogue-front.selectedMap");if(maps.some(m=>m.id===storedMap))map.value=storedMap!;
    const refreshMap=()=>{localStorage.setItem("rogue-front.selectedMap",map.value);this.root.querySelectorAll<HTMLButtonElement>("[data-map-card]").forEach(b=>{const selected=b.dataset.mapCard===map.value;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));});};
    map.onchange=refreshMap;this.root.querySelectorAll<HTMLButtonElement>("[data-map-card]").forEach(b=>b.onclick=()=>{map.value=b.dataset.mapCard!;refreshMap();});refreshMap();
    bindFullscreen(this.root.querySelector<HTMLButtonElement>("[data-fullscreen]")!);
    const faction=form.elements.namedItem("faction") as HTMLSelectElement;
    const mode=form.elements.namedItem("mode") as HTMLSelectElement;
    const refresh=()=>{
      this.selectedFaction=faction.value as FactionId;localStorage.setItem("rogue-front.faction",faction.value);
      this.root.querySelector<HTMLElement>("[data-doctrine]")!.textContent=FACTIONS[this.selectedFaction].doctrineBlurb;
      this.root.querySelector<HTMLElement>("[data-rules]")!.textContent=MODE_RULES[mode.value as MatchMode].description;
      const deck=loadAllDecks()[this.selectedFaction];this.root.querySelector<HTMLElement>("[data-deck]")!.textContent=`${deck.name} · ${deck.slots.reduce((n,s)=>n+s.count,0)} üksust`;
    };
    faction.onchange=refresh;mode.onchange=refresh;refresh();
    this.root.querySelector<HTMLButtonElement>("[data-edit-deck]")!.onclick=()=>dispatchEvent(new CustomEvent("rogue-front:open-deck"));
    this.root.querySelector<HTMLButtonElement>("[data-online]")!.onclick=()=>void this.startOnline();
    form.onsubmit=e=>{
      e.preventDefault();const data=new FormData(form);const fac=data.get("faction") as FactionId;
      if(data.get("deck")==="deck") sessionStorage.setItem("rogue-front.activeDeck",JSON.stringify(loadAllDecks()[fac]));
      else sessionStorage.removeItem("rogue-front.activeDeck");
      const query=new URLSearchParams({mission:String(data.get("map")),mode:"skirmish",faction:fac,gameMode:String(data.get("mode")),difficulty:String(data.get("difficulty")),deployment:String(data.get("deployment"))});
      location.href=`${location.pathname}?${query}`;
    };
    this.root.querySelectorAll<HTMLButtonElement>("[data-mission]").forEach(b=>b.onclick=()=>{sessionStorage.removeItem("rogue-front.activeDeck");location.href=`${location.pathname}?mission=${encodeURIComponent(b.dataset.mission!)}&faction=${this.selectedFaction}`;});
  }
  async start(): Promise<void> { this.showOffline(); }
  private async startOnline(): Promise<void> {
    if (!getAuthToken()) return this.authScreen();
    try {
      const r = await api.me(); this.user = r.user; this.room = r.activeRoom;
      if (this.room) return this.renderRoom();
      this.renderMain(); this.poll();
    } catch { this.authScreen(); }
  }

  private authScreen(): void {
    this.stopPoll();
    this.root.innerHTML = `<div class="online-app auth-app"><div class="auth-card"><div class="eyebrow">ROGUE FRONT // ONLINE COMMAND</div><h1>Rogue Front</h1><p class="muted">Wargame’i detailne lahing, Real Wari majandus ja püsiv multiplayer-konto.</p><button data-offline>TAGASI ÜKSIKMÄNGU</button><div class="auth-tabs"><button data-auth="login" class="active">SISENE</button><button data-auth="register">REGISTREERI</button></div><form id="auth-form"><label>Kasutajanimi<input name="username" minlength="3" maxlength="20" autocomplete="username" required></label><label>Parool<input name="password" type="password" minlength="8" autocomplete="current-password" required></label><label data-reg-only hidden>Kuvatav nimi<input name="displayName" maxlength="28"></label><label data-reg-only hidden>Riik<input name="country" value="EE" maxlength="2"></label><button class="primary" type="submit">SISENE</button><div class="form-error" data-error>${this.message}</div></form></div></div>`;
    this.root.querySelector<HTMLButtonElement>("[data-offline]")!.onclick=()=>this.showOffline();
    const form = this.root.querySelector<HTMLFormElement>("#auth-form")!;
    let mode: "login" | "register" = "login";
    this.root.querySelectorAll<HTMLButtonElement>("[data-auth]").forEach((b) => b.onclick = () => {
      mode = b.dataset.auth as "login" | "register";
      this.root.querySelectorAll("[data-auth]").forEach((x) => x.classList.toggle("active", x === b));
      this.root.querySelectorAll<HTMLElement>("[data-reg-only]").forEach((x) => x.hidden = mode !== "register");
      form.querySelector<HTMLButtonElement>(".primary")!.textContent = mode === "register" ? "LOO KONTO" : "SISENE";
      form.querySelector<HTMLInputElement>('input[name="password"]')!.autocomplete = mode === "register" ? "new-password" : "current-password";
    });
    form.onsubmit = async (e) => {
      e.preventDefault(); if (this.busy) return; this.busy = true;
      const fd = new FormData(form); const username = String(fd.get("username") || ""); const password = String(fd.get("password") || "");
      try {
        const r = mode === "register" ? await api.register(username, password, String(fd.get("displayName") || username), String(fd.get("country") || "EE")) : await api.login(username, password);
        this.user = r.user; this.room = null; this.renderMain(); this.poll();
      } catch (err) { this.message = err instanceof Error ? err.message : "Sisselogimine ebaõnnestus."; this.authScreen(); }
      finally { this.busy = false; }
    };
  }

  private renderMain(): void {
    if (!this.user) return this.authScreen();
    const decks = loadAllDecks(); const d = decks[this.selectedFaction];
    this.root.innerHTML = `<div class="online-app"><header class="online-top"><div class="brand-block"><div class="eyebrow">ONLINE COMMAND</div><h1>ROGUE FRONT</h1></div><nav><button data-tab="lobby" class="active">LOBBY</button><button data-tab="ranked">RANKED</button><button data-tab="live">LIVE</button><button data-tab="friends">SÕBRAD</button><button data-tab="profile">PROFIIL</button></nav><div class="account"><span class="dot online"></span><b>${esc(this.user.displayName)}</b><small>@${esc(this.user.username)}</small><button data-action="logout">Välju</button></div></header><main class="online-main"><section class="online-content" data-view></section><aside class="online-side"><div class="side-title">MINU LAHING</div><div class="side-card"><span>RAHVUS</span><b>${FACTIONS[this.selectedFaction].short}</b><small>${esc(FACTIONS[this.selectedFaction].doctrineBlurb)}</small></div><div class="side-card"><span>DECK</span><b>${esc(d.name)}</b><small>${d.slots.length} kaarti · ${d.slots.reduce((n, x) => n + x.count, 0)} üksust</small></div><div class="side-card stats"><span>RATING</span><b>${this.user.stats.rating ?? 1000}</b><small>Level ${this.user.stats.level ?? 1} · ${this.user.stats.xp ?? 0} XP</small></div><div class="side-card"><span>DECK BUILDER</span><button class="secondary wide" data-action="deck">AVA DECK</button></div></aside></main><div class="toast" data-toast></div></div>`;
    this.root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => b.onclick = () => { this.tab = b.dataset.tab as typeof this.tab; this.root.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("active", x === b)); this.renderView(); });
    this.root.querySelector<HTMLButtonElement>('[data-action="logout"]')!.onclick = async () => { await api.logout(); this.authScreen(); };
    this.root.querySelector<HTMLButtonElement>('[data-action="deck"]')!.onclick = () => dispatchEvent(new CustomEvent("rogue-front:open-deck"));
    this.renderView();
  }

  private renderView(): void { if (this.tab === "lobby") void this.renderLobby(); else if (this.tab === "ranked") void this.renderRanked(); else if (this.tab === "live") void this.renderLive(); else if (this.tab === "friends") void this.renderFriends(); else this.renderProfile(); }

  private async renderRanked(): Promise<void> {
    const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view || !this.user) return;
    const faction = this.selectedFaction; const deck = loadAllDecks()[faction];
    try { const [board, status] = await Promise.all([api.leaderboard(), api.matchmakingStatus()]);
      view.innerHTML = `<div class="view-head"><div><div class="eyebrow">RANKED COMMAND</div><h2>Ranked matchmaking</h2><p>Server leiab sulle võimalikult lähedase ratinguga vastase.</p></div></div><div class="ranked-grid"><section class="room-panel"><div class="panel-title">MATCHMAKING</div><div class="setting-row"><span>MINU RATING</span><b>${this.user.stats.rating ?? 1000}</b></div><div class="setting-row"><span>VALITUD RAHVUS</span><b>${FACTIONS[faction].short}</b></div><div class="setting-row"><span>DECK</span><b>${esc(deck.name)}</b></div><div class="room-actions">${status.queued ? `<button class="secondary" data-rank-action="leave">TÜHISTA OTSING</button><span class="wait-label">OTSIN VASTAST…</span>` : `<button class="primary" data-rank-action="queue">OTSI 1v1 VASTAST</button>`}</div></section><section class="room-panel"><div class="panel-title">TOP 50</div><div class="leaderboard">${board.players.map((p,i)=>`<div class="player-row"><b>#${i+1}</b><div><strong>${esc(p.displayName)}</strong><small>@${esc(p.username)}</small></div><span>${p.stats.rating ?? 1000}</span></div>`).join("")}</div></section></div>`;
      view.querySelector<HTMLButtonElement>('[data-rank-action="queue"]')?.addEventListener("click", async () => { try { await api.matchmaking(faction,deck); await this.renderRanked(); } catch(e){ this.toast(e instanceof Error?e.message:"Matchmaking ebaõnnestus."); } });
      view.querySelector<HTMLButtonElement>('[data-rank-action="leave"]')?.addEventListener("click", async () => { await api.matchmakingLeave(); await this.renderRanked(); });
    } catch(e){ this.toast(e instanceof Error?e.message:"Ranked laadimine ebaõnnestus."); }
  }

  private async renderLobby(): Promise<void> {
    const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view) return;
    try { const r = await api.rooms(); if (r.myRoom) { this.room = r.myRoom; return this.renderRoom(); }
      view.innerHTML = `<div class="view-head"><div><div class="eyebrow">PUBLIC MATCHMAKING</div><h2>Mänguruumid</h2><p>Vali olemasolev 1v1 lobby või loo oma lahing.</p></div><button class="primary" data-action="create">+ LOO RUUM</button></div><div class="room-toolbar"><input data-room-search placeholder="Otsi ruumi või kaarti…"><button data-action="refresh">VÄRSKENDA</button><span>${r.rooms.length} avatud ruumi</span></div><div class="room-list" data-rooms></div><div class="section-note">Lobby kasutab serveripoolset staatust. READY, host, reeglid ja mängu käivitamine ei sõltu kliendi UI-st.</div>`;
      const list = view.querySelector<HTMLElement>("[data-rooms]")!; const renderRooms = (filter = "") => { list.innerHTML = r.rooms.filter(x => `${x.name} ${x.mapId} ${x.missionId}`.toLowerCase().includes(filter.toLowerCase())).map(x => this.roomCard(x)).join("") || `<div class="empty">Ühtegi sobivat lobby't ei ole. Loo uus mänguruum.</div>`; list.querySelectorAll<HTMLButtonElement>("[data-join]").forEach(b => b.onclick = () => void this.join(b.dataset.join!)); };
      renderRooms(); view.querySelector<HTMLInputElement>("[data-room-search]")!.oninput = (e) => renderRooms((e.target as HTMLInputElement).value); view.querySelector<HTMLButtonElement>('[data-action="refresh"]')!.onclick = () => void this.renderLobby(); view.querySelector<HTMLButtonElement>('[data-action="create"]')!.onclick = () => this.createRoomModal();
    } catch (err) { this.toast(err instanceof Error ? err.message : "Lobby laadimine ebaõnnestus."); }
  }

  private roomCard(room: Room): string {
    const mission = MISSIONS.find(m => m.id === room.missionId); const host = room.members[0];
    return `<article class="room-card"><div class="room-main"><div class="room-title"><b>${esc(room.name)}</b><span class="badge">1/2</span></div><div class="room-meta">${esc(mission?.name || room.missionId)} · ${esc(room.mapId || mission?.map.id || "map")}</div><div class="room-tags"><span>${room.rules.fog}</span><span>${room.rules.income} income</span><span>${room.rules.victory}</span></div></div><div class="room-player"><strong>${esc(host?.displayName || "Host")}</strong><small>${host?.faction ? FACTIONS[host.faction as FactionId]?.short || host.faction : "—"}</small></div><button class="join-btn" data-join="${esc(room.id)}">LIITU</button></article>`;
  }

  private createRoomModal(): void {
    const missions = [...MISSIONS.filter(m => !m.id.includes("tutorial")), ...CURATED_MAPS]; const decks = loadAllDecks();
    this.modal(`<div class="modal-head"><div class="eyebrow">CREATE MATCH</div><h2>Uus 1v1 lahing</h2></div><form id="create-room-form"><label>Ruumi nimi<input name="name" value="${esc(this.user?.displayName || "")} vs World" maxlength="28" required></label><label>Kaart<select name="mission">${missions.map(m => `<option value="${esc(m.id)}">${esc(m.name)} — ${esc(m.map.name)}</option>`).join("")}<option value="__random__">PROCEDURAL — juhuslik tasakaalus kaart</option></select></label><div class="choice-grid"><label>Rahvus<select name="faction">${FACTION_LIST.map(f => `<option value="${f}" ${f === this.selectedFaction ? "selected" : ""}>${FACTIONS[f].name}</option>`).join("")}</select></label><label>Deck<select name="deck">${FACTION_LIST.map(f => `<option value="${f}">${esc(decks[f].name)}</option>`).join("")}</select></label></div><div class="rule-grid"><label>Sissetulek<select name="income"><option value="standard">Standard</option><option value="high">Kõrge</option><option value="low">Madal</option></select></label><label>Fog of War<select name="fog"><option value="wargame">Wargame</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label><label>Võit<select name="victory"><option value="hq">Hävitada HQ</option><option value="annihilation">Täielik hävitamine</option></select></label></div><div class="modal-actions"><button type="button" data-close>CANCEL</button><button class="primary" type="submit">LOO LOBBY</button></div><div class="form-error" data-modal-error></div></form>`);
    const form = document.querySelector<HTMLFormElement>("#create-room-form")!; form.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(form); const faction = String(fd.get("faction")) as FactionId; this.selectedFaction = faction; const deck = decks[faction]; const selectedMap = String(fd.get("mission"));
      const missionId = selectedMap === "__random__" ? `procedural-balanced-${Math.floor(Math.random()*900000+100000)}` : selectedMap;
      try { const r = await api.createRoom({ name: fd.get("name"), missionId, mapId: missionId, faction, deck, rules: { income: fd.get("income"), fog: fd.get("fog"), victory: fd.get("victory") } }); this.closeModal(); this.room = r.room; this.renderRoom(); } catch (err) { document.querySelector<HTMLElement>("[data-modal-error]")!.textContent = err instanceof Error ? err.message : "Ruumi loomine ebaõnnestus."; }
    };
  }

  private async join(id: string): Promise<void> {
    const deck = loadAllDecks()[this.selectedFaction]; try { const r = await api.joinRoom(id, { faction: this.selectedFaction, deck }); this.room = r.room; this.renderRoom(); } catch (err) { this.toast(err instanceof Error ? err.message : "Liitumine ebaõnnestus."); }
  }

  private renderRoom(): void {
    this.stopPoll(); if (!this.room || !this.user) return;
    const room = this.room; const me = room.members.find(m => m.userId === this.user!.id); const opponent = room.members.find(m => m.userId !== this.user!.id); const host = room.hostId === this.user.id;
    const decks = loadAllDecks();
    this.root.querySelector<HTMLElement>("[data-view]")!.innerHTML = `<div class="room-view"><div class="view-head"><div><div class="eyebrow">MATCH ROOM // ${esc(room.id)}</div><h2>${esc(room.name)}</h2><p>${esc(MISSIONS.find(m => m.id === room.missionId)?.briefing || "")}</p></div><span class="room-status ${room.status}">${room.status === "started" ? "STARTING" : "WAITING"}</span></div><div class="versus"><div class="player-slot ${me?.ready ? "ready" : ""}"><div class="slot-num">TEAM 1</div><h3>${esc(me?.displayName || this.user.displayName)}</h3><span>@${esc(me?.username || this.user.username)}</span><select data-faction>${FACTION_LIST.map(f => `<option value="${f}" ${f === me?.faction ? "selected" : ""}>${FACTIONS[f].name}</option>`).join("")}</select><select data-deck>${FACTION_LIST.map(f => `<option value="${f}" ${f === me?.deck?.faction ? "selected" : ""}>${esc(decks[f].name)}</option>`).join("")}</select><div class="ready-state">${me?.ready ? "READY" : "NOT READY"}</div></div><div class="vs-mark">VS</div><div class="player-slot ${opponent?.ready ? "ready" : "empty"}"><div class="slot-num">TEAM 2</div><h3>${esc(opponent?.displayName || "Ootan vastast")}</h3><span>${opponent ? `@${esc(opponent.username)}` : "Lobby otsib mängijat"}</span><div class="opponent-faction">${opponent ? FACTIONS[opponent.faction as FactionId]?.name || opponent.faction : "—"}</div><div class="ready-state">${opponent ? (opponent.ready ? "READY" : "NOT READY") : "EMPTY"}</div></div></div><div class="room-grid"><section class="room-panel"><div class="panel-title">LAHINGU SEADED ${host ? "· HOST" : "· HOSTI VALIK"}</div><div class="setting-row"><span>KAART</span><b>${esc(MISSIONS.find(m => m.id === room.missionId)?.map.name || room.mapId)}</b></div><div class="setting-row"><span>FOG OF WAR</span><b>${esc(room.rules.fog)}</b></div><div class="setting-row"><span>SISSETULEK</span><b>${esc(room.rules.income)}</b></div><div class="setting-row"><span>VÕIT</span><b>${esc(room.rules.victory)}</b></div>${host ? `<button class="secondary wide" data-action="settings">MUUDA REEGLEID</button>` : ""}</section><section class="room-panel chat-panel"><div class="panel-title">SQUAD CHANNEL</div><div class="chat-log" data-chat><div><b>SERVER</b> Lobby on valmis. Mõlemad mängijad peavad valima deck'i ja vajutama READY.</div></div><form class="chat-form" data-chat-form><input name="message" maxlength="500" placeholder="Kirjuta vastasele…"><button type="submit">SAADA</button></form></section></div><div class="room-actions"><button data-action="leave">LAHKU</button>${host ? `<button class="secondary" data-action="invite">KUTSU SÕBER</button>` : ""}<button class="ready-btn ${me?.ready ? "ready" : ""}" data-action="ready">${me?.ready ? "UNREADY" : "READY"}</button>${host ? `<button class="primary start-btn" data-action="start" ${room.members.length === 2 && room.members.every(m => m.ready) ? "" : "disabled"}>START BATTLE</button>` : `<span class="wait-label">${room.members.length < 2 ? "Ootan teist mängijat…" : room.members.every(m => m.ready) ? "Ootan hosti…" : "Oota vastase READY-d…"}</span>`}</div></div>`;
    this.bindRoomControls(); this.poll();
  }

  private bindRoomControls(): void {
    if (!this.room || !this.user) return; const roomId = this.room.id; const me = this.room.members.find(m => m.userId === this.user!.id);
    const faction = this.root.querySelector<HTMLSelectElement>("[data-faction]")!; const deck = this.root.querySelector<HTMLSelectElement>("[data-deck]")!;
    const sync = async (ready: boolean) => { const f = faction.value as FactionId; const d = loadAllDecks()[f]; this.selectedFaction = f; sessionStorage.setItem("rogue-front.activeDeck", JSON.stringify(d)); const r = await api.ready(roomId, { ready, faction: f, deck: d }); this.room = r.room; this.renderRoom(); };
    this.root.querySelector<HTMLButtonElement>('[data-action="ready"]')!.onclick = () => void sync(!me?.ready).catch(err => this.toast(err instanceof Error ? err.message : "READY ebaõnnestus."));
    faction.onchange = () => { this.selectedFaction = faction.value as FactionId; deck.value = faction.value; };
    deck.onchange = () => { this.selectedFaction = deck.value as FactionId; };
    this.root.querySelector<HTMLButtonElement>('[data-action="leave"]')!.onclick = async () => { try { await api.leaveRoom(roomId); this.room = null; this.renderMain(); this.poll(); } catch (err) { this.toast(err instanceof Error ? err.message : "Lahkumine ebaõnnestus."); } };
    this.root.querySelector<HTMLButtonElement>('[data-action="invite"]')?.addEventListener("click", () => void this.inviteFriendModal());
    this.root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener("click", async () => { try { await api.start(roomId); } catch (err) { this.toast(err instanceof Error ? err.message : "Mängu käivitamine ebaõnnestus."); } });
    this.root.querySelector<HTMLButtonElement>('[data-action="settings"]')?.addEventListener("click", () => this.settingsModal());
    const chatForm = this.root.querySelector<HTMLFormElement>("[data-chat-form]");
    chatForm?.addEventListener("submit", async (e) => { e.preventDefault(); const input = chatForm.querySelector<HTMLInputElement>("input[name=message]")!; const message = input.value.trim(); if (!message) return; try { await api.sendChat(roomId, message); input.value = ""; await this.loadChat(roomId); } catch (err) { this.toast(err instanceof Error ? err.message : "Sõnumi saatmine ebaõnnestus."); } });
    void this.loadChat(roomId);
  }

  private async inviteFriendModal(): Promise<void> {
    if (!this.room) return; const r=await api.friends();
    this.modal(`<div class="modal-head"><div class="eyebrow">INVITE</div><h2>Kutsu sõber</h2></div><div class="friend-list-modal">${r.friends.map(f=>`<div class="player-row"><div><b>${esc(f.displayName)}</b><small>@${esc(f.username)} · ${f.online?"ONLINE":"OFFLINE"}</small></div><button data-invite-user="${esc(f.id)}" ${f.online?"":"disabled"}>KUTSU</button></div>`).join("") || `<div class="empty">Sõbralist on tühi.</div>`}</div>`);
    document.querySelectorAll<HTMLButtonElement>("[data-invite-user]").forEach(b=>b.onclick=async()=>{try{await api.invite(b.dataset.inviteUser!,this.room!.id);b.textContent="SADETUD";b.disabled=true;}catch(e){this.toast(e instanceof Error?e.message:"Kutset ei saanud saata.");}});
  }

  private async loadChat(roomId: string): Promise<void> {
    try { const r = await api.chat(roomId); const el = this.root.querySelector<HTMLElement>("[data-chat]"); if (!el) return; el.innerHTML = r.messages.map(m => `<div><b>${esc(m.displayName)}</b> ${esc(m.message)}</div>`).join("") || `<div><b>SERVER</b> Chat on tühi.</div>`; el.scrollTop = el.scrollHeight; } catch { /* lobby may be transitioning */ }
  }

  private settingsModal(): void {
    if (!this.room) return; const room = this.room; const missions = [...MISSIONS.filter(m => !m.id.includes("tutorial")), ...CURATED_MAPS];
    this.modal(`<div class="modal-head"><div class="eyebrow">HOST CONTROL</div><h2>Lobby reeglid</h2></div><form id="settings-form"><label>Ruumi nimi<input name="name" value="${esc(room.name)}"></label><label>Kaart<select name="mission">${missions.map(m => `<option value="${esc(m.id)}" ${m.id === room.missionId ? "selected" : ""}>${esc(m.name)} — ${esc(m.map.name)}</option>`).join("")}<option value="__random__">PROCEDURAL — uus juhuslik kaart</option></select></label><div class="rule-grid"><label>Sissetulek<select name="income"><option value="standard" ${room.rules.income === "standard" ? "selected" : ""}>Standard</option><option value="high" ${room.rules.income === "high" ? "selected" : ""}>Kõrge</option><option value="low" ${room.rules.income === "low" ? "selected" : ""}>Madal</option></select></label><label>Fog<select name="fog"><option value="wargame" ${room.rules.fog === "wargame" ? "selected" : ""}>Wargame</option><option value="reduced" ${room.rules.fog === "reduced" ? "selected" : ""}>Reduced</option><option value="off" ${room.rules.fog === "off" ? "selected" : ""}>Off</option></select></label><label>Võit<select name="victory"><option value="hq" ${room.rules.victory === "hq" ? "selected" : ""}>HQ</option><option value="annihilation" ${room.rules.victory === "annihilation" ? "selected" : ""}>Annihilation</option></select></label></div><div class="modal-actions"><button type="button" data-close>CANCEL</button><button class="primary" type="submit">SALVESTA</button></div><div class="form-error" data-modal-error></div></form>`);
    document.querySelector<HTMLFormElement>("#settings-form")!.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); try { const selectedMap = String(fd.get("mission")); const missionId = selectedMap === "__random__" ? `procedural-balanced-${Math.floor(Math.random()*900000+100000)}` : selectedMap; const r = await api.settings(room.id, { name: fd.get("name"), missionId, mapId: missionId, rules: { income: fd.get("income"), fog: fd.get("fog"), victory: fd.get("victory") } }); this.room = r.room; this.closeModal(); this.renderRoom(); } catch (err) { document.querySelector<HTMLElement>("[data-modal-error]")!.textContent = err instanceof Error ? err.message : "Salvestamine ebaõnnestus."; } };
  }

  private async renderLive(): Promise<void> {
    const view=this.root.querySelector<HTMLElement>("[data-view]"); if(!view) return;
    try { const r=await api.liveGames(); view.innerHTML=`<div class="view-head"><div><div class="eyebrow">LIVE WAR ROOM</div><h2>Live mängud</h2><p>Vaata käimasolevaid lahinguid pealtvaatajana.</p></div></div><div class="room-list">${r.games.map(g=>`<article class="room-card"><div class="room-main"><div class="room-title"><b>${esc(g.name)}</b><span class="badge">LIVE</span></div><div class="room-meta">${esc(MISSIONS.find(m=>m.id===g.missionId)?.name||g.missionId)} · ${esc(g.mapId)}</div><div class="room-tags"><span>${g.rules.fog}</span><span>${g.ranked?"RANKED":"CUSTOM"}</span></div></div><div class="room-player"><strong>${g.members.map(m=>esc(m.displayName)).join(" vs ")}</strong><small>${g.members.map(m=>esc(FACTIONS[m.faction as FactionId]?.short||m.faction)).join(" / ")}</small></div><button class="join-btn" data-spectate="${esc(g.id)}">VAATA</button></article>`).join("")||`<div class="empty">Praegu ei ole aktiivseid mänge.</div>`}</div>`; view.querySelectorAll<HTMLButtonElement>("[data-spectate]").forEach(b=>b.onclick=async()=>{try{const r=await api.spectate(b.dataset.spectate!);const url=new URL(location.href);url.search="";url.searchParams.set("mission",r.room.missionId);url.searchParams.set("mode","spectator");url.searchParams.set("room",r.room.id);url.searchParams.set("faction","usa");url.searchParams.set("spectateToken",r.token);location.href=url.toString();}catch(e){this.toast(e instanceof Error?e.message:"Pealtvaatamist ei saanud alustada.");}}); } catch(e){this.toast(e instanceof Error?e.message:"Live mängude laadimine ebaõnnestus.");}
  }

  private async renderFriends(): Promise<void> { const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view) return; try { const r = await api.friends(); view.innerHTML = `<div class="view-head"><div><div class="eyebrow">SOCIAL</div><h2>Sõbrad</h2><p>Otsi mängijaid ja lisa nad oma püsivasse sõbralisti.</p></div></div><div class="friend-search"><input data-player-search placeholder="Kasutajanimi või kuvatav nimi…"><button data-action="search">OTSI</button></div><div class="friend-columns"><section><div class="panel-title">MINU SÕBRAD</div><div data-friends>${r.friends.map(p => this.playerRow(p, false)).join("") || `<div class="empty">Sõbralisti pole veel.</div>`}</div></section><section><div class="panel-title">OTSING</div><div data-results><div class="empty">Sisesta nimi ja vajuta OTSI.</div></div></section></div>`; view.querySelector<HTMLButtonElement>('[data-action="search"]')!.onclick = () => void this.searchPlayers(); view.querySelector<HTMLInputElement>("[data-player-search]")!.onkeydown = e => { if (e.key === "Enter") void this.searchPlayers(); }; } catch (err) { this.toast(err instanceof Error ? err.message : "Sõprade laadimine ebaõnnestus."); } }
  private playerRow(p: PublicPlayer, add: boolean): string { return `<div class="player-row"><span class="dot ${p.online ? "online" : ""}"></span><div><b>${esc(p.displayName)}</b><small>@${esc(p.username)} · ${p.stats.wins}-${p.stats.losses}</small></div>${add ? `<button data-add-friend="${esc(p.id)}">LISA</button>` : `<span class="online-label">${p.online ? "ONLINE" : "OFFLINE"}</span>`}</div>`; }
  private async searchPlayers(): Promise<void> { const q = this.root.querySelector<HTMLInputElement>("[data-player-search]")?.value.trim() || ""; if (!q) return; try { const r = await api.players(q); const el = this.root.querySelector<HTMLElement>("[data-results]")!; el.innerHTML = r.players.map(p => this.playerRow(p, true)).join("") || `<div class="empty">Mängijat ei leitud.</div>`; el.querySelectorAll<HTMLButtonElement>("[data-add-friend]").forEach(b => b.onclick = async () => { try { await api.addFriend(b.dataset.addFriend!); b.textContent = "LISATUD"; b.disabled = true; } catch (err) { this.toast(err instanceof Error ? err.message : "Sõbra lisamine ebaõnnestus."); } }); } catch (err) { this.toast(err instanceof Error ? err.message : "Otsing ebaõnnestus."); } }

  private renderProfile(): void { const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view || !this.user) return; const s = this.user.stats; view.innerHTML = `<div class="view-head"><div><div class="eyebrow">PLAYER RECORD</div><h2>${esc(this.user.displayName)}</h2><p>@${esc(this.user.username)} · ${esc(this.user.country)}</p></div></div><div class="profile-grid"><div class="profile-stat"><span>MÄNGUD</span><b>${s.games}</b></div><div class="profile-stat"><span>VÕIDUD</span><b>${s.wins}</b></div><div class="profile-stat"><span>KAOTUSED</span><b>${s.losses}</b></div><div class="profile-stat"><span>VIIGID</span><b>${s.draws}</b></div><div class="profile-stat"><span>RATING</span><b>${s.rating ?? 1000}</b></div><div class="profile-stat"><span>LEVEL</span><b>${s.level ?? 1}</b></div></div><div class="section-note">Kontoandmed ja mängustatistika asuvad serveris. Brauseri localStorage sisaldab ainult autentimissessiooni ning kohalikku decki mugavuse pärast.</div>`; }

  private poll(): void { this.stopPoll(); this.timer = window.setInterval(() => void this.refresh(), 1500); }
  private stopPoll(): void { if (this.timer !== null) window.clearInterval(this.timer); this.timer = null; }
  private async refresh(): Promise<void> { try { const r = await api.me(); this.user = r.user; if (r.activeRoom && !this.room) { this.room = r.activeRoom; this.renderRoom(); return; } if (this.room) { const rr = await api.room(this.room.id); this.room = rr.room; if (this.room.status === "started") return this.launchGame(); this.renderRoom(); } else if (this.tab === "lobby") await this.renderLobby(); else if (this.tab === "ranked") await this.renderRanked(); else if (this.tab === "live") await this.renderLive(); } catch { /* transient poll error */ } }
  private launchGame(): void { if (!this.room || !this.user) return; this.stopPoll(); const me = this.room.members.find(m => m.userId === this.user!.id); if (!me) return; sessionStorage.setItem("rogue-front.activeDeck", JSON.stringify(loadAllDecks()[me.faction as FactionId])); const url = new URL(location.href); url.search = ""; url.searchParams.set("mission", this.room.missionId); url.searchParams.set("mode", "multiplayer"); url.searchParams.set("room", this.room.id); url.searchParams.set("faction", me.faction); location.href = url.toString(); }

  private modal(content: string): void { this.closeModal(); const d = document.createElement("div"); d.className = "modal-backdrop"; d.innerHTML = `<div class="modal-card">${content}</div>`; document.body.appendChild(d); d.querySelectorAll<HTMLElement>("[data-close]").forEach(x => x.onclick = () => d.remove()); }
  private closeModal(): void { document.querySelector(".modal-backdrop")?.remove(); }
  private toast(message: string): void { const t = this.root.querySelector<HTMLElement>("[data-toast]"); if (!t) return; t.textContent = message; t.classList.add("show"); window.setTimeout(() => t.classList.remove("show"), 2600); }
}

function esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }

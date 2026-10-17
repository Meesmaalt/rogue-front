import {REGION_PLANS,type RegionLayoutIndex} from '../sim/regionPlans';
import {REGION_IDS,REGIONS,regionDefaults,regionFromProfile,type RegionId} from '../sim/regions';
import camouflageProfiles from '../data/camouflages.json';
import {getLanguage,setLanguage} from "./Language";
import type {MissionDef} from "../sim/types";
import {storePreparedMission} from "./PreparedMission";
import {SettingsPanel} from "./Settings";
import { readSavedSessions, savedSessionQuery } from "./SavedSessions";
import {bindFullscreen} from "./Fullscreen";
import "./online.css";
import { api, getAuthToken, type Room, type User, type PublicPlayer } from "../net/Api";
import { METRIC_MAP_SIZES, type MapArchetype,decodeMapOptions,mapOptionsMask } from "../sim/proceduralMap";
import { FACTIONS, FACTION_LIST, type FactionId } from "../sim/factions";
import { MODE_RULES, type MatchMode } from "../sim/gameModes";
import { loadAllDecks, validateDeck } from "../sim/deck";

const MISSIONS:readonly MissionDef[]=[];
export class OnlineShell {
  private root: HTMLElement;
  private readonly settings=new SettingsPanel(()=>{});
  private user: User | null = null;
  private room: Room | null = null;
  private selectedFaction: FactionId = "usa";
  private tab: "lobby" | "ranked" | "live" | "friends" | "profile" = "lobby";
  private timer: number | null = null;
  private pollEpoch = 0;
  private refreshing = false;
  private roomActionPending = false;
  private chatRequest = 0;
  private launching = false;
  private readonly roomChats=new Map<string,HTMLElement>();
  private message = "";
  private busy = false;
  private cancelMapPreparation=()=>{};

  constructor(root: HTMLElement) { this.root = root; }

  showOffline(message=""): void {
    this.cancelMapPreparation();this.stopPoll();
    const stored = localStorage.getItem("rogue-front.faction") as FactionId;
    this.selectedFaction = FACTION_LIST.includes(stored) ? stored : "usa";
    const archetypes:MapArchetype[]=["balanced","river","urban","forest","highlands","coastal"];
    const remembered=localStorage.getItem("rogue-front.generatorArchetype") as MapArchetype;
    const generatorArchetype=archetypes.includes(remembered)?remembered:"balanced";
    const generatorSeed=Number(localStorage.getItem("rogue-front.generatorSeed")??crypto.getRandomValues(new Uint32Array(1))[0])>>>0;
    const storedSize=Number(localStorage.getItem("rogue-front.generatorSize"));
    const generatorSize=METRIC_MAP_SIZES.includes(storedSize)?storedSize:4096;
    const storedRegion=localStorage.getItem('rogue-front.region') as RegionId;
    const generatorRegion=REGION_IDS.includes(storedRegion)?storedRegion:'italy';
    const storedLayout=localStorage.getItem('rogue-front.layout'),generatorLayout=['0','1','2'].includes(storedLayout??'')?storedLayout!:'auto';
    const terrainOptions=localStorage.getItem('rogue-front.region')?{...decodeMapOptions(Number(localStorage.getItem('rogue-front.terrainOptions')??14)),region:generatorRegion}:regionDefaults(generatorRegion);
    const pendingId=`procedural-v18-${generatorArchetype}-${generatorSize}-${generatorSeed}`;
    const generated:MissionDef={id:pendingId,name:'Kaart valmib taustal…',seed:generatorSeed,briefing:'',objectives:[],map:{id:pendingId,name:'Kaart valmib taustal…',size:generatorSize,theme:'temperate',heightmap:'',maxHeight:40,bases:[{x:0,z:0,r:0},{x:0,z:0,r:0}],resources:[],features:[],landforms:[]}};
    const maps = [generated];
    const savedSessions = readSavedSessions(localStorage).filter(s=>s.mission.startsWith("procedural-")&&s.mode!=="campaign"&&s.key.includes(".platforms1."));
    this.root.innerHTML = `<div class="online-app offline-app"><header class="online-top"><div class="brand-block"><div class="eyebrow">TACTICAL OPERATIONS</div><h1>ROGUE FRONT</h1></div><div class="menu-actions"><label class="language-choice">Keel / Language <select data-language aria-label="Keel / Language"><option value="et" ${getLanguage()==="et"?"selected":""}>Eesti</option><option value="en" ${getLanguage()==="en"?"selected":""}>English</option></select></label> <button data-fullscreen></button> <button data-settings>SEADED</button> <button data-arsenal>3D ARSENAL</button> <button data-fx>EFEKTID</button> <button data-online>MITMIKMÄNG</button></div></header>${message?`<p class="section-note" role="alert">${esc(message)}</p>`:""}<main class="offline-main"><section class="room-panel"><div class="eyebrow">ALPHA · ÜKSIKMÄNG</div><h2>Uus lahing</h2>${savedSessions.length?`<div class="saved-sessions"><div class="eyebrow">SALVESTATUD LAHINGUD</div>${savedSessions.map((s,i)=>`<button type="button" data-resume="${i}"><strong>${esc(s.name)} · ${FACTIONS[s.faction].short}</strong><small>${s.mode==="campaign"?"OPERATSIOON":s.mode.toUpperCase()} · ${Math.floor(s.time/60)} min · ${esc(new Date(s.savedAt).toLocaleString("et-EE"))}${s.status!=="running"?" · LÕPETATUD":""}</small><span>${s.status==="running"?"JÄTKA":"VAATA"} →</span></button>`).join("")}</div>`:""}<p>Ehita baas. Kindlusta varustus. Juhi rindel kombineeritud vägesid.</p><form data-skirmish><label>Fraktsioon<select name="faction">${FACTION_LIST.map(f=>`<option value="${f}" ${f===this.selectedFaction?"selected":""}>${FACTIONS[f].name}${f==="china"?" · katsetusjärgus":""}</option>`).join("")}</select></label><p data-doctrine></p><label>Maskeerimisvärv<select name="camo">${camouflageProfiles.map(p=>`<option value="${p.id}" ${p.id===(localStorage.getItem('rogue-front.camo')??'standard')?'selected':''}>${p.name}</option>`).join('')}</select></label><div data-camo-swatch style="height:28px;border-radius:5px;border:1px solid #738477;margin:8px 0" aria-label="Maskeerimisvärvi eelvaade"></div><div class="offline-map-cards">${maps.map(m=>{const size=m.map.size??640;return `<button type="button" data-map-card="${m.id}">${m.map.features?.length?mapPreview(m):""}<strong>${m.id.startsWith("procedural-")?esc(m.map.name.toUpperCase()):m.id==="operation-tidebreaker"?"MURDLAINE · MERI":"ROHEORG · NÄIDIS"}</strong><small>${size} m · ${m.id.startsWith("procedural-")?(m.map.features?.length?generatedSummary(m):"Kontrollin läbipääse taustal"):m.id==="operation-tidebreaker"?"Laevad, sadamad ja ranniku lahing":"Näidiskaart · kompaktne jõemaastik"}</small></button>`;}).join("")}</div><label>Kaart<select name="map">${maps.map(m=>`<option value="${m.id}">${m.map.name}${m.id.startsWith("procedural-")?" · generaator":m.id==="operation-tidebreaker"?" · merevägi · katsetusjärgus":" · näidiskaart"}</option>`).join("")}</select></label><div data-generator class="choice-grid"><label><input name="fixedSeed" type="checkbox"/> Korda sisestatud seemet</label><label>Kaardiseeme<input name="mapSeed" type="number" min="0" max="4294967295" step="1" value="${generatorSeed}"/></label><label>Maastikupiirkond<select name="mapRegion">${REGION_IDS.map(id=>`<option value="${id}" ${id===generatorRegion?'selected':''}>${REGIONS[id].name}</option>`).join('')}</select></label><p class="region-description" data-region-description>${REGIONS[generatorRegion].description}</p><label>Paigutus<select name="mapLayout"><option value="auto">Seemne järgi</option>${REGION_PLANS[generatorRegion].map((p,i)=>`<option value="${i}" ${String(i)===generatorLayout?'selected':''}>${p.name}</option>`).join('')}</select></label><label>Ala iseloom<select name="mapArchetype">${archetypes.map(a=>`<option value="${a}" ${a===generatorArchetype?"selected":""}>${({balanced:"Tasakaalustatud",river:"Jõeorg",urban:"Linnapiirkond",forest:"Metsapiirkond",highlands:"Kõrgustik",coastal:"Rannik"} as Record<string,string>)[a]}</option>`).join("")}</select></label><label>Suurus<select name="mapSize">${METRIC_MAP_SIZES.map(size=>`<option value="${size}" ${size===generatorSize?"selected":""}>${size} × ${size} m${size>=4096?" · suurem koormus":""}</option>`).join("")}</select></label>${(["sea","mountains","forest","river","lakes"] as const).map(key=>`<label><input type="checkbox" name="terrain-${key}" ${(key==="lakes"?terrainOptions.lakes!==false:terrainOptions[key])?"checked":""}/> ${{sea:"Meri",mountains:"Mäed",forest:"Metsad",river:"Jõgi",lakes:"Järved"}[key]}</label>`).join("")}<button type="button" data-new-seed>UUS KAART</button></div><div class="choice-grid"><label>Režiim<select name="mode">${(["skirmish","conquest","breakthrough","attrition","assault"] as MatchMode[]).map(m=>`<option value="${m}" ${m==="conquest"?"selected":""}>${m.toUpperCase()}${m==="conquest"?" · soovitatud":" · katsetusjärgus"}</option>`).join("")}</select></label><label>AI raskus<select name="difficulty"><option value="easy">Lihtne</option><option value="normal" selected>Normaalne</option><option value="hard">Raske</option></select></label></div><p data-rules></p><label>Mänguviis<select name="deployment"><option value="base" selected>Tavaline — peamaja ja automaatne ehitus</option><option value="ready">Näidis / test — valmis baas ja üksused</option></select></label><label>Koosseis<select name="deck"><option value="open">Põhiklassid — muudetav varustus</option><option value="deck" ${new URLSearchParams(location.search).get("setup")==="deck"?"selected":""}>Minu salvestatud battlegroup / deck</option></select></label><p data-deck></p><div class="room-actions"><button type="button" data-edit-deck>MUUDA DECKI</button><button class="primary" type="submit">ALUSTA LAHINGUT</button></div></form></section><section class="room-panel"><div class="eyebrow">PROTSEDUURNE LAHINGUVÄLI</div><h2>Baas, varustus ja kombineeritud väed</h2><p><button type="button" class="primary" data-fx>KUULA JA VAATA EFEKTE</button></p><p>Plahvatused, mürsujoad, tulekahju, veepritsmed ja igale relvale oma heli. Sama süsteem töötab lahingus.</p><p>Kaart valmib brauseris taustal, ilma serveri järjekorrata. Valmis eelvaade näitab sama kaarti, millel lahing algab. Sama kaardi kordamiseks märgi „Korda sisestatud seemet”.</p><p>Ehita juhtimis- ja hooldushooned. Varustuskopterid saabuvad kaardi tagant; lennuvälja juures olev ladu avab kaubalennud.</p><p>Vali põhiklass ja muuda selle relvi, kaitset ning liikuvust töötava lao juures. Luure, varustus ja väeliikide koostöö määravad lahingu.</p><p class="section-note">Parem hiir liigub või ründab; A + parem hiir ründab liikudes; X peatab. F8 salvestab jõudlusraporti.</p></section></main></div>`;
    this.root.querySelector<HTMLSelectElement>("[data-language]")!.onchange=e=>setLanguage((e.target as HTMLSelectElement).value==="en"?"en":"et");
    this.root.querySelectorAll<HTMLButtonElement>("[data-resume]").forEach(button=>button.onclick=()=>{
      const saved=savedSessions[Number(button.dataset.resume)];
      if(!saved)return;
      try {
        if(!localStorage.getItem(saved.key)){button.textContent="Salvestus puudub — alusta uut lahingut";button.disabled=true;return;}
        location.href=`${location.pathname}?${savedSessionQuery(saved)}`;
      }catch{button.textContent="Brauser ei luba salvestust lugeda";}
    });
    this.root.querySelector<HTMLButtonElement>("[data-arsenal]")!.onclick=()=>{location.href="./arsenal.html";};
    this.root.querySelectorAll<HTMLButtonElement>("[data-fx]").forEach(b=>b.onclick=()=>{location.href=`${location.pathname}?fx=1`;});
    this.root.querySelector<HTMLButtonElement>("[data-settings]")!.onclick=()=>this.settings.open();
    const form=this.root.querySelector<HTMLFormElement>("[data-skirmish]")!;
    const map=form.elements.namedItem("map") as HTMLSelectElement;
    const storedMap=localStorage.getItem("rogue-front.selectedMap");
    if(localStorage.getItem("rogue-front.generatorVersion")==="8"&&maps.some(m=>m.id===storedMap))map.value=storedMap!;
    localStorage.setItem("rogue-front.generatorVersion","8");
    const refreshMap=()=>{this.root.querySelector<HTMLElement>("[data-generator]")!.hidden=!map.value.startsWith("procedural-");localStorage.setItem("rogue-front.selectedMap",map.value);this.root.querySelectorAll<HTMLButtonElement>("[data-map-card]").forEach(b=>{const selected=b.dataset.mapCard===map.value;b.classList.toggle("selected",selected);b.setAttribute("aria-pressed",String(selected));});};
    map.onchange=refreshMap;this.root.querySelectorAll<HTMLButtonElement>("[data-map-card]").forEach(b=>b.onclick=()=>{map.value=b.dataset.mapCard!;refreshMap();});refreshMap();
    const seedInput=form.elements.namedItem("mapSeed") as HTMLInputElement,archetypeInput=form.elements.namedItem("mapArchetype") as HTMLSelectElement;
    const sizeInput=form.elements.namedItem("mapSize") as HTMLSelectElement,regionInput=form.elements.namedItem("mapRegion") as HTMLSelectElement,layoutInput=form.elements.namedItem("mapLayout") as HTMLSelectElement;
    const regenerate=()=>{
      const seed=Number(seedInput.value)>>>0;seedInput.value=String(seed);
      seedInput.setCustomValidity('');prepared=prepare();
      localStorage.setItem('rogue-front.region',regionInput.value);localStorage.setItem('rogue-front.layout',layoutInput.value);
      localStorage.setItem('rogue-front.generatorSize',sizeInput.value);localStorage.setItem('rogue-front.generatorSeed',String(seed));localStorage.setItem('rogue-front.generatorArchetype',archetypeInput.value);
      const card=this.root.querySelector<HTMLButtonElement>('[data-map-card]')!;card.innerHTML='<strong>KAART VALMIB TAUSTAL…</strong><small>Valin maastikku ja kontrollin läbipääse.</small>';

    };
    const fixedInput=form.elements.namedItem('fixedSeed') as HTMLInputElement;
    let revision=0,worker:Worker|undefined;
    const prepare=()=>{
      const current=++revision,archetype=archetypeInput.value as MapArchetype,size=Number(sizeInput.value),seed=Number(seedInput.value)>>>0,fixed=fixedInput.checked,options={region:regionInput.value as RegionId,...(layoutInput.value==='auto'?{}:{layout:Number(layoutInput.value) as RegionLayoutIndex}),sea:(form.elements.namedItem("terrain-sea") as HTMLInputElement).checked,mountains:(form.elements.namedItem("terrain-mountains") as HTMLInputElement).checked,forest:(form.elements.namedItem("terrain-forest") as HTMLInputElement).checked,river:(form.elements.namedItem("terrain-river") as HTMLInputElement).checked,lakes:(form.elements.namedItem("terrain-lakes") as HTMLInputElement).checked};
      localStorage.setItem("rogue-front.terrainOptions",String(mapOptionsMask(options)));
      worker?.terminate();worker=undefined;
      const local=()=>new Promise<import('../sim/types').MissionDef>((resolve,reject)=>{
        if(current!==revision){reject(new Error('Kaardivalik muutus.'));return;}
        const job=new Worker(new URL('./MapPreparation.worker.ts',import.meta.url),{type:'module'});worker=job;
        job.onmessage=event=>{if(current!==revision)return;if(event.data.preview){const m=event.data.preview as MissionDef;this.root.querySelector<HTMLButtonElement>('[data-map-card]')!.innerHTML=mapPreview(m)+`<strong>${esc(m.map.name)}</strong><small>Kontrollin läbipääse taustal · ${m.map.size} m</small>`;return;}job.terminate();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.mission);};
        job.onerror=()=>{job.terminate();reject(new Error('Kaardi loomine ebaõnnestus.'));};
        job.postMessage({archetype,size,seed,fixed,options});
      });
      const promise=local();
      void promise.then(m=>{
        if(current!==revision)return;
        seedInput.value=String(m.seed);map.options[0].value=m.id;map.options[0].textContent=m.map.name;map.value=m.id;
        const card=this.root.querySelector<HTMLButtonElement>('[data-map-card]')!;card.dataset.mapCard=m.id;card.innerHTML=mapPreview(m)+`<strong>${esc(m.map.name)}</strong><small>KAART VALMIS · ${m.map.size} m · ${generatedSummary(m)}</small>`;
        storePreparedMission(sessionStorage,m);refreshMap();
      }).catch(error=>{if(current===revision)this.root.querySelector<HTMLButtonElement>('[data-map-card]')!.textContent=error instanceof Error?error.message:"Kaardi loomine ebaõnnestus.";});
      return promise;
    };
    this.cancelMapPreparation=()=>{revision++;worker?.terminate();};
    let prepared=prepare();fixedInput.onchange=()=>{prepared=prepare();};
    form.querySelectorAll<HTMLInputElement>('[name^="terrain-"]').forEach(el=>el.onchange=regenerate);
    regionInput.onchange=()=>{
      const id=regionInput.value as RegionId,defaults=regionDefaults(id);
      for(const key of ['sea','mountains','forest','river','lakes'] as const)(form.elements.namedItem(`terrain-${key}`) as HTMLInputElement).checked=defaults[key];
      layoutInput.innerHTML='<option value="auto">Seemne järgi</option>'+REGION_PLANS[id].map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');
      this.root.querySelector<HTMLElement>('[data-region-description]')!.textContent=REGIONS[id].description;
      regenerate();
    };
    layoutInput.onchange=regenerate;
    seedInput.onchange=()=>{fixedInput.checked=true;regenerate();};archetypeInput.onchange=()=>{
      const key=({coastal:'sea',river:'river',forest:'forest',highlands:'mountains'} as Record<string,string>)[archetypeInput.value];
      if(key)(form.elements.namedItem(`terrain-${key}`) as HTMLInputElement).checked=true;
      regenerate();
    };sizeInput.onchange=regenerate;
    this.root.querySelector<HTMLButtonElement>("[data-new-seed]")!.onclick=()=>{fixedInput.checked=false;seedInput.value=String(crypto.getRandomValues(new Uint32Array(1))[0]);regenerate();};
    bindFullscreen(this.root.querySelector<HTMLButtonElement>("[data-fullscreen]")!);
    const faction=form.elements.namedItem("faction") as HTMLSelectElement;
    const mode=form.elements.namedItem("mode") as HTMLSelectElement;
    const camo=form.elements.namedItem('camo') as HTMLSelectElement,refreshCamo=()=>{localStorage.setItem('rogue-front.camo',camo.value);const p=camouflageProfiles.find(p=>p.id===camo.value)??camouflageProfiles[0];this.root.querySelector<HTMLElement>('[data-camo-swatch]')!.style.background=`repeating-linear-gradient(135deg,${p.colors[0]} 0 18px,${p.colors[1]} 18px 32px,${p.colors[2]} 32px 48px)`;};camo.onchange=refreshCamo;refreshCamo();

    const refresh=()=>{
      this.selectedFaction=faction.value as FactionId;localStorage.setItem("rogue-front.faction",faction.value);
      this.root.querySelector<HTMLElement>("[data-doctrine]")!.textContent=FACTIONS[this.selectedFaction].doctrineBlurb;
      this.root.querySelector<HTMLElement>("[data-rules]")!.textContent=MODE_RULES[mode.value as MatchMode].description;
      const deck=loadAllDecks()[this.selectedFaction];this.root.querySelector<HTMLElement>("[data-deck]")!.textContent=`${deck.name} · ${deck.slots.reduce((n,s)=>n+s.count,0)} üksust`;
    };
    faction.onchange=refresh;mode.onchange=refresh;refresh();
    this.root.querySelector<HTMLButtonElement>("[data-edit-deck]")!.onclick=()=>dispatchEvent(new CustomEvent("rogue-front:open-deck",{detail:{faction:this.selectedFaction}}));
    this.root.querySelector<HTMLButtonElement>("[data-online]")!.onclick=()=>void this.startOnline();
    form.onsubmit=async e=>{
      e.preventDefault();if(this.busy)return;const data=new FormData(form);const fac=data.get("faction") as FactionId;
      if(data.get("deck")==="deck") {
        const deck=loadAllDecks()[fac],errors=validateDeck(deck);
        if(errors.length){const info=this.root.querySelector<HTMLElement>("[data-deck]")!;info.textContent="Koosseis pole valmis: "+errors.join(" · ")+". Ava Muuda decki.";info.setAttribute("role","alert");return;}
        sessionStorage.setItem("rogue-front.activeDeck",JSON.stringify(deck));
      }
      else sessionStorage.removeItem("rogue-front.activeDeck");
      const preparationRevision=revision;
      this.busy=true;form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('input,select,button').forEach(el=>el.disabled=true);const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;submit.disabled=true;submit.textContent="AVAN LAHINGU…";
      let missionId=String(data.get("map"));
      try{
        const mission=await prepared;if(preparationRevision!==revision){this.busy=false;return;}missionId=mission.id;storePreparedMission(sessionStorage,mission);
      }catch(error){seedInput.setCustomValidity(error instanceof Error?error.message:"Kaardi loomine ebaõnnestus.");seedInput.reportValidity();this.busy=false;form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLButtonElement>('input,select,button').forEach(el=>el.disabled=false);submit.textContent="ALUSTA LAHINGUT";return;}
      const query=new URLSearchParams({mission:missionId,mode:"skirmish",faction:fac,gameMode:String(data.get("mode")),difficulty:String(data.get("difficulty")),deployment:String(data.get("deployment")),camo:String(data.get("camo"))});
      location.href=`${location.pathname}?${query}`;
    };
    this.root.querySelectorAll<HTMLButtonElement>("[data-mission]").forEach(b=>b.onclick=()=>{sessionStorage.removeItem("rogue-front.activeDeck");location.href=`${location.pathname}?mission=${encodeURIComponent(b.dataset.mission!)}&faction=${this.selectedFaction}`;});
  }
  async start(): Promise<void> { this.showOffline(); }
  private async startOnline(): Promise<void> {
    this.cancelMapPreparation();
    if (!getAuthToken()) return this.authScreen();
    try {
      const r = await api.me(); this.user = r.user; this.room = r.activeRoom;
      if (this.room) { this.renderMain(); return this.poll(); }
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
    this.root.innerHTML = `<div class="online-app"><header class="online-top"><div class="brand-block"><div class="eyebrow">ONLINE COMMAND</div><h1>ROGUE FRONT</h1></div><nav><button data-tab="lobby" class="active">LOBBY</button><button data-tab="ranked">RANKED</button><button data-tab="live">LIVE</button><button data-tab="friends">SÕBRAD</button><button data-tab="profile">PROFIIL</button></nav><div class="account"><span class="dot online"></span><b>${esc(this.user.displayName)}</b><small>@${esc(this.user.username)}</small><button data-action="logout">Välju</button></div></header><div class="lobby-invites" data-invites></div><main class="online-main"><section class="online-content" data-view></section><aside class="online-side"><div class="side-title">MINU LAHING</div><div class="side-card" data-side-faction><span>RAHVUS</span><b>${FACTIONS[this.selectedFaction].short}</b><small>${esc(FACTIONS[this.selectedFaction].doctrineBlurb)}</small></div><div class="side-card" data-side-deck><span>DECK</span><b>${esc(d.name)}</b><small>${d.slots.length} kaarti · ${d.slots.reduce((n, x) => n + x.count, 0)} üksust</small></div><div class="side-card stats"><span>RATING</span><b>${this.user.stats.rating ?? 1000}</b><small>Level ${this.user.stats.level ?? 1} · ${this.user.stats.xp ?? 0} XP</small></div><div class="side-card"><span>DECK BUILDER</span><button class="secondary wide" data-action="deck">AVA DECK</button></div></aside></main><div class="toast" data-toast></div></div>`;
    this.root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => b.onclick = () => { this.tab = b.dataset.tab as typeof this.tab; this.root.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("active", x === b)); this.stopPoll(); this.renderView(); this.poll(); });
    this.root.querySelector<HTMLButtonElement>('[data-action="logout"]')!.onclick = async () => { this.stopPoll(); try{await api.logout();}finally{this.room = null; this.roomChats.clear(); this.user = null; this.authScreen();} };
    this.root.querySelector<HTMLButtonElement>('[data-action="deck"]')!.onclick = () => dispatchEvent(new CustomEvent("rogue-front:open-deck",{detail:{faction:this.selectedFaction}}));
    this.renderView();void this.loadInvites();
  }

  private renderView(): void { if (this.room&&this.tab==="lobby") return this.renderRoom(); if (this.tab === "lobby") void this.renderLobby(); else if (this.tab === "ranked") void this.renderRanked(); else if (this.tab === "live") void this.renderLive(); else if (this.tab === "friends") void this.renderFriends(); else this.renderProfile(); }

  private async renderRanked(): Promise<void> {
    const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view || !this.user) return;
    const faction = this.selectedFaction; const deck = loadAllDecks()[faction];
    try { const [board, status] = await Promise.all([api.leaderboard(), api.matchmakingStatus()]);if(this.tab!=="ranked"||!view.isConnected)return;
      view.innerHTML = `<div class="view-head"><div><div class="eyebrow">RANKED COMMAND</div><h2>Ranked matchmaking</h2><p>Server leiab sulle võimalikult lähedase ratinguga vastase.</p></div></div><div class="ranked-grid"><section class="room-panel"><div class="panel-title">MATCHMAKING</div><div class="setting-row"><span>MINU RATING</span><b>${this.user.stats.rating ?? 1000}</b></div><div class="setting-row"><span>VALITUD RAHVUS</span><b>${FACTIONS[faction].short}</b></div><div class="setting-row"><span>DECK</span><b>${esc(deck.name)}</b></div><div class="room-actions">${status.queued ? `<button class="secondary" data-rank-action="leave">TÜHISTA OTSING</button><span class="wait-label">OTSIN VASTAST…</span>` : `<button class="primary" data-rank-action="queue">OTSI 1v1 VASTAST</button>`}</div></section><section class="room-panel"><div class="panel-title">TOP 50</div><div class="leaderboard">${board.players.map((p,i)=>`<div class="player-row"><b>#${i+1}</b><div><strong>${esc(p.displayName)}</strong><small>@${esc(p.username)}</small></div><span>${p.stats.rating ?? 1000}</span></div>`).join("")}</div></section></div>`;
      view.querySelector<HTMLButtonElement>('[data-rank-action="queue"]')?.addEventListener("click", async () => { try { await api.matchmaking(faction,deck); await this.renderRanked(); } catch(e){ this.toast(e instanceof Error?e.message:"Matchmaking ebaõnnestus."); } });
      view.querySelector<HTMLButtonElement>('[data-rank-action="leave"]')?.addEventListener("click", async () => { await api.matchmakingLeave(); await this.renderRanked(); });
    } catch(e){ this.toast(e instanceof Error?e.message:"Ranked laadimine ebaõnnestus."); }
  }

  private async renderLobby(): Promise<void> {
    const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view) return;
    const search=view.querySelector<HTMLInputElement>("[data-room-search]")?.value??"";
    try { const r = await api.rooms(); if(!view.isConnected||this.tab!=="lobby"||this.room||view.querySelector("[data-room-search]:focus"))return; if (r.myRoom) { this.room = r.myRoom; return this.renderRoom(); }
      view.innerHTML = `<div class="view-head"><div><div class="eyebrow">PUBLIC MATCHMAKING</div><h2>Mänguruumid</h2><p>Vali 1v1, 2v2 või nelja mängija vabavõitlus. Täida kohad sõprade või AI-ga.</p></div><button class="primary" data-action="create">+ LOO RUUM</button></div><div class="room-toolbar"><input data-room-search placeholder="Otsi ruumi või kaarti…"><button data-action="refresh">VÄRSKENDA</button><span>${r.rooms.length} avatud ruumi</span></div><div class="room-list" data-rooms></div><div class="section-note">Lobby kasutab serveripoolset staatust. READY, host, reeglid ja mängu käivitamine ei sõltu kliendi UI-st.</div>`;
      const list = view.querySelector<HTMLElement>("[data-rooms]")!; const renderRooms = (filter = "") => { list.innerHTML = r.rooms.filter(x => x.missionId.startsWith("procedural-")).filter(x => `${x.name} ${x.mapId} ${x.missionId}`.toLowerCase().includes(filter.toLowerCase())).map(x => this.roomCard(x)).join("") || `<div class="empty">Ühtegi sobivat lobby't ei ole. Loo uus mänguruum.</div>`; list.querySelectorAll<HTMLButtonElement>("[data-join]").forEach(b => b.onclick = () => void this.join(b.dataset.join!)); };
      const searchInput=view.querySelector<HTMLInputElement>("[data-room-search]")!;searchInput.value=search;renderRooms(search); view.querySelector<HTMLInputElement>("[data-room-search]")!.oninput = (e) => renderRooms((e.target as HTMLInputElement).value); view.querySelector<HTMLButtonElement>('[data-action="refresh"]')!.onclick = () => void this.renderLobby(); view.querySelector<HTMLButtonElement>('[data-action="create"]')!.onclick = () => this.createRoomModal();
    } catch (err) { this.toast(err instanceof Error ? err.message : "Lobby laadimine ebaõnnestus."); }
  }

  private roomCard(room: Room): string {
    const mission = {id:room.missionId,name:"Protseduurkaart",map:{id:room.mapId,name:"Protseduurkaart · "+room.missionId.split("-").at(-1)}}; const host = room.members[0];
    return `<article class="room-card"><div class="room-main"><div class="room-title"><b>${esc(room.name)}</b><span class="badge">${room.members.length}/${room.capacity??2} · ${room.format==="teams"?"2v2":room.format==="ffa"?"1v1v1v1":"1v1"}</span></div><div class="room-meta">${esc(mission?.name || room.missionId)} · ${esc(room.mapId || mission?.map.id || "map")}</div><div class="room-tags"><span>${room.rules.fog}</span><span>${room.rules.income} income</span><span>${room.rules.victory}</span></div></div><div class="room-player"><strong>${esc(host?.displayName || "Host")}</strong><small>${host?.faction ? FACTIONS[host.faction as FactionId]?.short || host.faction : "—"}</small></div><button class="join-btn" data-join="${esc(room.id)}">LIITU</button></article>`;
  }

  private createRoomModal(): void {
    const missions:MissionDef[] = []; const decks = loadAllDecks();
    this.modal(`<div class="modal-head"><div class="eyebrow">CREATE MATCH</div><h2>Uus mitmikmäng</h2></div><form id="create-room-form"><label>Mänguviis<select name="format"><option value="duel">1v1</option><option value="teams">2v2 · kaks tiimi</option><option value="ffa">1v1v1v1 · igaüks enda eest</option></select></label><label>Ruumi nimi<input name="name" value="${esc(this.user?.displayName || "")} vs World" maxlength="28" required></label><label>Kaart<select name="mission">${missions.map(m => `<option value="${esc(m.id)}">${esc(m.name)} — ${esc(m.map.name)}</option>`).join("")}${REGION_IDS.flatMap(region=>METRIC_MAP_SIZES.map(size=>`<option value="__random__:balanced:${size}:${region}">GENERAATOR · ${REGIONS[region].name} · ${size} m</option>`)).join("")}</select></label><label>Paigutus<select name="layout"><option value="auto">Seemne järgi</option></select></label><div class="choice-grid"><label>Rahvus<select name="faction">${FACTION_LIST.map(f => `<option value="${f}" ${f === this.selectedFaction ? "selected" : ""}>${FACTIONS[f].name}</option>`).join("")}</select></label><label>Deck<select name="deck">${FACTION_LIST.map(f => `<option value="${f}">${esc(decks[f].name)}</option>`).join("")}</select></label></div><div class="rule-grid"><label>Sissetulek<select name="income"><option value="standard">Standard</option><option value="high">Kõrge</option><option value="low">Madal</option></select></label><label>Fog of War<select name="fog"><option value="wargame">Wargame</option><option value="reduced">Reduced</option><option value="off">Off</option></select></label><label>Võit<select name="victory"><option value="hq">Hävitada HQ</option><option value="annihilation">Täielik hävitamine</option></select></label></div><div class="modal-actions"><button type="button" data-close>CANCEL</button><button class="primary" type="submit">LOO LOBBY</button></div><div class="form-error" data-modal-error></div></form>`);
    const form = document.querySelector<HTMLFormElement>("#create-room-form")!; bindOnlineLayout(form);
    const factionSelect=form.elements.namedItem("faction") as HTMLSelectElement,deckSelect=form.elements.namedItem("deck") as HTMLSelectElement;
    deckSelect.value=factionSelect.value;factionSelect.onchange=()=>{deckSelect.value=factionSelect.value;};deckSelect.onchange=()=>{factionSelect.value=deckSelect.value;};
    form.onsubmit = async (e) => { e.preventDefault(); if(form.dataset.pending)return;form.dataset.pending="true"; const fd = new FormData(form); const faction = String(fd.get("faction")) as FactionId; this.selectedFaction = faction; const deck = decks[faction]; const selectedMap = String(fd.get("mission"));
      const missionId = generatedSelectionId(selectedMap,String(fd.get("layout")??"auto"));
      try { const r = await api.createRoom({ format:fd.get("format"),name: fd.get("name"), missionId, mapId: missionId, faction, deck, rules: { income: fd.get("income"), fog: fd.get("fog"), victory: fd.get("victory") } }); this.closeModal(); this.room = r.room; this.renderRoom(); } catch (err) { form.querySelector<HTMLElement>("[data-modal-error]")!.textContent = err instanceof Error ? err.message : "Ruumi loomine ebaõnnestus.";delete form.dataset.pending; }
    };
  }

  private async join(id: string): Promise<void> {
    const deck = loadAllDecks()[this.selectedFaction]; try { const r = await api.joinRoom(id, { faction: this.selectedFaction, deck }); this.room = r.room; this.renderRoom(); } catch (err) { this.toast(err instanceof Error ? err.message : "Liitumine ebaõnnestus."); }
  }

  private renderRoom(): void {
    if (!this.room || !this.user) return;
    if(this.room.status==="started")return this.launchGame();
    const view=this.root.querySelector<HTMLElement>("[data-view]");if(!view)return;
    const signature=JSON.stringify(this.room);
    this.tab="lobby";
    this.root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(button=>{button.classList.toggle("active",button.dataset.tab==="lobby");if(button.dataset.tab==="lobby")button.textContent="MINU RUUM";});
    if(view.dataset.roomState===signature&&view.querySelector(".room-view"))return;
    const focused=document.activeElement instanceof HTMLInputElement&&document.activeElement.closest(".chat-panel")?document.activeElement:null;
    const selection=focused?[focused.selectionStart,focused.selectionEnd] as const:null;
    const oldChat=this.roomChats.get(this.room.id)??null;
    view.dataset.roomState=signature;view.dataset.roomId=this.room.id;
    const room = this.room; const me = room.members.find(m => m.userId === this.user!.id); const host = room.hostId === this.user.id;
    const decks = loadAllDecks();
    if(me){
      this.selectedFaction=me.faction as FactionId;
      const factionInfo=FACTIONS[this.selectedFaction],deck=me.deck??decks[this.selectedFaction];
      const sideFaction=this.root.querySelector<HTMLElement>('[data-side-faction]'),sideDeck=this.root.querySelector<HTMLElement>('[data-side-deck]');
      if(sideFaction){sideFaction.querySelector('b')!.textContent=factionInfo.short;sideFaction.querySelector('small')!.textContent=factionInfo.doctrineBlurb;}
      if(sideDeck){sideDeck.querySelector('b')!.textContent=deck.name;sideDeck.querySelector('small')!.textContent=`${deck.slots.length} kaarti · kinnitatud koosseis`;}
    }
    this.root.querySelector<HTMLElement>("[data-view]")!.innerHTML = `<div class="room-view"><div class="view-head"><div><div class="eyebrow">MATCH ROOM // ${esc(room.id)}</div><h2>${esc(room.name)}</h2><p>${esc(MISSIONS.find(m => m.id === room.missionId)?.briefing || "")}</p></div><span class="room-status ${room.status}">${room.status === "started" ? "KÄIVITUB" : "OOTEL"}</span></div><div class="versus"><div class="player-slot ${me?.ready ? "ready" : ""}"><div class="slot-num">${room.format==='teams'?`TIIM ${(me?.alliance??0)+1}`:`MÄNGIJA ${room.members.findIndex(m=>m.userId===this.user!.id)+1}`}${host?" · HOST":""}</div><h3>${esc(me?.displayName || this.user.displayName)}</h3><span>@${esc(me?.username || this.user.username)}</span>${room.format==='teams'?`<label>Minu tiim<select data-alliance><option value="0" ${me?.alliance===0?'selected':''}>Tiim 1</option><option value="1" ${me?.alliance===1?'selected':''}>Tiim 2</option></select></label>`:''}<select data-faction>${FACTION_LIST.map(f => `<option value="${f}" ${f === me?.faction ? "selected" : ""}>${FACTIONS[f].name}</option>`).join("")}</select><select data-deck>${FACTION_LIST.map(f => `<option value="${f}" ${f === me?.deck?.faction ? "selected" : ""}>${esc(decks[f].name)}</option>`).join("")}</select><div class="ready-state">${me?.ready ? "VALMIS" : "POLE VALMIS"}</div></div>${Array.from({length:(room.capacity??2)-1},(_,i)=>room.members.filter(m=>m.userId!==this.user!.id)[i]).map((m,i)=>`<div class="player-slot ${m?.ready?'ready':m?'':'empty'}"><div class="slot-num">${room.format==='teams'?`TIIM ${(m?.alliance??i%2)+1}`:`MÄNGIJA ${m?room.members.indexOf(m)+1:i+2}`}${m?.bot?' · AI':''}${m?.userId===room.hostId?' · HOST':''}</div><h3>${esc(m?.displayName??'Vaba koht')}</h3><span>${m?.bot?({easy:'Kerge',normal:'Tavaline',hard:'Raske'}[m.difficulty??'normal']):m?'@'+esc(m.username):'Ootan mängijat või AI-d'}</span><div class="opponent-faction">${m?esc(FACTIONS[m.faction as FactionId]?.name??m.faction):'—'}</div><div class="ready-state">${m?(m.ready?'VALMIS':'POLE VALMIS'):'TÜHI'}</div>${host&&m?.bot?`<button data-remove-bot="${esc(m.userId)}">EEMALDA AI</button>`:''}</div>`).join('')}</div><div class="room-grid"><section class="room-panel"><div class="panel-title">LAHINGU SEADED ${host ? "· HOST" : "· HOSTI VALIK"}</div><div class="setting-row"><span>KAART</span><b>${esc(onlineMapLabel(room.missionId))}</b></div><div class="setting-row"><span>FOG OF WAR</span><b>${esc(room.rules.fog)}</b></div><div class="setting-row"><span>SISSETULEK</span><b>${esc(({standard:"Tavaline",high:"Kõrge",low:"Madal"} as Record<string,string>)[room.rules.income]??room.rules.income)}</b></div><div class="setting-row"><span>VÕIT</span><b>${esc(room.rules.victory==="hq"?"Peamaja hävitamine":"Täielik hävitamine")}</b></div>${host ? `<button class="secondary wide" data-action="settings">MUUDA REEGLEID</button>` : ""}</section><section class="room-panel chat-panel"><div class="panel-title">RUUMI VESTLUS</div><div class="chat-log" data-chat role="log" aria-live="polite" aria-label="Ruumi vestlus"><div><b>SERVER</b> Lobby on valmis. Kõik inimmängijad peavad valima koosseisu ja kinnitama valmisoleku. AI kohad on automaatselt valmis.</div></div><form class="chat-form" data-chat-form><input name="message" maxlength="500" autocomplete="off" aria-label="Sõnum vastasele" placeholder="Kirjuta vastasele…"><button class="secondary" type="submit">SAADA</button></form></section></div>${host&&room.members.length<(room.capacity??2)?`<section class="room-panel ai-controls"><div class="panel-title">LISA AI MÄNGIJA</div><div class="choice-grid"><label>Rahvus<select data-ai-faction>${FACTION_LIST.map(f=>`<option value="${f}">${FACTIONS[f].name}</option>`).join('')}</select></label><label>Raskus<select data-ai-difficulty><option value="easy">Kerge</option><option value="normal" selected>Tavaline</option><option value="hard">Raske</option></select></label>${room.format==='teams'?`<label>Tiim<select data-ai-alliance><option value="0">Tiim 1</option><option value="1">Tiim 2</option></select></label>`:''}<button data-add-bot>LISA AI</button></div></section>`:''}<div class="room-actions"><button data-action="leave">LAHKU</button>${host ? `<button class="secondary" data-action="invite">KUTSU SÕBER</button>` : ""}<button class="ready-btn ${me?.ready ? "ready" : ""}" data-action="ready">${me?.ready ? "TÜHISTA VALMISOLEK" : "OLEN VALMIS"}</button>${host ? `<button class="primary start-btn" data-action="start" ${room.members.length === (room.capacity??2) && room.members.every(m => m.ready) ? "" : "disabled"}>ALUSTA LAHINGUT</button>` : `<span class="wait-label">${room.members.length < (room.capacity??2) ? "Ootan mängijate lisandumist…" : room.members.every(m => m.ready) ? "Ootan hosti…" : "Oota vastase READY-d…"}</span>`}</div></div>`;
    if(oldChat){view.querySelector(".chat-panel")!.replaceWith(oldChat);if(focused&&selection){focused.focus({preventScroll:true});focused.setSelectionRange(...selection);}}
    this.roomChats.set(room.id,view.querySelector<HTMLElement>(".chat-panel")!);
    this.bindRoomControls(); this.poll();
  }

  private bindRoomControls(): void {
    if (!this.room || !this.user) return; const roomId = this.room.id; const me = this.room.members.find(m => m.userId === this.user!.id);
    const faction = this.root.querySelector<HTMLSelectElement>("[data-faction]")!; const deck = this.root.querySelector<HTMLSelectElement>("[data-deck]")!;
    const sync = (ready: boolean) => this.roomAction(async()=>{
      const f=faction.value as FactionId,d=loadAllDecks()[f];
      const errors=validateDeck(d);if(errors.length)throw new Error("Koosseis pole valmis: "+errors.join(" · "));
      const r=await api.ready(roomId,{ready,faction:f,deck:d,...(this.room?.format==="teams"?{alliance:Number(this.root.querySelector<HTMLSelectElement>("[data-alliance]")!.value)}:{})});this.selectedFaction=f;this.room=r.room;this.renderRoom();
    });
    this.root.querySelector<HTMLButtonElement>('[data-action="ready"]')!.onclick=()=>void sync(!me?.ready);
    const alliance=this.root.querySelector<HTMLSelectElement>('[data-alliance]');if(alliance)alliance.onchange=()=>void sync(false);
    this.root.querySelector<HTMLButtonElement>('[data-add-bot]')?.addEventListener('click',()=>void this.roomAction(async()=>{
      const faction=this.root.querySelector<HTMLSelectElement>('[data-ai-faction]')!.value,difficulty=this.root.querySelector<HTMLSelectElement>('[data-ai-difficulty]')!.value,alliance=this.root.querySelector<HTMLSelectElement>('[data-ai-alliance]')?.value;
      const r=await api.bot(roomId,{faction,difficulty,...(alliance!=null?{alliance:Number(alliance)}:{})});this.room=r.room;this.renderRoom();
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-remove-bot]').forEach(b=>b.onclick=()=>void this.roomAction(async()=>{const r=await api.bot(roomId,{remove:b.dataset.removeBot});this.room=r.room;this.renderRoom();}));
    faction.onchange=()=>{deck.value=faction.value;void sync(false);};
    deck.onchange=()=>{faction.value=deck.value;void sync(false);};
    this.root.querySelector<HTMLButtonElement>('[data-action="leave"]')!.onclick=()=>void this.roomAction(async()=>{
      await api.leaveRoom(roomId);this.roomChats.delete(roomId);this.room=null;this.closeModal();this.renderMain();
    });
    this.root.querySelector<HTMLButtonElement>('[data-action="invite"]')?.addEventListener("click",()=>void this.inviteFriendModal().catch(e=>this.toast(e instanceof Error?e.message:"Kutset ei saanud avada.")));
    this.root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener("click",()=>void this.roomAction(async()=>{
      const r=await api.start(roomId);this.room=r.room;this.launchGame();
    }));
    this.root.querySelector<HTMLButtonElement>('[data-action="settings"]')?.addEventListener("click",()=>this.settingsModal());
    const chatForm=this.root.querySelector<HTMLFormElement>("[data-chat-form]")!;
    // Preserve this form and its pending submission across room updates.
    if(!chatForm.dataset.bound){chatForm.dataset.bound="true";
      chatForm.onsubmit=async e=>{
        e.preventDefault();const input=chatForm.querySelector<HTMLInputElement>("input")!,button=chatForm.querySelector<HTMLButtonElement>("button")!;
        const draft=input.value,message=draft.trim();if(!message||button.disabled)return;
        button.disabled=true;button.textContent="SAADAN…";
        try{await api.sendChat(roomId,message);if(input.value===draft)input.value="";await this.loadChat(roomId);}
        catch(err){this.toast(err instanceof Error?err.message:"Sõnumi saatmine ebaõnnestus.");}
        finally{button.disabled=false;button.textContent="SAADA";}
      };
    }
    void this.loadChat(roomId);
  }

  private async roomAction(action:()=>Promise<void>):Promise<void>{
    if(this.roomActionPending)return;this.roomActionPending=true;this.stopPoll();
    const controls=this.root.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('.room-view .room-actions button,.room-view select');
    controls.forEach(el=>el.disabled=true);
    try{await action();}catch(err){this.toast(err instanceof Error?err.message:"Toiming ebaõnnestus.");}
    finally{this.roomActionPending=false;controls.forEach(el=>el.disabled=false);if(this.room){const view=this.root.querySelector<HTMLElement>('[data-view]');if(view)delete view.dataset.roomState;this.renderRoom();}this.poll();}
  }

  private async loadInvites():Promise<void>{
    if(this.room)return;const epoch=this.pollEpoch;
    try{
      const r=await api.invites();if(epoch!==this.pollEpoch||this.room)return;
      const el=this.root.querySelector<HTMLElement>('[data-invites]');if(!el)return;
      const signature=JSON.stringify(r.invites);if(el.dataset.invites===signature)return;el.dataset.invites=signature;
      el.innerHTML=r.invites.map(i=>`<div class="invite-notice"><span><b>${esc(i.from.displayName)}</b> kutsub sind lahingusse.</span><button data-accept-invite="${esc(i.id)}">LIITU</button><button data-decline-invite="${esc(i.id)}">KEELDU</button></div>`).join('');
      el.querySelectorAll<HTMLButtonElement>('[data-accept-invite],[data-decline-invite]').forEach(button=>button.onclick=async()=>{
        button.disabled=true;this.stopPoll();
        try{const accept=!!button.dataset.acceptInvite;const r=await api.answerInvite(button.dataset.acceptInvite??button.dataset.declineInvite!,accept);if(accept){this.room=r.room;el.innerHTML='';this.renderRoom();}else{delete el.dataset.invites;button.closest('.invite-notice')?.remove();}}
        catch(err){button.disabled=false;this.toast(err instanceof Error?err.message:"Kutsele vastamine ebaõnnestus.");}
        finally{this.poll();}
      });
    }catch{/* Invitations retry with the regular refresh. */}
  }

  private async inviteFriendModal(): Promise<void> {
    if (!this.room) return; const r=await api.friends();
    this.modal(`<div class="modal-head"><div class="eyebrow">INVITE</div><h2>Kutsu sõber</h2></div><div class="friend-list-modal">${r.friends.map(f=>`<div class="player-row"><div><b>${esc(f.displayName)}</b><small>@${esc(f.username)} · ${f.online?"ONLINE":"OFFLINE"}</small></div><button data-invite-user="${esc(f.id)}" ${f.online?"":"disabled"}>KUTSU</button></div>`).join("") || `<div class="empty">Sõbralist on tühi.</div>`}</div>`);
    document.querySelectorAll<HTMLButtonElement>("[data-invite-user]").forEach(b=>b.onclick=async()=>{try{await api.invite(b.dataset.inviteUser!,this.room!.id);b.textContent="SADETUD";b.disabled=true;}catch(e){this.toast(e instanceof Error?e.message:"Kutset ei saanud saata.");}});
  }

  private async loadChat(roomId: string): Promise<void> {
    const request=++this.chatRequest;
    try {
      const r=await api.chat(roomId);if(request!==this.chatRequest||this.room?.id!==roomId)return;
      const el=this.root.querySelector<HTMLElement>("[data-chat]");if(!el)return;
      const signature=JSON.stringify(r.messages);if(el.dataset.messages===signature)return;
      const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<32;
      el.innerHTML=r.messages.map(m=>`<div><b>${esc(m.displayName)}</b> ${esc(m.message)}</div>`).join("")||'<div><b>SERVER</b> Kirjuta vastasele. Mõlemad mängijad peavad lahinguks valmis olema.</div>';
      el.dataset.messages=signature;if(atBottom)el.scrollTop=el.scrollHeight;
    }catch{/* Keep the last messages and draft during a temporary disconnect. */}
  }

  private settingsModal(): void {
    if (!this.room) return; const room = this.room; const missions:MissionDef[] = [];
    this.modal(`<div class="modal-head"><div class="eyebrow">HOST CONTROL</div><h2>Lobby reeglid</h2></div><form id="settings-form"><label>Ruumi nimi<input name="name" value="${esc(room.name)}"></label><label>Kaart<select name="mission">${missions.map(m => `<option value="${esc(m.id)}" ${m.id === room.missionId ? "selected" : ""}>${esc(m.name)} — ${esc(m.map.name)}</option>`).join("")}${room.missionId.startsWith("procedural-")?`<option value="${esc(room.missionId)}" selected>Praegune genereeritud kaart</option>`:""}${REGION_IDS.flatMap(region=>METRIC_MAP_SIZES.map(size=>`<option value="__random__:balanced:${size}:${region}">GENERAATOR · ${REGIONS[region].name} · ${size} m</option>`)).join("")}</select></label><label>Paigutus<select name="layout"><option value="auto">Seemne järgi</option></select></label><div class="rule-grid"><label>Sissetulek<select name="income"><option value="standard" ${room.rules.income === "standard" ? "selected" : ""}>Standard</option><option value="high" ${room.rules.income === "high" ? "selected" : ""}>Kõrge</option><option value="low" ${room.rules.income === "low" ? "selected" : ""}>Madal</option></select></label><label>Fog<select name="fog"><option value="wargame" ${room.rules.fog === "wargame" ? "selected" : ""}>Wargame</option><option value="reduced" ${room.rules.fog === "reduced" ? "selected" : ""}>Reduced</option><option value="off" ${room.rules.fog === "off" ? "selected" : ""}>Off</option></select></label><label>Võit<select name="victory"><option value="hq" ${room.rules.victory === "hq" ? "selected" : ""}>HQ</option><option value="annihilation" ${room.rules.victory === "annihilation" ? "selected" : ""}>Annihilation</option></select></label></div><div class="modal-actions"><button type="button" data-close>CANCEL</button><button class="primary" type="submit">SALVESTA</button></div><div class="form-error" data-modal-error></div></form>`);
    const settingsForm=document.querySelector<HTMLFormElement>("#settings-form")!;bindOnlineLayout(settingsForm);settingsForm.onsubmit = async (e) => { e.preventDefault(); if(settingsForm.dataset.pending)return;settingsForm.dataset.pending="true";this.stopPoll(); const fd = new FormData(settingsForm); try { const selectedMap = String(fd.get("mission")); const missionId = generatedSelectionId(selectedMap,String(fd.get("layout")??"auto")); const r = await api.settings(room.id, { name: fd.get("name"), missionId, mapId: missionId, rules: { income: fd.get("income"), fog: fd.get("fog"), victory: fd.get("victory") } }); this.room = r.room; this.closeModal(); this.renderRoom(); } catch (err) { settingsForm.querySelector<HTMLElement>("[data-modal-error]")!.textContent = err instanceof Error ? err.message : "Salvestamine ebaõnnestus."; } finally {delete settingsForm.dataset.pending;this.poll();} };
  }

  private async renderLive(): Promise<void> {
    const view=this.root.querySelector<HTMLElement>("[data-view]"); if(!view) return;
    try { const r=await api.liveGames();if(this.tab!=="live"||!view.isConnected)return; view.innerHTML=`<div class="view-head"><div><div class="eyebrow">LIVE WAR ROOM</div><h2>Live mängud</h2><p>Vaata käimasolevaid lahinguid pealtvaatajana.</p></div></div><div class="room-list">${r.games.map(g=>`<article class="room-card"><div class="room-main"><div class="room-title"><b>${esc(g.name)}</b><span class="badge">LIVE</span></div><div class="room-meta">${esc(MISSIONS.find(m=>m.id===g.missionId)?.name||g.missionId)} · ${esc(g.mapId)}</div><div class="room-tags"><span>${g.rules.fog}</span><span>${g.ranked?"RANKED":"CUSTOM"}</span></div></div><div class="room-player"><strong>${g.members.map(m=>esc(m.displayName)).join(" vs ")}</strong><small>${g.members.map(m=>esc(FACTIONS[m.faction as FactionId]?.short||m.faction)).join(" / ")}</small></div><button class="join-btn" data-spectate="${esc(g.id)}">VAATA</button></article>`).join("")||`<div class="empty">Praegu ei ole aktiivseid mänge.</div>`}</div>`; view.querySelectorAll<HTMLButtonElement>("[data-spectate]").forEach(b=>b.onclick=async()=>{try{const r=await api.spectate(b.dataset.spectate!);const url=new URL(location.href);url.search="";url.searchParams.set("mission",r.room.missionId);url.searchParams.set("mode","spectator");url.searchParams.set("room",r.room.id);url.searchParams.set("faction","usa");url.searchParams.set("spectateToken",r.token);location.href=url.toString();}catch(e){this.toast(e instanceof Error?e.message:"Pealtvaatamist ei saanud alustada.");}}); } catch(e){this.toast(e instanceof Error?e.message:"Live mängude laadimine ebaõnnestus.");}
  }

  private async renderFriends(): Promise<void> { const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view) return; try { const r = await api.friends();if(this.tab!=="friends"||!view.isConnected)return; view.innerHTML = `<div class="view-head"><div><div class="eyebrow">SOCIAL</div><h2>Sõbrad</h2><p>Otsi mängijaid ja lisa nad oma püsivasse sõbralisti.</p></div></div><div class="friend-search"><input data-player-search placeholder="Kasutajanimi või kuvatav nimi…"><button data-action="search">OTSI</button></div><div class="friend-columns"><section><div class="panel-title">MINU SÕBRAD</div><div data-friends>${r.friends.map(p => this.playerRow(p, false)).join("") || `<div class="empty">Sõbralisti pole veel.</div>`}</div></section><section><div class="panel-title">OTSING</div><div data-results><div class="empty">Sisesta nimi ja vajuta OTSI.</div></div></section></div>`; view.querySelector<HTMLButtonElement>('[data-action="search"]')!.onclick = () => void this.searchPlayers(); view.querySelector<HTMLInputElement>("[data-player-search]")!.onkeydown = e => { if (e.key === "Enter") void this.searchPlayers(); }; } catch (err) { this.toast(err instanceof Error ? err.message : "Sõprade laadimine ebaõnnestus."); } }
  private playerRow(p: PublicPlayer, add: boolean): string { return `<div class="player-row"><span class="dot ${p.online ? "online" : ""}"></span><div><b>${esc(p.displayName)}</b><small>@${esc(p.username)} · ${p.stats.wins}-${p.stats.losses}</small></div>${add ? `<button data-add-friend="${esc(p.id)}">LISA</button>` : `<span class="online-label">${p.online ? "ONLINE" : "OFFLINE"}</span>`}</div>`; }
  private async searchPlayers(): Promise<void> { const q = this.root.querySelector<HTMLInputElement>("[data-player-search]")?.value.trim() || ""; if (!q) return; try { const r = await api.players(q); const el = this.root.querySelector<HTMLElement>("[data-results]");if(!el)return; el.innerHTML = r.players.map(p => this.playerRow(p, true)).join("") || `<div class="empty">Mängijat ei leitud.</div>`; el.querySelectorAll<HTMLButtonElement>("[data-add-friend]").forEach(b => b.onclick = async () => { try { await api.addFriend(b.dataset.addFriend!); b.textContent = "LISATUD"; b.disabled = true; } catch (err) { this.toast(err instanceof Error ? err.message : "Sõbra lisamine ebaõnnestus."); } }); } catch (err) { this.toast(err instanceof Error ? err.message : "Otsing ebaõnnestus."); } }

  private renderProfile(): void { const view = this.root.querySelector<HTMLElement>("[data-view]"); if (!view || !this.user) return; const s = this.user.stats; view.innerHTML = `<div class="view-head"><div><div class="eyebrow">PLAYER RECORD</div><h2>${esc(this.user.displayName)}</h2><p>@${esc(this.user.username)} · ${esc(this.user.country)}</p></div></div><div class="profile-grid"><div class="profile-stat"><span>MÄNGUD</span><b>${s.games}</b></div><div class="profile-stat"><span>VÕIDUD</span><b>${s.wins}</b></div><div class="profile-stat"><span>KAOTUSED</span><b>${s.losses}</b></div><div class="profile-stat"><span>VIIGID</span><b>${s.draws}</b></div><div class="profile-stat"><span>RATING</span><b>${s.rating ?? 1000}</b></div><div class="profile-stat"><span>LEVEL</span><b>${s.level ?? 1}</b></div></div><div class="section-note">Kontoandmed ja mängustatistika asuvad serveris. Brauseri localStorage sisaldab ainult autentimissessiooni ning kohalikku decki mugavuse pärast.</div>`; }

  private poll(): void { this.stopPoll();if(this.launching)return; this.timer=window.setInterval(()=>void this.refresh(),1500); }
  private stopPoll(): void { this.pollEpoch++;if(this.timer!==null)window.clearInterval(this.timer);this.timer=null; }
  private async refresh():Promise<void>{
    if(this.refreshing||this.roomActionPending)return;
    this.refreshing=true;const epoch=this.pollEpoch;
    try{
      const r=await api.me();if(epoch!==this.pollEpoch)return;this.user=r.user;
      if(r.activeRoom){this.room=r.activeRoom;if(this.room.status==="started")return this.launchGame();if(this.tab==="lobby"){this.renderRoom();await this.loadChat(r.activeRoom.id);}}
      else if(this.room){this.room=null;this.renderMain();}
      else if(this.tab==="lobby"&&!this.root.querySelector('[data-room-search]:focus'))await this.renderLobby();
      else if(this.tab==="ranked")await this.renderRanked();else if(this.tab==="live")await this.renderLive();
      if(!this.room)await this.loadInvites();
    }catch{/* Retry on the next poll without discarding user input. */}
    finally{this.refreshing=false;}
  }
  private launchGame(): void { if (this.launching || !this.room || !this.user) return; this.stopPoll(); const me = this.room.members.find(m => m.userId === this.user!.id); if (!me) return; this.launching=true; sessionStorage.setItem("rogue-front.activeDeck", JSON.stringify(me.deck??loadAllDecks()[me.faction as FactionId])); const url = new URL(location.href); url.search = ""; url.searchParams.set("mission", this.room.missionId); url.searchParams.set("mode", "multiplayer"); url.searchParams.set("room", this.room.id); url.searchParams.set("faction", me.faction); location.href = url.toString(); }

  private modal(content: string): void { this.closeModal(); const d = document.createElement("div"); d.className = "modal-backdrop"; d.innerHTML = `<div class="modal-card">${content}</div>`; document.body.appendChild(d); d.querySelectorAll<HTMLElement>("[data-close]").forEach(x => x.onclick = () => d.remove()); }
  private closeModal(): void { document.querySelector(".modal-backdrop")?.remove(); }
  private toast(message: string): void { const t = this.root.querySelector<HTMLElement>("[data-toast]"); if (!t) return; t.textContent = message; t.classList.add("show"); window.setTimeout(() => t.classList.remove("show"), 2600); }
}

function onlineMapLabel(id:string):string{
  const match=/^procedural-v\d+-[^-]+-(\d+)-(\d+)(?:-o(\d+))?$/.exec(id);if(!match)return id;
  const options=decodeMapOptions(Number(match[3]??14));
  return `${REGIONS[options.region??'italy'].name} · ${match[1]} m · seeme ${match[2]}`;
}

function esc(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }

/** Setup preview uses the exact generated polygons and structures the simulation will load. */
function mapPreview(m:import("../sim/types").MissionDef):string {
  const size=m.map.size??640,region=regionFromProfile(m.map.terrainProfile),profile=region?REGIONS[region]:undefined;
  const features=[...(m.map.features??[])].sort((a,b)=>{const order=(f:import("../sim/mapFeatures").MapFeatureDef)=>f.kind==="building"?5:f.kind==="bridge"?4:f.kind==="road"?3:f.kind==="water"?2:0;return order(a)-order(b);});
  return `<svg viewBox="${-size/2} ${-size/2} ${size} ${size}" aria-hidden="true"><rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" fill="${profile?.ground??'#87916e'}"/>${(m.map.landforms??[]).map(f=>`<ellipse cx="${f.x}" cy="${f.z}" rx="${f.width}" ry="${f.depth}" fill="${profile?.rock??'#7f8978'}" opacity=".65"/>`).join('')}${features.map(f=>{
    const color=f.kind==="water"?(profile?.water??"#547b8a"):f.kind==="building"?"#c0b99c":f.kind==="road"||f.kind==="bridge"?"#9a9b90":f.appearance==="forest"?(profile?.forest??"#3e5a3d"):f.appearance==="field"?"#"+(f.color??0x989874).toString(16).padStart(6,"0"):"#929780";
    if(f.polygon)return `<polygon points="${f.polygon.map(p=>`${p.x},${p.z}`).join(" ")}" fill="${color}"/>`;
    const shape=f.shape==="ellipse"?`<ellipse rx="${f.width/2}" ry="${f.depth/2}"`: `<rect x="${-f.width/2}" y="${-f.depth/2}" width="${f.width}" height="${f.depth}"`;
    return `${shape} transform="translate(${f.x} ${f.z}) rotate(${-(f.rotation??0)*180/Math.PI})" fill="${color}"/>`;
  }).join("")}${m.map.bases.map(b=>`<circle cx="${b.x}" cy="${b.z}" r="${b.r}" fill="none" stroke="#eddd94" stroke-width="6"/>`).join("")}</svg>`;
}

function generatedSummary(m:import("../sim/types").MissionDef):string {
  const hills=Math.round(Math.max(0,...(m.map.landforms??[]).map(f=>f.height)));
  const houses=(m.map.features??[]).filter(f=>f.kind==="building").length;
  return `${houses} hoonet · ${m.map.resources.length} ressursiala · kõrgendikud kuni ${hills} m`;
}

/** A current room map remains unchanged; a new generator selection enables its region's layouts. */
function bindOnlineLayout(form:HTMLFormElement):void {
 const mission=form.elements.namedItem('mission') as HTMLSelectElement,layout=form.elements.namedItem('layout') as HTMLSelectElement;
 const refresh=()=>{const region=(mission.value.split(':')[3]??'italy') as RegionId;
  layout.disabled=!mission.value.startsWith('__random__:');
  layout.innerHTML='<option value="auto">Seemne järgi</option>'+(layout.disabled?'':REGION_PLANS[region].map((p,i)=>`<option value="${i}">${p.name}</option>`).join(''));
 };
 mission.addEventListener('change',refresh);refresh();
}
function generatedSelectionId(selected:string,layout:string):string {
 if(!selected.startsWith('__random__:'))return selected;
 const [,archetype,size,region='italy']=selected.split(':'),options={...regionDefaults(region as RegionId),...(['0','1','2'].includes(layout)?{layout:Number(layout) as RegionLayoutIndex}:{})};
 return `procedural-v18-${archetype}-${size}-0-o${mapOptionsMask(options)}`;
}

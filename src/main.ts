import {maxHitPoints} from "./sim/unitStats";
import "./style.css";
import * as THREE from "three";
import { GameLoop } from "./core/GameLoop";
import { SIM_STEP } from "./sim/constants";
import type { FactionId } from "./sim/factions";
import { FACTION_LIST, FACTIONS } from "./sim/factions";
import { DeckBuilder } from "./ui/DeckBuilder";
import { World } from "./sim/World";
import { heightAt, loadHeightmap, setBases, ensureHeightCache, setProceduralSeed, setTerrainProfile, setMapSize } from "./sim/heightmap";
import { createRenderContext } from "./render/Renderer";
import { createTerrain,syncForestTerrain,syncGarrisonTerrain,syncBridgeTerrain,animateRiverTerrain } from "./render/Terrain";
import { RtsCamera } from "./render/RtsCamera";
import { loadArtModels } from "./render/ArtModels";
import { RangeOverlay } from "./render/RangeOverlay";
import { UnitRenderer } from "./render/UnitRenderer";
import {ResourceSites} from "./render/ResourceSites";
import { Fx } from "./render/Fx";
import { FogOfWar } from "./render/FogOfWar";
import { Picker } from "./input/Picker";
import { SelectionController } from "./input/SelectionController";
import { CommandController } from "./input/CommandController";
import { Hud } from "./ui/Hud";
import { Minimap } from "./ui/Minimap";
import { Overlay } from "./ui/Overlay";
import { MISSIONS } from "./data/missions";
import { MissionController } from "./sim/Mission";
import { loadWorld, saveWorld, type WorldSave } from "./sim/SaveState";
import { ReplayRecorder } from "./sim/Replay";
import { AudioManager } from "./render/Audio";
import { loadSettings, SettingsPanel } from "./ui/Settings";
import type { MissionDef } from "./sim/types";
import { LockstepClient } from "./net/LockstepClient";
import { worldHash } from "./sim/Replay";
import { OnlineShell } from "./ui/OnlineShell";
import { getAuthToken } from "./net/Api";
import { createSkirmish } from "./sim/scenario";
import { getPlayableMap } from "./sim/proceduralMap";
import { MatchModeController, MODE_RULES, type MatchMode } from "./sim/gameModes";
import { completeCampaignMission, CAMPAIGN, loadCampaign, isUnlocked } from "./sim/campaign";

const queryParams = new URLSearchParams(location.search);
const queryMission = queryParams.get("mission");
const queryRoom = queryParams.get("room");
const querySpectateToken = queryParams.get("spectateToken");
const queryGameMode = queryParams.get("gameMode") as MatchMode | null;
const SAVE_PREFIX = "rogue-front.save.v2.";

const deckBuilder = new DeckBuilder(document.body);
const hud = new Hud(document.getElementById("ui")!);

hud.onOpenDeck = () => deckBuilder.open(hud.selectedFaction);
addEventListener("rogue-front:open-deck", () => deckBuilder.open(hud.selectedFaction));
deckBuilder.onPlay = (faction, deck) => {
  void import("./net/Api").then(({ api }) => api.saveDeck(faction, deck).catch(() => {}));
  sessionStorage.setItem("rogue-front.activeDeck", JSON.stringify(deck));
  localStorage.setItem("rogue-front.faction", faction);
  location.href = location.pathname + "?setup=deck";
};

async function boot(mission: MissionDef, multiplayerRoom?: string, skirmishDifficulty?: "easy"|"normal"|"hard", faction: FactionId = "usa", spectator = false, spectatorToken = ""): Promise<void> {
  hud.setWarning("Laadin 3D-mudeleid…");
  try { await loadArtModels(multiplayerRoom?FACTION_LIST:[faction,FACTION_LIST.find(f=>f!==faction)??"russia"]); hud.setWarning(""); } catch (error) {
    console.warn("3D asset loading failed", error);
    hud.setWarning("Osa 3D-mudeleid ei laadinud. Kasutan varumudeleid.");
  }
  setMapSize(mission.map.size??640);
  setBases(mission.map.bases);
  setProceduralSeed(mission.seed);
  setTerrainProfile(mission.map.terrainProfile);
  if(mission.map.heightmap)await loadHeightmap(mission.map.heightmap,mission.map.maxHeight);
  ensureHeightCache(); // rebuild cache now that heightmap + bases are final

  const skirmish = !!skirmishDifficulty;
  const world = new World(mission.seed, !skirmish, mission.map.resources, mission.map.features ?? [], mission.map.bases, mission.map.baseDefenses ?? true);
  const multiplayer = !!multiplayerRoom && !skirmish;
  const net = multiplayer ? new LockstepClient() : null;
  const networkPackets: Array<{ tick: number; commands: import("./sim/types").Command[] }> = [];
  let localTeam: 0 | 1 = 0;
  let applyingNetwork = false;
  const replayRecorder = new ReplayRecorder(mission.seed);
  const audio = new AudioManager();
  let visualQuality=loadSettings().quality;
  let intelAcc=0, terrainAcc=.2, hoverAcc=0;
  const settingsPanel = new SettingsPanel((settings) => { audio.setSettings(settings);visualQuality=settings.quality; ctx.setQuality(settings.quality); });
  let paused = false;
  const originalIssue = world.issue.bind(world);
  world.issue = (command) => {
    if (multiplayer && !applyingNetwork) { net!.submit(command); return; }
    if(multiplayer||command.team===undefined||command.team===world.playerTeam)replayRecorder.record({...command,team:command.team??world.playerTeam}); originalIssue(command);
  };
  hud.selectedFaction=faction;
  world.playerFaction = faction;
  world.enemyFaction = FACTION_LIST.find(f => f !== faction) ?? "russia";
  for (const obj of skirmish || multiplayer ? [] : mission.map.objects ?? []) {
    const count = Math.max(1, obj.count ?? 1);
    const dx = obj.dx ?? 0, dz = obj.dz ?? 0;
    for (let i = 0; i < count; i++) world.spawn(obj.kind, obj.team, obj.x + dx * i, obj.z + dz * i);
  }
  const missionRuntime = new MissionController(mission, world);
  world.playerFaction = faction;
  // Enemy gets a different nation for variety
  world.enemyFaction = (FACTION_LIST.find(f => f !== faction) ?? "russia") as FactionId;
  try {
    const raw = sessionStorage.getItem("rogue-front.activeDeck");
    if (raw && skirmish) { const deck = JSON.parse(raw); if (deck.faction === faction) world.setActiveDeck(deck); }
  } catch { /* */ }
  const activeMode: MatchMode = skirmish ? (queryGameMode && MODE_RULES[queryGameMode] ? queryGameMode : "skirmish") : "assault";
  const modeController = new MatchModeController(world, activeMode, mission);
  if (skirmish) world.matchController = modeController;
  else if (!multiplayer) world.missionController = missionRuntime;
  if (skirmish) { createSkirmish(world, ["roheorg","operation-tidebreaker"].includes(mission.id) && queryParams.get("deployment") !== "base"); world.ai.setProfile(skirmishDifficulty === "hard" ? "aggressive" : skirmishDifficulty === "easy" ? "defensive" : "economic", skirmishDifficulty!); }
  if(!skirmish&&!multiplayer&&mission.id==="operation-tidebreaker")world.externalVictoryMode=true;
  if (skirmish && activeMode !== "skirmish") world.externalVictoryMode = true;
  if (multiplayer) world.setNetworkMode(0);

  if(mission.id==="tutorial-logistics"&&!skirmish&&!multiplayer){world.ai.setProfile("defensive","easy");world.ai.attackTimer=240;}
  replayRecorder.reset(world);

  const glCanvas = document.getElementById("game") as HTMLCanvasElement;
  const topCanvas = document.getElementById("overlay") as HTMLCanvasElement;
  const fogCanvas = document.getElementById("fog") as HTMLCanvasElement;
  const ctx = createRenderContext(glCanvas, mission.map.theme === "temperate");
  ctx.setQuality(visualQuality);
  const terrainView=createTerrain(mission.map.theme, world.mapFeatures, mission.map.bases);ctx.scene.add(terrainView);

  const cam = new RtsCamera(ctx.camera, heightAt, ctx.sun, topCanvas);
  cam.jumpTo(world.bases[world.playerTeam].x,world.bases[world.playerTeam].z);
  const units = new UnitRenderer(ctx.scene,ctx.camera);
  const ranges=new RangeOverlay(ctx.scene);
  const fx = new Fx(ctx.scene,ctx.camera);
  const resourceSites=new ResourceSites(ctx.scene,world);
  const fog = new FogOfWar(fogCanvas);
  const picker = new Picker(ctx.camera, world);
  const selection = new SelectionController(topCanvas, world, picker);
  const commands = new CommandController(topCanvas, world, picker, selection, fx);
  const overlay = new Overlay(topCanvas);
  const minimap = new Minimap(hud.minimapCanvas, world, picker);

  if (net) {
    net.setCallbacks({
      status: (status, text) => {
        hud.setNetworkStatus(status === "running" ? `1v1 · ${localTeam + 1}` : text);
        if(status === "error" || status === "reconnecting") { paused = true; setEnabled(false); }
      },
      assigned: (team, _playerCount, rules, members) => {
        localTeam = team; world.setNetworkMode(team);
        if (!world.entities.length && members?.length === 2) {
          world.playerFaction = members[team]!.faction;
          world.enemyFaction = members[1-team]!.faction;
          world.setNetworkDecks([members[0]!.deck,members[1]!.deck]);
          createSkirmish(world); replayRecorder.reset(world); units.reset();ranges.reset();
          cam.jumpTo(world.bases[team].x,world.bases[team].z);
        }
        if (rules) { world.setMatchRules(rules); fog.setMode(rules.fog || "wargame"); } hud.setNetworkStatus(`1v1 · meeskond ${team + 1}`); },
      started: (_seed, tick) => {
        networkPackets.length = 0; running = true; paused = false;
        if(net.appliedTick===0) replayRecorder.reset(world);
        hud.dismissBriefing(); setEnabled(!spectator && net.appliedTick === tick);
        net.ack(worldHash(world));
      },
      tick: (packet) => { paused = false; hud.setPaused(false); networkPackets.push(packet); },
      desync: (tick) => { paused = true; setEnabled(false); hud.setPaused(true); hud.setWarning(`DESYNC tuvastatud tick ${tick} — mäng peatatud`); },
    });
    net.connect(multiplayerRoom!, mission.id, undefined, getAuthToken(), spectator, spectatorToken);
  }

  minimap.onJump = (x, z) => cam.jumpTo(x, z);
  minimap.onOrder = (x, z, append) => commands.moveTo(x, z, append);
  selection.onInspectBuilding=id=>hud.inspectBuilding(id);
  selection.onFocus=(x,z)=>cam.jumpTo(x,z);
  hud.onGarrisonFace=()=>{if(running&&!paused){commands.armOrder("face");hud.setWarning("Garnisoni vaatesuund: klõps kaardil või minikaardil");}};
  hud.onGarrisonExit=ids=>{if(running&&!paused)world.issue({type:"leave-building",ids});};
  hud.onSelect=ids=>{selection.selected.clear();ids.forEach(id=>selection.selected.add(id));};
  hud.onOrder=order=>{if(!running||paused)return;if(order==="stop"){commands.cancelOrders();world.issue({type:"stop",ids:selection.selectedIds()});}else if(order==="focus"){const list=selection.selectedIds().map(id=>world.byId.get(id)).filter(e=>e&&!e.dead);if(list.length)cam.jumpTo(list.reduce((n,e)=>n+e!.x,0)/list.length,list.reduce((n,e)=>n+e!.z,0)/list.length);}else {commands.armOrder(order);hud.setWarning(order==="fast"?"Kiirliigu: klõps kaardil või minikaardil":order==="unload"?"Välju transpordist: klõps sihtpunktile":order==="attack"?"Ründeliikumine: klõps kaardil või minikaardil":"Liigu: klõps sihtpunktile");}};
  hud.onProduce = (kind, producerId) => { if (running && !paused) world.issue({ type: "produce", kind, producerId }); };
  hud.onBuild = (kind) => { if (running && !paused) commands.startBuild(kind); };
  hud.onUnitUpgrade=(ids,upgrade)=>{if(running&&!paused)world.issue({type:"upgrade",ids,upgrade});};
  hud.onResearch=tech=>{if(running&&!paused)world.issue({type:"research",tech});};
  hud.onUpgradeSupply = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "supply-depot" }); };
  hud.onUpgradeFOB = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "fob" }); };
  hud.onLogisticsEdit=(ids,action)=>{
    if(!running||paused)return;
    if(action==="source"||action==="route"){commands.startLogisticsOrder(ids,action);hud.setWarning(action==="source"?"Parem klõps ressursirajatise laadimisplatsile":"Parem klõps marsruudi vahepunktile");}
    else if(action==="clear")world.issue({type:"logistics-route",ids,x:0,z:0,clear:true});
    else for(const id of ids){const d=world.byId.get(id);if(d?.kind==="supply")world.issue({type:"logistics-source",ids:[id],sourceIndex:action==="auto"?null:d.preferredResourceIndex??null,paused:action==="pause"?!d.logisticsPaused:false});}
  };
  hud.onDepotPriority = (ids, focus) => { if (running && !paused) world.issue({ type: "depot-priority", ids, focus }); };
  hud.onUpgradeProducer = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "producer" }); };
  hud.onStance = (ids, mode) => { if (running && !paused) {if(mode==="patrol")commands.armOrder("patrol");else world.issue({ type: "standing", ids, mode });} };
  hud.onPriority = (ids, focus) => { if (running && !paused) world.issue({ type: "priority", ids, focus }); };
  hud.onPreDeploy = (ids, mode) => { if (running && !paused) world.issue({ type: "predeploy", ids, mode }); };
  hud.onFormation = (kind) => {if(running&&!paused)world.issue({type:"formation",kind});};
  hud.onNavalReturn=ids=>{if(!running||paused)return;for(const id of ids){const u=world.byId.get(id);if(!u||u.team!==world.playerTeam||u.def.domain!=="sea")continue;
    const port=world.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind==="shipyard").sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
    const point=port?world.waterNav.nearestWater(port,u.def.radius,64):null;if(point)world.issue({type:"move",ids:[u.id],x:point.x,z:point.z});else hud.setWarning("Puudub ligipääsetav oma sadam");
  }};
  hud.onAirReturn=ids=>{if(running&&!paused){commands.cancelOrders();world.issue({type:"air-return",ids});hud.setWarning("EVAC: lennuvägi naaseb baasi");}};
  hud.onAirMission=(ids,mission)=>{if(running&&!paused){commands.startAirMission(ids,mission);hud.setWarning("Õhuoperatsioon: paremklõps sihtpunktile, Esc tühistab");}};
  hud.onCancelProduce = (producerId) => { if (running && !paused) world.issue({ type: "cancel-produce", producerId }); };
  const saveKey = SAVE_PREFIX + mission.id + (mission.id==="roheorg"?".layout13":mission.id==="operation-tidebreaker"?".coast3":mission.id==="tutorial-logistics"?".training13":"") + "." + (skirmish ? activeMode : "campaign") + "." + faction;
  const sessionContext=JSON.stringify({mission:mission.id,seed:mission.seed,heightmap:mission.map.heightmap,terrain:mission.map.terrainProfile,maxHeight:mission.map.maxHeight,mode:skirmish?activeMode:"campaign",faction});
  // Avoid reading/copying a potentially multi-megabyte snapshot five times a second.
  const readSaveAvailability=()=>{try{return !multiplayer&&localStorage.getItem(saveKey)!==null;}catch{return false;}};
  let saveAvailable=readSaveAvailability();
  const hasSave=()=>saveAvailable;
  window.addEventListener("storage",e=>{if(e.key===saveKey||e.key===null)saveAvailable=readSaveAvailability();});
  const saveGame = () => {localStorage.setItem(saveKey,JSON.stringify({format:"rogue-front-session",context:sessionContext,savedAt:new Date().toISOString(),world:saveWorld(world)}));saveAvailable=true;};
  const loadGame = () => {
    if(multiplayer)return;
    try{
      const raw=localStorage.getItem(saveKey);if(!raw){hud.setWarning("Selle lahingu salvestus puudub");return;}
      const saved=JSON.parse(raw) as {format?:string;context?:string;world?:WorldSave}&WorldSave;
      if(saved.format&&saved.context!==sessionContext)throw new Error("Salvestuse kaart, fraktsioon või režiim ei vasta sellele lahingule");
      loadWorld(world,saved.format?saved.world!:saved);
      units.reset();ranges.reset();fx.reset();commands.reset();selection.selected.clear();replayRecorder.reset(world);
      hud.hideScreen();running=world.status==="running";paused=false;hud.setPaused(false);setEnabled(running);audio.unlock();if(running)audio.startMusic();else audio.stopMusic();
      const hq=world.hq[world.playerTeam];if(hq)cam.jumpTo(hq.x,hq.z);
      if(!running)hud.showResult(world.status as "won"|"lost",world.time,"Laaditud lõpetatud lahing");
      hud.setWarning("Salvestus taastatud · "+Math.floor(world.time/60)+" min");
    }catch(err){hud.setWarning(err instanceof Error?err.message:"Salvestuse laadimine ebaõnnestus");}
  };
  hud.onGuideTarget=p=>{cam.jumpTo(p.x,p.z);fx.ping(p.x,p.z,0x77ba9e);};
  hud.onGuideFocus=ids=>{commands.reset();selection.selected.clear();for(const id of ids)selection.selected.add(id);const u=world.byId.get(ids[0]);if(u)cam.jumpTo(u.x,u.z);};
  hud.setSaveAvailability(hasSave(),false);
  const togglePause = () => { if(multiplayer){hud.setWarning("Võrgumäng peatub ühenduse katkemisel automaatselt.");return;} paused = !paused; setEnabled(running && !paused); hud.setPaused(paused); if (paused) audio.pause(); else { audio.unlock(); audio.resume(); } };
  hud.onPause = togglePause;
  hud.onSettings = () => settingsPanel.open();
  hud.onSave = () => { if (running && !multiplayer) {try{saveGame();hud.setWarning("Mäng salvestatud");}catch{hud.setWarning("Salvestamine ebaõnnestus: brauseri salvestusruum on täis");}} };
  hud.onLoad = () => {if(!multiplayer)loadGame();};
  hud.onSkirmish = (m, difficulty, mode) => { const url = new URL(location.href); url.search = ""; url.searchParams.set("mission", m.id); url.searchParams.set("mode", "skirmish"); url.searchParams.set("difficulty", difficulty); url.searchParams.set("gameMode", mode ?? "skirmish"); url.searchParams.set("faction", hud.selectedFaction); location.href = url.toString(); };

  let running = false;
  const setEnabled = (on: boolean) => { selection.enabled = commands.enabled = minimap.enabled = on; };
  const facBlur = FACTIONS[world.playerFaction]?.doctrineBlurb ?? "";
  hud.showBriefing(skirmish ? { ...mission, name: "Skirmish — " + mission.map.name, briefing: mission.id === "roheorg" ? mission.briefing + "\n\n" + modeController.label() + "\n\n" + (queryParams.get("deployment")==="base" ? "Ehita generaator → varustusladu → maaväe juhtimiskeskus → tehas. Saada insener ressursipunkti." : "Baas ja väike lahingugrupp on valmis. Saada luure ette; tugevda koosseisu Maa-paneelist. Insener käivitab koduse ressursipunkti kogumise.") + "\n\nF1: vali soomus · Fookus: kaamera valikule\nRündeliiku + parem klõps: liigu ja võitle\nInsener / juhtimishoone → Ehita: baas ja FOB\nMoon, kütus ja remont vajavad tegelikku varustust." : modeController.label() + "\n\nREAL WAR baas:\n1) Generaator → varustusladu → maaväe juhtimiskeskus → tehas\n2) Saada teine insener ressursipunkti; ta käivitab kogumise\n3) Veokid toovad raha ja ammo/kütusevaru. Katkenud tarne peatab tootmise\n\nWARGAME lahing:\n• Optika/recon — kes näeb, tulistab\n• Supply raadius — ammo/kütus; forward ladu risk\n• Flank ja moraal loevad\n• Õhk: CAP / Strike / SEAD; ilma AA-ta kaotad\n\nDoktriin: " + facBlur + "\n\nKlahvid: F1 soomus F2 jala F3 õhk F4 toetus · Ctrl+1-9 grupid" } : mission, () => { if(multiplayer)return; running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); }, hasSave(), loadGame);

  addEventListener("keydown", (e) => {
    if(e.repeat||(e.target instanceof Element&&e.target.closest("input,textarea,select,[contenteditable=true]")))return;
    if (!e.defaultPrevented && e.key.toLowerCase() === loadSettings().keys.pause && running) togglePause();
    if (!running || paused) return;
    const k = e.key.toLowerCase();
    if(["f1","f2","f3","f4"].includes(k))e.preventDefault();
    // Quick filters (Wargame-style selection aids)
    if (k === "f1") selection.selectFilter(u => ["tank","ifv","apc"].includes(u.kind));
    if (k === "f2") selection.selectFilter(u => ["inf","atInf","mgInf","reconInf","sniper","manpad","atgm","mortar","special","engineer"].includes(u.kind));
    if (k === "f3") selection.selectFilter(u => u.def.armor === "air" || ["heli","gunship","fighter","interceptor","bomber"].includes(u.kind));
    if (k === "f4") selection.selectFilter(u => ["artillery","mortar","mlrs","aa","spaa","manpad","logiTruck"].includes(u.kind));
  });

  let frames = 0, fpsAcc = 0, hudAcc = 1;
  const loop = new GameLoop(
    SIM_STEP,
    (dt) => {
      if (!running || paused) return;
      if (net) {
        const packet = networkPackets.shift();
        if (!packet) return;
        applyingNetwork = true;
        for (const command of packet.commands) world.issue(command);
        applyingNetwork = false;
        world.tick(dt);
        replayRecorder.step();
        net.ack(worldHash(world), packet.tick);
        if (packet.tick === net.tick) setEnabled(!spectator);
      } else {
        world.tick(dt);
        replayRecorder.step();
      }
      if (world.status !== "running") {
        running = false;
        setEnabled(false);
        audio.stopMusic();
        net?.close();
        if (multiplayer && multiplayerRoom) {
          const result = world.status === "won" ? "win" : world.status === "lost" ? "loss" : "draw";
          void import("./net/Api").then(({ api }) => api.matchResult(multiplayerRoom, result).catch(() => {}));
        }
        let persistenceFailed=false;
        if(world.status==="won"&&!skirmish&&!multiplayer){try{completeCampaignMission(mission);MissionController.markCompleted(mission.id);}catch{persistenceFailed=true;}}
        try{localStorage.setItem("rogue-front.replay.v1."+mission.id,JSON.stringify(replayRecorder.file()));}catch{persistenceFailed=true;}
        const next = !skirmish && !multiplayer && world.status === "won" ? CAMPAIGN.find(n=>!loadCampaign().completed.includes(n.id)&&isUnlocked(n)) : undefined;
        hud.showResult(world.status, world.time, (skirmish ? (world.matchController?.label()??modeController.label()) : mission.name)+(persistenceFailed?" · Edenemise või replay salvestamine ebaõnnestus; brauseri salvestusruum võib olla täis.":""), next?.missionId);
        if(persistenceFailed)hud.setWarning("Lahing lõppes, kuid edenemise või replay salvestamine ebaõnnestus. Brauseri salvestusruum võib olla täis.");
      }
    },
    (alpha, frameDt) => {
      cam.update(frameDt);
      selection.prune();
      const events = world.drainEvents();
      units.handleEvents(events);commands.handleEvents(events);
      hoverAcc+=frameDt;if(hoverAcc>=.08){hoverAcc%=.08;commands.updateHover();}
      const visualAlpha=paused||!running||world.status!=="running"?1:alpha;
      const animationDt=paused||!running||world.status!=="running"?0:frameDt;
      units.sync(world, visualAlpha, selection.selected,animationDt,visualQuality);
      ranges.sync(world,selection.selected,hud.showWeaponRanges,hud.rangeSlot);
      ctx.updateShadows(units.shadowDirty);units.shadowDirty=false;
      intelAcc+=frameDt;if(intelAcc>=.2){units.syncIntelGhosts(world);intelAcc=0;}
      fx.handleEvents(events,world);
      audio.events(events, world.playerTeam);
      fx.syncProjectiles(world, visualAlpha);
      terrainAcc+=frameDt;
      if(terrainAcc>=.2){
        terrainAcc%=.2;
        const forestChanged=syncForestTerrain(terrainView,world),housesChanged=syncGarrisonTerrain(terrainView,world);
        const bridgesChanged=syncBridgeTerrain(terrainView,world);
        if(forestChanged||housesChanged||bridgesChanged)ctx.updateShadows(true);
        resourceSites.sync(world,ctx.camera);
      }
      animateRiverTerrain(terrainView,world.time);
      fx.syncForestFires(world,frameDt);fx.syncNavalWakes(world,frameDt);
      fx.update(frameDt);
      const animateWater = ctx.water.material as THREE.ShaderMaterial;
      if (animateWater.uniforms?.time) animateWater.uniforms.time.value += frameDt;
      ctx.post.render();
      fog.draw(world, picker);
      overlay.draw(world, picker, selection, { point: commands.buildPoint, kind: commands.buildMode, rotation: commands.buildRotation, valid: commands.buildValid },commands);
      minimap.draw(frameDt);
      hudAcc += frameDt; frames++; fpsAcc += frameDt;
      if (hudAcc > 0.2) {
        hudAcc = 0;
        hud.setSaveAvailability(hasSave(),running&&!multiplayer);
        hud.update(world, selection.selected, running && !paused, skirmish ? [] : (world.missionController?.summary()??[]), skirmish ? (world.matchController?.label()??modeController.label()) : (world.missionController?.messageText??""));
      }
      const ownHq = world.hq[world.playerTeam];
      if (ownHq && ownHq.hp < maxHitPoints(ownHq) * .35 && world.status === "running") hud.setWarning("HOIATUS: baas on tugeva tule all");
      if (fpsAcc >= 0.5) { hud.setFps(Math.round(frames / fpsAcc)); frames = 0; fpsAcc = 0; }
    },
  );
  loop.start();
}

const queryMode = queryParams.get("mode");
const queryDifficulty = queryParams.get("difficulty") as "easy"|"normal"|"hard"|null;
if (queryMission) {
  if ((queryMode === "multiplayer" || queryMode === "spectator") && !getAuthToken()) { location.href = location.pathname; throw new Error("Multiplayer requires account authentication"); }
  const queryFaction = (queryParams.get("faction") as FactionId | null) ?? (localStorage.getItem("rogue-front.faction") as FactionId | null) ?? "usa";
  const bootFaction = (FACTION_LIST.includes(queryFaction as FactionId) ? queryFaction : "usa") as FactionId;
  const selectedMission = MISSIONS.find(m => m.id === queryMission) ?? getPlayableMap(queryMission);
  if (!selectedMission) throw new Error(`Unknown mission/map: ${queryMission}`);
  void boot(selectedMission, queryRoom || undefined, queryMode === "skirmish" ? (queryDifficulty || "normal") : undefined, bootFaction, queryMode === "spectator", querySpectateToken || "").catch((err: unknown) => {
    console.error(err);
    hud.showMissionSelect(MISSIONS, MissionController.loadProgress(), (mission) => { location.href = "?mission=" + encodeURIComponent(mission.id); });
  });
} else {
  const gameRoot = document.getElementById("ui")!;
  gameRoot.innerHTML = "<div id=\"online-root\"></div>";
  const shell = new OnlineShell(document.getElementById("online-root")!);
  void shell.start();
}

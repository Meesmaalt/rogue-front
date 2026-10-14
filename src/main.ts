import {validateDeck,defaultDeck} from "./sim/deck";
import {isIndirectUnit} from "./sim/equipment";
import {maxHitPoints} from "./sim/unitStats";
import "./style.css";
import * as THREE from "three";
import {GpuTimer} from "./render/GpuTimer";
import {warmTerrainBuffers} from "./render/TerrainWarmup";
import { PerformancePanel } from "./ui/PerformancePanel";
import { GameLoop } from "./core/GameLoop";
import { SIM_STEP } from "./sim/constants";
import type { FactionId } from "./sim/factions";
import { FACTION_LIST, FACTIONS } from "./sim/factions";
import { DeckBuilder } from "./ui/DeckBuilder";
import { World } from "./sim/World";
import { heightAt, loadHeightmap, setBases, setProceduralSeed, setTerrainProfile, setMapSize } from "./sim/heightmap";
import { createRenderContext } from "./render/Renderer";
import { createTerrain,syncForestTerrain,syncGarrisonTerrain,syncBridgeTerrain,animateRiverTerrain } from "./render/Terrain";
import {TerrainCulling} from "./render/TerrainCulling";
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
import { MissionController } from "./sim/Mission";
import { loadWorld, saveWorld } from "./sim/SaveState";
import { ReplayRecorder } from "./sim/Replay";
import { AudioManager } from "./render/Audio";
import { loadSettings, SettingsPanel } from "./ui/Settings";
import type { MissionDef } from "./sim/types";
import { LockstepClient } from "./net/LockstepClient";
import { worldHash } from "./sim/Replay";
import { OnlineShell } from "./ui/OnlineShell";
import { SAVE_PREFIX, writeSavedSession, readSessionWorld, restartBattleUrl } from "./ui/SavedSessions";
import { getAuthToken } from "./net/Api";
import { createSkirmish } from "./sim/scenario";
import { getPlayableMap } from "./sim/proceduralMap";
import { MatchModeController, MODE_RULES, type MatchMode } from "./sim/gameModes";

const queryParams = new URLSearchParams(location.search);
const queryMission = queryParams.get("mission");
const queryRoom = queryParams.get("room");
const querySpectateToken = queryParams.get("spectateToken");
const queryGameMode = queryParams.get("gameMode") as MatchMode | null;

const deckBuilder = new DeckBuilder(document.body);
const hud = new Hud(document.getElementById("ui")!);

hud.onOpenDeck = () => deckBuilder.open(hud.selectedFaction);
deckBuilder.onClose=()=>{
  const selector=document.querySelector<HTMLSelectElement>('[data-skirmish] select[name="faction"]');
  selector?.dispatchEvent(new Event("change"));
};
addEventListener("rogue-front:open-deck", event => {
  const faction=(event as CustomEvent<{faction?:FactionId}>).detail?.faction;
  deckBuilder.open(faction && FACTION_LIST.includes(faction) ? faction : hud.selectedFaction);
});
deckBuilder.onPlay = (faction, deck) => {
  const selector=document.querySelector<HTMLSelectElement>('[data-skirmish] select[name="faction"]');
  if(selector)selector.value=faction;
  void import("./net/Api").then(({ api }) => api.saveDeck(faction, deck).catch(() => {}));
  sessionStorage.setItem("rogue-front.activeDeck", JSON.stringify(deck));
  localStorage.setItem("rogue-front.faction", faction);
  location.href = location.pathname + "?setup=deck";
};

async function boot(mission: MissionDef, multiplayerRoom?: string, skirmishDifficulty?: "easy"|"normal"|"hard", faction: FactionId = "usa", spectator = false, spectatorToken = ""): Promise<void> {
  // Fail before downloading models or allocating the simulation if this browser has no 3D support.
  setMapSize(mission.map.size??640);
  let visualQuality=loadSettings().quality;
  const glCanvas = document.getElementById("game") as HTMLCanvasElement;
  const ctx = createRenderContext(glCanvas, mission.map.theme === "temperate",visualQuality);
  hud.setWarning("Laadin 3D-mudeleid…");
  try { await loadArtModels(multiplayerRoom?FACTION_LIST:[faction,FACTION_LIST.find(f=>f!==faction)??"russia"]); hud.setWarning(""); } catch (error) {
    console.warn("3D asset loading failed", error);
    hud.setWarning("Osa 3D-mudeleid ei laadinud. Kasutan varumudeleid.");
  }
  setBases(mission.map.bases);
  setProceduralSeed(mission.seed);
  setTerrainProfile(mission.map.terrainProfile,mission.map.landforms);
  if(mission.map.heightmap)await loadHeightmap(mission.map.heightmap,mission.map.maxHeight);
  // World bakes heights once after adding hydrology to the final bases/landforms.

  const skirmish = !!skirmishDifficulty;
  const world = new World(mission.seed, !skirmish, mission.map.resources, mission.map.features ?? [], mission.map.bases, mission.map.baseDefenses ?? true);
  world.metricBattle=mission.id.startsWith("procedural-v9-");
  const multiplayer = !!multiplayerRoom && !skirmish;
  const net = multiplayer ? new LockstepClient() : null;
  const networkPackets: Array<{ tick: number; commands: import("./sim/types").Command[] }> = [];
  let localTeam: 0 | 1 = 0;
  let applyingNetwork = false;
  const replayRecorder = new ReplayRecorder(mission.seed);
  const audio = new AudioManager();
  let intelAcc=0, terrainAcc=.2, hoverAcc=0;
  const settingsPanel = new SettingsPanel((settings) => { audio.setSettings(settings);visualQuality=settings.quality; ctx.setQuality(settings.quality); performancePanel.setEnabled(settings.performanceOverlay??false); },()=>{cam.enabled=true;setEnabled(running&&!paused);});
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
    if (raw && skirmish && !queryParams.has("resume")) { const deck = JSON.parse(raw); if (deck.faction === faction) world.setActiveDeck(validateDeck(deck).length?defaultDeck(faction):deck); }
  } catch { /* */ }
  const activeMode: MatchMode = skirmish ? (queryGameMode && Object.hasOwn(MODE_RULES,queryGameMode) ? queryGameMode : "skirmish") : "assault";
  const modeController = new MatchModeController(world, activeMode, mission);
  if (skirmish) world.matchController = modeController;
  else if (!multiplayer) world.missionController = missionRuntime;
  if (skirmish) { createSkirmish(world, (["roheorg","operation-tidebreaker"].includes(mission.id)||mission.id.startsWith("procedural-")) && queryParams.get("deployment") !== "base",mission.id.startsWith("procedural-")); world.ai.setProfile(skirmishDifficulty === "hard" ? "aggressive" : skirmishDifficulty === "easy" ? "defensive" : "economic", skirmishDifficulty!); }
  if(!skirmish&&!multiplayer&&mission.id==="operation-tidebreaker")world.externalVictoryMode=true;
  if (skirmish && activeMode !== "skirmish") world.externalVictoryMode = true;
  if (multiplayer) world.setNetworkMode(0);

  if(mission.id==="tutorial-logistics"&&!skirmish&&!multiplayer){world.ai.setProfile("defensive","easy");world.ai.attackTimer=240;}
  world.platformRosterOnly=true;
  replayRecorder.reset(world);

  const topCanvas = document.getElementById("overlay") as HTMLCanvasElement;
  (document.getElementById("fog") as HTMLCanvasElement).style.display="none";
  ctx.setQuality(visualQuality);
  const performancePanel=new PerformancePanel(loadSettings().performanceOverlay??false);
  const gpuTimer=new GpuTimer(ctx.renderer.getContext());
  const gl=ctx.renderer.getContext(),debug=gl.getExtension("WEBGL_debug_renderer_info");
  performancePanel.configure({clientBuild:"metric-battle-v9/performance-v3",mapId:mission.id,seed:mission.seed,mapSize:mission.map.size,buildingCount:world.mapFeatures.filter(f=>f.kind==="building").length,
    browser:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,deviceMemoryGB:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,
    graphics:debug?{vendor:gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)}:{renderer:gl.getParameter(gl.RENDERER)},
    webglVersion:gl.getParameter(gl.VERSION),gpuTimerSupported:gpuTimer.supported,devicePixelRatio:window.devicePixelRatio});
  const terrainView=createTerrain(mission.map.theme, world.mapFeatures, mission.map.bases);ctx.scene.add(terrainView);

  const terrainCulling=new TerrainCulling(terrainView);
  const cam = new RtsCamera(ctx.camera, heightAt, ctx.sun, topCanvas);
  cam.jumpTo(world.bases[world.playerTeam].x,world.bases[world.playerTeam].z);
  const units = new UnitRenderer(ctx.scene,ctx.camera);
  const ranges=new RangeOverlay(ctx.scene);
  const fx = new Fx(ctx.scene,ctx.camera);
  const resourceSites=new ResourceSites(ctx.scene,world);
  const fog = new FogOfWar(terrainView,world);
  const picker = new Picker(ctx.camera, world);
  picker.setPresentation(id=>units.positionFor(id));
  const selection = new SelectionController(topCanvas, world, picker);
  const commands = new CommandController(topCanvas, world, picker, selection);
  const overlay = new Overlay(topCanvas,document.getElementById("ui"));
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
          createSkirmish(world); replayRecorder.reset(world); units.reset();ranges.reset();overlay.reset();picker.setUnitMarkers([]);
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
  hud.onEquipment=(ids,slot,module)=>{if(running&&!paused)world.issue({type:"configure-unit",ids,slot,module});};
  hud.onCancelRefit=ids=>{if(running&&!paused)world.issue({type:"cancel-refit",ids});};
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
  const saveKey = SAVE_PREFIX + mission.id + (mission.id==="roheorg"?".layout16":mission.id==="operation-tidebreaker"?".coast3":mission.id==="tutorial-logistics"?".training16":"") + ".platforms1." + (skirmish ? activeMode : "campaign") + "." + faction;
  const sessionContext=JSON.stringify({mission:mission.id,seed:mission.seed,heightmap:mission.map.heightmap,terrain:mission.map.terrainProfile,maxHeight:mission.map.maxHeight,mode:skirmish?activeMode:"campaign",faction});
  // Avoid reading/copying a potentially multi-megabyte snapshot five times a second.
  const readSaveAvailability=()=>{try{return !multiplayer&&localStorage.getItem(saveKey)!==null;}catch{return false;}};
  let saveAvailable=readSaveAvailability();
  const hasSave=()=>saveAvailable;
  window.addEventListener("storage",e=>{if(e.key===saveKey||e.key===null)saveAvailable=readSaveAvailability();});
  const saveGame = () => {
    const indexed=writeSavedSession(localStorage,{
      key:saveKey,mission:mission.id,name:skirmish?mission.map.name:mission.name,faction,
      mode:skirmish?activeMode:"campaign",difficulty:skirmishDifficulty??"normal",
      deployment:queryParams.get("deployment")==="base"?"base":"ready",
      savedAt:new Date().toISOString(),time:world.time,status:world.status,
    },sessionContext,saveWorld(world));
    saveAvailable=true;
    return indexed;
  };
  const showBattleResult = (restored=false) => {
    const status=world.status;if(status==="running")return;
    let persistenceFailed=false;
    // Loading an ended snapshot must not overwrite its replay with an empty recorder.
    if(!restored){try{localStorage.setItem("rogue-front.replay.v1."+mission.id,JSON.stringify(replayRecorder.file()));}catch{persistenceFailed=true;}}

    const reason=(restored?"Taastatud tulemus · ":"")+(skirmish?(world.matchController?.label()??modeController.label()):mission.name);
    hud.showResult(status,world.time,reason+(persistenceFailed?" · Edenemise või replay salvestamine ebaõnnestus":""),undefined,!multiplayer);
    if(persistenceFailed)hud.setWarning("Tulemus säilib ekraanil, kuid brauseri salvestusruum ei võimaldanud kõiki andmeid salvestada.");
  };
  const loadGame = (resumePaused=false) => {
    if(multiplayer)return;
    try{
      const raw=localStorage.getItem(saveKey);if(!raw){hud.setWarning("Selle lahingu salvestus puudub");return;}
      loadWorld(world,readSessionWorld(raw,sessionContext));
      units.reset();ranges.reset();overlay.reset();picker.setUnitMarkers([]);fx.reset();commands.reset();selection.selected.clear();replayRecorder.reset(world);
      hud.hideScreen();running=world.status==="running";paused=running&&resumePaused;hud.setPaused(paused);setEnabled(running&&!paused);if(running&&!paused){audio.unlock();audio.startMusic();}else{audio.stopMusic();audio.pause();}
      const hq=world.hq[world.playerTeam];if(hq)cam.jumpTo(hq.x,hq.z);
      hud.setWarning("Salvestus taastatud · "+Math.floor(world.time/60)+" min"+(paused?" · vajuta Jätka":""));
      if(!running)showBattleResult(true);
    }catch(err){hud.setWarning(err instanceof Error?err.message:"Salvestuse laadimine ebaõnnestus");}
  };
  hud.onGuideTarget=p=>{cam.jumpTo(p.x,p.z);fx.ping(p.x,p.z,0x77ba9e);};
  hud.onGuideFocus=ids=>{commands.reset();selection.selected.clear();for(const id of ids)selection.selected.add(id);const u=world.byId.get(ids[0]);if(u)cam.jumpTo(u.x,u.z);};
  hud.setSaveAvailability(hasSave(),false);
  const togglePause = () => { if(!running||settingsPanel.isOpen)return; if(multiplayer){hud.setWarning("Võrgumäng peatub ühenduse katkemisel automaatselt.");return;} paused = !paused; setEnabled(running && !paused); hud.setPaused(paused); if (paused) audio.pause(); else { audio.unlock(); audio.resume(); audio.startMusic(); } };
  hud.onPause = togglePause;
  hud.onSettings = () => {if(running&&!paused&&!multiplayer)togglePause();setEnabled(false);cam.enabled=false;settingsPanel.open();};
  hud.onRestart = () => {
    try{
      if(skirmish&&world.activeDeck)sessionStorage.setItem("rogue-front.activeDeck",JSON.stringify(world.activeDeck));
      else sessionStorage.removeItem("rogue-front.activeDeck");
      const url=new URL(restartBattleUrl(location.href));url.searchParams.set("faction",world.playerFaction);
      location.href=url.toString();
    }catch{hud.setWarning("Taasalustamine ebaõnnestus: brauser ei võimalda lahingukoosseisu taastada.");}
  };
  hud.onSave = () => { if (running && !multiplayer) {try{const indexed=saveGame();hud.setWarning(indexed?"Mäng salvestatud":"Mäng salvestatud; menüüloend ei uuenenud — laadi selle lahingu menüüst");}catch{hud.setWarning("Salvestamine ebaõnnestus: brauseri salvestusruum on täis");}} };
  hud.onLoad = () => {if(!multiplayer)loadGame();};
  hud.onSkirmish = (m, difficulty, mode) => { const url = new URL(location.href); url.search = ""; url.searchParams.set("mission", m.id); url.searchParams.set("mode", "skirmish"); url.searchParams.set("difficulty", difficulty); url.searchParams.set("gameMode", mode ?? "skirmish"); url.searchParams.set("faction", hud.selectedFaction); location.href = url.toString(); };

  let running = false;
  const setEnabled = (on: boolean) => { selection.enabled = commands.enabled = minimap.enabled = on; };
  const facBlur = FACTIONS[world.playerFaction]?.doctrineBlurb ?? "";
  // Compile every static material (including hidden LODs) before free camera movement.
  cam.update(0);units.sync(world,1,selection.selected,0,visualQuality);
  const terrainTextures=new Set<THREE.Texture>();
  terrainView.traverse(o=>{if(!(o instanceof THREE.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(m instanceof THREE.MeshStandardMaterial){for(const t of [m.map,m.bumpMap,m.normalMap])if(t)terrainTextures.add(t);}
    else if(m instanceof THREE.MeshBasicMaterial&&m.map)terrainTextures.add(m.map);
  }});
  for(const texture of terrainTextures)ctx.renderer.initTexture(texture);
  warmTerrainBuffers(ctx.renderer,ctx.scene,ctx.camera,terrainView);
  await ctx.renderer.compileAsync(ctx.scene,ctx.camera);
  hud.showBriefing(skirmish ? { ...mission, name: "Skirmish — " + mission.map.name, briefing: (mission.id === "roheorg"||mission.id.startsWith("procedural-")) ? mission.briefing + "\n\n" + modeController.label() + "\n\n" + (queryParams.get("deployment")==="base" ? "Ehita generaator → varustusladu → maaväe juhtimiskeskus → tehas. Saada insener ressursipunkti." : "Baas ja väike lahingugrupp on valmis. Saada luure ette; tugevda koosseisu Maa-paneelist. Insener käivitab koduse ressursipunkti kogumise.") + "\n\nF1: vali soomus · Fookus: kaamera valikule\nRündeliiku + parem klõps: liigu ja võitle\nInsener / juhtimishoone → Ehita: baas ja FOB\nMoon, kütus ja remont vajavad tegelikku varustust." : modeController.label() + "\n\nREAL WAR baas:\n1) Generaator → varustusladu → maaväe juhtimiskeskus → tehas\n2) Saada teine insener ressursipunkti; ta käivitab kogumise\n3) Veokid toovad raha ja ammo/kütusevaru. Katkenud tarne peatab tootmise\n\nWARGAME lahing:\n• Optika/recon — kes näeb, tulistab\n• Supply raadius — ammo/kütus; forward ladu risk\n• Flank ja moraal loevad\n• Õhk: CAP / Strike / SEAD; ilma AA-ta kaotad\n\nDoktriin: " + facBlur + "\n\nKlahvid: F1 soomus F2 jala F3 õhk F4 toetus · Ctrl+1-9 grupid" } : mission, () => { if(multiplayer)return; running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); }, hasSave(), () => loadGame());

  addEventListener("keydown", (e) => {
    if(settingsPanel.isOpen||e.repeat||(e.target instanceof Element&&e.target.closest("input,textarea,select,[contenteditable=true]")))return;
    if (!e.defaultPrevented && e.key.toLowerCase() === loadSettings().keys.pause && running) togglePause();
    if (!running || paused) return false;
    const k = e.key.toLowerCase();
    if(["f1","f2","f3","f4"].includes(k))e.preventDefault();
    // Quick filters (Wargame-style selection aids)
    if (k === "f1") selection.selectFilter(u => ["tank","ifv","apc"].includes(u.kind));
    if (k === "f2") selection.selectFilter(u => ["inf","atInf","mgInf","reconInf","sniper","manpad","atgm","mortar","special","engineer"].includes(u.kind));
    if (k === "f3") selection.selectFilter(u => u.def.armor === "air" || ["heli","gunship","fighter","interceptor","bomber"].includes(u.kind));
    if (k === "f4") selection.selectFilter(u => isIndirectUnit(u) || ["aa","spaa","manpad","logiTruck"].includes(u.kind));
  });

  let hudAcc = 1;
  let fpsFrames=0,fpsStarted=performance.now();
  const loop = new GameLoop(
    SIM_STEP,
    (dt) => {
      if (!running || paused) return false;
      if (net) {
        const packet = networkPackets.shift();
        if (!packet) return false;
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
        showBattleResult();
      }
      return true;
    },
    (alpha, frameDt) => {
      performancePanel.begin();
      cam.update(frameDt);terrainCulling.sync(ctx.camera);performancePanel.mark("kaamera");
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
      performancePanel.mark("üksused");
      terrainAcc+=frameDt;
      if(terrainAcc>=.2){
        terrainAcc%=.2;
        const forestChanged=syncForestTerrain(terrainView,world),housesChanged=syncGarrisonTerrain(terrainView,world);
        const bridgesChanged=syncBridgeTerrain(terrainView,world);
        if(forestChanged||housesChanged||bridgesChanged)ctx.updateShadows(true);
        resourceSites.sync(world,ctx.camera);
      }
      animateRiverTerrain(terrainView,world.time);
      performancePanel.mark("maastik");
      fx.handleEvents(events,world);
      audio.events(events, world.playerTeam);
      fx.syncProjectiles(world, visualAlpha);
      fx.syncForestFires(world,frameDt);fx.syncNavalWakes(world,frameDt);
      fx.update(frameDt);
      const animateWater = ctx.water.material as THREE.ShaderMaterial;
      if (animateWater.uniforms?.time) animateWater.uniforms.time.value += frameDt;
      performancePanel.mark("efektid");
      fog.sync(world,visualAlpha);
      performancePanel.mark("udu");
      gpuTimer.begin(performancePanel.enabled);
      ctx.post.render();
      gpuTimer.end();
      performancePanel.mark("3D");
      overlay.draw(world, picker, selection, { point: commands.buildPoint, kind: commands.buildMode, rotation: commands.buildRotation, valid: commands.buildValid },commands);
      performancePanel.mark("sildid");
      minimap.draw(frameDt);
      performancePanel.mark("minikaart");
      hudAcc += frameDt; fpsFrames++;
      if (hudAcc > 0.2) {
        hudAcc = 0;
        hud.setSaveAvailability(hasSave(),running&&!multiplayer);
        hud.update(world, selection.selected, running && !paused, skirmish ? [] : (world.missionController?.summary()??[]), skirmish ? (world.matchController?.label()??modeController.label()) : (world.missionController?.messageText??""));
      }
      const ownHq = world.hq[world.playerTeam];
      if (ownHq && ownHq.hp < maxHitPoints(ownHq) * .35 && world.status === "running") hud.setWarning("HOIATUS: baas on tugeva tule all");
      const fpsNow=performance.now(),fpsElapsed=fpsNow-fpsStarted;
      if(fpsElapsed>=500){hud.setFps(Math.round(fpsFrames*1000/fpsElapsed));fpsFrames=0;fpsStarted=fpsNow;}
      performancePanel.mark("HUD");
    },
    metrics=>performancePanel.record(metrics,{cameraX:ctx.camera.position.x,cameraY:ctx.camera.position.y,cameraZ:ctx.camera.position.z,gpuMs:gpuTimer.milliseconds,gpuSampleAgeFrames:gpuTimer.sampleAgeFrames,geometries:ctx.renderer.info.memory.geometries,textures:ctx.renderer.info.memory.textures,calls:ctx.renderer.info.render.calls,triangles:ctx.renderer.info.render.triangles,units:world.entities.length,worldTime:world.time,quality:visualQuality,terrainGroupsVisible:terrainCulling.visibleGroups,terrainGroupsTotal:terrainCulling.totalGroups,width:glCanvas.width,height:glCanvas.height}),
    ()=>performancePanel.enabled,
  );
  const resumeKey=queryParams.get("resume");
  if(resumeKey&&!multiplayer){
    if(resumeKey===saveKey)loadGame(true);
    else hud.setWarning("Salvestuse kaart või režiim on muutunud; vali sobiv lahing või alusta uut");
  }
  loop.start();
}

const queryMode = queryParams.get("mode");
const requestedDifficulty=queryParams.get("difficulty");
const queryDifficulty=requestedDifficulty==="easy"||requestedDifficulty==="hard"?requestedDifficulty:"normal";
if (queryMission) {
  if ((queryMode === "multiplayer" || queryMode === "spectator") && !getAuthToken()) { location.href = location.pathname; throw new Error("Multiplayer requires account authentication"); }
  const queryFaction = (queryParams.get("faction") as FactionId | null) ?? (localStorage.getItem("rogue-front.faction") as FactionId | null) ?? "usa";
  const bootFaction = (FACTION_LIST.includes(queryFaction as FactionId) ? queryFaction : "usa") as FactionId;
  const selectedMission = getPlayableMap(queryMission);
  if (!selectedMission)showMenu("Seda kaarti või operatsiooni ei leitud. Vali menüüst uus lahing.");
  else void boot(selectedMission, queryRoom || undefined, queryMode !== "multiplayer" && queryMode !== "spectator" ? (queryDifficulty || "normal") : undefined, bootFaction, queryMode === "spectator", querySpectateToken || "").catch((err: unknown) => {
    console.error(err);
    const reason=err instanceof Error&&/WebGL/i.test(err.message)
      ? "Brauser ei saanud WebGL 2 3D-vaadet käivitada. Kontrolli brauseri riistvarakiirendust ja graafikadraiverit või proovi teist toetatud brauserit. Graafikakvaliteedi vähendamine ei asenda puuduvat WebGL-i tuge."
      : err instanceof Error ? err.message : "Proovi lehte uuesti avada.";
    showMenu("Lahingu käivitamine ebaõnnestus. "+reason);
  });
} else showMenu();

function showMenu(message=""):void {
  const gameRoot=document.getElementById("ui")!;
  gameRoot.innerHTML='<div id="online-root"></div>';
  const shell=new OnlineShell(document.getElementById("online-root")!);
  shell.showOffline(message);
}

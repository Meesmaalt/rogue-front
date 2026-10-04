import "./style.css";
import * as THREE from "three";
import { GameLoop } from "./core/GameLoop";
import { SIM_STEP } from "./sim/constants";
import type { FactionId } from "./sim/factions";
import { FACTION_LIST, FACTIONS } from "./sim/factions";
import { DeckBuilder } from "./ui/DeckBuilder";
import { World } from "./sim/World";
import { heightAt, loadHeightmap, setBases, ensureHeightCache, setProceduralSeed } from "./sim/heightmap";
import { createRenderContext } from "./render/Renderer";
import { createTerrain } from "./render/Terrain";
import { RtsCamera } from "./render/RtsCamera";
import { loadArtModels } from "./render/ArtModels";
import { UnitRenderer } from "./render/UnitRenderer";
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
import { loadWorld, saveWorld } from "./sim/SaveState";
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
  try { await loadArtModels(FACTION_LIST); hud.setWarning(""); } catch (error) {
    console.warn("3D asset loading failed", error);
    hud.setWarning("Osa 3D-mudeleid ei laadinud. Kasutan varumudeleid.");
  }
  setBases(mission.map.bases);
  setProceduralSeed(mission.seed);
  if(mission.map.heightmap)await loadHeightmap(mission.map.heightmap,mission.map.maxHeight);
  ensureHeightCache(); // rebuild cache now that heightmap + bases are final

  const skirmish = !!skirmishDifficulty;
  const world = new World(mission.seed, !skirmish, mission.map.resources, mission.map.features ?? [], mission.map.bases);
  const multiplayer = !!multiplayerRoom && !skirmish;
  const net = multiplayer ? new LockstepClient() : null;
  const networkPackets: Array<{ tick: number; commands: import("./sim/types").Command[] }> = [];
  let localTeam: 0 | 1 = 0;
  let applyingNetwork = false;
  const replayRecorder = new ReplayRecorder(mission.seed);
  const audio = new AudioManager();
  const settingsPanel = new SettingsPanel((settings) => { audio.setSettings(settings); ctx.setQuality(settings.quality); });
  let paused = false;
  const originalIssue = world.issue.bind(world);
  world.issue = (command) => {
    if (multiplayer && !applyingNetwork) { net!.submit(command); return; }
    if(multiplayer||command.team===undefined||command.team===world.playerTeam)replayRecorder.record({...command,team:command.team??world.playerTeam}); originalIssue(command);
  };
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
  if (skirmish) { createSkirmish(world); world.ai.setProfile(skirmishDifficulty === "hard" ? "aggressive" : skirmishDifficulty === "easy" ? "defensive" : "economic", skirmishDifficulty!); }
  if (skirmish && activeMode !== "skirmish") world.externalVictoryMode = true;
  if (multiplayer) world.setNetworkMode(0);

  replayRecorder.reset(world);

  const glCanvas = document.getElementById("game") as HTMLCanvasElement;
  const topCanvas = document.getElementById("overlay") as HTMLCanvasElement;
  const fogCanvas = document.getElementById("fog") as HTMLCanvasElement;
  const ctx = createRenderContext(glCanvas);
  ctx.setQuality(loadSettings().quality);
  ctx.scene.add(createTerrain(mission.map.theme, world.mapFeatures, mission.map.bases));

  const cam = new RtsCamera(ctx.camera, heightAt, ctx.sun, topCanvas);
  cam.jumpTo(world.bases[world.playerTeam].x,world.bases[world.playerTeam].z);
  const units = new UnitRenderer(ctx.scene);
  const fx = new Fx(ctx.scene);
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
          createSkirmish(world); replayRecorder.reset(world); units.reset();
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
  minimap.onOrder = (x, z) => commands.moveTo(x, z);
  hud.onProduce = (kind, producerId) => { if (running && !paused) world.issue({ type: "produce", kind, producerId }); };
  hud.onBuild = (kind) => { if (running && !paused) commands.startBuild(kind); };
  hud.onUpgradeSupply = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "supply-depot" }); };
  hud.onUpgradeFOB = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "fob" }); };
  hud.onDepotPriority = (ids, focus) => { if (running && !paused) world.issue({ type: "depot-priority", ids, focus }); };
  hud.onUpgradeProducer = (ids) => { if (running && !paused) world.issue({ type: "upgrade", ids, upgrade: "producer" }); };
  hud.onStance = (ids, mode) => { if (running && !paused) world.issue({ type: "standing", ids, mode }); };
  hud.onPriority = (ids, focus) => { if (running && !paused) world.issue({ type: "priority", ids, focus }); };
  hud.onPreDeploy = (ids, mode) => { if (running && !paused) world.issue({ type: "predeploy", ids, mode }); };
  hud.onFormation = (kind) => {if(running&&!paused)world.issue({type:"formation",kind});};
  hud.onAirMission=(ids,mission)=>{if(running&&!paused){commands.startAirMission(ids,mission);hud.setWarning("Õhuoperatsioon: parem klõps sihtpunktile, Esc tühistab");}};
  hud.onCancelProduce = (producerId) => { if (running && !paused) world.issue({ type: "cancel-produce", producerId }); };
  const saveKey = SAVE_PREFIX + mission.id + "." + (skirmish ? activeMode : "campaign") + "." + faction;
  const hasSave = () => localStorage.getItem(saveKey) !== null;
  const saveGame = () => { localStorage.setItem(saveKey, JSON.stringify(saveWorld(world))); localStorage.setItem("rogue-front.replay.v1." + mission.id, JSON.stringify(replayRecorder.file())); };
  const loadGame = () => { const raw = localStorage.getItem(saveKey); if (!raw) return; try { loadWorld(world, JSON.parse(raw));units.reset();selection.selected.clear();replayRecorder.reset(world); running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); } catch (err) { console.error("Salvestuse laadimine ebaõnnestus", err); hud.setWarning("Salvestuse laadimine ebaõnnestus"); } };
  const togglePause = () => { if(multiplayer){hud.setWarning("Võrgumäng peatub ühenduse katkemisel automaatselt.");return;} paused = !paused; setEnabled(running && !paused); hud.setPaused(paused); if (paused) audio.pause(); else { audio.unlock(); audio.resume(); } };
  hud.onPause = togglePause;
  hud.onSettings = () => settingsPanel.open();
  hud.onSave = () => { if (running && !multiplayer) {try{saveGame();hud.setWarning("Mäng salvestatud");}catch{hud.setWarning("Salvestamine ebaõnnestus: brauseri salvestusruum on täis");}} };
  hud.onLoad = () => {if(!multiplayer)loadGame();};
  hud.onSkirmish = (m, difficulty, mode) => { const url = new URL(location.href); url.search = ""; url.searchParams.set("mission", m.id); url.searchParams.set("mode", "skirmish"); url.searchParams.set("difficulty", difficulty); url.searchParams.set("gameMode", mode ?? "skirmish"); url.searchParams.set("faction", hud.selectedFaction); location.href = url.toString(); };

  let running = false;
  const setEnabled = (on: boolean) => { selection.enabled = commands.enabled = minimap.enabled = on; };
  const facBlur = FACTIONS[world.playerFaction]?.doctrineBlurb ?? "";
  hud.showBriefing(skirmish ? { ...mission, name: "Skirmish — " + mission.map.name, briefing: modeController.label() + "\n\nREAL WAR baas:\n1) Generaator → varustusladu → maaväe juhtimiskeskus → tehas\n2) Saada teine insener ressursipunkti; ta käivitab kogumise\n3) Veokid toovad raha ja ammo/kütusevaru. Katkenud tarne peatab tootmise\n\nWARGAME lahing:\n• Optika/recon — kes näeb, tulistab\n• Supply raadius — ammo/kütus; forward ladu risk\n• Flank ja moraal loevad\n• Õhk: CAP / Strike / SEAD; ilma AA-ta kaotad\n\nDoktriin: " + facBlur + "\n\nKlahvid: F1 soomus F2 jala F3 õhk F4 toetus · Ctrl+1-9 grupid" } : mission, () => { if(multiplayer)return; running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); }, hasSave(), loadGame);

  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === loadSettings().keys.pause && running) togglePause();
    if (!running || paused) return;
    const k = e.key.toLowerCase();
    // Quick filters (Wargame-style selection aids)
    if (k === "f1") selection.selectFilter(u => ["tank","ifv","apc"].includes(u.kind));
    if (k === "f2") selection.selectFilter(u => ["inf","special","engineer"].includes(u.kind));
    if (k === "f3") selection.selectFilter(u => u.def.armor === "air" || ["heli","gunship","fighter","interceptor","bomber"].includes(u.kind));
    if (k === "f4") selection.selectFilter(u => ["artillery","mlrs","aa"].includes(u.kind));
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
        if (world.status === "won" && !skirmish && !multiplayer) { MissionController.markCompleted(mission.id); completeCampaignMission(mission); }
        localStorage.setItem("rogue-front.replay.v1." + mission.id, JSON.stringify(replayRecorder.file()));
        const next = !skirmish && !multiplayer && world.status === "won" ? CAMPAIGN.find(n=>!loadCampaign().completed.includes(n.id)&&isUnlocked(n)) : undefined;
        hud.showResult(world.status, world.time, skirmish ? (world.matchController?.label()??modeController.label()) : mission.name, next?.missionId);
      }
    },
    (alpha, frameDt) => {
      cam.update(frameDt);
      selection.prune();
      const events = world.drainEvents();
      units.handleEvents(events);
      units.sync(world, alpha, selection.selected);
      units.syncIntelGhosts(world);
      fx.handleEvents(events);
      audio.events(events, world.playerTeam);
      fx.syncProjectiles(world, alpha);
      fx.update(frameDt);
      const animateWater = ctx.water.material as THREE.ShaderMaterial;
      if (animateWater.uniforms?.time) animateWater.uniforms.time.value += frameDt;
      ctx.post.render();
      fog.draw(world, picker);
      overlay.draw(world, picker, selection, { point: commands.buildPoint, kind: commands.buildMode, rotation: commands.buildRotation, valid: commands.buildValid });
      minimap.draw();
      hudAcc += frameDt; frames++; fpsAcc += frameDt;
      if (hudAcc > 0.2) {
        hudAcc = 0;
        hud.update(world, selection.selected, running && !paused, skirmish ? [] : (world.missionController?.summary()??[]), skirmish ? (world.matchController?.label()??modeController.label()) : (world.missionController?.messageText??""));
      }
      const ownHq = world.hq[world.playerTeam];
      if (ownHq && ownHq.hp < ownHq.def.hp * .35 && world.status === "running") hud.setWarning("HOIATUS: baas on tugeva tule all");
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

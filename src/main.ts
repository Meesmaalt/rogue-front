import "./style.css";
import * as THREE from "three";
import { GameLoop } from "./core/GameLoop";
import { SIM_STEP } from "./sim/constants";
import { World } from "./sim/World";
import { heightAt, loadHeightmap, setBases } from "./sim/heightmap";
import { createRenderContext } from "./render/Renderer";
import { createTerrain } from "./render/Terrain";
import { RtsCamera } from "./render/RtsCamera";
import { UnitRenderer } from "./render/UnitRenderer";
import { Fx } from "./render/Fx";
import { FogOfWar } from "./render/FogOfWar";
import { Picker } from "./input/Picker";
import { SelectionController } from "./input/SelectionController";
import { CommandController } from "./input/CommandController";
import { Hud } from "./ui/Hud";
import { Minimap } from "./ui/Minimap";
import { Overlay } from "./ui/Overlay";
import { preloadModels } from "./render/GLBModels";
import { MISSIONS, getMission } from "./data/missions";
import { MissionController } from "./sim/Mission";
import { loadWorld, saveWorld } from "./sim/SaveState";
import { ReplayRecorder } from "./sim/Replay";
import { AudioManager } from "./render/Audio";
import { loadSettings, SettingsPanel } from "./ui/Settings";
import type { MissionDef } from "./sim/types";
import { LockstepClient } from "./net/LockstepClient";
import { worldHash } from "./sim/Replay";

const hud = new Hud(document.getElementById("ui")!);
const queryParams = new URLSearchParams(location.search);
const queryMission = queryParams.get("mission");
const queryRoom = queryParams.get("room");
const SAVE_PREFIX = "rogue-front.save.v1.";

async function boot(mission: MissionDef, multiplayerRoom?: string, skirmishDifficulty?: "easy"|"normal"|"hard"): Promise<void> {
  setBases(mission.map.bases);
  await Promise.all([loadHeightmap(mission.map.heightmap, mission.map.maxHeight), preloadModels()]);

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
    if (multiplayer && !applyingNetwork) { net!.submit(command); replayRecorder.record(command); return; }
    replayRecorder.record(command); originalIssue(command);
  };
  for (const obj of mission.map.objects ?? []) {
    const count = Math.max(1, obj.count ?? 1);
    const dx = obj.dx ?? 0, dz = obj.dz ?? 0;
    for (let i = 0; i < count; i++) world.spawn(obj.kind, obj.team, obj.x + dx * i, obj.z + dz * i);
  }
  const missionRuntime = new MissionController(mission, world);
  if (skirmish) { const { createSkirmish } = await import("./sim/scenario"); createSkirmish(world); world.ai.setProfile(skirmishDifficulty === "hard" ? "aggressive" : skirmishDifficulty === "easy" ? "defensive" : "economic", skirmishDifficulty!); }
  if (multiplayer) world.setNetworkMode(0);

  const glCanvas = document.getElementById("game") as HTMLCanvasElement;
  const topCanvas = document.getElementById("overlay") as HTMLCanvasElement;
  const fogCanvas = document.getElementById("fog") as HTMLCanvasElement;
  const ctx = createRenderContext(glCanvas);
  ctx.setQuality(loadSettings().quality);
  ctx.scene.add(createTerrain(mission.map.theme, world.mapFeatures, mission.map.bases));

  const cam = new RtsCamera(ctx.camera, heightAt, ctx.sun, topCanvas);
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
      status: (status, text) => hud.setNetworkStatus(status === "running" ? `1v1 · ${localTeam + 1}` : text),
      assigned: (team) => { localTeam = team; world.setNetworkMode(team); hud.setNetworkStatus(`1v1 · meeskond ${team + 1}`); },
      started: () => { running = true; paused = false; setEnabled(true); },
      tick: (packet) => networkPackets.push(packet),
      desync: (tick) => hud.setWarning(`DESYNC tuvastatud tick ${tick} — mäng peatatud`),
    });
    net.connect(multiplayerRoom!, mission.id);
  }

  minimap.onJump = (x, z) => cam.jumpTo(x, z);
  minimap.onOrder = (x, z) => commands.moveTo(x, z);
  hud.onProduce = (kind, producerId) => { if (running && !paused) world.issue({ type: "produce", kind, producerId }); };
  hud.onBuild = (kind) => { if (running && !paused) commands.startBuild(kind); };
  const saveKey = SAVE_PREFIX + mission.id;
  const hasSave = () => localStorage.getItem(saveKey) !== null;
  const saveGame = () => { localStorage.setItem(saveKey, JSON.stringify(saveWorld(world))); localStorage.setItem("rogue-front.replay.v1." + mission.id, JSON.stringify(replayRecorder.file())); };
  const loadGame = () => { const raw = localStorage.getItem(saveKey); if (!raw) return; try { loadWorld(world, JSON.parse(raw)); running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); } catch (err) { console.error("Salvestuse laadimine ebaõnnestus", err); } };
  const togglePause = () => { paused = !paused; setEnabled(running && !paused); hud.setPaused(paused); if (paused) audio.pause(); else { audio.unlock(); audio.resume(); } };
  hud.onPause = togglePause;
  hud.onSettings = () => settingsPanel.open();
  hud.onSave = () => { if (running) saveGame(); };
  hud.onLoad = loadGame;

  let running = false;
  const setEnabled = (on: boolean) => { selection.enabled = commands.enabled = minimap.enabled = on; };
  hud.showBriefing(skirmish ? { ...mission, name: "Skirmish — " + mission.map.name, briefing: "Hävitaja HQ on ainus võidutingimus. Alustad HQ, inseneri ja kahe transpordikopteriga. Transpordikoptereid kasutad ressursipunktidest varude toomiseks; ehita baas, loo armee ja hävita vastase HQ." } : mission, () => { running = true; paused = false; hud.setPaused(false); setEnabled(true); audio.unlock(); audio.startMusic(); }, hasSave(), loadGame);

  addEventListener("keydown", (e) => { if (e.key.toLowerCase() === loadSettings().keys.pause && running) togglePause(); });

  let frames = 0, fpsAcc = 0, hudAcc = 1;
  const loop = new GameLoop(
    SIM_STEP,
    (dt) => {
      if (!running || paused) return;
      if (net) {
        const packet = networkPackets.shift();
        if (!packet) return;
        applyingNetwork = true;
        for (const command of packet.commands) originalIssue(command);
        applyingNetwork = false;
        world.tick(dt);
        replayRecorder.step();
        net.ack(worldHash(world));
      } else {
        world.tick(dt);
        replayRecorder.step();
      }
      if (!multiplayer && !skirmish) missionRuntime.tick(dt);
      if (world.status !== "running") {
        running = false;
        setEnabled(false);
        audio.stopMusic();
        net?.close();
        if (world.status === "won" && !skirmish) MissionController.markCompleted(mission.id);
        localStorage.setItem("rogue-front.replay.v1." + mission.id, JSON.stringify(replayRecorder.file()));
        hud.showResult(world.status, world.time);
      }
    },
    (alpha, frameDt) => {
      cam.update(frameDt);
      selection.prune();
      const events = world.drainEvents();
      units.handleEvents(events);
      units.sync(world, alpha, selection.selected);
      fx.handleEvents(events);
      audio.events(events);
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
        hud.update(world, selection.selected, running && !paused, missionRuntime.summary(), missionRuntime.messageText);
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
  void boot(getMission(queryMission), queryRoom || undefined, queryMode === "skirmish" ? (queryDifficulty || "normal") : undefined).catch((err: unknown) => {
    console.error(err);
    hud.showMissionSelect(MISSIONS, MissionController.loadProgress(), (mission) => { location.href = "?mission=" + encodeURIComponent(mission.id); });
  });
} else {
  hud.showMissionSelect(MISSIONS, MissionController.loadProgress(), (mission) => { location.href = "?mission=" + encodeURIComponent(mission.id); });
  hud.onSkirmish = (mission,difficulty) => { location.href = "?mission="+encodeURIComponent(mission.id)+"&mode=skirmish&difficulty="+difficulty; };
  hud.onMultiplayer = (mission, room) => { location.href = "?mission=" + encodeURIComponent(mission.id) + "&room=" + encodeURIComponent(room || "ALPHA-01"); };
}

import * as THREE from "three";
import {Fx} from "./render/Fx";
import {AudioManager} from "./render/Audio";
import {setBases} from "./sim/heightmap";
import {loadSettings} from "./ui/Settings";
import type {SimEvent} from "./sim/types";

const LOOP = 22;

/** Standalone range so muzzle flashes, bursts and their sounds can be checked without a full battle. */
export function startFxShowcase(): void {
  setBases([{x: 0, z: 0, r: 140}, {x: 0, z: 16, r: 24}]);
  const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
  const fog = document.getElementById("fog");
  const overlay = document.getElementById("overlay");
  if (fog) fog.style.display = "none";
  if (overlay) overlay.style.display = "none";
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, powerPreference: "high-performance"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x93a4a6);
  scene.fog = new THREE.Fog(0x93a4a6, 36, 130);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 280);
  scene.add(new THREE.HemisphereLight(0xd7e7ee, 0x3c4632, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2d2, 2.35);
  sun.position.set(28, 46, 16);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(46, 56), new THREE.MeshStandardMaterial({color: 0x6a7254, roughness: 1}));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const water = new THREE.Mesh(new THREE.CircleGeometry(9, 36), new THREE.MeshStandardMaterial({color: 0x2f6772, roughness: 0.18, metalness: 0.2}));
  water.rotation.x = -Math.PI / 2;
  water.position.set(2, 0.04, 15);
  scene.add(water);
  const prop = (x: number, z: number, w: number, h: number, d: number, color: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({color, roughness: 0.86}));
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
  };
  prop(-11, -1, 4.2, 1.5, 2.4, 0x596348);
  prop(9, 1, 3.4, 1.35, 6.2, 0x4a5340);
  prop(-1, -9, 2.1, 3.4, 2.1, 0x6d5c49);
  prop(4, 6, 1.2, 0.7, 2.4, 0x3e4638);

  const fx = new Fx(scene, camera);
  const audio = new AudioManager();
  const settings = loadSettings();
  audio.setSettings({...settings, masterVolume: Math.max(0.9, settings.masterVolume), sfxVolume: Math.max(0.9, settings.sfxVolume), musicVolume: 0.1});
  const ui = document.getElementById("ui")!;
  ui.innerHTML = `<style>
    #fx-hud{position:fixed;left:16px;right:16px;bottom:16px;z-index:30;display:flex;justify-content:space-between;gap:16px;align-items:flex-end;pointer-events:none;font-family:Barlow,Arial,sans-serif;color:#f4f1e6}
    #fx-hud>div{pointer-events:auto;background:rgba(12,18,20,.82);border:1px solid #6d5a32;border-left:4px solid #f2a33a;padding:12px 14px;max-width:min(520px,100%)}
    #fx-hud .eyebrow{letter-spacing:.16em;font-size:11px;color:#e2c27a}
    #fx-hud h1{margin:2px 0 4px;font:700 28px/1 "Barlow Condensed",Impact,sans-serif}
    #fx-hud p{margin:0;color:#d5ddd8;font-size:14px}
    #fx-hud button{background:#f2a33a;color:#1a1409;border:0;font-weight:800;padding:10px 14px;cursor:pointer}
    #fx-hint{margin-top:8px!important;color:#f2a33a!important}
  </style><div id="fx-hud"><div><div class="eyebrow">ROGUE FRONT</div><h1>Efektide proov</h1><p id="fx-label">Laskevali käivitub…</p></div><div><button id="fx-menu" type="button">TAGASI MENÜÜSSE</button><p id="fx-hint">Klõpsa suvalist kohta, et heli sisse lülitada.</p></div></div>`;
  document.querySelector<HTMLButtonElement>("#fx-menu")!.onclick = () => { location.href = `${location.pathname}?fx=0`; };
  const label = document.querySelector<HTMLElement>("#fx-label")!;
  const hint = document.querySelector<HTMLElement>("#fx-hint")!;
  const arm = (fromUser: boolean) => { audio.unlock(); audio.startMusic(); if (fromUser) hint.hidden = true; };
  window.addEventListener("pointerdown", () => arm(true));
  arm(false);

  const fire = (visual: string, x: number, y: number, z: number, dx: number, dy: number, dz: number): SimEvent => ({type: "fire", team: 0, x, y, z, visual, weapon: visual === "rifle" || visual === "mg" || visual === "sniper" ? "bullet" : visual, dx, dy, dz});
  const hit = (visual: string, x: number, y: number, z: number, result?: "penetration" | "ricochet" | "ground" | "airburst" | "intercept"): SimEvent => ({type: "impact", x, y, z, visual, weapon: visual === "rifle" || visual === "mg" || visual === "sniper" ? "bullet" : "cannon", result});
  const play = (event: SimEvent, wet = false) => { fx.preview(event, wet); audio.events([event]); };
  const burst = (visual: string, n: number, gap: number, x: number, z: number) => {
    for (let i = 0; i < n; i++) window.setTimeout(() => play(fire(visual, x, 1.2, z, 1, 0.02, 0.15)), i * gap);
  };

  const steps: Array<{t: number; label: string; run: () => void}> = [
    {t: 0.2, label: "Vintpüss — terav pauk ja kerge suits", run: () => burst("rifle", 4, 140, -16, -2)},
    {t: 1.5, label: "Kuulipilduja — lühike valang", run: () => burst("mg", 8, 70, -16, 1)},
    {t: 3.1, label: "Automaatkahur — raskem lõhkemine", run: () => burst("autocannon", 4, 160, -18, 3)},
    {t: 4.5, label: "Snaiper — üks kuiv pauk", run: () => play(fire("sniper", -20, 1.6, -4, 1, 0, 0.2))},
    {t: 5.4, label: "Tankikahur — sügav löök ja läbivus", run: () => { play(fire("sabot", -18, 1.4, 0, 1, 0.04, 0)); window.setTimeout(() => play(hit("sabot", 8, 1.1, 1, "penetration")), 180); }},
    {t: 7.0, label: "Haubits — vile ja maaplahvatus", run: () => { play(fire("howitzer", -20, 1.5, 2, 0.6, 0.5, 0.2)); window.setTimeout(() => play(hit("howitzer", 1, 0.4, 4, "ground")), 320); }},
    {t: 9.0, label: "Tankitõrjerakett — start ja mootor", run: () => { play(fire("atgm", -14, 1.3, -3, 0.8, 0.25, 0.1)); window.setTimeout(() => play(hit("atgm", 7, 1.6, 2, "ground")), 700); }},
    {t: 11.0, label: "Mitmikraketid — valang", run: () => { burst("mlrs", 4, 120, -12, 5); window.setTimeout(() => play(hit("mlrs", 3, 0.5, 6, "ground")), 900); }},
    {t: 13.2, label: "Õhutõrje — rakett lõhatakse õhus", run: () => { play(fire("sam", -8, 1.2, -6, 0.2, 0.9, 0.2)); window.setTimeout(() => play(hit("sam", 2, 8, 0, "intercept")), 500); }},
    {t: 14.8, label: "Riikošett — metallikõlin", run: () => play(hit("autocannon", 9, 1.3, 1, "ricochet"))},
    {t: 16.0, label: "Vesi — prits ja madal löök", run: () => { const e = hit("mortar", 2, 0.3, 15, "ground"); fx.preview(e, true); audio.events([{type: "impact", x: 2, y: 0.3, z: 15, weapon: "splash", visual: "splash"}]); }},
    {t: 17.6, label: "Masina häving — tulekera ja suitsusammas", run: () => { const e: SimEvent = {type: "death", x: 9, y: 1.2, z: 1, big: true, team: 1}; fx.preview(e); audio.events([e]); }},
    {t: 19.4, label: "Metsatulekahju — praksumine ja leegid", run: () => { burningUntil = performance.now() + 2400; play(hit("howitzer", -4, 0.5, -8, "ground")); }},
  ];

  let burningUntil = 0;
  let fireAcc = 0;
  let cursor = 0;
  let prev = 0;
  let shake = 0;
  audio.onCue = cue => { if (cue.kind === "impact") shake = Math.max(shake, (cue.intensity ?? 0) * 2.2); };
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const loopT = (now / 1000) % LOOP;
    if (loopT < prev) cursor = 0;
    while (cursor < steps.length && steps[cursor].t <= loopT) { label.textContent = steps[cursor].label; steps[cursor].run(); cursor++; }
    prev = loopT;
    const burning = now < burningUntil;
    audio.fires(() => burning ? [{x: -4, z: -8}] : [], dt, () => true);
    if (burning) {
      fireAcc += dt;
      if (fireAcc > 0.18) {
        fireAcc = 0;
        fx.preview({type: "fire", team: 0, x: -4 + Math.random() * 3, y: 0.15, z: -8 + Math.random() * 3, visual: "flak", dx: 0, dy: 1, dz: 0});
        fx.preview({type: "impact", x: -4 + Math.random() * 2, y: 0.35, z: -8 + Math.random() * 2, weapon: "bullet", visual: "mg", result: "penetration"});
      }
    }
    fx.update(dt);
    const ang = now / 1000 * 0.18;
    camera.position.set(Math.sin(ang) * 26, 11.5, Math.cos(ang) * 26);
    if (shake > 0.02) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake * 0.45; shake *= Math.exp(-5 * dt); }
    camera.lookAt(1, 1.4, 2);
    audio.setListener(camera.position.x, camera.position.z, ang, 26);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

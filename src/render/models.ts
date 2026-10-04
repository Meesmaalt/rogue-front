import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import type { Team, UnitKind } from "../sim/types";
import type { FactionId } from "../sim/factions";
import { vehiclePlatform } from "../data/vehicleRoster";

const BODY = [0x6a7348, 0x5a4538], ACC = [0x5ec4f0, 0xf06040], DARK = 0x2a2e32;
const SAND = 0x9a8f70, CONCRETE = 0x7a7a6e, METAL = 0x555850, SKIN = 0xb09070;
const mat = (c: number, r = 0.75, m = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function box(w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function cyl(rt: number, rb: number, h: number, c: number, x: number, y: number, z: number, segs = 8): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat(c));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function detailBox(w: number, h: number, d: number, c: number, x: number, y: number, z: number, parent: THREE.Object3D, r = 0.72, m = 0.18): void {
  const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, r, m));
  q.position.set(x, y, z);
  q.castShadow = q.receiveShadow = true;
  parent.add(q);
}
function wheel(x: number, z: number, parent: THREE.Object3D, radius = 0.32, color = DARK): void {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.24, 10), mat(color, 0.8, 0.08));
  w.rotation.z = Math.PI / 2; w.position.set(x, radius + 0.16, z);
  w.castShadow = w.receiveShadow = true; parent.add(w);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, 0.26, 8), mat(METAL, 0.5, 0.4));
  hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); parent.add(hub);
}
function trackUnit(parent: THREE.Object3D, side: number, length = 4.8, y = 0.48): void {
  detailBox(0.72, 0.72, length, DARK, side * 1.55, y, 0, parent, 0.95, 0.02);
  for (const z of [-1.75, -0.9, 0, 0.9, 1.75]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10), mat(METAL, 0.8, 0.08));
    w.rotation.z = Math.PI / 2; w.position.set(side * 1.55, y, z); parent.add(w);
  }
}
function antenna(parent: THREE.Object3D, x: number, y: number, z: number, height = 1.4): void {
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, height, 6), mat(DARK, 0.85, 0.05));
  a.position.set(x, y + height / 2, z); parent.add(a);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat(DARK, 0.8, 0.05));
  tip.position.set(x, y + height, z); parent.add(tip);
}
function optic(parent: THREE.Object3D, x: number, y: number, z: number, scale = 1): void {
  detailBox(0.22 * scale, 0.18 * scale, 0.42 * scale, 0x273b45, x, y, z, parent, 0.35, 0.5);
}
function window(parent: THREE.Object3D, x: number, y: number, z: number, w = 0.8, h = 0.55): void {
  detailBox(w, h, 0.06, 0x344a55, x, y, z, parent, 0.25, 0.35);
}
function cargoCrate(parent: THREE.Object3D, x: number, y: number, z: number, c = 0x786b4e): void {
  detailBox(0.8, 0.65, 0.8, c, x, y, z, parent, 0.9, 0.05);
  detailBox(0.06, 0.7, 0.84, DARK, x, y, z, parent, 0.9, 0.05);
}

function barrel(len: number, r: number, y: number, z: number, parent: THREE.Object3D, color = DARK): void {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, len, 8), mat(color, 0.55, 0.4));
  b.rotation.x = Math.PI / 2;
  b.position.set(0, y, z + len * 0.5);
  b.castShadow = true;
  parent.add(b);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 0.9, 0.22, 8), mat(METAL, 0.4, 0.5));
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, y, z + len + 0.05);
  parent.add(tip);
}

export interface Model { group: THREE.Group; turret: THREE.Group | null }

function soldier(parent: THREE.Object3D, x: number, z: number, uniform: number, gear: number, weapon = true): void {
  const torso=new THREE.Group();torso.position.set(x,0,z);parent.add(torso);
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.name=side<0?"LeftLeg":"RightLeg";leg.position.set(side*.12,.78,0);
    leg.add(box(.19,.34,.2,uniform,0,-.17,0),box(.17,.3,.18,uniform,0,-.48,0),box(.21,.13,.32,DARK,0,-.7,.06),box(.2,.14,.07,gear,0,-.36,.09));torso.add(leg);mergeStaticParts(leg);
  }
  const chest=cyl(.23,.18,.5,uniform,0,1.02,0,6);chest.scale.z=.72;torso.add(chest);
  torso.add(box(.43,.37,.09,gear,0,1.05,.17),box(.3,.43,.19,gear,0,1.03,-.21));
  for(const dx of [-.13,0,.13])torso.add(box(.1,.14,.1,0x64664f,dx,.96,.22));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.135,8,6),mat(SKIN,.95,0));head.position.set(0,1.4,0);torso.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.17,8,5,0,Math.PI*2,0,Math.PI*.6),mat(uniform,.95,0));helmet.position.set(0,1.48,0);torso.add(helmet);
  const armLeft=box(.16,.4,.17,uniform,-.27,1.12,.04);armLeft.rotation.z=-.3;torso.add(armLeft);
  const armRight=box(.16,.37,.16,uniform,.27,1.12,.09);armRight.rotation.z=.3;torso.add(armRight);
  torso.add(box(.16,.13,.28,uniform,-.17,.96,.21),box(.14,.14,.22,uniform,.19,.96,.25));
  if(weapon){torso.add(box(.065,.09,.67,DARK,.12,1.04,.4),box(.07,.18,.1,DARK,.12,.94,.39),box(.08,.12,.2,0x51544c,.12,1.04,.05));}
  mergeStaticParts(torso);

}

/** Phase 67: faction-specific vehicle-family detailing. The geometry remains lightweight but each nation gets a recognizable silhouette. */
function addPlatformSignature(g: THREE.Group, faction: FactionId, kind: UnitKind, body: number, acc: number): void {
  const p = vehiclePlatform(faction, kind);
  if (!p) return;
  // Small high-contrast geometry pieces make the platform identity survive RTS camera zoom.
  if (kind === "tank") {
    if (faction === "usa") {
      detailBox(0.48,0.24,1.15,METAL,1.18,1.75,-1.15,g);
      detailBox(0.22,0.32,0.75,0x3b423c,-1.1,1.78,0.55,g);
      detailBox(0.35,0.18,0.55,acc,0,2.75,0.05,g);
    } else if (faction === "russia") {
      for (const x of [-1.15,-0.55,0.55,1.15]) detailBox(0.34,0.22,0.32,0x59604e,x,1.9,-1.25,g,0.9,0.05);
      detailBox(0.28,0.22,0.65,METAL,1.05,1.8,0.65,g);
    } else {
      detailBox(2.2,0.22,0.38,0x59604e,0,1.78,-1.55,g);
      detailBox(0.3,0.28,0.5,0x26302d,-0.9,2.55,0.15,g);
      detailBox(0.35,0.18,0.6,acc,0,2.7,0.2,g);
    }
  } else if (kind === "ifv" || kind === "apc" || kind === "reconVehicle") {
    if (faction === "usa") {
      for (const x of [-1.2,1.2]) detailBox(0.24,0.45,0.72,0x414a43,x,1.48,-1.35,g);
      if (kind === "reconVehicle") detailBox(0.14,1.1,0.14,METAL,-0.55,2.2,-0.8,g);
    } else if (faction === "russia") {
      detailBox(1.7,0.25,0.35,0x4d544b,0,1.72,-1.5,g);
      detailBox(0.35,0.25,0.62,METAL,0.8,1.95,0.3,g);
    } else {
      detailBox(1.8,0.28,0.42,0x555b4d,0,1.75,-1.42,g);
      detailBox(0.5,0.28,0.72,METAL,-0.75,1.92,0.35,g);
    }
  } else if (kind === "artillery") {
    const rear = faction === "usa" ? -1.8 : faction === "russia" ? -1.55 : -1.7;
    detailBox(0.5,0.5,0.7,0x4b5149,-0.8,1.55,rear,g);
    detailBox(0.5,0.5,0.7,0x4b5149,0.8,1.55,rear,g);
  } else if (kind === "mlrs") {
    const pod = faction === "usa" ? 1.55 : 1.35;
    for (const x of [-0.72,-0.24,0.24,0.72]) detailBox(0.18,0.18,1.7,METAL,x,1.85,pod,g);
  } else if (kind === "spaa") {
    if (faction === "russia") { detailBox(1.7,0.22,0.34,0x4b5048,0,2.65,-0.25,g); antenna(g,0,2.6,-0.25,0.9); }
    if (faction === "usa") { for (const x of [-0.7,0.7]) detailBox(0.3,0.3,0.85,acc,x,2.05,-0.1,g); }
    if (faction === "china") { detailBox(0.9,0.5,0.9,METAL,0,2.3,-0.1,g); }
  } else if (kind === "heli") {
    if (faction === "russia") {
      // Coaxial-rotor mast: no tail rotor.
      detailBox(0.22,0.6,0.22,METAL,0,3.25,0.1,g);
      detailBox(4.4,0.06,0.12,DARK,0,3.62,0.1,g);
      detailBox(0.12,0.06,4.4,DARK,0,3.62,0.1,g);
    } else if (faction === "china") {
      detailBox(0.28,0.35,0.6,acc,0,2.45,1.55,g);
      detailBox(3.8,0.1,0.35,body,0,2.35,0.05,g);
    } else {
      detailBox(0.28,0.35,0.6,acc,0,2.42,1.55,g);
      detailBox(0.18,0.2,1.2,METAL,0,2.2,-2.65,g);
    }
  }
}

function addVehicleFamilyDetails(g: THREE.Group, faction: FactionId, kind: UnitKind, _body: number, _acc: number): void {
  if (kind === "tank") {
    if (faction === "usa") {
      detailBox(0.9,0.45,1.4,0x3f463e,1.0,1.65,-1.45,g);
      detailBox(0.75,0.3,0.75,METAL,-0.95,1.75,0.95,g);
      antenna(g,1.05,1.7,-0.85,1.35);
    } else if (faction === "russia") {
      detailBox(0.55,0.28,1.0,0x4d5148,-1.05,1.55,-1.35,g);
      detailBox(0.38,0.22,0.55,0x25292b,0.95,1.85,0.45,g);
      antenna(g,-0.95,1.7,-0.95,1.15);
    } else {
      detailBox(1.05,0.28,0.65,0x4d5148,0.0,1.62,-1.65,g);
      detailBox(0.42,0.24,0.72,METAL,-0.75,1.75,0.7,g);
      antenna(g,0.8,1.7,-1.0,1.25);
    }
  }
  if (kind === "ifv") {
    if (faction === "usa") {
      detailBox(0.42,0.5,1.0,0x3f463e,-0.95,1.55,-1.3,g); detailBox(0.42,0.5,1.0,0x3f463e,0.95,1.55,-1.3,g);
      antenna(g,0.9,1.65,-1.25,1.4);
    } else if (faction === "russia") {
      detailBox(0.65,0.35,1.4,0x4d5148,0,1.7,-1.45,g); detailBox(0.22,0.22,0.7,METAL,-0.7,1.9,0.35,g);
    } else {
      detailBox(0.8,0.35,1.2,0x4d5148,0,1.75,-1.45,g); detailBox(0.55,0.3,0.65,METAL,0.75,1.75,0.25,g);
    }
  }
  if (kind === "apc") {
    if (faction === "usa") {
      for (const sx of [-1,1]) detailBox(0.28,0.35,0.8,0x46504a,sx*1.28,1.55,-1.4,g);
      antenna(g,-0.85,1.8,-1.25,1.35);
    } else if (faction === "russia") {
      detailBox(1.8,0.3,0.55,0x4a4e47,0,1.7,-1.5,g); detailBox(0.35,0.25,0.7,METAL,0.7,1.9,0.5,g);
    } else {
      detailBox(1.6,0.32,0.7,0x4a4e47,0,1.75,-1.35,g); detailBox(0.7,0.28,0.45,METAL,-0.65,1.95,0.35,g);
    }
  }
  if (kind === "reconVehicle") {
    const mast = faction === "usa" ? 2.0 : faction === "russia" ? 1.5 : 1.7;
    antenna(g, faction === "china" ? 0.65 : -0.7, 2.2, -0.8, mast);
    detailBox(0.5,0.28,0.8,0x273b45,0,2.25,-0.2,g,0.35,0.5);
  }
  if (kind === "artillery" || kind === "mlrs") {
    const rear = faction === "usa" ? 1.35 : faction === "russia" ? 1.6 : 1.5;
    cargoCrate(g,-0.75,1.25,-rear,0x5d604d); cargoCrate(g,0.75,1.25,-rear,0x5d604d);
    antenna(g,0.95,1.8,-1.0,1.2);
  }
}

function addInfantrySquadDetail(g: THREE.Group, kind: UnitKind, faction: FactionId, _body: number, acc: number): void {
  const uniform = faction === "usa" ? 0x4d5a46 : faction === "russia" ? 0x59604f : 0x5b5c48;
  const web = faction === "usa" ? 0x3b473b : faction === "russia" ? 0x3f453d : 0x45473c;
  const squad = [[-0.8,-0.55],[-0.28,-0.9],[0.28,-0.82],[0.82,-0.5],[-0.58,0.15],[0.55,0.22]] as const;
  squad.forEach(([x,z], i) => {
    soldier(g,x,z,uniform,i === 2 ? web : 0x454a40,true);
    detailBox(0.26,0.34,0.16,i === 2 ? web : 0x454a40,x,0.78,z-0.2,g);
    if (i === 1 || (kind === "reconInf" && i === 3)) detailBox(0.11,0.12,0.22,0x202525,x+0.12,1.22,z+0.02,g);
  });
  if (kind === "mgInf") detailBox(0.14,0.12,1.7,METAL,0.82,0.78,0.42,g);
  else if (kind === "atInf" || kind === "atgm") { detailBox(0.16,0.16,1.9,METAL,-0.72,1.02,0.35,g); detailBox(0.26,0.22,0.42,acc,-0.72,1.02,1.22,g); }
  else if (kind === "manpad") { detailBox(0.16,0.16,1.65,METAL,0.65,1.35,0.35,g); detailBox(0.28,0.25,0.42,acc,0.65,1.35,1.15,g); }
  else if (kind === "sniper") detailBox(0.08,0.08,2.15,0x262b2b,-0.2,1.02,0.5,g);
  detailBox(0.5,0.18,0.32,0x6e6048,-1.05,0.22,0.55,g); detailBox(0.35,0.22,0.28,0x3d433d,1.0,0.25,0.65,g);
}

function addBaseEnvironment(g: THREE.Group, faction: FactionId, kind: UnitKind): void {
  const sandbag = faction === "usa" ? 0x82775a : faction === "russia" ? 0x746b55 : 0x7b7052;
  const crate = faction === "usa" ? 0x665b43 : faction === "russia" ? 0x5f5a46 : 0x6a5d42;
  const bag = (x:number,z:number,rot=0) => { const b=box(0.55,0.32,0.34,sandbag,x,0.25,z); b.rotation.y=rot; g.add(b); };
  const crateAt = (x:number,z:number,scale=1) => detailBox(0.6*scale,0.45*scale,0.6*scale,crate,x,0.25*scale,z,g,0.9,0.05);
  if (kind === "hq" || kind === "barracks") { for(let i=-2;i<=2;i++){bag(-7+i*0.62,6.7);bag(7+i*0.62,-6.7);} crateAt(-5.8,5.7);crateAt(5.8,-5.7); }
  else if (kind === "factory") { for(let i=0;i<4;i++)crateAt(-5+i,5.9,.9); for(let i=0;i<3;i++)bag(-5.8+i*.55,-5.3); }
  else if (kind === "supply") { for(const x of [-5,-4.1,-3.2,3.2,4.1,5])crateAt(x,3.8,.9); for(const x of [-5.2,-4,-2.8,2.8,4,5.2])bag(x,-3.8); }
  else if (kind === "airbase") { for(const x of [-5.5,-3.8,3.8,5.5])crateAt(x,5.2,.8); detailBox(.16,1,.16,METAL,-7,.75,-4,g);detailBox(.16,1,.16,METAL,7,.75,-4,g); }
  else if (kind === "refinery") { for(const x of [-4.8,-3.9,3.9,4.8])crateAt(x,4,.75); for(let i=0;i<5;i++)detailBox(.22,.5,.22,METAL,-4+i*2,.55,-4.1,g); }
  else if (kind === "radar") { for(const [x,z] of [[-3,2.7],[3,2.7],[-3,-2.7],[3,-2.7]] as const)bag(x,z,.7); crateAt(2.8,2.2,.7); }
}

function addBuildingFactionDetails(g: THREE.Group, faction: FactionId, kind: UnitKind, _body: number, _acc: number): void {
  const trim = faction === "usa" ? 0x596457 : faction === "russia" ? 0x625d4e : 0x6b6248;
  if (kind === "factory") {
    detailBox(2.8,0.18,0.55,trim,0,5.2,-5.25,g);
    detailBox(0.65,2.8,0.65,METAL,faction === "usa" ? -4.8 : 4.8,4.2,-3.2,g);
  } else if (kind === "supply") {
    for (const x of [-2.8,-1.4,1.4,2.8]) cargoCrate(g,x,1.05,3.65,trim);
    antenna(g, faction === "russia" ? -3.8 : 3.8,2.0,-2.5,1.1);
  } else if (kind === "airbase") {
    detailBox(1.4,0.16,8.5,trim,0,0.48,0,g);
    for (const x of [-4.2,4.2]) detailBox(0.35,2.0,0.35,METAL,x,1.2,-4.0,g);
  } else if (kind === "hq") {
    detailBox(4.8,0.35,0.7,trim,0,8.0,-0.6,g);
    detailBox(0.5,1.8,0.5,METAL,faction === "china" ? -5.0 : 5.0,3.0,3.8,g);
  } else if (kind === "barracks") {
    for (const x of [-3.5,0,3.5]) detailBox(0.9,0.16,0.65,trim,x,3.05,-3.7,g);
  } else if (kind === "radar") {
    detailBox(2.8,0.18,0.6,trim,0,2.55,0,g);
  } else if (kind === "refinery") {
    detailBox(0.5,0.8,3.8,trim,0,3.0,-4.0,g);
  }
}

/** Detailed procedural military models – readable silhouettes at RTS scale. */
export function createModel(kind: UnitKind, team: Team, faction: FactionId = team === 0 ? "usa" : "russia"): Model {
  const g = new THREE.Group();
  let turret: THREE.Group | null = null;
  const body = BODY[team], acc = ACC[team];

  // New unit families use deliberately distinct silhouettes so tactical roles remain readable even before bespoke GLB art.
  const infantryKinds = new Set(["inf","atInf","mgInf","reconInf","sniper","manpad","atgm","engineer","combatEngineer"]);
  if (infantryKinds.has(kind)) {
    // Phase 74: render a complete squad. The renderer hides individual members as casualties occur.
    const role = kind === "sniper" ? "sniper" : kind === "reconInf" ? "recon" : kind === "mgInf" ? "mg" : kind === "manpad" ? "manpad" : kind === "atInf" || kind === "atgm" ? "at" : kind.includes("Engineer") || kind.includes("engineer") ? "engineer" : "rifle";
    const uniform = role === "recon" || role === "sniper" ? 0x46523e : role === "engineer" ? 0x68563d : role === "at" ? 0x5a4a38 : faction==="usa"?0x737a58:faction==="russia"?0x586744:0x6c7350;
    const formation: Array<[number,number]> = [[-1.15,-1.0],[0,-1.15],[1.15,-1.0],[-1.5,0],[0,0],[1.5,0],[-0.95,1.15],[0.95,1.15]];
    formation.forEach(([x,z], i) => {
      const member = new THREE.Group(); member.name = `SquadMember${i}`;
      const gear = role === "mg" ? DARK : role === "engineer" ? 0x806744 : uniform;
      soldier(member, 0, 0, uniform, gear, true); member.position.set(x, 0, z);
      if (role === "mg" && i === 0) { detailBox(0.12,0.12,1.5,DARK,0.28,0.72,0.5,member); detailBox(0.16,0.16,0.55,METAL,0.28,0.65,1.2,member); }
      if (role === "sniper" && i < 4) detailBox(0.08,0.08,1.75,DARK,0.26,0.72,0.55,member);
      if (role === "at" && i < 3) { detailBox(0.16,0.16,1.35,METAL,-0.28,0.9,0.55,member); detailBox(0.26,0.22,0.4,0x3f3328,0,0.82,-0.15,member); }
      if (role === "manpad" && i < 2) detailBox(0.18,0.18,1.4,METAL,-0.28,1.0,0.45,member);
      if (role === "engineer" && i < 3) detailBox(0.26,0.12,0.48,METAL,0.24,0.76,-0.18,member);
      g.add(member);
    });
    return { group:g, turret:null };
  }
  if (["reconVehicle","lightTank","tankDestroyer","spaa"].includes(kind)) {
    const hullColor = kind === "reconVehicle" ? 0x66705a : kind === "lightTank" ? 0x6f7650 : body;
    if (kind === "reconVehicle") {
      for (const side of [-1, 1]) for (const z of [-1.55, -0.5, 0.6, 1.65]) wheel(side * 1.28, z, g, 0.42);
      g.add(box(2.55, 1.0, 4.2, hullColor, 0, 1.0, 0));
      g.add(box(2.15, 0.8, 2.1, SAND, 0, 1.75, 0.35));
      detailBox(1.9, 0.45, 1.1, DARK, 0, 2.28, -0.4, g);
      turret = new THREE.Group(); turret.position.y = 2.15;
      turret.add(box(1.05, 0.38, 1.25, hullColor, 0, 0.2, 0));
      barrel(2.0, 0.07, 0.3, 0.65, turret); optic(turret, 0.32, 0.55, 0.2); antenna(g, -0.8, 2.2, -1.2, 1.6);
      g.add(turret);
    } else if (kind === "lightTank") {
      trackUnit(g, -1, 4.6); trackUnit(g, 1, 4.6);
      g.add(box(2.9, 0.95, 4.2, hullColor, 0, 1.05, 0));
      g.add(box(2.6, 0.3, 3.7, SAND, 0, 1.55, 0.1));
      turret = new THREE.Group(); turret.position.y = 1.8;
      turret.add(box(2.0, 0.65, 2.0, hullColor, 0, 0.35, 0));
      barrel(3.5, 0.11, 0.45, 0.8, turret); optic(turret, -0.55, 0.95, 0.35); antenna(turret, 0.7, 0.6, -0.5, 1.1);
      g.add(turret);
    } else if (kind === "tankDestroyer") {
      trackUnit(g, -1, 5.0); trackUnit(g, 1, 5.0);
      g.add(box(3.0, 0.95, 4.5, hullColor, 0, 1.0, 0));
      g.add(box(2.5, 1.0, 2.6, hullColor, 0, 1.7, -0.65));
      turret = new THREE.Group(); turret.position.y = 2.05;
      turret.add(box(1.7, 0.45, 1.6, hullColor, 0, 0.25, 0));
      barrel(4.7, 0.14, 0.35, 0.9, turret, 0x202326); optic(turret, -0.5, 0.65, 0.2);
      g.add(turret); antenna(g, 0.9, 2.0, -1.4, 1.3);
    } else {
      trackUnit(g, -1, 4.5); trackUnit(g, 1, 4.5);
      g.add(box(2.8, 0.95, 4.3, hullColor, 0, 1.0, 0));
      turret = new THREE.Group(); turret.position.y = 1.75;
      turret.add(box(1.8, 0.5, 1.7, hullColor, 0, 0.3, 0));
      for (const sx of [-0.38, 0.38]) { barrel(2.4, 0.08, 0.62, 0.75, turret); detailBox(0.16,0.18,0.55,METAL,sx,0.8,0.15,turret); }
      detailBox(0.65,0.5,0.7,METAL,0,0.9,-0.15,turret); antenna(g, -1.0, 1.8, -1.3, 1.5);
      g.add(turret);
    }
    addPlatformSignature(g, faction, kind, body, acc);
    return {group:g,turret};
  }
  if (["casHeli","ecm","multirole","attackAircraft"].includes(kind)) {
    const isJet = kind === "attackAircraft" || kind === "multirole";
    if (!isJet) {
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 2.8, 6, 10), mat(body,0.68,0.18));
      fus.rotation.x=Math.PI/2; fus.position.y=2.75; g.add(fus);
      g.add(box(0.7,0.45,0.75,0x38515d,0,2.98,1.35));
      g.add(box(5.0,0.12,0.55,body,0,2.55,0.05));
      g.add(box(0.18,0.3,2.7,DARK,0,2.72,-2.0));
      g.add(box(0.14,0.9,0.5,body,0,3.15,-3.2));
      g.add(box(1.0,0.08,0.4,body,0,3.35,-3.05));
      for (const x of [-1.7,1.7]) cargoCrate(g,x,2.45,0.25,0x4f5c4d);
      if (kind === "casHeli") { turret=new THREE.Group(); turret.position.set(0,2.15,1.25); turret.add(box(0.48,0.24,0.7,acc,0,0,0)); barrel(1.4,0.07,0,0.35,turret); g.add(turret); }
      antenna(g,-0.35,3.0,-1.0,0.9);
    } else {
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 4.0, 5, 8), mat(0x66717a,0.48,0.35));
      fus.rotation.x=Math.PI/2; fus.position.y=3.8; g.add(fus);
      g.add(box(6.8,0.12,1.35,0x5c6871,0,3.65,0.15));
      g.add(box(0.08,1.2,1.5,0x5c6871,0,4.55,-2.2));
      g.add(box(0.6,0.45,0.65,0x344c59,0,4.15,1.05));
      g.add(box(0.45,0.32,0.9,METAL,0,3.25,0.65));
      for (const x of [-2.4,2.4]) { detailBox(0.16,0.18,0.9,DARK,x,3.55,0.4,g); }
      if (kind === "attackAircraft") { detailBox(1.4,0.22,0.7,0x7b7d73,0,4.0,-0.2,g); antenna(g,0.55,4.0,-1.3,0.8); }
      if (kind === "multirole") { detailBox(0.2,0.25,1.2,DARK,-2.0,3.55,0.2,g); detailBox(0.2,0.25,1.2,DARK,2.0,3.55,0.2,g); }
    }
    return {group:g,turret};
  }
  if (["frigate","missileBoat"].includes(kind)) {
    g.add(box(kind === "frigate" ? 3.2 : 2.1,0.8,8.0,body,0,0.8,0));
    g.add(box(kind === "frigate" ? 2.4 : 1.5,1.0,3.2,SAND,0,1.5,-1.0));
    turret = new THREE.Group(); turret.position.y=1.9; turret.add(box(1.2,0.35,1.5,acc,0,0.15,1.1)); barrel(2.0,0.1,0.35,1.3,turret); g.add(turret);
    return {group:g,turret};
  }

  switch (kind) {
    case "tank": {
      // M1A2 Abrams silhouette – flat hull, angular turret, rear bustle, long 120mm
      g.add(box(0.8, 0.9, 5.3, DARK, -1.85, 0.55, 0));
      g.add(box(0.8, 0.9, 5.3, DARK, 1.85, 0.55, 0));
      for (const side of [-1.85, 1.85]) {
        for (const z of [-1.8, -0.6, 0.5, 1.6]) g.add(cyl(0.3, 0.3, 0.22, METAL, side, 0.32, z, 6));
      }
      g.add(box(3.0, 0.9, 4.8, body, 0, 1.2, 0));
      g.add(box(3.5, 0.28, 4.5, SAND, 0, 0.9, 0));
      g.add(box(2.8, 0.5, 1.4, body, 0, 1.55, 1.95)); // glacis
      g.add(box(2.6, 0.4, 1.1, SAND, 0, 1.5, -2.1));
      turret = new THREE.Group();
      turret.position.y = 1.95;
      turret.add(box(2.7, 0.95, 3.0, body, 0, 0.5, 0.05)); // angular turret
      turret.add(box(2.0, 0.55, 1.4, body, 0, 0.55, -1.5)); // rear bustle
      turret.add(box(1.5, 0.35, 1.2, SAND, 0, 1.1, -0.1));
      turret.add(cyl(0.32, 0.32, 0.22, METAL, 0.6, 1.15, 0.2, 8));
      turret.add(box(0.45, 0.14, 0.7, acc, -0.7, 1.1, 0.8));
      barrel(4.8, 0.16, 0.45, 1.3, turret); // long 120mm
      optic(turret, -0.65, 1.15, 0.55);
      antenna(g, -1.0, 1.7, -1.5, 1.6);
      detailBox(0.5,0.45,0.9,0x4b5047,1.05,1.6,-1.7,g);
      g.add(turret);
      addVehicleFamilyDetails(g, faction, kind, body, acc);
      addPlatformSignature(g, faction, kind, body, acc);
      break;
    }
    case "artillery": {
      // M109 Paladin – boxy SPG hull, large elevated howitzer
      g.add(box(0.7, 0.75, 4.8, DARK, -1.8, 0.5, 0));
      g.add(box(0.7, 0.75, 4.8, DARK, 1.8, 0.5, 0));
      g.add(box(3.0, 1.15, 4.4, body, 0, 1.1, 0));
      g.add(box(2.6, 0.4, 1.6, SAND, 0, 1.75, -1.4));
      g.add(box(1.2, 0.6, 0.9, METAL, 0, 1.5, 2.0)); // front cab
      turret = new THREE.Group();
      turret.position.y = 1.75;
      turret.add(box(2.2, 1.1, 2.4, body, 0, 0.6, -0.3)); // casemate
      turret.add(box(1.4, 0.5, 1.0, SAND, 0, 1.25, -0.2));
      const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6.2, 8), mat(DARK, 0.5, 0.45));
      gun.rotation.x = Math.PI / 2 - 0.35; // elevated
      gun.position.set(0, 1.0, 2.6);
      turret.add(gun);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.4, 8), mat(METAL, 0.4, 0.5));
      muzzle.rotation.x = Math.PI / 2 - 0.35;
      muzzle.position.set(0, 1.35, 5.5);
      turret.add(muzzle);
      g.add(turret);
      addVehicleFamilyDetails(g, faction, kind, body, acc);
      addPlatformSignature(g, faction, kind, body, acc);
      break;
    }
    case "aa": {
      g.add(box(0.6, 0.55, 4.2, DARK, -1.55, 0.4, 0));
      g.add(box(0.6, 0.55, 4.2, DARK, 1.55, 0.4, 0));
      g.add(box(2.8, 0.9, 3.6, body, 0, 0.85, 0));
      turret = new THREE.Group();
      turret.position.y = 1.45;
      turret.add(box(1.9, 0.55, 1.9, body, 0, 0.3, 0));
      turret.add(box(0.8, 0.7, 0.8, METAL, 0, 0.85, 0));
      for (const sx of [-0.28, 0.28]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 6), mat(DARK, 0.5, 0.4));
        b.rotation.x = Math.PI / 2;
        b.position.set(sx, 0.7, 1.5);
        turret.add(b);
      }
      g.add(turret);
      addPlatformSignature(g, faction, kind, body, acc);
      break;
    }
    case "inf": {
      // A squad silhouette: six soldiers with rifles, packs and one support weapon.
      const positions = [[-0.65,-0.35],[-0.2,-0.75],[0.25,-0.55],[0.7,-0.25],[-0.45,0.35],[0.35,0.45]] as const;
      positions.forEach(([x,z],i) => soldier(g,x,z,body,i===2?0x5c584b:SAND,i!==2));
      detailBox(0.16,0.18,0.85,METAL,0.72,0.78,0.18,g);
      addInfantrySquadDetail(g, kind, faction, body, acc);
      break;
    }
    case "engineer": {
      const positions = [[-0.55,-0.25],[0.55,-0.2],[-0.35,0.45],[0.35,0.5]] as const;
      positions.forEach(([x,z]) => soldier(g,x,z,0x6d6655,0x343a35,false));
      detailBox(0.12,0.7,0.12,METAL,-0.75,0.72,0.25,g);
      detailBox(0.55,0.08,0.08,0xd0a030,0.0,0.95,-0.1,g);
      detailBox(0.8,0.18,0.4,0x7b6a45,0,0.8,-0.55,g);
      addInfantrySquadDetail(g, kind, faction, body, acc);
      break;
    }
    case "special": {
      const positions = [[-0.55,-0.3],[0.55,-0.25],[-0.3,0.45],[0.35,0.5]] as const;
      positions.forEach(([x,z]) => soldier(g,x,z,0x30383a,0x252a2c,true));
      detailBox(0.34,0.55,0.22,0x252a2c,-0.55,0.72,-0.35,g);
      antenna(g,0.55,0.95,-0.25,0.7);
      addInfantrySquadDetail(g, kind, faction, body, acc);
      break;
    }
    case "heli": {
      // AH-64 Apache – tandem cockpit, stub wings with hardpoints, nose TADS/gun
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.6, 6, 10), mat(body, 0.72, 0.14));
      fus.rotation.x = Math.PI / 2;
      fus.position.y = 2.35;
      g.add(fus);
      // Tandem canopies
      g.add(box(0.7, 0.5, 0.55, 0x3a5060, 0, 2.55, 1.7));
      g.add(box(0.7, 0.5, 0.55, 0x3a5060, 0, 2.55, 1.0));
      g.add(box(0.25, 0.25, 3.2, DARK, 0, 2.45, -2.4));
      g.add(box(0.12, 1.1, 0.55, body, 0, 3.05, -3.7));
      g.add(box(1.3, 0.1, 0.4, body, 0, 2.6, -3.5));
      // Stub wings + Hellfire rails
      g.add(box(4.2, 0.12, 0.55, body, 0, 2.25, 0.2));
      g.add(box(0.2, 0.35, 1.1, DARK, -1.8, 2.0, 0.2));
      g.add(box(0.2, 0.35, 1.1, DARK, 1.8, 2.0, 0.2));
      g.add(box(0.15, 0.15, 0.9, METAL, -1.8, 1.85, 0.5));
      g.add(box(0.15, 0.15, 0.9, METAL, 1.8, 1.85, 0.5));
      // Skids
      g.add(box(0.1, 0.1, 2.6, METAL, -0.65, 1.45, 0.15));
      g.add(box(0.1, 0.1, 2.6, METAL, 0.65, 1.45, 0.15));
      g.add(cyl(0.18, 0.22, 0.3, DARK, 0, 3.4, 0.1, 8));
      g.add(box(5.6, 0.05, 0.18, DARK, 0, 3.55, 0.1));
      g.add(box(0.18, 0.05, 5.6, DARK, 0, 3.55, 0.1));
      // 30mm chain gun
      turret = new THREE.Group();
      turret.position.set(0, 1.95, 1.35);
      turret.add(box(0.55, 0.28, 0.8, acc, 0, 0, 0));
      barrel(1.6, 0.07, 0, 0.35, turret);
      g.add(turret);
      addPlatformSignature(g, faction, kind, body, acc);
      break;
    }
    case "gunship": {
      // AH-1Z Viper – slim tandem, high-mounted stub wings, chin gun
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 2.9, 6, 10), mat(body, 0.7, 0.15));
      fus.rotation.x = Math.PI / 2;
      fus.position.y = 2.45;
      g.add(fus);
      g.add(box(0.6, 0.45, 0.5, 0x3a5060, 0, 2.6, 1.75));
      g.add(box(0.6, 0.45, 0.5, 0x3a5060, 0, 2.6, 1.1));
      g.add(box(5.0, 0.12, 0.6, body, 0, 2.55, 0.15)); // high wings
      g.add(box(0.22, 0.3, 1.0, DARK, -2.2, 2.35, 0.15));
      g.add(box(0.22, 0.3, 1.0, DARK, 2.2, 2.35, 0.15));
      g.add(box(0.2, 0.25, 3.0, DARK, 0, 2.5, -2.3));
      g.add(box(0.12, 1.0, 0.5, body, 0, 3.1, -3.5));
      g.add(box(1.2, 0.1, 0.4, body, 0, 2.65, -3.3));
      g.add(cyl(0.16, 0.2, 0.28, DARK, 0, 3.45, 0.15, 8));
      g.add(box(5.2, 0.05, 0.16, DARK, 0, 3.58, 0.15));
      g.add(box(0.16, 0.05, 5.2, DARK, 0, 3.58, 0.15));
      // Skids
      g.add(box(0.1, 0.1, 2.4, METAL, -0.55, 1.5, 0.2));
      g.add(box(0.1, 0.1, 2.4, METAL, 0.55, 1.5, 0.2));
      turret = new THREE.Group();
      turret.position.set(0, 2.0, 1.4);
      turret.add(box(0.5, 0.25, 0.7, acc, 0, 0, 0));
      barrel(1.8, 0.07, 0, 0.3, turret);
      g.add(turret);
      break;
    }
    case "logiTruck": {
      // MTVR-style heavy logistics truck: visually distinct from the Chinook.
      g.add(box(2.0, 0.75, 4.8, DARK, -0.95, 0.48, 0));
      g.add(box(2.0, 0.75, 4.8, DARK, 0.95, 0.48, 0));
      g.add(box(3.2, 1.0, 3.2, body, 0, 1.0, -0.45));
      g.add(box(2.7, 1.0, 1.7, SAND, 0, 1.0, 1.35));
      g.add(box(2.5, 1.25, 1.5, body, 0, 1.35, 1.35));
      g.add(box(2.8, 0.65, 2.0, acc, 0, 1.65, -1.05));
      for (const x of [-1.05, 1.05]) for (const z of [-1.55, 0, 1.55]) g.add(cyl(0.36,0.36,0.28,DARK,x,0.38,z,8));
      break;
    }
    case "transport": {
      // CH-47 Chinook – tandem rotors, fat cargo body
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 4.0, 6, 10), mat(body, 0.75, 0.1));
      fus.rotation.x = Math.PI / 2;
      fus.position.y = 2.5;
      g.add(fus);
      g.add(box(1.3, 0.65, 0.9, 0x4a6070, 0, 2.7, 2.4));
      // Rear ramp hint
      g.add(box(1.6, 0.2, 1.0, SAND, 0, 1.9, -2.6));
      // Twin rotor hubs (fore + aft)
      g.add(cyl(0.25, 0.3, 0.4, DARK, 0, 3.7, 1.6, 8));
      g.add(box(6.0, 0.06, 0.2, DARK, 0, 3.9, 1.6));
      g.add(box(0.2, 0.06, 6.0, DARK, 0, 3.9, 1.6));
      g.add(cyl(0.25, 0.3, 0.4, DARK, 0, 3.7, -1.8, 8));
      g.add(box(6.0, 0.06, 0.2, DARK, 0, 3.9, -1.8));
      g.add(box(0.2, 0.06, 6.0, DARK, 0, 3.9, -1.8));
      // Landing gear
      g.add(cyl(0.28, 0.28, 0.22, DARK, -1.1, 1.4, 1.5, 8));
      g.add(cyl(0.28, 0.28, 0.22, DARK, 1.1, 1.4, 1.5, 8));
      g.add(cyl(0.28, 0.28, 0.22, DARK, -1.1, 1.4, -1.5, 8));
      g.add(cyl(0.28, 0.28, 0.22, DARK, 1.1, 1.4, -1.5, 8));
      break;
    }
    case "fighter": {
      // F-16 – single engine, blended wing body, bubble canopy
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 4.2, 5, 8), mat(0x7a8a9a, 0.5, 0.35));
      fus.rotation.x = Math.PI / 2;
      fus.position.y = 3.7;
      g.add(fus);
      // Bubble canopy
      g.add(cyl(0.35, 0.4, 0.7, 0x3a6080, 0, 4.15, 1.1, 8));
      // Cropped delta wings
      g.add(box(7.2, 0.1, 1.5, 0x6a7a8a, 0, 3.6, 0.1));
      // Single vertical tail
      g.add(box(0.12, 1.3, 1.8, 0x6a7a8a, 0, 4.5, -2.2));
      // Intake under nose
      g.add(box(0.55, 0.4, 1.2, METAL, 0, 3.3, 0.8));
      // Single exhaust
      g.add(cyl(0.32, 0.38, 0.9, METAL, 0, 3.55, -2.6, 8));
      // Wingtip rails
      g.add(box(0.12, 0.12, 0.8, DARK, -3.5, 3.55, 0.3));
      g.add(box(0.12, 0.12, 0.8, DARK, 3.5, 3.55, 0.3));
      break;
    }
    case "destroyer": {
      g.add(box(3.4, 1.3, 13, 0x4a5250, 0, 0.85, 0));
      g.add(box(2.6, 0.9, 4.5, 0x5a6258, 0, 1.9, -1.5));
      g.add(box(1.8, 1.0, 2.2, body, 0, 2.7, -0.5));
      g.add(box(1.6, 0.8, 1.4, SAND, 0, 3.4, -0.3));
      g.add(box(0.3, 1.8, 0.3, DARK, 0, 4.5, -0.3));
      turret = new THREE.Group();
      turret.position.set(0, 1.9, 3.5);
      turret.add(box(1.3, 0.6, 1.5, body, 0, 0.35, 0));
      barrel(2.6, 0.12, 0.4, 0.6, turret);
      g.add(turret);
      g.add(box(1.2, 0.7, 1.5, METAL, 0, 2.0, -4.5));
      break;
    }
    case "submarine": {
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.9, 7.5, 6, 12), mat(0x343c3b, 0.7, 0.15));
      hull.rotation.x = Math.PI / 2;
      hull.position.y = 1.1;
      g.add(hull);
      g.add(box(1.0, 1.4, 2.2, body, 0, 2.6, 0.3));
      g.add(box(0.25, 1.2, 0.25, DARK, 0, 3.5, 0.8));
      g.add(box(0.15, 0.8, 0.15, METAL, 0.3, 3.3, -0.2));
      break;
    }
    case "landingcraft": {
      g.add(box(5.2, 1.1, 7.5, 0x565b56, 0, 0.75, 0));
      g.add(box(3.6, 1.2, 3.5, body, 0, 1.7, -0.8));
      g.add(box(4.0, 0.25, 1.5, METAL, 0, 0.7, 3.6));
      g.add(box(0.8, 0.9, 0.8, DARK, -1.5, 1.5, -2.5));
      g.add(box(0.8, 0.9, 0.8, DARK, 1.5, 1.5, -2.5));
      break;
    }
    case "apc": {
      // 8x8 wheeled APC
      g.add(box(2.6, 1.1, 5.0, body, 0, 1.2, 0));
      for (const side of [-1.3, 1.3]) for (const z of [-1.5, -0.4, 0.7, 1.7]) g.add(cyl(0.35, 0.35, 0.25, DARK, side, 0.4, z, 8));
      g.add(box(2.2, 0.7, 2.0, SAND, 0, 2.0, -0.3));
      turret = new THREE.Group(); turret.position.y = 2.2;
      turret.add(box(1.2, 0.5, 1.2, body, 0, 0.3, 0));
      barrel(1.6, 0.08, 0.25, 0.5, turret);
      g.add(turret);
      addVehicleFamilyDetails(g, faction, kind, body, acc);
      break;
    }
    case "ifv": {
      // Tracked IFV with autocannon
      g.add(box(0.65, 0.75, 4.8, DARK, -1.55, 0.5, 0));
      g.add(box(0.65, 0.75, 4.8, DARK, 1.55, 0.5, 0));
      g.add(box(2.7, 1.0, 4.6, body, 0, 1.15, 0));
      g.add(box(2.3, 0.35, 1.2, SAND, 0, 1.55, 1.8));
      turret = new THREE.Group(); turret.position.y = 1.85;
      turret.add(box(1.8, 0.7, 2.0, body, 0, 0.4, 0));
      barrel(2.8, 0.1, 0.35, 0.9, turret);
      optic(turret, -0.4, 0.8, 0.3);
      antenna(g, 0.9, 1.8, -1.3, 1.2);
      g.add(turret);
      addVehicleFamilyDetails(g, faction, kind, body, acc);
      break;
    }
    case "mlrs": {
      // Box launcher on truck/chassis
      g.add(box(0.7, 0.7, 4.6, DARK, -1.5, 0.45, 0));
      g.add(box(0.7, 0.7, 4.6, DARK, 1.5, 0.45, 0));
      g.add(box(2.6, 0.9, 4.4, body, 0, 1.05, 0));
      g.add(box(1.4, 0.8, 1.2, SAND, 0, 1.5, 1.6)); // cab
      turret = new THREE.Group(); turret.position.set(0, 1.7, -0.6);
      turret.add(box(2.0, 1.2, 2.8, METAL, 0, 0.7, 0)); // rocket pod
      for (const z of [-0.6, 0, 0.6]) for (const y of [0.4, 0.9]) {
        turret.add(cyl(0.12, 0.12, 2.2, DARK, -0.5, y, z, 6));
        turret.add(cyl(0.12, 0.12, 2.2, DARK, 0.5, y, z, 6));
      }
      g.add(turret);
      addVehicleFamilyDetails(g, faction, kind, body, acc);
      break;
    }
    case "interceptor": {
      // Twin-fin stealthy interceptor
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 4.5, 5, 8), mat(0x5a6570, 0.45, 0.4));
      fus.rotation.x = Math.PI / 2; fus.position.y = 3.9; g.add(fus);
      g.add(box(7.5, 0.1, 1.4, 0x4a5560, 0, 3.75, 0));
      g.add(box(0.1, 1.1, 1.5, 0x4a5560, -0.5, 4.6, -2.2));
      g.add(box(0.1, 1.1, 1.5, 0x4a5560, 0.5, 4.6, -2.2));
      g.add(cyl(0.25, 0.32, 1.0, METAL, -0.7, 3.6, -2.4, 8));
      g.add(cyl(0.25, 0.32, 1.0, METAL, 0.7, 3.6, -2.4, 8));
      g.add(box(0.5, 0.3, 0.7, acc, 0, 3.9, 2.3));
      break;
    }
    case "bomber": {
      // Heavy bomber – wide wings, fat fuselage
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 5.5, 5, 8), mat(0x5a6068, 0.55, 0.25));
      fus.rotation.x = Math.PI / 2; fus.position.y = 3.6; g.add(fus);
      g.add(box(10, 0.12, 2.2, 0x4a5058, 0, 3.5, 0));
      g.add(box(0.15, 1.4, 2.0, 0x4a5058, 0, 4.5, -2.8));
      g.add(box(3.5, 0.1, 0.9, 0x4a5058, 0, 3.7, -3.0));
      g.add(cyl(0.3, 0.35, 1.3, METAL, -2.5, 3.3, 0.5, 8));
      g.add(cyl(0.3, 0.35, 1.3, METAL, 2.5, 3.3, 0.5, 8));
      g.add(cyl(0.3, 0.35, 1.3, METAL, -1.2, 3.3, -0.8, 8));
      g.add(cyl(0.3, 0.35, 1.3, METAL, 1.2, 3.3, -0.8, 8));
      break;
    }
    case "hq": {
      g.add(box(18, 0.35, 16, CONCRETE, 0, 0.15, 0));
      g.add(box(14, 2.4, 12, SAND, 0, 1.35, 0));
      g.add(box(10, 3.2, 9, body, 0, 4.1, -0.4));
      g.add(box(5.5, 2.0, 5.5, SAND, 0, 6.7, -0.6));
      g.add(box(3.5, 0.4, 3.5, acc, 0, 7.85, -0.6));
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8, 6), mat(DARK));
      ant.position.set(4.2, 10.2, 3.2); ant.castShadow = true; g.add(ant);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(acc, 0.5, 0.35));
      dish.position.set(4.2, 12.5, 3.2); dish.rotation.x = -0.55; g.add(dish);
      g.add(box(4.5, 2.2, 3.8, SAND, -7.2, 1.3, 3.5));
      g.add(box(3.2, 1.8, 3.2, body, 6.8, 1.2, -3.2));
      window(g,-3.2,2.0,6.03,1.2,0.8); window(g,0,2.0,6.03,1.2,0.8); window(g,3.2,2.0,6.03,1.2,0.8);
      antenna(g,5.0,8.0,3.5,3.0);
      for (const [sx, sz] of [[-5, 6], [5, 6], [-6, -5], [6, -5]] as const) {
        g.add(box(2.2, 0.9, 1.2, 0xb0a078, sx, 0.55, sz));
      }
      g.add(box(3.2, 0.35, 2.2, CONCRETE, 0, 0.4, 7.2));
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "barracks": {
      g.add(box(12, 0.28, 9, CONCRETE, 0, 0.14, 0));
      g.add(box(10, 2.6, 7.2, SAND, 0, 1.4, 0));
      addPitchedRoof(g,10.5,7.7,2.75,0x717a68);
      g.add(box(3.2, 1.3, 2.4, acc, -2.5, 3.6, 0));
      g.add(box(1.5, 2.0, 0.28, DARK, 0, 1.15, 3.7));
      g.add(box(1.1, 0.85, 0.15, 0x3a4550, -3.0, 1.7, 3.65));
      g.add(box(1.1, 0.85, 0.15, 0x3a4550, 3.0, 1.7, 3.65));
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "factory": {
      g.add(box(13, 0.3, 11, CONCRETE, 0, 0.15, 0));
      g.add(box(12, 3.5, 10, 0x5a5a55, 0, 1.9, 0));
      addPitchedRoof(g,12.6,10.6,3.7,0x788173);
      for(const dx of [-4,-2,0,2,4])detailBox(.11,.1,10.7,0xaaa994,dx,4.1,0,g);
      g.add(box(1.4, 5.5, 1.4, DARK, 3.5, 5.5, 2.5));
      g.add(box(1.1, 0.4, 1.1, 0x444440, 3.5, 8.4, 2.5));
      g.add(box(4.5, 2.8, 0.3, 0x3a3a38, 0, 1.5, 5.1));
      g.add(box(2, 1.2, 1.5, DARK, -4, 4.2, 3.5));
      window(g,-3.2,2.0,5.03,1.1,0.7); window(g,0,2.0,5.03,1.1,0.7); window(g,3.2,2.0,5.03,1.1,0.7);
      for (const x of [-4.5,-1.5,1.5,4.5]) detailBox(0.18,2.4,0.18,0x4b4d49,x,4.8,-3.8,g);
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "helipad": {
      g.add(box(12, 0.35, 12, 0x6a7068, 0, 0.18, 0));
      g.add(box(9, 0.12, 9, 0x5a6058, 0, 0.4, 0));
      g.add(box(0.7, 0.08, 3.2, 0xf0e8c0, 0, 0.48, 0));
      g.add(box(2.4, 0.08, 0.7, 0xf0e8c0, 0, 0.48, 0));
      g.add(box(3.5, 2.2, 3, 0x5c5a4e, 5.5, 1.2, -5));
      g.add(box(2.5, 0.25, 2.2, acc, 5.5, 2.4, -5));
      for (const x of [-2.5,0,2.5]) detailBox(0.25,0.8,0.25,METAL,x,2.0,-5.0,g);
      break;
    }
    case "refinery": {
      g.add(box(10, 0.3, 9, CONCRETE, 0, 0.15, 0));
      g.add(box(9, 2.8, 8, 0x6b624e, 0, 1.55, 0));
      const tankGeo = new THREE.CylinderGeometry(1.6, 1.6, 4.5, 10);
      for (const [tx, tz] of [[-2.5, 1.5], [2.5, 1.5]] as const) {
        const t = new THREE.Mesh(tankGeo, mat(0x4a5048, 0.7, 0.2));
        t.position.set(tx, 3.7, tz); t.castShadow = true; g.add(t);
      }
      g.add(box(2, 1.5, 2, DARK, 0, 2.5, -3));
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "airbase": {
      g.add(box(16, 0.3, 14, 0x5a6058, 0, 0.15, 0));
      g.add(box(12, 0.12, 3.5, 0x8a8878, 0, 0.32, 0));
      g.add(box(0.4, 0.1, 2.8, 0xf0e8c0, 0, 0.38, 0));
      g.add(box(9, 3.5, 6, 0x5c5a50, 0, 1.85, -4.5));
      g.add(box(8, 0.4, 5.5, 0x6a6858, 0, 3.8, -4.5));
      g.add(box(2.8, 5.5, 2.8, body, 5.5, 2.9, 4));
      g.add(box(3.2, 0.9, 3.2, acc, 5.5, 5.9, 4));
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "supply": {
      g.add(box(10, 0.28, 8, CONCRETE, 0, 0.14, 0));
      g.add(box(8, 2.8, 6.2, SAND, 0, 1.5, 0));
      addPitchedRoof(g,8.5,6.7,2.95,0x7b826c);
      g.add(box(1.5, 2.0, 0.3, DARK, 0, 1.15, 3.2));
      g.add(box(1.5, 1.3, 1.5, 0x8a7a50, 4.4, 0.75, 2.4));
      g.add(box(1.3, 1.1, 1.3, 0x7a6a48, 4.4, 1.9, 2.4));
      g.add(box(1.5, 1.3, 1.5, 0x8a7a50, -4.4, 0.75, 2.0));
      g.add(box(1.2, 1.0, 1.2, 0x7a6a48, -4.4, 1.75, 2.0));
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "generator": {
      g.add(box(8, 0.3, 8, CONCRETE, 0, 0.15, 0));
      g.add(box(6.5, 2.6, 6.5, SAND, 0, 1.45, 0));
      g.add(box(4.2, 1.6, 4.2, body, 0, 3.5, 0));
      for (const x of [-1.7, 1.7]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 3.4, 8), mat(METAL));
        stack.position.set(x, 5.1, 0); stack.castShadow = true; g.add(stack);
        g.add(box(0.7, 0.25, 0.7, DARK, x, 6.9, 0));
      }
      g.add(box(1.2, 1.4, 0.4, METAL, 3.4, 1.5, 0));
      g.add(box(2.2, 0.7, 1.4, SAND, 0, 0.9, 3.6));
      break;
    }
    case "radar": {
      g.add(box(6, 0.25, 6, CONCRETE, 0, 0.12, 0));
      g.add(box(5.5, 2.2, 5.5, 0x62635e, 0, 1.25, 0));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 7, 8), mat(DARK));
      mast.position.y = 5.5; mast.castShadow = true; g.add(mast);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(acc, 0.5, 0.3));
      dish.position.set(0, 7.2, 0); dish.rotation.x = -0.4; g.add(dish);
      g.add(box(1.5, 1.2, 1.5, 0x4a4a48, 2.2, 1.0, 2.2));
      antenna(g,0,9.0,0,1.8);
      addBuildingFactionDetails(g, faction, kind, body, acc);
      break;
    }
    case "bunker": {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.0, 2.2, 10), mat(SAND));
      b.position.y = 1.1; b.castShadow = b.receiveShadow = true;
      g.add(b);
      g.add(box(5.5, 0.4, 5.5, CONCRETE, 0, 0.2, 0));
      turret = new THREE.Group();
      turret.position.y = 2.2;
      turret.add(box(2.4, 0.9, 2.4, body, 0, 0.5, 0));
      turret.add(box(0.5, 0.15, 1, acc, 0, 1.05, 0));
      barrel(3.2, 0.16, 0.55, 1.0, turret);
      g.add(turret);
      break;
    }
    case "shipyard": {
      g.add(box(14, 0.4, 11, CONCRETE, 0, 0.2, 0));
      g.add(box(12, 2.5, 9, 0x555a55, 0, 1.45, 0));
      g.add(box(8, 1.8, 5, body, 0, 3.6, -0.5));
      g.add(box(9, 0.5, 1, DARK, 0, 2.5, 4.3));
      break;
    }
    case "landCommand": case "airCommand": case "seaCommand":
    case "combatEngineer": case "landStrategy": case "airStrategy": case "seaStrategy": {
      const accent = kind.includes("air") ? 0x5976a8 : kind.includes("sea") ? 0x4b7770 : acc;
      g.add(box(11, 0.28, 9.5, CONCRETE, 0, 0.14, 0));
      g.add(box(10, 2.8, 8.5, 0x5c5b55, 0, 1.5, 0));
      g.add(box(7.5, 2.4, 6, accent, 0, 4.1, -0.3));
      g.add(box(4, 1.2, 4, 0x4a4840, 0, 5.9, -0.3));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 4.5, 6), mat(DARK));
      mast.position.set(2.5, 7.5, 1.5); mast.castShadow = true; g.add(mast);
      if (kind.includes("air")) {
        const dsh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(accent, 0.5, 0.3));
        dsh.position.set(2.5, 8.8, 1.5); dsh.rotation.x = -0.5; g.add(dsh);
      }
      if (kind.includes("Strategy")) g.add(box(4.5, 0.3, 1.3, 0xd0a33a, 0, 5.5, 3.2));
      g.add(box(1.6, 2.0, 0.3, DARK, 0, 1.15, 4.4));
      break;
    }
    default: {
      g.add(box(2.5, 1.5, 2.8, body, 0, 0.8, 0));
      break;
    }
  }

  if (["hq","barracks","factory","supply","airbase","refinery","radar"].includes(kind)) addBaseEnvironment(g, faction, kind);
  g.rotation.order = "YXZ";
  return { group: g, turret };
}

function addPitchedRoof(parent:THREE.Group,width:number,depth:number,y:number,color:number):void {
  const slope=Math.atan2(1,width/2),length=Math.hypot(width/2,1);
  for(const side of [-1,1]){const roof=box(length,.15,depth,color,side*width/4,y+.5,0);roof.rotation.z=-side*slope;parent.add(roof);}
}
/** Merge each static human part by material color; animated leg pivots stay separate. */
function mergeStaticParts(parent:THREE.Group):void {
  const batches=new Map<number,{geometry:THREE.BufferGeometry[];material:THREE.MeshStandardMaterial}>();
  for(const child of [...parent.children])if(child instanceof THREE.Mesh&&child.material instanceof THREE.MeshStandardMaterial){child.updateMatrix();const color=child.material.color.getHex();let batch=batches.get(color);if(!batch){batch={geometry:[],material:child.material.clone()};batches.set(color,batch);}const geo=child.geometry.clone().applyMatrix4(child.matrix);batch.geometry.push(geo);parent.remove(child);child.geometry.dispose();child.material.dispose();}
  for(const batch of batches.values()){const geometry=mergeGeometries(batch.geometry);batch.geometry.forEach(g=>g.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}}
}

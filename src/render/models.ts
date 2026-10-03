import * as THREE from "three";
import type { Team, UnitKind } from "../sim/types";

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

/** Detailed procedural military models – readable silhouettes at RTS scale. */
export function createModel(kind: UnitKind, team: Team): Model {
  const g = new THREE.Group();
  let turret: THREE.Group | null = null;
  const body = BODY[team], acc = ACC[team];

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
      g.add(turret);
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
      break;
    }
    case "inf": {
      g.add(box(0.18, 0.7, 0.2, DARK, -0.14, 0.35, 0.02));
      g.add(box(0.18, 0.7, 0.2, DARK, 0.14, 0.35, -0.02));
      g.add(box(0.55, 0.7, 0.35, body, 0, 1.0, 0));
      g.add(box(0.5, 0.35, 0.28, SAND, 0, 1.15, 0.05));
      g.add(box(0.14, 0.55, 0.14, body, -0.4, 0.95, 0.08));
      g.add(box(0.14, 0.55, 0.14, body, 0.4, 0.95, 0.08));
      g.add(cyl(0.2, 0.22, 0.28, SKIN, 0, 1.55, 0, 8));
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(DARK, 0.9, 0.05));
      helm.position.set(0, 1.68, 0);
      g.add(helm);
      g.add(box(0.08, 0.08, 1.05, DARK, 0.28, 1.05, 0.45));
      g.add(box(0.1, 0.12, 0.2, METAL, 0.28, 1.05, 0.95));
      g.add(box(0.35, 0.45, 0.2, SAND, 0, 1.1, -0.28));
      break;
    }
    case "engineer": {
      g.add(box(0.18, 0.68, 0.2, DARK, -0.14, 0.34, 0));
      g.add(box(0.18, 0.68, 0.2, DARK, 0.14, 0.34, 0));
      g.add(box(0.58, 0.72, 0.38, 0x6d6655, 0, 1.0, 0));
      g.add(box(0.14, 0.52, 0.14, 0x6d6655, -0.42, 0.95, 0.06));
      g.add(box(0.14, 0.52, 0.14, 0x6d6655, 0.42, 0.95, 0.06));
      g.add(cyl(0.2, 0.22, 0.28, SKIN, 0, 1.55, 0, 8));
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.18, 8), mat(0xd0a030, 0.85, 0.05));
      hat.position.set(0, 1.78, 0);
      g.add(hat);
      g.add(box(0.32, 0.08, 0.32, 0xd0a030, 0, 1.72, 0.05));
      g.add(box(0.4, 0.55, 0.25, DARK, 0, 1.05, -0.35));
      g.add(box(0.1, 0.1, 0.9, METAL, 0.3, 1.0, 0.4));
      break;
    }
    case "special": {
      g.add(box(0.17, 0.68, 0.18, DARK, -0.13, 0.34, 0));
      g.add(box(0.17, 0.68, 0.18, DARK, 0.13, 0.34, 0));
      g.add(box(0.52, 0.7, 0.34, 0x30383a, 0, 1.0, 0));
      g.add(box(0.13, 0.5, 0.13, 0x30383a, -0.38, 0.95, 0.05));
      g.add(box(0.13, 0.5, 0.13, 0x30383a, 0.38, 0.95, 0.05));
      g.add(cyl(0.18, 0.2, 0.26, SKIN, 0, 1.52, 0, 8));
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(DARK, 0.85, 0.1));
      helm.position.set(0, 1.64, 0);
      g.add(helm);
      g.add(box(0.28, 0.1, 0.12, acc, 0, 1.62, 0.18));
      g.add(box(0.08, 0.08, 0.95, DARK, 0.26, 1.0, 0.4));
      g.add(box(0.3, 0.4, 0.18, 0x252a2c, 0, 1.05, -0.3));
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
      g.add(turret);
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
      for (const [sx, sz] of [[-5, 6], [5, 6], [-6, -5], [6, -5]] as const) {
        g.add(box(2.2, 0.9, 1.2, 0xb0a078, sx, 0.55, sz));
      }
      g.add(box(3.2, 0.35, 2.2, CONCRETE, 0, 0.4, 7.2));
      break;
    }
    case "barracks": {
      g.add(box(12, 0.28, 9, CONCRETE, 0, 0.14, 0));
      g.add(box(10, 2.6, 7.2, SAND, 0, 1.4, 0));
      g.add(box(9, 0.3, 6.2, 0x8a8070, 0, 2.85, 0));
      g.add(box(3.2, 1.3, 2.4, acc, -2.5, 3.6, 0));
      g.add(box(1.5, 2.0, 0.28, DARK, 0, 1.15, 3.7));
      g.add(box(1.1, 0.85, 0.15, 0x3a4550, -3.0, 1.7, 3.65));
      g.add(box(1.1, 0.85, 0.15, 0x3a4550, 3.0, 1.7, 3.65));
      break;
    }
    case "factory": {
      g.add(box(13, 0.3, 11, CONCRETE, 0, 0.15, 0));
      g.add(box(12, 3.5, 10, 0x5a5a55, 0, 1.9, 0));
      g.add(box(8, 2.5, 6, body, 0, 4.8, -0.5));
      g.add(box(1.4, 5.5, 1.4, DARK, 3.5, 5.5, 2.5));
      g.add(box(1.1, 0.4, 1.1, 0x444440, 3.5, 8.4, 2.5));
      g.add(box(4.5, 2.8, 0.3, 0x3a3a38, 0, 1.5, 5.1));
      g.add(box(2, 1.2, 1.5, DARK, -4, 4.2, 3.5));
      break;
    }
    case "helipad": {
      g.add(box(12, 0.35, 12, 0x6a7068, 0, 0.18, 0));
      g.add(box(9, 0.12, 9, 0x5a6058, 0, 0.4, 0));
      g.add(box(0.7, 0.08, 3.2, 0xf0e8c0, 0, 0.48, 0));
      g.add(box(2.4, 0.08, 0.7, 0xf0e8c0, 0, 0.48, 0));
      g.add(box(3.5, 2.2, 3, 0x5c5a4e, 5.5, 1.2, -5));
      g.add(box(2.5, 0.25, 2.2, acc, 5.5, 2.4, -5));
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
      break;
    }
    case "supply": {
      g.add(box(10, 0.28, 8, CONCRETE, 0, 0.14, 0));
      g.add(box(8, 2.8, 6.2, SAND, 0, 1.5, 0));
      g.add(box(6.2, 1.0, 4.8, body, 0, 3.4, 0));
      g.add(box(1.5, 2.0, 0.3, DARK, 0, 1.15, 3.2));
      g.add(box(1.5, 1.3, 1.5, 0x8a7a50, 4.4, 0.75, 2.4));
      g.add(box(1.3, 1.1, 1.3, 0x7a6a48, 4.4, 1.9, 2.4));
      g.add(box(1.5, 1.3, 1.5, 0x8a7a50, -4.4, 0.75, 2.0));
      g.add(box(1.2, 1.0, 1.2, 0x7a6a48, -4.4, 1.75, 2.0));
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

  g.rotation.order = "YXZ";
  return { group: g, turret };
}

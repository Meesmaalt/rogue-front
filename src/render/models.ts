import * as THREE from "three";
import type { Team, UnitKind } from "../sim/types";

const BODY = [0x4f5d36, 0x4a3b38], ACC = [0x46b3e6, 0xe0553f], DARK = 0x23272a;
const mat = (c: number, r = 0.75, m = 0.25) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function box(w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function barrel(len: number, r: number, y: number, z: number, parent: THREE.Object3D): void {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 8), mat(DARK));
  b.rotation.x = Math.PI / 2;
  b.position.set(0, y, z);
  b.castShadow = true;
  parent.add(b);
}

export interface Model { group: THREE.Group; turret: THREE.Group | null }

/** Esialgsed primitiividest mudelid. Faas 5 asendab need GLB-mudelitega – liides jääb samaks. */
export function createModel(kind: UnitKind, team: Team): Model {
  const g = new THREE.Group();
  let turret: THREE.Group | null = null;
  switch (kind) {
    case "tank": {
      g.add(box(3, 1, 4.6, BODY[team], 0, 1.1, 0), box(0.8, 1, 5.2, DARK, -1.8, 0.65, 0), box(0.8, 1, 5.2, DARK, 1.8, 0.65, 0));
      turret = new THREE.Group();
      turret.position.y = 1.9;
      turret.add(box(2.2, 0.9, 2.5, BODY[team], 0, 0.45, -0.2), box(0.5, 0.15, 1.2, ACC[team], 0, 0.95, -0.2));
      barrel(3.6, 0.2, 0.5, 2.4, turret);
      g.add(turret);
      break;
    }
    case "inf": {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.3, 8), mat(BODY[team]));
      b.position.y = 0.65; b.castShadow = true;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(BODY[team]));
      h.position.y = 1.5; h.castShadow = true;
      g.add(b, h, box(0.12, 0.12, 1.1, DARK, 0.3, 1, 0.5), box(0.3, 0.3, 0.15, ACC[team], 0, 1, -0.4));
      break;
    }
    case "hq": {
      g.add(box(14, 3, 14, 0x5d5b52, 0, 1.5, 0), box(8, 3, 8, BODY[team], 0, 4.5, 0), box(3, 0.6, 3, ACC[team], 0, 6.4, 0));
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8, 6), mat(DARK));
      a.position.set(2.5, 10, 2.5); a.castShadow = true;
      g.add(a);
      break;
    }
    case "bunker": {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.2, 2, 10), mat(0x5d5b52));
      b.position.y = 1; b.castShadow = b.receiveShadow = true;
      g.add(b);
      turret = new THREE.Group();
      turret.position.y = 2;
      turret.add(box(2.4, 1, 2.4, BODY[team], 0, 0.5, 0), box(0.5, 0.15, 1, ACC[team], 0, 1.05, 0));
      barrel(3, 0.2, 0.6, 2, turret);
      g.add(turret);
      break;
    }
    default: {
      const c = kind === "fighter" ? 0x6977a8 : kind === "heli" ? BODY[team] : kind === "aa" ? 0x59604d : 0x77705a;
      g.add(box(kind === "fighter" ? 4.5 : 2.5, kind === "fighter" ? 0.7 : 1.5, kind === "fighter" ? 7 : 2.8, c, 0, kind === "fighter" ? 4 : 0.8, 0));
      if (kind === "heli" || kind === "aa") { turret = new THREE.Group(); turret.position.y = kind === "heli" ? 2 : 1.8; turret.add(box(1.4,0.5,2.2,ACC[team],0,0.3,0)); g.add(turret); }
      break;
    }
  }
  g.rotation.order = "YXZ";
  return { group: g, turret };
}

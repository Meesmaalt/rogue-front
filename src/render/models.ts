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
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.72, 4, 7), mat(BODY[team], 0.95, 0.05));
      body.position.y = 0.9;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), mat(0x9a8068, 1, 0));
      head.position.y = 1.65;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI*2, 0, Math.PI/2), mat(DARK, 1, 0));
      helmet.position.y = 1.72;
      g.add(body, head, helmet);
      for (const side of [-1,1]) {
        const leg = box(0.16,0.72,0.18,DARK,side*0.14,0.36,0);
        leg.rotation.x = side * 0.08; g.add(leg);
        const arm = box(0.13,0.62,0.13,BODY[team],side*0.42,0.95,0.08);
        arm.rotation.z = side * 0.16; g.add(arm);
      }
      g.add(box(0.12,0.12,1.05,DARK,0.24,1.12,0.45), box(0.32,0.12,0.16,ACC[team],0,1.03,-0.34));
      break;
    }
    case "engineer": {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.75, 4, 7), mat(0x6d6655, 0.95, 0.02)); body.position.y=0.9;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.27,8,6),mat(0x9a8068,1,0)); head.position.y=1.65;
      const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.31,0.28,0.16,8),mat(0xd09a35,0.95,0)); helmet.position.y=1.82;
      const pack=box(0.42,0.6,0.22,DARK,0,1.0,-0.38);
      g.add(body,head,helmet,pack,box(0.12,0.12,1.0,DARK,0.28,1.08,0.42)); break;
    }
    case "hq": {
      g.add(box(14, 3, 14, 0x5d5b52, 0, 1.5, 0), box(8, 3, 8, BODY[team], 0, 4.5, 0), box(3, 0.6, 3, ACC[team], 0, 6.4, 0));
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 8, 6), mat(DARK));
      a.position.set(2.5, 10, 2.5); a.castShadow = true;
      g.add(a);
      break;
    }
    case "barracks": {
      g.add(box(8,3,7,0x6b6758,0,1.5,0), box(6,1,5,ACC[team],0,3.5,0), box(1.2,2,0.4,DARK,0,1,3.55)); break;
    }
    case "factory": {
      g.add(box(10,4,9,0x5a5a55,0,2,0), box(7,2,5,BODY[team],0,5,0), box(2,1,1.5,DARK,0,4.8,4.2)); break;
    }
    case "helipad": {
      g.add(box(10,1,10,0x4c514c,0,0.5,0), box(6,0.2,6,ACC[team],0,1.1,0)); break;
    }
    case "refinery": {
      g.add(box(8,4,8,0x6b624e,0,2,0), box(2,5,2,DARK,-2,6,0), box(2,4,2,DARK,2,5.5,0)); break;
    }
    case "airbase": {
      g.add(box(13,0.8,12,0x4f544d,0,0.4,0), box(9,0.25,8,ACC[team],0,0.9,0), box(7,2.4,3.5,0x68645a,0,2.1,-3.4), box(2.2,2.6,2.2,DARK,-4,1.8,2.2), box(2.2,2.6,2.2,DARK,4,1.8,2.2)); break;
    }
    case "supply": {
      g.add(box(7,3.2,6,0x6b6758,0,1.6,0), box(5.5,1.2,4.8,BODY[team],0,3.7,0), box(0.5,2.5,0.5,DARK,-2.2,4.8,0), box(0.5,2.5,0.5,DARK,2.2,4.8,0)); break;
    }
    case "generator": {
      g.add(box(6, 3.5, 6, 0x55534b, 0, 1.75, 0), box(3.8, 2.2, 3.8, BODY[team], 0, 4.2, 0));
      for (const x of [-2.1, 2.1]) g.add(box(0.5, 3, 0.5, DARK, x, 4.8, 0));
      break;
    }
    case "radar": {
      g.add(box(5.5,2.5,5.5,0x62635e,0,1.25,0)); const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.25,6,8),mat(DARK)); mast.position.y=5; g.add(mast); const dish=new THREE.Mesh(new THREE.SphereGeometry(1.5,12,8,0,Math.PI*2,0,Math.PI/2),mat(ACC[team])); dish.position.set(0,6.4,0); dish.rotation.x=Math.PI/2; g.add(dish); break;
    }
    case "artillery": {
      g.add(box(2.8,1.2,4.2,BODY[team],0,0.9,0), box(0.55,0.7,4.8,DARK,-1.8,0.65,0), box(0.55,0.7,4.8,DARK,1.8,0.65,0));
      turret = new THREE.Group(); turret.position.y = 1.5; turret.add(box(1.8,0.7,2.2,BODY[team],0,0.3,0)); barrel(5.8,0.16,0.35,3.2,turret); g.add(turret); break;
    }
    case "transport": {
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.0,3.6,6,10), mat(BODY[team],0.72,0.12)); fus.rotation.x=Math.PI/2; fus.position.y=2.7;
      const tail=box(0.25,1.1,2.5,DARK,0,3.35,-2.4);
      const wing=box(5.8,0.18,1.0,BODY[team],0,2.65,0.15);
      const tailWing=box(3.0,0.14,0.65,BODY[team],0,3.15,-2.0);
      const rotor=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.35,8),mat(DARK)); rotor.position.y=4.0;
      g.add(fus,wing,tail,tailWing,rotor); break;
    }
    case "gunship": {
      const fus=new THREE.Mesh(new THREE.CapsuleGeometry(0.75,3.0,6,10),mat(BODY[team],0.72,0.12)); fus.rotation.x=Math.PI/2; fus.position.y=2.65;
      const wing=box(5.2,0.18,0.65,BODY[team],0,2.55,0.25);
      const tail=box(0.2,0.9,1.9,DARK,0,3.35,-1.9);
      turret=new THREE.Group(); turret.position.set(0,2.2,1.2); turret.add(box(0.8,0.35,1.2,ACC[team],0,0,0)); barrel(2.8,0.14,0,1.25,turret);
      g.add(fus,wing,tail,turret); break;
    }
    case "destroyer": {
      g.add(box(3.2,1.1,12,0x4b5350,0,0.9,0), box(2,1.4,5,0x606762,0,1.8,-1), box(0.7,0.7,2.2,DARK,0,2.5,3), box(0.5,0.5,3,DARK,0,2.3,-4));
      turret = new THREE.Group(); turret.position.y=2.2; turret.add(box(1.4,0.7,1.8,BODY[team],0,0.3,1.2)); barrel(2.8,0.14,0.45,2.1,turret); g.add(turret); break;
    }
    case "submarine": {
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(2.1,7,6,12), mat(0x343c3b)); hull.rotation.x=Math.PI/2; hull.position.y=1.2; hull.castShadow=true; g.add(hull);
      g.add(box(0.9,1.1,1.8,BODY[team],0,2.6,0)); break;
    }
    case "landingcraft": {
      g.add(box(5,1.2,7,0x565b56,0,0.8,0), box(3.4,1.3,3.2,BODY[team],0,1.8,-0.5), box(3.8,0.4,1,DARK,0,0.9,3)); break;
    }
    case "special": {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.45,1.5,8), mat(0x30383a)); b.position.y=0.75; b.castShadow=true;
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6), mat(DARK)); h.position.y=1.65; h.castShadow=true;
      g.add(b,h,box(0.16,0.16,1.2,ACC[team],0.25,1.1,0.45)); break;
    }
    case "shipyard": {
      g.add(box(12,2.5,9,0x555a55,0,1.25,0), box(8,1.8,5,BODY[team],0,3.4,-0.5), box(9,0.5,1,DARK,0,2.5,4.3));
      break;
    }
    case "landCommand": case "airCommand": case "seaCommand": case "combatEngineer": case "landStrategy": case "airStrategy": case "seaStrategy": {
      const accent = kind.includes("air") ? 0x5976a8 : kind.includes("sea") ? 0x4b7770 : ACC[team];
      g.add(box(9,3.2,8,0x5c5b55,0,1.6,0), box(6.5,2.2,5.5,accent,0,4.2,0), box(1.2,3.5,1.2,DARK,0,6.7,0));
      if (kind.includes("Strategy")) g.add(box(4.5,0.25,1.2,0xd0a33a,0,5.4,2.8));
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
      if (kind === "fighter") {
        const fus=new THREE.Mesh(new THREE.CapsuleGeometry(0.48,4.0,5,8),mat(0x6977a8,0.62,0.25)); fus.rotation.x=Math.PI/2; fus.position.y=4;
        const wing=box(6.5,0.18,1.0,0x59657f,0,3.9,0.1);
        const tail=box(0.18,1.1,2.0,DARK,0,4.6,-2.5);
        g.add(fus,wing,tail,box(0.55,0.12,0.65,ACC[team],0,4.0,2.0));
      } else if (kind === "heli") {
        const fus=new THREE.Mesh(new THREE.CapsuleGeometry(0.75,2.3,6,9),mat(BODY[team],0.78,0.08)); fus.rotation.x=Math.PI/2; fus.position.y=2.45;
        const tail=box(0.25,0.25,3.2,DARK,0,2.65,-2.45);
        const boom=box(5.8,0.12,0.3,DARK,0,3.65,0);
        const rotorM=new THREE.Mesh(new THREE.BoxGeometry(6.0,0.08,0.18),mat(DARK,1,0)); rotorM.position.y=3.72;
        const rotorM2=rotorM.clone(); rotorM2.rotation.y=Math.PI/2;
        g.add(fus,tail,boom,rotorM,rotorM2);
        turret=new THREE.Group(); turret.position.set(0,2.25,1.0); turret.add(box(1.0,0.35,1.1,ACC[team],0,0,0)); barrel(2.2,0.12,0,1.1,turret); g.add(turret);
      } else if (kind === "aa") {
        g.add(box(3.0,1.2,4.0,BODY[team],0,0.9,0),box(0.7,0.65,4.5,DARK,-1.75,0.6,0),box(0.7,0.65,4.5,DARK,1.75,0.6,0));
        turret=new THREE.Group(); turret.position.y=1.65; turret.add(box(1.8,0.5,1.8,BODY[team],0,0.3,0)); barrel(2.6,0.12,0.5,1.6,turret); g.add(turret);
      } else {
        g.add(box(2.5,1.5,2.8,kind === "special" ? 0x30383a : BODY[team],0,0.8,0));
      }
      break;
    }
  }
  g.rotation.order = "YXZ";
  return { group: g, turret };
}

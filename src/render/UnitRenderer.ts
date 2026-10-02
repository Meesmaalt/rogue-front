import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import { wrapAngle } from "../sim/math";
import { createVisualModel } from "./GLBModels";

interface View { group: THREE.LOD; turret: THREE.Group | null; ring: THREE.Mesh; tactical: THREE.Mesh | null; kind: string; phase: number; recoil: number; lastAirState?: string }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;
const frameDtSafe = () => 1 / 60;

/** Sünkroonib sim-entiteedid three.js objektidega (interpoleeritud positsioon, kalle maastikule, valikurõngad). */
export class UnitRenderer {
  private views = new Map<number, View>();
  private rotorParts = new Map<number, THREE.Object3D>();
  private recoilById = new Map<number, number>();

  handleEvents(events: import("../sim/types").SimEvent[]): void {
    for (const e of events) {
      if (e.type === "fire" && e.sourceId) this.recoilById.set(e.sourceId, 1);
    }
  }
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });

  constructor(private readonly scene: THREE.Scene) {}

  sync(world: World, alpha: number, selected: ReadonlySet<number>): void {
    const seen = new Set<number>();
    for (const e of world.entities) {
      if (e.dead || e.loadedIntoId !== null) continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) {
        const visual = createVisualModel(e.kind, e.team);
        const lod = new THREE.LOD();
        lod.addLevel(visual.group, e.kind === "inf" ? 48 : e.kind === "transport" ? 60 : 70);
        const low = new THREE.Group();
        const lowMesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.5, e.def.radius * 0.65), Math.max(0.65, e.def.radius * 0.75), e.kind === "fighter" ? 0.35 : 0.7, 6), new THREE.MeshStandardMaterial({ color: e.team === 0 ? 0x64744b : 0x704d49, roughness: 1 }));
        lowMesh.castShadow = true;
        low.add(lowMesh);
        lod.addLevel(low, e.kind === "inf" ? 78 : e.kind === "transport" ? 92 : 105);
        const m = { group: lod, turret: visual.turret };
        // Mõne GLB puhul puudub rootori/propelleri animatsioon; lisa odav procedural rootori osa.
        if (["heli", "gunship", "transport"].includes(e.kind)) {
          const rotor = new THREE.Group();
          rotor.name = "AnimatedRotor";
          const bladeMat = new THREE.MeshBasicMaterial({ color: 0x202326, transparent: true, opacity: 0.82 });
          for (const angle of [0, Math.PI / 2]) {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, e.kind === "transport" ? 6.2 : 5.0), bladeMat);
            blade.rotation.y = angle;
            blade.position.y = e.kind === "transport" ? 3.9 : 3.5;
            rotor.add(blade);
          }
          m.group.add(rotor);
          this.rotorParts.set(e.id, rotor);
        }
        const r = Math.max(e.def.radius, 1.2);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.22, 32).rotateX(-Math.PI / 2), this.ringMat);
        const tacticalKinds = ["aa", "bunker", "artillery"];
        const tactical = tacticalKinds.includes(e.kind) ? new THREE.Mesh(new THREE.RingGeometry(Math.max(2, e.firingRange * 0.96), Math.max(2.25, e.firingRange), 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x56a8d8, transparent: true, opacity: 0.10, depthWrite: false })) : null;
        ring.position.y = 0.3;
        ring.visible = false;
        m.group.add(ring);
        if (tactical) { tactical.position.y = 0.18; m.group.add(tactical); }
        // Enamik üksusi ei vaja dünaamilist shadow-map kirjutamist.
        // Hooneid võib varjutada, liikuvad üksused kasutavad odavamat valgustust.
        const staticBuilding = ["hq", "barracks", "factory", "helipad", "airbase", "refinery", "supply", "radar", "bunker", "aa", "generator", "shipyard"].includes(e.kind);
        visual.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = staticBuilding;
          mesh.receiveShadow = staticBuilding;
        });
        this.scene.add(m.group);
        v = { group: m.group, turret: m.turret, ring, tactical, kind: e.kind, phase: (e.id * 0.731) % 6.28, recoil: 0 };
        this.views.set(e.id, v);
      }
      const visible = e.team === world.playerTeam || world.vision.isVisible(world.playerTeam, e.x, e.z);
      v.group.visible = visible;
      if (!visible) continue;
      const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha), h = lerpAngle(e.pHeading, e.heading, alpha);
      v.group.position.set(x, heightAt(x, z), z);
      if (e.underConstruction) {
        const k = Math.max(0.12, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        v.group.scale.set(0.65 + 0.35 * k, 0.2 + 0.8 * k, 0.65 + 0.35 * k);
      } else v.group.scale.set(1, 1, 1);
      const animT = performance.now() * 0.001 + v.phase;
      const recoil = this.recoilById.get(e.id) ?? 0;
      v.recoil = Math.max(0, recoil - frameDtSafe());
      if (v.recoil <= 0) this.recoilById.delete(e.id); else this.recoilById.set(e.id, v.recoil);

      // Liikumine, rootor, vedrustus ja õhuoperatsioonid. Kõik on odav transform-animatsioon.
      if (e.kind === "heli" || e.kind === "gunship" || e.kind === "transport") {
        const airborne = e.airState !== "grounded" && e.airState !== "rearming";
        v.group.position.y += airborne ? Math.sin(animT * 7) * 0.08 : Math.sin(animT * 2) * 0.015;
        const rotor = this.rotorParts.get(e.id);
        if (rotor) rotor.rotation.y += airborne ? 1.0 : 0.15;
      }
      if (e.kind === "inf" || e.kind === "special" || e.kind === "engineer") {
        const moving = e.mode === "move" || e.mode === "amove" || e.mode === "attack" || e.mode === "patrol";
        const step = moving ? Math.abs(Math.sin(animT * 10)) * 0.045 : Math.sin(animT * 2) * 0.012;
        v.group.position.y += step;
        v.group.rotation.z = moving ? Math.sin(animT * 10) * 0.025 : 0;
      }
      if (e.kind === "tank" || e.kind === "artillery" || e.kind === "aa") {
        const moving = e.mode === "move" || e.mode === "amove" || e.mode === "patrol";
        v.group.position.y += moving ? Math.sin(animT * 14) * 0.025 : Math.sin(animT * 2) * 0.008;
      }
      if (e.kind === "fighter") {
        if (e.airState === "taxi") {
          const lift = Math.max(0, Math.sin(animT * 3)) * 0.22;
          v.group.position.y += lift;
          v.group.rotation.x = -0.035;
        } else if (e.airState === "airborne" || e.airState === "returning") {
          v.group.position.y += 1.2 + Math.sin(animT * 5) * 0.035;
          v.group.rotation.x = -0.055;
        } else {
          v.group.rotation.x = 0;
        }
      }
      if (v.recoil > 0) {
        const kick = Math.sin(Math.min(1, v.recoil) * Math.PI) * 0.18;
        v.group.position.z -= Math.cos(h) * kick;
        if (v.turret) v.turret.position.z = -kick * 1.8;
      } else if (v.turret) v.turret.position.z *= 0.75;

      // Tootmise/ehituse visuaalne aktiivsus: pooleliolev ehitis pulseerib, valmis hoone jääb stabiilseks.
      if (e.underConstruction) {
        const pulse = 0.97 + Math.sin(animT * 8) * 0.03;
        v.group.scale.x *= pulse; v.group.scale.z *= pulse;
      } else if (e.productionQueue.length > 0) {
        const pulse = 1 + Math.sin(animT * 6) * 0.012;
        v.group.scale.x *= pulse; v.group.scale.z *= pulse;
      }
      if (e.kind === "tank") {
        const f = 2, sa = Math.sin(h), ca = Math.cos(h);
        const hf = heightAt(x + sa * f, z + ca * f), hb = heightAt(x - sa * f, z - ca * f);
        const hr = heightAt(x + ca * 1.5, z - sa * 1.5), hl = heightAt(x - ca * 1.5, z + sa * 1.5);
        v.group.rotation.set(-Math.atan2(hf - hb, 2 * f), h, Math.atan2(hr - hl, 3));
      } else v.group.rotation.y = h;
      if (v.turret) v.turret.rotation.y = lerpAngle(e.pTurretYaw, e.turretYaw, alpha);
      v.ring.visible = selected.has(e.id);
      if (v.tactical) v.tactical.visible = selected.has(e.id);
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.scene.remove(v.group);
      v.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        if (m.material !== this.ringMat) (m.material as THREE.Material).dispose();
      });
      this.views.delete(id);
      this.rotorParts.delete(id);
      this.recoilById.delete(id);
    }
  }
}

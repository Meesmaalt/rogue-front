import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import { wrapAngle } from "../sim/math";
import { createVisualModel } from "./GLBModels";

interface View { group: THREE.LOD; turret: THREE.Group | null; ring: THREE.Mesh; tactical: THREE.Mesh | null; kind: string; phase: number; recoil: number; upgradeKit?: THREE.Group; lastAirState?: string }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;
const frameDtSafe = () => 1 / 60;

/** Sünkroonib sim-entiteedid three.js objektidega (interpoleeritud positsioon, kalle maastikule, valikurõngad). */
export class UnitRenderer {
  private intelGhosts = new Map<number, THREE.Mesh>();
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
        // No box / hex LOD – always keep the full procedural model at every camera distance.
        const lod = new THREE.LOD();
        lod.addLevel(visual.group, 5000);
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
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.22, 16).rotateX(-Math.PI / 2), this.ringMat);
        const tacticalKinds = ["aa", "bunker", "artillery"];
        const tactical = tacticalKinds.includes(e.kind) ? new THREE.Mesh(new THREE.RingGeometry(Math.max(2, e.firingRange * 0.96), Math.max(2.25, e.firingRange), 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x56a8d8, transparent: true, opacity: 0.10, depthWrite: false })) : null;
        ring.position.y = 0.3;
        ring.visible = false;
        m.group.add(ring);
        if (tactical) { tactical.position.y = 0.18; m.group.add(tactical); }
        // Enamik üksusi ei vaja dünaamilist shadow-map kirjutamist.
        // Hooneid võib varjutada, liikuvad üksused kasutavad odavamat valgustust.
        const staticBuilding = ["hq", "barracks", "factory", "helipad", "airbase", "refinery", "supply", "radar", "bunker", "aa", "generator", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"].includes(e.kind);
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
      const visible = e.team === world.playerTeam || world.isSpottedByTeam(e, world.playerTeam) || world.vision.isVisible(world.playerTeam, e.x, e.z);
      v.group.visible = visible;
      if (!visible) continue;
      const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha), h = lerpAngle(e.pHeading, e.heading, alpha);
      v.group.position.set(x, heightAt(x, z), z);
      if (e.upgrades.has("producer-2") && !v.upgradeKit) {
        const kit = new THREE.Group(); kit.name = "ProducerUpgradeKit";
        const mat = new THREE.MeshStandardMaterial({color:0xd2a53d, roughness:0.65});
        for (const sx of [-1,1]) { const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1.5,6), mat); mast.position.set(sx*2.2, e.kind === "airbase" ? 2.2 : 3.1, 0); kit.add(mast); }
        v.group.add(kit); v.upgradeKit = kit;
      }
      if (e.upgrading) {
        const k = Math.max(0.2, Math.min(1, (e.upgradeProgress ?? 0) / Math.max(0.01, e.upgradeTime ?? 1)));
        v.group.scale.set(0.9 + 0.1 * k, 0.85 + 0.15 * k, 0.9 + 0.1 * k);
      } else if (e.underConstruction) {
        // Keep full silhouette – only slight growth; no flat green slab
        const k = Math.max(0.25, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        v.group.scale.set(0.88 + 0.12 * k, 0.75 + 0.25 * k, 0.88 + 0.12 * k);
      } else {
        v.group.scale.set(1, 1, 1);
      }
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

      // Construction progress bar – always strip when finished (search all children)
      const barName = "ConstructBar";
      if (e.underConstruction) {
        const k = Math.max(0.05, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        let bar = v.group.getObjectByName(barName) as THREE.Mesh | undefined;
        if (!bar) {
          const geo = new THREE.BoxGeometry(1, 0.18, 0.18);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf2c14b });
          bar = new THREE.Mesh(geo, mat);
          bar.name = barName;
          v.group.add(bar);
        }
        bar.visible = true;
        bar.scale.set(Math.max(0.15, k) * (e.def.radius * 1.6), 1, 1);
        bar.position.set(0, e.def.height + 1.2, 0);
      } else {
        // Remove any leftover bars (construction complete)
        const leftovers: THREE.Object3D[] = [];
        v.group.traverse((o) => { if (o.name === barName) leftovers.push(o); });
        for (const o of leftovers) {
          o.parent?.remove(o);
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          (mesh.material as THREE.Material | undefined)?.dispose();
        }
        if (e.productionQueue.length > 0) {
          const pulse = 1 + Math.sin(animT * 6) * 0.012;
          v.group.scale.x *= pulse; v.group.scale.z *= pulse;
        }
      }

      // Status icons (player units only): out of supply / routing / low ammo
      if (e.team === world.playerTeam && e.def.speed > 0) {
        const icons: { name: string; color: number; on: boolean }[] = [
          { name: "StOutSupply", color: 0xe05030, on: !world.isInSupply(e) },
          { name: "StRouting", color: 0xffcc33, on: (e.morale ?? 100) < 22 || (e.suppression ?? 0) > 80 },
          { name: "StNoAmmo", color: 0xaaaaaa, on: (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) <= 0 },
        ];
        let slot = 0;
        for (const ic of icons) {
          let mesh = v.group.getObjectByName(ic.name) as THREE.Mesh | undefined;
          if (ic.on) {
            if (!mesh) {
              mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.28, 6, 6),
                new THREE.MeshBasicMaterial({ color: ic.color, depthTest: false }),
              );
              mesh.name = ic.name;
              mesh.renderOrder = 10;
              v.group.add(mesh);
            }
            mesh.visible = true;
            mesh.position.set(-0.7 + slot * 0.55, e.def.height + 1.6, 0);
            slot++;
          } else if (mesh) {
            mesh.visible = false;
          }
        }
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

  /** Last-known enemy positions (Wargame contact ghosts). */
  syncIntelGhosts(world: World): void {
    const team = world.playerTeam;
    const contacts = world.getIntel(team, true);
    const seen = new Set<number>();
    for (const c of contacts) {
      const age = world.time - c.lastSeen;
      if (age > 60) continue;
      const live = world.byId.get(c.entityId);
      // If currently spotted, real model is shown – skip ghost
      if (live && !live.dead && world.isSpottedByTeam(live, team)) continue;
      seen.add(c.entityId);
      let m = this.intelGhosts.get(c.entityId);
      if (!m) {
        const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.35, 10);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xc05050,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        m = new THREE.Mesh(geo, mat);
        this.scene.add(m);
        this.intelGhosts.set(c.entityId, m);
      }
      const fade = Math.max(0.15, 1 - age / 60);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.2 + fade * 0.35;
      const y = live && !live.dead ? live.y : 0;
      m.position.set(c.x, y + 0.5, c.z);
      m.visible = true;
      m.scale.setScalar(c.kind === "tank" || c.kind === "ifv" ? 1.4 : c.kind === "inf" ? 0.7 : 1);
    }
    for (const [id, m] of this.intelGhosts) {
      if (!seen.has(id)) {
        this.scene.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        this.intelGhosts.delete(id);
      }
    }
  }

}

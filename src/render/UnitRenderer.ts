import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import { wrapAngle } from "../sim/math";
import { createVisualModel } from "./GLBModels";

interface View { group: THREE.LOD; turret: THREE.Group | null; ring: THREE.Mesh }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;

/** Sünkroonib sim-entiteedid three.js objektidega (interpoleeritud positsioon, kalle maastikule, valikurõngad). */
export class UnitRenderer {
  private views = new Map<number, View>();
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });

  constructor(private readonly scene: THREE.Scene) {}

  sync(world: World, alpha: number, selected: ReadonlySet<number>): void {
    const seen = new Set<number>();
    for (const e of world.entities) {
      if (e.dead) continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) {
        const visual = createVisualModel(e.kind, e.team);
        const lod = new THREE.LOD();
        lod.addLevel(visual.group, e.kind === "inf" ? 70 : 95);
        const low = new THREE.Group();
        const lowMesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.5, e.def.radius * 0.65), Math.max(0.65, e.def.radius * 0.75), e.kind === "fighter" ? 0.35 : 0.7, 6), new THREE.MeshStandardMaterial({ color: e.team === 0 ? 0x64744b : 0x704d49, roughness: 1 }));
        lowMesh.castShadow = true;
        low.add(lowMesh);
        lod.addLevel(low, e.kind === "inf" ? 105 : 145);
        const m = { group: lod, turret: visual.turret };
        const r = Math.max(e.def.radius, 1.2);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.22, 32).rotateX(-Math.PI / 2), this.ringMat);
        ring.position.y = 0.3;
        ring.visible = false;
        m.group.add(ring);
        this.scene.add(m.group);
        v = { group: m.group, turret: m.turret, ring };
        this.views.set(e.id, v);
      }
      const visible = e.team === world.playerTeam || world.vision.isVisible(world.playerTeam, e.x, e.z);
      v.group.visible = visible;
      if (!visible) continue;
      const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha), h = lerpAngle(e.pHeading, e.heading, alpha);
      v.group.position.set(x, heightAt(x, z), z);
      if (e.kind === "tank") {
        const f = 2, sa = Math.sin(h), ca = Math.cos(h);
        const hf = heightAt(x + sa * f, z + ca * f), hb = heightAt(x - sa * f, z - ca * f);
        const hr = heightAt(x + ca * 1.5, z - sa * 1.5), hl = heightAt(x - ca * 1.5, z + sa * 1.5);
        v.group.rotation.set(-Math.atan2(hf - hb, 2 * f), h, Math.atan2(hr - hl, 3));
      } else v.group.rotation.y = h;
      if (v.turret) v.turret.rotation.y = lerpAngle(e.pTurretYaw, e.turretYaw, alpha);
      v.ring.visible = selected.has(e.id);
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
    }
  }
}

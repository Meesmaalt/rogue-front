import * as THREE from "three";
import type { World } from "../sim/World";
import type { SimEvent } from "../sim/types";
import { heightAt } from "../sim/heightmap";
import { SIM_STEP } from "../sim/constants";

type Kind = "fire" | "fire2" | "smoke" | "dust";
interface Part { m: THREE.Mesh; vx: number; vy: number; vz: number; life: number; t: number; size: number; kind: Kind }
interface Ping { m: THREE.Mesh; t: number }
interface DustPart { x:number; y:number; z:number; vx:number; vy:number; vz:number; life:number; t:number; size:number }

/** Renderduse efektid: mürsud, osakesed, plahvatused, ping-markerid. Käivituvad sim-sündmustest. */
export class Fx {
  private parts: Part[] = [];
  private pings: Ping[] = [];
  private shells = new Map<number, THREE.Mesh>();
  private dustParts: DustPart[] = [];
  private readonly dustMax = 256;
  private readonly dustGeo = new THREE.PlaneGeometry(1, 1);
  private readonly dustMat = new THREE.MeshBasicMaterial({ color: 0xb7a77a, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  private readonly dustMesh: THREE.InstancedMesh;
  private shellGeo = new THREE.SphereGeometry(0.28, 6, 5);
  private shellMat = [new THREE.MeshBasicMaterial({ color: 0x9fe3ff }), new THREE.MeshBasicMaterial({ color: 0xff9a60 })];
  private pGeo = new THREE.SphereGeometry(0.5, 6, 5);
  private pMat: Record<Kind, THREE.Material> = {
    fire: new THREE.MeshBasicMaterial({ color: 0xffa030 }),
    fire2: new THREE.MeshBasicMaterial({ color: 0xff5a1e }),
    smoke: new THREE.MeshBasicMaterial({ color: 0x2d2b29, transparent: true, opacity: 0.55, depthWrite: false }),
    dust: new THREE.MeshBasicMaterial({ color: 0xb7a77a, transparent: true, opacity: 0.5, depthWrite: false }),
  };

  constructor(private readonly scene: THREE.Scene) {
    this.dustMesh = new THREE.InstancedMesh(this.dustGeo, this.dustMat, this.dustMax);
    this.dustMesh.frustumCulled = true;
    this.dustMesh.count = 0;
    this.scene.add(this.dustMesh);
  }

  handleEvents(events: SimEvent[]): void {
    for (const e of events) {
      if (e.type === "fire") for (let i = 0; i < 4; i++) this.puff(e.x, e.y, e.z, this.r(4), Math.random() * 3, this.r(4), 0.25, 0.6, "fire");
      else if (e.type === "hit") for (let i = 0; i < 3; i++) this.puff(e.x, e.y, e.z, this.r(5), Math.random() * 4, this.r(5), 0.3, 0.5, "dust");
      else if (e.type === "death") this.explode(e.x, e.y, e.z, e.big);
      else if (e.type === "build-complete") this.ping(e.x, e.z, 0x66d9a0);
      else if (e.type === "repair-complete") this.ping(e.x, e.z, 0x4ca8ff);
    }
  }

  syncProjectiles(world: World, alpha: number): void {
    const seen = new Set<number>();
    for (const p of world.projectiles) {
      seen.add(p.id);
      let m = this.shells.get(p.id);
      if (!m) { m = new THREE.Mesh(this.shellGeo, this.shellMat[p.team]); this.scene.add(m); this.shells.set(p.id, m); }
      const k = alpha * SIM_STEP;
      m.position.set(p.x + p.vx * k, p.y + p.vy * k, p.z + p.vz * k);
    }
    for (const [id, m] of this.shells) if (!seen.has(id)) { this.scene.remove(m); this.shells.delete(id); }
  }

  ping(x: number, z: number, color: number): void {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }));
    m.position.set(x, heightAt(x, z) + 0.4, z);
    this.scene.add(m);
    this.pings.push({ m, t: 0 });
  }

  update(dt: number): void {
    for (let i = this.dustParts.length - 1; i >= 0; i--) {
      const p = this.dustParts[i]; p.t += dt;
      if (p.t >= p.life) { this.dustParts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= 2.2 * dt;
    }
    this.dustMesh.count = this.dustParts.length;
    const dm = new THREE.Object3D();
    for (let i = 0; i < this.dustParts.length; i++) {
      const p = this.dustParts[i], k = p.t / p.life;
      dm.position.set(p.x, p.y, p.z); dm.scale.setScalar(p.size * (0.7 + k * 1.5)); dm.rotation.set(-Math.PI / 2, 0, p.t * 0.7); dm.updateMatrix();
      this.dustMesh.setMatrixAt(i, dm.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;

    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { this.scene.remove(p.m); this.parts.splice(i, 1); continue; }
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.vy += (p.kind === "smoke" ? 1.5 : -9) * dt; p.vx *= 0.98; p.vz *= 0.98;
      const s = p.kind === "smoke" || p.kind === "dust" ? p.size * (0.6 + k * 1.2) : p.size * (1 - k);
      p.m.scale.setScalar(Math.max(0.01, s));
    }
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i];
      p.t += dt;
      const k = p.t / 0.7;
      if (k >= 1) {
        this.scene.remove(p.m); p.m.geometry.dispose(); (p.m.material as THREE.Material).dispose();
        this.pings.splice(i, 1); continue;
      }
      p.m.scale.setScalar(1 + k * 2.5);
      (p.m.material as THREE.MeshBasicMaterial).opacity = 1 - k;
    }
  }

  private r(s: number): number { return (Math.random() - 0.5) * s; }

  private puff(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, kind: Kind): void {
    if (kind === "dust") {
      if (this.dustParts.length >= this.dustMax) return;
      this.dustParts.push({ x, y, z, vx, vy, vz, life, t: 0, size });
      return;
    }
    if (this.parts.length > 380) return;
    const m = new THREE.Mesh(this.pGeo, this.pMat[kind]);
    m.position.set(x, y, z);
    this.scene.add(m);
    this.parts.push({ m, vx, vy, vz, life, t: 0, size, kind });
  }

  private explode(x: number, y: number, z: number, big: boolean): void {
    const n = big ? 36 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = (big ? 9 : 5) * Math.random();
      this.puff(x, y, z, Math.cos(a) * sp, Math.random() * (big ? 12 : 7), Math.sin(a) * sp, 0.5 + Math.random() * 0.5,
        (big ? 2.2 : 1.1) * (0.5 + Math.random()), Math.random() < 0.5 ? "fire" : "fire2");
    }
    for (let i = 0; i < (big ? 18 : 6); i++) this.puff(x + this.r(2), y, z + this.r(2), this.r(3), 2 + Math.random() * 3, this.r(3), 1.6 + Math.random(), big ? 3 : 1.6, "smoke");
  }
}

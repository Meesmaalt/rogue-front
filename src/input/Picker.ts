import * as THREE from "three";
import type { World } from "../sim/World";
import type { Entity, Point, Team } from "../sim/types";
import { heightAt } from "../sim/heightmap";

/** Ekraani ↔ maailma teisendused: üksuse valik hiirega ja maapinna leidmine. */
export class Picker {
  private ray = new THREE.Raycaster();
  private tmp = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly world: World) {}

  toScreen(x: number, y: number, z: number): { x: number; y: number; z: number } {
    this.tmp.set(x, y, z).project(this.camera);
    return { x: ((this.tmp.x + 1) / 2) * innerWidth, y: ((1 - this.tmp.y) / 2) * innerHeight, z: this.tmp.z };
  }

  pxPerUnit(x: number, y: number, z: number): number {
    const d = this.camera.position.distanceTo(this.tmp.set(x, y, z));
    return innerHeight / (2 * d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
  }

  pickEntity(mx: number, my: number, team: Team): Entity | null {
    let best: Entity | null = null, bs = 0;
    for (const e of this.world.entities) {
      if (e.dead || e.team !== team) continue;
      if (team !== this.world.playerTeam && !this.world.isSpottedByTeam(e, this.world.playerTeam)) continue;
      const cy = e.y + e.def.height * 0.5, p = this.toScreen(e.x, cy, e.z);
      if (p.z > 1) continue;
      const lim = 12 + e.def.radius * this.pxPerUnit(e.x, cy, e.z), d = Math.hypot(p.x - mx, p.y - my);
      if (d < lim && (best === null || d - lim < bs)) { best = e; bs = d - lim; }
    }
    return best;
  }

  /** Kiir vs. kõrgusväli (sammuga + poolitus). */
  groundAtNDC(nx: number, ny: number): Point {
    this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    const below = (t: number) => o.y + d.y * t <= heightAt(o.x + d.x * t, o.z + d.z * t);
    for (let t = 2; t < 900; t += 2) {
      if (!below(t)) continue;
      let a = t - 2, b = t;
      for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
      return { x: o.x + d.x * b, z: o.z + d.z * b };
    }
    return { x: o.x + d.x * 700, z: o.z + d.z * 700 };
  }

  groundAt(mx: number, my: number): Point {
    return this.groundAtNDC((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
  }
}

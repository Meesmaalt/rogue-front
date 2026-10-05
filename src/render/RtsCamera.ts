import * as THREE from "three";
import {MAP_SIZE} from "../sim/heightmap";

/** RTS-kaamera: WASD/nooled/serv liigutavad, Q/E pöörab, rull suumib. */
export class RtsCamera {
  // Tactical overview: unit identity comes from class markers at distance.
  x = -105; z = 105; yaw = -Math.PI / 4;
  dist = 220; targetDist = 220; pitch = 0.83;
  groundY = 0;
  private keys = new Set<string>();
  private mouse = { x: -1, y: -1 };

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly sun: THREE.DirectionalLight,
    el: HTMLElement,
  ) {
    window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
    window.addEventListener("mousemove", (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    document.addEventListener("mouseleave", () => { this.mouse.x = this.mouse.y = -1; });
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetDist = Math.max(58, Math.min(MAP_SIZE*.62, this.targetDist * (1 + Math.sign(e.deltaY) * 0.11)));
    }, { passive: false });
  }

  jumpTo(x: number, z: number): void {
    this.x = clamp(x, -MAP_SIZE/2+15, MAP_SIZE/2-15);
    this.z = clamp(z, -MAP_SIZE/2+15, MAP_SIZE/2-15);
  }

  update(dt: number): void {
    const k = this.keys, m = this.mouse;
    let f = 0, r = 0;
    if (k.has("w") || k.has("arrowup") || (m.y >= 0 && m.y < 4)) f++;
    if (k.has("s") || k.has("arrowdown") || m.y > innerHeight - 4) f--;
    if (k.has("d") || k.has("arrowright") || m.x > innerWidth - 4) r++;
    if (k.has("a") || k.has("arrowleft") || (m.x >= 0 && m.x < 4)) r--;
    if (k.has("q")) this.yaw -= 1.6 * dt;
    if (k.has("e")) this.yaw += 1.6 * dt;

    const sp = (40 + this.dist * 0.9) * dt, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.x = clamp(this.x + (-s * f + c * r) * sp, -MAP_SIZE/2+15, MAP_SIZE/2-15);
    this.z = clamp(this.z + (-c * f - s * r) * sp, -MAP_SIZE/2+15, MAP_SIZE/2-15);
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 8);

    this.groundY = this.heightAt(this.x, this.z);
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    this.camera.position.set(this.x + s * cp * this.dist, this.groundY + sp2 * this.dist, this.z + c * cp * this.dist);
    this.camera.lookAt(this.x, this.groundY, this.z);

    // Quantized shadow anchor keeps the cached static shadow stable while panning.
    const sx=Math.round(this.x/4)*4,sz=Math.round(this.z/4)*4,sy=this.heightAt(sx,sz);
    this.sun.position.set(sx + 70, sy + 95, sz + 45);
    this.sun.target.position.set(sx, sy, sz);
    this.sun.target.updateMatrixWorld();
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

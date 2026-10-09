import mobility from "../data/mobility.json";
import * as THREE from "three";
import {MAP_SIZE} from "../sim/heightmap";

/** RTS-kaamera: WASD/nooled/serv liigutavad, Q/E pöörab, rull suumib. */
export class RtsCamera {
  // Tactical overview: unit identity comes from class markers at distance.
  x = -105; z = 105; yaw = -Math.PI / 4;
  dist = 280; targetDist = 280; pitch = 0.83;
  groundY = 0;
  private vx=0;private vz=0;private rotationSpeed=0;
  private readonly shadowFocus=new THREE.Vector3();
  private keys = new Set<string>();
  private mouse = { x: -1, y: -1 };

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly sun: THREE.DirectionalLight,
    el: HTMLElement,
  ) {
    this.sun.userData.shadowFocus=this.shadowFocus;
    window.addEventListener("keydown", (e) => {if(!(e.target instanceof Element&&e.target.closest("input,textarea,select,[contenteditable=true]")))this.keys.add(e.key.toLowerCase());});
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener("blur", () => {this.keys.clear();this.vx=this.vz=this.rotationSpeed=0;});
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
    this.vx=this.vz=0;this.groundY=this.heightAt(this.x,this.z);
  }

  update(dt: number): void {
    const k = this.keys, m = this.mouse;
    let f = 0, r = 0;
    if (k.has("w") || k.has("arrowup") || (m.y >= 0 && m.y < 4)) f++;
    if (k.has("s") || k.has("arrowdown") || m.y > innerHeight - 4) f--;
    if (k.has("d") || k.has("arrowright") || m.x > innerWidth - 4) r++;
    if (k.has("a") || k.has("arrowleft") || (m.x >= 0 && m.x < 4)) r--;
    const response=1-Math.exp(-mobility.presentation.cameraResponse*dt);
    this.rotationSpeed+=((Number(k.has("e"))-Number(k.has("q")))*1.6-this.rotationSpeed)*response;
    this.yaw+=this.rotationSpeed*dt;
    const speed=40+this.dist*.9,s=Math.sin(this.yaw),c=Math.cos(this.yaw),length=Math.max(1,Math.hypot(f,r));
    this.vx+=((-s*f+c*r)*speed/length-this.vx)*response;
    this.vz+=((-c*f-s*r)*speed/length-this.vz)*response;
    this.x=clamp(this.x+this.vx*dt,-MAP_SIZE/2+15,MAP_SIZE/2-15);
    this.z=clamp(this.z+this.vz*dt,-MAP_SIZE/2+15,MAP_SIZE/2-15);
    this.dist+=(this.targetDist-this.dist)*(1-Math.exp(-mobility.presentation.cameraZoomResponse*dt));
    this.groundY+=(this.heightAt(this.x,this.z)-this.groundY)*(1-Math.exp(-mobility.presentation.cameraHeightResponse*dt));
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    this.camera.position.set(this.x + s * cp * this.dist, this.groundY + sp2 * this.dist, this.z + c * cp * this.dist);
    this.camera.lookAt(this.x, this.groundY, this.z);

    // Renderer moves the light only when it also refreshes the cached shadow texture.
    this.shadowFocus.set(this.x,this.groundY,this.z);
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

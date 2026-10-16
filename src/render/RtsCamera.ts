import baseLife from '../data/base-life.json';
import {BATTLE_SCALE} from "../sim/battleScale";
import mobility from "../data/mobility.json";
import * as THREE from "three";
import {MAP_SIZE} from "../sim/heightmap";

/** RTS-kaamera: nooled/serv liigutavad, Alt+Q/E pöörab, rull suumib, keskmise nupu lohistamine pöörab. */
export class RtsCamera {
  // Tactical overview: unit identity comes from class markers at distance.
  enabled=true;
  x = -105; z = 105; yaw = -Math.PI / 4;
  dist = 280; targetDist = 280; pitch = 0.83;
  groundY = 0;
  private shakeAmp=0;
  /** Brief screen shake from nearby heavy impacts (skipped when the OS asks for reduced motion). */
  shake(amount:number):void{if(typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;this.shakeAmp=Math.min(1.4,Math.max(this.shakeAmp,amount));}
  private vx=0;private vz=0;private rotationSpeed=0;
  private readonly shadowFocus=new THREE.Vector3();
  private orbit:{id:number;x:number;y:number}|null=null;
  private keys = new Set<string>();
  private mouse = { x: -1, y: -1 };

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly sun: THREE.DirectionalLight,
    el: HTMLElement,
    compact=false,
  ) {
    if(compact)this.dist=this.targetDist=BATTLE_SCALE.compact.cameraDistance;
    this.sun.userData.shadowFocus=this.shadowFocus;
    window.addEventListener("keydown", (e) => {if(!(e.target instanceof Element&&e.target.closest("input,textarea,select,[contenteditable=true]")))this.keys.add((e.altKey?"alt+":"")+e.key.toLowerCase());});
    window.addEventListener("keyup", (e) => {this.keys.delete(e.key.toLowerCase());this.keys.delete("alt+"+e.key.toLowerCase());});
    window.addEventListener("blur", () => {this.keys.clear();this.vx=this.vz=this.rotationSpeed=0;this.orbit=null;});
    window.addEventListener("mousemove", (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    document.addEventListener("mouseleave", () => { this.mouse.x = this.mouse.y = -1; });
    el.addEventListener('pointerdown',e=>{if(e.button!==1||!this.enabled)return;e.preventDefault();this.orbit={id:e.pointerId,x:e.clientX,y:e.clientY};this.rotationSpeed=this.vx=this.vz=0;el.setPointerCapture(e.pointerId);});
    window.addEventListener('pointermove',e=>{const o=this.orbit;if(!o||o.id!==e.pointerId)return;if(!this.enabled){this.orbit=null;return;}this.yaw-=(e.clientX-o.x)*baseLife.camera.orbitSensitivity;this.pitch=clamp(this.pitch+(e.clientY-o.y)*baseLife.camera.pitchSensitivity,baseLife.camera.minimumPitch,baseLife.camera.maximumPitch);o.x=e.clientX;o.y=e.clientY;});
    const release=(e:PointerEvent)=>{if(this.orbit?.id===e.pointerId){this.orbit=null;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);}};
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',()=>{this.orbit=null;});
    el.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
    el.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      if(!this.enabled)return;
      this.targetDist = Math.max(baseLife.camera.minimumDistance, Math.min(MAP_SIZE*.62, this.targetDist * (1 + Math.sign(e.deltaY) * 0.11)));
    }, { passive: false });
  }

  jumpTo(x: number, z: number): void {
    this.x = clamp(x, -MAP_SIZE/2+15, MAP_SIZE/2-15);
    this.z = clamp(z, -MAP_SIZE/2+15, MAP_SIZE/2-15);
    this.vx=this.vz=0;this.groundY=this.heightAt(this.x,this.z);
  }

  update(dt: number): void {
    if(!this.enabled){this.keys.clear();this.vx=this.vz=this.rotationSpeed=0;this.orbit=null;return;}
    const k = this.keys, m = this.mouse;
    let f = 0, r = 0;
    if (k.has("arrowup") || (m.y >= 0 && m.y < 4)) f++;
    if (k.has("arrowdown") || m.y > innerHeight - 4) f--;
    if (k.has("arrowright") || m.x > innerWidth - 4) r++;
    if (k.has("arrowleft") || (m.x >= 0 && m.x < 4)) r--;
    if(this.orbit)f=r=0;
    const response=1-Math.exp(-mobility.presentation.cameraResponse*dt);
    this.rotationSpeed+=((Number(k.has("alt+e"))-Number(k.has("alt+q")))*1.6-this.rotationSpeed)*response;
    this.yaw+=this.rotationSpeed*dt;
    const speed=40+this.dist*.9,s=Math.sin(this.yaw),c=Math.cos(this.yaw),length=Math.max(1,Math.hypot(f,r));
    const targetX=(-s*f+c*r)*speed/length,targetZ=(-c*f-s*r)*speed/length;
    // Integrate the response curve, not the end-of-frame velocity: long frames must not overshoot.
    this.x=clamp(this.x+targetX*dt+(this.vx-targetX)*response/mobility.presentation.cameraResponse,-MAP_SIZE/2+15,MAP_SIZE/2-15);
    this.z=clamp(this.z+targetZ*dt+(this.vz-targetZ)*response/mobility.presentation.cameraResponse,-MAP_SIZE/2+15,MAP_SIZE/2-15);
    this.vx+=(targetX-this.vx)*response;this.vz+=(targetZ-this.vz)*response;
    this.dist+=(this.targetDist-this.dist)*(1-Math.exp(-mobility.presentation.cameraZoomResponse*dt));
    this.groundY+=(this.heightAt(this.x,this.z)-this.groundY)*(1-Math.exp(-mobility.presentation.cameraHeightResponse*dt));
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    this.camera.position.set(this.x + s * cp * this.dist, this.groundY + sp2 * this.dist, this.z + c * cp * this.dist);
    if(this.shakeAmp>.002){const k=this.shakeAmp*(1+this.dist*.004);this.camera.position.x+=(Math.random()-.5)*k;this.camera.position.y+=(Math.random()-.5)*k*.6;this.camera.position.z+=(Math.random()-.5)*k;this.shakeAmp*=Math.exp(-7*dt);}else this.shakeAmp=0;
    this.camera.lookAt(this.x, this.groundY, this.z);

    // Renderer moves the light only when it also refreshes the cached shadow texture.
    this.shadowFocus.set(this.x,this.groundY,this.z);
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

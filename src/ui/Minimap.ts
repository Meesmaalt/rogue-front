import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";
import type { Entity } from "../sim/types";
import { MAP_SIZE, heightAt } from "../sim/heightmap";
import { featureBlocksMovement } from "../sim/mapFeatures";

const S = 176;

function unitColor(u: Entity, playerTeam: 0 | 1): string {
  if (u.team !== playerTeam) {
    // Enemy: role-tinted reds
    if (u.kind === "supply" || u.kind === "generator") return "#f0a050";
    if (u.kind === "aa") return "#ff6688";
    if (u.def.armor === "air" || u.def.category === "heli") return "#ff4466";
    if (u.kind === "tank" || u.kind === "ifv") return "#e0553f";
    if (u.def.speed === 0) return "#c04030";
    return "#e07060";
  }
  // Friendly role colors (Wargame minimap readability)
  if (u.kind === "hq") return "#ffe08a";
  if (u.kind === "supply") return "#9dca6a";
  if (u.kind === "generator") return "#f2d06b";
  if (u.kind === "aa") return "#c07cff";
  if (u.kind === "radar") return "#7ec8ff";
  if (u.def.armor === "air" || u.def.category === "heli" || ["fighter","interceptor","bomber","heli","gunship"].includes(u.kind)) return "#55d0ff";
  if (u.kind === "tank" || u.kind === "ifv" || u.kind === "apc") return "#46b3e6";
  if (u.kind === "artillery" || u.kind === "mlrs") return "#e8a838";
  if (u.kind === "inf" || u.kind === "special" || u.kind === "engineer") return "#7ecf9a";
  if (u.def.speed === 0) return "#8ab0c8";
  return "#46b3e6";
}

function unitSize(u: Entity): number {
  if (u.kind === "hq") return 7;
  if (u.def.speed === 0) return u.kind === "supply" || u.kind === "generator" ? 5 : 4.5;
  if (u.kind === "tank") return 4.2;
  if (u.def.armor === "air") return 3.5;
  if (u.kind === "inf" || u.kind === "special") return 2.2;
  return 3;
}

/** Minikaart: rollivärvid, intel, kaamera. */
export class Minimap {
  enabled = false;
  onJump: (x: number, z: number) => void = () => {};
  onOrder: (x: number, z: number) => void = () => {};
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private dragging = false;
  private frame = 0;
  private elapsed=.1;
  /** Throttle full fog fill (expensive nested loop). */
  private fogCache: HTMLCanvasElement | null = null;
  private fogFrame = -10;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly world: World, private readonly picker: Picker) {
    this.ctx = canvas.getContext("2d")!;
    this.base = this.makeBase();
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("mousedown", (e) => {
      if (!this.enabled) return;
      const [x, z] = this.pos(e);
      if (e.button === 2) this.onOrder(x, z);
      else { this.dragging = true; this.onJump(x, z); }
    });
    addEventListener("mousemove", (e) => { if (this.dragging) { const [x, z] = this.pos(e); this.onJump(x, z); } });
    addEventListener("mouseup", () => (this.dragging = false));
  }

  draw(frameDt:number): void {
    this.elapsed+=frameDt;if(this.elapsed<.1)return;this.elapsed=0;
    const c = this.ctx;
    this.frame++;
    c.drawImage(this.base, 0, 0);

    for (const f of this.world.mapFeatures) {
      const [mx, my] = this.w2m(f.x, f.z);
      c.save(); c.translate(mx, my); c.rotate(-(f.rotation ?? 0));
      c.fillStyle = f.appearance === "forest" ? "#304a2b" : f.appearance === "field" ? "#8b935e" : f.kind === "water" ? "rgba(55,105,125,.72)" : f.kind === "road" || f.kind === "bridge" ? "rgba(210,190,150,.48)" : featureBlocksMovement(f) ? "rgba(45,48,50,.78)" : "rgba(180,170,140,.35)";
      if(f.shape==="ellipse"){c.beginPath();c.ellipse(0,0,f.width/MAP_SIZE*S/2,f.depth/MAP_SIZE*S/2,0,0,Math.PI*2);c.fill();}
      else c.fillRect(-f.width / MAP_SIZE * S / 2, -f.depth / MAP_SIZE * S / 2, f.width / MAP_SIZE * S, f.depth / MAP_SIZE * S);
      c.restore();
    }
    for(const fire of this.world.terrain.fires()){
      if(!this.world.vision.isVisible(this.world.playerTeam,fire.x,fire.z))continue;
      const [x,z]=this.w2m(fire.x,fire.z);c.fillStyle=fire.burnt?"#63605a":"#ff9b36";c.beginPath();c.arc(x,z,2.5,0,Math.PI*2);c.fill();
    }


    // Fog – rebuild every 3rd frame into cache
    if (this.frame - this.fogFrame >= 3 || !this.fogCache) {
      this.fogFrame = this.frame;
      if (!this.fogCache) {
        this.fogCache = document.createElement("canvas");
        this.fogCache.width = this.fogCache.height = S;
      }
      const fc = this.fogCache.getContext("2d")!;
      fc.clearRect(0, 0, S, S);
      const cellW = S / this.world.vision.width, cellH = S / this.world.vision.height;
      for (let iz = 0; iz < this.world.vision.height; iz++) {
        for (let ix = 0; ix < this.world.vision.width; ix++) {
          const p = this.world.vision.cellToWorld(ix, iz);
          const state = this.world.vision.stateAt(this.world.playerTeam, p.x, p.z);
          if (state === 2) continue;
          const x = (p.x + MAP_SIZE / 2) / MAP_SIZE * S;
          const y = (p.z + MAP_SIZE / 2) / MAP_SIZE * S;
          fc.fillStyle = state === 0 ? "rgba(5,8,9,.86)" : "rgba(5,8,9,.48)";
          fc.fillRect(x, y, cellW + 0.5, cellH + 0.5);
        }
      }
    }
    c.drawImage(this.fogCache, 0, 0);

    // Industrial/resource sites: territory is economically meaningful, not just a score point.
    for (const r of this.world.resourcePoints) {
      if (r.controlledBy !== this.world.playerTeam && !this.world.vision.isVisible(this.world.playerTeam, r.x, r.z)) continue;
      const [mx, my] = this.w2m(r.x, r.z);
      const size = 3.5 + Math.min(2, r.level ?? 1);
      c.save();
      c.globalAlpha = r.controlledBy === this.world.playerTeam ? 0.95 : 0.65;
      c.strokeStyle = r.active ? "#f1c76b" : "#a8a8a8";
      c.fillStyle = r.controlledBy === this.world.playerTeam ? "rgba(241,199,107,.22)" : "rgba(160,160,160,.15)";
      c.lineWidth = 1.2;
      if (r.facility === "factory") { c.fillRect(mx-size,my-size,size*2,size*2); c.strokeRect(mx-size,my-size,size*2,size*2); }
      else if (r.facility === "oilfield") { c.beginPath(); c.arc(mx,my,size,0,Math.PI*2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(mx,my-size-2); c.lineTo(mx+2,my-1); c.lineTo(mx,my+size+2); c.lineTo(mx-2,my-1); c.closePath(); c.stroke(); }
      else { c.beginPath(); c.arc(mx,my,size,0,Math.PI*2); c.fill(); c.stroke(); }
      c.restore();
    }

    // Intel contacts (X marks)
    for (const contact of this.world.getIntel(this.world.playerTeam, true)) {
      if (this.world.vision.isVisible(this.world.playerTeam, contact.x, contact.z)) continue;
      const live = this.world.byId.get(contact.entityId);
      if (live && this.world.isSpottedByTeam(live, this.world.playerTeam)) continue;
      const age = this.world.time - contact.lastSeen;
      const alpha = Math.max(0.12, 0.62 - age / 55);
      const [mx, my] = this.w2m(contact.x, contact.z);
      c.strokeStyle = `rgba(224,85,63,${alpha})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(mx - 3, my - 3); c.lineTo(mx + 3, my + 3);
      c.moveTo(mx + 3, my - 3); c.lineTo(mx - 3, my + 3);
      c.stroke();
    }

    // Units – role colors; enemy only if spotted or vision
    for (const u of this.world.entities) {
      if (u.dead) continue;
      if (u.team !== this.world.playerTeam) {
        const spotted = this.world.isSpottedByTeam(u, this.world.playerTeam);
        if (!spotted) continue;
      }
      const [mx, my] = this.w2m(u.x, u.z);
      const s = unitSize(u);
      c.fillStyle = unitColor(u, this.world.playerTeam);
      if (u.def.speed === 0) {
        // Buildings as diamonds / squares
        c.fillRect(mx - s / 2, my - s / 2, s, s);
        if (u.kind === "supply" || u.kind === "generator") {
          c.strokeStyle = "rgba(255,255,255,.5)";
          c.lineWidth = 1;
          c.strokeRect(mx - s / 2, my - s / 2, s, s);
        }
      } else if (u.def.armor === "air" || u.def.category === "heli") {
        // Air: triangle
        c.beginPath();
        c.moveTo(mx, my - s * 0.7);
        c.lineTo(mx + s * 0.55, my + s * 0.45);
        c.lineTo(mx - s * 0.55, my + s * 0.45);
        c.closePath();
        c.fill();
      } else {
        c.beginPath();
        c.arc(mx, my, s * 0.45, 0, Math.PI * 2);
        c.fill();
      }
      // Out of supply pulse for friendlies
      if (u.team === this.world.playerTeam && u.def.speed > 0 && !this.world.isInSupply(u)) {
        c.strokeStyle = "rgba(240,80,60,.85)";
        c.lineWidth = 1;
        c.strokeRect(mx - s * 0.6, my - s * 0.6, s * 1.2, s * 1.2);
      }
    }

    // Camera frustum
    c.strokeStyle = "rgba(255,255,255,.85)";
    c.lineWidth = 1;
    c.beginPath();
    ([[-1, 1], [1, 1], [1, -1], [-1, -1]] as const).forEach(([a, b], i) => {
      const g = this.picker.groundAtNDC(a, b), [mx, my] = this.w2m(g.x, g.z);
      if (i) c.lineTo(mx, my); else c.moveTo(mx, my);
    });
    c.closePath();
    c.stroke();
  }

  private w2m(x: number, z: number): [number, number] {
    return [((x + MAP_SIZE / 2) / MAP_SIZE) * S, ((z + MAP_SIZE / 2) / MAP_SIZE) * S];
  }

  private pos(e: MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * MAP_SIZE - MAP_SIZE / 2, ((e.clientY - r.top) / r.height) * MAP_SIZE - MAP_SIZE / 2];
  }

  private makeBase(): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const g = cv.getContext("2d")!, im = g.createImageData(S, S);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const x = (px / S) * MAP_SIZE - MAP_SIZE / 2, z = (py / S) * MAP_SIZE - MAP_SIZE / 2, h = heightAt(x, z);
      const k = Math.max(0.55, Math.min(1.3, 0.85 + h * 0.012 + (h - heightAt(x + 4, z + 4)) * 0.05)), i = (py * S + px) * 4;
      const green=this.world.mapFeatures.some(f=>f.appearance==="field");
      im.data[i] = Math.min(255, (green?103:150) * k); im.data[i + 1] = Math.min(255, (green?128:133) * k); im.data[i + 2] = Math.min(255, (green?77:92) * k); im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return cv;
  }
}

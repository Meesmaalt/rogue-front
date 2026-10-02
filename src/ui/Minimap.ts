import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";
import { MAP_SIZE, heightAt } from "../sim/heightmap";
import { featureBlocksMovement } from "../sim/mapFeatures";

const S = 176;

/** Minikaart: maastik, üksused, kaamera nähtav ala. Vasak klõps = kaamera, parem klõps = liikumiskäsk. */
export class Minimap {
  enabled = false;
  onJump: (x: number, z: number) => void = () => {};
  onOrder: (x: number, z: number) => void = () => {};
  private ctx: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private dragging = false;

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

  draw(): void {
    const c = this.ctx;
    c.drawImage(this.base, 0, 0);
    // Kaardi põhistruktuur jääb minimapil nähtavaks ka siis, kui üksused on udus.
    for (const f of this.world.mapFeatures) {
      const [mx, my] = this.w2m(f.x, f.z);
      c.save(); c.translate(mx, my); c.rotate(f.rotation ?? 0);
      c.fillStyle = f.kind === "road" || f.kind === "bridge" ? "rgba(210,190,150,.48)" : featureBlocksMovement(f) ? "rgba(45,48,50,.78)" : "rgba(180,170,140,.35)";
      c.fillRect(-f.width / MAP_SIZE * S / 2, -f.depth / MAP_SIZE * S / 2, f.width / MAP_SIZE * S, f.depth / MAP_SIZE * S);
      c.restore();
    }
    // Fog of war: uurimata on täiesti peidus, uuritud ala on tume, nähtav ala jääb vabaks.
    const cellW = S / this.world.vision.width, cellH = S / this.world.vision.height;
    for (let iz = 0; iz < this.world.vision.height; iz++) for (let ix = 0; ix < this.world.vision.width; ix++) {
      const p = this.world.vision.cellToWorld(ix, iz);
      const state = this.world.vision.stateAt(this.world.playerTeam, p.x, p.z);
      if (state === 2) continue;
      const x = (p.x + MAP_SIZE / 2) / MAP_SIZE * S;
      const y = (p.z + MAP_SIZE / 2) / MAP_SIZE * S;
      c.fillStyle = state === 0 ? "rgba(5,8,9,.86)" : "rgba(5,8,9,.48)";
      c.fillRect(x, y, cellW + .5, cellH + .5);
    }
    for (const u of this.world.entities) {
      if (u.dead || (u.team === 1 && !this.world.vision.isVisible(this.world.playerTeam, u.x, u.z))) continue;
      const [mx, my] = this.w2m(u.x, u.z), s = u.def.speed === 0 ? 6 : u.kind === "tank" ? 4 : 2.5;
      c.fillStyle = u.team ? "#e0553f" : "#46b3e6";
      c.fillRect(mx - s / 2, my - s / 2, s, s);
    }
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
      im.data[i] = Math.min(255, 150 * k); im.data[i + 1] = Math.min(255, 133 * k); im.data[i + 2] = Math.min(255, 92 * k); im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return cv;
  }
}

import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";
import type { SelectionController } from "../input/SelectionController";

/** 2D-kiht renderduse peal: elumõõdikud ja valikukast. */
export class Overlay {
  private ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(world: World, picker: Picker, sel: SelectionController): void {
    const c = this.ctx, w = innerWidth, h = innerHeight;
    c.clearRect(0, 0, w, h);
    for (const u of world.entities) {
      if (u.dead || (u.team === 1 && !world.vision.isVisible(world.playerTeam, u.x, u.z)) || (u.hp >= u.def.hp && !sel.selected.has(u.id))) continue;
      const p = picker.toScreen(u.x, u.y + u.def.height + 1, u.z);
      if (p.z > 1 || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
      const bw = Math.max(26, u.def.radius * picker.pxPerUnit(u.x, u.y, u.z) * 1.6);
      c.fillStyle = "rgba(8,10,11,.85)";
      c.fillRect(p.x - bw / 2 - 1, p.y - 1, bw + 2, 6);
      c.fillStyle = u.team ? "#e0553f" : "#6fd6a0";
      c.fillRect(p.x - bw / 2, p.y, bw * Math.max(0, u.hp / u.def.hp), 4);
    }
    const d = sel.drag;
    if (d && (Math.abs(d.x1 - d.x0) > 5 || Math.abs(d.y1 - d.y0) > 5)) {
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), bw = Math.abs(d.x1 - d.x0), bh = Math.abs(d.y1 - d.y0);
      c.fillStyle = "rgba(242,163,58,.1)"; c.fillRect(x, y, bw, bh);
      c.strokeStyle = "#f2a33a"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }
}

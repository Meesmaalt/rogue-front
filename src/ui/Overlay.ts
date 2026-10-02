import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import type { Picker } from "../input/Picker";
import type { SelectionController } from "../input/SelectionController";
import type { BuildableKind } from "../sim/buildings";

/** 2D-kiht renderduse peal: elumõõdikud ja valikukast. */
export interface BuildPreview { point: {x:number;z:number} | null; kind: BuildableKind | null; rotation: number; valid: boolean }

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

  draw(world: World, picker: Picker, sel: SelectionController, preview: BuildPreview | null = null): void {
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
    if (preview?.point && preview.kind) {
      const p = picker.toScreen(preview.point.x, heightAt(preview.point.x, preview.point.z) + 0.4, preview.point.z);
      const size = ({barracks:7,factory:9,helipad:9,airbase:13,refinery:8,supply:6,radar:6,bunker:6,aa:6,generator:6,shipyard:12,landCommand:8,airCommand:8,seaCommand:9,combatEngineer:7,landStrategy:8,airStrategy:8,seaStrategy:9} as Record<BuildableKind,number>)[preview.kind] * picker.pxPerUnit(preview.point.x, heightAt(preview.point.x, preview.point.z) + 0.4, preview.point.z);
      c.save(); c.translate(p.x,p.y); c.rotate(preview.rotation);
      c.fillStyle = preview.valid ? "rgba(90,210,145,.20)" : "rgba(220,70,60,.22)";
      c.strokeStyle = preview.valid ? "#66d9a0" : "#e0553f"; c.lineWidth = 2;
      c.fillRect(-size/2,-size/2,size,size); c.strokeRect(-size/2,-size/2,size,size);
      c.restore();
      c.fillStyle = preview.valid ? "#66d9a0" : "#e0553f"; c.font = "12px sans-serif";
      c.fillText(preview.valid ? "EHITADA · R = pööra" : "EHITADA EI SAA", p.x + 10, p.y - 10);
    }

    const d = sel.drag;
    if (d && (Math.abs(d.x1 - d.x0) > 5 || Math.abs(d.y1 - d.y0) > 5)) {
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), bw = Math.abs(d.x1 - d.x0), bh = Math.abs(d.y1 - d.y0);
      c.fillStyle = "rgba(242,163,58,.1)"; c.fillRect(x, y, bw, bh);
      c.strokeStyle = "#f2a33a"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }
}

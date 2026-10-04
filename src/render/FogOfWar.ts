import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";

/** Ekraanipealne udumask: uuritud ala on tumendatud, nähtav ala avatud. */
export class FogOfWar {
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private frame = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.style.pointerEvents = "none";
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    // Cap fog canvas at 1x DPR – full-res + blur was a major GPU cost
    this.dpr = 1;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  draw(world: World, picker: Picker): void {
    // Draw every frame to avoid flicker (skipping frames caused visible strobing)
    const c = this.ctx, w = this.canvas.width, h = this.canvas.height;
    c.clearRect(0, 0, w, h);

    c.fillStyle = "rgba(5,8,9,.38)";
    c.fillRect(0, 0, w, h);

    c.save();
    c.globalCompositeOperation = "destination-out";
    // No CSS blur filter – soft edges via gradient only
    for (const u of world.entities) {
      if (u.dead || u.team !== world.playerTeam) continue;
      const p = picker.toScreen(u.x, u.y + 0.5, u.z);
      if (p.z > 1) continue;
      const base = u.kind === "hq" ? 42 : u.kind === "bunker" ? 34 : u.kind === "tank" ? 30 : u.kind === "radar" ? 50 : 24;
      const radius = Math.max(12, base * picker.pxPerUnit(u.x, u.y, u.z));
      const g = c.createRadialGradient(p.x, p.y, radius * 0.55, p.x, p.y, radius);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(p.x, p.y, radius, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
}

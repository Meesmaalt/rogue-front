import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";

/** Ekraanipealne udumask: uuritud ala on tumendatud, nähtav ala avatud. */
export class FogOfWar {
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.style.pointerEvents = "none";
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * this.dpr;
    this.canvas.height = innerHeight * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  draw(world: World, picker: Picker): void {
    const c = this.ctx, w = innerWidth, h = innerHeight;
    c.clearRect(0, 0, w, h);

    // Uuritud maa: tume, kuid läbipaistev. See säilitab maastiku kuju.
    c.fillStyle = "rgba(5,8,9,.46)";
    c.fillRect(0, 0, w, h);

    // Hetkel nähtav ala lõigatakse maskist välja. Raadius on sama suurusjärk
    // kui simulaatori Vision, kuid ekraanil sujuvama servaga.
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.filter = "blur(5px)";
    for (const u of world.entities) {
      if (u.dead || u.team !== world.playerTeam) continue;
      const p = picker.toScreen(u.x, u.y + 0.5, u.z);
      if (p.z > 1) continue;
      const base = u.kind === "hq" ? 42 : u.kind === "bunker" ? 34 : u.kind === "tank" ? 30 : u.kind === "radar" ? 50 : 24;
      const radius = Math.max(12, base * picker.pxPerUnit(u.x, u.y, u.z));
      const g = c.createRadialGradient(p.x, p.y, radius * 0.62, p.x, p.y, radius);
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

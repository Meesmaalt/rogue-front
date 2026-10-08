import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";

/**
 * Screen fog: rebuild offscreen at 10 Hz, including while the camera moves in pause,
 * and preserve the composited canvas between changes.
 */
export class FogOfWar {
  private readonly ctx: CanvasRenderingContext2D;
  private off: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private lastVisionTick = -1;
  private readonly stamp=document.createElement("canvas");
  private mode: "wargame" | "reduced" | "off" = "wargame";

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.stamp.width=this.stamp.height=128;
    const brush=this.stamp.getContext("2d")!,g=brush.createRadialGradient(64,64,25.6,64,64,64);
    g.addColorStop(0,"rgba(0,0,0,1)");g.addColorStop(.65,"rgba(0,0,0,.75)");g.addColorStop(1,"rgba(0,0,0,0)");
    brush.fillStyle=g;brush.fillRect(0,0,128,128);
    canvas.style.pointerEvents = "none";
    this.off = document.createElement("canvas");
    this.offCtx = this.off.getContext("2d")!;
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    const w = innerWidth, h = innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.off.width = w;
    this.off.height = h;
    this.lastVisionTick = -1; // force rebuild
  }

  setMode(mode: "wargame" | "reduced" | "off"): void { this.mode = mode; this.lastVisionTick = -1; }

  draw(world: World, picker: Picker): void {
    if (this.canvas.width !== innerWidth || this.canvas.height !== innerHeight) this.resize();

    if(this.mode==="off"){
      if(this.lastVisionTick!==0){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.lastVisionTick=0;}
      return;
    }
    // Rebuild fog mask at most ~10 Hz or when size changes
    const stamp = Math.floor(performance.now() / 100);
    if(stamp===this.lastVisionTick)return;
    this.lastVisionTick=stamp;
    this.rebuild(world,picker);

    // The separate overlay retains pixels; copy only when its mask changes.
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(this.off, 0, 0);
  }

  private rebuild(world: World, picker: Picker): void {
    const c = this.offCtx;
    const w = this.off.width, h = this.off.height;
    c.clearRect(0, 0, w, h);
    // Slightly softer fog — less aggressive contrast reduces perceived flicker
    c.fillStyle = this.mode === "reduced" ? "rgba(6, 9, 11, 0.18)" : "rgba(6, 9, 11, 0.34)";
    c.fillRect(0, 0, w, h);

    c.save();
    c.globalCompositeOperation = "destination-out";
    for (const u of world.entities) {
      if (u.dead || u.loadedIntoId!=null || u.underConstruction || u.team !== world.playerTeam) continue;
      const p = picker.toScreen(u.x, u.y + 0.5, u.z);
      if (p.z > 1) continue;
      const optics = u.def.opticsRange ?? 40;
      const base =
        u.kind === "hq" ? 48 :
        u.kind === "radar" ? 52 :
        u.kind === "bunker" ? 34 :
        Math.max(22, Math.min(44, optics * 0.55));
      const radius = Math.max(14, base * picker.pxPerUnit(u.x, u.y, u.z) * (this.mode === "reduced" ? 1.25 : 1));
      if(p.x+radius<0||p.x-radius>w||p.y+radius<0||p.y-radius>h)continue;
      c.drawImage(this.stamp,p.x-radius,p.y-radius,radius*2,radius*2);
    }
    c.restore();
  }
}

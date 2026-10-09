import type { World } from "../sim/World";
import type { Picker } from "../input/Picker";

/**
 * Half-resolution screen fog follows the current camera and interpolated observers.
 * Draw directly into the retained layer; no full-resolution offscreen copy.
 */
export class FogOfWar {
  private readonly ctx: CanvasRenderingContext2D;
  private lastView=-1;
  private lastTime=-1;
  private lastAlpha=-1;
  private width=0;
  private height=0;
  private readonly stamp=document.createElement("canvas");
  private mode: "wargame" | "reduced" | "off" = "wargame";

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.stamp.width=this.stamp.height=128;
    const brush=this.stamp.getContext("2d")!,g=brush.createRadialGradient(64,64,25.6,64,64,64);
    g.addColorStop(0,"rgba(0,0,0,1)");g.addColorStop(.65,"rgba(0,0,0,.75)");g.addColorStop(1,"rgba(0,0,0,0)");
    brush.fillStyle=g;brush.fillRect(0,0,128,128);
    canvas.style.pointerEvents = "none";
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    this.width=innerWidth;this.height=innerHeight;
    // Soft fog does not need native/DPR resolution. Quarter as many pixels, one surface.
    this.canvas.width=Math.ceil(this.width*.5);this.canvas.height=Math.ceil(this.height*.5);
    this.canvas.style.width=this.width+"px";this.canvas.style.height=this.height+"px";
    this.ctx.setTransform(this.canvas.width/this.width,0,0,this.canvas.height/this.height,0,0);
    this.lastView=-1;this.lastTime=-1;this.lastAlpha=-1;
  }

  setMode(mode: "wargame" | "reduced" | "off"): void { this.mode=mode;this.lastView=-1; }

  draw(world:World,picker:Picker,alpha=1):void {
    if(this.width!==innerWidth||this.height!==innerHeight)this.resize();
    if(this.mode==="off"){
      if(this.lastView!==0){this.ctx.clearRect(0,0,this.width,this.height);this.lastView=0;}
      return;
    }
    const view=picker.viewVersion;
    if(view===this.lastView&&world.time===this.lastTime&&alpha===this.lastAlpha)return;
    this.lastView=view;this.lastTime=world.time;this.lastAlpha=alpha;
    this.rebuild(world,picker,alpha);
  }

  private rebuild(world: World, picker: Picker,alpha:number): void {
    const c = this.ctx;
    const w=this.width,h=this.height;
    c.clearRect(0, 0, w, h);
    // Slightly softer fog — less aggressive contrast reduces perceived flicker
    c.fillStyle = this.mode === "reduced" ? "rgba(6, 9, 11, 0.18)" : "rgba(6, 9, 11, 0.34)";
    c.fillRect(0, 0, w, h);

    c.save();
    c.globalCompositeOperation = "destination-out";
    for (const u of world.entities) {
      if (u.dead || u.loadedIntoId!=null || u.underConstruction || u.team !== world.playerTeam) continue;
      const x=u.px+(u.x-u.px)*alpha,y=(u.py??u.y)+(u.y-(u.py??u.y))*alpha,z=u.pz+(u.z-u.pz)*alpha;
      const p=picker.toScreen(x,y+.5,z);
      if (p.z > 1) continue;
      const optics = u.def.opticsRange ?? 40;
      const base =
        u.kind === "hq" ? 48 :
        u.kind === "radar" ? 52 :
        u.kind === "bunker" ? 34 :
        Math.max(22, Math.min(44, optics * 0.55));
      const radius = Math.max(14, base * picker.pxPerUnit(x,y,z) * (this.mode === "reduced" ? 1.25 : 1));
      if(p.x+radius<0||p.x-radius>w||p.y+radius<0||p.y-radius>h)continue;
      c.drawImage(this.stamp,p.x-radius,p.y-radius,radius*2,radius*2);
    }
    c.restore();
  }
}

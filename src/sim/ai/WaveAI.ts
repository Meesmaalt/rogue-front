import type { World } from "../World";
import type { Entity } from "../types";


export type AIPersonality = "aggressive" | "defensive" | "economic";

export class WaveAI {
  waveTimer = 22; wave = 0; personality: AIPersonality = "aggressive"; difficulty: "easy" | "normal" | "hard" = "normal";
  setProfile(personality: AIPersonality, difficulty: "easy" | "normal" | "hard" = "normal"): void { this.personality = personality; this.difficulty = difficulty; }

  update(w: World, dt: number): void {
    const hq = w.hq[1]; if (!hq || hq.dead) return;
    this.waveTimer -= dt; if (this.waveTimer > 0) return;
    this.waveTimer = this.personality === "aggressive" ? 24 : this.personality === "economic" ? 36 : 30;
    this.wave++;
    const E = w.bases[1], P = w.bases[0];
    const mult = this.difficulty === "easy" ? 0.7 : this.difficulty === "hard" ? 1.35 : 1;
    const tanks = Math.max(1, Math.floor((2 + Math.floor(this.wave / 2)) * mult));
    const inf = Math.max(1, Math.floor((2 + this.wave) * mult));
    for (let i=0;i<tanks;i++) { const u=w.spawn("tank",1,E.x-14-i*6,E.z+17+(i%2)*4); this.order(u,P); }
    for (let i=0;i<inf;i++) { const u=w.spawn("inf",1,E.x-12-i*3,E.z+25+(i%3)*3); this.order(u,P); }
    if (this.personality !== "defensive" && this.wave % 3 === 0) { const u=w.spawn("heli",1,E.x-18,E.z+10); this.order(u,P); }
    if (this.personality === "defensive" && this.wave % 2 === 0) w.spawn("aa",1,E.x-24,E.z+8);
    if (this.personality === "economic") w.spawn("refinery",1,E.x+18,E.z-10);
  }

  private order(u: Entity, P: {x:number;z:number}): void { u.mode="amove"; u.dest={x:P.x,z:P.z}; }
}

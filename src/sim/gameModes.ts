import type { MissionDef, Point, Team } from "./types";
import type { World } from "./World";

export type MatchMode = "annihilation" | "conquest" | "breakthrough" | "attrition" | "assault" | "skirmish";
export interface ModeRules { mode: MatchMode; targetScore: number; timeLimit: number; description: string; }
export const MODE_RULES: Record<MatchMode, ModeRules> = {
  annihilation: { mode:"annihilation", targetScore:0, timeLimit:0, description:"Hävita vastase lahingujõud ja baas." },
  conquest: { mode:"conquest", targetScore:1000, timeLimit:1200, description:"Hoia ressursipunkte ja kogu 1000 kontrollpunkti. Ajapiiril võidab suurem skoor." },
  breakthrough: { mode:"breakthrough", targetScore:20, timeLimit:1200, description:"Hoia maaväega vastase tagalasektorit 20 sekundit. Vastase kohalolek katkestab hõive." },
  attrition: { mode:"attrition", targetScore:1500, timeLimit:1200, description:"Hävita vastase üksusi 1500 krediidi väärtuses. Ajapiiril võidab suurem skoor." },
  assault: { mode:"assault", targetScore:0, timeLimit:900, description:"Sina ründad: hävita vastase HQ 15 minutiga. Kaitsja võidab ajapiiril." },
  skirmish: { mode:"skirmish", targetScore:0, timeLimit:0, description:"Ehita baas, varusta väed ja hävita vastase HQ." },
};
export interface MatchModeState { score: [number,number]; hold: [number,number]; losses: [number,number]; }

/** Victory is simulation state, independent of rendering and event draining. */
export class MatchModeController {
  readonly rules: ModeRules;
  private score: [number,number] = [0,0];
  private hold: [number,number] = [0,0];
  private baseline: [number,number];
  private targets: [Point,Point];
  constructor(private readonly world: World, mode: MatchMode, mission?: MissionDef) {
    this.rules = MODE_RULES[mode] ?? MODE_RULES.skirmish;
    const bases = mission?.map.bases ?? world.bases;
    this.targets = [{x:bases[1].x,z:bases[1].z},{x:bases[0].x,z:bases[0].z}];
    this.baseline = [...world.lossValue];
  }
  get mode(): MatchMode { return this.rules.mode; }
  get scores(): [number,number] { return [...this.score]; }
  get damageScores(): [number,number] { return this.scores; }
  private result(winner: Team): void { this.world.status = winner === this.world.playerTeam ? "won" : "lost"; }
  tick(dt: number): void {
    if (this.world.status !== "running") return;
    for (const team of [0,1] as const) if (this.world.hq[team]?.dead) { this.result(team === 0 ? 1 : 0); return; }
    if (this.mode === "annihilation") {
      for (const team of [0,1] as const) if (!this.world.entities.some(e=>!e.dead&&e.team===team)) { this.result(team === 0 ? 1 : 0); return; }
    } else if (this.mode === "conquest") {
      for (const team of [0,1] as const) this.score[team] += this.world.areaControl[team] * dt * 0.9;
    } else if (this.mode === "attrition") {
      this.score = [this.world.lossValue[1]-this.baseline[1], this.world.lossValue[0]-this.baseline[0]];
    } else if (this.mode === "breakthrough") {
      for (const team of [0,1] as const) {
        const p = this.targets[team];
        const occupants = this.world.entities.filter(e=>!e.dead&&!e.underConstruction&&e.loadedIntoId==null&&e.def.speed>0&&e.def.damage>0&&e.def.domain!=="sea"&&e.def.armor!=="air"&&e.def.category!=="heli"&&Math.hypot(e.x-p.x,e.z-p.z)<32);
        const eligible = occupants.some(e=>e.team===team) && !occupants.some(e=>e.team!==team);
        this.hold[team] = eligible ? this.hold[team]+dt : 0;
        this.score[team] = this.hold[team];
      }
    }
    if (this.rules.targetScore > 0) for (const team of [0,1] as const) if (this.score[team]>=this.rules.targetScore) { this.result(team); return; }
    if (this.rules.timeLimit > 0 && this.world.time >= this.rules.timeLimit) {
      if (this.mode === "assault" || this.mode === "breakthrough") this.result(1);
      else if (this.score[0] === this.score[1]) this.result(this.world.areaControl[0] > this.world.areaControl[1] ? 0 : 1);
      else this.result(this.score[0] > this.score[1] ? 0 : 1);
    }
  }
  snapshot(): MatchModeState { return {score:[...this.score],hold:[...this.hold],losses:[...this.baseline]}; }
  restore(s: MatchModeState): void { this.score=[...s.score]; this.hold=[...s.hold]; this.baseline=[...s.losses]; }
  label(): string { return `${this.mode.toUpperCase()} · ${this.rules.description}`; }
}

import type { MissionDef, MissionObjectiveDef, MissionTriggerDef, MissionObjectiveKind } from "./types";
import type { World } from "./World";

interface ObjectiveState {
  def: MissionObjectiveDef;
  complete: boolean;
  progress: number;
  holdTime: number;
  initialTargets: number;
}

const SAVE_KEY = "rogue-front.missions.v1";

export class MissionController {
  readonly mission: MissionDef;
  private readonly objectives: ObjectiveState[];
  private readonly fired = new Set<string>();
  private message = "";
  private messageTimer = 0;

  constructor(mission: MissionDef, private readonly world: World) {
    this.mission = mission;
    this.objectives = mission.objectives.map((def) => ({
      def, complete: false, progress: 0, holdTime: 0,
      initialTargets: (def.kind === "destroy" || def.kind === "sabotage") ? this.countTargets(def) : 0,
    }));
  }

  tick(dt: number): void {
    if (this.world.status !== "running") return;
    for (const state of this.objectives) this.updateObjective(state, dt);
    this.runTriggers();
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (this.objectives.some(o=>o.def.primary!==false) && this.objectives.filter((o) => o.def.primary !== false).every((o) => o.complete)) this.world.status = "won";
  }

  snapshot() {
    return { objectives:this.objectives.map(o=>({complete:o.complete,progress:o.progress,holdTime:o.holdTime,initialTargets:o.initialTargets})),
      fired:[...this.fired],message:this.message,messageTimer:this.messageTimer };
  }
  restore(s: ReturnType<MissionController["snapshot"]>): void {
    s.objectives.forEach((o,i)=>{ if(this.objectives[i]) Object.assign(this.objectives[i],o); });
    this.fired.clear(); s.fired.forEach(id=>this.fired.add(id)); this.message=s.message; this.messageTimer=s.messageTimer;
  }

  get messageText(): string { return this.messageTimer > 0 ? this.message : ""; }

  get activePhase(): number {
    let phase = 1;
    for (const o of this.objectives) {
      if (o.def.requires?.length && o.def.requires.every(id => this.objectiveComplete(id))) phase = Math.max(phase, this.objectives.indexOf(o) + 1);
    }
    return phase;
  }

  summary(): Array<{ title: string; description: string; complete: boolean; progress: number }> {
    return this.objectives.map((o) => ({
      title: o.def.title, description: o.def.description, complete: o.complete, progress: o.progress,
    }));
  }

  private updateObjective(state: ObjectiveState, dt: number): void {
    if (state.complete) { state.progress = 1; return; }
    const d = state.def;
    if (d.requires?.some(id => !this.objectiveComplete(id))) { state.progress = 0; return; }
    switch (d.kind) {
      case "destroy": {
        const destroyed = Math.max(0, state.initialTargets - this.countTargets(d));
        const required = Math.max(1, d.target?.count ?? 1);
        state.progress = Math.min(1, destroyed / required);
        state.complete = destroyed >= required;
        break;
      }
      case "reach": {
        const count = this.unitsAtPoint(d);
        state.progress = count > 0 ? 1 : 0;
        state.complete = count > 0;
        break;
      }
      case "defend": {
        const required = Math.max(1, d.target?.count ?? 1);
        const count = this.unitsAtPoint(d);
        if (count >= required && !this.world.entities.some(e=>!e.dead&&e.team!==this.world.playerTeam&&e.loadedIntoId==null&&e.def.speed>0&&d.point&&Math.hypot(e.x-d.point.x,e.z-d.point.z)<=(d.radius??12))) state.holdTime += dt;
        else state.holdTime = 0;
        state.progress = Math.min(1, state.holdTime / Math.max(0.01, d.duration ?? 1));
        state.complete = state.holdTime >= (d.duration ?? 1);
        break;
      }
      case "capture": {
        const point = d.point;
        const rp = point ? this.world.resourcePoints.find(r => Math.hypot(r.x-point.x,r.z-point.z) <= (d.radius ?? 12)) : null;
        state.progress = rp?.controlledBy === this.world.playerTeam ? 1 : 0;
        state.complete = state.progress >= 1;
        break;
      }
      case "sabotage": {
        const remaining = this.world.entities.filter(e => !e.dead && e.team === (d.target?.team ?? 1) && (!d.target?.kind || e.kind === d.target.kind) && (e.disabledUntil ?? 0) <= this.world.time).length;
        const initial = Math.max(1, state.initialTargets);
        const done = Math.max(0, initial - remaining);
        const required = Math.max(1, d.target?.count ?? 1);
        state.progress = Math.min(1, done / required);
        state.complete = done >= required;
        break;
      }
      case "build": {
        const count=this.world.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===(d.target?.team??this.world.playerTeam)&&e.kind===d.target?.kind).length;
        state.progress=Math.min(1,count/Math.max(1,d.target?.count??1));state.complete=state.progress>=1;break;
      }
      case "produce": {
        const count=d.unitKind?this.world.producedCounts[d.unitKind]??0:0;
        state.progress=Math.min(1,count/Math.max(1,d.target?.count??1));state.complete=state.progress>=1;break;
      }
      case "deliver": {
        const t=this.world.playerTeam;const count=this.world.roadCargoDelivered[t]+this.world.airCargoDelivered[t];
        state.progress=Math.min(1,count/Math.max(1,d.target?.count??100));state.complete=state.progress>=1;break;
      }
      case "survive":
        state.progress = Math.min(1, this.world.time / Math.max(0.01, d.duration ?? 1));
        state.complete = this.world.time >= (d.duration ?? 1);
        break;
    }
  }

  private countTargets(d: MissionObjectiveDef): number {
    return this.world.entities.filter((e) =>
      !e.dead && (d.target?.team === undefined || e.team === d.target.team) &&
      (d.target?.kind === undefined || e.kind === d.target.kind)).length;
  }

  private unitsAtPoint(d: MissionObjectiveDef): number {
    if (!d.point) return 0;
    const radius = d.radius ?? 12;
    return this.world.entities.filter((e) =>
      !e.dead && e.team === this.world.playerTeam && e.loadedIntoId==null && (!d.unitKind || e.kind === d.unitKind) &&
      Math.hypot(e.x - d.point!.x, e.z - d.point!.z) <= radius).length;
  }

  private runTriggers(): void {
    for (const trigger of this.mission.triggers ?? []) {
      if (this.fired.has(trigger.id)) continue;
      if (!this.triggerReady(trigger)) continue;
      this.fired.add(trigger.id);
      if (trigger.message) {
        this.message = trigger.message;
        this.messageTimer = 5;
      }
      const s = trigger.spawn;
      if (s) {
        const count = Math.max(1, s.count ?? 1);
        const spacing = s.spacing ?? 4;
        for (let i = 0; i < count; i++) {
          const u = this.world.spawn(s.kind, s.team, s.x + i * spacing, s.z);
          const hq = this.world.hq[0];
          if (s.team === 1 && hq && !hq.dead) { u.mode = "amove"; u.dest = { x: hq.x, z: hq.z }; }
        }
      }
    }
  }

  private triggerReady(trigger: MissionTriggerDef): boolean {
    const when = trigger.when;
    if (when.time !== undefined && this.world.time < when.time) return false;
    if (when.objective !== undefined && !this.objectiveComplete(when.objective)) return false;
    if (when.all?.some((id) => !this.objectiveComplete(id))) return false;
    return true;
  }

  private objectiveComplete(id: string): boolean {
    return this.objectives.find((o) => o.def.id === id)?.complete ?? false;
  }

  static loadProgress(): Set<string> {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const ids = raw ? JSON.parse(raw) as unknown : [];
      return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
    } catch { return new Set(); }
  }

  static markCompleted(id: string): void {
    const done = MissionController.loadProgress();
    done.add(id);
    localStorage.setItem(SAVE_KEY, JSON.stringify([...done]));
  }
}

export function missionObjectiveKindLabel(kind: MissionObjectiveKind): string {
  return ({ build:"Ehita", produce:"Tooda", deliver:"Varusta", destroy: "Hävita", defend: "Kaitse", reach: "Jõua", survive: "Ela üle", capture: "Hõiva", sabotage: "Saboteeri" })[kind];
}

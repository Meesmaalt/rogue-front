import type { World } from "./World";
import type { Entity, Point, Team } from "./types";

export type SectorState = "friendly" | "contested" | "enemy" | "neutral";
export interface OperationalSector {
  id: string; center: Point; radius: number; state: SectorState;
  value: number; supplyAccess: number; threat: [number, number]; control: [number, number];
}
export interface OperationalPlan {
  team: Team; objective: "secure" | "attack" | "defend" | "raid" | "withdraw";
  sectorId: string | null; reserveRatio: number; committed: number; lastDecision: number;
}

/** Phase 83: persistent operational map layer. Turns resource areas and bases into sectors. */
export class OperationalMap {
  readonly sectors: OperationalSector[];
  constructor(private readonly world: World) {
    const resources = world.resourcePoints.map((r, i) => ({
      id: `resource-${i}`, center: { x: r.x, z: r.z }, radius: Math.max(24, r.radius * 2.2),
      value: 1 + (r.level ?? 1) * 0.5 + ((r.facility === "factory" || r.facility === "oilfield") ? 0.7 : 0),
    }));
    const bases = world.bases.flatMap((b, i) => [{ id: `base-${i}`, center: { x: b.x, z: b.z }, radius: Math.max(34, b.r * 1.4), value: 2.2 }]);
    const mid = { x: (world.bases[0].x + world.bases[1].x) / 2, z: (world.bases[0].z + world.bases[1].z) / 2 };
    this.sectors = [...bases, ...resources, { id: "center", center: mid, radius: 42, value: 1.5 }].map(s => ({
      ...s, state: "neutral" as SectorState, supplyAccess: 0, threat: [0, 0] as [number, number], control: [0, 0] as [number, number],
    }));
  }
  tick(): void {
    for (const s of this.sectors) {
      const counts: [number, number] = [0, 0];
      const threat: [number, number] = [0, 0];
      for (const e of this.world.entities) {
        if (e.dead || e.loadedIntoId != null || Math.hypot(e.x-s.center.x,e.z-s.center.z) > s.radius) continue;
        if (e.team === 0 || e.team === 1) counts[e.team] += e.def.speed > 0 ? 1 : 0;
        if (e.team === 0 || e.team === 1) threat[e.team] += this.combatValue(e);
      }
      s.control[0] = counts[0]; s.control[1] = counts[1]; s.threat[0] = threat[0]; s.threat[1] = threat[1];
      if (counts[0] && !counts[1]) s.state = "friendly"; else if (counts[1] && !counts[0]) s.state = "enemy"; else if (counts[0] && counts[1]) s.state = "contested"; else s.state = "neutral";
      s.supplyAccess = Math.max(this.supplyReach(0, s.center), this.supplyReach(1, s.center));
    }
  }
  private combatValue(e: Entity): number { return e.def.speed <= 0 ? 0.5 : Math.max(0.4, (e.def.damage || 1) / 18) * (1 + e.veteran * 0.08); }
  private supplyReach(team: Team, p: Point): number {
    const d = this.world.nearestSupplyDepot(team, p, true); if (!d) return 0;
    const dist = Math.hypot(d.x-p.x,d.z-p.z); return Math.max(0, 1-dist/180);
  }
  nearestObjective(team: Team): OperationalSector | null {
    const enemyBase = this.sectors.find(s => s.id === `base-${team === 0 ? 1 : 0}`);
    const candidates = this.sectors.filter(s => s.id !== `base-${team}` && s.state !== (team === 0 ? "friendly" : "enemy"));
    return [...candidates].sort((a,b) => (b.value + b.threat[team === 0 ? 1 : 0] * .25) - (a.value + a.threat[team === 0 ? 1 : 0] * .25))[0] ?? enemyBase ?? null;
  }
  sectorForPoint(p: Point): OperationalSector | null { return this.sectors.filter(s => Math.hypot(s.center.x-p.x,s.center.z-p.z)<=s.radius).sort((a,b)=>b.value-a.value)[0] ?? null; }
}

/** Phase 84: operational AI. It commands groups by objective instead of individual random attacks. */
export class OperationalCommander {
  readonly plans: [OperationalPlan, OperationalPlan] = [
    {team:0, objective:"defend", sectorId:null, reserveRatio:.28, committed:0, lastDecision:-99},
    {team:1, objective:"secure", sectorId:null, reserveRatio:.28, committed:0, lastDecision:-99},
  ];
  constructor(readonly map: OperationalMap, private readonly world: World) {}
  tick(dt: number): void {
    if (dt <= 0 || this.world.time < 8 || Math.floor(this.world.time * 2) % 2 !== 0) return;
    this.map.tick();
    if (!this.world.networkMode) this.commandTeam(this.world.playerTeam === 0 ? 1 : 0);
  }
  private commandTeam(team: Team): void {
    const p = this.plans[team];
    if (this.world.time - p.lastDecision < 8) return;
    const enemy = team === 0 ? 1 : 0;
    const own = this.world.entities.filter(e=>!e.dead&&e.team===team&&e.def.speed>0&&!e.underConstruction);
    const combat = own.filter(e=>!this.isLogistics(e)&&e.loadedIntoId==null&&e.def.armor!=="air");
    const damaged = combat.filter(e=>e.hp < e.def.hp*.45 || (e.supply??100)<25);
    const enemyThreat = this.map.sectors.reduce((m,s)=>m+s.threat[enemy],0);
    const ownStrength = combat.reduce((n,e)=>n+this.value(e),0);
    const objective = this.map.nearestObjective(team);
    if (damaged.length > Math.max(2, combat.length*.3)) p.objective="withdraw";
    else if (enemyThreat > ownStrength*1.15) p.objective="defend";
    else if (objective?.state === "contested") p.objective="attack";
    else if (objective) p.objective="secure";
    p.sectorId = objective?.id ?? null; p.committed = combat.length; p.lastDecision=this.world.time;
    if (!objective || p.objective === "withdraw") return;
    const reserve = Math.max(1, Math.floor(combat.length*p.reserveRatio));
    const available = combat.filter(e=>e.aiIntent !== "resupply" && e.kind !== "logiTruck").slice(reserve);
    for (const e of available.slice(0, team === this.world.playerTeam ? 0 : Math.min(4, available.length))) {
      if (e.kind === "artillery" || e.kind === "mlrs") continue;
      if (e.mode === "idle" || e.aiIntent === "defend" || e.aiIntent === "attack") {
        e.aiIntent = p.objective === "defend" ? "defend" : "attack";
        e.mode = "move"; e.dest = this.offsetObjective(objective.center, e.id);
      }
    }
    if (p.objective === "defend") this.pullReserve(team);
  }
  private pullReserve(team: Team): void {
    const hq = this.world.hq[team]; if (!hq) return;
    for (const e of this.world.entities.filter(x=>!x.dead&&x.team===team&&x.def.speed>0&&x.aiIntent===null).slice(0,2)) {
      e.aiIntent="defend"; e.mode="move"; e.dest={x:hq.x+(this.world.rng()-.5)*28,z:hq.z+(this.world.rng()-.5)*28};
    }
  }
  private offsetObjective(p: Point, seed: number): Point { const a=(seed%17)/17*Math.PI*2, r=10+(seed%13); return {x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r}; }
  private value(e: Entity): number { return Math.max(.5,(e.def.damage||1)/15)*(1+e.veteran*.12)*(e.supply&&e.maxSupply?Math.min(1,e.supply/e.maxSupply):1); }
  private isLogistics(e: Entity): boolean { return ["logiTruck","transport","cargoPlane","engineer"].includes(e.kind); }
}

/** Phase 85: FOB/deployment manager. FOBs create forward operational staging areas. */
export interface FOBState { id:number; team:Team; x:number; z:number; level:number; active:boolean; radius:number; stock:number; capacity:number; }
export class FOBManager {
  readonly fobs: FOBState[] = [];
  constructor(private readonly world: World) {}
  tick(): void {
    for (const e of this.world.entities) {
      if (e.dead || e.kind !== "supply" || (e.fobLevel ?? 0) < 1) continue;
      if (!this.fobs.some(f=>f.id===e.id)) this.fobs.push({id:e.id,team:e.team,x:e.x,z:e.z,level:e.fobLevel??1,active:true,radius:30+(e.fobLevel??1)*12,stock:e.logisticsStorage??0,capacity:e.logisticsMaxStorage??900});
    }
    for (const f of this.fobs) {
      const e=this.world.byId.get(f.id); if (!e || e.dead) { f.active=false; continue; }
      f.x=e.x; f.z=e.z; f.level=e.fobLevel??1; f.radius=30+f.level*12; f.stock=e.logisticsStorage??0; f.capacity=e.logisticsMaxStorage??900;
    }
  }
  nearest(team:Team,p:Point): FOBState|null { return this.fobs.filter(f=>f.active&&f.team===team).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]??null; }
  canStage(team:Team,p:Point): boolean { const f=this.nearest(team,p); return !!f && Math.hypot(f.x-p.x,f.z-p.z)<=f.radius+18; }
}

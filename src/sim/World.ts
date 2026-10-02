import type { Command, Entity, GameStatus, Projectile, SimEvent, Team, UnitKind, MapResourceDef } from "./types";
import { UNITS } from "./units";
import { getBases, heightAt, type BaseDef } from "./heightmap";
import { Rng } from "./rng";
import { ENEMY_AGGRO, STARTING_CREDITS, STARTING_RESOURCES, RESOURCE_INCOME_PER_SEC } from "./constants";
import { applyCommands } from "./systems/commands";
import { updateProduction } from "./systems/production";
import { updateUnits } from "./systems/units";
import { updateProjectiles } from "./systems/projectiles";
import { WaveAI } from "./ai/WaveAI";
import { NavGrid } from "./nav/NavGrid";
import { Vision } from "./Vision";
import type { MapFeatureDef } from "./mapFeatures";
/** Mängu olek ja fikseeritud sammuga simulatsioon. Ei sõltu renderdusest ega brauserist. */
export class World {
  readonly entities: Entity[] = [];
  readonly byId = new Map<number, Entity>();
  readonly projectiles: Projectile[] = [];
  readonly hq: (Entity | null)[] = [null, null];
  readonly rng: () => number;
  readonly rngState: Rng;
  readonly ai = new WaveAI();
  readonly nav: NavGrid;
  readonly vision: Vision;
  private navDirty = false;
  events: SimEvent[] = [];
  pending: Command[] = [];
  credits = STARTING_CREDITS;
  resources = STARTING_RESOURCES;
  readonly bases: readonly BaseDef[];
  readonly resourcePoints: MapResourceDef[];
  readonly techs = new Set<string>(["engineering"]);
  queue: UnitKind[] = [];
  queueProgress = 0;
  time = 0;
  status: GameStatus = "running";
  nextId = 1;
  playerTeam: Team = 0;
  networkMode = false;

  /** Staatilised kaardiobjektid; neid kasutavad simulatsioon, navigeerimine ja UI. */
  readonly mapFeatures: readonly MapFeatureDef[];

  constructor(seed = 1, private readonly objectiveDriven = false, resources: readonly MapResourceDef[] = [], features: readonly MapFeatureDef[] = [], bases: readonly BaseDef[] = []) {
    this.rngState = new Rng(seed);
    this.bases = bases.length ? bases.map((b) => ({ ...b })) : getBases();
    this.mapFeatures = features.map((f) => ({ ...f }));
    this.rng = () => this.rngState.next();
    this.nav = new NavGrid([], features);
    this.vision = new Vision();
    this.resourcePoints = resources.length ? resources.map((r) => ({ ...r })) : [
      { x: -70, z: 70, amount: 1000, radius: 12 },
      { x: 70, z: -70, amount: 1000, radius: 12 },
    ];
  }

  spawn(kind: UnitKind, team: Team, x: number, z: number): Entity {
    const def = UNITS[kind], y = heightAt(x, z), heading = team ? -Math.PI / 4 : Math.PI * 0.75;
    const e: Entity = {
      id: this.nextId++, kind, team, def, x, y, z, heading, turretYaw: 0,
      px: x, pz: z, pHeading: heading, pTurretYaw: 0,
      hp: def.hp, cooldown: this.rng() * 0.5, mode: "idle", dest: null, target: null,
      aggro: team === 1 && def.speed > 0 ? ENEMY_AGGRO : def.range, dead: false,
      xp: 0, veteran: 0, holdPosition: false, patrolPoints: [], patrolIndex: 0, upgrades: new Set<string>(),
      navPath: [], navPathIndex: 0, flowField: null, stuckTime: 0, stuckX: x, stuckZ: z,
    };
    this.entities.push(e);
    this.byId.set(e.id, e);
    if (kind === "hq") this.hq[team] = e;
    if (def.speed === 0) this.navDirty = true;
    return e;
  }

  issue(cmd: Command): void {
    this.pending.push(cmd);
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  getRandomState(): number { return this.rngState.getState(); }

  setRandomState(state: number): void { this.rngState.setState(state); }

  setNetworkMode(team: Team): void { this.networkMode = true; this.playerTeam = team; }

  tick(dt: number): void {
    if (this.status !== "running") return;
    for (const e of this.entities) { e.px = e.x; e.pz = e.z; e.pHeading = e.heading; e.pTurretYaw = e.turretYaw; }
    this.time += dt;
    for (const rp of this.resourcePoints) if (rp.amount > 0) {
      const miners = this.entities.filter(e => !e.dead && e.team === 0 && e.kind === "engineer" && Math.hypot(e.x-rp.x,e.z-rp.z) <= rp.radius).length;
      const refineries = this.entities.filter(e => !e.dead && e.team === 0 && e.kind === "refinery" && Math.hypot(e.x-rp.x,e.z-rp.z) <= rp.radius + 8).length;
      const gain = Math.min(rp.amount, miners * RESOURCE_INCOME_PER_SEC * dt * (refineries ? 1.5 : 1));
      rp.amount -= gain; this.resources += gain;
    }
    if (this.navDirty) { this.nav.syncBuildings(this.entities); this.navDirty = false; }
    this.vision.update(this.entities);
    applyCommands(this);
    updateProduction(this, dt);
    if (!this.networkMode) this.ai.update(this, dt);
    updateUnits(this, dt);
    updateProjectiles(this, dt);
    let removedBuilding = false;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.dead) { if (e.def.speed === 0) removedBuilding = true; this.entities.splice(i, 1); this.byId.delete(e.id); }
    }
    if (removedBuilding) this.navDirty = true;
    const ownHq = this.hq[this.playerTeam], enemyHq = this.hq[this.playerTeam === 0 ? 1 : 0];
    if (this.networkMode) {
      if (enemyHq && enemyHq.dead) this.status = "won";
      else if (ownHq && ownHq.dead) this.status = "lost";
    } else if (!this.objectiveDriven && this.hq[1] && this.hq[1]!.dead) this.status = "won";
    else if (this.hq[0] && this.hq[0]!.dead) this.status = "lost";
  }
}

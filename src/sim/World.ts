import type { Command, Entity, GameStatus, Projectile, SimEvent, Team, UnitKind, MapResourceDef, IntelContact } from "./types";
import { UNITS } from "./units";
import { getBases, heightAt, type BaseDef } from "./heightmap";
import { Rng } from "./rng";
import { ENEMY_AGGRO, INCOME_PER_SEC, STARTING_CREDITS, STARTING_RESOURCES } from "./constants";
import { applyCommands } from "./systems/commands";
import { updateProduction } from "./systems/production";
import { updateUnits } from "./systems/units";
import { updateProjectiles } from "./systems/projectiles";
import { updateConstruction } from "./systems/construction";
import { WaveAI } from "./ai/WaveAI";
import { NavGrid } from "./nav/NavGrid";
import { Vision } from "./Vision";
import type { MapFeatureDef } from "./mapFeatures";
import { featureBlocksMovement } from "./mapFeatures";
import { buildFootprint, isBuildable } from "./buildings";
import { generateBaseFeatures } from "./baseLayout";
/** Mängu olek ja fikseeritud sammuga simulatsioon. Ei sõltu renderdusest ega brauserist. */
export class World {
  readonly entities: Entity[] = [];
  readonly byId = new Map<number, Entity>();
  readonly projectiles: Projectile[] = [];
  readonly hq: (Entity | null)[] = [null, null];
  readonly rng: () => number;
  readonly rngState: Rng;
  readonly ai = new WaveAI();
  readonly intel: [Map<number, IntelContact>, Map<number, IntelContact>] = [new Map(), new Map()];
  readonly nav: NavGrid;
  readonly vision: Vision;
  private navDirty = false;
  events: SimEvent[] = [];
  pending: Command[] = [];
  credits = STARTING_CREDITS;
  resources = STARTING_RESOURCES;
  teamCredits: [number, number] = [STARTING_CREDITS, STARTING_CREDITS];
  teamResources: [number, number] = [STARTING_RESOURCES, STARTING_RESOURCES];
  readonly bases: readonly BaseDef[];
  readonly resourcePoints: MapResourceDef[];
  readonly teamTechs: [Set<string>, Set<string>] = [new Set(["engineering"]), new Set(["engineering"])];
  get techs(): Set<string> { return this.teamTechs[this.playerTeam]; }
  hasTech(team: Team, tech: string): boolean { return this.teamTechs[team].has(tech); }
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
    this.mapFeatures = [...features.map((f) => ({ ...f })), ...generateBaseFeatures(this.bases)];
    this.rng = () => this.rngState.next();
    this.nav = new NavGrid([], this.mapFeatures);
    this.vision = new Vision();
    this.vision.setFeatures(this.mapFeatures);
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
      xp: 0, veteran: 0, supply: 100, maxSupply: 100, role: kind === "artillery" ? "siege" : kind === "aa" ? "support" : kind === "fighter" ? "air-superiority" : kind === "gunship" ? "air-ground" : kind === "transport" ? "logistics" : "line", fuel: def.armor === "air" ? 100 : 0, maxFuel: def.armor === "air" ? 100 : 0, ammo: def.armor === "air" ? 6 : kind === "artillery" ? 10 : 0, maxAmmo: def.armor === "air" ? 6 : kind === "artillery" ? 10 : 0, fireMission: null, holdPosition: false, patrolPoints: [], patrolIndex: 0, upgrades: new Set<string>(), cargo: 0, logisticsTarget: null, logisticsHome: null, logisticsPhase: "idle", productionQueue: [], productionProgress: 0, rallyPoint: null, constructionProgress: 1, constructionTime: 0, firingArc: (kind === "bunker" ? Math.PI * 0.62 : kind === "aa" ? Math.PI * 0.9 : kind === "artillery" ? Math.PI * 0.98 : Math.PI * 2), firingRange: def.range, facingLocked: kind === "bunker" || kind === "aa", lastCombatTime: 0, builderIds: [], underConstruction: false, cargoUnitIds: [], loadedIntoId: null, transportTargetId: null, unloadPoint: null,
      navPath: [], navPathIndex: 0, flowField: null, stuckTime: 0, stuckX: x, stuckZ: z,
    };
    this.entities.push(e);
    this.byId.set(e.id, e);
    if (kind === "hq") this.hq[team] = e;
    if (def.speed === 0) this.navDirty = true;
    return e;
  }

  private updateResourceControl(dt: number): void {
    for (const rp of this.resourcePoints) {
      const nearby = ([0, 1] as const).map(team => this.entities.some(e => !e.dead && e.team === team && e.def.speed > 0 && Math.hypot(e.x-rp.x,e.z-rp.z) <= rp.radius + 10));
      if (nearby[0] && !nearby[1]) { rp.controlProgress = Math.min(1, (rp.controlProgress ?? 0) + dt * 0.35); if (rp.controlProgress >= 1) rp.controlledBy = 0; }
      else if (nearby[1] && !nearby[0]) { rp.controlProgress = Math.max(0, (rp.controlProgress ?? 0) - dt * 0.35); if (rp.controlProgress <= 0) rp.controlledBy = 1; }
      else if (nearby[0] && nearby[1]) rp.controlProgress = Math.max(0, Math.min(1, rp.controlProgress ?? (rp.controlledBy === 0 ? 1 : 0)));
      if (rp.controlledBy !== undefined && rp.controlledBy !== null) this.teamCredits[rp.controlledBy] += 2.2 * dt;
    }
    this.credits = this.teamCredits[this.playerTeam];
  }

  /** Updates last-known enemy positions. Contacts are shared through the command network. */
  private updateIntel(): void {
    for (const team of [0, 1] as const) {
      const contacts = this.intel[team];
      for (const [id, c] of contacts) {
        if (this.time - c.lastSeen > 75) contacts.delete(id);
      }
      for (const enemy of this.entities) {
        if (enemy.dead || enemy.team === team) continue;
        if (!this.vision.isVisible(team, enemy.x, enemy.z)) continue;
        const observer = this.vision.observerFor(team, enemy.x, enemy.z, this.entities);
        if (!observer) continue;
        const shared = this.hasCommandLink(team, observer);
        contacts.set(enemy.id, { entityId: enemy.id, team: enemy.team, kind: enemy.kind, x: enemy.x, z: enemy.z, lastSeen: this.time, shared });
      }
    }
  }

  private hasCommandLink(team: Team, observer: Entity): boolean {
    if (observer.kind === "hq") return true;
    return this.entities.some(h => !h.dead && !h.underConstruction && h.team === team && ["hq", "barracks", "factory", "helipad"].includes(h.kind) && Math.hypot(h.x - observer.x, h.z - observer.z) <= (h.kind === "hq" ? 78 : 55));
  }

  getIntel(team: Team, sharedOnly = true): IntelContact[] {
    return [...this.intel[team].values()].filter(c => !sharedOnly || c.shared).map(c => ({ ...c }));
  }

  getFreshIntel(team: Team, maxAge = 25): IntelContact[] {
    return this.getIntel(team, true).filter(c => this.time - c.lastSeen <= maxAge);
  }

  isInSupply(e: Entity): boolean {
    if (e.def.speed === 0) return true;
    const hubs = this.entities.filter(h => !h.dead && !h.underConstruction && h.team === e.team && ["hq", "refinery", "factory", "barracks", "helipad"].includes(h.kind));
    if (hubs.some(h => Math.hypot(h.x - e.x, h.z - e.z) <= (h.kind === "hq" ? 58 : h.kind === "refinery" ? 48 : 40))) return true;
    const logistics = this.entities.some(h => !h.dead && h.team === e.team && h.kind === "transport" && Math.hypot(h.x-e.x,h.z-e.z) <= 18);
    return logistics;
  }

  private updateSupply(dt: number): void {
    for (const e of this.entities) {
      if (e.dead || e.def.speed === 0 || e.kind === "transport") continue;
      const supplied = this.isInSupply(e);
      const rate = e.role === "siege" ? 1.7 : e.def.armor === "air" ? 2.2 : 0.7;
      const supply = e.supply ?? 100, maxSupply = e.maxSupply ?? 100;
      e.supply = supplied ? Math.min(maxSupply, supply + 18 * dt) : Math.max(0, supply - rate * dt);
    }
  }

  hasBuilding(team: Team, kind: UnitKind): boolean { return this.entities.some(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind); }

  baseGate(team: Team): { x: number; z: number } {
    const base = this.bases[team];
    const enemy = this.bases[team === 0 ? 1 : 0];
    const dx = enemy.x - base.x, dz = enemy.z - base.z;
    const len = Math.hypot(dx, dz) || 1;
    const distance = Math.max(20, Math.min(28, base.r * 0.82));
    return { x: base.x + (dx / len) * distance, z: base.z + (dz / len) * distance };
  }

  canPlaceBuilding(team: Team, kind: UnitKind, x: number, z: number): boolean {
    if (!isBuildable(kind)) return false;
    const r = buildFootprint(kind);
    if (!this.nav.isWalkableWorld(x, z, r * 0.65)) return false;
    if (this.entities.some(e => !e.dead && (e.def.speed === 0 || e.underConstruction) && Math.hypot(e.x - x, e.z - z) < r + e.def.radius + 1.5)) return false;
    if (this.mapFeatures.some(f => featureBlocksMovement(f) && Math.hypot(f.x - x, f.z - z) < r + Math.hypot(f.width, f.depth) * 0.5)) return false;
    if (kind === "refinery" && !this.resourcePoints.some(p => Math.hypot(p.x - x, p.z - z) <= p.radius + r)) return false;
    return this.bases[team] ? Math.hypot(this.bases[team].x - x, this.bases[team].z - z) < 155 : true;
  }

  buildingProgress(e: Entity): number { return e.underConstruction ? Math.max(0, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime))) : 1; }

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

  setNetworkMode(team: Team): void { this.networkMode = true; this.playerTeam = team; this.credits = this.teamCredits[team]; this.resources = this.teamResources[team]; }

  tick(dt: number): void {
    if (this.status !== "running") return;
    for (const e of this.entities) { e.px = e.x; e.pz = e.z; e.pHeading = e.heading; e.pTurretYaw = e.turretYaw; }
    this.time += dt;
    this.teamCredits[0] += INCOME_PER_SEC * dt; this.teamCredits[1] += INCOME_PER_SEC * dt;
    this.updateResourceControl(dt);
    this.updateSupply(dt);
    // refinery bonus: every completed refinery improves the team's steady income.
    for (const team of [0, 1] as const) {
      const refineries = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "refinery").length;
      if (refineries) { const bonus = INCOME_PER_SEC * 0.35 * refineries * dt; this.teamCredits[team] += bonus; }
    }
    this.credits = this.teamCredits[this.playerTeam];
    this.resources = this.teamResources[this.playerTeam];
    if (this.navDirty) { this.nav.syncBuildings(this.entities); this.navDirty = false; }
    this.vision.update(this.entities);
    this.updateIntel();
    applyCommands(this);
    this.teamCredits[this.playerTeam] = this.credits;
    this.teamResources[this.playerTeam] = this.resources;
    updateConstruction(this, dt);
    updateProduction(this, dt);
    this.teamCredits[this.playerTeam] = this.credits;
    this.teamResources[this.playerTeam] = this.resources;
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

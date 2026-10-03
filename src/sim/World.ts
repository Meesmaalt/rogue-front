import type { Command, Entity, GameStatus, Projectile, SimEvent, Team, UnitKind, MapResourceDef, IntelContact } from "./types";
import { UNITS } from "./units";
import { getBases, heightAt, ensureHeightCache, type BaseDef } from "./heightmap";
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
import { buildFootprint, isBuildable, BUILDINGS, type BuildableKind } from "./buildings";
import { generateBaseFeatures } from "./baseLayout";
import { SpatialHash } from "./SpatialHash";
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
  /** Spatial index rebuilt each tick for nearest/separation queries. */
  readonly spatial = new SpatialHash(16);
  private navDirty = false;
  events: SimEvent[] = [];
  pending: Command[] = [];
  credits = STARTING_CREDITS;
  resources = STARTING_RESOURCES;
  teamCredits: [number, number] = [STARTING_CREDITS, STARTING_CREDITS];
  teamResources: [number, number] = [STARTING_RESOURCES, STARTING_RESOURCES];
  teamPower: [number, number] = [100, 100];
  teamPowerUse: [number, number] = [0, 0];
  teamMorale: [number, number] = [100, 100];
  areaControl: [number, number] = [0, 0];
  supplyUpgrade: [number, number] = [0, 0];
  readonly bases: readonly BaseDef[];
  readonly resourcePoints: MapResourceDef[];
  readonly teamTechs: [Set<string>, Set<string>] = [new Set(["engineering"]), new Set(["engineering"])];
  get techs(): Set<string> { return this.teamTechs[this.playerTeam]; }
  hasTech(team: Team, tech: string): boolean {
    if (this.teamTechs[team].has(tech)) return true;
    if (tech === "land-command") return this.hasBuilding(team, "landCommand");
    if (tech === "air") return this.hasBuilding(team, "airCommand");
    if (tech === "air-command") return this.hasBuilding(team, "airCommand");
    if (tech === "sea-command") return this.hasBuilding(team, "seaCommand");
    return false;
  }
  private powerCacheTime = -1;
  private powerCache: [{ supply: number; use: number; ratio: number }, { supply: number; use: number; ratio: number }] | null = null;

  powerStatus(team: Team): { supply: number; use: number; ratio: number } {
    // Cache for the duration of the current sim tick
    if (this.powerCache && this.powerCacheTime === this.time) {
      return this.powerCache[team];
    }
    const compute = (t: Team) => {
      let supply = 25, use = 0;
      for (const e of this.entities) {
        if (e.dead || e.underConstruction || e.team !== t || !e.def.building) continue;
        if ((e.disabledUntil ?? 0) > this.time) continue;
        if (e.kind === "generator") supply += BUILDINGS.generator.powerSupply ?? 0;
        const spec = isBuildable(e.kind) ? BUILDINGS[e.kind] : null;
        use += spec?.powerUse ?? 0;
      }
      const ratio = use <= 0 ? 1 : Math.min(1, supply / use);
      this.teamPower[t] = supply; this.teamPowerUse[t] = use;
      return { supply, use, ratio };
    };
    this.powerCache = [compute(0), compute(1)];
    this.powerCacheTime = this.time;
    return this.powerCache[team];
  }
  buildingCount(team: Team, kind: BuildableKind): number { return this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind).length; }
  canBuildKind(team: Team, kind: BuildableKind): boolean {
    const spec = BUILDINGS[kind];
    if ((spec.limit ?? Infinity) <= this.buildingCount(team, kind)) return false;
    if (spec.requires?.some(req => !this.hasBuilding(team, req))) return false;
    if (kind !== "generator" && !this.hasBuilding(team, "generator")) return false;
    if (["landCommand","airCommand","seaCommand"].includes(kind)) {
      if (!this.hasBuilding(team, "supply") && !this.hasBuilding(team, "generator")) return false;
    }
    return this.powerStatus(team).ratio > 0.01 || kind === "generator" || kind === "supply";
  }


  /** Returns the buildings currently exposed by the selected command/building branch. */
  availableBuilds(team: Team, source?: UnitKind): BuildableKind[] {
    const roots: Record<string, BuildableKind[]> = {
      hq: ["generator", "supply", "landCommand", "airCommand", "seaCommand"],
      landCommand: ["barracks", "factory", "combatEngineer", "landStrategy", "supply", "generator"],
      airCommand: ["helipad", "airbase", "airStrategy", "supply", "generator"],
      seaCommand: ["shipyard", "seaStrategy", "supply", "generator"],
      landStrategy: ["barracks", "factory", "combatEngineer", "radar", "bunker", "aa"],
      airStrategy: ["helipad", "airbase", "radar", "aa"],
      seaStrategy: ["shipyard", "supply", "radar"],
      combatEngineer: ["bunker", "aa", "radar"],
      supply: ["generator", "radar"],
    };
    return (roots[source ?? "hq"] ?? []).filter(k => this.canBuildKind(team, k));
  }

  producerLevel(e: Entity): number { return e.upgrades.has("producer-2") ? 2 : 1; }
  canUpgradeProducer(e: Entity): boolean {
    if (e.dead || e.underConstruction || !["barracks","factory","helipad","airbase","shipyard"].includes(e.kind)) return false;
    return this.producerLevel(e) < 2 && this.hasStrategyForProducer(e.team, e.kind);
  }
  hasStrategyForProducer(team: Team, kind: UnitKind): boolean {
    if (["barracks","factory"].includes(kind)) return this.hasBuilding(team, "landStrategy");
    if (["helipad","airbase"].includes(kind)) return this.hasBuilding(team, "airStrategy");
    if (kind === "shipyard") return this.hasBuilding(team, "seaStrategy");
    return false;
  }

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
    // Build height cache once bases are known (huge win for LOS / movement)
    ensureHeightCache();
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
      xp: 0, veteran: 0, supply: 100, maxSupply: 100, role: kind === "artillery" ? "siege" : kind === "aa" ? "support" : kind === "fighter" ? "air-superiority" : kind === "gunship" ? "air-ground" : kind === "transport" ? "logistics" : "line", fuel: def.armor === "air" ? 100 : 0, maxFuel: def.armor === "air" ? 100 : 0, ammo: def.armor === "air" ? 6 : kind === "artillery" ? 10 : 0, maxAmmo: def.armor === "air" ? 6 : kind === "artillery" ? 10 : 0, fireMission: null, holdPosition: false, patrolPoints: [], patrolIndex: 0, upgrades: new Set<string>(), cargo: 0, logisticsTarget: null, logisticsHome: null, logisticsPhase: "idle", productionQueue: [], productionProgress: 0, rallyPoint: null, constructionProgress: 1, constructionTime: 0, upgrading: false, upgradeProgress: 0, upgradeTime: 0, upgradeKind: undefined, firingArc: (kind === "bunker" ? Math.PI * 0.62 : kind === "aa" ? Math.PI * 0.9 : kind === "artillery" ? Math.PI * 0.98 : Math.PI * 2), firingRange: def.range, facingLocked: kind === "bunker" || kind === "aa", lastCombatTime: 0, morale: 100, disabledUntil: 0, builderIds: [], underConstruction: false, cargoUnitIds: [], loadedIntoId: null, transportTargetId: null, unloadPoint: null,
      navPath: [], navPathIndex: 0, flowField: null, stuckTime: 0, stuckX: x, stuckZ: z,
    };
    this.entities.push(e);
    this.byId.set(e.id, e);
    if (kind === "hq") this.hq[team] = e;
    if (kind === "special") e.role = "support";
    if (["destroyer","submarine","landingcraft"].includes(kind)) e.role = kind === "landingcraft" ? "logistics" : "line";
    if (def.speed === 0) this.navDirty = true;
    return e;
  }

  private updateResourceControl(dt: number): void {
    let scores: [number, number] = [0, 0];
    for (const rp of this.resourcePoints) {
      const nearby = ([0, 1] as const).map(team => this.entities.filter(e => !e.dead && e.team === team && e.def.speed > 0 && e.loadedIntoId === null && Math.hypot(e.x-rp.x,e.z-rp.z) <= rp.radius + 10));
      const a = nearby[0].length, b = nearby[1].length;
      if (a > 0 && b === 0) { rp.controlProgress = Math.min(1, (rp.controlProgress ?? 0) + dt * 0.22 * Math.min(2, a)); if (rp.controlProgress >= 1) rp.controlledBy = 0; }
      else if (b > 0 && a === 0) { rp.controlProgress = Math.max(0, (rp.controlProgress ?? 0) - dt * 0.22 * Math.min(2, b)); if (rp.controlProgress <= 0) rp.controlledBy = 1; }
      else if (a > 0 && b > 0) rp.controlProgress = Math.max(0, Math.min(1, rp.controlProgress ?? (rp.controlledBy === 0 ? 1 : 0)));
      if (rp.controlledBy !== undefined && rp.controlledBy !== null) { scores[rp.controlledBy] += 1; }
      if (a > 0 && b > 0) { this.teamMorale[0] = Math.max(0, this.teamMorale[0] - 0.02 * dt); this.teamMorale[1] = Math.max(0, this.teamMorale[1] - 0.02 * dt); }
    }
    this.areaControl = scores;
    for (const team of [0,1] as const) this.teamMorale[team] = Math.min(100, this.teamMorale[team] + dt * (scores[team] * 0.035));
    this.credits = this.teamCredits[this.playerTeam];
  }

  /** Updates last-known enemy positions. Contacts are shared through the command network. */
  private updateIntel(): void {
    // Throttle: intel is strategic, 5 Hz is plenty
    if (Math.floor(this.time * 30) % 6 !== 0) return;
    for (const team of [0, 1] as const) {
      const contacts = this.intel[team];
      for (const [id, c] of contacts) {
        if (this.time - c.lastSeen > 75) contacts.delete(id);
      }
      for (const enemy of this.entities) {
        if (enemy.dead || enemy.team === team) continue;
        if (!this.vision.isVisible(team, enemy.x, enemy.z)) continue;
        // Skip expensive observer LOS – visibility grid is enough for intel contacts
        contacts.set(enemy.id, {
          entityId: enemy.id, team: enemy.team, kind: enemy.kind,
          x: enemy.x, z: enemy.z, lastSeen: this.time, shared: true,
        });
      }
    }
  }

  private hasCommandLink(team: Team, observer: Entity): boolean {
    if (observer.kind === "hq") return true;
    return this.entities.some(h => !h.dead && !h.underConstruction && h.team === team && ["hq", "barracks", "factory", "helipad", "airbase", "supply", "radar"].includes(h.kind) && Math.hypot(h.x - observer.x, h.z - observer.z) <= (h.kind === "hq" ? 78 : h.kind === "radar" ? 115 : 55));
  }

  getIntel(team: Team, sharedOnly = true): IntelContact[] {
    return [...this.intel[team].values()].filter(c => !sharedOnly || c.shared).map(c => ({ ...c }));
  }

  getFreshIntel(team: Team, maxAge = 25): IntelContact[] {
    return this.getIntel(team, true).filter(c => this.time - c.lastSeen <= maxAge);
  }

  /** Connected supply network: HQ is the root; completed depots extend the network. */
  private connectedSupplyNodes(team: Team): Entity[] {
    const nodes = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && ["hq", "supply"].includes(e.kind));
    const root = nodes.filter(e => e.kind === "hq");
    const connected: Entity[] = [...root];
    const seen = new Set(root.map(e => e.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const depot of nodes.filter(e => e.kind === "supply" && !seen.has(e.id))) {
        if (connected.some(n => Math.hypot(n.x - depot.x, n.z - depot.z) <= (n.kind === "hq" ? 105 : 82))) {
          connected.push(depot); seen.add(depot.id); changed = true;
        }
      }
    }
    return connected;
  }

  nearestSupplyDepot(team: Team, p: {x:number;z:number}, connectedOnly = false): Entity | null {
    const nodes = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const allowed = connectedOnly ? nodes.filter(n => this.connectedSupplyNodes(team).some(c => c.id === n.id)) : nodes;
    return allowed.sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0] ?? this.hq[team];
  }

  isInSupply(e: Entity): boolean {
    if (e.def.speed === 0) return true;
    const nodes = this.connectedSupplyNodes(e.team);
    if (nodes.some(h => Math.hypot(h.x - e.x, h.z - e.z) <= (h.kind === "hq" ? 62 : 48))) return true;
    const logistics = this.entities.some(h => !h.dead && h.team === e.team && h.kind === "transport" && Math.hypot(h.x-e.x,h.z-e.z) <= 18 && h.cargo > 0);
    return logistics;
  }

  supplyRouteStatus(team: Team): { connected: number; total: number } {
    const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const connected = this.connectedSupplyNodes(team).filter(e => e.kind === "supply").length;
    return { connected, total: depots.length };
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

  sabotageBuilding(target: Entity, duration = 25): void {
    target.disabledUntil = Math.max(target.disabledUntil ?? 0, this.time + duration);
    if (["generator", "radar", "airbase", "shipyard"].includes(target.kind)) this.teamMorale[target.team] = Math.max(0, this.teamMorale[target.team] - 5);
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
    if (!isBuildable(kind) || !this.canBuildKind(team, kind)) return false;
    const r = buildFootprint(kind);
    if (!this.nav.isWalkableWorld(x, z, r * 0.65)) return false;
    if (this.entities.some(e => !e.dead && (e.def.speed === 0 || e.underConstruction) && Math.hypot(e.x - x, e.z - z) < r + e.def.radius + 1.5)) return false;
    if (this.mapFeatures.some(f => featureBlocksMovement(f) && Math.hypot(f.x - x, f.z - z) < r + Math.hypot(f.width, f.depth) * 0.5)) return false;
    if (kind === "refinery" && !this.resourcePoints.some(p => Math.hypot(p.x - x, p.z - z) <= p.radius + r)) return false;
    if (["supply", "generator", "radar", "helipad", "bunker", "aa", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"].includes(kind)) return true;
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

  airbaseStatus(team: Team): { capacity: number; aircraft: number; ready: number } {
    const bases = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "airbase");
    const capacity = bases.length * 6;
    const aircraft = this.entities.filter(e => !e.dead && e.team === team && e.def.armor === "air" && ["fighter", "gunship"].includes(e.kind)).length;
    const ready = this.entities.filter(e => !e.dead && e.team === team && e.def.armor === "air" && ["fighter", "gunship"].includes(e.kind) && (e.airState === "grounded" || e.airState === "rearming" || e.airState == null)).length;
    return { capacity, aircraft, ready };
  }

  supplyDepotStatus(team: Team): { depots: number; active: number; level: number; rate: number } {
    const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const active = this.entities.filter(e => !e.dead && e.team === team && e.kind === "transport" && e.supplyDepotId != null).length;
    const level = depots.reduce((m, d) => Math.max(m, d.supplyLevel ?? 0), 0);
    return { depots: depots.length, active, level, rate: 1 + level * 0.35 };
  }

  upgradeSupplyDepot(team: Team, depotId: number): boolean {
    const depot = this.byId.get(depotId);
    if (!depot || depot.dead || depot.underConstruction || depot.team !== team || depot.kind !== "supply") return false;
    const level = depot.supplyLevel ?? 0;
    if (level >= 3) return false;
    const cost = 180 + level * 120;
    if (this.teamResources[team] < cost || this.teamCredits[team] < cost) return false;
    this.teamResources[team] -= cost; this.teamCredits[team] -= cost;
    depot.supplyLevel = level + 1;
    if (team === this.playerTeam) { this.resources = this.teamResources[team]; this.credits = this.teamCredits[team]; }
    return true;
  }

  private updateSupplyAirbridge(): void {
    for (const team of [0,1] as const) {
      const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
      if (!depots.length) continue;
      const transports = this.entities.filter(e => !e.dead && e.team === team && e.kind === "transport" && e.supplyDepotId != null);
      for (const depot of depots) {
        const maxConcurrent = 1 + (depot.supplyLevel ?? 0);
        const assigned = transports.filter(t => t.supplyDepotId === depot.id).length;
        if (assigned >= maxConcurrent) continue;
        const rp = this.resourcePoints
          .filter(r => r.amount > 0 && (r.controlledBy == null || r.controlledBy === team))
          .sort((a,b) => Math.hypot(a.x-depot.x,a.z-depot.z) - Math.hypot(b.x-depot.x,b.z-depot.z))[0];
        if (!rp) continue;
        const edgeX = team === 0 ? -155 : 155;
        const edgeZ = team === 0 ? depot.z + 35 : depot.z - 35;
        const h = this.spawn("transport", team, edgeX, edgeZ);
        h.supplyDepotId = depot.id;
        h.logisticsHome = { x: depot.x, z: depot.z };
        h.logisticsTarget = { x: rp.x, z: rp.z };
        h.logisticsPhase = "idle";
        h.logisticsLoadProgress = 0;
        h.mode = "patrol";
        h.dest = h.logisticsTarget;
      }
    }
  }

  tick(dt: number): void {
    if (this.status !== "running") return;
    for (const e of this.entities) { e.px = e.x; e.pz = e.z; e.pHeading = e.heading; e.pTurretYaw = e.turretYaw; }
    this.time += dt;
    this.teamCredits[0] += INCOME_PER_SEC * 0.35 * dt; this.teamCredits[1] += INCOME_PER_SEC * 0.35 * dt;
    this.updateResourceControl(dt);
    this.updateSupply(dt);
    this.powerStatus(0); this.powerStatus(1);
    this.updateSupplyAirbridge();
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
    // Spatial hash once per tick – powers nearestEnemy + separation
    this.spatial.rebuild(this.entities);
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

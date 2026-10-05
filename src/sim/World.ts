import logisticsConfig from "../data/logistics.json";
import type { Command, Entity, GameStatus, Projectile, SimEvent, Team, UnitKind, MapResourceDef, IntelContact } from "./types";
import { UNITS } from "./units";
import { getBases, heightAt, MAP_SIZE, ensureHeightCache, type BaseDef } from "./heightmap";
import { Rng } from "./rng";
import { ENEMY_AGGRO, INCOME_PER_SEC, STARTING_CREDITS, STARTING_RESOURCES, AIR_CARGO_INCOME_PER_SEC, AIR_CARGO_LOAD, AIR_CARGO_INTERVAL, RESOURCE_FACILITY_STARTUP, RESOURCE_FACILITY_MAX_STOCK, RESOURCE_FACILITY_PRODUCTION, ROAD_TRUCK_CARGO, ROAD_TRUCK_INTERVAL, ROAD_TRUCK_MAX_PER_DEPOT } from "./constants";
import { applyCommands } from "./systems/commands";
import { updateProduction } from "./systems/production";
import { updateUnits } from "./systems/units";
import { updateProjectiles } from "./systems/projectiles";
import { updateArtillery } from "./systems/artillery";
import { updateTacticalAI } from "./ai/TacticalAI";
import { updateConstruction } from "./systems/construction";
import { WaveAI } from "./ai/WaveAI";
import { NavGrid } from "./nav/NavGrid";
import { Vision } from "./Vision";
import { updateSensors } from "./systems/sensors";
import { updateMorale } from "./systems/morale";
import { updateTacticalSupply, isTacticallySupplied, ensureLogisticsPools } from "./systems/tacticalSupply";
import { pointInFeature,type MapFeatureDef } from "./mapFeatures";
import {findPath} from "./nav/Pathfinder";
import { buildFootprint, isBuildable, BUILDINGS, type BuildableKind } from "./buildings";
import { generateBaseFeatures } from "./baseLayout";
import { SpatialHash } from "./SpatialHash";
import type { FactionId } from "./factions";
import { FACTIONS, factionUnitName } from "./factions";
import { BattleGroupController } from "./battlegroup";
import { OperationalMap, OperationalCommander, FOBManager } from "./operations";
import { MissionController } from "./Mission";
import { MatchModeController } from "./gameModes";
import { FrontlineController } from "./frontline";
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
  playerFaction: FactionId = "usa";
  enemyFaction: FactionId = "russia";
  /** Optional Wargame deck limits production counts. */
  networkDecks: [import("./deck").FactionDeck | null, import("./deck").FactionDeck | null] = [null, null];
  networkBattlegroups: [BattleGroupController | null, BattleGroupController | null] = [null, null];
  networkProducedCounts: [Partial<Record<UnitKind, number>>, Partial<Record<UnitKind, number>>] = [{}, {}];
  activeDeck: import("./deck").FactionDeck | null = null;
  activeBattlegroup: BattleGroupController | null = null;
  /** Phase 83-85: operational sectors, commander and forward staging. */
  readonly operationalMap: OperationalMap;
  readonly operationalCommander: OperationalCommander;
  readonly fobManager: FOBManager;
  /** Phase 86-90: dynamic frontline, deployment and reinforcement layer. */
  readonly frontline: FrontlineController;
  externalVictoryMode = false;
  matchController: import("./gameModes").MatchModeController | null = null;
  missionController: import("./Mission").MissionController | null = null;
  teamFormations: ["box"|"line"|"wedge"|"column", "box"|"line"|"wedge"|"column"] = ["box","box"];
  lossValue: [number,number] = [0,0];
  producedCounts: Partial<Record<import("./types").UnitKind, number>> = {};
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
  /** Phase 60: strategic resources waiting at the national airlift network. */
  airCargoPool: [number, number] = [0, 0];
  airCargoDelivered: [number, number] = [0, 0];
  airCargoLost: [number, number] = [0, 0];
  private airCargoLastSpawn: [number, number] = [-999, -999];
  /** Phase 62: physical road logistics counters. */
  roadCargoDelivered: [number, number] = [0, 0];
  roadCargoLost: [number, number] = [0, 0];
  private roadTruckLastSpawn: [number, number] = [-999, -999];
  /** Phase 64: infrastructure integrity and operational logistics network. */
  readonly infrastructureDamage = new Map<string, number>();
  readonly logisticsPriority: ["ammo" | "fuel" | "repair" | "balanced", "ammo" | "fuel" | "repair" | "balanced"] = ["balanced", "balanced"];
  /** Phase 65: command network / FOB state. */
  readonly commandNetworkLevel: [number, number] = [1, 1];
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
        if (e.kind === "generator") {
          const level = this.producerLevel(e);
          supply += (BUILDINGS.generator.powerSupply ?? 0) * (level >= 3 ? 1.65 : level >= 2 ? 1.3 : 1);
        }
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

  /** Phase 70: every strategic building has a visible 1-3 technology level. */
  producerLevel(e: Entity): number {
    if (e.buildingLevel) return Math.max(1, Math.min(3, e.buildingLevel));
    return e.upgrades.has("producer-3") ? 3 : e.upgrades.has("producer-2") ? 2 : 1;
  }
  canUpgradeProducer(e: Entity): boolean {
    if (e.dead || e.underConstruction || !isBuildable(e.kind)) return false;
    return this.producerLevel(e) < 3;
  }
  producerUpgradeCost(level: number): number { return level <= 1 ? 260 : 420; }
  buildingUpgradeTime(level: number): number { return level <= 1 ? 10 : 14; }
  buildingLevelName(level: number): string {
    return level >= 3 ? "KÕRGEIM" : level >= 2 ? "TÄIENDATUD" : "BAAS";
  }
  buildingLevelEffect(kind: BuildableKind, level: number): string {
    const effects: Record<string, string[]> = {
      hq: ["Baaskomando", "Suurem command-võrk", "Operatiivne command-võrk"],
      landCommand: ["Maaväe juhtimine", "Parem tootmise juhtimine", "Täiustatud maaväe juhtimine"],
      airCommand: ["Õhuväe juhtimine", "Parem lennuoperatsioonide tempo", "Täiustatud õhuoperatsioonide võrk"],
      seaCommand: ["Mereväe juhtimine", "Parem laevastiku juhtimine", "Täiustatud mereväe võrk"],
      barracks: ["Põhijalavägi", "Täiustatud jalavägi", "Eliit- ja raskerelvad"],
      factory: ["Põhisoomus", "IFV/artillery/recon", "MLRS/AT/õhutõrje eliit"],
      helipad: ["Transpordikopterid", "Ründekopterid", "Täiustatud kopterid/ECM"],
      airbase: ["Põhilennukid", "Multirole/löögilennukid", "Interceptors/bomber/ECM"],
      shipyard: ["Põhilaevad", "Frigates/landing craft", "Destroyer/submarine"],
      supply: ["Baassupply", "Suurem ladu ja FOB-võime", "Suur logistikasõlm"],
      radar: ["Lühike avastus", "Parem radar", "Pika maa sensorivõrk"],
      refinery: ["Ressursitootmine +30%", "Ressursitootmine +60%", "Ressursitootmine +90%"],
      bunker: ["Lihtne kaitse", "Tugevdatud positsioon", "Raske kindlustus"],
      aa: ["Lühimaa AA", "Keskmise maa AA", "Täiustatud õhutõrje"],
      generator: ["Põhienergia", "Suurendatud võimsus", "Suur elektrisõlm"],
      combatEngineer: ["Välikindlustus", "Kiirem remont", "Täiustatud insenerivõime"],
      landStrategy: ["Maatehnoloogia baas", "Täiustatud doktriin", "Eliit maatehnoloogia"],
      airStrategy: ["Õhudoktriini baas", "Täiustatud doktriin", "Eliit õhudoktriin"],
      seaStrategy: ["Mereväedoktriini baas", "Täiustatud doktriin", "Eliit mereväedoktriin"],
    };
    return effects[kind]?.[Math.min(2, Math.max(0, level - 1))] ?? "Täiustatud rajatis";
  }
  unitRequiredBuildingLevel(kind: UnitKind): number {
    const elite = ["special","atgm","manpad","tankDestroyer","spaa","mlrs","gunship","casHeli","interceptor","bomber","ecm","attackAircraft","destroyer","submarine","missileBoat"];
    const advanced = ["engineer","reconInf","sniper","mortar","apc","ifv","artillery","reconVehicle","lightTank","fighter","multirole","frigate","landingcraft"];
    return elite.includes(kind) ? 3 : advanced.includes(kind) ? 2 : 1;
  }
  canProduceAtLevel(producer: Entity, kind: UnitKind): boolean {
    return this.producerLevel(producer) >= this.unitRequiredBuildingLevel(kind);
  }
  /** Phase 71: integrated operational state for production/logistics/command.
   * A producer may exist and have the right level, but it is not operational
   * when its command link, power or logistics backbone is down.
   */
  productionOperational(producer: Entity, kind?: UnitKind): {
    operational: boolean;
    command: boolean;
    power: boolean;
    logistics: boolean;
    strategy: boolean;
    reason: string;
  } {
    if (producer.dead || producer.underConstruction) return { operational: false, command: false, power: false, logistics: false, strategy: false, reason: "Rajatis pole valmis" };
    const command = this.hasCommandLink(producer);
    const power = this.powerStatus(producer.team).ratio >= 0.25;
    const depot = this.nearestSupplyDepot(producer.team, { x: producer.x, z: producer.z }, true);
    const logistics = producer.kind === "barracks" || producer.kind === "factory" || producer.kind === "helipad" || producer.kind === "airbase" || producer.kind === "shipyard"
      ? !!depot && depot.kind === "supply" && Math.hypot(depot.x-producer.x,depot.z-producer.z) <= 80 && (depot.ammoStock ?? 0) > 0 && (depot.fuelStock ?? 0) > 0
      : true;
    const requiredLevel = kind ? this.unitRequiredBuildingLevel(kind) : 1;
    const strategy = requiredLevel < 2 || this.hasStrategyForProducer(producer.team, producer.kind);
    const operational = command && power && logistics && strategy && (producer.disabledUntil ?? 0) <= this.time;
    let reason = "Operatiivne";
    if (!command) reason = "Puudub command-link";
    else if (!power) reason = "Energiapuudus";
    else if (!logistics) reason = "Logistikaühendus puudub";
    else if (!strategy) reason = "Vajab vastava haru strateegiakeskust";
    else if ((producer.disabledUntil ?? 0) > this.time) reason = "Rajatis on kahjustatud";
    return { operational, command, power, logistics, strategy, reason };
  }

  /** Returns the strategic production buildings that can currently operate. */
  operationalProducers(team: Team): Entity[] {
    return this.entities.filter(e => !e.dead && e.team === team && !e.underConstruction &&
      ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(e.kind) && this.productionOperational(e).operational);
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
  incomeMultiplier = 1;
  victoryMode: "hq" | "annihilation" = "hq";

  /** Staatilised kaardiobjektid; neid kasutavad simulatsioon, navigeerimine ja UI. */
  readonly mapFeatures: readonly MapFeatureDef[];

  constructor(seed = 1, private objectiveDriven = false, resources: readonly MapResourceDef[] = [], features: readonly MapFeatureDef[] = [], bases: readonly BaseDef[] = [], baseDefenses = true) {
    this.rngState = new Rng(seed);
    this.bases = bases.length ? bases.map((b) => ({ ...b })) : getBases();
    // Build height cache once bases are known (huge win for LOS / movement)
    ensureHeightCache();
    this.resourcePoints = resources.length ? resources.map(r=>({...r})) : [
      { x: -70, z: 70, amount: 1000, radius: 12 }, { x: 70, z: -70, amount: 1000, radius: 12 },
    ];
    this.mapFeatures = [...features.map(f=>({...f})),...(baseDefenses?generateBaseFeatures(this.bases):[]),
      ...this.resourcePoints.map((rp,i):MapFeatureDef=>({id:`resource-facility-${i}`,kind:"building",x:rp.x+18,z:rp.z,width:13,depth:12,height:6,appearance:rp.facility==="oilfield"?"resource-oil":"resource-industrial",label:"Ressursirajatis"}))];
    this.rng = () => this.rngState.next();
    this.nav = new NavGrid([], this.mapFeatures);
    this.vision = new Vision();this.vision.setFeatures(this.mapFeatures);
    this.operationalMap = new OperationalMap(this);
    this.operationalCommander = new OperationalCommander(this.operationalMap, this);
    this.fobManager = new FOBManager(this);
    this.frontline = new FrontlineController(this);
  }

  spawn(kind: UnitKind, team: Team, x: number, z: number): Entity {
    const baseDef = UNITS[kind];
    const faction = team === this.playerTeam ? this.playerFaction : this.enemyFaction;
    const b = FACTIONS[faction].bonuses;
    // Per-faction slight stat skew (clone def so shared UNITS table stays pristine)
    const def = baseDef.speed > 0 || baseDef.damage > 0 || baseDef.building
      ? {
          ...baseDef,
          hp: Math.round(baseDef.hp * b.armorMul),
          speed: baseDef.speed * b.speedMul,
          damage: Math.round(baseDef.damage * b.damageMul),
          cost: Math.round(baseDef.cost * b.buildCostMul),
          opticsRange: (baseDef.opticsRange ?? 40) * (b.opticsMul ?? 1),
          armorFront: baseDef.armorFront != null ? Math.round(baseDef.armorFront * b.armorMul) : baseDef.armorFront,
          armorSide: baseDef.armorSide != null ? Math.round(baseDef.armorSide * b.armorMul) : baseDef.armorSide,
          armorRear: baseDef.armorRear != null ? Math.round(baseDef.armorRear * b.armorMul) : baseDef.armorRear,
        }
      : { ...baseDef };
    const y = heightAt(x, z), heading = team ? -Math.PI / 4 : Math.PI * 0.75;
    const e: Entity = {
      id: this.nextId++, kind, team, def, x, y, z, heading, turretYaw: 0,
      px: x, pz: z, pHeading: heading, pTurretYaw: 0,
      hp: def.hp, cooldown: this.rng() * 0.5, mode: "idle", dest: null, target: null,
      aggro: team === 1 && def.speed > 0 ? ENEMY_AGGRO : def.range, dead: false,
      xp: 0, veteran: 0, spottedUntil: [0, 0], suppression: 0, supply: 100, maxSupply: 100, role: (["artillery","mortar"].includes(kind)) ? "siege" : ["aa","manpad","spaa"].includes(kind) ? "support" : kind === "fighter" ? "air-superiority" : kind === "gunship" ? "air-ground" : kind === "transport" || kind === "cargoPlane" ? "logistics" : "line", fuel: def.fuelCapacity ?? 0, maxFuel: def.fuelCapacity ?? 0, ammo: def.ammoCapacity ?? 0, maxAmmo: def.ammoCapacity ?? 0, fireMission: null, holdPosition: false, patrolPoints: [], patrolIndex: 0, upgrades: new Set<string>(), cargo: 0, logisticsTarget: null, logisticsHome: null, logisticsPhase: "idle", productionQueue: [], productionProgress: 0, rallyPoint: null, constructionProgress: 1, constructionTime: 0, upgrading: false, upgradeProgress: 0, upgradeTime: 0, upgradeKind: undefined, logisticsRoute: kind === "logiTruck" ? "road" : kind === "transport" ? "air" : kind === "cargoPlane" ? "strategic" : undefined, logisticsCargoCapacity: kind === "logiTruck" ? ROAD_TRUCK_CARGO : undefined, logisticsDistance: 0, logisticsStorage: 0, logisticsMaxStorage: 0, firingArc: (kind === "bunker" ? Math.PI * 0.62 : kind === "aa" ? Math.PI * 0.9 : kind === "artillery" ? Math.PI * 0.98 : Math.PI * 2), firingRange: def.range, facingLocked: kind === "bunker" || kind === "aa", lastCombatTime: 0, morale: 100, disabledUntil: 0, builderIds: [], underConstruction: false, cargoUnitIds: [], loadedIntoId: null, transportTargetId: null, unloadPoint: null,
      navPath: [], navPathIndex: 0, flowField: null, stuckTime: 0, stuckX: x, stuckZ: z,
    };
    const squadDefs: Record<string, { max: number; role: NonNullable<Entity["squadRole"]> }> = {
      inf: { max: 8, role: "rifle" }, atInf: { max: 7, role: "at" }, mgInf: { max: 7, role: "mg" },
      reconInf: { max: 6, role: "recon" }, sniper: { max: 4, role: "sniper" }, manpad: { max: 6, role: "manpad" },
      atgm: { max: 5, role: "at" }, engineer: { max: 6, role: "engineer" }, combatEngineer: { max: 6, role: "engineer" },
    };
    const squad = squadDefs[kind];
    if (squad) { e.squadMaxMembers = squad.max; e.squadMembers = squad.max; e.squadRole = squad.role; e.squadFirepower = 1; }
    if (def.speed > 0 && !squad) e.components = { engine: 0, tracks: 0, turret: 0, weapon: 0, crew: 0, ammo: 0 };
    ensureLogisticsPools(e);
    if (kind === "hq") { e.ammoStock=120; e.fuelStock=200; e.repairStock=80; }
    if (kind === "supply") { const level = e.supplyLevel ?? 0; e.logisticsMaxStorage = (logisticsConfig.depot.ammoCapacity+logisticsConfig.depot.fuelCapacity+logisticsConfig.depot.repairCapacity)*(1+level*logisticsConfig.depot.capacityPerLevel); e.logisticsStorage = 1250+level*520; e.ammoStock = 420 + level * 180; e.fuelStock = 650 + level * 250; e.repairStock = 180 + level * 90; e.logisticsPriority = "balanced"; }
    this.entities.push(e);
    this.byId.set(e.id, e);
    if (kind === "hq") this.hq[team] = e;
    if (kind === "special") e.role = "support";
    if (["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(kind)) e.role = kind === "landingcraft" ? "logistics" : "line";
    if (def.speed === 0) this.navDirty = true;
    return e;
  }

  private updateResourceControl(dt: number): void {
    let scores: [number, number] = [0, 0];
    for (const rp of this.resourcePoints) {
      const nearby = ([0, 1] as const).map(team => this.entities.filter(e => !e.dead && e.team === team && e.def.speed > 0 && e.def.armor !== "air" && e.def.domain !== "sea" && !["logiTruck","cargoPlane","transport"].includes(e.kind) && e.loadedIntoId === null && Math.hypot(e.x-rp.x,e.z-rp.z) <= rp.radius + 10));
      const a = nearby[0].length, b = nearby[1].length,previousOwner=rp.controlledBy;
      if (a > 0 && b === 0) { rp.controlProgress = Math.min(1, (rp.controlProgress ?? 0.5) + dt * 0.22 * Math.min(2, a)); if (rp.controlProgress >= 1) rp.controlledBy = 0; }
      else if (b > 0 && a === 0) { rp.controlProgress = Math.max(0, (rp.controlProgress ?? 0.5) - dt * 0.22 * Math.min(2, b)); if (rp.controlProgress <= 0) rp.controlledBy = 1; }
      else if (a > 0 && b > 0) rp.controlProgress = Math.max(0, Math.min(1, rp.controlProgress ?? (rp.controlledBy === 0 ? 1 : 0)));
      if(previousOwner!==rp.controlledBy){rp.active=false;rp.startupProgress=0;rp.productionRate=0;}
      if (rp.controlledBy !== undefined && rp.controlledBy !== null) { scores[rp.controlledBy] += 1; }
      // A captured industrial point has to be restarted before it produces anything.
      if (rp.controlledBy != null && !(rp.disabledUntil && rp.disabledUntil > this.time)) {
        const owner = rp.controlledBy;
        const startupCrew = nearby[owner].some(e => e.kind === "engineer");
        if (!rp.active && startupCrew) { rp.startupProgress = (rp.startupProgress ?? 0) + dt; if ((rp.startupProgress ?? 0) >= RESOURCE_FACILITY_STARTUP) rp.active = true; }
        if (a>0&&b>0)rp.productionRate=0;
        if (rp.active && !(a>0&&b>0) && (rp.amount ?? 0) < (rp.maxStock ?? RESOURCE_FACILITY_MAX_STOCK)) {
          const kind = rp.facility ?? "mine";
          const base = RESOURCE_FACILITY_PRODUCTION[kind];
          const refineryLevel=this.entities.filter(e=>!e.dead&&!e.underConstruction&&e.kind==="refinery"&&e.team===owner&&(e.disabledUntil??0)<=this.time&&Math.hypot(e.x-rp.x,e.z-rp.z)<=rp.radius+e.def.radius+5&&this.productionOperational(e).operational)
            .reduce((level,e)=>Math.max(level,this.producerLevel(e)),0);
          rp.productionRate = base * Math.max(1, rp.level ?? 1)*(1+refineryLevel*logisticsConfig.refineryProductionPerLevel);
          rp.amount = Math.min(rp.maxStock ?? RESOURCE_FACILITY_MAX_STOCK, rp.amount + rp.productionRate * dt);
        } else rp.productionRate=0;
      }
      if (rp.controlledBy == null || (rp.disabledUntil ?? 0) > this.time) { rp.active = false; rp.startupProgress = 0; rp.productionRate = 0; }
      if (a > 0 && b > 0) { this.teamMorale[0] = Math.max(0, this.teamMorale[0] - 0.02 * dt); this.teamMorale[1] = Math.max(0, this.teamMorale[1] - 0.02 * dt); }
    }
    this.areaControl = scores;
    for (const team of [0,1] as const) this.teamMorale[team] = Math.min(100, this.teamMorale[team] + dt * (scores[team] * 0.035));
    this.credits = this.teamCredits[this.playerTeam];
  }

  /** Wargame-style sensors + last-known contacts. */
  private updateIntel(): void {
    // ~6–7 Hz is enough for detection
    if (Math.floor(this.time * 30) % 5 !== 0) return;
    updateSensors(this);
  }

  getIntel(team: Team, sharedOnly = true): IntelContact[] {
    return [...this.intel[team].values()].filter(c => !sharedOnly || c.shared).map(c => ({ ...c }));
  }

  getFreshIntel(team: Team, maxAge = 25): IntelContact[] {
    return this.getIntel(team, true).filter(c => this.time - c.lastSeen <= maxAge);
  }

  isSpottedByTeam(entity: { spottedUntil: [number, number] }, team: Team): boolean {
    return (entity.spottedUntil[team] ?? 0) > this.time;
  }

  nearestSupplyDepot(team: Team, p: {x:number;z:number}, connectedOnly = false): Entity | null {
    const nodes = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const allowed = connectedOnly ? nodes.filter(n => this.connectedSupplyNodes(team).some(c => c.id === n.id)) : nodes;
    return allowed.sort((a,b) => Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0] ?? this.hq[team];
  }

  isInSupply(e: Entity): boolean {
    return isTacticallySupplied(this, e);
  }

  /** Connected HQ + supply depots (for chain / airbridge). */
  connectedSupplyNodes(team: Team): Entity[] {
    const hq = this.hq[team];
    if (!hq || hq.dead) return [];
    const nodes: Entity[] = [hq];
    const seen = new Set<number>([hq.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const depot of this.entities) {
        if (depot.dead || depot.underConstruction || depot.team !== team || depot.kind !== "supply") continue;
        if (seen.has(depot.id)) continue;
        if (nodes.some(n => this.logisticsConnectionOpen(n, depot))) {
          nodes.push(depot); seen.add(depot.id); changed = true;
        }
      }
    }
    return nodes;
  }

  logisticsConnectionOpen(a: Entity, b: Entity): boolean {
    const max = a.kind === "hq" ? 115 : this.isFOB(a) ? 118 : 92;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > max) return false;
    // A destroyed bridge inside the corridor cuts the node connection.
    for (const f of this.mapFeatures) {
      if (f.kind !== "bridge") continue;
      const damage = this.infrastructureDamage.get(f.id) ?? 0;
      if (damage >= 1 && Math.hypot(f.x - (a.x+b.x)/2, f.z - (a.z+b.z)/2) < max * 0.9) return false;
    }
    return true;
  }

  infrastructureStatus(): { bridges: number; damaged: number; destroyed: number } {
    const bridges = this.mapFeatures.filter(f => f.kind === "bridge").length;
    let damaged = 0, destroyed = 0;
    for (const f of this.mapFeatures) if (f.kind === "bridge") { const d = this.infrastructureDamage.get(f.id) ?? 0; if (d > 0 && d < 1) damaged++; if (d >= 1) destroyed++; }
    return { bridges, damaged, destroyed };
  }

  damageInfrastructure(id: string, amount: number): void {
    const f = this.mapFeatures.find(x => x.id === id); if (!f || !["bridge","road"].includes(f.kind)) return;
    const old = this.infrastructureDamage.get(id) ?? 0;
    this.infrastructureDamage.set(id, Math.min(1, old + amount));
    if (old < 1 && old + amount >= 1) this.events.push({ type: "supply-delivered", team: this.playerTeam, x: f.x, z: f.z, amount: 0 });
  }

  supplyRouteStatus(team: Team): { connected: number; total: number } {
    const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const connected = this.connectedSupplyNodes(team).filter(e => e.kind === "supply").length;
    return { connected, total: depots.length };
  }

  private updateSupply(dt: number): void {
    updateTacticalSupply(this, dt);
  }

  sabotageBuilding(target: Entity, duration = 25): void {
    target.disabledUntil = Math.max(target.disabledUntil ?? 0, this.time + duration);
    if (["generator", "radar", "airbase", "shipyard"].includes(target.kind)) this.teamMorale[target.team] = Math.max(0, this.teamMorale[target.team] - 5);
  }

  isFOB(e: Entity): boolean { return e.kind === "supply" && (e.fobLevel ?? 0) > 0; }

  commandNodes(team: Team): Entity[] {
    return this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && (e.kind === "hq" || ["landCommand","airCommand","seaCommand"].includes(e.kind) || this.isFOB(e)));
  }

  commandNodeRange(node: Entity): number {
    if (node.kind === "hq") return 92*(1+((node.buildingLevel??1)-1)*.2);
    if (this.isFOB(node)) return 78 + Math.min(30, (node.fobLevel ?? 1) * 10);
    return 68*(1+((node.buildingLevel??1)-1)*.15);
  }

  hasCommandLink(entity: Entity): boolean {
    if (entity.kind === "hq") return true;
    const nodes = this.commandNodes(entity.team);
    return nodes.some(n => Math.hypot(n.x - entity.x, n.z - entity.z) <= this.commandNodeRange(n));
  }

  commandNetworkStatus(team: Team): { nodes: number; fobs: number; linked: number; coverage: number } {
    const nodes = this.commandNodes(team);
    const fobs = nodes.filter(n => this.isFOB(n)).length;
    let linked = 0;
    for (const e of this.entities) if (!e.dead && e.team === team && e.def.speed > 0 && this.hasCommandLink(e)) linked++;
    const coverage = this.entities.filter(e => !e.dead && e.team === team && e.def.speed > 0).length ? linked / this.entities.filter(e => !e.dead && e.team === team && e.def.speed > 0).length : 1;
    return { nodes: nodes.length, fobs, linked, coverage };
  }

  upgradeFOB(team: Team, depotId: number): boolean {
    const depot = this.byId.get(depotId);
    if (!depot || depot.dead || depot.underConstruction || depot.team !== team || depot.kind !== "supply") return false;
    if ((depot.fobLevel ?? 0) >= 2) return false;
    const level = depot.fobLevel ?? 0;
    const cost = 300 + level * 220;
    if (this.teamResources[team] < cost || this.teamCredits[team] < cost) return false;
    this.teamResources[team] -= cost; this.teamCredits[team] -= cost;
    depot.fobLevel = level + 1;
    depot.supplyLevel = Math.max(depot.supplyLevel ?? 0, 2 + level);
    depot.logisticsMaxStorage = Math.max(depot.logisticsMaxStorage ?? 0, 1800 + (depot.fobLevel ?? 0) * 900);
    depot.ammoStock = Math.min(depot.logisticsMaxStorage, (depot.ammoStock ?? 0) + 360);
    depot.fuelStock = Math.min(depot.logisticsMaxStorage, (depot.fuelStock ?? 0) + 500);
    depot.repairStock = Math.min(depot.logisticsMaxStorage, (depot.repairStock ?? 0) + 180);
    this.commandNetworkLevel[team] = Math.max(this.commandNetworkLevel[team], depot.fobLevel ?? 1);
    if (team === this.playerTeam) { this.resources = this.teamResources[team]; this.credits = this.teamCredits[team]; }
    return true;
  }

  setDepotPriority(team: Team, priority: "ammo" | "fuel" | "repair" | "balanced"): void {
    this.logisticsPriority[team] = priority;
    for (const d of this.entities) if (!d.dead && d.team === team && d.kind === "supply") d.logisticsPriority = priority;
  }

  clearLogisticsRoute(depot: Entity): void { depot.logisticsWaypoints = []; depot.logisticsRouteMode = "direct"; }

  addLogisticsWaypoint(depot: Entity, point: {x:number;z:number}, append = true): void {
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.abs(point.x)>MAP_SIZE/2-10||Math.abs(point.z)>MAP_SIZE/2-10)return;
    if (!depot.logisticsWaypoints) depot.logisticsWaypoints = [];
    if (!append) depot.logisticsWaypoints = [];
    if(depot.logisticsWaypoints.length>=24)return;
    depot.logisticsWaypoints.push({x:point.x,z:point.z});
    depot.logisticsRouteMode = "manual";
  }
  hasBuilding(team: Team, kind: UnitKind): boolean { return this.entities.some(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind); }

  hasCommandLinkToPoint(team: Team, p: { x: number; z: number }): boolean {
    const nodes = this.commandNodes(team);
    return nodes.some(n => Math.hypot(n.x - p.x, n.z - p.z) <= this.commandNodeRange(n));
  }

  frontlineStatus(team: Team): ReturnType<FrontlineController["status"]> {
    return this.frontline.status(team);
  }

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
    if(Math.abs(x)+buildFootprint(kind)>MAP_SIZE/2-10||Math.abs(z)+buildFootprint(kind)>MAP_SIZE/2-10)return false;
    const r = buildFootprint(kind);
    // Soft walkability – allow gentle slopes so crater edges don't block builds
    if (!this.nav.isWalkableWorld(x, z, r * 0.45)) return false;
    if (this.entities.some(e => !e.dead && (e.def.speed === 0 || e.underConstruction) && Math.hypot(e.x - x, e.z - z) < r + e.def.radius + 1.2)) return false;
    // Only hard walls/chokepoints block; roads/gates/cover never do
    if (this.mapFeatures.some(f => (f.kind === "wall" || f.kind === "chokepoint") && pointInFeature(x,z,f,r+1))) return false;
    if(this.mapFeatures.some(f=>f.kind==="gate"&&f.id.startsWith("base-")&&Math.hypot(f.x-x,f.z-z)<r+12))return false;
    if (kind === "refinery" && !this.resourcePoints.some(p => Math.hypot(p.x - x, p.z - z) <= p.radius + r)) return false;
    if (["supply", "generator", "radar", "helipad", "bunker", "aa", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"].includes(kind)) return true;
    return this.bases[team] ? Math.hypot(this.bases[team].x - x, this.bases[team].z - z) < 155 : true;
  }

  unitDisplayName(kind: UnitKind, team?: Team): string {
    const faction = (team ?? this.playerTeam) === this.playerTeam ? this.playerFaction : this.enemyFaction;
    return factionUnitName(faction, kind, UNITS[kind].name);
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

  setNetworkMode(team: Team): void { if(team!==this.playerTeam)[this.playerFaction,this.enemyFaction]=[this.enemyFaction,this.playerFaction];this.networkMode = true; this.playerTeam = team; this.credits = this.teamCredits[team]; this.resources = this.teamResources[team]; }

  setNetworkDecks(decks: typeof this.networkDecks): void {
    this.networkDecks = structuredClone(decks);
    this.networkBattlegroups = this.networkDecks.map(d => d ? new BattleGroupController(d) : null) as typeof this.networkBattlegroups;
  }
  deckForTeam(team: Team) { return this.networkMode ? this.networkDecks[team] : team === this.playerTeam ? this.activeDeck : null; }
  battlegroupForTeam(team: Team) { return this.networkMode ? this.networkBattlegroups[team] : team === this.playerTeam ? this.activeBattlegroup : null; }
  producedForTeam(team: Team) { return this.networkMode ? this.networkProducedCounts[team] : this.producedCounts; }
  setActiveDeck(deck: import("./deck").FactionDeck | null): void { this.activeDeck = deck; this.activeBattlegroup = deck ? new BattleGroupController(deck) : null; }

  setMatchRules(rules: { income?: "standard" | "high" | "low"; victory?: "hq" | "annihilation" }): void {
    this.incomeMultiplier = rules.income === "high" ? 1.8 : rules.income === "low" ? 0.55 : 1;
    this.victoryMode = rules.victory === "annihilation" ? "annihilation" : "hq";
  }

  airbaseStatus(team: Team): { capacity: number; aircraft: number; ready: number } {
    const bases = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "airbase");
    const capacity = bases.reduce((n,b)=>n+4+this.producerLevel(b)*2,0);
    const aircraft = this.entities.filter(e => !e.dead && e.team === team && e.def.category === "air").length;
    const ready = this.entities.filter(e => !e.dead && e.team === team && e.def.category === "air" && (e.airState === "grounded" || e.airState === "rearming" || e.airState == null)).length;
    return { capacity, aircraft, ready };
  }

  /** One 1–3 building level drives both depot upgrades and the physical fleet. */
  supplyDepotLevel(depot:Entity):number {return Math.min(2,Math.max(depot.supplyLevel??0,this.producerLevel(depot)-1));}

  supplyDepotStatus(team: Team): { depots: number; active: number; level: number; rate: number } {
    const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    const active = this.entities.filter(e => !e.dead && e.team === team && e.kind === "transport" && e.supplyDepotId != null).length;
    const level = depots.reduce((m, d) => Math.max(m, this.supplyDepotLevel(d)), 0);
    const fobs = depots.filter(d => this.isFOB(d)).length; return { depots: depots.length, active, level, rate: 1 + level * 0.35 + fobs * 0.2 };
  }

  upgradeSupplyDepot(team: Team, depotId: number): boolean {
    const depot = this.byId.get(depotId);
    if (!depot || depot.dead || depot.underConstruction || depot.team !== team || depot.kind !== "supply") return false;
    const level = this.supplyDepotLevel(depot);
    if (level >= 2) return false;
    const cost = 180 + level * 120;
    if (this.teamResources[team] < cost || this.teamCredits[team] < cost) return false;
    this.teamResources[team] -= cost; this.teamCredits[team] -= cost;
    depot.supplyLevel = level + 1;
    depot.buildingLevel=Math.max(this.producerLevel(depot),level+2);
    depot.logisticsMaxStorage=(logisticsConfig.depot.ammoCapacity+logisticsConfig.depot.fuelCapacity+logisticsConfig.depot.repairCapacity)*(1+(level+1)*logisticsConfig.depot.capacityPerLevel);
    if (team === this.playerTeam) { this.resources = this.teamResources[team]; this.credits = this.teamCredits[team]; }
    return true;
  }

  receiveSupply(depot: Entity, amount: number): void {
    const team=depot.team;
    this.teamResources[team]+=amount*.6; this.teamCredits[team]+=amount*.6;
    const priority=depot.logisticsPriority??"balanced";
    const budget=amount*.4,capacity=1+this.supplyDepotLevel(depot)*logisticsConfig.depot.capacityPerLevel;
    depot.ammoStock=Math.min(logisticsConfig.depot.ammoCapacity*capacity,(depot.ammoStock??0)+budget*(priority==="ammo"?.65:priority==="fuel"?.25:priority==="repair"?.25:.4));
    depot.fuelStock=Math.min(logisticsConfig.depot.fuelCapacity*capacity,(depot.fuelStock??0)+budget*(priority==="fuel"?.65:priority==="ammo"?.25:priority==="repair"?.25:.4));
    depot.repairStock=Math.min(logisticsConfig.depot.repairCapacity*capacity,(depot.repairStock??0)+budget*(priority==="repair"?.5:priority==="balanced"?.2:.1));
    depot.logisticsStorage=(depot.ammoStock??0)+(depot.fuelStock??0)+(depot.repairStock??0);
    if(team===this.playerTeam){this.credits=this.teamCredits[team];this.resources=this.teamResources[team];}
  }

  resourceEconomyStatus(team: Team): { controlled: number; active: number; stock: number; rate: number; contested: number } {
    const points = this.resourcePoints.filter(r => r.controlledBy === team);
    const active = points.filter(r => r.active && (r.disabledUntil ?? 0) <= this.time);
    const contested = this.resourcePoints.filter(r => (r.controlProgress ?? 0) > 0 && (r.controlProgress ?? 0) < 1).length;
    return { controlled: points.length, active: active.length, stock: Math.floor(active.reduce((n,r) => n + (r.amount ?? 0), 0)), rate: active.reduce((n,r) => n + (r.productionRate ?? 0), 0), contested };
  }

  airliftStatus(team: Team): { pool: number; delivered: number; lost: number; enabled: boolean; inFlight: number } {
    const airbases = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "airbase");
    const enabled = airbases.some(a => this.producerLevel(a) >= 2);
    const inFlight = this.entities.filter(e => !e.dead && e.team === team && e.kind === "cargoPlane").length;
    return { pool: Math.floor(this.airCargoPool[team]), delivered: Math.floor(this.airCargoDelivered[team]), lost: Math.floor(this.airCargoLost[team]), enabled, inFlight };
  }

  private updateStrategicAirlift(dt: number): void {
    for (const team of [0,1] as const) {
      // Strategic airlift is an external supply line: it is unlocked only by a developed airport.
      const bases = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "airbase");
      const base = bases.find(a => this.producerLevel(a) >= 2) ?? null;
      const airLevel = base ? (this.producerLevel(base)) : 0;
      if (airLevel > 1) this.airCargoPool[team] = Math.min(1400, this.airCargoPool[team] + AIR_CARGO_INCOME_PER_SEC * (1 + Math.max(0, airLevel - 2) * 0.65) * this.incomeMultiplier * dt);
      if (!base || !this.productionOperational(base).operational || this.airCargoPool[team] < 40) continue;
      const inFlight = this.entities.filter(e => !e.dead && e.team === team && e.kind === "cargoPlane").length;
      if (inFlight > 0 || this.time - this.airCargoLastSpawn[team] < AIR_CARGO_INTERVAL) continue;
      const amount = Math.min(AIR_CARGO_LOAD, Math.floor(this.airCargoPool[team]));
      this.airCargoPool[team] -= amount;
      this.airCargoLastSpawn[team] = this.time;
      const edgeX = team === 0 ? -MAP_SIZE/2+15 : MAP_SIZE/2-15;
      const plane = this.spawn("cargoPlane", team, edgeX, base.z + (this.rng() - 0.5) * 40);
      plane.cargo = amount;
      plane.logisticsHome = { x: base.x, z: base.z };
      plane.logisticsPhase = "idle";
      plane.mode = "patrol";
      plane.dest = { x: base.x, z: base.z };
    }
  }

  /** Phase 62: determine the primary warehouse for a team. The closest supply depot to HQ is the trunk node. */
  primarySupplyDepot(team: Team): Entity | null {
    const hq = this.hq[team];
    const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply");
    if (!depots.length) return hq;
    return depots.sort((a,b) => {
      const da = hq ? Math.hypot(a.x-hq.x,a.z-hq.z) : 0;
      const db = hq ? Math.hypot(b.x-hq.x,b.z-hq.z) : 0;
      return da-db;
    })[0] ?? null;
  }

  /** Phase 62: nearest usable depot, preferring the local forward depot. */
  nearestResourceDepot(team: Team, x: number, z: number): Entity | null {
    return this.entities
      .filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply")
      .sort((a,b) => (Math.hypot(a.x-x,a.z-z) - (this.isFOB(a) ? 10 : 0)) - (Math.hypot(b.x-x,b.z-z) - (this.isFOB(b) ? 10 : 0)))[0] ?? this.primarySupplyDepot(team);
  }

  roadLogisticsStatus(team: Team): { trucks: number; cargo: number; delivered: number; lost: number; disconnected: number; ammo: number; fuel: number; repair: number } {
    const trucks = this.entities.filter(e => !e.dead && e.team === team && e.kind === "logiTruck");
    const cargo = Math.floor(trucks.reduce((n,e)=>n+(e.cargo??0),0) + this.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="transport"&&e.supplyDepotId!=null).reduce((n,e)=>n+(e.cargo??0),0));
    const disconnected = this.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="supply"&&e !== this.primarySupplyDepot(team) && (e.logisticsStorage??0)>0 && !this.connectedSupplyNodes(team).some(n=>n.id===e.id)).length;
    const stocks = this.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="supply");
    return { trucks: trucks.length, cargo, delivered: Math.floor(this.roadCargoDelivered[team]), lost: Math.floor(this.roadCargoLost[team]), disconnected, ammo: Math.floor(stocks.reduce((n,e)=>n+(e.ammoStock??0),0)), fuel: Math.floor(stocks.reduce((n,e)=>n+(e.fuelStock??0),0)), repair: Math.floor(stocks.reduce((n,e)=>n+(e.repairStock??0),0)) };
  }

  private convoyExit(depot:Entity,goal:{x:number,z:number}):{x:number,z:number}|null {
    const angle=Math.atan2(goal.x-depot.x,goal.z-depot.z),radius=depot.def.radius+UNITS.logiTruck.radius+4;
    for(let i=0;i<16;i++){const a=angle+Math.PI/8*i,p={x:depot.x+Math.sin(a)*radius,z:depot.z+Math.cos(a)*radius};if(this.nav.isWalkableWorld(p.x,p.z,UNITS.logiTruck.radius)&&findPath(this.nav,p,goal,UNITS.logiTruck.radius).length)return p;}
    return null;
  }
  private updateRoadConvoys(_dt: number): void {
    for (const team of [0,1] as const) {
      const depots = this.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === "supply" && this.productionOperational(e).operational);
      if (!depots.length) continue;
      const main = this.primarySupplyDepot(team);
      if (!main) continue;

      // Collect stock from captured industrial sites into the nearest forward depot.
      for (let i=0; i<this.resourcePoints.length; i++) {
        const rp = this.resourcePoints[i];
        if (rp.controlledBy !== team || !rp.active || (rp.disabledUntil ?? 0) > this.time || (rp.amount ?? 0) <= 0) continue;
        const depot = this.nearestResourceDepot(team, rp.x, rp.z);
        if (!depot || depot.logisticsPaused || depot.preferredResourceIndex!=null&&depot.preferredResourceIndex!==i) continue;
        const activeTrucks = this.entities.filter(t => !t.dead && t.team === team && t.kind === "logiTruck" && t.supplyDepotId === depot.id && t.logisticsSourceIndex === i);
        const max = ROAD_TRUCK_MAX_PER_DEPOT + this.supplyDepotLevel(depot);
        if (activeTrucks.length >= max) continue;
        if (this.time - this.roadTruckLastSpawn[team] < ROAD_TRUCK_INTERVAL / Math.max(1, 1 + this.supplyDepotLevel(depot)*0.35)) continue;
        this.roadTruckLastSpawn[team]=this.time;
        const exit=this.convoyExit(depot,rp);if(!exit)continue;
        const t = this.spawn("logiTruck", team, exit.x, exit.z);
        t.supplyDepotId = depot.id; t.logisticsSourceIndex = i; t.logisticsHome = {x: depot.x, z: depot.z}; t.logisticsTarget = {x: rp.x, z: rp.z};
        t.logisticsPhase = "idle"; t.logisticsRoute = "road"; t.logisticsCargoCapacity = ROAD_TRUCK_CARGO + this.supplyDepotLevel(depot)*45 + (this.isFOB(depot) ? 60 : 0); t.logisticsLoadProgress = 0; t.mode = "move"; t.dest = t.logisticsTarget; t.patrolPoints = (depot.logisticsWaypoints ?? []).map(p => ({...p})); t.patrolIndex = 0;
        this.roadTruckLastSpawn[team] = this.time;
      }

      // Supply the forward network with physical trucks. No teleporting depot refill.
      for (const depot of depots) {
        if(depot.logisticsPaused || depot===main || !this.connectedSupplyNodes(team).some(n=>n.id===depot.id)) continue;
        if(this.entities.some(t=>!t.dead&&t.team===team&&t.kind==="logiTruck"&&t.supplyDepotId===depot.id&&t.logisticsSourceIndex==null)) continue;
        if(this.time-this.roadTruckLastSpawn[team]<ROAD_TRUCK_INTERVAL)continue;
        this.roadTruckLastSpawn[team]=this.time;
        const exit=this.convoyExit(main,depot);if(!exit)continue;
        const tr=this.spawn("logiTruck",team,exit.x,exit.z);
        tr.supplyDepotId=depot.id;tr.logisticsSourceIndex=null;tr.logisticsHome={x:main.x,z:main.z};
        tr.logisticsTarget={x:depot.x,z:depot.z};tr.logisticsPhase="idle";tr.logisticsCargoCapacity=ROAD_TRUCK_CARGO;
        tr.mode="move";tr.dest=tr.logisticsHome;
      }
    }
  }

  private updateSupplyAirbridge(): void {
    for(const team of [0,1] as const){
      const depots=this.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===team&&e.kind==="supply");
      for(const depot of depots){
        if(depot.logisticsPaused||!this.productionOperational(depot).operational||this.time<(depot.nextLogisticsDispatch??0))continue;
        const fleet=this.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="transport"&&e.supplyDepotId===depot.id);
        const max=Math.min(logisticsConfig.air.maxFleet,1+this.supplyDepotLevel(depot));
        if(fleet.length>=max)continue;
        const rp=this.resourcePoints.filter((r,i)=>(depot.preferredResourceIndex==null||i===depot.preferredResourceIndex)&&r.active&&r.controlledBy===team&&(r.disabledUntil??0)<=this.time&&r.amount>=1)
          .sort((a,b)=>Math.hypot(a.x-depot.x,a.z-depot.z)-Math.hypot(b.x-depot.x,b.z-depot.z))[0];
        if(!rp||(depot.fuelStock??0)<logisticsConfig.air.reserveFuel)continue;
        const apron={x:depot.x-depot.def.radius-5,z:depot.z};
        const h=this.spawn("transport",team,apron.x,apron.z);
        const fuel=Math.min(logisticsConfig.air.dispatchFuel,depot.fuelStock??0);depot.fuelStock=(depot.fuelStock??0)-fuel;h.fuel=fuel;
        h.supplyDepotId=depot.id;h.logisticsHome=apron;h.logisticsTarget={x:rp.x,z:rp.z};h.logisticsSourceIndex=this.resourcePoints.indexOf(rp);
        h.logisticsPhase="idle";h.logisticsLoadProgress=0;h.mode="patrol";h.dest=h.logisticsTarget;
        depot.nextLogisticsDispatch=this.time+logisticsConfig.air.dispatchInterval/Math.max(1,1+this.supplyDepotLevel(depot)*.2);
      }
    }
  }

  /** Phase 71: one compact snapshot for HUD/AI without duplicating graph logic. */
  operationalStatus(team: Team): {
    economy: ReturnType<World["resourceEconomyStatus"]>;
    command: ReturnType<World["commandNetworkStatus"]>;
    logistics: ReturnType<World["roadLogisticsStatus"]>;
    power: ReturnType<World["powerStatus"]>;
    producers: number;
  } {
    return {
      economy: this.resourceEconomyStatus(team),
      command: this.commandNetworkStatus(team),
      logistics: this.roadLogisticsStatus(team),
      power: this.powerStatus(team),
      producers: this.operationalProducers(team).length,
    };
  }

  repairMultiplier(team:Team):number {return this.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===team&&e.kind==="combatEngineer").reduce((n,e)=>Math.max(n,1+.25*this.producerLevel(e)),1);}

  invalidateNavigation(): void {this.navDirty=true;this.powerCache=null;}

  captureRuntime() {
    return {
      playerTeam: this.playerTeam, playerFaction: this.playerFaction, enemyFaction: this.enemyFaction,
      networkMode: this.networkMode, incomeMultiplier: this.incomeMultiplier, victoryMode: this.victoryMode,
      objectiveDriven: this.objectiveDriven, externalVictoryMode: this.externalVictoryMode,
      airCargoLastSpawn: [...this.airCargoLastSpawn] as [number,number],
      roadTruckLastSpawn: [...this.roadTruckLastSpawn] as [number,number],
      logisticsPriority: [...this.logisticsPriority] as typeof this.logisticsPriority,
      commandNetworkLevel: [...this.commandNetworkLevel], lossValue: [...this.lossValue] as [number,number],
      teamFormations: [...this.teamFormations] as typeof this.teamFormations,
      producedCounts: { ...this.producedCounts }, activeDeck: this.activeDeck,
      networkDecks: this.networkDecks, networkProducedCounts: structuredClone(this.networkProducedCounts),
      networkBattlegroups: this.networkBattlegroups.map(b => b?.snapshot() ?? null),
      ai: { buildTimer:this.ai.buildTimer, attackTimer:this.ai.attackTimer, scoutTimer:this.ai.scoutTimer,
        counterAttackTimer:this.ai.counterAttackTimer, expansionTimer:this.ai.expansionTimer,
        defendTimer:this.ai.defendTimer, doctrineTimer:this.ai.doctrineTimer, airTimer:this.ai.airTimer,
        personality:this.ai.personality, difficulty:this.ai.difficulty, phase:this.ai.phase },
      plans: this.operationalCommander.plans.map(p=>({...p})),
      vision: this.vision.snapshot(),
      mode: this.matchController ? { mode:this.matchController.mode, state:this.matchController.snapshot() } : null,
      mission: this.missionController ? {definition:this.missionController.mission,state:this.missionController.snapshot()} : null,
    };
  }
  restoreRuntime(s: ReturnType<World["captureRuntime"]>): void {
    this.playerTeam=s.playerTeam; this.playerFaction=s.playerFaction; this.enemyFaction=s.enemyFaction;
    this.networkMode=s.networkMode; this.incomeMultiplier=s.incomeMultiplier; this.victoryMode=s.victoryMode;
    this.objectiveDriven=s.objectiveDriven; this.externalVictoryMode=s.externalVictoryMode;
    this.airCargoLastSpawn=[...s.airCargoLastSpawn]; this.roadTruckLastSpawn=[...s.roadTruckLastSpawn];
    this.logisticsPriority[0]=s.logisticsPriority[0]; this.logisticsPriority[1]=s.logisticsPriority[1];
    this.commandNetworkLevel[0]=s.commandNetworkLevel[0]; this.commandNetworkLevel[1]=s.commandNetworkLevel[1];
    this.teamFormations=[...(s.teamFormations??["box","box"])];
    this.lossValue=[...s.lossValue]; this.producedCounts={...s.producedCounts};
    this.setActiveDeck(s.activeDeck);
    this.setNetworkDecks(s.networkDecks ?? [null, null]);
    this.networkProducedCounts = structuredClone(s.networkProducedCounts ?? [{}, {}]);
    s.networkBattlegroups?.forEach((b,i) => { if(b) this.networkBattlegroups[i]?.restore(b); });
    Object.assign(this.ai,s.ai);
    s.plans.forEach((p,i)=>Object.assign(this.operationalCommander.plans[i],p));
    this.vision.restore(s.vision,this.entities);
    if (s.mode) { this.matchController=new MatchModeController(this,s.mode.mode); this.matchController.restore(s.mode.state); }
    else this.matchController=null;
    if(s.mission){this.missionController=new MissionController(s.mission.definition,this);this.missionController.restore(s.mission.state);}else this.missionController=null;
    this.nav.syncBuildings(this.entities); this.navDirty=false;
    this.powerCache=null; this.powerCacheTime=-1; this.spatial.rebuild(this.entities);
    this.fobManager.fobs.length=0; this.fobManager.tick(); this.operationalMap.tick(); this.frontline.tick(0);
  }

  tick(dt: number): void {
    if (this.status !== "running") return;
    for (const e of this.entities) { e.px = e.x; e.pz = e.z; e.pHeading = e.heading; e.pTurretYaw = e.turretYaw; }
    this.time += dt;
    this.teamCredits[0] += INCOME_PER_SEC * 0.35 * this.incomeMultiplier * dt; this.teamCredits[1] += INCOME_PER_SEC * 0.35 * this.incomeMultiplier * dt;
    this.updateResourceControl(dt);
    this.logisticsPriority[0] = this.logisticsPriority[0] || "balanced";
    this.logisticsPriority[1] = this.logisticsPriority[1] || "balanced";
    this.updateSupply(dt);
    this.powerStatus(0); this.powerStatus(1);
    this.updateRoadConvoys(dt);
    this.updateSupplyAirbridge();
    this.updateStrategicAirlift(dt);
    this.credits = this.teamCredits[this.playerTeam];
    this.resources = this.teamResources[this.playerTeam];
    if (this.navDirty) { this.nav.syncBuildings(this.entities); this.navDirty = false; }
    this.vision.update(this.entities);
    applyCommands(this);
    this.teamCredits[this.playerTeam] = this.credits;
    this.teamResources[this.playerTeam] = this.resources;
    updateConstruction(this, dt);
    updateProduction(this, dt);
    this.teamCredits[this.playerTeam] = this.credits;
    this.teamResources[this.playerTeam] = this.resources;
    this.fobManager.tick();
    this.operationalCommander.tick(dt);
    this.frontline.tick(dt);
    if (!this.networkMode) {
      this.ai.update(this, dt);
      if (Math.floor(this.time * 10) % 5 === 0) updateTacticalAI(this, this.playerTeam === 0 ? 1 : 0, dt);
    }
    // Spatial hash once per tick – powers nearestEnemy + separation
    this.spatial.rebuild(this.entities);
    this.updateIntel();
    updateArtillery(this, dt);
    updateUnits(this, dt);
    updateMorale(this, dt);
    updateProjectiles(this, dt);
    let removedBuilding = false;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (e.dead) {
        if (e.def.speed > 0 && e.kind !== "engineer") this.battlegroupForTeam(e.team)?.recordLoss(e.kind);
        if (e.kind === "cargoPlane" && e.cargo > 0) { this.airCargoLost[e.team] += e.cargo; e.cargo = 0; }
        if (e.kind === "logiTruck" && e.cargo > 0) { this.roadCargoLost[e.team] += e.cargo; e.cargo = 0; }
        if (e.def.speed === 0) removedBuilding = true;
        this.entities.splice(i, 1); this.byId.delete(e.id);
      }
    }
    if (removedBuilding) this.navDirty = true;
    this.matchController?.tick(dt);
    this.missionController?.tick(dt);
    if (this.status !== "running" || this.externalVictoryMode) return;
    if (this.victoryMode === "annihilation") {
      const enemyAlive = this.entities.some(e => !e.dead && e.team !== this.playerTeam);
      const ownAlive = this.entities.some(e => !e.dead && e.team === this.playerTeam);
      if (!enemyAlive) this.status = "won";
      else if (!ownAlive) this.status = "lost";
    } else if (this.networkMode) {
      if(this.hq[0]?.dead)this.status=this.playerTeam===1?"won":"lost";
      else if(this.hq[1]?.dead)this.status=this.playerTeam===0?"won":"lost";
    } else if (!this.objectiveDriven && this.hq[1] && this.hq[1]!.dead) this.status = "won";
    else if (this.hq[0] && this.hq[0]!.dead) this.status = "lost";
  }
}

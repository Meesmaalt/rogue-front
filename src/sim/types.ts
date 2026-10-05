import type { FlowField } from "./nav/FlowField";
import type { MapFeatureDef } from "./mapFeatures";
export type Team = 0 | 1;
export type UnitKind =
  | "tank" | "apc" | "ifv" | "inf" | "atInf" | "mgInf" | "reconInf" | "sniper" | "mortar" | "manpad" | "atgm" | "reconVehicle" | "lightTank" | "tankDestroyer" | "spaa" | "bunker" | "hq" | "engineer"
  | "heli" | "transport" | "cargoPlane" | "gunship" | "casHeli" | "fighter" | "interceptor" | "bomber" | "ecm" | "multirole" | "attackAircraft"
  | "artillery" | "mlrs" | "logiTruck" | "aa" | "refinery" | "barracks" | "factory" | "helipad" | "airbase"
  | "supply" | "radar" | "generator" | "destroyer" | "submarine" | "landingcraft" | "frigate" | "missileBoat" | "special"
  | "shipyard" | "landCommand" | "airCommand" | "seaCommand" | "combatEngineer"
  | "landStrategy" | "airStrategy" | "seaStrategy";
export type Mode = "idle" | "move" | "attack" | "amove" | "patrol" | "hold" | "build" | "repair" | "transport-load" | "transport-unload" | "standing" | "sabotage";
export type AirState = "grounded" | "taxi" | "airborne" | "returning" | "landing" | "rearming";
/** Wargame-style air tasking. */
export type AirMission = "cap" | "strike" | "sead" | "ground" | null;
export type GameStatus = "running" | "won" | "lost";

/** Optics quality – drives detection range (Wargame-style). */
export type OpticsRating = "poor" | "normal" | "good" | "very_good" | "exceptional";
/** Target size for detection & hit chance. */
export type UnitSize = "small" | "medium" | "large" | "very_large";
/** Fire-on-move capability. */
export type Stabilizer = "none" | "partial" | "full";
export type Discipline = "low" | "medium" | "high";
export type UnitCategory = "infantry" | "armor" | "recon" | "support" | "heli" | "air" | "naval" | "logistics" | "building";

export interface UnitDef {
  name: string; hp: number; speed: number; turnRate: number; range: number; damage: number; cooldown: number;
  radius: number; height: number; cost: number; buildTime: number; projectileSpeed: number;
  producible: boolean; domain?: "land" | "air" | "sea"; stealth?: boolean; turret: boolean; building?: boolean;
  armor: "light" | "medium" | "heavy" | "air"; weapon: "bullet" | "cannon" | "missile" | "none"; splash?: number;
  // --- Schema v2 (Wargame-oriented; defaults applied in parseUnits) ---
  category?: UnitCategory;
  size?: UnitSize;
  optics?: OpticsRating;
  /** 0 = loud, 3 = very stealthy */
  stealthLevel?: number;
  armorFront?: number;
  armorSide?: number;
  armorRear?: number;
  stabilizer?: Stabilizer;
  discipline?: Discipline;
  /** Sensor range multiplier baseline (metres-ish). */
  opticsRange?: number;
  /** Human-readable tactical role/ability for UI and AI. */
  roleLabel?: string;
  ability?: string;
  /** Optional hard target domain restriction. */
  targetClass?: "ground" | "air" | "armor" | "naval" | "all";
  /** Phase 58 logistics model: per-platform ammunition/fuel and consumption. */
  minimumRange?: number;
  missileTurnRate?: number; missileAcceleration?: number; missileLaunchSpeed?: number; projectileLifetime?: number;
  ammoCapacity?: number;
  fuelCapacity?: number;
  ammoUsePerShot?: number;
  fuelUsePerSec?: number;
  supplyUsePerSec?: number;
  resupplyRate?: number;
  crew?: number;
  repairable?: boolean;
  /** Phase 59 combat model: weapon accuracy, penetration and suppression profile. */
  accuracy?: number;
  penetration?: number;
  suppressionPower?: number;
  reloadSkill?: number;
}
export interface Point { x: number; z: number }

export interface IntelContact {
  entityId: number;
  team: Team;
  kind: UnitKind;
  x: number;
  z: number;
  lastSeen: number;
  shared: boolean;
}

export interface Entity {
  id: number; kind: UnitKind; team: Team; def: UnitDef;
  x: number; y: number; z: number; heading: number; turretYaw: number;
  /** eelmise ticki väärtused renderduse interpolatsiooniks */
  px: number; pz: number; pHeading: number; pTurretYaw: number;
  hp: number; cooldown: number; mode: Mode; dest: Point | null; target: Entity | null;
  aggro: number; dead: boolean;
  navPath: Point[]; navPathIndex: number; flowField: FlowField | null; stuckTime: number; stuckX: number; stuckZ: number;
  moveQueue?: Point[]; queuedMoveType?: "move" | "amove";
  preferredResourceIndex?: number | null; logisticsPaused?: boolean; routeWaypointIndex?: number; routeLeg?: string;
  xp: number; veteran: number;
  /** Game-time until which each team has this unit spotted (Wargame contact). */
  spottedUntil: [number, number];
  suppression?: number;
  squadMembers?: number; squadMaxMembers?: number; squadFirepower?: number;
  squadRole?: "rifle" | "at" | "mg" | "recon" | "sniper" | "manpad" | "engineer";
  roadTripGoal?: Point;
  roadPathGoal?: Point;
  roadPathRetryAt?: number;
  components?: { engine: number; tracks: number; turret: number; weapon: number; crew: number; ammo: number };
 supply?: number; maxSupply?: number; role?: "line" | "support" | "siege" | "air-superiority" | "air-ground" | "logistics"; holdPosition: boolean; patrolPoints: Point[]; patrolIndex: number; upgrades: Set<string>; cargo: number; logisticsTarget: Point | null; logisticsHome: Point | null; logisticsPhase: "idle" | "loading" | "unloading"; productionQueue: UnitKind[]; productionProgress: number; rallyPoint: Point | null;
  constructionProgress: number;
  upgrading?: boolean; upgradeProgress?: number; upgradeTime?: number; upgradeKind?: "producer";
  /** Phase 69: visual/technology building level (1-3). */
  buildingLevel?: number;
  logisticsLoadProgress?: number;
  nextLogisticsDispatch?: number;
  /** Phase 62: road logistics / convoy metadata. */
  logisticsRoute?: "road" | "air" | "strategic";
  logisticsCargoCapacity?: number;
  logisticsPayload?: { ammo: number; fuel: number; repair: number };
  logisticsDistance?: number;
  logisticsStorage?: number;
  logisticsMaxStorage?: number;
  ammoStock?: number; fuelStock?: number; repairStock?: number;
  logisticsPriority?: "ammo" | "fuel" | "repair" | "balanced";
  /** Phase 65: command/logistics network state. */
  commandNodeId?: number | null;
  logisticsWaypoints?: Point[];
  logisticsRouteMode?: "direct" | "safe" | "manual";
  fobLevel?: number;
  supplyDepotId?: number | null;
  /** Phase 61: source facility used by physical resource logistics. */
  logisticsSourceIndex?: number | null;
  supplyLevel?: number;
  strategicTarget?: Point | null; constructionTime: number;
  firingArc: number;
  firingRange: number;
  facingLocked: boolean;
  fuel?: number; maxFuel?: number; ammo?: number; maxAmmo?: number;
  /** Phase 77 artillery battery state. */
  artilleryReadyAt?: number; artilleryLastFire?: number; artillerySignatureUntil?: number; artilleryShotsInSalvo?: number; artilleryDisplace?: Point | null; artilleryMissionRound?: number;
  /** Phase 78 air sortie / weapons state. */
  airSortieCount?: number; airThreat?: number; airWeaponCooldown?: number; airReturnReason?: "fuel" | "ammo" | "damage" | null;
  /** Phase 86 dynamic frontline assignment. */
  frontlineSector?: string;
  deploymentState?: "reserve" | "deploying" | "frontline" | "fallback";
  /** Phase 79 AI tactical intent. */
  aiIntent?: "attack" | "defend" | "recon" | "resupply" | "counterbattery" | "retreat" | null;
  motionSpeed?: number; flightBank?: number; flightPitch?: number; flightOrbitCenter?: Point; airLandingPhase?: "approach"|"final";
  airState?: AirState; airMissionHomeId?: number | null; airSortieTime?: number; airMission?: AirMission; airMissionPoint?: Point | null; fireMission?: Point | null; lastCombatTime: number; morale?: number; disabledUntil?: number; builderIds: number[]; underConstruction: boolean; cargoUnitIds: number[]; loadedIntoId: number | null; transportTargetId: number | null; unloadPoint: Point | null; standingOrder?: "hold" | "patrol" | "attack" | "holdfire" | null; priorityFocus?: "supply" | "generator" | "aa" | null; preDeployOrder?: { mode: "move" | "attack" | "hold"; x?: number; z?: number } | null;
}

export interface Projectile {
  id: number; team: Team; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  tx: number; tz: number; target: Entity | null; sourceId: number; damage: number; speed: number; splash?: number;
  weapon?: string;
  face?: "front" | "side" | "rear";
  hitChance?: number;
  penetration?: number;
  impactDamage?: number;
  age?: number; lifetime?: number; turnRate?: number; acceleration?: number; maxSpeed?: number;
  aimY?: number; launchX?: number; launchZ?: number;
}

export type Command = ({
  type: "move"; ids: number[]; x: number; z: number; append?: boolean
} | { type: "amove"; ids: number[]; x: number; z: number; append?: boolean } | { type: "attack"; ids: number[]; targetId: number } |
  { type: "formation"; kind: "box" | "line" | "wedge" | "column" } | { type: "stop"; ids: number[] } | { type: "repair"; ids: number[]; targetId: number } | { type: "rally"; ids: number[]; x: number; z: number } | { type: "patrol"; ids: number[]; x: number; z: number } | { type: "hold"; ids: number[] } |
  { type: "build"; ids: number[]; kind: "hq" | "bunker" | "aa" | "refinery" | "barracks" | "factory" | "helipad" | "airbase" | "supply" | "radar" | "generator" | "shipyard" | "landCommand" | "airCommand" | "seaCommand" | "combatEngineer" | "landStrategy" | "airStrategy" | "seaStrategy"; x: number; z: number; rotation?: number } |
  { type: "upgrade"; ids: number[]; upgrade: "armor" | "weapon" | "range" | "supply-depot" | "producer" | "fob" } |
  { type: "research"; tech: "air" | "advanced-armor" } | { type: "produce"; kind: UnitKind; producerId?: number } | { type: "cancel-produce"; producerId: number } | { type: "load"; ids: number[]; targetId: number } | { type: "unload"; ids: number[]; x: number; z: number } | { type: "fire-mission"; ids: number[]; x: number; z: number } | { type: "standing"; ids: number[]; mode: "hold" | "patrol" | "attack" | "holdfire"; x?: number; z?: number } | { type: "predeploy"; ids: number[]; mode: "move" | "attack" | "hold"; x?: number; z?: number } | { type: "priority"; ids: number[]; focus: "supply" | "generator" | "aa" } | { type: "depot-priority"; ids: number[]; focus: "ammo" | "fuel" | "repair" | "balanced" } | { type: "logistics-source"; ids:number[]; sourceIndex:number|null; paused?:boolean } | { type: "logistics-route"; ids: number[]; x: number; z: number; append?: boolean; clear?: boolean } | { type: "air-mission"; ids: number[]; mission: "cap" | "strike" | "sead" | "ground"; x?: number; z?: number }) & { team?: Team };

export type SimEvent =
  | { type: "impact"; x: number; y: number; z: number; weapon: string }
  | { type: "fire"; team: Team; x: number; y: number; z: number; sourceId?: number; weapon?: string; caliber?: number }
  | { type: "hit"; x: number; y: number; z: number }
  | { type: "build-complete"; team: Team; x: number; y: number; z: number; kind: UnitKind }
  | { type: "repair-complete"; team: Team; x: number; y: number; z: number; kind: UnitKind }
  | { type: "death"; x: number; y: number; z: number; big: boolean; kind?: UnitKind }
  | { type: "supply-delivered"; team: Team; x: number; z: number; amount: number };


export type MissionObjectiveKind = "destroy" | "defend" | "reach" | "survive" | "capture" | "sabotage" | "build" | "produce" | "deliver";
export interface MissionObjectiveDef {
  id: string;
  title: string;
  description: string;
  kind: MissionObjectiveKind;
  primary?: boolean;
  target?: { team?: Team; kind?: UnitKind; count?: number };
  point?: Point;
  radius?: number;
  duration?: number;
  unitKind?: UnitKind;
  requires?: string[];
  hiddenUntilPrerequisite?: boolean;
}
export interface MissionTriggerDef {
  id: string;
  when: { time?: number; objective?: string; all?: string[] };
  once?: boolean;
  message?: string;
  spawn?: { kind: UnitKind; team: Team; x: number; z: number; count?: number; spacing?: number };
}
export type ResourceFacilityKind = "mine" | "oilfield" | "factory" | "depot";
export interface MapResourceDef {
  x: number; z: number; amount: number; radius: number;
  controlledBy?: Team | null; controlProgress?: number;
  facility?: ResourceFacilityKind;
  level?: number;
  active?: boolean;
  startupProgress?: number;
  maxStock?: number;
  productionRate?: number;
  disabledUntil?: number;
  /** Phase 62: stock physically awaiting a convoy pickup. */
  exportStock?: number;
  /** Preferred road collection radius. */
  roadAccess?: boolean;
}
export interface MissionMapDef {
  id: string;
  name: string;
  theme: "desert" | "mountains" | "city" | "temperate";
  terrainProfile?: "farmland";
  baseDefenses?: boolean;
  heightmap: string;
  maxHeight: number;
  resources: MapResourceDef[];
  bases: [Point & { r: number }, Point & { r: number }];
  objects?: Array<{ kind: UnitKind; team: Team; x: number; z: number; count?: number; dx?: number; dz?: number }>;
  features?: MapFeatureDef[];
}
export interface MissionDef {
  id: string;
  name: string;
  briefing: string;
  map: MissionMapDef;
  seed: number;
  objectives: MissionObjectiveDef[];
  triggers?: MissionTriggerDef[];
}

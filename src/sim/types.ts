import type { FlowField } from "./nav/FlowField";
import type { MapFeatureDef } from "./mapFeatures";
export type Team = 0 | 1;
export type UnitKind =
  | "tank" | "apc" | "ifv" | "inf" | "bunker" | "hq" | "engineer"
  | "heli" | "transport" | "gunship" | "fighter" | "interceptor" | "bomber"
  | "artillery" | "mlrs" | "aa" | "refinery" | "barracks" | "factory" | "helipad" | "airbase"
  | "supply" | "radar" | "generator" | "destroyer" | "submarine" | "landingcraft" | "special"
  | "shipyard" | "landCommand" | "airCommand" | "seaCommand" | "combatEngineer"
  | "landStrategy" | "airStrategy" | "seaStrategy";
export type Mode = "idle" | "move" | "attack" | "amove" | "patrol" | "hold" | "build" | "repair" | "transport-load" | "transport-unload" | "standing" | "sabotage";
export type AirState = "grounded" | "taxi" | "airborne" | "returning" | "landing" | "rearming";
export type GameStatus = "running" | "won" | "lost";

export interface UnitDef {
  name: string; hp: number; speed: number; turnRate: number; range: number; damage: number; cooldown: number;
  radius: number; height: number; cost: number; buildTime: number; projectileSpeed: number;
  producible: boolean; domain?: "land" | "air" | "sea"; stealth?: boolean; turret: boolean; building?: boolean; armor: "light" | "medium" | "heavy" | "air"; weapon: "bullet" | "cannon" | "missile" | "none"; splash?: number;
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
  xp: number; veteran: number; supply?: number; maxSupply?: number; role?: "line" | "support" | "siege" | "air-superiority" | "air-ground" | "logistics"; holdPosition: boolean; patrolPoints: Point[]; patrolIndex: number; upgrades: Set<string>; cargo: number; logisticsTarget: Point | null; logisticsHome: Point | null; logisticsPhase: "idle" | "loading" | "unloading"; productionQueue: UnitKind[]; productionProgress: number; rallyPoint: Point | null;
  constructionProgress: number;
  upgrading?: boolean; upgradeProgress?: number; upgradeTime?: number; upgradeKind?: "producer";
  logisticsLoadProgress?: number;
  supplyDepotId?: number | null;
  supplyLevel?: number;
  strategicTarget?: Point | null; constructionTime: number;
  firingArc: number;
  firingRange: number;
  facingLocked: boolean;
  fuel?: number; maxFuel?: number; ammo?: number; maxAmmo?: number; airState?: AirState; airMissionHomeId?: number | null; airSortieTime?: number; fireMission?: Point | null; lastCombatTime: number; morale?: number; disabledUntil?: number; builderIds: number[]; underConstruction: boolean; cargoUnitIds: number[]; loadedIntoId: number | null; transportTargetId: number | null; unloadPoint: Point | null; standingOrder?: "hold" | "patrol" | "attack" | null; priorityFocus?: "supply" | "generator" | "aa" | null; preDeployOrder?: { mode: "move" | "attack" | "hold"; x?: number; z?: number } | null;
}

export interface Projectile {
  id: number; team: Team; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  tx: number; tz: number; target: Entity | null; sourceId: number; damage: number; speed: number; splash?: number;
}

export type Command = ({
  type: "move"; ids: number[]; x: number; z: number
} | { type: "amove"; ids: number[]; x: number; z: number } | { type: "attack"; ids: number[]; targetId: number } |
  { type: "stop"; ids: number[] } | { type: "repair"; ids: number[]; targetId: number } | { type: "rally"; ids: number[]; x: number; z: number } | { type: "patrol"; ids: number[]; x: number; z: number } | { type: "hold"; ids: number[] } |
  { type: "build"; ids: number[]; kind: "bunker" | "aa" | "refinery" | "barracks" | "factory" | "helipad" | "airbase" | "supply" | "radar" | "generator" | "shipyard" | "landCommand" | "airCommand" | "seaCommand" | "combatEngineer" | "landStrategy" | "airStrategy" | "seaStrategy"; x: number; z: number; rotation?: number } |
  { type: "upgrade"; ids: number[]; upgrade: "armor" | "weapon" | "range" | "supply-depot" | "producer" } |
  { type: "research"; tech: "air" | "advanced-armor" } | { type: "produce"; kind: UnitKind; producerId?: number } | { type: "cancel-produce"; producerId: number } | { type: "load"; ids: number[]; targetId: number } | { type: "unload"; ids: number[]; x: number; z: number } | { type: "fire-mission"; ids: number[]; x: number; z: number } | { type: "standing"; ids: number[]; mode: "hold" | "patrol" | "attack"; x?: number; z?: number } | { type: "predeploy"; ids: number[]; mode: "move" | "attack" | "hold"; x?: number; z?: number } | { type: "priority"; ids: number[]; focus: "supply" | "generator" | "aa" }) & { team?: Team };

export type SimEvent =
  | { type: "fire"; team: Team; x: number; y: number; z: number; sourceId?: number }
  | { type: "hit"; x: number; y: number; z: number }
  | { type: "build-complete"; team: Team; x: number; y: number; z: number; kind: UnitKind }
  | { type: "repair-complete"; team: Team; x: number; y: number; z: number; kind: UnitKind }
  | { type: "death"; x: number; y: number; z: number; big: boolean; kind?: UnitKind }
  | { type: "supply-delivered"; team: Team; x: number; z: number; amount: number };


export type MissionObjectiveKind = "destroy" | "defend" | "reach" | "survive" | "capture" | "sabotage";
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
export interface MapResourceDef { x: number; z: number; amount: number; radius: number; controlledBy?: Team | null; controlProgress?: number }
export interface MissionMapDef {
  id: string;
  name: string;
  theme: "desert" | "mountains" | "city";
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

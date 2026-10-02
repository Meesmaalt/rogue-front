import type { FlowField } from "./nav/FlowField";
import type { MapFeatureDef } from "./mapFeatures";
export type Team = 0 | 1;
export type UnitKind = "tank" | "inf" | "bunker" | "hq" | "engineer" | "heli" | "fighter" | "aa" | "refinery";
export type Mode = "idle" | "move" | "attack" | "amove" | "patrol" | "hold";
export type GameStatus = "running" | "won" | "lost";

export interface UnitDef {
  name: string; hp: number; speed: number; turnRate: number; range: number; damage: number; cooldown: number;
  radius: number; height: number; cost: number; buildTime: number; projectileSpeed: number;
  producible: boolean; turret: boolean; armor: "light" | "medium" | "heavy" | "air"; weapon: "bullet" | "cannon" | "missile" | "none";
}
export interface Point { x: number; z: number }

export interface Entity {
  id: number; kind: UnitKind; team: Team; def: UnitDef;
  x: number; y: number; z: number; heading: number; turretYaw: number;
  /** eelmise ticki väärtused renderduse interpolatsiooniks */
  px: number; pz: number; pHeading: number; pTurretYaw: number;
  hp: number; cooldown: number; mode: Mode; dest: Point | null; target: Entity | null;
  aggro: number; dead: boolean;
  navPath: Point[]; navPathIndex: number; flowField: FlowField | null; stuckTime: number; stuckX: number; stuckZ: number;
  xp: number; veteran: number; holdPosition: boolean; patrolPoints: Point[]; patrolIndex: number; upgrades: Set<string>;
}

export interface Projectile {
  id: number; team: Team; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  tx: number; tz: number; target: Entity; sourceId: number; damage: number; speed: number;
}

export type Command = ({
  type: "move"; ids: number[]; x: number; z: number
} | { type: "amove"; ids: number[]; x: number; z: number } | { type: "attack"; ids: number[]; targetId: number } |
  { type: "stop"; ids: number[] } | { type: "patrol"; ids: number[]; x: number; z: number } | { type: "hold"; ids: number[] } |
  { type: "build"; ids: number[]; kind: "bunker" | "aa" | "refinery"; x: number; z: number } |
  { type: "upgrade"; ids: number[]; upgrade: "armor" | "weapon" | "range" } |
  { type: "research"; tech: "air" | "advanced-armor" } | { type: "produce"; kind: UnitKind }) & { team?: Team };

export type SimEvent =
  | { type: "fire"; team: Team; x: number; y: number; z: number }
  | { type: "hit"; x: number; y: number; z: number }
  | { type: "death"; x: number; y: number; z: number; big: boolean };


export type MissionObjectiveKind = "destroy" | "defend" | "reach" | "survive";
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
}
export interface MissionTriggerDef {
  id: string;
  when: { time?: number; objective?: string; all?: string[] };
  once?: boolean;
  message?: string;
  spawn?: { kind: UnitKind; team: Team; x: number; z: number; count?: number; spacing?: number };
}
export interface MapResourceDef { x: number; z: number; amount: number; radius: number }
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

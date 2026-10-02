import type { Entity, GameStatus, Mode, Point, UnitKind } from "./types";
import type { World } from "./World";
import { UNITS } from "./units";

export interface WorldSave {
  version: 1;
  time: number;
  credits: number;
  resources: number;
  status: GameStatus;
  nextId: number;
  rngState: number;
  queue: UnitKind[];
  queueProgress: number;
  techs: string[];
  resourcePoints: Array<{ x: number; z: number; amount: number; radius: number }>;
  entities: Array<{
    id: number; kind: UnitKind; team: 0 | 1; x: number; y: number; z: number;
    heading: number; turretYaw: number; px: number; pz: number; pHeading: number; pTurretYaw: number;
    hp: number; cooldown: number; mode: Mode; dest: Point | null; targetId: number | null;
    aggro: number; dead: boolean; xp: number; veteran: number; holdPosition: boolean;
    patrolPoints: Point[]; patrolIndex: number; upgrades: string[]; stuckTime: number; stuckX: number; stuckZ: number;
  }>;
}

export function saveWorld(world: World): WorldSave {
  return {
    version: 1, time: world.time, credits: world.credits, resources: world.resources,
    status: world.status, nextId: world.nextId, rngState: world.getRandomState(),
    queue: [...world.queue], queueProgress: world.queueProgress, techs: [...world.techs],
    resourcePoints: world.resourcePoints.map((r) => ({ ...r })),
    entities: world.entities.map((e) => ({
      id: e.id, kind: e.kind, team: e.team, x: e.x, y: e.y, z: e.z, heading: e.heading,
      turretYaw: e.turretYaw, px: e.px, pz: e.pz, pHeading: e.pHeading, pTurretYaw: e.pTurretYaw,
      hp: e.hp, cooldown: e.cooldown, mode: e.mode, dest: e.dest ? { ...e.dest } : null,
      targetId: e.target?.id ?? null, aggro: e.aggro, dead: e.dead, xp: e.xp, veteran: e.veteran,
      holdPosition: e.holdPosition, patrolPoints: e.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: e.patrolIndex, upgrades: [...e.upgrades], stuckTime: e.stuckTime, stuckX: e.stuckX, stuckZ: e.stuckZ,
    })),
  };
}

export function loadWorld(world: World, state: WorldSave): void {
  if (state.version !== 1) throw new Error("Tundmatu salvestuse versioon");
  world.entities.splice(0, world.entities.length);
  world.byId.clear();
  world.projectiles.splice(0, world.projectiles.length);
  world.hq[0] = null; world.hq[1] = null;
  world.time = state.time; world.credits = state.credits; world.resources = state.resources;
  world.status = state.status; world.nextId = state.nextId; world.setRandomState(state.rngState);
  world.queue = [...state.queue]; world.queueProgress = state.queueProgress;
  world.techs.clear(); state.techs.forEach((t) => world.techs.add(t));
  world.resourcePoints.forEach((r, i) => { const saved = state.resourcePoints[i]; if (saved) r.amount = saved.amount; });
  for (const saved of state.entities) {
    const def = UNITS[saved.kind];
    const e: Entity = {
      id: saved.id, kind: saved.kind, team: saved.team, def, x: saved.x, y: saved.y, z: saved.z,
      heading: saved.heading, turretYaw: saved.turretYaw, px: saved.px, pz: saved.pz,
      pHeading: saved.pHeading, pTurretYaw: saved.pTurretYaw, hp: saved.hp, cooldown: saved.cooldown,
      mode: saved.mode, dest: saved.dest ? { ...saved.dest } : null, target: null, aggro: saved.aggro,
      dead: saved.dead, navPath: [], navPathIndex: 0, flowField: null, stuckTime: saved.stuckTime,
      stuckX: saved.stuckX, stuckZ: saved.stuckZ, xp: saved.xp, veteran: saved.veteran,
      holdPosition: saved.holdPosition, patrolPoints: saved.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: saved.patrolIndex, upgrades: new Set(saved.upgrades),
    };
    world.entities.push(e); world.byId.set(e.id, e); if (e.kind === "hq") world.hq[e.team] = e;
  }
  for (const saved of state.entities) {
    const e = world.byId.get(saved.id);
    if (e) e.target = saved.targetId === null ? null : world.byId.get(saved.targetId) ?? null;
  }
}

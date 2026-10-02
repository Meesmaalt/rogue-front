import type { Entity, GameStatus, Mode, Point, UnitKind } from "./types";
import type { World } from "./World";
import { UNITS } from "./units";

export interface WorldSave {
  version: 13 | 12 | 11 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;
  time: number;
  credits: number;
  resources: number;
  teamCredits?: [number, number];
  teamResources?: [number, number];
  teamPower?: [number, number];
  teamPowerUse?: [number, number];
  teamMorale?: [number, number];
  areaControl?: [number, number];
  supplyUpgrade?: [number, number];
  status: GameStatus;
  nextId: number;
  rngState: number;
  queue: UnitKind[];
  queueProgress: number;
  techs: string[];
  teamTechs?: [string[], string[]];
  resourcePoints: Array<{ x: number; z: number; amount: number; radius: number }>;
  intel?: [Array<import("./types").IntelContact>, Array<import("./types").IntelContact>];
  entities: Array<{
    id: number; kind: UnitKind; team: 0 | 1; x: number; y: number; z: number;
    heading: number; turretYaw: number; px: number; pz: number; pHeading: number; pTurretYaw: number;
    hp: number; cooldown: number; supply?: number; maxSupply?: number; role?: Entity["role"]; mode: Mode; dest: Point | null; targetId: number | null;
    aggro: number; dead: boolean; xp: number; veteran: number; holdPosition: boolean;
    patrolPoints: Point[]; patrolIndex: number; upgrades: string[]; cargo?: number; logisticsTarget?: Point | null; logisticsHome?: Point | null; logisticsPhase?: "idle" | "loading" | "unloading"; productionQueue?: UnitKind[]; productionProgress?: number; firingArc?: number; firingRange?: number; facingLocked?: boolean; lastCombatTime?: number; rallyPoint?: Point | null; constructionProgress?: number; upgrading?: boolean; upgradeProgress?: number; upgradeTime?: number; upgradeKind?: "producer"; fuel?: number; maxFuel?: number; ammo?: number; maxAmmo?: number; fireMission?: Point | null; constructionTime?: number; morale?: number; disabledUntil?: number; builderIds?: number[]; underConstruction?: boolean; cargoUnitIds?: number[]; loadedIntoId?: number | null; transportTargetId?: number | null; unloadPoint?: Point | null; standingOrder?: Entity["standingOrder"]; preDeployOrder?: Entity["preDeployOrder"]; stuckTime: number; stuckX: number; stuckZ: number; logisticsLoadProgress?: number; supplyDepotId?: number | null; supplyLevel?: number;
  }>;
}

export function saveWorld(world: World): WorldSave {
  return {
    version: 13, time: world.time, credits: world.credits, resources: world.resources, teamCredits: [...world.teamCredits] as [number,number], teamResources: [...world.teamResources] as [number,number], teamPower: [...world.teamPower] as [number,number], teamPowerUse: [...world.teamPowerUse] as [number,number], teamMorale: [...world.teamMorale] as [number,number], areaControl: [...world.areaControl] as [number,number], supplyUpgrade: [...world.supplyUpgrade] as [number,number],
    status: world.status, nextId: world.nextId, rngState: world.getRandomState(),
    queue: [...world.queue], queueProgress: world.queueProgress, techs: [...world.techs], teamTechs: [ [...world.teamTechs[0]], [...world.teamTechs[1]] ],
    resourcePoints: world.resourcePoints.map((r) => ({ ...r })),
    intel: [world.getIntel(0, false), world.getIntel(1, false)],
    entities: world.entities.map((e) => ({
      id: e.id, kind: e.kind, team: e.team, x: e.x, y: e.y, z: e.z, heading: e.heading,
      turretYaw: e.turretYaw, px: e.px, pz: e.pz, pHeading: e.pHeading, pTurretYaw: e.pTurretYaw,
      hp: e.hp, cooldown: e.cooldown, supply:e.supply, maxSupply:e.maxSupply, role:e.role, mode: e.mode, dest: e.dest ? { ...e.dest } : null,
      targetId: e.target?.id ?? null, aggro: e.aggro, dead: e.dead, xp: e.xp, veteran: e.veteran,
      fuel:e.fuel, maxFuel:e.maxFuel, ammo:e.ammo, maxAmmo:e.maxAmmo, fireMission:e.fireMission, morale:e.morale, disabledUntil:e.disabledUntil,
      holdPosition: e.holdPosition, patrolPoints: e.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: e.patrolIndex, upgrades: [...e.upgrades], cargo: e.cargo, logisticsTarget: e.logisticsTarget ? { ...e.logisticsTarget } : null, logisticsHome: e.logisticsHome ? { ...e.logisticsHome } : null, logisticsPhase: e.logisticsPhase, productionQueue: [...e.productionQueue], productionProgress: e.productionProgress, rallyPoint: e.rallyPoint ? { ...e.rallyPoint } : null, constructionProgress: e.constructionProgress, constructionTime: e.constructionTime, upgrading:e.upgrading??false, upgradeProgress:e.upgradeProgress??0, upgradeTime:e.upgradeTime??0, upgradeKind:e.upgradeKind, firingArc: e.firingArc, firingRange: e.firingRange, facingLocked: e.facingLocked, lastCombatTime: e.lastCombatTime, builderIds: [...e.builderIds], underConstruction: e.underConstruction, cargoUnitIds: [...e.cargoUnitIds], loadedIntoId: e.loadedIntoId, transportTargetId: e.transportTargetId, unloadPoint: e.unloadPoint ? { ...e.unloadPoint } : null, standingOrder:e.standingOrder ?? null, preDeployOrder:e.preDeployOrder ? {...e.preDeployOrder} : null, stuckTime: e.stuckTime, stuckX: e.stuckX, stuckZ: e.stuckZ, logisticsLoadProgress:e.logisticsLoadProgress, supplyDepotId:e.supplyDepotId ?? null, supplyLevel:e.supplyLevel ?? 0,
    })),
  };
}

export function loadWorld(world: World, state: WorldSave): void {
  if (state.version !== 13 && state.version !== 12 && state.version !== 11 && state.version !== 10 && state.version !== 9 && state.version !== 8 && state.version !== 7 && state.version !== 6 && state.version !== 5 && state.version !== 4 && state.version !== 3 && state.version !== 2 && state.version !== 1) throw new Error("Tundmatu salvestuse versioon");
  world.entities.splice(0, world.entities.length);
  world.byId.clear();
  world.projectiles.splice(0, world.projectiles.length);
  world.hq[0] = null; world.hq[1] = null;
  world.time = state.time; world.credits = state.credits; world.resources = state.resources;
  world.status = state.status; world.nextId = state.nextId; world.teamCredits = [...(state.teamCredits ?? [state.credits,state.credits])] as [number,number]; world.teamResources = [...(state.teamResources ?? [state.resources,state.resources])] as [number,number]; world.teamPower = [...(state.teamPower ?? [100,100])] as [number,number]; world.teamPowerUse = [...(state.teamPowerUse ?? [0,0])] as [number,number]; world.teamMorale = [...(state.teamMorale ?? [100,100])] as [number,number]; world.supplyUpgrade = [...(state.supplyUpgrade ?? [0,0])] as [number,number]; world.areaControl = [...(state.areaControl ?? [0,0])] as [number,number]; world.setRandomState(state.rngState);
  world.queue = [...state.queue]; world.queueProgress = state.queueProgress;
  world.teamTechs[0].clear(); world.teamTechs[1].clear();
  if (state.teamTechs) { state.teamTechs[0].forEach((t) => world.teamTechs[0].add(t)); state.teamTechs[1].forEach((t) => world.teamTechs[1].add(t)); }
  else { state.techs.forEach((t) => world.teamTechs[world.playerTeam].add(t)); }
  world.resourcePoints.forEach((r, i) => { const saved = state.resourcePoints[i]; if (saved) r.amount = saved.amount; });
  world.intel[0].clear(); world.intel[1].clear();
  if (state.intel) {
    state.intel[0].forEach(c => world.intel[0].set(c.entityId, { ...c }));
    state.intel[1].forEach(c => world.intel[1].set(c.entityId, { ...c }));
  }
  for (const saved of state.entities) {
    const def = UNITS[saved.kind];
    const e: Entity = {
      id: saved.id, kind: saved.kind, team: saved.team, def, x: saved.x, y: saved.y, z: saved.z,
      heading: saved.heading, turretYaw: saved.turretYaw, px: saved.px, pz: saved.pz,
      pHeading: saved.pHeading, pTurretYaw: saved.pTurretYaw, hp: saved.hp, cooldown: saved.cooldown, supply: saved.supply ?? 100, maxSupply: saved.maxSupply ?? 100, role: saved.role ?? (saved.kind === "artillery" ? "siege" : saved.kind === "aa" ? "support" : saved.kind === "fighter" ? "air-superiority" : saved.kind === "gunship" ? "air-ground" : saved.kind === "transport" ? "logistics" : "line"),
      mode: saved.mode, dest: saved.dest ? { ...saved.dest } : null, target: null, aggro: saved.aggro,
      dead: saved.dead, morale: saved.morale ?? 100, disabledUntil: saved.disabledUntil ?? 0, fuel: saved.fuel ?? (def.armor === "air" ? 100 : 0), maxFuel: saved.maxFuel ?? (def.armor === "air" ? 100 : 0), ammo: saved.ammo ?? (def.armor === "air" ? 6 : saved.kind === "artillery" ? 10 : 0), maxAmmo: saved.maxAmmo ?? (def.armor === "air" ? 6 : saved.kind === "artillery" ? 10 : 0), fireMission: saved.fireMission ? {...saved.fireMission} : null, navPath: [], navPathIndex: 0, flowField: null, stuckTime: saved.stuckTime, logisticsLoadProgress:saved.logisticsLoadProgress ?? 0, supplyDepotId:saved.supplyDepotId ?? null, supplyLevel:saved.supplyLevel ?? 0,
      stuckX: saved.stuckX, stuckZ: saved.stuckZ, xp: saved.xp, veteran: saved.veteran,
      holdPosition: saved.holdPosition, patrolPoints: saved.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: saved.patrolIndex, upgrades: new Set(saved.upgrades), cargo: saved.cargo ?? 0, logisticsTarget: saved.logisticsTarget ? { ...saved.logisticsTarget } : null, logisticsHome: saved.logisticsHome ? { ...saved.logisticsHome } : null, logisticsPhase: saved.logisticsPhase ?? "idle", productionQueue: [...(saved.productionQueue ?? [])], productionProgress: saved.productionProgress ?? 0, rallyPoint: saved.rallyPoint ? { ...saved.rallyPoint } : null, constructionProgress: saved.constructionProgress ?? 1, constructionTime: saved.constructionTime ?? 0, upgrading:saved.upgrading ?? false, upgradeProgress:saved.upgradeProgress ?? 0, upgradeTime:saved.upgradeTime ?? 0, upgradeKind:saved.upgradeKind, firingArc: saved.firingArc ?? (saved.kind === "bunker" ? Math.PI * 0.62 : saved.kind === "aa" ? Math.PI * 0.9 : saved.kind === "artillery" ? Math.PI * 0.98 : Math.PI * 2), firingRange: saved.firingRange ?? def.range, facingLocked: saved.facingLocked ?? (saved.kind === "bunker" || saved.kind === "aa"), lastCombatTime: saved.lastCombatTime ?? 0, builderIds: [...(saved.builderIds ?? [])], underConstruction: saved.underConstruction ?? false, cargoUnitIds: [...(saved.cargoUnitIds ?? [])], loadedIntoId: saved.loadedIntoId ?? null, transportTargetId: saved.transportTargetId ?? null, unloadPoint: saved.unloadPoint ? { ...saved.unloadPoint } : null, standingOrder:saved.standingOrder ?? null, preDeployOrder:saved.preDeployOrder ? {...saved.preDeployOrder} : null,
    };
    world.entities.push(e); world.byId.set(e.id, e); if (e.kind === "hq") world.hq[e.team] = e;
  }
  for (const saved of state.entities) {
    const e = world.byId.get(saved.id);
    if (e) e.target = saved.targetId === null ? null : world.byId.get(saved.targetId) ?? null;
  }
  const producer = world.entities.find(e => !e.dead && e.team === world.playerTeam && e.productionQueue.length);
  world.queue = producer ? [...producer.productionQueue] : [];
  world.queueProgress = producer?.productionProgress ?? 0;
}

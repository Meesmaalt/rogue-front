import type { Entity, GameStatus, Mode, Point, UnitKind } from "./types";
import type { World } from "./World";
import { FlowField } from "./nav/FlowField";
import type { Projectile, Command, SimEvent } from "./types";
import { UNITS } from "./units";

export interface WorldSave {
  version: 20 | 19 | 18 | 17 | 16 | 15 | 14 | 13 | 12 | 11 | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;
  mapSignature?:string;
  ruleset?:string;
  runtime?: ReturnType<World["captureRuntime"]>;
  fullEntities?: Array<Omit<Entity,"target"|"upgrades"|"flowField"> & { targetId:number|null; upgrades:string[]; flowTarget:Point|null; flowCosts:Array<number|null>|null }>;
  projectiles?: Array<Omit<Projectile,"target"> & {targetId:number|null}>;
  pending?: Command[];
  events?: SimEvent[];
  hqIds?: [number|null,number|null];
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
  airCargoPool?: [number, number];
  airCargoDelivered?: [number, number];
  airCargoLost?: [number, number];
  roadCargoDelivered?: [number, number];
  roadCargoLost?: [number, number];
  infrastructureDamage?: Array<[string, number]>;
  status: GameStatus;
  nextId: number;
  rngState: number;
  queue: UnitKind[];
  queueProgress: number;
  techs: string[];
  teamTechs?: [string[], string[]];
  resourcePoints: Array<{ x: number; z: number; amount: number; radius: number; controlledBy?: 0|1|null; controlProgress?: number; facility?: import("./types").ResourceFacilityKind; level?: number; active?: boolean; startupProgress?: number; maxStock?: number; productionRate?: number; disabledUntil?: number }>;
  intel?: [Array<import("./types").IntelContact>, Array<import("./types").IntelContact>];
  battlegroup?: ReturnType<import("./battlegroup").BattleGroupController["snapshot"]>;
  entities: Array<{
    id: number; kind: UnitKind; team: 0 | 1; x: number; y: number; z: number;
    heading: number; turretYaw: number; px: number; pz: number; pHeading: number; pTurretYaw: number;
    hp: number; cooldown: number; supply?: number; maxSupply?: number; role?: Entity["role"]; mode: Mode; dest: Point | null; targetId: number | null;
    aggro: number; dead: boolean; xp: number; veteran: number; holdPosition: boolean;
    patrolPoints: Point[]; patrolIndex: number; upgrades: string[]; cargo?: number; logisticsTarget?: Point | null; logisticsHome?: Point | null; logisticsPhase?: "idle" | "loading" | "unloading"; productionQueue?: UnitKind[]; productionProgress?: number; firingArc?: number; firingRange?: number; facingLocked?: boolean; lastCombatTime?: number; rallyPoint?: Point | null; constructionProgress?: number; upgrading?: boolean; upgradeProgress?: number; upgradeTime?: number; upgradeKind?: "producer"; buildingLevel?: number; fuel?: number; maxFuel?: number; ammo?: number; maxAmmo?: number; fireMission?: Point | null; artilleryReadyAt?: number; artilleryLastFire?: number; artillerySignatureUntil?: number; artilleryShotsInSalvo?: number; artilleryDisplace?: Point | null; artilleryMissionRound?: number; airSortieCount?: number; airThreat?: number; airWeaponCooldown?: number; airReturnReason?: "fuel"|"ammo"|"damage"|"manual"|"base"|null; aiIntent?: Entity["aiIntent"]; constructionTime?: number; morale?: number; disabledUntil?: number; builderIds?: number[]; underConstruction?: boolean; cargoUnitIds?: number[]; loadedIntoId?: number | null; transportTargetId?: number | null; unloadPoint?: Point | null; standingOrder?: Entity["standingOrder"]; preDeployOrder?: Entity["preDeployOrder"]; stuckTime: number; stuckX: number; stuckZ: number; logisticsLoadProgress?: number; supplyDepotId?: number | null; supplyLevel?: number; logisticsSourceIndex?: number | null; logisticsRoute?: "road" | "air" | "strategic"; logisticsCargoCapacity?: number; logisticsDistance?: number; logisticsStorage?: number; logisticsMaxStorage?: number; ammoStock?: number; fuelStock?: number; repairStock?: number; logisticsPriority?: "ammo" | "fuel" | "repair" | "balanced"; commandNodeId?: number | null; logisticsWaypoints?: Point[]; logisticsRouteMode?: "direct" | "safe" | "manual"; fobLevel?: number; squadMembers?: number; squadMaxMembers?: number; squadFirepower?: number; squadRole?: Entity["squadRole"]; components?: Entity["components"];
  }>;
}

export function saveWorld(world: World): WorldSave {
  return {
    version: 20, mapSignature:saveMapSignature(world), ruleset:SAVE_RULESET,
    runtime: structuredClone(world.captureRuntime()),
    fullEntities: [...world.entities, ...world.hq.filter((h): h is Entity => !!h && !world.byId.has(h.id))].map(e=>{
      const {target,upgrades,flowField,...rest}=e;
      return structuredClone({...rest,targetId:target?.id??null,upgrades:[...upgrades],flowTarget:flowField?.target??null,
        flowCosts:flowField ? Array.from(flowField.costs,v=>Number.isFinite(v)?v:null) : null});
    }),
    projectiles: world.projectiles.map(p=>{const {target,...rest}=p;return {...rest,targetId:target?.id??null};}),
    pending: structuredClone(world.pending), events: structuredClone(world.events),
    hqIds: [world.hq[0]?.id??null,world.hq[1]?.id??null],
    time: world.time, credits: world.credits, resources: world.resources, teamCredits: [...world.teamCredits] as [number,number], teamResources: [...world.teamResources] as [number,number], teamPower: [...world.teamPower] as [number,number], teamPowerUse: [...world.teamPowerUse] as [number,number], teamMorale: [...world.teamMorale] as [number,number], areaControl: [...world.areaControl] as [number,number], supplyUpgrade: [...world.supplyUpgrade] as [number,number], airCargoPool: [...world.airCargoPool] as [number,number], airCargoDelivered: [...world.airCargoDelivered] as [number,number], airCargoLost: [...world.airCargoLost] as [number,number], roadCargoDelivered: [...world.roadCargoDelivered] as [number,number], roadCargoLost: [...world.roadCargoLost] as [number,number], infrastructureDamage: [...world.infrastructureDamage.entries()],
    status: world.status, nextId: world.nextId, rngState: world.getRandomState(),
    queue: [...world.queue], queueProgress: world.queueProgress, techs: [...world.techs], teamTechs: [ [...world.teamTechs[0]], [...world.teamTechs[1]] ],
    resourcePoints: world.resourcePoints.map((r) => ({ ...r })),
    intel: [world.getIntel(0, false), world.getIntel(1, false)],
    battlegroup: world.activeBattlegroup?.snapshot(),
    entities: world.entities.map((e) => ({
      id: e.id, kind: e.kind, team: e.team, x: e.x, y: e.y, z: e.z, heading: e.heading,
      turretYaw: e.turretYaw, px: e.px, pz: e.pz, pHeading: e.pHeading, pTurretYaw: e.pTurretYaw,
      hp: e.hp, cooldown: e.cooldown, supply:e.supply, maxSupply:e.maxSupply, role:e.role, mode: e.mode, dest: e.dest ? { ...e.dest } : null,
      targetId: e.target?.id ?? null, aggro: e.aggro, dead: e.dead, xp: e.xp, veteran: e.veteran,
      fuel:e.fuel, maxFuel:e.maxFuel, ammo:e.ammo, maxAmmo:e.maxAmmo, fireMission:e.fireMission, artilleryReadyAt:e.artilleryReadyAt, artilleryLastFire:e.artilleryLastFire, artillerySignatureUntil:e.artillerySignatureUntil, artilleryShotsInSalvo:e.artilleryShotsInSalvo, artilleryDisplace:e.artilleryDisplace, artilleryMissionRound:e.artilleryMissionRound, airSortieCount:e.airSortieCount, airThreat:e.airThreat, airWeaponCooldown:e.airWeaponCooldown, airReturnReason:e.airReturnReason, aiIntent:e.aiIntent, morale:e.morale, disabledUntil:e.disabledUntil,
      holdPosition: e.holdPosition, patrolPoints: e.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: e.patrolIndex, upgrades: [...e.upgrades], cargo: e.cargo, logisticsTarget: e.logisticsTarget ? { ...e.logisticsTarget } : null, logisticsHome: e.logisticsHome ? { ...e.logisticsHome } : null, logisticsPhase: e.logisticsPhase, productionQueue: [...e.productionQueue], productionProgress: e.productionProgress, rallyPoint: e.rallyPoint ? { ...e.rallyPoint } : null, constructionProgress: e.constructionProgress, constructionTime: e.constructionTime, upgrading:e.upgrading??false, upgradeProgress:e.upgradeProgress??0, upgradeTime:e.upgradeTime??0, upgradeKind:e.upgradeKind, buildingLevel:e.buildingLevel ?? (e.upgrades.has("producer-2") ? 2 : 1), firingArc: e.firingArc, firingRange: e.firingRange, facingLocked: e.facingLocked, lastCombatTime: e.lastCombatTime, builderIds: [...e.builderIds], underConstruction: e.underConstruction, cargoUnitIds: [...e.cargoUnitIds], loadedIntoId: e.loadedIntoId, transportTargetId: e.transportTargetId, unloadPoint: e.unloadPoint ? { ...e.unloadPoint } : null, standingOrder:e.standingOrder ?? null, preDeployOrder:e.preDeployOrder ? {...e.preDeployOrder} : null, stuckTime: e.stuckTime, stuckX: e.stuckX, stuckZ: e.stuckZ, logisticsLoadProgress:e.logisticsLoadProgress, supplyDepotId:e.supplyDepotId ?? null, supplyLevel:e.supplyLevel ?? 0, logisticsSourceIndex:e.logisticsSourceIndex ?? null, logisticsRoute:e.logisticsRoute, logisticsCargoCapacity:e.logisticsCargoCapacity, logisticsDistance:e.logisticsDistance, logisticsStorage:e.logisticsStorage, logisticsMaxStorage:e.logisticsMaxStorage, ammoStock:e.ammoStock, fuelStock:e.fuelStock, repairStock:e.repairStock, logisticsPriority:e.logisticsPriority, commandNodeId:e.commandNodeId ?? null, logisticsWaypoints:(e.logisticsWaypoints ?? []).map(p=>({...p})), logisticsRouteMode:e.logisticsRouteMode ?? "direct", fobLevel:e.fobLevel ?? 0,
    })),
  };
}

export const SAVE_RULESET="2026-10-06.integrated-session";
/** Geometry compatibility excludes changing resource stocks/control. */
export function saveMapSignature(world:World):string {
  const text=JSON.stringify([world.mapSize,world.bases,world.mapFeatures,world.resourcePoints.map(r=>[r.x,r.z,r.radius,r.facility])]);
  let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16);
}
export function loadWorld(world:World,state:WorldSave):void {
  if(!state||typeof state!=="object"||!Number.isInteger(state.version)||state.version<1||state.version>20)throw new Error("Tundmatu või vigane salvestuse versioon");
  if(state.version===20&&(state.mapSignature!==saveMapSignature(world)||state.ruleset!==SAVE_RULESET))throw new Error("Salvestus kuulub teisele kaardiversioonile või mängureeglitele");
  if(![state.time,state.credits,state.resources,state.rngState].every(Number.isFinite)||!["running","won","lost"].includes(state.status)||state.time<0||!Number.isFinite(state.rngState)||!Number.isInteger(state.nextId)||!Array.isArray(state.entities)||!Array.isArray(state.resourcePoints))throw new Error("Salvestuse põhiandmed on vigased");
  for(const key of ["teamCredits","teamResources","teamPower","teamPowerUse","teamMorale","areaControl"] as const)if(state[key]&&(!Array.isArray(state[key])||state[key]!.length!==2||!state[key]!.every(Number.isFinite)))throw new Error("Salvestuse majandusandmed on vigased");
  if(state.runtime?.mapSize!=null&&state.runtime.mapSize!==world.mapSize)throw new Error("Salvestuse kaardi suurus ei vasta avatud kaardile");
  if(state.version>=19){
    if(!state.runtime||!Array.isArray(state.fullEntities))throw new Error("Salvestuse simulatsiooniseisund puudub");
    const ids=new Set<number>();
    for(const e of state.fullEntities){if(!e||!Number.isInteger(e.id)||ids.has(e.id)||!UNITS[e.kind]||!e.def||![e.x,e.y,e.z,e.hp,e.heading].every(Number.isFinite)||!Array.isArray(e.upgrades)||!Array.isArray(e.navPath)||!Array.isArray(e.productionQueue))throw new Error("Salvestuse üksuseandmed on vigased");ids.add(e.id);}
  }
  if(state.projectiles&&!state.projectiles.every(p=>p&&[p.x,p.y,p.z,p.vx,p.vy,p.vz,p.speed].every(Number.isFinite)))throw new Error("Salvestuse mürsuandmed on vigased");
  const previous=saveWorld(world);
  try{restoreWorld(world,state);}catch(error){restoreWorld(world,previous);throw new Error("Salvestuse taastamine ebaõnnestus; eelmine lahing säilitati",{cause:error});}
}
function restoreWorld(world: World, state: WorldSave): void {
  if ((state.version === 19||state.version===20) && state.fullEntities && state.runtime) {
    world.entities.length=0; world.byId.clear(); world.projectiles.length=0;
    for (const saved of state.fullEntities) {
      const {targetId: _targetId,flowTarget: _flowTarget,flowCosts: _flowCosts,upgrades,...rest}=saved;
      const e:Entity={...structuredClone(rest),target:null,upgrades:new Set(upgrades),flowField:null};
      world.byId.set(e.id,e); if (!e.dead) world.entities.push(e);
    }
    for (const saved of state.fullEntities) {
      const e=world.byId.get(saved.id)!; e.target=saved.targetId==null?null:world.byId.get(saved.targetId)??null;
    }
    world.hq[0]=world.byId.get(state.hqIds?.[0]??-1)??null; world.hq[1]=world.byId.get(state.hqIds?.[1]??-1)??null;
    world.time=state.time; world.status=state.status; world.nextId=state.nextId; world.setRandomState(state.rngState);
    world.teamCredits=[...(state.teamCredits??[state.credits,state.credits])]; world.teamResources=[...(state.teamResources??[state.resources,state.resources])];
    for (const key of ["teamPower","teamPowerUse","teamMorale","areaControl","supplyUpgrade","airCargoPool","airCargoDelivered","airCargoLost","roadCargoDelivered","roadCargoLost"] as const) {
      if(state[key]) world[key]=[...state[key]!];
    }
    world.credits=state.credits;world.resources=state.resources;world.queue=[...state.queue];world.queueProgress=state.queueProgress;
    world.resourcePoints.splice(0,world.resourcePoints.length,...structuredClone(state.resourcePoints));
    world.infrastructureDamage.clear();state.infrastructureDamage?.forEach(([id,value])=>world.infrastructureDamage.set(id,value));
    for(const team of [0,1] as const) {world.intel[team].clear();state.intel?.[team].forEach(c=>world.intel[team].set(c.entityId,{...c}));world.teamTechs[team].clear();state.teamTechs?.[team].forEach(t=>world.teamTechs[team].add(t));}
    world.restoreRuntime(state.runtime);
    for(const e of world.entities)if(e.def.transportCapacity==null){const capacity=world.unitDefinition(e.kind,e.team).transportCapacity;if(capacity!=null)e.def.transportCapacity=capacity;}
    if(state.battlegroup)world.activeBattlegroup?.restore(state.battlegroup);
    for (const saved of state.fullEntities) if(saved.flowTarget) {
      const e=world.byId.get(saved.id)!;e.flowField=new FlowField(world.nav,saved.flowTarget,e.def.radius);
      if(saved.flowCosts)e.flowField.costs.set(saved.flowCosts.map(v=>v??Infinity));
    }
    world.projectiles.push(...(state.projectiles??[]).map(p=>{const {targetId,...rest}=p;return {...rest,target:targetId==null?null:world.byId.get(targetId)??null};}));
    world.pending=structuredClone(state.pending??[]);world.events=structuredClone(state.events??[]);
    return;
  }
  if (state.version !== 18 && state.version !== 17 && state.version !== 16 && state.version !== 15 && state.version !== 14 && state.version !== 13 && state.version !== 12 && state.version !== 11 && state.version !== 10 && state.version !== 9 && state.version !== 8 && state.version !== 7 && state.version !== 6 && state.version !== 5 && state.version !== 4 && state.version !== 3 && state.version !== 2 && state.version !== 1) throw new Error("Tundmatu salvestuse versioon");
  if (world.activeBattlegroup && state.battlegroup) world.activeBattlegroup.restore(state.battlegroup);
  world.entities.splice(0, world.entities.length);
  world.byId.clear();
  world.projectiles.splice(0, world.projectiles.length);
  world.hq[0] = null; world.hq[1] = null;
  world.time = state.time; world.credits = state.credits; world.resources = state.resources;
  world.status = state.status; world.nextId = state.nextId; world.teamCredits = [...(state.teamCredits ?? [state.credits,state.credits])] as [number,number]; world.teamResources = [...(state.teamResources ?? [state.resources,state.resources])] as [number,number]; world.teamPower = [...(state.teamPower ?? [100,100])] as [number,number]; world.teamPowerUse = [...(state.teamPowerUse ?? [0,0])] as [number,number]; world.teamMorale = [...(state.teamMorale ?? [100,100])] as [number,number]; world.supplyUpgrade = [...(state.supplyUpgrade ?? [0,0])] as [number,number]; world.airCargoPool = [...(state.airCargoPool ?? [0,0])] as [number,number]; world.roadCargoDelivered = [...(state.roadCargoDelivered ?? [0,0])] as [number,number]; world.roadCargoLost = [...(state.roadCargoLost ?? [0,0])] as [number,number]; world.infrastructureDamage.clear(); for (const [id, value] of (state.infrastructureDamage ?? [])) world.infrastructureDamage.set(id, value); world.airCargoDelivered = [...(state.airCargoDelivered ?? [0,0])] as [number,number]; world.airCargoLost = [...(state.airCargoLost ?? [0,0])] as [number,number]; world.areaControl = [...(state.areaControl ?? [0,0])] as [number,number]; world.setRandomState(state.rngState);
  world.queue = [...state.queue]; world.queueProgress = state.queueProgress;
  world.teamTechs[0].clear(); world.teamTechs[1].clear();
  if (state.teamTechs) { state.teamTechs[0].forEach((t) => world.teamTechs[0].add(t)); state.teamTechs[1].forEach((t) => world.teamTechs[1].add(t)); }
  else { state.techs.forEach((t) => world.teamTechs[world.playerTeam].add(t)); }
  world.resourcePoints.forEach((r, i) => { const saved = state.resourcePoints[i]; if (saved) { Object.assign(r, saved); r.amount = saved.amount; } });
  world.intel[0].clear(); world.intel[1].clear();
  if (state.intel) {
    state.intel[0].forEach(c => world.intel[0].set(c.entityId, { ...c }));
    state.intel[1].forEach(c => world.intel[1].set(c.entityId, { ...c }));
  }
  for (const saved of state.entities) {
    const def = { ...UNITS[saved.kind] };
    const e: Entity = {
      spottedUntil: [0,0], id: saved.id, kind: saved.kind, team: saved.team, def, x: saved.x, y: saved.y, z: saved.z,
      heading: saved.heading, turretYaw: saved.turretYaw, px: saved.px, pz: saved.pz,
      pHeading: saved.pHeading, pTurretYaw: saved.pTurretYaw, hp: saved.hp, cooldown: saved.cooldown, supply: saved.supply ?? 100, maxSupply: saved.maxSupply ?? 100, role: saved.role ?? (saved.kind === "artillery" ? "siege" : saved.kind === "aa" ? "support" : saved.kind === "fighter" ? "air-superiority" : saved.kind === "gunship" ? "air-ground" : saved.kind === "transport" ? "logistics" : "line"),
      mode: saved.mode, dest: saved.dest ? { ...saved.dest } : null, target: null, aggro: saved.aggro,
      dead: saved.dead, morale: saved.morale ?? 100, disabledUntil: saved.disabledUntil ?? 0, fuel: saved.fuel ?? (def.armor === "air" ? 100 : 0), maxFuel: saved.maxFuel ?? (def.armor === "air" ? 100 : 0), ammo: saved.ammo ?? (def.armor === "air" ? 6 : saved.kind === "artillery" ? 10 : 0), maxAmmo: saved.maxAmmo ?? (def.armor === "air" ? 6 : saved.kind === "artillery" ? 10 : 0), fireMission: saved.fireMission ? {...saved.fireMission} : null, artilleryReadyAt:saved.artilleryReadyAt ?? 0, artilleryLastFire:saved.artilleryLastFire ?? -999, artillerySignatureUntil:saved.artillerySignatureUntil ?? 0, artilleryShotsInSalvo:saved.artilleryShotsInSalvo ?? 0, artilleryDisplace:saved.artilleryDisplace ? {...saved.artilleryDisplace} : null, artilleryMissionRound:saved.artilleryMissionRound ?? 0, airSortieCount:saved.airSortieCount ?? 0, airThreat:saved.airThreat ?? 0, airWeaponCooldown:saved.airWeaponCooldown ?? 0, airReturnReason:saved.airReturnReason ?? null, aiIntent:saved.aiIntent ?? null, navPath: [], navPathIndex: 0, flowField: null, stuckTime: saved.stuckTime, logisticsLoadProgress:saved.logisticsLoadProgress ?? 0, supplyDepotId:saved.supplyDepotId ?? null, supplyLevel:saved.supplyLevel ?? 0, logisticsRoute:saved.logisticsRoute, logisticsCargoCapacity:saved.logisticsCargoCapacity, logisticsDistance:saved.logisticsDistance ?? 0, logisticsStorage:saved.logisticsStorage ?? 0, logisticsMaxStorage:saved.logisticsMaxStorage ?? 0, ammoStock:saved.ammoStock ?? 0, fuelStock:saved.fuelStock ?? 0, repairStock:saved.repairStock ?? 0, logisticsPriority:saved.logisticsPriority ?? "balanced", commandNodeId:saved.commandNodeId ?? null, logisticsWaypoints:(saved.logisticsWaypoints ?? []).map(p=>({...p})), logisticsRouteMode:saved.logisticsRouteMode ?? "direct", fobLevel:saved.fobLevel ?? 0, squadMembers:saved.squadMembers ?? 0, squadMaxMembers:saved.squadMaxMembers ?? 0, squadFirepower:saved.squadFirepower ?? 1, squadRole:saved.squadRole, components:saved.components ? {...saved.components} : undefined,
      stuckX: saved.stuckX, stuckZ: saved.stuckZ, xp: saved.xp, veteran: saved.veteran,
      holdPosition: saved.holdPosition, patrolPoints: saved.patrolPoints.map((p) => ({ ...p })),
      patrolIndex: saved.patrolIndex, upgrades: new Set(saved.upgrades), cargo: saved.cargo ?? 0, logisticsTarget: saved.logisticsTarget ? { ...saved.logisticsTarget } : null, logisticsHome: saved.logisticsHome ? { ...saved.logisticsHome } : null, logisticsPhase: saved.logisticsPhase ?? "idle", productionQueue: [...(saved.productionQueue ?? [])], productionProgress: saved.productionProgress ?? 0, rallyPoint: saved.rallyPoint ? { ...saved.rallyPoint } : null, constructionProgress: saved.constructionProgress ?? 1, constructionTime: saved.constructionTime ?? 0, upgrading:saved.upgrading ?? false, upgradeProgress:saved.upgradeProgress ?? 0, upgradeTime:saved.upgradeTime ?? 0, upgradeKind:saved.upgradeKind, buildingLevel:saved.buildingLevel ?? (saved.upgrades.includes("producer-3") ? 3 : saved.upgrades.includes("producer-2") ? 2 : 1), firingArc: saved.firingArc ?? (saved.kind === "bunker" ? Math.PI * 0.62 : saved.kind === "aa" ? Math.PI * 0.9 : saved.kind === "artillery" ? Math.PI * 0.98 : Math.PI * 2), firingRange: saved.firingRange ?? def.range, facingLocked: saved.facingLocked ?? (saved.kind === "bunker" || saved.kind === "aa"), lastCombatTime: saved.lastCombatTime ?? 0, builderIds: [...(saved.builderIds ?? [])], underConstruction: saved.underConstruction ?? false, cargoUnitIds: [...(saved.cargoUnitIds ?? [])], loadedIntoId: saved.loadedIntoId ?? null, transportTargetId: saved.transportTargetId ?? null, unloadPoint: saved.unloadPoint ? { ...saved.unloadPoint } : null, standingOrder:saved.standingOrder ?? null, preDeployOrder:saved.preDeployOrder ? {...saved.preDeployOrder} : null,
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

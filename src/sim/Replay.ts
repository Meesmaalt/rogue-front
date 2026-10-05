import type { Command } from "./types";
import type { World } from "./World";
import {saveWorld,loadWorld,type WorldSave} from "./SaveState";

export interface ReplayCommand { tick: number; command: Command; }
export interface ReplayFile { version: 1 | 2; initialState?: WorldSave; seed: number; commands: ReplayCommand[]; totalTicks: number; }

export class ReplayRecorder {
  private readonly commands: ReplayCommand[] = [];
  private tickIndex = 0;
  private initialState?: WorldSave;
  reset(world:World):void {this.commands.length=0;this.tickIndex=0;this.initialState=saveWorld(world);}
  constructor(private readonly seed: number) {}
  record(command: Command): void { this.commands.push({ tick: this.tickIndex, command: structuredClone(command) }); }
  step(): void { this.tickIndex++; }
  file(): ReplayFile { return { version: this.initialState ? 2 : 1, initialState:this.initialState, seed: this.seed, commands: this.commands, totalTicks: this.tickIndex }; }
}

export function replay(world: World, file: ReplayFile, steps = file.totalTicks): void {
  if (file.version !== 1 && file.version !== 2) throw new Error("Tundmatu replay versioon");
  if(file.version===2){if(!file.initialState)throw new Error("Replay algolek puudub");loadWorld(world,structuredClone(file.initialState));}
  const byTick = new Map<number, Command[]>();
  for (const item of file.commands) (byTick.get(item.tick) ?? byTick.set(item.tick, []).get(item.tick)!).push(item.command);
  for (let tick = 0; tick < steps && world.status === "running"; tick++) {
    for (const command of byTick.get(tick) ?? []) world.issue(structuredClone(command));
    world.tick(1 / 30);
  }
}

export function worldHash(world: World): string {
  const q=(n:number|undefined)=>Number((n??0).toFixed(6));
  const winner=world.status==="running"?null:world.status==="won"?world.playerTeam:1-world.playerTeam;
  const snapshot = {
    time:q(world.time), wallets:[world.teamCredits.map(q),world.teamResources.map(q)], winner, rng:world.getRandomState(),
    networkDecks:world.networkDecks,networkCounts:world.networkProducedCounts,networkGroups:world.networkBattlegroups.map(b=>b?.snapshot()??null),formations:world.teamFormations,losses:world.lossValue,
    techs:world.teamTechs.map(s=>[...s].sort()),priorities:world.logisticsPriority,
    resources:world.resourcePoints, infrastructure:[...world.infrastructureDamage],mapSize:world.mapSize,terrain:world.terrain.snapshot(),
    entities:world.entities.map(e=>[e.id,e.kind,e.team,q(e.x),q(e.y),q(e.z),q(e.motionSpeed),q(e.flightBank),q(e.flightPitch),e.flightOrbitCenter,e.airLandingPhase,e.airTaxiPhase,e.airHomeSlot,e.airSortieTime,e.airSortieCount,e.airReturnReason,e.airMissionHomeId,e.airMissionPoint,e.combatPosition,e.combatPositionTarget,e.combatPositionAnchor,e.combatPositionRetryAt,q(e.hp),q(e.heading),q(e.turretYaw),e.mode,e.dest,e.moveQueue,e.queuedMoveType,e.fastMove,e.moveAxis,e.moveGroup,e.moveQueueStyles,e.transportQueue,e.transportPickupDeadline,e.transportPickupPoint,e.transportExitRetryAt,e.transportTargetId,e.unloadPoint,e.preferredResourceIndex,e.logisticsPaused,e.routeLeg,e.routeWaypointIndex,e.target?.id??0,e.gunElevation,e.weaponCooldowns,e.secondaryAmmo,e.activeWeapon,q(e.cooldown),q(e.ammo),q(e.fuel),q(e.supply),q(e.suppression),q(e.morale),e.components,e.squadMembers,e.loadedIntoId,e.garrisonId,e.garrisonLookPoint,e.garrisonSlot,e.garrisonFacing,e.garrisonOrderId,e.garrisonEntryPoint,e.garrisonOrderDeadline,e.garrisonShiftAt,e.garrisonExitPoint,e.garrisonExitRetryAt,e.garrisonCollapseSeen,e.cargoUnitIds,e.productionQueue,q(e.productionProgress),e.underConstruction,q(e.constructionProgress),e.buildingLevel,[...e.upgrades].sort(),q(e.cargo),e.logisticsPhase,e.logisticsSourceIndex,q(e.logisticsLoadProgress),q(e.nextLogisticsDispatch),e.logisticsHome,e.logisticsTarget,e.logisticsPayload,e.supplyDepotId,e.supplyLevel,e.fobLevel,e.logisticsSourceIndex,e.logisticsCargoCapacity,e.logisticsPriority,e.logisticsWaypoints,e.logisticsPaused,q(e.ammoStock),q(e.fuelStock),q(e.repairStock),e.airState,e.airMission,e.fireMission,e.aiDecisionAt,e.aiIntent]),
    projectiles:world.projectiles.map(p=>[p.id,p.sourceId,p.target?.id??0,q(p.x),q(p.y),q(p.z),p.tx,p.tz,p.aimY,q(p.vx),q(p.vy),q(p.vz),q(p.speed),q(p.age),p.lifetime,p.launchX,p.launchZ,p.weapon,p.damage,p.impactDamage,p.hitChance,p.hitRoll,p.missX,p.missZ,p.profile,p.flight,p.guidance,p.guidanceLost,p.gravity,p.flightTime,p.penetration,p.splash,p.acceleration,p.turnRate,p.maxSpeed,p.warhead,p.suppressionPower]),
    mode:world.matchController?.snapshot(),mission:world.missionController?.snapshot(),
  };
  const json=JSON.stringify(snapshot);let hash=2166136261;
  for(let i=0;i<json.length;i++){hash^=json.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,"0");
}

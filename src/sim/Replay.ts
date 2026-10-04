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
    resources:world.resourcePoints, infrastructure:[...world.infrastructureDamage],
    entities:world.entities.map(e=>[e.id,e.kind,e.team,q(e.x),q(e.z),q(e.hp),q(e.heading),q(e.turretYaw),e.mode,e.dest,e.target?.id??0,q(e.cooldown),q(e.ammo),q(e.fuel),q(e.supply),q(e.suppression),q(e.morale),e.components,e.squadMembers,e.loadedIntoId,e.cargoUnitIds,e.productionQueue,q(e.productionProgress),e.underConstruction,q(e.constructionProgress),e.buildingLevel,[...e.upgrades].sort(),q(e.cargo),e.logisticsPhase,e.logisticsTarget,e.logisticsPayload,q(e.ammoStock),q(e.fuelStock),q(e.repairStock),e.airState,e.airMission,e.fireMission]),
    projectiles:world.projectiles.map(p=>[p.id,p.sourceId,p.target?.id??0,q(p.x),q(p.y),q(p.z),p.tx,p.tz,p.damage,p.hitChance]),
    mode:world.matchController?.snapshot(),mission:world.missionController?.snapshot(),
  };
  const json=JSON.stringify(snapshot);let hash=2166136261;
  for(let i=0;i<json.length;i++){hash^=json.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16).padStart(8,"0");
}

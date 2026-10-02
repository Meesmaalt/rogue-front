import type { Command } from "./types";
import type { World } from "./World";

export interface ReplayCommand { tick: number; command: Command; }
export interface ReplayFile { version: 1; seed: number; commands: ReplayCommand[]; totalTicks: number; }

export class ReplayRecorder {
  private readonly commands: ReplayCommand[] = [];
  private tickIndex = 0;
  constructor(private readonly seed: number) {}
  record(command: Command): void { this.commands.push({ tick: this.tickIndex, command: structuredClone(command) }); }
  step(): void { this.tickIndex++; }
  file(): ReplayFile { return { version: 1, seed: this.seed, commands: this.commands, totalTicks: this.tickIndex }; }
}

export function replay(world: World, file: ReplayFile, steps = file.totalTicks): void {
  if (file.version !== 1) throw new Error("Tundmatu replay versioon");
  const byTick = new Map<number, Command[]>();
  for (const item of file.commands) (byTick.get(item.tick) ?? byTick.set(item.tick, []).get(item.tick)!).push(item.command);
  for (let tick = 0; tick < steps && world.status === "running"; tick++) {
    for (const command of byTick.get(tick) ?? []) world.issue(structuredClone(command));
    world.tick(1 / 30);
  }
}

export function worldHash(world: World): string {
  const snapshot = {
    time: Number(world.time.toFixed(6)), credits: Number(world.credits.toFixed(6)), resources: Number(world.resources.toFixed(6)),
    status: world.status, queue: [...world.queue], queueProgress: Number(world.queueProgress.toFixed(6)), rng: world.getRandomState(),
    entities: world.entities.map((e) => [e.id, e.kind, e.team, Number(e.x.toFixed(4)), Number(e.z.toFixed(4)), Number(e.hp.toFixed(4)), e.mode, e.target?.id ?? 0]),
  };
  return JSON.stringify(snapshot);
}

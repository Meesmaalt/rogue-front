import type { MissionDef } from "../../sim/types";

const modules = import.meta.glob("./*.json", { eager: true, import: "default" }) as Record<string, MissionDef>;

export const MISSIONS: readonly MissionDef[] = Object.values(modules).sort((a, b) => a.id.localeCompare(b.id));

export function getMission(id: string): MissionDef {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Unknown mission: ${id}`);
  return mission;
}

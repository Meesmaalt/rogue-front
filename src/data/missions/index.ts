import type { MissionDef } from "../../sim/types";

import greenValley from "../maps/green-valley.json";
const focus=greenValley as unknown as MissionDef;

const modules = import.meta.glob("./*.json", { eager: true, import: "default" }) as Record<string, MissionDef>;

export const MISSIONS: readonly MissionDef[] = Object.values(modules).map(m=>m.mapRef==="roheorg"?{...m,seed:focus.seed,map:{...focus.map,name:m.map.name,objects:m.map.objects}}:m).sort((a, b) => a.id.localeCompare(b.id));

export function getMission(id: string): MissionDef {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Unknown mission: ${id}`);
  return mission;
}

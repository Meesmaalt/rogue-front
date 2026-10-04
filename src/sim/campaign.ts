import type { MissionDef } from "./types";

export interface CampaignNode {
  id: string;
  missionId: string;
  title: string;
  briefing: string;
  requires: string[];
  reward: { commandXP: number; doctrine?: string };
}

const KEY = "rogue-front.campaign.v2";
export const CAMPAIGN: readonly CampaignNode[] = [
  { id: "tutorial", missionId: "tutorial-logistics", title: "Logistiline algus", briefing: "Ehita baas, ava majandus ja õpi tarneahelat.", requires: [], reward: { commandXP: 100, doctrine: "engineering" } },
  { id: "sandglass", missionId: "operation-sandglass", title: "Liivakell", briefing: "Võta majandus enda kontrolli alla enne, kui vastane saab jõu kokku.", requires: ["tutorial"], reward: { commandXP: 150, doctrine: "land-logistics" } },
  { id: "high-ground", missionId: "operation-high-ground", title: "Kõrgem positsioon", briefing: "Luure, kõrgustik ja suurtükituli otsustavad rinde.", requires: ["sandglass"], reward: { commandXP: 200, doctrine: "recon" } },
  { id: "black-city", missionId: "operation-black-city", title: "Must linn", briefing: "Linnalahingus tuleb juhtida jalaväge, soomust ja tuletoetust koos.", requires: ["high-ground"], reward: { commandXP: 250, doctrine: "urban" } },
  { id: "tidebreaker", missionId: "operation-tidebreaker", title: "Murrang", briefing: "Loo mere- ja õhujõuga läbimurre ning hoia varustusliin elus.", requires: ["black-city"], reward: { commandXP: 300, doctrine: "joint" } },
];

export interface CampaignState { completed: string[]; commandXP: number; doctrines: string[]; difficulty: "normal" | "hard"; }
export function loadCampaign(): CampaignState {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<CampaignState> | null; if (v) return { completed: v.completed ?? [], commandXP: v.commandXP ?? 0, doctrines: v.doctrines ?? [], difficulty: v.difficulty === "hard" ? "hard" : "normal" }; } catch { /* ignore */ }
  return { completed: [], commandXP: 0, doctrines: [], difficulty: "normal" };
}
export function saveCampaign(s: CampaignState): void { localStorage.setItem(KEY, JSON.stringify(s)); }
export function nodeForMission(missionId: string): CampaignNode | undefined { return CAMPAIGN.find(n => n.missionId === missionId); }
export function isUnlocked(node: CampaignNode, state = loadCampaign()): boolean { return node.requires.every(r => state.completed.includes(r)); }
export function availableCampaignNodes(state = loadCampaign()): CampaignNode[] { return CAMPAIGN.filter(n => isUnlocked(n,state)); }
export function completeCampaignMission(mission: MissionDef): CampaignState {
  const state = loadCampaign(); const node = nodeForMission(mission.id); if (!node) return state;
  if (state.completed.includes(node.id)) return state;
  state.completed.push(node.id);
  state.commandXP += node.reward.commandXP;
  if (node.reward.doctrine && !state.doctrines.includes(node.reward.doctrine)) state.doctrines.push(node.reward.doctrine);
  saveCampaign(state); return state;
}

import type { World } from "./World";

/**
 * Real War–style skirmish start:
 * HQ + two combat engineers. No free combat units.
 * Player must build Generator → Supply Depot → Land/Air/Sea Command
 * and rely on logistics helicopters for the bulk of income.
 */
export function createSkirmish(w: World): void {
  const [P, E] = w.bases;

  // Player
  w.spawn("hq", 0, P.x, P.z);
  w.spawn("engineer", 0, P.x + 12, P.z - 10);
  w.spawn("engineer", 0, P.x + 18, P.z - 8);

  // Enemy (same constraints – fair start)
  w.spawn("hq", 1, E.x, E.z);
  w.spawn("engineer", 1, E.x - 12, E.z + 10);
  w.spawn("engineer", 1, E.x - 18, E.z + 8);
}

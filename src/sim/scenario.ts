import type { World } from "./World";

/** Päris RTS skirmishi algseis: HQ + insener + väike kaitse + 2 logistikahelikopterit. */
export function createSkirmish(w: World): void {
  const [P, E] = w.bases;
  w.spawn("hq", 0, P.x, P.z);
  w.spawn("engineer", 0, P.x + 12, P.z - 12);
  w.spawn("engineer", 0, P.x + 18, P.z - 10);
  // Supply depots are the source of the visible logistics cycle.
  // No resource helicopter is free at game start: build a depot first.


  w.spawn("hq", 1, E.x, E.z);
  w.spawn("engineer", 1, E.x - 12, E.z + 12);
  w.spawn("engineer", 1, E.x - 18, E.z + 10);
  // Enemy supply arrives the same way once the AI builds its first depot.

}

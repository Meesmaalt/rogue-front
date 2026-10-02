import type { World } from "../World";
import { UNITS } from "../units";
import { INCOME_PER_SEC } from "../constants";

export function updateProduction(w: World, dt: number): void {
  w.credits += INCOME_PER_SEC * dt;
  const hq = w.hq[w.playerTeam];
  if (!w.queue.length || !hq || hq.dead) return;
  w.queueProgress += dt;
  const kind = w.queue[0];
  if (w.queueProgress < UNITS[kind].buildTime) return;
  w.queueProgress = 0;
  w.queue.shift();
  const P = w.bases[w.playerTeam];
  const u = w.spawn(kind, w.playerTeam, P.x + 12 + w.rng() * 6, P.z - 14 + w.rng() * 4); // kogunemispunkt
  u.mode = "move";
  u.dest = { x: P.x + 24 + w.rng() * 14, z: P.z - 28 + w.rng() * 10 };
}

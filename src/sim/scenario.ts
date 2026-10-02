import type { World } from "./World";
import { getBases } from "./heightmap";

/** Algseis: mängija baas edelas, vaenlase baas kirdes punkritega. */
export function createSkirmish(w: World): void {
  const [P, E] = getBases();
  w.spawn("hq", 0, P.x, P.z);
  for (let i = 0; i < 4; i++) w.spawn("tank", 0, P.x + 16 + i * 6, P.z - 18);
  for (let i = 0; i < 6; i++) w.spawn("inf", 0, P.x + 14 + i * 3, P.z - 27);
  w.spawn("hq", 1, E.x, E.z);
  for (const [dx, dz] of [[-24, 12], [-10, 28], [-30, -6]]) w.spawn("bunker", 1, E.x + dx, E.z + dz);
  for (let i = 0; i < 3; i++) w.spawn("tank", 1, E.x - 14 - i * 6, E.z + 17);
  for (let i = 0; i < 5; i++) w.spawn("inf", 1, E.x - 12 - i * 3, E.z + 25);
}

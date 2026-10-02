import type { World } from "./World";

/** Päris RTS skirmishi algseis: HQ + insener + väike kaitse + 2 logistikahelikopterit. */
export function createSkirmish(w: World): void {
  const [P, E] = w.bases;
  w.spawn("hq", 0, P.x, P.z);
  w.spawn("engineer", 0, P.x + 12, P.z - 12);
  w.spawn("inf", 0, P.x + 10, P.z - 22);
  w.spawn("inf", 0, P.x + 14, P.z - 24);
  const r0 = w.resourcePoints[0] ?? {x:P.x + 35, z:P.z + 35, amount:1000, radius:12};
  for (const [dx,dz] of [[8,12],[14,14]] as const) { const h=w.spawn("transport",0,P.x+dx,P.z+dz); h.logisticsHome={x:P.x+dx,z:P.z+dz}; h.logisticsTarget={x:r0.x,z:r0.z}; h.mode="patrol"; h.dest=h.logisticsTarget; }

  w.spawn("hq", 1, E.x, E.z);
  w.spawn("engineer", 1, E.x - 12, E.z + 12);
  w.spawn("inf", 1, E.x - 10, E.z + 22);
  w.spawn("inf", 1, E.x - 14, E.z + 24);
  const r1 = w.resourcePoints[w.resourcePoints.length - 1] ?? {x:E.x - 35, z:E.z - 35, amount:1000, radius:12};
  for (const [dx,dz] of [[-8,-12],[-14,-14]] as const) { const h=w.spawn("transport",1,E.x+dx,E.z+dz); h.logisticsHome={x:E.x+dx,z:E.z+dz}; h.logisticsTarget={x:r1.x,z:r1.z}; h.mode="patrol"; h.dest=h.logisticsTarget; }
}

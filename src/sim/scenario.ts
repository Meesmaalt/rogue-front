import type { World } from "./World";

/**
 * Real War–style skirmish start:
 * HQ + two combat engineers. No free combat units.
 * Player must build Generator → Supply Depot → Land/Air/Sea Command
 * and rely on logistics helicopters for the bulk of income.
 */
export function createSkirmish(w: World, ready = false): void {
  const [P, E] = w.bases;

  // Player
  w.spawn("hq", 0, P.x, P.z);
  w.spawn("engineer", 0, P.x + 12, P.z - 10);
  w.spawn("engineer", 0, P.x + 18, P.z - 8);

  // Enemy (same constraints – fair start)
  w.spawn("hq", 1, E.x, E.z);
  w.spawn("engineer", 1, E.x - 12, E.z + 10);
  w.spawn("engineer", 1, E.x - 18, E.z + 8);
  if (ready) {
    for (const team of [0,1] as const) {
      const b=w.bases[team], sign=team===0?1:-1;
      for (const [kind,dx,dz] of [["generator",-20,-18],["supply",0,-25],["landCommand",-22,4],["barracks",20,18],["factory",0,28]] as const) w.spawn(kind,team,b.x+dx*sign,b.z+dz*sign);
      const forward={x:b.x+sign*70,z:b.z-sign*50};
      const kinds=["tank","tank","apc","inf","inf","reconVehicle"] as const;
      kinds.forEach((kind,i)=>{const u=w.spawn(kind,team,forward.x+(i%3-1)*9,forward.z+Math.floor(i/3)*9*sign);u.heading=team===0?Math.PI*.65:-Math.PI*.35;u.pHeading=u.heading;});
      const home=w.resourcePoints[team];
      if(home){const engineer=w.entities.find(e=>e.team===team&&e.kind==="engineer");if(engineer)w.issue({type:"move",ids:[engineer.id],team,x:home.x,z:home.z});}
    }
  }
}

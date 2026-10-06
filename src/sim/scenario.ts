import {stationAircraft} from "./systems/airDoctrine";
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
      for (const [kind,dx,dz] of [["generator",-20,-18],["supply",0,-25],["landCommand",-22,4],["barracks",20,18],["factory",0,28],["airCommand",25,-20],["helipad",25,0]] as const) w.spawn(kind,team,b.x+dx*sign,b.z+dz*sign);
      const pad=w.entities.find(e=>e.team===team&&e.kind==="helipad")!;
      const helicopter=w.spawn("heli",team,pad.x,pad.z);stationAircraft(w,helicopter,pad);
      const forward={x:-sign*82,z:sign*50};
      const kinds=["tank","tank","apc","inf","inf","reconVehicle"] as const;
      kinds.forEach((kind,i)=>{const u=w.spawn(kind,team,forward.x+(i%3-1)*9,forward.z+Math.floor(i/3)*9*sign);u.heading=team===0?Math.PI*.65:-Math.PI*.35;u.pHeading=u.heading;});
      const water=w.waterNav.nearestWater(b,10,260);
      if(water){const length=Math.hypot(b.x-water.x,b.z-water.z)||1,dx=(b.x-water.x)/length,dz=(b.z-water.z)/length,port={x:water.x+dx*30,z:water.z+dz*30};
        w.spawn("shipyard",team,port.x,port.z);w.spawn("seaCommand",team,port.x+dx*35,port.z+dz*35);w.spawn("seaStrategy",team,port.x+dx*50,port.z+dz*50+25);w.spawn("supply",team,port.x+dx*45,port.z+dz*45);
        for(const [i,kind] of (["frigate","missileBoat"] as const).entries()){const q=w.waterNav.nearestWater({x:water.x-dx*30,z:water.z-dz*30+i*24},w.unitDefinition(kind,team).radius,40);if(q)w.spawn(kind,team,q.x,q.z);}
      }
      const home=w.resourcePoints[team];
      if(home){const engineer=w.entities.find(e=>e.team===team&&e.kind==="engineer");if(engineer)w.issue({type:"move",ids:[engineer.id],team,x:home.x,z:home.z});}
    }
  }
}

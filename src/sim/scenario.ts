import {dispatchConstruction} from './automaticConstruction';
import {BATTLE_SCALE} from "./battleScale";
import {equipStartingUnit} from "./equipment";
import {stationAircraft} from "./systems/airDoctrine";
import type { World } from "./World";

/**
 * Real War–style skirmish start:
 * HQ with autonomous construction staff. Combat engineers are purchased separately.
 * Player must build Generator → Supply Depot → Land/Air/Sea Command
 * and rely on logistics helicopters for the bulk of income.
 */
export function createSkirmish(w: World, ready = false, generated = false): void {
  for(const team of w.teams){const b=w.bases[team];w.spawn("hq",team,b.x,b.z);}
  dispatchConstruction(w);
  if (ready) {
    for (const team of w.teams) {
      const b=w.bases[team], sign=b.x<0?1:-1;
      for (const [kind,dx,dz] of [["generator",-20,-18],["supply",0,-25],["landCommand",-22,4],["barracks",20,18],["factory",0,28],["airCommand",25,-20],["helipad",25,0]] as const) w.spawn(kind,team,b.x+(w.metricBattle&&kind==="supply"?BATTLE_SCALE.readyAirfield.supplyX:dx)*sign,b.z+(w.metricBattle&&kind==="supply"?BATTLE_SCALE.readyAirfield.supplyZ:dz)*sign);
      const pad=w.entities.find(e=>e.team===team&&e.kind==="helipad")!;
      const helicopter=w.spawn("heli",team,pad.x,pad.z);stationAircraft(w,helicopter,pad);
      if(w.metricBattle){
        const point=w.nav.nearestWalkable({x:b.x+BATTLE_SCALE.readyAirfield.x*sign,z:b.z+BATTLE_SCALE.readyAirfield.z*sign},w.unitDefinition("airbase",team).radius);
        if(!point)throw new Error("Näidisbaasi lennuvälja asukoht puudub");
        const airport=w.spawn("airbase",team,point.x,point.z);
        for(const module of BATTLE_SCALE.readyAirfield.aircraft){const plane=w.spawn("fighter",team,airport.x,airport.z);if(module!=="standard")equipStartingUnit(w,plane,"weapon",module);stationAircraft(w,plane,airport);}
      }
      const forward=generated?{x:b.x*.58,z:b.z*.58}:{x:-sign*82,z:sign*50};
      const kinds=["tank","tank","apc","inf","inf",generated?"reconInf":"reconVehicle"] as const;
      kinds.forEach((kind,i)=>{
        const wanted={x:forward.x+(i%3-1)*9,z:forward.z+Math.floor(i/3)*9*sign};
        const p=generated?w.nav.nearestWalkable(wanted,w.unitDefinition(kind,team).radius):wanted;if(!p)return;
        const u=w.spawn(kind,team,p.x,p.z);u.heading=team===0?Math.PI*.65:-Math.PI*.35;u.pHeading=u.heading;
      });
      const water=generated?null:w.waterNav.nearestWater(b,10,260);
      if(water){const length=Math.hypot(b.x-water.x,b.z-water.z)||1,dx=(b.x-water.x)/length,dz=(b.z-water.z)/length,port={x:water.x+dx*30,z:water.z+dz*30};
        w.spawn("shipyard",team,port.x,port.z);w.spawn("seaCommand",team,port.x+dx*35,port.z+dz*35);w.spawn("seaStrategy",team,port.x+dx*50,port.z+dz*50+25);w.spawn("supply",team,port.x+dx*45,port.z+dz*45);
        for(const [i,kind] of (["frigate","missileBoat"] as const).entries()){const q=w.waterNav.nearestWater({x:water.x-dx*30,z:water.z-dz*30+i*24},w.unitDefinition(kind,team).radius,40);if(q)w.spawn(kind,team,q.x,q.z);}
      }
      const home=w.resourcePoints[team];
      if(home){const engineer=w.entities.find(e=>e.team===team&&e.kind==="engineer"&&!e.constructionCrew);if(engineer)w.issue({type:"move",ids:[engineer.id],team,x:home.x,z:home.z});}
    }
  }
}

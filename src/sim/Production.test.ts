import { describe, expect, it } from "vitest";
import { BASES } from "./heightmap";
import { SIM_STEP } from "./constants";
import { World } from "./World";
import { UNITS } from "./units";

describe("production", () => {
  it("tootab järjekorra lõpus ühiku", () => {
    const w = new World(2); w.spawn("hq", 0, BASES[0].x, BASES[0].z); w.spawn("factory", 0, BASES[0].x + 14, BASES[0].z); w.spawn("generator",0,BASES[0].x,BASES[0].z+18); w.spawn("supply",0,BASES[0].x+18,BASES[0].z+18); w.spawn("landCommand",0,BASES[0].x-18,BASES[0].z); w.issue({ type: "produce", kind: "tank" });
    for (let i = 0; i < Math.ceil(UNITS.tank.buildTime / SIM_STEP) + 2; i++) w.tick(SIM_STEP);
    expect(w.entities.some((e) => e.kind === "tank" && e.team === 0)).toBe(true);
  });
});

import {afterEach} from "vitest";
import {setBases,resetHeightmap,heightAt} from "./heightmap";
import {updateProduction} from "./systems/production";
import {airParkingPoint,stationAircraft} from "./systems/airDoctrine";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
afterEach(resetHeightmap);
function airWorld():World {
  const bases=[{x:0,z:-180,r:140},{x:180,z:180,r:35}];setBases(bases);
  const w=new World(81,false,[{x:260,z:260,radius:5,amount:0}],[],bases,false);w.networkMode=true;
  w.spawn("hq",0,-40,-180);w.spawn("generator",0,-40,-160);w.spawn("supply",0,-20,-170);w.spawn("airCommand",0,-40,-200);w.spawn("airStrategy",0,-60,-200);
  return w;
}
it("physical air operations: production, runway queue, mission, landing and finite rearm",()=>{
  const w=airWorld(),pad=w.spawn("airbase",0,10,-180);pad.buildingLevel=2;pad.productionQueue=["fighter"];pad.productionProgress=UNITS.fighter.buildTime;
  expect(w.productionOperational(pad).operational).toBe(true);updateProduction(w,SIM_STEP);
  const plane=w.entities.find(e=>e.kind==="fighter")!;expect(plane).toBeDefined();expect(plane.airState).toBe("grounded");expect(plane.x).toBeCloseTo(airParkingPoint(plane,pad).x);
  const other=w.spawn("fighter",0,pad.x,pad.z);stationAircraft(w,other,pad);
  w.issue({type:"air-mission",ids:[pad.id],mission:"cap",x:10,z:-80});let queueObserved=false;
  for(let i=0;i<900&&plane.airState!=="airborne";i++){w.tick(SIM_STEP);if(plane.airTaxiPhase==="runway"){expect(other.airTaxiPhase).not.toBe("runway");queueObserved=true;}}
  expect(queueObserved).toBe(true);expect(plane.airState).toBe("airborne");expect(plane.y).toBeGreaterThan(heightAt(plane.x,plane.z));
  for(let i=0;i<60;i++)w.tick(SIM_STEP);plane.ammo=Math.max(0,plane.ammo!-2);plane.fuel=plane.fuel!-80;
  w.issue({type:"air-return",ids:[pad.id]});let landed=false;
  for(let i=0;i<1800;i++){w.tick(SIM_STEP);if(plane.airState==="rearming"||plane.airState==="grounded"){landed=true;break;}}
  expect(landed).toBe(true);expect(plane.airReturnReason).toBe("manual");expect(Math.hypot(plane.x-airParkingPoint(plane,pad).x,plane.z-airParkingPoint(plane,pad).z)).toBeLessThan(1);
  const depot=w.entities.find(e=>e.kind==="supply")!,stock=depot.ammoStock!;for(let i=0;i<90;i++)w.tick(SIM_STEP);expect(plane.ammo).toBe(plane.maxAmmo);expect(depot.ammoStock).toBeLessThan(stock);
  const copy=airWorld();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it("physical air operations: helicopter rises vertically and cannot fly without a facility",()=>{
  const w=airWorld(),pad=w.spawn("helipad",0,10,-180),u=w.spawn("heli",0,10,-180);stationAircraft(w,u,pad);const x=u.x,z=u.z;
  w.issue({type:"air-mission",ids:[pad.id],mission:"ground",x:30,z:-100});for(let i=0;i<30;i++)w.tick(SIM_STEP);
  expect(u.airState).toBe("taxi");expect(u.x).toBe(x);expect(u.z).toBe(z);expect(u.y).toBeGreaterThan(heightAt(x,z)+4);
  const orphan=w.spawn("heli",0,-100,-180);orphan.airState="grounded";pad.dead=true;w.issue({type:"move",ids:[orphan.id],x:0,z:-100});for(let i=0;i<10;i++)w.tick(SIM_STEP);expect(orphan.airState).toBe("grounded");expect(orphan.x).toBe(-100);
});

import {describe,it,expect} from "vitest";
import {World} from "./World";
import {SIM_STEP} from "./constants";
import {UNITS} from "./units";
import {assignAirMission} from "./systems/airDoctrine";
import {saveWorld,loadWorld} from "./SaveState";
import {MissionController} from "./Mission";
import {MISSIONS} from "../data/missions";
import {setBases,setProceduralSeed,resetHeightmap} from "./heightmap";
import {damage} from "./systems/combat";
const run=(w:World,s:number)=>{for(let i=0;i<Math.ceil(s/SIM_STEP);i++)w.tick(SIM_STEP);};
describe("connected military systems",()=>{
 it("building upgrades finish without an assigned engineer and change capacity",()=>{
  const w=new World(1);w.networkMode=true;const p=w.bases[0];w.spawn("hq",0,p.x,p.z);const generator=w.spawn("generator",0,p.x+20,p.z);const supply=w.spawn("supply",0,p.x,p.z+20);w.teamCredits[0]=w.teamResources[0]=2000;
  w.issue({type:"upgrade",ids:[generator.id],upgrade:"producer"});run(w,11);expect(generator.buildingLevel).toBe(2);expect(generator.underConstruction).toBe(false);expect(generator.hp).toBe(generator.def.hp);expect(w.powerStatus(0).supply).toBeGreaterThan(125);
  w.issue({type:"upgrade",ids:[supply.id],upgrade:"producer"});run(w,11);expect(supply.buildingLevel).toBe(2);expect(supply.logisticsMaxStorage).toBeGreaterThan(900);
 });
 it("artillery consumes ammo, produces a real impact and uses a detected observer contact",()=>{
  const w=new World(2);w.networkMode=true;const a=w.spawn("artillery",0,-30,0),s=w.spawn("reconVehicle",0,0,0),t=w.spawn("tank",1,20,0);s.mode="hold";s.holdPosition=true;t.mode="hold";t.holdPosition=true;
  const initial=a.ammo!;w.issue({type:"fire-mission",ids:[a.id],x:t.x,z:t.z});run(w,8);expect(a.ammo).toBeLessThan(initial);expect(a.artilleryMissionRound).toBeGreaterThan(0);expect(t.hp).toBeLessThan(t.def.hp);
 });
 it("air missions take off, return to a real airbase and rearm from finite depot stocks",()=>{
  const w=new World(1);w.networkMode=true;const p=w.bases[0];w.spawn("hq",0,p.x,p.z);w.spawn("generator",0,p.x+20,p.z);const depot=w.spawn("supply",0,p.x,p.z+25);w.spawn("airCommand",0,p.x-20,p.z);const pad=w.spawn("airbase",0,p.x+30,p.z);const u=w.spawn("fighter",0,pad.x,pad.z);u.airMissionHomeId=pad.id;u.airState="grounded";
  assignAirMission(u,"cap",{x:pad.x+30,z:pad.z});run(w,1);expect(u.airState).toBe("airborne");expect(u.airSortieCount).toBe(1);
  u.ammo=0;run(w,15);expect(["rearming","grounded"]).toContain(u.airState);expect(u.ammo).toBeGreaterThan(0);expect(depot.ammoStock).toBeLessThan(420);expect(u.airMissionHomeId).toBe(pad.id);
 });
 it("stock travels from warehouse to FOB in a physical truck without generating extra income",()=>{
  const w=new World(1);w.networkMode=true;const p=w.bases[0];w.spawn("hq",0,p.x,p.z);w.spawn("generator",0,p.x-20,p.z);const main=w.spawn("supply",0,p.x,p.z+20);const fob=w.spawn("supply",0,p.x+70,p.z);fob.ammoStock=fob.fuelStock=fob.repairStock=0;
  const start=main.ammoStock!;run(w,35);expect(w.entities.some(e=>e.kind==="logiTruck")).toBe(true);expect(fob.ammoStock).toBeGreaterThan(0);expect(main.ammoStock).toBeLessThan(start);expect(w.roadCargoDelivered[0]).toBeGreaterThan(0);
 });
 it("manual depot waypoints are followed by the physical resupply convoy",()=>{
  const w=new World(1);w.networkMode=true;const p=w.bases[0];w.spawn("hq",0,p.x,p.z);w.spawn("generator",0,p.x-20,p.z);w.spawn("supply",0,p.x,p.z+20);const fob=w.spawn("supply",0,p.x+70,p.z);fob.ammoStock=fob.fuelStock=fob.repairStock=0;
  const point={x:p.x+42,z:p.z+15};w.issue({type:"logistics-route",ids:[fob.id],...point});let distance=Infinity;
  for(let i=0;i<45/SIM_STEP;i++){w.tick(SIM_STEP);for(const t of w.entities)if(t.kind==="logiTruck"&&t.supplyDepotId===fob.id&&t.cargo>0)distance=Math.min(distance,Math.hypot(t.x-point.x,t.z-point.z));}
  expect(distance).toBeLessThan(7);expect(fob.ammoStock).toBeGreaterThan(0);
 });
 it("all five campaign missions have reachable objective results and preserve progress through save/load",()=>{
  for(const mission of MISSIONS){resetHeightmap();setBases(mission.map.bases);setProceduralSeed(mission.seed);const w=new World(mission.seed,true,mission.map.resources,mission.map.features,mission.map.bases);w.networkMode=true;
   for(const o of mission.map.objects??[])for(let i=0;i<(o.count??1);i++)w.spawn(o.kind,o.team,o.x+(o.dx??0)*i,o.z+(o.dz??0)*i);
   w.missionController=new MissionController(mission,w);
   for(const e of [...w.entities])if(e.team===1)damage(w,e,100000);
   for(const objective of mission.objectives){
    if(objective.kind==="build"&&objective.target?.kind)w.spawn(objective.target.kind,0,-80,80);
    if(objective.kind==="produce"&&objective.unitKind)w.producedCounts[objective.unitKind]=objective.target?.count??1;
    if(objective.kind==="deliver")w.roadCargoDelivered[0]=objective.target?.count??100;
    if(objective.kind==="destroy"||objective.kind==="sabotage")for(const e of [...w.entities])if(e.team===(objective.target?.team??1)&&(!objective.target?.kind||e.kind===objective.target.kind))damage(w,e,100000);
    if(objective.point&&(objective.kind==="reach"||objective.kind==="defend")){const u=w.spawn(objective.unitKind??"tank",0,objective.point.x,objective.point.z);u.holdPosition=true;u.mode="hold";}
    if(objective.kind==="capture")for(const r of w.resourcePoints)if(objective.point&&Math.hypot(r.x-objective.point.x,r.z-objective.point.z)<=(objective.radius??12)){r.controlledBy=0;r.controlProgress=1;}
   }
   const duration=Math.max(1,...mission.objectives.map(o=>o.duration??0));run(w,duration+2);
   expect(w.status,mission.id).toBe("won");
   const b=new World(mission.seed,true,mission.map.resources,mission.map.features,mission.map.bases);b.missionController=new MissionController(mission,b);loadWorld(b,JSON.parse(JSON.stringify(saveWorld(w))));expect(b.missionController.summary()).toEqual(w.missionController.summary());
  }resetHeightmap();
 });
 it("all producible units have meaningful physical weapon and supply stats",()=>{for(const [kind,d]of Object.entries(UNITS)){if(!d.producible)continue;expect(d.roleLabel,kind).toBeTruthy();expect(d.opticsRange,kind).toBeGreaterThan(0);if(d.damage>0){expect(d.ammoCapacity,kind).toBeGreaterThan(0);expect(d.accuracy,kind).toBeGreaterThan(0);expect(d.penetration,kind).toBeGreaterThan(0);}if(d.category!=="infantry"&&d.category!=="recon"&&d.speed>0)expect(d.fuelCapacity,kind).toBeGreaterThan(0);}});
});

import {describe,it,expect} from "vitest";
import {World} from "./World";
import {SIM_STEP} from "./constants";
import {UNITS} from "./units";
import {saveWorld,loadWorld} from "./SaveState";
import {MatchModeController} from "./gameModes";
import {createSkirmish} from "./scenario";
import {damage,fireProjectile} from "./systems/combat";
const run=(w:World,s:number)=>{for(let i=0;i<Math.ceil(s/SIM_STEP);i++)w.tick(SIM_STEP);};
function base(){const w=new World(99);w.setNetworkMode(0);const p=w.bases[0];w.spawn("hq",0,p.x,p.z);w.spawn("generator",0,p.x+18,p.z);w.spawn("supply",0,p.x,p.z+24);w.spawn("landCommand",0,p.x-18,p.z);const f=w.spawn("factory",0,p.x+24,p.z+24);return {w,f};}
describe("integrated gameplay",()=>{
 it("queues, consumes warehouse stocks, stalls on an outage and resumes without losing the order",()=>{
  const {w,f}=base();const depot=w.entities.find(e=>e.kind==="supply")!;
  w.issue({type:"produce",kind:"tank",producerId:f.id});run(w,1);expect(f.productionProgress).toBeGreaterThan(0);expect(depot.ammoStock).toBeLessThan(420);
  const progress=f.productionProgress;depot.ammoStock=0;run(w,2);expect(f.productionProgress).toBe(progress);expect(f.productionQueue).toEqual(["tank"]);
  depot.ammoStock=400;run(w,UNITS.tank.buildTime);expect(w.entities.some(e=>e.kind==="tank")).toBe(true);expect(f.productionQueue).toEqual([]);
 });
 it("does not take control of a human army or spawn free battlegroup units",()=>{
  const w=new World(3);createSkirmish(w);const u=w.spawn("tank",0,-110,100);u.mode="hold";u.holdPosition=true;w.setActiveDeck({faction:"usa",name:"test",slots:[{kind:"tank",count:2}],updatedAt:0});run(w,14);
  expect(u.mode).toBe("hold");expect(w.entities.filter(e=>e.kind==="tank"&&e.team===0)).toHaveLength(1);
 });
 it("restores ammunition, suppression, component damage, projectiles and pending orders and then continues identically",()=>{
  const {w,f}=base();w.playerFaction="china";const u=w.spawn("tank",0,0,0);const v=w.spawn("tank",1,22,0);u.suppression=34;u.components!.engine=42;u.ammo=13;
  fireProjectile(w,u,v,u.x,u.y+2,u.z);w.issue({type:"move",ids:[u.id],x:40,z:20});w.issue({type:"produce",kind:"tank",producerId:f.id});
  const state=JSON.parse(JSON.stringify(saveWorld(w)));const b=new World(99);loadWorld(b,state);
  expect(b.projectiles).toHaveLength(1);expect(b.byId.get(u.id)?.suppression).toBe(34);expect(b.byId.get(u.id)?.def).toEqual(u.def);
  run(w,6);run(b,6);expect(saveWorld(b)).toEqual(saveWorld(w));
 });
 it("attrition records the destroyed faction's unit cost, independently of render event draining",()=>{
  const w=new World(4);w.externalVictoryMode=true;w.matchController=new MatchModeController(w,"attrition");const a=w.spawn("tank",0,0,0),b=w.spawn("tank",1,20,0);
  damage(w,a,10000);w.drainEvents();w.tick(SIM_STEP);expect(w.matchController.scores[1]).toBe(a.def.cost);expect(w.matchController.scores[0]).toBe(0);
  damage(w,b,10000);w.drainEvents();w.tick(SIM_STEP);expect(w.matchController.scores[0]).toBe(b.def.cost);
 });
 it("breakthrough requires an uncontested ground hold; aircraft cannot win by flying over HQ",()=>{
  const w=new World(4);w.networkMode=true;w.externalVictoryMode=true;w.matchController=new MatchModeController(w,"breakthrough");const p=w.bases[1];w.spawn("fighter",0,p.x,p.z);run(w,21);expect(w.status).toBe("running");
  const u=w.spawn("inf",0,p.x,p.z);u.mode="hold";u.holdPosition=true;run(w,19);expect(w.status).toBe("running");run(w,2);expect(w.status).toBe("won");
 });
 it("conquest and assault finish with a real result at their time limit",()=>{
  for(const mode of ["conquest","assault"] as const){const w=new World(1);w.externalVictoryMode=true;w.matchController=new MatchModeController(w,mode);w.time=w.matchController.rules.timeLimit;w.matchController.tick(SIM_STEP);expect(w.status).toBe("lost");}
 });
 it("supply starvation never mutates a unit's base accuracy",()=>{
  const w=new World(3);w.networkMode=true;const u=w.spawn("tank",0,0,0);u.supply=0;const accuracy=u.def.accuracy;run(w,3);expect(u.def.accuracy).toBe(accuracy);expect(UNITS.tank.accuracy).toBe(accuracy);
 });
});

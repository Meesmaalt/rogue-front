import {it,expect} from "vitest";
import {World} from "./World";
import {createSkirmish} from "./scenario";
import {SIM_STEP} from "./constants";
import {BUILDINGS,type BuildableKind} from "./buildings";
import {ReplayRecorder,replay,worldHash} from "./Replay";
const run=(w:World,s:number)=>{for(let i=0;i<Math.ceil(s/SIM_STEP);i++)w.tick(SIM_STEP);};
it("a player builds the complete industrial chain and produces a tank using starting funds and physical income",()=>{
 const w=new World(17);createSkirmish(w);w.networkMode=true;const p=w.bases[0];const [builder,collector]=w.entities.filter(e=>e.team===0&&e.kind==="engineer");
 const resource=[...w.resourcePoints].sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
 w.issue({type:"move",ids:[collector.id],x:resource.x,z:resource.z});
 let factory=0;
 for(const kind of ["generator","supply","landCommand","factory"] as BuildableKind[]){
  let point:{x:number,z:number}|undefined;
  for(const radius of [24,40,56])for(let i=0;i<16&&!point;i++){const a=i*Math.PI/8;const x=p.x+Math.sin(a)*radius,z=p.z+Math.cos(a)*radius;if(w.canPlaceBuilding(0,kind,x,z))point={x,z};}
  expect(point,kind).toBeDefined();w.issue({type:"build",ids:[builder.id],kind,...point!});run(w,BUILDINGS[kind].buildTime+32);
  const building=w.entities.find(e=>e.team===0&&e.kind===kind)!;expect(building,kind).toBeDefined();expect(building.underConstruction,kind).toBe(false);expect(building.hp).toBe(building.def.hp);if(kind==="factory")factory=building.id;
 }
 expect(resource.active).toBe(true);expect(resource.controlledBy).toBe(0);expect(w.roadCargoDelivered[0]).toBeGreaterThan(0);
 w.issue({type:"produce",kind:"tank",producerId:factory});run(w,35);expect(w.entities.some(e=>e.kind==="tank"&&e.team===0)).toBe(true);
},15000);
it("formation is a team-specific tick command preserved by replay and save snapshots",()=>{
 const a=new World(32);createSkirmish(a);a.networkMode=true;const recorder=new ReplayRecorder(32);recorder.reset(a);
 const command={type:"formation",kind:"line",team:0} as const;recorder.record(command);a.issue(command);expect(a.teamFormations[0]).toBe("box");a.tick(SIM_STEP);recorder.step();
 expect(a.teamFormations).toEqual(["line","box"]);const b=new World(32);replay(b,JSON.parse(JSON.stringify(recorder.file())));expect(worldHash(b)).toBe(worldHash(a));
});
it("the synchronization hash detects ammo changes and does not depend on the local player's wallet alias",()=>{
 const w=new World(3);createSkirmish(w);w.networkMode=true;const u=w.spawn("tank",0,0,0);const before=worldHash(w);u.ammo!--;expect(worldHash(w)).not.toBe(before);const same=worldHash(w);w.playerTeam=1;w.credits=42;expect(worldHash(w)).toBe(same);
});

it("two local perspectives retain identical seeded simulation and faction behavior",()=>{
 const a=new World(31),b=new World(31);createSkirmish(a);createSkirmish(b);a.setNetworkMode(0);b.setNetworkMode(1);
 const commands=[{type:"move",ids:[2],x:0,z:0,team:0},{type:"move",ids:[5],x:0,z:0,team:1}] as const;
 for(const c of commands){a.issue({...c,ids:[...c.ids]});b.issue({...c,ids:[...c.ids]});}
 run(a,10);run(b,10);expect(worldHash(a)).toBe(worldHash(b));expect(b.playerFaction).toBe(a.enemyFaction);
});

it("online decks gate both teams identically through production and snapshot restore",()=>{
 const a=new World(57),b=new World(57);
 const decks=[{faction:"usa",name:"Armor",slots:[{kind:"tank",count:1}],updatedAt:1},{faction:"china",name:"Mechanized",slots:[{kind:"ifv",count:1}],updatedAt:1}] as const;
 for(const w of[a,b]){
  w.playerFaction="usa";w.enemyFaction="china";createSkirmish(w);w.setNetworkMode(w===a?0:1);
  w.setNetworkDecks(structuredClone(decks) as unknown as Parameters<World["setNetworkDecks"]>[0]);
  w.teamCredits=[10000,10000];w.teamResources=[10000,10000];
  for(const team of[0,1]as const){const base=w.bases[team];for(const [i,kind]of(["generator","supply","landCommand","factory"]as const).entries())w.spawn(kind,team,base.x+i*8,base.z+15);}
 }
 const factory=a.entities.find(e=>e.team===0&&e.kind==="factory")!,enemy=a.entities.find(e=>e.team===1&&e.kind==="factory")!;
 for(const w of[a,b]){w.issue({type:"produce",team:0,kind:"tank",producerId:factory.id});w.issue({type:"produce",team:1,kind:"tank",producerId:enemy.id});}
 for(let i=0;i<1000;i++){a.tick(SIM_STEP);b.tick(SIM_STEP);}
 expect(a.entities.some(e=>e.team===0&&e.kind==="tank")).toBe(true);expect(a.entities.some(e=>e.team===1&&e.kind==="tank")).toBe(false);expect(worldHash(a)).toBe(worldHash(b));
 const recorder=new ReplayRecorder(57);recorder.reset(a);const restored=new World(57);replay(restored,recorder.file(),0);expect(worldHash(restored)).toBe(worldHash(a));
});

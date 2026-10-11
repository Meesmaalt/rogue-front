import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {isGarrisonBuilding} from './garrison';
import {MissionController} from './Mission';
import {resetHeightmap,setMapSize,setBases} from './heightmap';
import {saveWorld,loadWorld} from './SaveState';
import {BUILDINGS,type BuildableKind} from "./buildings";
import {SIM_STEP} from "./constants";
import type {MissionDef} from './types';
import {getMission} from '../data/missions';
afterEach(resetHeightmap);
it('reinforcements do not erase original destroy targets, including after a restore',()=>{
 const w=new World(92),hq=w.spawn('hq',0,0,0),original=w.spawn('supply',1,60,60);
 const def={id:'objective',map:{bases:w.bases},objectives:[{id:'depot',kind:'destroy',title:'Ladu',description:'Hävita algne ladu',target:{kind:'supply',team:1,count:1}}]} as unknown as MissionDef;
 w.missionController=new MissionController(def,w);w.spawn('supply',1,80,80);original.dead=true;
 const copy=new World(92);loadWorld(copy,saveWorld(w));copy.missionController!.tick(1/30);expect(copy.status).toBe('won');expect(hq.dead).toBe(false);
});
it('tutorial advances on real upgrades, transport and garrison states and restores its active step',()=>{
 const m=getMission("tutorial-logistics");setMapSize(m.map.size!);setBases(m.map.bases);const w=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);
 for(const o of m.map.objects??[])w.spawn(o.kind,o.team,o.x,o.z);
 const mission=new MissionController(m,w);w.missionController=mission;expect(mission.activeObjective?.id).toBe('generator');
 const b=m.map.bases[0];w.spawn('generator',0,b.x-20,b.z-18);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('warehouse');
 // Exercise the same objective evaluator on existing sim states without a long tutorial playthrough.
 const state=mission.snapshot();for(let i=0;i<state.objectives.length;i++)if(i<8)state.objectives[i].complete=true;mission.restore(state);
 const barracks=w.spawn('barracks',0,b.x+20,b.z+18);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('upgrade-barracks');barracks.buildingLevel=2;mission.tick(1/30);expect(mission.activeObjective?.id).toBe('recon');
 const advance=mission.snapshot();for(let i=0;i<advance.objectives.length;i++)if(i<14)advance.objectives[i].complete=true;mission.restore(advance);
 const inf=w.spawn('inf',0,b.x+10,b.z),apc=w.spawn('apc',0,b.x+15,b.z);inf.loadedIntoId=apc.id;apc.cargoUnitIds.push(inf.id);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('urban');
 inf.loadedIntoId=null;inf.garrisonId=m.map.features!.find(isGarrisonBuilding)!.id;mission.tick(1/30);expect(mission.activeObjective?.id).toBe('destroy-enemy-supply');
 const copy=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);loadWorld(copy,saveWorld(w));expect(copy.missionController!.activeObjective?.id).toBe('destroy-enemy-supply');
});

it("tutorial reaches transport and urban combat through actual paid commands and physical deliveries",()=>{
 const m=getMission("tutorial-logistics");setMapSize(m.map.size!);setBases(m.map.bases);
 const w=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);
 for(const o of m.map.objects??[])w.spawn(o.kind,o.team,o.x,o.z);
 w.missionController=new MissionController(m,w);w.ai.setProfile("defensive","easy");
 const engineers=w.entities.filter(e=>e.team===0&&e.kind==="engineer"),base=w.bases[0];
 const wait=(test:()=>boolean,seconds=120)=>{
  for(let n=0;n<seconds/SIM_STEP&&!test()&&w.status==="running";n++)w.tick(SIM_STEP);
  expect(test(),`${w.missionController?.activeObjective?.id} at ${w.time.toFixed(1)}s, resources ${w.resources.toFixed(0)}`).toBe(true);
 };
 const build=(kind:BuildableKind)=>{
  wait(()=>w.teamCredits[0]>=BUILDINGS[kind].cost&&w.teamResources[0]>=BUILDINGS[kind].cost);
  let point:{x:number;z:number}|undefined;
  for(const r of [24,40,56,72])for(let i=0;i<16&&!point;i++){
   const x=base.x+Math.sin(i*Math.PI/8)*r,z=base.z+Math.cos(i*Math.PI/8)*r;
   if(w.canPlaceBuilding(0,kind,x,z))point={x,z};
  }
  expect(point,kind).toBeDefined();
  w.issue({type:"build",ids:[engineers[0].id],kind,...point!});
  wait(()=>w.entities.some(e=>e.team===0&&e.kind===kind&&!e.underConstruction));
  return w.entities.find(e=>e.team===0&&e.kind===kind)!;
 };
 const produce=(kind:Parameters<World["unitDefinition"]>[0],producerId:number)=>{
  wait(()=>w.teamCredits[0]>=w.unitDefinition(kind,0).cost&&w.teamResources[0]>=w.unitDefinition(kind,0).cost);
  w.issue({type:"produce",kind,producerId});wait(()=>w.entities.some(e=>e.team===0&&e.kind===kind));
  return w.entities.find(e=>e.team===0&&e.kind===kind)!;
 };
 build("generator");const depot=build("supply");
 const resource=w.resourcePoints.reduce((a,b)=>Math.hypot(a.x-base.x,a.z-base.z)<Math.hypot(b.x-base.x,b.z-base.z)?a:b);
 w.issue({type:"move",ids:[engineers[1].id],x:resource.x,z:resource.z});
 wait(()=>w.roadCargoDelivered[0]>=100,180);
 expect(resource.active).toBe(true);expect(depot.ammoStock).toBeGreaterThan(0);
 build("landCommand");const factory=build("factory");produce("tank",factory.id);
 build("landStrategy");const barracks=build("barracks");
 wait(()=>w.teamCredits[0]>=260&&w.teamResources[0]>=260);
 w.issue({type:"upgrade",ids:[barracks.id],upgrade:"producer"});wait(()=>barracks.buildingLevel===2);
 const recon=produce("reconInf",barracks.id);
 w.issue({type:"move",ids:[recon.id],x:-485,z:185});wait(()=>w.missionController!.activeObjective?.id==="infantry");
 const inf=produce("inf",barracks.id);
 wait(()=>w.teamCredits[0]>=260&&w.teamResources[0]>=260);
 w.issue({type:"upgrade",ids:[factory.id],upgrade:"producer"});wait(()=>factory.buildingLevel===2);
 const apc=produce("apc",factory.id);w.issue({type:"load",ids:[inf.id],targetId:apc.id});
 wait(()=>inf.loadedIntoId===apc.id);expect(w.missionController!.preparing).toBe(true);
 const house=w.mapFeatures.filter(isGarrisonBuilding).reduce((a,b)=>Math.hypot(a.x-apc.x,a.z-apc.z)<Math.hypot(b.x-apc.x,b.z-apc.z)?a:b);
 w.issue({type:"unload",ids:[apc.id],x:house.x+12,z:house.z});wait(()=>inf.loadedIntoId==null);
 w.issue({type:"enter-building",ids:[inf.id],featureId:house.id});wait(()=>inf.garrisonId===house.id);
 w.tick(SIM_STEP);
 expect(w.missionController!.activeObjective?.id).toBe("destroy-enemy-supply");
 expect(w.missionController!.preparing).toBe(false);
 expect(w.entities.filter(e=>e.team===1&&e.kind==="factory")).toHaveLength(0);
 const timer=w.ai.buildTimer;w.tick(SIM_STEP);expect(w.ai.buildTimer).toBeLessThan(timer);
 const copy=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);
 loadWorld(copy,saveWorld(w));expect(copy.missionController!.preparing).toBe(false);
},20000);

it("a stopped foundation waits for an explicit engineer reassignment and resumes construction",()=>{
 const w=new World(73,false,[],[],[],false),base=w.bases[0];w.networkMode=true;
 w.spawn("hq",0,base.x,base.z);const engineer=w.spawn("engineer",0,base.x+20,base.z);
 const foundation=w.spawn("generator",0,base.x+25,base.z);foundation.underConstruction=true;foundation.constructionProgress=0;foundation.constructionTime=1;foundation.hp=20;
 engineer.mode="build";engineer.target=foundation;foundation.builderIds=[engineer.id];
 w.issue({type:"stop",ids:[engineer.id]});for(let i=0;i<30;i++)w.tick(SIM_STEP);
 expect(foundation.constructionProgress).toBe(0);expect(engineer.mode).toBe("idle");
 w.issue({type:"repair",ids:[engineer.id],targetId:foundation.id});w.tick(SIM_STEP);
 expect(engineer.mode).toBe("build");expect(engineer.target).toBe(foundation);
 for(let i=0;i<40;i++)w.tick(SIM_STEP);
 expect(foundation.underConstruction).toBe(false);expect(engineer.target).toBeNull();
});
it("unfinished foundations count toward building limits and failed purchases report a reason",()=>{
 const w=new World(74,false,[],[],[],false);w.networkMode=true;const base=w.bases[0];
 w.spawn("hq",0,base.x,base.z);w.spawn("generator",0,base.x+20,base.z);w.spawn("landCommand",0,base.x-20,base.z);
 const engineer=w.spawn("engineer",0,base.x,base.z+15);
 for(const offset of [-30,30]){const f=w.spawn("factory",0,base.x+offset,base.z+30);f.underConstruction=true;}
 expect(w.canBuildKind(0,"factory")).toBe(false);
 w.teamCredits[0]=w.credits=0;w.teamResources[0]=w.resources=0;
 w.issue({type:"build",ids:[engineer.id],kind:"supply",x:base.x,z:base.z-30});w.tick(SIM_STEP);
 expect(w.events.some(e=>e.type==="order-rejected"&&e.message.includes("raha"))).toBe(true);
});

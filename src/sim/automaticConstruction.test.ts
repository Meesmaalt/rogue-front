import {afterEach,expect,it} from 'vitest';
import type {MapFeatureDef} from './mapFeatures';
import {World} from './World';
import {setBases,resetHeightmap,setMapSize} from './heightmap';
import {applyCommands} from './systems/commands';
import {updateConstruction} from './systems/construction';
import {updateUnits} from './systems/units';
import {dispatchConstruction} from './automaticConstruction';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
function setup(features:MapFeatureDef[]=[]){const bases=[{x:-180,z:0,r:240},{x:250,z:250,r:120}];setBases(bases);const w=new World(102,false,[],features,bases,false);w.networkMode=true;w.spawn('hq',0,-180,0);w.teamCredits[0]=w.teamResources[0]=w.credits=w.resources=5000;w.nav.syncBuildings(w.entities);return w;}
function step(w:World){w.time+=1/30;w.nav.syncBuildings(w.entities);w.spatial.rebuild(w.entities);updateConstruction(w,1/30);updateUnits(w,1/30);}
it('HQ constructs queued buildings without selected engineers, keeps combat engineers separate and rejects manual helper orders',()=>{
 const w=setup(),combat=w.spawn('engineer',0,-160,22);w.pending.push({type:'build',ids:[],kind:'generator',x:-140,z:0,team:0});applyCommands(w);const b=w.entities.find(e=>e.kind==='generator')!;expect(b).toBeDefined();
 for(let i=0;i<3000&&b.underConstruction;i++)step(w);
 expect(b.underConstruction).toBe(false);expect(combat.engineerDuty).toBeUndefined();expect(combat.target).toBeNull();expect(combat.def.damage).toBeGreaterThan(0);
 const crew=w.entities.find(e=>e.constructionCrew)!;const mode=crew.mode;w.pending.push({type:'move',ids:[crew.id],x:150,z:150,team:0});applyCommands(w);expect(crew.mode).toBe(mode);expect(crew.dest?.x).not.toBe(150);
 for(let i=0;i<1800&&crew.engineerDuty?.phase!=='rest';i++)step(w);expect(crew.engineerDuty?.phase).toBe('rest');expect(w.nav.isWalkableWorld(crew.x,crew.z,.35)).toBe(true);
});
it('nearest FOB dispatches its own limited crew and replacement waits after a loss',()=>{
 const w=setup(),fob=w.spawn('supply',0,120,0);fob.fobLevel=1;w.spawn('generator',0,-220,0);w.nav.syncBuildings(w.entities);dispatchConstruction(w);
 w.pending.push({type:'build',ids:[],kind:'landCommand',x:160,z:0,team:0});applyCommands(w);step(w);const b=w.entities.find(e=>e.kind==='landCommand')!,crew=w.byId.get(b.builderIds[0])!;expect(crew.constructionCrew?.homeId).toBe(fob.id);
 crew.dead=true;w.time+=2;dispatchConstruction(w);expect(w.entities.filter(e=>!e.dead&&e.constructionCrew?.homeId===fob.id)).toHaveLength(0);
 w.time+=50;dispatchConstruction(w);expect(w.entities.filter(e=>!e.dead&&e.constructionCrew?.homeId===fob.id)).toHaveLength(1);
});
it('remote work flies the actual crew out, finishes construction and returns it by Chinook; saves preserve the flight',()=>{
 const w=setup();w.pending.push({type:'build',ids:[],kind:'generator',x:220,z:-40,team:0});applyCommands(w);const b=w.entities.find(e=>e.kind==='generator')!;
 let boarded=false,unloaded=false,returned=false,saved=false;
 for(let i=0;i<18000;i++){
  step(w);const carrier=w.entities.find(e=>e.constructionFlight),crew=carrier&&w.byId.get(carrier.constructionFlight!.crewId);
  if(crew?.loadedIntoId!=null)boarded=true;if(boarded&&crew?.loadedIntoId==null&&carrier?.constructionFlight?.phase==='working')unloaded=true;
  if(!saved&&carrier?.constructionFlight?.phase==='outbound'&&crew?.loadedIntoId!=null){const state=saveWorld(w),copy=setup();loadWorld(copy,JSON.parse(JSON.stringify(state)));expect(worldHash(copy)).toBe(worldHash(w));saved=true;}
  if(unloaded&&!b.underConstruction&&carrier?.constructionFlight?.phase==='parked'&&crew?.loadedIntoId==null){returned=true;break;}
 }

 expect(boarded).toBe(true);expect(unloaded).toBe(true);expect(b.underConstruction).toBe(false);expect(returned).toBe(true);expect(saved).toBe(true);
});

it('an unreachable nearby site uses airlift even below the normal distance threshold',()=>{
 const w=setup([{id:'water-barrier',kind:'water',x:-40,z:0,width:35,depth:2000,surfaceHeight:0}]);
 w.pending.push({type:'build',ids:[],kind:'generator',x:70,z:0,team:0});applyCommands(w);const b=w.entities.find(e=>e.kind==='generator')!;
 for(let i=0;i<12000&&b.underConstruction;i++)step(w);
 expect(w.entities.some(e=>!!e.constructionFlight)).toBe(true);expect(b.underConstruction).toBe(false);
});

import {createSkirmish} from './scenario';
it('real metric HQ, base walls and parked van start the first blue construction bar',()=>{
 setMapSize(4096);const bases=[{x:-700,z:700,r:180},{x:700,z:-700,r:180}];setBases(bases);const w=new World(103,false,[],[],bases,true,true);w.networkMode=true;w.externalVictoryMode=true;createSkirmish(w);
 expect(w.entities.filter(e=>e.team===0&&e.constructionCrew)).toHaveLength(1);
 w.issue({type:'build',ids:[],kind:'generator',x:-655,z:725,team:0});let b:ReturnType<World['spawn']>|undefined;
 for(let i=0;i<2700;i++){w.tick(1/30);b=w.entities.find(e=>e.team===0&&e.kind==='generator');if(b&&!b.underConstruction)break;}
 expect(b).toBeDefined();expect(b?.constructionProgress).toBeGreaterThan(0);expect(b?.underConstruction).toBe(false);
});

it('each HQ level owns exactly one extra crew and a persistent parked van',()=>{
 const w=setup(),hq=w.entities.find(e=>e.kind==='hq')!;
 for(const level of [1,2,3]){hq.buildingLevel=level;w.time+=2;dispatchConstruction(w);const crews=w.entities.filter(e=>!e.dead&&e.constructionCrew?.homeId===hq.id);expect(crews).toHaveLength(level);for(const e of crews)expect(e.engineerDuty?.vanPoint).toBeDefined();}
});

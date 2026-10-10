import {it,expect,afterEach} from "vitest";
import {World} from "./World";
import {createSkirmish} from "./scenario";
import {SIM_STEP} from "./constants";
it("AI completes the real base/economy/production chain without injected money",()=>{
 const w=new World(17);createSkirmish(w);w.ai.setProfile("economic","normal");
 for(let i=0;i<360/SIM_STEP&&w.status==="running";i++){w.tick(SIM_STEP);w.drainEvents();}

 expect(w.resourcePoints.some(r=>r.controlledBy===1&&r.active)).toBe(true);
 expect(w.hasBuilding(1,"factory")).toBe(true);
 expect(w.roadCargoDelivered[1]).toBeGreaterThan(0);
 expect(w.producedCounts.tank || w.entities.some(e=>e.team===1&&e.kind==="tank")).toBe(true);
},30000);

import {setBases,resetHeightmap,setMapSize,setProceduralSeed,setTerrainProfile,ensureHeightCache} from './heightmap';
import {applyCommands} from './systems/commands';
import mapData from '../data/maps/green-valley.json';
import type {Command,MissionDef} from './types';
import {AI_RULES} from './ai/knowledge';
afterEach(resetHeightmap);
function recoveryWorld(){
 const bases=[{x:-180,z:-180,r:30},{x:0,z:0,r:150}];setBases(bases);
 const w=new World(37,false,[{x:0,z:60,radius:15,amount:200,active:true,controlledBy:1}],[],bases,false);w.networkMode=true;
 w.spawn('hq',1,-50,0);w.spawn('generator',1,-50,20);w.spawn('supply',1,-30,0);w.spawn('landCommand',1,-50,-20);w.spawn('landStrategy',1,-75,-20);
 const barracks=w.spawn('barracks',1,-10,0),factory=w.spawn('factory',1,25,0);barracks.buildingLevel=factory.buildingLevel=3;
 for(let i=0;i<2;i++)w.spawn('tank',1,-20+i*30,40);
 w.ai.phase='pressure';w.ai.buildTimer=w.ai.attackTimer=w.ai.scoutTimer=w.ai.counterAttackTimer=w.ai.expansionTimer=w.ai.defendTimer=w.ai.doctrineTimer=w.ai.airTimer=999;
 return {w,barracks,factory};
}
it('operational AI replaces a lost engineer in pressure even when only emergency purchase money remains',()=>{
 const {w,barracks}=recoveryWorld(),engineer=w.spawn('engineer',1,0,60);engineer.aiIntent='recon';
 w.ai.buildTimer=0;const cost=w.unitDefinition('engineer',1).cost;w.teamCredits[1]=w.teamResources[1]=cost;
 const commands:Command[]=[],issue=w.issue.bind(w);w.issue=c=>{commands.push(c);issue(c);};w.ai.update(w,SIM_STEP);applyCommands(w);
 expect(engineer.aiIntent).toBeNull();expect(barracks.productionQueue).toEqual(['engineer']);expect(w.teamCredits[1]).toBe(0);
 expect(commands.filter(c=>c.type==='produce')).toHaveLength(1);
});
it('AI shares pending purchase budget and queue limits across its production decisions',()=>{
 const {w,barracks,factory}=recoveryWorld();w.spawn('engineer',1,-40,10);w.spawn('engineer',1,-60,10);factory.buildingLevel=2;w.ai.expansionTimer=0;
 w.teamCredits[1]=w.teamResources[1]=900;const commands:Command[]=[],issue=w.issue.bind(w);w.issue=c=>{commands.push(c);issue(c);};w.ai.update(w,SIM_STEP);applyCommands(w);
 const forward=commands.find(c=>c.type==='build'&&c.kind==='supply');expect(forward).toBeDefined();
 if(forward?.type==='build'){expect(w.hasCommandLinkToPoint(1,forward)).toBe(true);expect(w.entities.some(e=>e.team===1&&e.kind==='supply'&&!e.underConstruction&&w.logisticsConnectionOpen(e,{...e,x:forward.x,z:forward.z}))).toBe(true);}
 expect(commands.some(c=>c.type==='upgrade')).toBe(false);expect(commands.some(c=>c.type==='produce')).toBe(true);expect(barracks.productionQueue.length).toBeLessThanOrEqual(AI_RULES.productionQueueTarget);expect(factory.productionQueue.length).toBeLessThanOrEqual(AI_RULES.productionQueueTarget);
 expect(w.teamCredits[1]).toBeGreaterThanOrEqual(AI_RULES.economyReserve);expect(w.teamResources[1]).toBe(w.teamCredits[1]);
});

it('AI promotes a connected forward depot to a paid FOB before extending the network',()=>{
 const {w}=recoveryWorld();const forward=w.spawn('supply',1,30,30);w.ai.expansionTimer=0;
 w.teamResources[1]=w.teamCredits[1]=600;const cost=w.fobUpgradeCost(0);w.ai.update(w,SIM_STEP);applyCommands(w);
 expect(forward.fobLevel).toBe(1);expect(w.teamCredits[1]).toBeLessThanOrEqual(600-cost);expect(w.hasCommandLinkToPoint(1,{x:forward.x+80,z:forward.z})).toBe(true);
});

it('AI replaces the missing local production warehouse even when a forward depot survives',()=>{
 const {w}=recoveryWorld();for(const e of w.entities)if(e.kind==='supply')e.dead=true;
 const forward=w.spawn('supply',1,110,20);w.spawn('engineer',1,-30,5);w.spawn('engineer',1,-60,5);
 w.teamCredits[1]=w.teamResources[1]=700;w.ai.buildTimer=0;
 const out:Command[]=[],issue=w.issue.bind(w);w.issue=c=>{out.push(c);issue(c);};w.ai.update(w,SIM_STEP);applyCommands(w);
 const build=out.find(c=>c.type==='build'&&c.kind==='supply');expect(build).toBeDefined();
 expect(w.entities.some(e=>e.kind==='supply'&&e!==forward&&!e.dead&&e.underConstruction)).toBe(true);
 expect(w.teamCredits[1]).toBeLessThan(700);
});
it('AI activates captured industry beyond its active home site without restarting the engineer march',()=>{
 const {w}=recoveryWorld();w.spawn('engineer',1,-30,5);const worker=w.spawn('engineer',1,-60,5);
 w.resourcePoints.push({x:90,z:50,radius:15,amount:200,active:false,controlledBy:1});w.ai.buildTimer=0;
 const out:Command[]=[],issue=w.issue.bind(w);w.issue=c=>{out.push(c);issue(c);};w.ai.update(w,SIM_STEP);applyCommands(w);
 expect(worker.aiIntent).toBe('recon');expect(worker.dest).toMatchObject({x:90,z:50});out.length=0;w.ai.buildTimer=0;w.ai.update(w,SIM_STEP);
 expect(out.some(c=>c.type==='move'&&c.ids.includes(worker.id))).toBe(false);
});


it('Roheorg economy and offensive production recover from a lost trunk depot and trucks over 15 simulation minutes',()=>{
 const m=mapData as unknown as MissionDef;
 setMapSize(m.map.size??640);setBases(m.map.bases);setProceduralSeed(m.seed);setTerrainProfile(m.map.terrainProfile);ensureHeightCache();
 const w=new World(m.seed,false,m.map.resources,m.map.features??[],m.map.bases,m.map.baseDefenses??true);createSkirmish(w,true);w.ai.setProfile('economic','normal');
 let lostDepot=0,deliveredAtLoss=0,postLossUnits=0,resumedProduction=false,lateProduction=false;const produced=new Set<number>();
 const factory=w.entities.find(e=>e.team===1&&e.kind==='factory')!;
 for(let i=0;i<900/SIM_STEP&&w.status==='running';i++){
  if(!lostDepot&&w.time>=240){
   const d=w.primarySupplyDepot(1)!;lostDepot=d.id;deliveredAtLoss=w.roadCargoDelivered[1];d.dead=true;
   for(const t of w.entities)if(t.team===1&&t.kind==='logiTruck')t.dead=true;
   expect(w.productionOperational(w.entities.find(e=>e.team===1&&e.kind==='factory')!,'tank').operational).toBe(false);
  }
  const progress=factory.productionProgress;w.tick(SIM_STEP);w.drainEvents();
  if(lostDepot&&factory.productionProgress>progress){resumedProduction=true;if(w.time>780)lateProduction=true;}
  for(const e of w.entities)if(e.team===1&&e.def.speed>0&&!['engineer','transport','logiTruck','cargoPlane'].includes(e.kind)&&!produced.has(e.id)){produced.add(e.id);if(lostDepot)postLossUnits++;}
 }

 console.log('V3 Roheorg',JSON.stringify({seconds:Math.round(w.time),deliveredAfterLoss:Math.round(w.roadCargoDelivered[1]-deliveredAtLoss),newCombatUnitsAfterLoss:postLossUnits,lateProduction,phase:w.ai.phase,controlled:w.resourcePoints.filter(r=>r.controlledBy===1).length,productionAtEnd:w.productionOperational(factory,'tank').reason}));
 expect(w.time).toBeGreaterThan(899);expect(lostDepot).toBeGreaterThan(0);
 expect(w.roadCargoDelivered[1]).toBeGreaterThan(deliveredAtLoss+1000);
 expect(w.entities.some(e=>e.kind==='supply'&&e.team===1&&e.id!==lostDepot&&!e.underConstruction&&Math.hypot(e.x-factory.x,e.z-factory.z)<=80)).toBe(true);
 expect(resumedProduction).toBe(true);expect(lateProduction).toBe(true);expect(postLossUnits).toBeGreaterThan(15);
 expect(w.resourcePoints.filter(r=>r.controlledBy===1).length).toBeGreaterThanOrEqual(3);
 expect(['pressure','decisive']).toContain(w.ai.phase);
},180000);

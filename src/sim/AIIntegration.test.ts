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

import {setBases,resetHeightmap} from './heightmap';
import {applyCommands} from './systems/commands';
import type {Command} from './types';
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

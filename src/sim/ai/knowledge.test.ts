import {it,expect,afterEach} from 'vitest';
import {World} from '../World';
import {setBases,resetHeightmap} from '../heightmap';
import {knownContacts,needsRecovery,ammunitionFraction,issueGroundObjective} from './knowledge';
import {updateTacticalAI} from './TacticalAI';
import {applyCommands} from '../systems/commands';
import {MatchModeController} from '../gameModes';
import {saveWorld,loadWorld} from '../SaveState';
import {worldHash} from '../Replay';
import type {Command} from '../types';
const bases=[{x:-120,z:-120,r:40},{x:120,z:120,r:40}];
function fixture(){setBases(bases);const w=new World(19,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-120,-120);w.spawn('hq',1,120,120);return w;}
function orders(w:World){const result:Command[]=[],issue=w.issue.bind(w);w.issue=c=>{result.push(c);issue(c);};return result;}
afterEach(resetHeightmap);
it('unseen live movements never update remembered contacts or wave attack coordinates; attack leaves reserves',()=>{
 const w=fixture(),target=w.spawn('supply',0,30,0);w.time=30;w.intel[1].set(target.id,{entityId:target.id,team:0,kind:'supply',x:0,z:0,lastSeen:25,shared:true});target.x=-80;target.z=100;
 expect(knownContacts(w,1).find(c=>c.entityId===target.id)).toMatchObject({x:0,z:0});
 for(let i=0;i<10;i++)w.spawn('tank',1,120+i*5,130);
 const out=orders(w);w.ai.phase='pressure';w.ai.attackTimer=0;w.ai.buildTimer=w.ai.scoutTimer=w.ai.counterAttackTimer=w.ai.expansionTimer=w.ai.defendTimer=w.ai.doctrineTimer=w.ai.airTimer=100;w.ai.update(w,1/30);
 const attacks=out.filter((c):c is Extract<Command,{type:'amove'}>=>c.type==='amove');expect(attacks).toHaveLength(8);expect(attacks.every(c=>Math.abs(c.x)<9&&Math.abs(c.z)<9)).toBe(true);expect(w.entities.filter(e=>e.team===1&&e.kind==='tank'&&e.aiIntent!=='attack')).toHaveLength(2);
 target.spottedUntil[1]=100;expect(knownContacts(w,1).find(c=>c.entityId===target.id)).toMatchObject({x:-80,z:100});target.spottedUntil[1]=0;w.time=80;expect(knownContacts(w,1)).toHaveLength(0);
});
it('loaded units do not receive orders; secondary ammunition prevents false retreat and recovery picks a stocked depot',()=>{
 const w=fixture(),ifv=w.spawn('ifv',1,0,0);ifv.ammo=0;ifv.secondaryAmmo=(ifv.def.weapons??[]).map(s=>s.ammoCapacity);expect(ammunitionFraction(ifv)).toBeGreaterThan(.18);expect(needsRecovery(ifv)).toBe(false);
 const loaded=w.spawn('inf',1,5,0);loaded.loadedIntoId=999;loaded.ammo=0;const tank=w.spawn('tank',1,-10,-10);tank.ammo=0;if(tank.secondaryAmmo)tank.secondaryAmmo.fill(0);
 const empty=w.spawn('supply',1,0,25),full=w.spawn('supply',1,80,0);empty.ammoStock=empty.fuelStock=empty.repairStock=0;
 const out=orders(w);updateTacticalAI(w,1,1/30);expect(ifv.aiIntent).not.toBe('resupply');expect(tank.aiIntent).toBe('resupply');const move=out.find((c):c is Extract<Command,{type:'move'}>=>c.type==='move'&&c.ids.includes(tank.id));expect(move).toBeDefined();expect(Math.hypot(move!.x-full.x,move!.z-full.z)).toBeLessThan(25);expect(out.some(c=>'ids'in c&&c.ids.includes(loaded.id))).toBe(false);
 applyCommands(w);tank.ammo=tank.maxAmmo;if(tank.secondaryAmmo)tank.secondaryAmmo=(tank.def.weapons??[]).map(s=>s.ammoCapacity);tank.supply=100;tank.fuel=tank.maxFuel;tank.aiDecisionAt=0;updateTacticalAI(w,1,1/30);expect(tank.aiIntent).toBeNull();const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it('operational decisions ignore hidden army strength and reinforce an observed base threat from available reserves',()=>{
 const w=fixture();w.networkMode=false;w.time=10;for(let i=0;i<8;i++)w.spawn('tank',1,120+i*3,140);
 const enemy=w.spawn('tank',0,115,120);for(let i=0;i<15;i++)w.spawn('tank',0,120+i,120);
 const out=orders(w);w.operationalCommander.tick(1/30);expect(w.operationalCommander.plans[1].objective).not.toBe('defend');out.length=0;
 enemy.spottedUntil[1]=100;w.time=20;w.operationalCommander.tick(1/30);expect(w.operationalCommander.plans[1].objective).toBe('defend');expect(out.some(c=>c.type==='amove')).toBe(true);
});
it('AI purchases use the actual faction production chain and Conquest/HQ endings produce explicit results',()=>{
 const w=fixture();w.spawn('generator',1,110,100);w.spawn('supply',1,120,100);w.spawn('landCommand',1,100,120);const factory=w.spawn('factory',1,150,100);w.spawn('barracks',1,100,140);w.teamCredits[1]=w.teamResources[1]=2000;
 w.ai.buildTimer=w.ai.scoutTimer=w.ai.counterAttackTimer=w.ai.expansionTimer=w.ai.defendTimer=w.ai.doctrineTimer=w.ai.airTimer=w.ai.attackTimer=100;w.ai.phase='probe';w.ai.update(w,1/30);applyCommands(w);expect(factory.productionQueue).toContain('tank');const funds=w.teamCredits[1];expect(funds).toBeLessThan(2000);
 for(let i=0;i<1200&&!w.entities.some(e=>e.team===1&&e.kind==='tank');i++)w.tick(1/30);expect(w.entities.some(e=>e.team===1&&e.kind==='tank')).toBe(true);
 const match=new MatchModeController(w,'conquest');w.areaControl=[1,0];match.restore({score:[999.9,0],hold:[0,0],losses:[0,0]});for(let i=0;i<5;i++)match.tick(1/30);expect(w.status).toBe('won');
 const other=fixture();other.hq[0]!.dead=true;new MatchModeController(other,'skirmish').tick(1/30);expect(other.status).toBe('lost');
});

it('repeated doctrine orders preserve the march and firing solution; base defense can interrupt it',()=>{
 const w=fixture(),u=w.spawn('tank',1,95,100),enemy=w.spawn('tank',0,15,15);const out=orders(w);
 expect(issueGroundObjective(w,u,{x:0,z:0},'attack')).toBe(true);
 expect(issueGroundObjective(w,u,{x:10,z:5},'attack')).toBe(false);expect(out).toHaveLength(1);
 applyCommands(w);const path=u.navPath;u.stuckTime=2;u.target=enemy;enemy.spottedUntil[1]=100;
 expect(issueGroundObjective(w,u,{x:5,z:5},'attack')).toBe(false);
 expect(issueGroundObjective(w,u,{x:-80,z:-80},'attack')).toBe(false);
 expect(u.navPath).toBe(path);expect(u.stuckTime).toBe(2);
 expect(issueGroundObjective(w,u,{x:110,z:100},'defend')).toBe(true);
 applyCommands(w);expect(u.aiIntent).toBe('defend');expect(u.dest).toMatchObject({x:110,z:100});
});

it('Conquest advances past captured resources, deploys inside capture range and reinforces beyond the first four IDs',()=>{
 setBases(bases);const w=new World(23,false,[{x:70,z:70,radius:8,amount:200,active:true,controlledBy:1},{x:0,z:0,radius:8,amount:200,active:false,controlledBy:null}],[],bases,false);
 w.matchController=new MatchModeController(w,'conquest');w.networkMode=false;w.time=10;
 for(let i=0;i<10;i++)w.spawn('tank',1,120+i*4,140);
 const out=orders(w);w.operationalCommander.tick(1/30);
 expect(w.operationalCommander.plans[1].sectorId).toBe('resource-1');
 const first=out.filter((c):c is Extract<Command,{type:'amove'}>=>c.type==='amove');expect(first).toHaveLength(4);
 expect(first.every(c=>Math.hypot(c.x,c.z)<8)).toBe(true);applyCommands(w);out.length=0;
 w.time=18;w.operationalCommander.tick(1/30);
 const second=out.filter((c):c is Extract<Command,{type:'amove'}>=>c.type==='amove');
 expect(second).toHaveLength(4);expect(second.every(c=>!first.some(f=>f.ids[0]===c.ids[0]))).toBe(true);
 applyCommands(w);w.resourcePoints[1].controlledBy=1;expect(w.operationalMap.nearestObjective(1)).toBeNull();
 w.resourcePoints[0].controlledBy=0;w.time=26;out.length=0;w.operationalCommander.tick(1/30);
 expect(w.operationalCommander.plans[1].sectorId).toBe('resource-0');expect(out.some(c=>c.type==='amove'&&Math.hypot(c.x-70,c.z-70)<8)).toBe(true);
});

it('wave attacks follow Conquest sectors and pause during operational recovery',()=>{
 setBases(bases);const w=new World(29,false,[{x:35,z:35,radius:10,amount:200,active:false,controlledBy:null}],[],bases,false);w.spawn('hq',1,120,120);
 w.matchController=new MatchModeController(w,'conquest');w.networkMode=true;
 for(let i=0;i<10;i++)w.spawn('tank',1,120+i*5,130);
 w.ai.phase='pressure';w.ai.attackTimer=0;w.ai.buildTimer=w.ai.scoutTimer=w.ai.counterAttackTimer=w.ai.expansionTimer=w.ai.defendTimer=w.ai.doctrineTimer=w.ai.airTimer=100;
 const out=orders(w);w.ai.update(w,1/30);const attacks=out.filter((c):c is Extract<Command,{type:'amove'}>=>c.type==='amove');expect(attacks).toHaveLength(8);expect(attacks.every(c=>Math.hypot(c.x-35,c.z-35)<10)).toBe(true);
 applyCommands(w);out.length=0;w.operationalCommander.plans[1].objective='withdraw';w.ai.attackTimer=0;w.ai.update(w,1/30);expect(out.some(c=>c.type==='amove')).toBe(false);
 w.operationalCommander.plans[1].objective='secure';w.ai.attackTimer=0;w.ai.update(w,1/30);expect(out.some(c=>c.type==='amove')).toBe(false);
 // A recovered replacement joins the existing objective without resetting the others.
 const returned=w.entities.find(e=>e.kind==='tank'&&e.aiIntent==='attack')!;returned.mode='hold';returned.dest=null;returned.aiIntent=null;w.ai.attackTimer=0;w.ai.update(w,1/30);
 expect(out.some(c=>c.type==='amove'&&c.ids.includes(returned.id))).toBe(true);
});

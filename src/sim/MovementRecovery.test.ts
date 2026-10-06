import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setMapSize,setBases,resetHeightmap} from './heightmap';
import {NavGrid} from './nav/NavGrid';
import {SIM_STEP} from './constants';
import {updateTacticalAI} from './ai/TacticalAI';
import {applyCommands} from './systems/commands';
import {needsRecovery,recoveryComplete} from './ai/knowledge';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import type {Command} from './types';
afterEach(resetHeightmap);
function world(){setMapSize(256);const bases=[{x:-90,z:90,r:25},{x:90,z:-90,r:25}];setBases(bases);const w=new World(209,false,[],[],bases,false);w.networkMode=true;return w;}
function corridor(n:NavGrid){n.blocked.fill(1);for(let z=0;z<n.height;z++)for(let x=0;x<n.width;x++){const p=n.cellToWorld(x,z);if(Math.abs(p.x)<6&&Math.abs(p.z)<110)n.blocked[n.index(x,z)]=0;}}
it('uses the actual circular footprint at a 12m crossing without accepting bank overlap',()=>{
 setMapSize(256);const n=new NavGrid([],[],false);corridor(n);expect(n.isWalkableWorld(3.5,0,2.322)).toBe(true);expect(n.isWalkableWorld(4,0,2.322)).toBe(false);expect(n.isWalkableWorld(128,0)).toBe(false);
});
it('opposing allied tanks pass through a narrow crossing without oscillating or leaving the navigation mask',()=>{
 const w=world();corridor(w.nav);const a=w.spawn('tank',0,0,-38),b=w.spawn('tank',0,0,38);a.heading=0;b.heading=Math.PI;
 w.issue({type:'move',ids:[a.id],x:0,z:65,team:0});w.issue({type:'move',ids:[b.id],x:0,z:-65,team:0});
 let passed=false;
 for(let i=0;i<1800;i++){w.tick(SIM_STEP);for(const e of [a,b])expect(w.nav.isWalkableWorld(e.x,e.z,e.def.radius)).toBe(true);if(a.z>b.z)passed=true;if(a.mode==='idle'&&b.mode==='idle')break;}
 expect(passed).toBe(true);expect(a.z).toBeGreaterThan(60);expect(b.z).toBeLessThan(-60);
 const copy=world();corridor(copy.nav);loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it('AI reserves an engineer for one casualty and physical repair consumes isolated depot stock',()=>{
 const w=world();w.spawn('hq',1,90,-90);const depot=w.spawn('supply',1,-30,30),a=w.spawn('tank',1,-10,30),b=w.spawn('tank',1,-10,45),engineer=w.spawn('engineer',1,-15,30);
 depot.ammoStock=depot.fuelStock=0;depot.repairStock=180;a.hp*=.3;b.hp*=.3;a.components!.engine=70;b.components!.tracks=70;
 const issued:Command[]=[],original=w.issue.bind(w);w.issue=c=>{issued.push(c);original(c);};expect(needsRecovery(a)).toBe(true);updateTacticalAI(w,1,SIM_STEP);applyCommands(w);
 expect(issued.filter(c=>c.type==='repair')).toHaveLength(1);expect(engineer.target).toBe(a);const stock=depot.repairStock,hp=a.hp;
 for(let i=0;i<30;i++)w.tick(SIM_STEP);expect(a.hp).toBeGreaterThan(hp);expect(depot.repairStock).toBeLessThan(stock);expect(a.components!.engine).toBeLessThan(70);
 issued.length=0;a.aiDecisionAt=b.aiDecisionAt=0;updateTacticalAI(w,1,SIM_STEP);expect(issued.filter(c=>c.type==='repair')).toHaveLength(0);expect(engineer.target).toBe(a);
 depot.repairStock=0;const stoppedHp=a.hp;for(let i=0;i<30;i++)w.tick(SIM_STEP);expect(a.hp).toBe(stoppedHp);
});
it('component damage prevents premature readiness and finishing recovery releases the repair crew',()=>{
 const w=world();const tank=w.spawn('tank',1,0,0),engineer=w.spawn('engineer',1,5,0);tank.components!.engine=75;expect(needsRecovery(tank)).toBe(true);expect(recoveryComplete(tank)).toBe(false);
 tank.components!.engine=0;tank.aiIntent='resupply';engineer.mode='repair';engineer.target=tank;engineer.dest={x:0,z:0};updateTacticalAI(w,1,SIM_STEP);applyCommands(w);
 expect(tank.aiIntent).toBeNull();expect(engineer.mode).toBe('idle');expect(engineer.target).toBeNull();
});

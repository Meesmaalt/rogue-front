import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setMapSize,setBases,resetHeightmap} from './heightmap';
import {NavGrid} from './nav/NavGrid';
import {findPath} from './nav/Pathfinder';
import {SIM_STEP} from './constants';
import {updateTacticalAI} from './ai/TacticalAI';
import {applyCommands} from './systems/commands';
import {needsRecovery,recoveryComplete} from './ai/knowledge';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {updateUnits,combatStatus} from './systems/units';
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

it('a lost route brakes in place instead of sidestepping forever, then resumes when the crossing opens',()=>{
 const w=world(),u=w.spawn('tank',0,0,-55);u.heading=0;u.standingOrder='holdfire';
 w.issue({type:'move',ids:[u.id],x:0,z:70});applyCommands(w);
 // The accepted route becomes unavailable (a bridge/obstacle change).
 corridor(w.nav);for(let z=0;z<w.nav.height;z++)for(let x=0;x<w.nav.width;x++){const p=w.nav.cellToWorld(x,z);if(Math.abs(p.z)<8)w.nav.blocked[w.nav.index(x,z)]=1;}
 u.navPath=[];u.roadPathGoal=undefined;u.motionSpeed=4;const start={x:u.x,z:u.z};
 for(let i=0;i<90;i++){w.time+=SIM_STEP;w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);}
 expect(u.x).toBe(start.x);expect(u.z).toBe(start.z);expect(u.motionSpeed).toBe(0);expect(u.dest).not.toBeNull();expect(combatStatus(w,u)).toContain('Marsruut katkenud');
 corridor(w.nav);for(let i=0;i<900&&u.dest;i++){w.time+=SIM_STEP;w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);}
 expect(u.mode).toBe('idle');expect(u.z).toBeGreaterThan(68);
});
it('final facing waits for braking and a zero-distance intermediate goal never produces NaN',()=>{
 const w=world(),u=w.spawn('tank',0,0,0);u.mode='idle';u.heading=0;u.motionSpeed=4;u.moveFacing=Math.PI/2;u.standingOrder='holdfire';
 w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);expect(u.heading).toBe(0);expect(u.z).toBeGreaterThan(0);
 for(let i=0;i<150;i++){w.time+=SIM_STEP;w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);}
 expect(u.motionSpeed).toBe(0);expect(u.heading).toBeCloseTo(Math.PI/2);
 corridor(w.nav);const front=w.spawn('tank',0,0,-20),back=w.spawn('tank',0,0,-26),ids=[front.id,back.id];
 for(const member of [front,back]){member.mode='move';member.dest={x:0,z:70};member.moveGroup=ids;member.moveAxis={x:0,z:1};member.moveFacing=Math.PI/2;member.heading=0;member.standingOrder='holdfire';}
 w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);expect(back.navWaiting).toBe(true);expect(back.heading).toBe(0);
 u.mode='patrol';u.dest={x:u.x,z:u.z};u.patrolPoints=[];u.navPath=[{...u.dest}];u.roadPathGoal={...u.dest};u.roadPathRetryAt=10;
 updateUnits(w,SIM_STEP);expect([u.x,u.z,u.heading,u.motionSpeed].every(Number.isFinite)).toBe(true);
});
it('a twelve-vehicle group crosses a bridge and reforms at separated destinations with its final facing',()=>{
 const w=world();for(let z=0;z<w.nav.height;z++)for(let x=0;x<w.nav.width;x++){const p=w.nav.cellToWorld(x,z);w.nav.blocked[w.nav.index(x,z)]=Math.abs(p.z)<18&&Math.abs(p.x)>=6?1:0;}
 const units=Array.from({length:12},(_,i)=>{const u=w.spawn('tank',0,(i%3-1)*10,-80+Math.floor(i/3)*10);u.standingOrder='holdfire';return u;});
 w.issue({type:'move',ids:units.map(u=>u.id),x:0,z:65,facing:Math.PI/2});applyCommands(w);const goals=units.map(u=>({...u.dest!}));
 for(let i=0;i<1800&&units.some(u=>u.dest);i++){w.time+=SIM_STEP;w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);}
 for(let i=0;i<120;i++){w.time+=SIM_STEP;w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);}
 for(let i=0;i<units.length;i++){const u=units[i];expect(u.mode).toBe('idle');expect(Math.hypot(u.x-goals[i].x,u.z-goals[i].z)).toBeLessThan(2);expect(u.heading).toBeCloseTo(Math.PI/2);expect(w.nav.isWalkableWorld(u.x,u.z,u.def.radius)).toBe(true);}
 const copy=world();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});

it('a free exact destination is reachable even when its snapped cell overlaps a parked vehicle',()=>{
 const w=world(),u=w.spawn('tank',0,-30,0),parked=w.spawn('tank',0,4.4,1),goal={x:0,z:0};
 const path=findPath(w.nav,u,goal,u.def.radius,undefined,[{x:parked.x,z:parked.z,radius:parked.def.radius}]);
 expect(path.length).toBeGreaterThan(0);expect(Math.hypot(path.at(-1)!.x-goal.x,path.at(-1)!.z-goal.z)).toBeLessThan(4);
});

it('close queued waypoints invalidate the old retry timer and immediately plan their own route',()=>{
 const w=world(),u=w.spawn('tank',0,0,0);u.standingOrder='holdfire';u.mode='move';u.dest={x:0,z:0};u.moveQueue=[{x:0,z:3}];u.moveQueueStyles=['move'];u.navPath=[{x:0,z:0}];u.roadPathGoal={x:0,z:0};u.roadPathRetryAt=100;
 w.spatial.rebuild(w.entities);updateUnits(w,SIM_STEP);expect(u.dest).toEqual({x:0,z:3});expect(u.roadPathRetryAt).toBeUndefined();
 w.time+=SIM_STEP;updateUnits(w,SIM_STEP);expect(u.navPath.length).toBeGreaterThan(0);expect(u.navWaiting).toBe(false);expect(u.roadPathGoal).toEqual({x:0,z:3});
});

import {afterEach,expect,it} from 'vitest';
import {groundForces,groundSpeedStep,cornerApproachSpeed,coordinatedBank,groundDynamics} from './groundDynamics';
import {World} from './World';
import {setMapSize,setBases,resetHeightmap} from './heightmap';
import {worldHash} from './Replay';
import {saveWorld,loadWorld} from './SaveState';
import physics from '../data/physics.json';
import mobility from '../data/mobility.json';
afterEach(resetHeightmap);
const profile={acceleration:3,braking:5,lateral:3};
it('gravity reduces uphill acceleration and downhill braking rather than simply scaling top speed',()=>{
 const flat=groundForces(profile,0,.65,.02),up=groundForces(profile,.12,.65,.02),down=groundForces(profile,-.12,.65,.02);
 expect(up.acceleration).toBeLessThan(flat.acceleration);expect(down.acceleration).toBeGreaterThan(flat.acceleration);
 expect(up.braking).toBeGreaterThan(flat.braking);expect(down.braking).toBeLessThan(flat.braking);
 expect(groundForces(profile,0,.65,.02,.5).acceleration).toBeLessThan(flat.acceleration);
 expect(groundForces(profile,0,.65,.02,1,1.5).acceleration).toBeLessThan(flat.acceleration);
});
it('loose surfaces reduce available lateral grip and braking',()=>{
 const road=groundForces(profile,0,.85,.02),woods=groundForces(profile,0,.45,.02);
 expect(woods.braking).toBeLessThan(road.braking);expect(woods.lateral).toBeLessThan(road.lateral);
});
it('distance integration gives v²/2a stopping distance, including a stop partway through a tick',()=>{
 let speed=10,distance=0;
 for(let i=0;i<61;i++){const next=groundSpeedStep(speed,0,{...profile,braking:5},1/30);speed=next.speed;distance+=next.distance;}
 expect(speed).toBe(0);expect(distance).toBeCloseTo(10,8);
 expect(groundSpeedStep(.1,0,{...profile,braking:5},1/30).distance).toBeCloseTo(.001,10);
});
it('constant-force acceleration and distance agree at different step sizes',()=>{
 const sample=(hz:number)=>{let speed=0,distance=0;for(let i=0;i<hz;i++){const next=groundSpeedStep(speed,100,profile,1/hz);speed=next.speed;distance+=next.distance;}return {speed,distance};};
 expect(sample(30).speed).toBeCloseTo(sample(120).speed,10);expect(sample(30).distance).toBeCloseTo(1.5,10);
});
it('curve approach starts braking early and loose grip requires a lower corner speed',()=>{
 expect(cornerApproachSpeed(0,10,3,5)).toBe(Infinity);
 const near=cornerApproachSpeed(Math.PI/2,1,3,5),far=cornerApproachSpeed(Math.PI/2,25,3,5);
 expect(near).toBeLessThan(far);expect(cornerApproachSpeed(Math.PI/2,1,1.5,5)).toBeLessThan(near);
});
it('coordinated aircraft bank matches centripetal acceleration and respects the bank limit',()=>{
 const bank=coordinatedBank(100,.05,.85);expect(Math.tan(-bank)*physics.gravity).toBeCloseTo(5,10);
 expect(coordinatedBank(100,-.05,.85)).toBeCloseTo(-bank,10);expect(coordinatedBank(180,1,.85)).toBe(-.85);expect(coordinatedBank(100,0,.85)).toBeCloseTo(0,10);
});
function fixture(){setMapSize(4096);const bases=[{x:0,z:0,r:500},{x:1600,z:1600,r:100}];setBases(bases);const w=new World(42,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;w.metricBattle=true;w.platformRosterOnly=true;return w;}
it('loaded metric logistics accelerates more slowly and engine damage reduces actual drive force',()=>{
 const w=fixture(),u=w.spawn('logiTruck',0,0,0);u.logisticsCargoCapacity=100;
 const empty=groundDynamics(w,u,0);u.cargo=100;const loaded=groundDynamics(w,u,0);expect(loaded.acceleration).toBeLessThan(empty.acceleration);
 u.components!.engine=80;expect(groundDynamics(w,u,0).acceleration).toBeLessThan(loaded.acceleration);
 const old=w.spawn('tank',0,10,0);old.def={...old.def,metricScale:false};expect(groundDynamics(w,old,0).acceleration).toBe(mobility.tracked.acceleration);
});
it('a moving metric vehicle retains its physical coast after stop and resumes identically from a save',()=>{
 const w=fixture(),u=w.spawn('tank',0,-100,0);u.heading=Math.PI/2;w.issue({type:'move',ids:[u.id],x:300,z:0});for(let i=0;i<150;i++)w.tick(1/30);
 const speed=u.motionSpeed!;expect(speed).toBeGreaterThan(5);w.issue({type:'stop',ids:[u.id]});const before=u.x;w.tick(1/30);expect(u.x).toBeGreaterThan(before);expect(u.motionSpeed).toBeLessThan(speed);
 const b=fixture();loadWorld(b,JSON.parse(JSON.stringify(saveWorld(w))));for(let i=0;i<150;i++){w.tick(1/30);b.tick(1/30);}expect(worldHash(b)).toBe(worldHash(w));expect(u.motionSpeed).toBe(0);
});

it('a moving tank brakes before shifting to reverse, keeping its armour toward the enemy',()=>{
 const w=fixture(),u=w.spawn('tank',0,-100,0),t=w.spawn('tank',1,-50,0);t.standingOrder='holdfire';t.holdPosition=true;t.spottedUntil[0]=100;
 u.heading=Math.PI/2;u.motionSpeed=8;w.issue({type:'attack',ids:[u.id],targetId:t.id});w.tick(1/30);
 expect(u.combatWithdrawing).toBe(true);expect(u.motionReverse??false).toBe(false);expect(u.heading).toBeCloseTo(Math.PI/2,10);expect(u.motionSpeed).toBeLessThan(8);
});

it('insufficient uphill engine force reduces momentum and ends in a held stop rather than infinite coasting',()=>{
 const forces=groundForces(profile,.6,.65,.02,.2);expect(forces.acceleration).toBeLessThan(0);
 const next=groundSpeedStep(5,12,forces,1/30);expect(next.speed).toBeLessThan(5);expect(next.speed).toBeGreaterThan(0);
 expect(groundSpeedStep(0,12,forces,1/30)).toEqual({speed:0,distance:0});
});

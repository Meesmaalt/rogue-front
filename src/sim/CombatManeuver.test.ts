import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setMapSize,setBases,resetHeightmap,heightAt} from './heightmap';
import {SIM_STEP} from './constants';
import {effectiveWeaponRange} from './systems/combat';
import {applyCommands} from './systems/commands';
import {airParkingPoint} from './systems/airDoctrine';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
function world(){setMapSize(512);const bases=[{x:0,z:-120,r:150},{x:200,z:200,r:40}];setBases(bases);const w=new World(211,false,[],[],bases,false);w.networkMode=true;return w;}
it('armour reverses out of point blank combat while keeping its turret toward the target',()=>{
 const w=world(),u=w.spawn('tank',0,-15,-120),t=w.spawn('tank',1,15,-120);t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;t.spottedUntil[0]=100;u.heading=Math.PI/2;
 w.issue({type:'attack',ids:[u.id],targetId:t.id});let fired=false,withdrew=false;
 for(let i=0;i<600;i++){w.tick(SIM_STEP);if(u.combatWithdrawing){withdrew=true;expect(Math.abs(Math.sin(u.heading))).toBeGreaterThan(.8);}if(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id))fired=true;}
 expect(withdrew).toBe(true);expect(fired).toBe(true);expect(Math.hypot(u.x-t.x,u.z-t.z)).toBeGreaterThan(effectiveWeaponRange(u,t)*.65);
});
it('an advancing IFV stops and settles before launching its anti tank missile',()=>{
 const w=world(),u=w.spawn('ifv',0,-130,-120),t=w.spawn('tank',1,40,-120);t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;t.spottedUntil[0]=100;u.heading=Math.PI/2;let moved=false,missile=false;
 w.issue({type:'attack',ids:[u.id],targetId:t.id});
 for(let i=0;i<1200;i++){w.tick(SIM_STEP);moved ||= (u.motionSpeed??0)>1;for(const event of w.events)if(event.type==='fire'&&event.sourceId===u.id&&event.weaponIndex===1){expect(u.motionSpeed??0).toBeLessThanOrEqual(.5);expect(w.time).toBeGreaterThanOrEqual(u.stationaryFireReadyAt??0);expect(Math.hypot(u.x-t.x,u.z-t.z)).toBeGreaterThan(40);missile=true;}if(missile)break;}
 expect(moved).toBe(true);expect(missile).toBe(true);
});
it('EVAC cancels pickup and queued combat while returning loaded passengers to the helipad',()=>{
 const w=world(),pad=w.spawn('helipad',0,-65,-160),u=w.spawn('transport',0,10,-100),passenger=w.spawn('inf',0,10,-100),waiting=w.spawn('inf',0,15,-100);
 u.airMissionHomeId=pad.id;u.airHomeSlot=0;u.airState='airborne';u.y=heightAt(u.x,u.z)+30;u.cargoUnitIds=[passenger.id];passenger.loadedIntoId=u.id;u.transportQueue=[waiting.id];u.transportTargetId=waiting.id;u.transportPickupPoint={x:15,z:-100};u.unloadPoint={x:120,z:-80};u.mode='transport-load';u.moveQueue=[{x:160,z:-120}];u.flightAttackExit={x:120,z:0};u.flightAttackExitUntil=8;
 w.issue({type:'air-return',ids:[u.id]});applyCommands(w);expect(u.transportQueue).toEqual([]);expect(u.transportTargetId).toBeNull();expect(u.unloadPoint).toBeNull();expect(u.flightAttackExit).toBeUndefined();expect(u.moveQueue).toEqual([]);
 const copy=world();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<1800&&!['rearming','grounded'].includes(u.airState??'');i++)w.tick(SIM_STEP);
 expect(['rearming','grounded']).toContain(u.airState);expect(Math.hypot(u.x-airParkingPoint(u,pad).x,u.z-airParkingPoint(u,pad).z)).toBeLessThan(2);expect(passenger.loadedIntoId).toBe(u.id);expect(u.cargoUnitIds).toEqual([passenger.id]);expect(u.dead).toBe(false);
});
it('a strike aircraft leaves its attack run after firing rather than continuously chasing the target centre',()=>{
 const w=world(),pad=w.spawn('airbase',0,-140,-190),u=w.spawn('attackAircraft',0,-80,-120),t=w.spawn('tank',1,30,-120);u.airMissionHomeId=pad.id;u.airState='airborne';u.airMission='ground';u.y=heightAt(u.x,u.z)+80;u.heading=Math.PI/2;u.motionSpeed=u.def.speed;t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;t.spottedUntil[0]=100;
 w.issue({type:'attack',ids:[u.id],targetId:t.id});let exited=false;
 for(let i=0;i<450;i++){w.tick(SIM_STEP);if(u.flightAttackExit){exited=true;expect(u.flightAttackExitUntil).toBeGreaterThan(w.time);const exit={...u.flightAttackExit};for(let j=0;j<10;j++)w.tick(SIM_STEP);expect(u.flightAttackExit).toEqual(exit);break;}}
 expect(exited).toBe(true);
});

it('helicopter stop carries momentum and converges to a stable hover destination',()=>{
 const w=world(),pad=w.spawn('helipad',0,-65,-160),u=w.spawn('heli',0,-50,-100);
 u.airMissionHomeId=pad.id;u.airState='airborne';u.y=heightAt(u.x,u.z)+30;u.heading=Math.PI/2;u.motionSpeed=12;u.standingOrder='holdfire';
 w.issue({type:'stop',ids:[u.id]});const start=u.x;w.tick(SIM_STEP);
 expect(u.x).toBeGreaterThan(start);expect(u.motionSpeed).toBeGreaterThan(11);expect(u.motionSpeed).toBeLessThan(12);
 for(let i=0;i<150;i++)w.tick(SIM_STEP);
 expect(u.motionSpeed).toBe(0);expect(u.x-start).toBeGreaterThan(10);expect(u.x-start).toBeLessThan(25);
 const goal={x:140,z:-100};w.issue({type:'move',ids:[u.id],...goal});
 let maximum=0;
 for(let i=0;i<900;i++){w.tick(SIM_STEP);maximum=Math.max(maximum,u.motionSpeed??0);if(!u.dest&&i>100)break;}
 expect(maximum).toBeGreaterThan(14);expect(u.dest).toBeNull();expect(Math.hypot(u.x-goal.x,u.z-goal.z)).toBeLessThan(2);
});

import {expect,it} from 'vitest';
import {helicopterYawRate,turnHelicopter} from './aircraftHandling';
import type {Entity} from './types';
it('movement and aim cannot spend the helicopter yaw budget twice in the same tick',()=>{
 const u={pHeading:0,heading:0,motionSpeed:0,def:{speed:50,turnRate:3}} as Entity,dt=1/30;
 u.heading=turnHelicopter(u,Math.PI/2,dt);u.heading=turnHelicopter(u,Math.PI/2,dt);
 expect(u.heading).toBeCloseTo(helicopterYawRate(u)*dt);expect(u.heading).toBeLessThan(.02);
 u.motionSpeed=50;expect(helicopterYawRate(u)).toBeLessThan(.4);
});

import {afterEach} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases,heightAt} from './heightmap';
import {weaponFireBlocker} from './systems/combat';
afterEach(resetHeightmap);
it('fixed helicopter racks wait for the nose and the chin gun cannot fire behind the aircraft',()=>{
 const bases=[{x:0,z:0,r:220},{x:200,z:200,r:20}];setBases(bases);const w=new World(17,false,[],[],bases,false);w.networkMode=true;
 const u=w.spawn('heli',0,0,0),t=w.spawn('tank',1,35,0);u.airState='airborne';u.y=heightAt(0,0)+30;u.heading=0;t.spottedUntil[0]=100;u.cooldown=0;
 expect(weaponFireBlocker(w,u,t,0)).toContain('raketirakke');
 u.heading=Math.PI/2;expect(weaponFireBlocker(w,u,t,0)).toBeNull();
 const gun=u.def.weapons!.findIndex(s=>s.weapon!=='missile');expect(gun).toBeGreaterThanOrEqual(0);u.heading=-Math.PI/2;u.turretYaw=Math.PI;
 expect(weaponFireBlocker(w,u,t,gun)).toContain('laskesektorit');
});
it('aircraft missiles need a settled lock and wait between deliberate launches',()=>{
 const bases=[{x:0,z:0,r:220},{x:200,z:200,r:20}];setBases(bases);const w=new World(18,false,[],[],bases,false);w.networkMode=true;
 const plane=w.spawn('fighter',0,0,0),target=w.spawn('heli',1,0,60);plane.airState=target.airState='airborne';plane.y=target.y=heightAt(0,0)+60;plane.heading=0;target.spottedUntil[0]=100;plane.cooldown=0;
 expect(plane.def.weapons![0].cooldown).toBeGreaterThanOrEqual(6);
 expect(weaponFireBlocker(w,plane,target,0)).toContain('Lukustab');
 plane.airMissileLock={targetId:target.id,readyAt:1.2};w.time=1;expect(weaponFireBlocker(w,plane,target,0)).toContain('Lukustab');
 w.time=1.3;expect(weaponFireBlocker(w,plane,target,0)).toBeNull();
 plane.heading=Math.PI;expect(weaponFireBlocker(w,plane,target,0)).toContain('laskesektorit');
});
import {airMissionAllowsTarget,aaThreatAt} from './systems/airDoctrine';
import {canEngage,selectWeapon,weaponSpec} from './systems/combat';
import {updateUnits} from './systems/units';
import {setMapSize} from './heightmap';
it('fighter gun attacks nearby air contacts and SEAD distinguishes radar from passive IR defence',()=>{
 const bases=[{x:0,z:0,r:400},{x:500,z:500,r:20}];setMapSize(2048);setBases(bases);const w=new World(19,false,[],[],bases,false,true);w.compactBattle=true;w.networkMode=true;
 const fighter=w.spawn('fighter',0,0,0),heli=w.spawn('transport',1,0,60);fighter.airState=heli.airState='airborne';fighter.y=heli.y=heightAt(0,0)+120;fighter.heading=0;heli.spottedUntil[0]=100;fighter.cooldown=10;
 const gun=fighter.def.weapons!.findIndex(s=>s.profile==='air-cannon');expect(gun).toBeGreaterThan(0);expect(weaponFireBlocker(w,fighter,heli,gun)).toBeNull();expect(selectWeapon(fighter,heli,true)).toBe(gun);
 fighter.heading=Math.PI;expect(weaponFireBlocker(w,fighter,heli,gun)).toContain('Pöörab');
 const sead=w.spawn('ecm',0,0,-50),radar=w.spawn('sam',1,100,0),passive=w.spawn('irSam',1,120,0);expect(canEngage(sead,radar)).toBe(true);expect(canEngage(sead,passive)).toBe(false);expect(weaponSpec(passive).guidance).toBe('infrared');
 sead.airMission='sead';expect(airMissionAllowsTarget(sead,radar)).toBe(true);expect(airMissionAllowsTarget(sead,passive)).toBe(false);
});
it('CAP retains a moving contact outside the former tiny patrol area and turns into pursuit',()=>{
 setMapSize(4096);const bases=[{x:0,z:0,r:600},{x:1200,z:1200,r:20}];setBases(bases);const w=new World(20,false,[],[],bases,false,true);w.compactBattle=true;w.networkMode=true;
 const fighter=w.spawn('fighter',0,0,0),target=w.spawn('transport',1,300,0);fighter.airState=target.airState='airborne';fighter.y=target.y=heightAt(0,0)+120;fighter.heading=0;fighter.motionSpeed=100;fighter.airMission='cap';fighter.airMissionPoint={x:0,z:0};fighter.target=target;fighter.mode='attack';fighter.cooldown=100;fighter.weaponCooldowns=[100,100];
 target.spottedUntil[0]=100;target.mode='move';target.dest={x:300,z:800};target.flightVz=30;target.flightVx=0;target.motionSpeed=30;
 expect(airMissionAllowsTarget(fighter,target)).toBe(true);expect(aaThreatAt(w,0,fighter.x,fighter.z)).toBe(0);
 for(let i=0;i<60;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(fighter.target?.id).toBe(target.id);expect(fighter.airState).toBe('airborne');expect(fighter.heading).toBeGreaterThan(.45);expect(fighter.x).toBeGreaterThan(20);expect(fighter.flightVx).toBeGreaterThan(0);
});

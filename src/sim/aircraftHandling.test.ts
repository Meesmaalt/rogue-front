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

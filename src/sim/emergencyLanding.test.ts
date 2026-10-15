import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {heightAt,resetHeightmap,setBases} from './heightmap';
import {SIM_STEP} from './constants';
import {updateHelicopterEmergency,emergencyLandingSite} from './emergencyLanding';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
function fixture(kind:'heli'|'transport'='heli'){const bases=[{x:0,z:0,r:220},{x:200,z:200,r:30}];setBases(bases);const w=new World(412,false,[],[],bases,false);w.networkMode=true;const h=w.spawn(kind,0,20,0);h.airState='airborne';h.y=heightAt(h.x,h.z)+30;h.py=h.y;h.fuel=h.maxFuel!*.1;return {w,h};}
it('low fuel warns once, and 5% triggers a survivable gradual landing without free fuel',()=>{
 const {w,h}=fixture();updateHelicopterEmergency(w,h,SIM_STEP);updateHelicopterEmergency(w,h,SIM_STEP);
 expect(w.events.filter(e=>e.type==='air-fuel-warning'&&!e.emergency)).toHaveLength(1);expect(h.emergencyLandingPoint).toBeUndefined();
 h.fuel=h.maxFuel!*.049;const fuel=h.fuel,start=h.y;
 updateHelicopterEmergency(w,h,SIM_STEP);expect(h.y).toBeLessThan(start);expect(start-h.y).toBeLessThan(.3);expect(h.emergencyLandingPoint).toBeDefined();
 for(let i=0;i<600&&!h.emergencyLanded;i++)w.tick(SIM_STEP);
 expect(h.emergencyLanded).toBe(true);expect(h.dead).toBe(false);expect(h.airState).toBe('grounded');expect(h.y).toBeCloseTo(heightAt(h.x,h.z));expect(h.fuel).toBeLessThanOrEqual(fuel);
 const remaining=h.fuel;for(let i=0;i<60;i++)w.tick(SIM_STEP);expect(h.fuel).toBe(remaining);expect(h.dead).toBe(false);
 expect(w.events.filter(e=>e.type==='air-fuel-warning'&&e.emergency)).toHaveLength(1);
});
it('landing search avoids occupied ground and retains passengers',()=>{
 const {w,h}=fixture('transport'),b=w.spawn('factory',0,h.x,h.z),passenger=w.spawn('inf',0,h.x,h.z);passenger.loadedIntoId=h.id;h.cargoUnitIds=[passenger.id];
 const p=emergencyLandingSite(w,h);expect(Math.hypot(p.x-b.x,p.z-b.z)).toBeGreaterThan(b.def.radius+h.def.radius);
 h.fuel=h.maxFuel!*.04;for(let i=0;i<900&&!h.emergencyLanded;i++)w.tick(SIM_STEP);
 expect(h.emergencyLanded).toBe(true);expect(h.dead).toBe(false);expect(passenger.loadedIntoId).toBe(h.id);expect(h.cargoUnitIds).toEqual([passenger.id]);
 w.issue({type:'unload',ids:[h.id],x:h.x,z:h.z});w.tick(SIM_STEP);expect(passenger.loadedIntoId).toBeNull();expect(h.cargoUnitIds).toEqual([]);
});
it('zero-fuel autorotation and in-progress emergency save/restore remain deterministic',()=>{
 const {w,h}=fixture();h.fuel=0;updateHelicopterEmergency(w,h,SIM_STEP);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<200;i++){w.tick(SIM_STEP);copy.tick(SIM_STEP);}expect(worldHash(copy)).toBe(worldHash(w));expect(h.dead).toBe(false);expect(h.emergencyLanded).toBe(true);
});

import {updateTacticalSupply} from './systems/tacticalSupply';
it('a landed helicopter can recover only by consuming real nearby convoy fuel',()=>{
 const {w,h}=fixture();h.fuel=0;h.y=heightAt(h.x,h.z);h.emergencyLandingPoint={x:h.x,z:h.z};h.emergencyLanded=true;h.airState='grounded';
 const donor=w.spawn('logiTruck',0,h.x+5,h.z);donor.logisticsPayload={ammo:0,fuel:20,repair:0};donor.cargo=20;
 const before=donor.cargo;updateTacticalSupply(w,SIM_STEP);expect(h.fuel).toBeGreaterThan(0);expect(donor.logisticsPayload.fuel+h.fuel!).toBeCloseTo(before);
 expect(h.airState).toBe('grounded');
});

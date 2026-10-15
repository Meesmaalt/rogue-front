import mobility from '../data/mobility.json';
import physics from '../data/physics.json';
import {heightAt} from './heightmap';
import {groundMobilityClass,mobilityProfile} from './unitStats';
import type {Entity} from './types';
import type {World} from './World';

export interface GroundForces {acceleration:number;braking:number;lateral:number}
/** Specific forces (m/s²): grade gravity assists downhill motion and opposes braking. */
export function groundForces(profile:GroundForces,grade:number,grip:number,rolling:number,condition=1,load=1):GroundForces {
 const normal=1/Math.sqrt(1+grade*grade),gravity=physics.gravity*grade*normal;
 const traction=physics.gravity*grip*normal,resistance=physics.gravity*rolling*normal;
 return {
  acceleration:Math.min(traction,profile.acceleration*condition/load)-gravity-resistance,
  braking:Math.max(mobility.groundPhysics.minimumBraking,Math.min(traction,profile.braking*grip/mobility.groundPhysics.soilGrip)+gravity+resistance),
  lateral:Math.min(traction,profile.lateral*grip/mobility.groundPhysics.soilGrip),
 };
}
export function usesGroundDynamics(u:Entity):boolean {return !!u.def.metricScale&&u.def.domain==='land'&&u.def.category!=='infantry'&&u.def.speed>0;}
export function groundDynamics(w:World,u:Entity,heading:number):GroundForces {
 const profile=mobilityProfile(u),cfg=mobility.groundPhysics;
 if(!usesGroundDynamics(u))return {acceleration:profile.acceleration,braking:profile.braking,lateral:profile.lateralAcceleration};
 const dx=Math.sin(heading)*cfg.gradeSample,dz=Math.cos(heading)*cfg.gradeSample;
 const grade=(heightAt(u.x+dx,u.z+dz)-heightAt(u.x-dx,u.z-dz))/(cfg.gradeSample*2);
 const grip=w.terrain.roadAt(u.x,u.z)?cfg.roadGrip:w.terrain.densityAt(u.x,u.z)>0||w.terrain.slowCoverAt(u.x,u.z)?cfg.forestGrip:cfg.soilGrip;
 const condition=Math.max(cfg.minimumEngineForce,1-(u.components?.engine??0)/100);
 const load=u.kind==='logiTruck'?1+Math.min(1,Math.max(0,u.cargo)/Math.max(1,u.logisticsCargoCapacity??u.def.transportCapacity??100))*cfg.loadedTruckMass:1;
 const gear=Math.min(cfg.lowGearTorque,Math.max(1,u.def.speed/Math.max(cfg.lowGearSpeed,u.motionSpeed??0)));
 return groundForces({acceleration:profile.acceleration*gear,braking:profile.braking,lateral:profile.lateralAcceleration},grade,grip,cfg.rollingResistance[groundMobilityClass(u)],condition,load);
}
/** Trapezoidal displacement; if braking reaches rest partway through the tick, integrate only that interval. */
export function groundSpeedStep(speed:number,target:number,forces:GroundForces,dt:number):{speed:number;distance:number} {
 const stalling=target>=speed&&forces.acceleration<0;
 const rate=stalling?-forces.acceleration:target>=speed?forces.acceleration:forces.braking,duration=Math.max(0,dt);
 if(stalling)target=0;
 if(rate<=0)return {speed,distance:speed*duration};
 const change=target-speed,time=Math.min(duration,Math.abs(change)/rate),next=speed+Math.sign(change)*rate*time;
 return {speed:Math.max(0,next),distance:(speed+next)*.5*time+Math.max(0,next)*(duration-time)};
}
/** Speed at which the planned bend can be reached and traversed within available lateral grip. */
export function cornerApproachSpeed(angle:number,distance:number,lateral:number,braking:number):number {
 if(Math.abs(angle)<mobility.groundPhysics.cornerThreshold)return Infinity;
 const radius=mobility.groundPhysics.cornerRadius/Math.max(.1,Math.sin(Math.abs(angle)*.5));
 return Math.sqrt(Math.max(0,lateral*radius+2*braking*Math.max(0,distance-mobility.navigation.arrival)));
}
/** Coordinated level turn: tan(bank) = v × angular velocity / g. */
export function coordinatedBank(speed:number,angularVelocity:number,maxBank:number):number {
 return Math.max(-maxBank,Math.min(maxBank,-Math.atan2(speed*angularVelocity,physics.gravity)));
}

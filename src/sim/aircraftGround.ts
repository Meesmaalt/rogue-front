import {airframeFor} from './airframes';
import type {FactionId} from './factions';
import rules from '../data/aircraft-operations.json';
import {BATTLE_SCALE,aircraftMobility} from './battleScale';
import {heightAt} from './heightmap';
import {basePoint} from './baseLayout';
import {turnToward,wrapAngle} from './math';
import type {Entity,Point} from './types';
/** Nose-wheel steering: translation follows the nose, including tight slow apron turns. */
export function taxiAircraft(u:Entity,target:Point,dt:number):boolean {
 const c=rules.taxi,p=aircraftMobility(u),distance=Math.hypot(target.x-u.x,target.z-u.z);
 if(distance<c.arrival){u.motionSpeed=0;u.flightVx=u.flightVz=0;return true;}
 const desired=Math.atan2(target.x-u.x,target.z-u.z),error=Math.abs(wrapAngle(desired-u.heading)),speed=u.motionSpeed??0;
 const braking=Math.sqrt(2*c.braking*Math.max(0,distance-c.arrival*.5));
 const wanted=Math.min(p.taxiSpeed,braking)*Math.max(c.creepSpeed/p.taxiSpeed,Math.cos(Math.min(Math.PI/2,error)));
 u.motionSpeed=Math.max(0,speed+Math.max(-c.braking*dt,Math.min(c.acceleration*dt,wanted-speed)));
 const turn=Math.min(c.turnRate,Math.max(c.creepSpeed,u.motionSpeed)/c.minimumTurnRadius);
 u.heading=turnToward(u.heading,desired,turn*dt);
 const step=Math.min(distance,u.motionSpeed*dt);u.flightVx=Math.sin(u.heading)*u.motionSpeed;u.flightVz=Math.cos(u.heading)*u.motionSpeed;
 u.x+=Math.sin(u.heading)*step;u.z+=Math.cos(u.heading)*step;u.y=heightAt(u.x,u.z);u.flightBank=0;u.flightPitch=0;return false;
}
export function lineUpAircraft(u:Entity,pad:Entity,dt:number):boolean {
 const c=rules.taxi,cross=(u.x-pad.x)*Math.cos(pad.heading)-(u.z-pad.z)*Math.sin(pad.heading);
 if(Math.abs(wrapAngle(u.heading-pad.heading))<c.lineUpTolerance&&Math.abs(cross)<c.lineUpTrack){u.motionSpeed=0;return true;}
 const along=(u.x-pad.x)*Math.sin(pad.heading)+(u.z-pad.z)*Math.cos(pad.heading);
 taxiAircraft(u,basePoint(pad,0,along+c.lineUpLookAhead),dt);return false;
}
/** Rotation depends on airspeed; wheels leave the ground continuously before climb-out. */
export function takeoffRoll(u:Entity,pad:Entity,dt:number):boolean {
 const p=aircraftMobility(u),c=rules.takeoff,ground=heightAt(u.x,u.z),forward=(u.x-pad.x)*Math.sin(pad.heading)+(u.z-pad.z)*Math.cos(pad.heading);
 const rotate=u.def.metricScale?BATTLE_SCALE.aircraft.landingSpeed*c.rotationSpeedFraction:u.def.speed*c.legacySpeedFraction;
 const speed=u.motionSpeed??0;u.motionSpeed=Math.min(u.def.speed, speed+p.acceleration*dt);
 u.heading=turnToward(u.heading,pad.heading,rules.taxi.turnRate*dt);u.flightVx=Math.sin(u.heading)*u.motionSpeed;u.flightVz=Math.cos(u.heading)*u.motionSpeed;
 u.x+=u.flightVx*dt;u.z+=u.flightVz*dt;
 const rotating=u.motionSpeed>=rotate&&forward>=p.runwayStart+(p.runwayEnd-p.runwayStart)*c.rollFraction;
 u.flightPitch=(u.flightPitch??0)+((rotating?-c.rotationPitch:0)-(u.flightPitch??0))*Math.min(1,dt*c.pitchResponse);
 u.y=rotating?Math.max(ground,u.y)+p.climbRate*c.initialClimbFraction*dt:ground;u.flightBank=0;
 return rotating&&u.y-heightAt(u.x,u.z)>=c.clearance;
}
/** Saved crew/start state; rendering never decides when an aircraft is allowed to move. */
export function prepareAircraftStart(u:Entity,pad:Entity,dt:number,faction:FactionId='usa'):boolean {
 const c=rules.startup;
 const frame=airframeFor(faction,u.kind),scale=u.def.modelScale??1,forward=frame?frame.length*(frame.style==='cargo'?.3:.2)*scale:c.canopyForward,side=frame?(frame.width*.5+1)*scale:c.canopySide;
 if(!u.airStart){const target={x:u.x-Math.cos(u.heading)*side+Math.sin(u.heading)*forward,z:u.z+Math.sin(u.heading)*side+Math.cos(u.heading)*forward},from=basePoint(pad,u.def.metricScale?55:8,(u.x-pad.x)*Math.sin(pad.heading)+(u.z-pad.z)*Math.cos(pad.heading));
  u.airStart={phase:'crew',progress:0,from,target,runSeconds:Math.max(c.minimumRunSeconds,Math.hypot(from.x-target.x,from.z-target.z)/c.runSpeed)};
 }
 const s=u.airStart;if(s.phase==='ready')return true;
 u.motionSpeed=0;u.flightVx=u.flightVz=0;s.progress+=dt;
 const seconds=s.phase==='crew'?s.runSeconds:s.phase==='boarding'?c.boardingSeconds:c.ignitionSeconds;
 if(s.progress>=seconds){s.progress=0;s.phase=s.phase==='crew'?'boarding':s.phase==='boarding'?'ignition':'ready';}
 return s.phase==='ready';
}

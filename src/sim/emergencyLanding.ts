import {disembark} from "./transport";
import type {Entity,Point} from './types';
import type {World} from './World';
import {heightAt} from './heightmap';
import {helicopterMobility} from './battleScale';
import mobility from '../data/mobility.json';
import {turnHelicopter} from './aircraftHandling';
/** Deterministic local search, using real water/slope/building masks. */
export function emergencyLandingSite(w:World,u:Entity):Point {
 const cfg=mobility.helicopter.emergency;
 const vx=u.flightVx??Math.sin(u.heading)*(u.motionSpeed??0),vz=u.flightVz??Math.cos(u.heading)*(u.motionSpeed??0);
 const seconds=Math.min(cfg.stoppingLookAhead,Math.hypot(vx,vz)/helicopterMobility(u).braking);
 const origin={x:u.x+vx*seconds*.5,z:u.z+vz*seconds*.5};
 for(const radius of cfg.searchRings)for(let i=0;i<(radius===0?1:cfg.samples);i++){
  const angle=i*Math.PI*2/cfg.samples,p={x:origin.x+Math.sin(angle)*radius,z:origin.z+Math.cos(angle)*radius};
  if(w.nav.isWalkableWorld(p.x,p.z,u.def.radius)&&!w.entities.some(e=>e!==u&&!e.dead&&e.loadedIntoId==null&&Math.abs(e.y-heightAt(e.x,e.z))<3&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+u.def.radius+cfg.clearance))return p;
 }
 return {x:u.x,z:u.z};
}
/** Reserve-fuel controlled landing; at zero fuel the same descent becomes autorotation. */
export function updateHelicopterEmergency(w:World,u:Entity,dt:number):boolean {
 if(u.def.category!=='heli'||!(u.maxFuel&&u.maxFuel>0))return false;
 const cfg=mobility.helicopter.emergency,ratio=(u.fuel??0)/u.maxFuel;
 if(ratio>cfg.resetFraction){u.airFuelWarned=false;if(u.emergencyLanded){u.emergencyLandingPoint=undefined;u.emergencyLanded=false;}}
 const flying=!['grounded','rearming'].includes(u.airState??'')&&(u.airState==='airborne'||u.y-heightAt(u.x,u.z)>.1);
 if(flying&&ratio<=cfg.warningFraction&&ratio>cfg.landFraction&&!u.airFuelWarned){u.airFuelWarned=true;w.events.push({type:'air-fuel-warning',team:u.team,unitId:u.id,x:u.x,z:u.z,emergency:false});}
 if(!u.emergencyLandingPoint&&flying&&ratio<=cfg.landFraction){u.airFuelWarned=true;u.emergencyLandingPoint=emergencyLandingSite(w,u);w.events.push({type:'air-fuel-warning',team:u.team,unitId:u.id,x:u.x,z:u.z,emergency:true});}
 if(!u.emergencyLandingPoint)return false;
 u.target=null;u.airMission=null;u.airMissionPoint=null;u.flightAttackExit=undefined;u.patrolPoints=[];u.moveQueue=[];
 if(u.emergencyLanded){if(u.mode==='transport-unload')disembark(w,u);u.airState='grounded';u.mode='idle';u.dest=null;u.motionSpeed=0;u.flightVx=u.flightVz=0;return true;}
 const p=u.emergencyLandingPoint,dx=p.x-u.x,dz=p.z-u.z,distance=Math.hypot(dx,dz),profile=helicopterMobility(u),powered=(u.fuel??0)>0;
 u.airState='landing';u.airReturnReason='fuel';u.mode='move';u.dest={...p};
 if(distance>.1)u.heading=turnHelicopter(u,Math.atan2(dx,dz),dt);
 const desired=powered?Math.min(cfg.approachSpeed,Math.sqrt(2*profile.braking*Math.max(0,distance-.5))):0;
 const oldX=u.flightVx??0,oldZ=u.flightVz??0,tx=distance>.001?dx/distance*desired:0,tz=distance>.001?dz/distance*desired:0,delta=Math.hypot(tx-oldX,tz-oldZ),blend=Math.min(1,profile.braking*dt/Math.max(.001,delta));
 u.flightVx=oldX+(tx-oldX)*blend;u.flightVz=oldZ+(tz-oldZ)*blend;u.x+=(oldX+u.flightVx)*.5*dt;u.z+=(oldZ+u.flightVz)*.5*dt;u.motionSpeed=Math.hypot(u.flightVx,u.flightVz);
 const ground=heightAt(u.x,u.z),desiredAltitude=ground+(powered&&distance>cfg.descentRadius?cfg.approachHeight:0),descent=powered?profile.descentRate:cfg.autorotationRate;
 u.y+=Math.max(-descent*dt,Math.min(profile.climbRate*dt,desiredAltitude-u.y));u.flightBank=(u.flightBank??0)*Math.max(0,1-dt*3);u.flightPitch=(u.flightPitch??0)*Math.max(0,1-dt*3);
 if(u.y-ground<.15&&u.motionSpeed<profile.hoverArrivalSpeed){
  u.y=ground;u.airState='grounded';u.emergencyLanded=true;u.mode='idle';u.dest=null;u.motionSpeed=0;u.flightVx=u.flightVz=0;
  if(!w.nav.isWalkableWorld(u.x,u.z,u.def.radius)){u.hp=0;u.dead=true;w.lossValue[u.team]+=u.def.cost;w.events.push({type:'death',x:u.x,y:u.y,z:u.z,big:false,kind:u.kind,team:u.team});}
 }
 return true;
}

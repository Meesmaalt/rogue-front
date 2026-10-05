import mobility from '../data/mobility.json';
import type {World} from './World';
import type {Entity,Point} from './types';
import {heightAt} from './heightmap';
export function transportCapacity(u:Entity):number {return u.supplyDepotId!=null?0:u.def.transportCapacity??0;}
export function passengerSeats(u:Entity):number {return Math.max(1,u.squadMembers??u.def.squadSize??1);}
export function isPassenger(u:Entity):boolean {return u.def.speed>0&&u.def.domain!=='air'&&u.def.domain!=='sea'&&(!!u.squadMaxMembers||u.def.category==='infantry'||['engineer','special'].includes(u.kind));}
export function occupiedSeats(w:World,u:Entity,reserved=false):number {return [...u.cargoUnitIds,...(reserved?u.transportQueue??[]:[])].reduce((n,id)=>{const p=w.byId.get(id);return n+(p&&!p.dead?passengerSeats(p):0);},0);}
export function queuePassenger(w:World,u:Entity,p:Entity):boolean {
 if(!transportCapacity(u)||p.garrisonId||!isPassenger(p)||p.dead||p.loadedIntoId!=null||p.team!==u.team||u===p)return false;
 if(w.entities.some(e=>!e.dead&&e.transportQueue?.includes(p.id)))return false;
 if(occupiedSeats(w,u,true)+passengerSeats(p)>transportCapacity(u))return false;
 if(!u.transportQueue?.length){u.transportPickupDeadline=w.time+mobility.transport.pickupTimeout;u.transportPickupPoint=undefined;}
 u.transportQueue??=[];u.transportQueue.push(p.id);u.transportTargetId=u.transportQueue[0];u.mode='transport-load';u.dest={x:p.x,z:p.z};u.target=null;u.moveGroup=undefined;u.navPath=[];
 // A pickup order holds the squad; the carrier approaches it instead of chasing a moving destination.
 p.moveGroup=undefined;p.fastMove=false;p.moveQueue=[];p.moveQueueStyles=[];p.mode='hold';p.dest=null;p.target=null;p.navPath=[];p.motionSpeed=0;p.holdPosition=true;
 return true;
}
function idle(u:Entity):void {u.mode='idle';u.dest=null;u.target=null;u.transportTargetId=null;u.transportPickupPoint=undefined;u.unloadPoint=null;u.navPath=[];u.motionSpeed=0;}
/** Called before movement. Ground carriers use the same acceleration/nav/collision code as other vehicles. */
export function prepareTransport(w:World,u:Entity):boolean {
 if(!['transport-load','transport-unload'].includes(u.mode))return false;
 u.target=null;
 if(u.mode==='transport-unload'){
  if(!u.unloadPoint){idle(u);return true;}
  u.dest=u.unloadPoint;
  if(Math.hypot(u.x-u.dest.x,u.z-u.dest.z)<=u.def.radius+2&&(u.def.domain!=="air"||u.y-heightAt(u.x,u.z)<mobility.transport.landingHeight))disembark(w,u);
  return true;
 }
 u.transportQueue??=u.transportTargetId?[u.transportTargetId]:[];
 if(w.time>(u.transportPickupDeadline??Infinity)){u.transportQueue=[];idle(u);return true;}
 while(u.transportQueue.length){const p=w.byId.get(u.transportQueue[0]);if(p&&!p.dead&&p.loadedIntoId==null&&p.team===u.team&&occupiedSeats(w,u)+passengerSeats(p)<=transportCapacity(u))break;u.transportQueue.shift();}
 const p=w.byId.get(u.transportQueue[0]);if(!p){idle(u);return true;}
 u.transportTargetId=p.id;
 const reach=u.def.radius+p.def.radius+mobility.transport.pickupGap;
 if(u.def.domain==='air'){
  if(!u.transportPickupPoint){const point=w.nav.nearestWalkable(p,u.def.radius+mobility.transport.landingMargin);if(!point||Math.hypot(point.x-p.x,point.z-p.z)>mobility.transport.pickupSearch){u.transportQueue.shift();return true;}u.transportPickupPoint=point;}
  const point=u.transportPickupPoint;
  if(Math.hypot(point.x-p.x,point.z-p.z)>reach-2){p.mode='move';p.holdPosition=false;p.dest={...point};}
 }
 if(Math.hypot(u.x-p.x,u.z-p.z)<=reach&&(u.def.domain!=='air'||u.y-heightAt(u.x,u.z)<mobility.transport.landingHeight)){
  p.loadedIntoId=u.id;p.mode='idle';p.dest=null;p.target=null;p.moveQueue=[];p.navPath=[];p.holdPosition=false;p.motionSpeed=0;u.cargoUnitIds.push(p.id);u.transportQueue.shift();u.transportPickupPoint=undefined;u.transportPickupDeadline=w.time+mobility.transport.pickupTimeout;u.navPath=[];
  if(!u.transportQueue.length)idle(u);
 }else {
  const a=Math.atan2(u.x-p.x,u.z-p.z),goal={x:p.x+Math.sin(a)*Math.max(1,reach-mobility.transport.approachInset),z:p.z+Math.cos(a)*Math.max(1,reach-mobility.transport.approachInset)};
  u.dest=u.def.domain==='air'?u.transportPickupPoint??null:w.nav.nearestWalkable(goal,u.def.radius)??null;
 }
 return true;
}
/** Never put passengers in water, buildings, other units or through a blocked wall. Keep cargo aboard if no exit is available. */
export function disembark(w:World,u:Entity):void {
 if(w.time<(u.transportExitRetryAt??0))return;u.transportExitRetryAt=w.time+mobility.transport.exitRetry;
 for(const id of [...u.cargoUnitIds]){
  const p=w.byId.get(id);if(!p||p.dead){u.cargoUnitIds=u.cargoUnitIds.filter(i=>i!==id);continue;}
  let exit:Point|undefined;
  for(let r=u.def.radius+p.def.radius+1;r<=mobility.transport.exitRadius&&!exit;r+=mobility.transport.exitSpacing)for(let i=0;i<16;i++){
   const a=u.heading+i*Math.PI/8,q={x:u.x+Math.sin(a)*r,z:u.z+Math.cos(a)*r};
   if(!w.nav.isWalkableWorld(q.x,q.z,p.def.radius))continue;
   if(w.entities.some(e=>e!==p&&!e.dead&&e.loadedIntoId==null&&e.def.domain!=='air'&&Math.hypot(q.x-e.x,q.z-e.z)<p.def.radius+e.def.radius+.5))continue;
   const steps=Math.ceil(r);let clear=true;for(let j=0;j<=steps;j++)if(!w.nav.isWalkableWorld(u.x+(q.x-u.x)*j/steps,u.z+(q.z-u.z)*j/steps,p.def.radius)){clear=false;break;}if(!clear)continue;
   exit=q;break;
  }
  if(!exit)continue;
  p.loadedIntoId=null;p.x=p.px=exit.x;p.z=p.pz=exit.z;p.y=heightAt(p.x,p.z);p.mode='idle';p.dest=null;p.target=null;p.navPath=[];p.moveQueue=[];p.holdPosition=false;p.motionSpeed=0;
  u.cargoUnitIds=u.cargoUnitIds.filter(i=>i!==id);
 }
 if(!u.cargoUnitIds.length)idle(u);
}

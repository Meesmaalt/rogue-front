import type {World} from "./World";
import type {Entity,Point} from "./types";

/** Boarding is a physical ground transition: a short distance across a wall is not access. */
export function boardingPassageClear(w:World,from:Point,to:Point,radius:number):boolean {
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)));
  for(let i=0;i<=steps;i++)if(!w.nav.isWalkableWorld(from.x+(to.x-from.x)*i/steps,from.z+(to.z-from.z)*i/steps,radius))return false;
  return true;
}

/** Release only still-reserved passengers; units already aboard retain their seats. */
export function clearPickupQueue(w:World,carrier:Entity):void {
  for(const id of carrier.transportQueue??[]){
    const p=w.byId.get(id);
    if(!p||p.dead||p.loadedIntoId!=null)continue;
    p.dest=null;p.target=null;p.mode='hold';p.holdPosition=true;
    p.navPath=[];p.navPathIndex=0;p.roadPathGoal=undefined;p.flowField=null;
  }
  carrier.transportQueue=[];carrier.transportTargetId=null;
  carrier.transportPickupPoint=undefined;carrier.transportPickupDeadline=undefined;
}

/** A new passenger order frees its old reservation immediately, even for a parked cargo plane. */
function detachPickup(w:World,p:Entity):void {
  for(const carrier of w.entities){
    if(carrier===p||!carrier.transportQueue?.includes(p.id))continue;
    const first=carrier.transportQueue[0]===p.id;
    carrier.transportQueue=carrier.transportQueue.filter(id=>id!==p.id);
    if(!first)continue;
    carrier.transportTargetId=carrier.transportQueue[0]??null;
    carrier.transportPickupPoint=undefined;carrier.dest=null;
    carrier.navPath=[];carrier.navPathIndex=0;carrier.roadPathGoal=undefined;
    if(!carrier.transportQueue.length&&carrier.mode==='transport-load')carrier.mode='idle';
  }
}

/** Replace a task without cancelling rounds already in flight or weapon reloads. */
export function replaceTask(w:World,u:Entity):void {
  detachPickup(w,u);
  clearPickupQueue(w,u);
  for(const b of w.entities)if(b.builderIds.includes(u.id))b.builderIds=b.builderIds.filter(id=>id!==u.id);
  u.vehicleService=undefined;u.roadTripGoal=undefined;
  u.combatWithdrawing=false;u.combatHoldingTarget=undefined;
  u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;
  u.fireMission=null;u.artilleryDisplace=null;u.artilleryShotsInSalvo=0;
  u.transportQueue=[];u.transportTargetId=null;u.transportPickupPoint=undefined;u.unloadPoint=null;
  u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;
  u.combatPosition=undefined;u.combatPositionTarget=undefined;u.combatPositionAnchor=undefined;u.combatPositionRetryAt=undefined;
  u.moveFacing=undefined;u.moveQueue=[];u.moveQueueStyles=[];u.moveGroup=undefined;u.fastMove=false;u.patrolPoints=[];
  u.navPath=[];u.navPathIndex=0;u.roadPathGoal=undefined;u.roadPathRetryAt=undefined;u.taskApproachIndex=0;u.flowField=null;u.avoidanceSide=undefined;u.avoidanceUntil=undefined;u.navWaiting=false;
}


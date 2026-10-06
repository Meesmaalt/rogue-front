import {depositPayload,stockCapacity} from "../stockLogistics";
import {garrisonFaces} from "../garrison";
import {prepareTransport,transportCapacity} from "../transport";
import {travelPathCost} from "../unitStats";
import {maxHitPoints,groundTerrainFactor,mobilityProfile} from "../unitStats";
import type { World } from "../World";
import type { Entity, Point } from "../types";
import logisticsConfig from "../../data/logistics.json";
import mobility from "../../data/mobility.json";
import { heightAt, MAP_SIZE } from "../heightmap";
import { dist2d, turnToward, wrapAngle } from "../math";
import { fireProjectile, canEngage, effectiveWeaponRange,selectWeapon,weaponSpec,weaponAmmo,weaponMuzzle } from "./combat";
import { coverValueAt,isSpottedBy } from "./sensors";
import { moraleSpeedMul, moraleAccuracyMul, moraleState } from "./morale";
import { outOfFuel, outOfAmmo,repairDepotFor } from "./tacticalSupply";
import { updateAirDoctrine,airFacilityPoint,airParkingPoint,freeAirSlot,airOperationStatus,hasAirMissionAmmo } from "./airDoctrine";
import { findPath } from "../nav/Pathfinder";

function inFiringArc(u: Entity, target: Entity): boolean {
  if (u.firingArc >= Math.PI * 2 - 0.01) return true;
  const angle = Math.atan2(target.x - u.x, target.z - u.z);
  const facing = u.heading;
  const delta = Math.abs(wrapAngle(angle - facing));
  return delta <= u.firingArc * 0.5;
}

function hasSpotter(w: World, u: Entity, target: Entity): boolean {
  return isSpottedBy(target,u.team,w.time);
}

export function nearestEnemy(w: World, u: Entity, range: number): Entity | null {
  let best: Entity | null = null, bestScore = Number.POSITIVE_INFINITY;
  const searchR = range + 14;
  w.spatial.queryRadius(u.x, u.z, searchR, (e) => {
    if (!garrisonFaces(u,e))return;
    if (e.dead || e.team === u.team || e.underConstruction || e === u) return;
    // Auto-acquire only spotted contacts (Wargame); keeps recon valuable
    if (!isSpottedBy(e, u.team, w.time)) return;
    const dx = e.x - u.x, dz = e.z - u.z;
    const distSq = dx * dx + dz * dz;

    const d = Math.sqrt(distSq) - e.def.radius;
    if (d > range) return;
    if (!hasSpotter(w, u, e)) return;
    const slot=selectWeapon(u,e);if(slot<0)return;
    const reach=effectiveWeaponRange(u,e),spec=weaponSpec(u,slot);
    if((u.mode==="hold"||u.holdPosition||u.mode==="move")&&(d>reach||Math.sqrt(distSq)<spec.minimumRange))return;
    if(u.def.armor==="air"&&u.airMission==="cap"&&e.def.armor!=="air")return;
    if ((u.kind === "bunker" || u.kind === "aa" || u.kind === "spaa") && !inFiringArc(u, e)) return;
    let priority = d;
    if (u.def.weapon === "missile" && e.def.armor === "air") priority -= 22;
    if (u.kind === "artillery" && e.def.speed === 0) priority -= 16;
    if (["heli","gunship","atgm","tankDestroyer"].includes(u.kind)&&e.def.category==="armor")priority-=30;
    // Threats come before infrastructure unless the player explicitly prioritises it.
    if (e.def.damage > 0 && e.def.speed > 0) priority -= 18;
    if (e.def.speed === 0 && e.def.damage === 0) priority += 12;
    // Real War priority orders: focus supply / power / AA when set
    if (u.priorityFocus && e.kind === u.priorityFocus) priority -= 80;
    if(d<=reach&&Math.sqrt(distSq)>=spec.minimumRange){
      if(["artillery","mortar","mlrs"].includes(u.kind)||w.vision.hasLineOfSight(u,e))priority-=mobility.combat.clearShotPreference;
      else priority+=mobility.combat.blockedShotPenalty;
    }
    if (priority < bestScore || priority===bestScore&&e.id<(best?.id??Infinity)) { bestScore = priority; best = e; }
  });
  return best;
}

function clearGroundSegment(w:World,u:Entity,p:Point):boolean {
  const distance=dist2d(u,p),steps=Math.max(1,Math.ceil(distance));
  for(let i=1;i<=steps;i++)if(!w.nav.isWalkableWorld(u.x+(p.x-u.x)*i/steps,u.z+(p.z-u.z)*i/steps,u.def.radius)||!bodyClear(w,u,{x:u.x+(p.x-u.x)*i/steps,z:u.z+(p.z-u.z)*i/steps}))return false;
  return true;
}
function bodyClear(w:World,u:Entity,p:Point):boolean {
  let clear=true;
  w.spatial.queryRadius(p.x,p.z,u.def.radius+8,o=>{
    if(o===u||o.dead||o.garrisonId||o.loadedIntoId!=null||o.def.speed===0||o.def.domain!=="land")return;
    const old=dist2d(u,o),next=dist2d(p,o),min=(u.def.radius+o.def.radius)*.9+mobility.navigation.bodyClearance;
    if(next<min&&next<old-.001)clear=false;
  });return clear;
}
/** Keep the passing side stable: reversing it every blocked frame causes oscillation. */
function groundSidestep(w:World,u:Entity,dx:number,dz:number,travel:number):boolean {
  const locked=w.time<(u.avoidanceUntil??0),side=u.avoidanceSide??-1;
  for(const sign of locked?[side]:[side,-side]){
    const x=u.x+(dx*.25-dz*sign*mobility.navigation.sidestep)*travel,z=u.z+(dz*.25+dx*sign*mobility.navigation.sidestep)*travel;
    if(!w.nav.isWalkableWorld(x,z,u.def.radius)||!bodyClear(w,u,{x,z}))continue;
    u.x=x;u.z=z;u.avoidanceSide=sign;if(!locked)u.avoidanceUntil=w.time+mobility.navigation.avoidanceSideDuration;return true;
  }return false;
}
/** A bounded, cached search for a reachable firing point instead of the enemy's center. */
function firingPosition(w:World,u:Entity,target:Entity,range:number):Point|null {
  const cfg=mobility.navigation,anchor=u.combatPositionAnchor;
  if(u.combatPositionTarget===target.id&&anchor&&dist2d(anchor,target)<cfg.firingTargetMove&&w.time<(u.combatPositionRetryAt??0))return u.combatPosition??null;
  u.combatPositionTarget=target.id;u.combatPositionAnchor={x:target.x,z:target.z};u.combatPositionRetryAt=w.time+cfg.firingPositionRetry;u.combatPosition=undefined;
  const index=selectWeapon(u,target),spec=index>=0?weaponSpec(u,index):weaponSpec(u),radius=Math.max(spec.minimumRange+u.def.radius+target.def.radius,range*cfg.firingDistance+target.def.radius);
  const angle=Math.atan2(u.x-target.x,u.z-target.z),candidates:Array<{point:Point;score:number}>=[];
  for(const factor of (u.def.category==="infantry"?cfg.infantryFiringFactors:cfg.vehicleFiringFactors))for(const offset of [0,.35,-.35,.7,-.7,1.1,-1.1,1.6,-1.6,Math.PI]){
    const r=Math.max(spec.minimumRange+u.def.radius+target.def.radius,radius*factor),a=angle+offset+(u.id%3-1)*.06,p={x:target.x+Math.sin(a)*r,z:target.z+Math.cos(a)*r};
    if(!w.nav.isWalkableWorld(p.x,p.z,u.def.radius)||!bodyClear(w,u,p))continue;
    if(!["artillery","mortar","mlrs"].includes(u.kind)&&!w.vision.hasLineOfSight({...u,...p,y:heightAt(p.x,p.z)},target))continue;
    const cover=u.def.category==="infantry"?coverValueAt(w,p.x,p.z)/34*cfg.coverPreference:0;
    candidates.push({point:p,score:dist2d(u,p)-cover+Math.abs(offset)*3+(radius-r)*.3});
  }
  candidates.sort((a,b)=>a.score-b.score);
  for(const c of candidates.slice(0,3)){
    const path=findPath(w.nav,u,c.point,u.def.radius);if(!path.length)continue;
    u.combatPosition=c.point;u.navPath=path;u.navPathIndex=0;u.roadPathGoal=c.point;u.roadPathRetryAt=w.time+cfg.firingPositionRetry;return c.point;
  }
  return null;
}

function smoothWaypoint(w:World,u:Entity):void {
  if(u.fastMove&&u.mode==="move"||u.kind==="logiTruck")return; // Weighted A* already smooths without cutting the road itinerary.
  for(let i=u.navPathIndex+1;i<u.navPath.length;i++){
    if(dist2d(u,u.navPath[i])>mobility.navigation.lookAhead||!clearGroundSegment(w,u,u.navPath[i])||!bodyClear(w,u,u.navPath[i]))break;
    u.navPathIndex=i;
  }
}

function moveRoadTruckTo(w: World, u: Entity, goal: Point, dt: number, arrival=3.2): boolean {
  const finalGoal=goal;
  if(!u.roadTripGoal&&dist2d(u,finalGoal)<=arrival){u.motionSpeed=0;return true;}
  if(!u.roadTripGoal||Math.hypot(u.roadTripGoal.x-finalGoal.x,u.roadTripGoal.z-finalGoal.z)>5){u.roadTripGoal={x:finalGoal.x,z:finalGoal.z};u.taskApproachIndex=0;u.patrolIndex=0;u.navPath=[];}
  const depot=u.supplyDepotId!=null?w.byId.get(u.supplyDepotId):null;
  const route=depot?.logisticsWaypoints??[];
  const reverse=u.logisticsSourceIndex!=null?u.cargo>0:u.cargo<=0;
  while(u.patrolIndex<route.length){const waypoint=route[reverse?route.length-1-u.patrolIndex:u.patrolIndex];if(Math.hypot(waypoint.x-u.x,waypoint.z-u.z)>5)break;u.patrolIndex++;u.navPath=[];}
  if(u.patrolIndex<route.length)goal=route[reverse?route.length-1-u.patrolIndex:u.patrolIndex];
  const dist=Math.hypot(goal.x-u.x,goal.z-u.z);
  if(goal===finalGoal&&dist<=arrival){u.motionSpeed=0;return true;}
  if(!u.navPath.length && u.roadPathGoal && Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)<5 && w.time<(u.roadPathRetryAt??0))return false;
  if(!u.navPath.length || u.navPathIndex>=u.navPath.length || !u.roadPathGoal || Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)>5){
    const cost=travelPathCost(w,u);
    if(goal===finalGoal&&arrival>5&&(u.kind==="engineer"||!w.nav.isWalkableWorld(goal.x,goal.z,u.def.radius))){
      const angle=Math.atan2(u.x-goal.x,u.z-goal.z),points=Array.from({length:16},(_,i)=>{const a=angle+i*Math.PI/8;return {x:goal.x+Math.sin(a)*(arrival-1),z:goal.z+Math.cos(a)*(arrival-1)};}).filter(p=>w.nav.isWalkableWorld(p.x,p.z,u.def.radius)).sort((a,b)=>dist2d(u,a)-dist2d(u,b));
      u.navPath=[];const start=u.taskApproachIndex??0,attempts=Math.min(points.length,mobility.navigation.taskPathAttempts);
      for(let i=0;i<attempts;i++){const p=points[(start+i)%points.length],path=findPath(w.nav,u,p,u.def.radius,cost);if(path.length){u.navPath=path;u.taskApproachIndex=0;break;}}
      if(!u.navPath.length)u.taskApproachIndex=points.length?(start+attempts)%points.length:0;
    }else u.navPath=findPath(w.nav,u,goal,u.def.radius,cost);
    u.navPathIndex=0;u.roadPathGoal={x:goal.x,z:goal.z};u.roadPathRetryAt=w.time+mobility.navigation.blockedRetry;
    if(!u.navPath.length)return false;
  }
  let p=goal;
  while(u.navPathIndex<u.navPath.length && Math.hypot(u.x-u.navPath[u.navPathIndex].x,u.z-u.navPath[u.navPathIndex].z)<Math.min(mobility.navigation.arrival,mobility.navigation.taskWaypointArrival))u.navPathIndex++;
  smoothWaypoint(w,u);
  if(u.navPathIndex<u.navPath.length)p=u.navPath[u.navPathIndex];
  const dx=p.x-u.x,dz=p.z-u.z,len=Math.hypot(dx,dz)||1;
  const want=Math.atan2(dx,dz);u.heading=turnToward(u.heading,want,u.def.turnRate*dt);
  const roadFeature=w.terrain.roadFeatureAt(u.x,u.z,3);
  if (roadFeature?.kind === "bridge" && (w.infrastructureDamage.get(roadFeature.id) ?? 0) >= 1) { u.mode="idle"; u.dest=null; return false; }
  const componentSpeed = u.components ? Math.max(0.30, 1 - (u.components.engine ?? 0) / 180 - (u.components.tracks ?? 0) / 260) : 1;
  const speed=u.def.speed*componentSpeed*groundTerrainFactor(w,u)*((u.supply??100)>10?1:0.75)*(outOfFuel(u)?0:1);
  const profile=mobilityProfile(u);
  const desiredSpeed=Math.min(speed*Math.max(0,Math.cos(wrapAngle(want-u.heading))),Math.sqrt(Math.max(0,dist-(goal===finalGoal?arrival:mobility.navigation.arrival))*profile.braking*2));
  u.motionSpeed=(u.motionSpeed??0)+Math.max(-profile.braking*dt,Math.min(profile.acceleration*dt,desiredSpeed-(u.motionSpeed??0)));
  const step=Math.min(len,(u.motionSpeed??0)*dt);const nx=u.x+dx/len*step,nz=u.z+dz/len*step;
  if((w.nav.isWalkableWorld(nx,nz,u.def.radius)||!w.nav.isWalkableWorld(u.x,u.z,u.def.radius))&&bodyClear(w,u,{x:nx,z:nz})){u.x=nx;u.z=nz;}else {
    const slides=[{x:nx,z:u.z},{x:u.x,z:nz}].sort((a,b)=>dist2d(a,p)-dist2d(b,p));
    const slide=slides.find(q=>dist2d(q,p)<dist2d(u,p)-.001&&w.nav.isWalkableWorld(q.x,q.z,u.def.radius)&&bodyClear(w,u,q));
    if(slide){u.x=slide.x;u.z=slide.z;}else if(groundSidestep(w,u,dx/len,dz/len,step)){}else {u.navWaiting=true;u.navPath=[];u.roadPathRetryAt=w.time+mobility.navigation.blockedRetry;u.motionSpeed=Math.max(0,(u.motionSpeed??0)-profile.braking*dt);}
  }u.y=heightAt(u.x,u.z);u.stuckX=u.x;u.stuckZ=u.z;
  return false;
}

function updateRoadTruck(w: World, u: Entity, dt: number): void {
  let depot = u.supplyDepotId != null ? w.byId.get(u.supplyDepotId) : null;
  if (!depot || depot.dead) {
    depot=w.primarySupplyDepot(u.team);if(!depot||depot.dead){u.mode="idle";u.dest=null;return;}
    u.supplyDepotId=depot.id;u.logisticsHome={x:depot.x,z:depot.z};u.logisticsTarget={x:depot.x,z:depot.z};u.navPath=[];
    if(u.cargo>0&&u.logisticsSourceIndex!=null)u.logisticsPhase="loading";
  }
  if(depot.logisticsPaused&&u.cargo<=0){u.mode="move";u.dest=u.logisticsHome??depot;moveRoadTruckTo(w,u,u.dest,dt,16);return;}
  if(u.cargo<=0&&u.logisticsSourceIndex!=null&&depot.preferredResourceIndex!=null)u.logisticsSourceIndex=depot.preferredResourceIndex;
  const cap = u.logisticsCargoCapacity ?? 150;
  const source = u.logisticsSourceIndex != null ? w.resourcePoints[u.logisticsSourceIndex] : null;
  const home = u.logisticsHome ?? {x: depot.x,z: depot.z};

  // Collection truck: resource site -> local depot -> trunk depot/national pool.
  if (source) {
    if (u.logisticsPhase === "idle" || u.logisticsPhase === "unloading") {
      if(source.controlledBy!==u.team||!source.active||(source.disabledUntil??0)>w.time){u.dest={...home};u.mode="move";moveRoadTruckTo(w,u,home,dt,16);return;}
      u.dest = {x:source.x,z:source.z}; u.mode="move";
      if (!moveRoadTruckTo(w,u,u.dest,dt,source.radius+4)) return;
      if (Math.hypot(u.x-source.x,u.z-source.z) <= source.radius+4) {
        u.logisticsLoadProgress = (u.logisticsLoadProgress ?? 0) + dt;
        if (u.logisticsLoadProgress >= 4.5) {
          const loaded = Math.min(cap, Math.floor(source.amount ?? 0));
          if (loaded > 0) { source.amount = Math.max(0,(source.amount??0)-loaded); u.cargo=loaded; u.logisticsPhase="loading"; u.logisticsLoadProgress=0; u.dest={x:home.x,z:home.z}; }
        }
      }
      return;
    }
    if (u.logisticsPhase === "loading") {
      u.dest={x:home.x,z:home.z}; u.mode="move";
      if (!moveRoadTruckTo(w,u,u.dest,dt,16)) return;
      if (Math.hypot(u.x-home.x,u.z-home.z)<=16) {
        u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
        if (u.logisticsLoadProgress>=3) {
          const amount=w.receiveSupply(depot,u.cargo);
          w.roadCargoDelivered[u.team]+=amount;
          if(amount>0)w.events.push({type:"supply-delivered",team:u.team,x:u.x,z:u.z,amount});
          u.cargo=Math.max(0,u.cargo-amount);if(u.cargo>0)return;u.logisticsPhase="idle"; u.logisticsLoadProgress=0; u.dest={x:source.x,z:source.z};
        }
      }
      return;
    }
  }

  // Outbound resupply: finite warehouse stocks -> truck -> forward depot.
  const main=w.primarySupplyDepot(u.team);
  if(!main || main===depot) {
    if(u.cargo>0&&u.logisticsPayload&&moveRoadTruckTo(w,u,depot,dt,16)){const delivered=depositPayload(w,depot,u.logisticsPayload);u.cargo=Math.max(0,u.cargo-delivered);w.roadCargoDelivered[u.team]+=delivered;if(u.cargo<=.001){u.cargo=0;u.logisticsPayload=undefined;}}
    u.mode="idle";u.dest=null;return;
  }
  if(u.cargo<=0) {
    u.dest={x:main.x,z:main.z};u.mode="move";
    if(!moveRoadTruckTo(w,u,u.dest,dt,16))return;
    if(!w.connectedSupplyNodes(u.team).some(n=>n.id===depot.id))return;
    u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
    if(u.logisticsLoadProgress<3)return;
    const payload={ammo:0,fuel:0,repair:0};
    const keys=["ammo","fuel","repair"] as const;
    for(const key of keys){const stockKey=key==="ammo"?"ammoStock":key==="fuel"?"fuelStock":"repairStock";
      const request=Math.min(cap/3,Math.max(0,stockCapacity(w,depot)[key]-(depot[stockKey]??0)));
      const take=Math.min(request,Math.max(0,(main[stockKey]??0)-logisticsConfig.convoyReserve));
      main[stockKey]=(main[stockKey]??0)-take;payload[key]=take;
    }
    u.cargo=payload.ammo+payload.fuel+payload.repair;u.logisticsPayload=payload;u.logisticsLoadProgress=0;
    u.logisticsPhase="loading";
    if(u.cargo<=0){u.mode="idle";return;}
  }
  u.dest={x:depot.x,z:depot.z};u.mode="move";
  if(!moveRoadTruckTo(w,u,u.dest,dt,16))return;
  u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
  if(u.logisticsLoadProgress<3)return;
  const payload=u.logisticsPayload??{ammo:u.cargo*.4,fuel:u.cargo*.4,repair:u.cargo*.2};
  const delivered=depositPayload(w,depot,payload);u.logisticsPayload=payload;u.cargo=payload.ammo+payload.fuel+payload.repair;
  w.roadCargoDelivered[u.team]+=delivered;if(delivered>0)w.events.push({type:"supply-delivered",team:u.team,x:depot.x,z:depot.z,amount:delivered});
  if(u.cargo>0)return;
  u.logisticsPayload=undefined;u.logisticsPhase="idle";u.logisticsLoadProgress=0;u.dest={x:main.x,z:main.z};

}

function moveSeaTo(w:World,u: Entity, target: Point, dt: number): boolean {
  if(outOfFuel(u)){u.motionSpeed=0;return false;}
  const wet=w.waterNav.nearestWater(target,u.def.radius,64);if(!wet){u.motionSpeed=0;return false;}
  if(!u.roadPathGoal||Math.hypot(u.roadPathGoal.x-wet.x,u.roadPathGoal.z-wet.z)>5||!u.navPath.length&&w.time>=(u.roadPathRetryAt??0)){
    u.navPath=findPath(w.waterNav,u,wet,u.def.radius);u.navPathIndex=0;u.roadPathGoal={...wet};u.roadPathRetryAt=w.time+mobility.naval.pathRetry;
  }
  while(u.navPathIndex<u.navPath.length&&dist2d(u,u.navPath[u.navPathIndex])<1)u.navPathIndex++;
  const goal=u.navPath[u.navPathIndex]??wet,d=dist2d(u,goal);
  if(dist2d(u,wet)<mobility.naval.arrival){u.motionSpeed=0;return true;}
  if(!u.navPath.length){u.motionSpeed=0;return false;}
  u.heading=turnToward(u.heading,Math.atan2(goal.x-u.x,goal.z-u.z),u.def.turnRate*dt);
  const engine=u.components?Math.max(.30,1-(u.components.engine??0)/180-(u.components.tracks??0)/260):1;
  const alignment=Math.max(.1,Math.cos(Math.atan2(goal.x-u.x,goal.z-u.z)-u.heading));
  const desired=Math.min(u.def.speed*engine*alignment,Math.sqrt(Math.max(0,dist2d(u,wet)-.5)*mobility.naval.braking));
  u.motionSpeed=(u.motionSpeed??0)+Math.max(-mobility.naval.braking*dt,Math.min(mobility.naval.acceleration*dt,desired-(u.motionSpeed??0)));
  const step=Math.min(d,u.motionSpeed*dt),x=u.x+Math.sin(u.heading)*step,z=u.z+Math.cos(u.heading)*step;
  const clear=(px:number,pz:number)=>!w.entities.some(o=>o!==u&&!o.dead&&o.def.domain==="sea"&&Math.hypot(px-o.x,pz-o.z)<u.def.radius+o.def.radius+mobility.naval.berthSpacing);
  if(w.waterNav.isWalkableWorld(x,z,u.def.radius)&&clear(x,z)){u.x=x;u.z=z;}else {u.motionSpeed=0;u.heading=turnToward(u.heading,Math.atan2(goal.x-u.x,goal.z-u.z),u.def.turnRate*dt*2);
    if(w.time>=(u.roadPathRetryAt??0)){const avoid=w.entities.filter(o=>o!==u&&!o.dead&&o.def.domain==="sea").map(o=>({x:o.x,z:o.z,radius:o.def.radius+mobility.naval.berthSpacing}));u.navPath=findPath(w.waterNav,u,wet,u.def.radius,undefined,avoid);u.navPathIndex=0;u.roadPathRetryAt=w.time+mobility.naval.pathRetry;}
  }
  u.y=w.waterNav.surfaceAt(u.x,u.z)+.15;return false;
}

function taxiTo(u:Entity,p:Point,dt:number):boolean {
  const distance=dist2d(u,p),heading=Math.atan2(p.x-u.x,p.z-u.z);u.heading=turnToward(u.heading,heading,u.def.turnRate*dt);
  const step=Math.min(distance,mobility.aircraft.taxiSpeed*dt);u.motionSpeed=distance>.3?mobility.aircraft.taxiSpeed:0;
  if(distance>.001){u.x+=(p.x-u.x)/distance*step;u.z+=(p.z-u.z)/distance*step;}u.y=heightAt(u.x,u.z);u.flightBank=0;u.flightPitch=0;
  return distance<=.3;
}
function runwayOccupied(w:World,u:Entity,pad:Entity):boolean {
  return w.entities.some(e=>e!==u&&!e.dead&&e.airMissionHomeId===pad.id&&(e.airState==="taxi"&&e.airTaxiPhase!=="apron"||e.airState==="returning"&&e.airLandingPhase==="final"||e.airState==="landing"&&dist2d(e,airFacilityPoint(pad,6))<mobility.aircraft.parkingOffset||e.airState==="airborne"&&(e.airSortieTime??0)<mobility.aircraft.launchSeparation));
}

/** Kinematic flight is simulated: inertia, bank, climb and approach are saved state. */
function finishMoveWaypoint(u:Entity):void {
  const next=u.moveQueue?.shift(),style=u.moveQueueStyles?.shift();
  u.fastMove=style==="fast-move";u.mode=next?(style==="amove"?"amove":style?"move":u.queuedMoveType??"move"):"idle";
  u.dest=next??null;u.navPath=[];u.navPathIndex=0;u.flowField=null;
  if(next){const length=Math.hypot(next.x-u.x,next.z-u.z)||1;u.moveAxis={x:(next.x-u.x)/length,z:(next.z-u.z)/length};}
}

function moveAirTo(u: Entity, target: Point, dt: number, w: World, cruise=false): boolean {
  const helicopter=u.def.category==="heli",profile=helicopter?mobility.helicopter:mobility.aircraft;
  const ground=heightAt(u.x,u.z),distance=Math.hypot(target.x-u.x,target.z-u.z);
  const cargoLanding=u.kind==="cargoPlane"&&u.cargo>0;
  const landing=!cruise&&(u.airState==="returning"||cargoLanding||["transport-load","transport-unload"].includes(u.mode)||u.kind==="transport"&&u.supplyDepotId!=null);
  const final=landing&&(helicopter||u.airLandingPhase==="final"||cargoLanding&&distance<80);
  const desiredAltitude=ground+(final?Math.min(profile.altitude,Math.max(0,(distance-8)*(helicopter?.85:.24))):u.airState==="returning"?20:profile.altitude+(u.airMission==="cap"&&!helicopter?15:0));
  const oldY=u.y;
  u.y+=Math.max(-profile.descentRate*dt,Math.min(profile.climbRate*dt,desiredAltitude-u.y));
  if(distance<(helicopter?2.5:8)&&landing&&u.y-ground<3){u.motionSpeed=0;if(landing)u.y=ground;u.flightBank=(u.flightBank??0)*Math.max(0,1-dt*4);return true;}
  if(!helicopter&&!landing&&distance<18&&u.mode!=="patrol"){finishMoveWaypoint(u);u.flightOrbitCenter=u.dest?undefined:{...target};}
  const desiredHeading=Math.atan2(target.x-u.x,target.z-u.z),oldHeading=u.heading;
  const speed=u.motionSpeed??0;
  const turnRate=helicopter?u.def.turnRate:final?Math.max(1.2,u.def.turnRate):Math.min(u.def.turnRate,.65+12/Math.max(15,speed));
  u.heading=turnToward(u.heading,desiredHeading,turnRate*dt);
  const delta=wrapAngle(u.heading-oldHeading)/dt;
  const bank=Math.max(-profile.maxBank,Math.min(profile.maxBank,-delta*(helicopter?.18:.48)));
  u.flightBank=(u.flightBank??0)+(bank-(u.flightBank??0))*Math.min(1,dt*3);
  u.flightPitch=(u.flightPitch??0)+(Math.max(-.22,Math.min(.22,-(u.y-oldY)/Math.max(1,speed*dt)))-(u.flightPitch??0))*Math.min(1,dt*3);
  const desiredSpeed=outOfFuel(u)?0:helicopter?Math.min(u.def.speed,Math.sqrt(Math.max(0,distance-2)*profile.braking)):final?Math.min(u.def.speed*.48,Math.max(4,distance*.8)):u.def.speed*Math.max(mobility.aircraft.minimumSpeed,1-Math.abs(u.flightBank??0)*.35);
  const acceleration=desiredSpeed>speed?profile.acceleration:profile.braking;
  u.motionSpeed=speed+Math.max(-acceleration*dt,Math.min(acceleration*dt,desiredSpeed-speed));
  const step=Math.min(final||helicopter?distance:Infinity,u.motionSpeed*dt);
  const heading=final?desiredHeading:u.heading;
  u.x+=Math.sin(heading)*step;u.z+=Math.cos(heading)*step;
  const limit=MAP_SIZE/2-8;
  if(Math.abs(u.x)>limit||Math.abs(u.z)>limit){u.heading=turnToward(u.heading,Math.atan2(-u.x,-u.z),turnRate*dt*3);u.x=Math.max(-limit,Math.min(limit,u.x));u.z=Math.max(-limit,Math.min(limit,u.z));}
  void w;
  return false;
}

function updateLandingCraft(w: World, u: Entity, dt: number): void {
  if (u.mode === "transport-load") {
    const target = u.transportTargetId ? w.byId.get(u.transportTargetId) : null;
    if (!target || target.dead || target.loadedIntoId !== null) { u.mode = "idle"; u.transportTargetId = null; return; }
    if (!moveSeaTo(w,u, {x:target.x,z:target.z}, dt)||dist2d(u,target)>14) return;
    if (u.cargoUnitIds.length < 8) { target.loadedIntoId=u.id; target.mode="idle"; target.dest=null; target.target=null; u.cargoUnitIds.push(target.id); }
    u.transportTargetId=null; u.mode="idle"; u.dest=null; return;
  }
  if (u.mode === "transport-unload") {
    if (!u.unloadPoint) { u.mode="idle"; return; }
    if (!moveSeaTo(w,u,u.unloadPoint,dt)) return;
    const remaining:number[]=[];
    for(const id of u.cargoUnitIds){const passenger=w.byId.get(id);if(!passenger||passenger.dead)continue;
      const offset=u.cargoUnitIds.indexOf(id)*3;
      const p=w.nav.nearestWalkable({x:u.unloadPoint.x,z:u.unloadPoint.z+offset},passenger.def.radius);
      if(!p||dist2d(u,p)>24){remaining.push(id);continue;}
      passenger.loadedIntoId=null;passenger.x=passenger.px=p.x;passenger.z=passenger.pz=p.z;passenger.y=heightAt(p.x,p.z);passenger.mode="idle";
    }
    if(remaining.length){u.cargoUnitIds=remaining;return;}

    u.cargoUnitIds=[]; u.unloadPoint=null; u.mode="idle"; u.dest=null; return;
  }
  const goal=u.target&&!u.target.dead?{x:u.target.x,z:u.target.z}:u.dest; if(goal&&moveSeaTo(w,u,goal,dt)&&["move","amove"].includes(u.mode))finishMoveWaypoint(u);
}

function updateCargoPlane(w: World, u: Entity, dt: number): void {
  let base = u.logisticsHome;
  if (!base) { w.airCargoLost[u.team]+=u.cargo;u.cargo=0;u.dead = true; return; }
  // Cargo also needs a real, usable receiving airbase. Divert if its original runway is lost.
  if (u.cargo > 0 && u.logisticsPhase === "idle") {
    let destination=w.entities.find(e=>!e.dead&&!e.underConstruction&&(e.disabledUntil??0)<=w.time&&e.team===u.team&&e.kind==="airbase"&&Math.hypot(e.x-base!.x,e.z-base!.z)<15);
    if(!destination){
      destination=w.entities.filter(e=>!e.dead&&!e.underConstruction&&(e.disabledUntil??0)<=w.time&&e.team===u.team&&e.kind==="airbase"&&w.producerLevel(e)>=2).sort((a,b)=>dist2d(u,a)-dist2d(u,b)||a.id-b.id)[0];
      if(destination){base={x:destination.x,z:destination.z};u.logisticsHome=base;}
      else {u.logisticsPhase="loading";u.dest={x:u.team===0?MAP_SIZE/2-10:-MAP_SIZE/2+10,z:base.z};return;}
    }
    u.mode = "patrol"; u.dest = base;
    if (!moveAirTo(u, base, dt, w)) return;
    let delivered = 0;
    const depot=w.nearestSupplyDepot(u.team,destination,false);
    if(depot)delivered=w.receiveSupply(depot,u.cargo);
    w.airCargoDelivered[u.team] += delivered;
    if(delivered>0)w.events.push({ type: "supply-delivered", team: u.team, x: u.x, z: u.z, amount: delivered });
    u.cargo=Math.max(0,u.cargo-delivered);if(u.cargo>0)return;
    u.logisticsPhase = "loading";
    // Turn around and leave the map.
    const exitX = u.team === 0 ? MAP_SIZE/2-10 : -MAP_SIZE/2+10;
    u.dest = { x: exitX, z: base.z };
    return;
  }
  if (u.logisticsPhase === "loading") {
    moveAirTo(u, u.dest ?? {x: u.team === 0 ? MAP_SIZE/2-10 : -MAP_SIZE/2+10, z: base.z}, dt, w);
    // Reaching the edge removes the flight from the battlefield.
    if (Math.abs(u.x) > MAP_SIZE/2-22) {w.airCargoPool[u.team]+=u.cargo;u.cargo=0;u.dead = true;}
  }
}

function updateTransport(w: World, u: Entity, dt: number): void {
  if (u.mode === "transport-load" || u.mode === "transport-unload") {
    prepareTransport(w,u);
    if(u.dest){moveAirTo(u,u.dest,dt,w);prepareTransport(w,u);}
    return;
  }
  if(u.supplyDepotId==null){
    if(u.dest&&!outOfFuel(u)){
      moveAirTo(u,u.dest,dt,w);
      if(dist2d(u,u.dest)<3&&(u.motionSpeed??0)<1){
        if(u.mode==="patrol"&&u.patrolPoints.length){u.patrolIndex=(u.patrolIndex+1)%u.patrolPoints.length;u.dest=u.patrolPoints[u.patrolIndex];}
        else finishMoveWaypoint(u);
      }
    }
    return;
  }
  const depot=w.byId.get(u.supplyDepotId);
  if(!depot||depot.dead){
    const replacement=w.primarySupplyDepot(u.team);
    if(!replacement){u.mode="idle";u.dest=null;return;}
    u.supplyDepotId=replacement.id;u.logisticsHome={x:replacement.x-replacement.def.radius-5,z:replacement.z};return;
  }
  const home=u.logisticsHome??{x:depot.x-depot.def.radius-5,z:depot.z};u.logisticsHome=home;
  if(outOfFuel(u)&&u.y-heightAt(u.x,u.z)>3){u.hp=0;u.dead=true;w.lossValue[u.team]+=u.def.cost;w.roadCargoLost[u.team]+=u.cargo;u.cargo=0;w.events.push({type:"death",x:u.x,y:u.y,z:u.z,big:false,kind:u.kind});return;}
  if(outOfFuel(u)){u.motionSpeed=0;u.mode="idle";u.dest=null;return;}
  const valid=(i:number)=>{const rp=w.resourcePoints[i];return (depot.preferredResourceIndex==null||depot.preferredResourceIndex===i)&&!!rp&&rp.controlledBy===u.team&&rp.active&&(rp.disabledUntil??0)<=w.time;};
  if(u.cargo<=0){
    const current=u.logisticsSourceIndex;
    if(current==null||!valid(current)||(w.resourcePoints[current].amount??0)<1){
      const next=w.resourcePoints.map((r,i)=>({r,i})).filter(({r,i})=>valid(i)&&r.amount>=1)
        .sort((a,b)=>Math.hypot(a.r.x-u.x,a.r.z-u.z)-Math.hypot(b.r.x-u.x,b.r.z-u.z))[0];
      u.logisticsSourceIndex=next?.i??null;u.logisticsTarget=next?{x:next.r.x,z:next.r.z}:null;u.logisticsLoadProgress=0;
    }
  }
  const groundedAtHome=dist2d(u,home)<3&&u.y-heightAt(u.x,u.z)<3;
  const routeDistance=u.logisticsTarget?[home,...depot.logisticsWaypoints??[],u.logisticsTarget].reduce((sum,p,i,points)=>sum+(i?dist2d(points[i-1],p):0),0):0;
  const tripFuel=u.logisticsTarget?Math.min(u.maxFuel??1200,logisticsConfig.air.reserveFuel+routeDistance*2/Math.max(1,u.def.speed)*(u.def.fuelUsePerSec??3.2)+55):logisticsConfig.air.reserveFuel;
  const returnHome=u.cargo>0||depot.logisticsPaused||!u.logisticsTarget||(u.fuel??0)<logisticsConfig.air.reserveFuel||groundedAtHome&&(u.fuel??0)<tripFuel||!w.productionOperational(depot).operational;
  const target=returnHome?home:u.logisticsTarget!;
  u.dest=target;u.mode="patrol";
  const route=depot.logisticsWaypoints??[],leg=`${returnHome?"home":"source"}:${u.logisticsSourceIndex}`;
  if(u.routeLeg!==leg){u.routeLeg=leg;u.routeWaypointIndex=0;}
  while((u.routeWaypointIndex??0)<route.length){
    const index=u.routeWaypointIndex??0,point=route[returnHome?route.length-1-index:index];
    if(dist2d(u,point)<6){u.routeWaypointIndex=index+1;continue;}
    u.dest=point;moveAirTo(u,point,dt,w,true);return;
  }
  if(!moveAirTo(u,target,dt,w))return;
  u.motionSpeed=0;
  const level=w.supplyDepotLevel(depot),config=logisticsConfig.air;
  if(returnHome){
    if(u.cargo>0){
      u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
      if(u.logisticsLoadProgress<Math.max(1.2,config.unloadTime-level*config.unloadTimeReduction))return;
      const delivered=w.receiveSupply(depot,u.cargo);w.roadCargoDelivered[u.team]+=delivered;if(delivered>0)w.events.push({type:"supply-delivered",team:u.team,x:u.x,z:u.z,amount:delivered});
      u.cargo=Math.max(0,u.cargo-delivered);if(u.cargo<=.001){u.cargo=0;u.logisticsPhase="idle";u.logisticsLoadProgress=0;}
    }
    // Refuel from real warehouse stock on the ground before the next sortie.
    const take=Math.min((u.maxFuel??0)-(u.fuel??0),depot.fuelStock??0,24*dt);
    depot.fuelStock=(depot.fuelStock??0)-take;u.fuel=(u.fuel??0)+take;
    if((u.fuel??0)<config.reserveFuel*2){u.dest=null;u.mode="idle";return;}
    return;
  }
  const index=u.logisticsSourceIndex;if(index==null||!valid(index))return;
  const source=w.resourcePoints[index];
  u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
  if(u.logisticsLoadProgress>=Math.max(2.2,config.loadTime-level*config.loadTimeReduction)){
    const loaded=Math.min(config.capacity+level*config.capacityPerLevel,Math.floor(source.amount));
    source.amount-=loaded;u.cargo=loaded;u.logisticsPhase="loading";u.logisticsLoadProgress=0;
  }

}

const groupLabels=new WeakMap<number[],string>();
function groupKey(u:Entity):string {
  const ids=u.moveGroup!;let label=groupLabels.get(ids);if(!label){label=ids.join(',');groupLabels.set(ids,label);}
  return label+'/'+u.moveAxis!.x+','+u.moveAxis!.z;
}
export function updateUnits(w: World, dt: number): void {
  // Derived membership is shared per tick; ordering uses live positions so merges cannot use stale priority.
  const groups=new Map<string,Entity[]>();
  for(const u of w.entities)if(!u.dead&&u.moveGroup&&u.moveAxis&&["move","amove"].includes(u.mode)){
    const key=groupKey(u);if(groups.has(key))continue;
    groups.set(key,u.moveGroup.map(id=>w.byId.get(id)).filter((e):e is Entity=>!!e&&!e.dead&&e.loadedIntoId==null&&["move","amove"].includes(e.mode)));
  }
  for (const u of w.entities) if (!u.dead && u.loadedIntoId === null) stepUnit(w, u, dt,groups);
}

function stepUnit(w: World, u: Entity, dt: number,groups:Map<string,Entity[]>): void {
  const d = u.def;u.navWaiting=false;
  const transporting=d.domain!=="air"&&transportCapacity(u)>0&&prepareTransport(w,u);
  if (u.kind === "cargoPlane") { updateCargoPlane(w, u, dt); return; }
  if (u.kind === "transport"&&u.supplyDepotId!=null) { updateTransport(w, u, dt); return; }
  if (u.kind === "logiTruck") { updateRoadTruck(w, u, dt); return; }
  if (u.kind === "landingcraft") { updateLandingCraft(w, u, dt); return; }
  if (u.kind === "special" && !u.garrisonId && u.standingOrder!=="holdfire" && ["idle","amove","sabotage"].includes(u.mode)) {
    const target = w.entities.find(e=>!e.dead && e.team!==u.team && e.def.building && isSpottedBy(e,u.team,w.time) && Math.hypot(e.x-u.x,e.z-u.z)<7);
    if (target) { target.hp = Math.max(0,target.hp-18*dt); w.sabotageBuilding(target, 25); u.mode="sabotage"; u.target=target; if(target.hp<=0) { target.dead=true; w.lossValue[target.team] += target.def.cost; } return; }
  }
  const disabled = (u.disabledUntil ?? 0) > w.time;
  const combatSpeedFactor = disabled ? 0.25 : 1;
  if (u.kind === "engineer" && (u.mode === "build" || u.mode === "repair")) {
    const target = u.target;

    if (!target || target.dead) { u.mode = "idle"; u.target = null; u.dest = null; return; }
    if (target.def.speed > 0 && !target.def.building) {
      if (Math.hypot(u.x - target.x, u.z - target.z) <= 12) {
        const depot=repairDepotFor(w,target),available=depot?.repairStock??0;
        const work=Math.max(maxHitPoints(target)-target.hp,Math.max(0,...Object.values(target.components??{}))/logisticsConfig.groundRepair.componentPerStock);
        if(work<=0){u.mode="idle";u.target=null;u.dest=null;u.motionSpeed=0;return;}
        const repair=Math.min(logisticsConfig.groundRepair.perSecond*w.repairMultiplier(u.team)*dt,available,work);
        u.motionSpeed=0;
        if (depot&&repair>0) depot.repairStock = Math.max(0, available - repair);
        if (repair > 0) {
          target.hp = Math.min(maxHitPoints(target), target.hp + repair);
          if (target.components) {
            const step = repair * logisticsConfig.groundRepair.componentPerStock;
            for (const key of ["engine","tracks","turret","weapon","crew","ammo"] as const) target.components[key] = Math.max(0, target.components[key] - step);
          }
          target.disabledUntil = Math.max(0, Math.min(target.disabledUntil ?? 0, w.time + 0.5));
          if (target.hp >= maxHitPoints(target) * 0.995 && (!target.components || Object.values(target.components).every(v => v < 1))) {
            target.hp = maxHitPoints(target); u.mode = "idle"; u.target = null; u.dest = null;
          }
        }
        return;
      }
    }
    const taskReach=target.def.building?13:12;
    if (Math.hypot(u.x - target.x, u.z - target.z) > taskReach) moveRoadTruckTo(w,u,target,dt,taskReach-.5);
    else u.motionSpeed=0;
    return;
  }
  const supplyFactor = u.def.speed === 0 || (u.supply ?? 100) > 20 ? 1 : 0.65;
  let effectiveRange = effectiveWeaponRange(u);u.firingRange=effectiveRange;
  u.cooldown = Math.max(0, u.cooldown - dt);
  if(u.weaponCooldowns)for(let i=1;i<u.weaponCooldowns.length;i++)u.weaponCooldowns[i]=Math.max(0,u.weaponCooldowns[i]-dt);

  if (u.fireMission && !u.artilleryDisplace && ["artillery","mortar","mlrs"].includes(u.kind)) {u.target=null;u.motionSpeed=Math.max(0,(u.motionSpeed??0)-mobilityProfile(u).braking*dt);return;}
  if (!d.damage && d.speed === 0) return;

  const isAir = d.armor === "air";
  if (isAir) {
    const helicopter=d.category==="heli",home=w.byId.get(u.airMissionHomeId??-1);
    let pad=home&&!home.dead&&!home.underConstruction&&(!["returning","airborne"].includes(u.airState??"")||(home.disabledUntil??0)<=w.time)&&home.kind===(helicopter?"helipad":"airbase")?home:null;
    if(!pad&&!["grounded","rearming","landing"].includes(u.airState??"")){
      const alternatives=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind===(helicopter?"helipad":"airbase")&&(e.disabledUntil??0)<=w.time&&freeAirSlot(w,e)>=0).sort((a,b)=>dist2d(u,a)-dist2d(u,b)||a.id-b.id);
      pad=alternatives[0]??null;if(pad){u.airHomeSlot=freeAirSlot(w,pad);u.airMissionHomeId=pad.id;u.airState="returning";u.airReturnReason="base";u.airLandingPhase="approach";}
    }
    const armed=(u.maxAmmo??0)>0;
    if(u.airState==="grounded"||u.airState==="rearming"){
      const depot=pad?w.nearestSupplyDepot(u.team,pad,false):null;
      if(pad&&depot&&dist2d(u,airParkingPoint(u,pad))<2&&dist2d(depot,pad)<80&&(pad.disabledUntil??0)<=w.time&&w.hasCommandLink(pad)&&w.powerStatus(u.team).ratio>=.25){
        const fuel=Math.max(0,Math.min((u.maxFuel??0)-(u.fuel??0),34*dt,depot.fuelStock??0));
        const ammo=Math.max(0,Math.min((u.maxAmmo??0)-(u.ammo??0),2.2*dt,depot.ammoStock??0));
        const repair=Math.max(0,Math.min(Math.max(maxHitPoints(u)-u.hp,Math.max(0,...Object.values(u.components??{}))/logisticsConfig.groundRepair.componentPerStock),maxHitPoints(u)*.05*dt,depot.repairStock??0));
        u.fuel=(u.fuel??0)+fuel;u.ammo=(u.ammo??0)+ammo;u.hp=Math.min(maxHitPoints(u),u.hp+repair);if(u.components)for(const key of ["engine","tracks","turret","weapon","crew","ammo"] as const)u.components[key]=Math.max(0,u.components[key]-repair*logisticsConfig.groundRepair.componentPerStock);depot.ammoStock=(depot.ammoStock??0)-ammo;
        if(u.secondaryAmmo)for(let i=1;i<(d.weapons?.length??0);i++){const spec=weaponSpec(u,i),take=Math.max(0,Math.min(spec.ammoCapacity-weaponAmmo(u,i),4.5*dt,depot.ammoStock??0));u.secondaryAmmo[i]+=take;depot.ammoStock=(depot.ammoStock??0)-take;}
        depot.fuelStock=(depot.fuelStock??0)-fuel;depot.repairStock=(depot.repairStock??0)-repair;
      }
      const loaded=(u.ammo??0)>=(u.maxAmmo??0)*.95&&(d.weapons??[]).every((s,i)=>i===0||weaponAmmo(u,i)>=s.ammoCapacity*.95);
      if(u.airState==="rearming"&&loaded&&(u.fuel??0)>=(u.maxFuel??0)*.95)u.airState="grounded";
      if(u.airState==="grounded"&&pad&&w.productionOperational(pad).operational&&(u.fuel??0)>(u.maxFuel??0)*.3&&hasAirMissionAmmo(u)&&["attack","amove","move","patrol","transport-load","transport-unload"].includes(u.mode)){
        u.airState="taxi";u.airTaxiPhase="apron";u.airSortieTime=0;u.airReturnReason=null;
      }else return;
    }
    if(u.airState==="taxi"){
      if(pad&&!w.productionOperational(pad).operational){u.airState=helicopter&&u.y-heightAt(u.x,u.z)>3?"returning":"landing";u.airReturnReason="base";u.airLandingPhase="approach";u.motionSpeed=0;return;}
      if(!pad){u.airState=helicopter&&u.y-heightAt(u.x,u.z)>3?"airborne":"grounded";u.mode="idle";u.dest=null;u.motionSpeed=0;return;}
      u.airSortieTime=(u.airSortieTime??0)+dt;
      if(helicopter){
        u.y=Math.min(heightAt(u.x,u.z)+mobility.helicopter.altitude,u.y+mobility.helicopter.climbRate*dt);u.motionSpeed=0;
        if(u.airSortieTime<mobility.helicopter.takeoffTime)return;
      }else {
        if(u.airTaxiPhase==="apron"||u.airTaxiPhase==null){
          const holding=airFacilityPoint(pad,mobility.aircraft.runwayStart,mobility.aircraft.parkingOffset);
          if(!taxiTo(u,holding,dt)||runwayOccupied(w,u,pad))return;u.airTaxiPhase="lining-up";
        }
        if(u.airTaxiPhase==="lining-up"){
          if(!taxiTo(u,airFacilityPoint(pad,mobility.aircraft.runwayStart),dt))return;u.airTaxiPhase="runway";u.motionSpeed=0;
        }
        u.heading=pad.heading;u.motionSpeed=Math.min(d.speed*.65,(u.motionSpeed??0)+mobility.aircraft.acceleration*dt);
        u.x+=Math.sin(u.heading)*u.motionSpeed*dt;u.z+=Math.cos(u.heading)*u.motionSpeed*dt;u.y=heightAt(u.x,u.z);
        const forward=(u.x-pad.x)*Math.sin(pad.heading)+(u.z-pad.z)*Math.cos(pad.heading);
        if(forward<mobility.aircraft.runwayEnd)return;
      }
      u.airState="airborne";u.airSortieCount=(u.airSortieCount??0)+1;u.airSortieTime=0;u.airLandingPhase=undefined;
    }
    u.airSortieTime=(u.airSortieTime??0)+dt;
    if(u.airState==="airborne")updateAirDoctrine(w,u,dt);
    const returnFuel=pad?(dist2d(u,pad)/Math.max(1,d.speed*mobility.combat.airReturnSpeedFraction)+mobility.combat.airReturnLandingSeconds)*(d.fuelUsePerSec??1)*mobility.combat.airReturnFuelMargin:0;
    const reason=(u.fuel??0)<Math.max((u.maxFuel??0)*mobility.combat.airReturnFuelFraction,returnFuel)?"fuel":armed&&!hasAirMissionAmmo(u)?"ammo":u.hp<maxHitPoints(u)*mobility.combat.airReturnHealthFraction||Math.max(0,...Object.values(u.components??{}))>mobility.combat.airReturnComponentDamage?"damage":null;
    if(reason&&u.airState!=="returning"&&u.airState!=="landing"){u.airState="returning";u.airReturnReason=reason;u.airLandingPhase="approach";}
    if((u.fuel??0)<=0){u.hp=0;u.dead=true;w.lossValue[u.team]+=d.cost;return;}
    if(u.airState==="landing"){
      if(pad&&taxiTo(u,airParkingPoint(u,pad),dt)){u.airState="rearming";u.mode="idle";u.dest=null;u.target=null;u.airMission=null;u.airMissionPoint=null;u.patrolPoints=[];u.flightOrbitCenter=undefined;}
      return;
    }
    if(u.airState==="returning"){
      u.target=null;u.mode="move";
      if(pad){
        const touchdown=helicopter?airParkingPoint(u,pad):airFacilityPoint(pad,6);u.dest=touchdown;
        if(!helicopter&&u.airLandingPhase!=="final"){
          const approach=airFacilityPoint(pad,mobility.aircraft.runwayStart-70);
          if(dist2d(u,approach)>18||runwayOccupied(w,u,pad)){moveAirTo(u,approach,dt,w);return;}
          u.airLandingPhase="final";
        }
        if(moveAirTo(u,touchdown,dt,w)){u.airState="landing";u.flightBank=0;u.flightPitch=0;}
      }else {u.dest=null;const angle=w.time*.22+u.id;moveAirTo(u,{x:u.x+Math.sin(angle)*35,z:u.z+Math.cos(angle)*35},dt,w,true);}
      return;
    }
    if(u.kind==="transport"){updateTransport(w,u,dt);return;}
  }

  // Hold fire preserves travel orders but cannot make scouts chase contacts.
  if(u.standingOrder==="holdfire"||moraleState(u)==="routing")u.target=null;
  const mayAcquire=u.standingOrder!=="holdfire"&&moraleState(u)!=="routing";
  // sihtmärgi valik – throttle retarget (~every 4 ticks staggered by id)
  if (mayAcquire&&u.mode === "attack" && (!u.target || u.target.dead)) {
    u.target = nearestEnemy(w, u, Math.max(effectiveRange, u.aggro));
    if (!u.target) u.mode = "idle";
  }
  if (mayAcquire&&u.mode !== "attack") {
    const lim = u.mode === "move" ? effectiveRange : Math.max(effectiveRange, u.aggro);
    const tick = Math.floor(w.time * 30);
    const reconsider=!!u.target&&(tick+u.id)%mobility.combat.reconsiderTicks===0&&(!canEngage(u,u.target)||(!["artillery","mortar","mlrs"].includes(u.kind)&&!w.vision.hasLineOfSight(u,u.target)));
    const needNew = !u.target || u.target.dead || !isSpottedBy(u.target,u.team,w.time) || !canEngage(u,u.target) || dist2d(u, u.target) - u.target.def.radius > lim * 1.15 || reconsider;
    if (needNew) {
      if ((tick + u.id) % 4 === 0 || !u.target || u.target.dead || reconsider) {
        u.target = nearestEnemy(w, u, lim);
      }
    }
  }
  const t = u.target;
  // Keep only the last spotted attack position after contact is lost.
  if(t&&u.mode==="attack"&&isSpottedBy(t,u.team,w.time)){u.dest={x:t.x,z:t.z};}
  if (t && (!isSpottedBy(t,u.team,w.time) || !canEngage(u,t))) {
    if (u.mode === "attack") u.mode="amove";
    u.target=null;
  }
  if (u.mode === "patrol" && u.patrolPoints.length && u.dest && Math.hypot(u.x-u.dest.x,u.z-u.dest.z) < (d.category==="air"?18:3)) {
    u.patrolIndex = (u.patrolIndex + 1) % u.patrolPoints.length; u.dest = u.patrolPoints[u.patrolIndex]; u.navPath = []; u.navPathIndex = 0;
  }
  if(transporting)u.target=null;
  const target = u.target;
  if(target){effectiveRange=effectiveWeaponRange(u,target);u.firingRange=effectiveRange;}
  const inRange = !!target && dist2d(u, target) - target.def.radius <= effectiveRange * mobility.combat.stoppingRange;
  let goal: Point | null = null;
  const indirect=["artillery","mortar","mlrs"].includes(u.kind);
  const clearShot=!target || indirect || w.vision.hasLineOfSight(u,target);
  if(transporting)goal=u.dest;
  else if(target&&u.mode!=="move"&&u.mode!=="enter-building"){
    const index=selectWeapon(u,target),minimum=index>=0?weaponSpec(u,index).minimumRange:0;
    const tooClose=d.domain==="land"&&d.category!=="infantry"&&dist2d(u,target)<Math.max(minimum+u.def.radius+target.def.radius,effectiveRange*mobility.combat.vehicleMinimumStandoff);
    if(tooClose)u.combatWithdrawing=true;
    if(dist2d(u,target)>=Math.max(minimum+u.def.radius+target.def.radius,effectiveRange*mobility.combat.vehicleStandoffRelease))u.combatWithdrawing=false;
    if((!inRange||!clearShot||dist2d(u,target)<minimum||u.combatWithdrawing)&&!u.holdPosition&&u.mode!=="hold"){
      if(d.armor!=="air"&&d.domain!=="sea"&&d.speed>0)goal=firingPosition(w,u,target,effectiveRange);
      else goal=target;
    }
  }else if(["move","amove","patrol","enter-building"].includes(u.mode))goal=u.dest;
  if(target && d.category==="heli" && u.mode!=="move" && !u.holdPosition && u.mode!=="hold"){
    const distance=dist2d(u,target),standoff=effectiveRange*mobility.combat.helicopterStandoff;
    if(distance<standoff*mobility.combat.helicopterRetreatRatio){const a=Math.atan2(u.x-target.x,u.z-target.z);goal={x:target.x+Math.sin(a)*standoff,z:target.z+Math.cos(a)*standoff};}
    else if(!inRange){const a=Math.atan2(u.x-target.x,u.z-target.z);goal={x:target.x+Math.sin(a)*standoff,z:target.z+Math.cos(a)*standoff};}
  }
  if(u.garrisonId){goal=null;u.motionSpeed=0;u.holdPosition=true;}
  if(goal&&u.moveGroup&&u.moveAxis&&["move","amove"].includes(u.mode)&&d.domain!=="air"&&d.domain!=="sea"&&dist2d(u,goal)>mobility.navigation.groupReformDistance){
    const axis=u.moveAxis;
    const members=(groups.get(groupKey(u))??[]).filter(e=>["move","amove"].includes(e.mode)).sort((a,b)=>(b.x-a.x)*axis.x+(b.z-a.z)*axis.z||a.id-b.id);
    const rank=members.indexOf(u),front=members[rank-1];
    if(front&&front.dest&&dist2d(u,front)<mobility.navigation.groupJoinDistance){
      const width=Math.max(mobility.navigation.columnWidth,d.radius*mobility.navigation.columnRadiusFactor);
      const narrow=!w.nav.isWalkableWorld(front.x-axis.z*width,front.z+axis.x*width,d.radius)||!w.nav.isWalkableWorld(front.x+axis.z*width,front.z-axis.x*width,d.radius);
      if(narrow){const gap=u.def.radius+front.def.radius+mobility.navigation.columnGap;goal=dist2d(u,front)<=gap+1?null:{x:front.x-axis.x*gap,z:front.z-axis.z*gap};}
    }
  }
  if(goal && d.armor!=="air" && d.domain!=="sea" && (!u.roadPathGoal || Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)>5 || !u.navPath.length && w.time>=(u.roadPathRetryAt??0))) {
    u.navPath=findPath(w.nav,u,goal,d.radius,u.fastMove&&u.mode==="move"?travelPathCost(w,u):undefined);u.navPathIndex=0;u.roadPathGoal={x:goal.x,z:goal.z};u.roadPathRetryAt=w.time+1.5;
  }

  // liikumine
  if (d.speed > 0) {
    const isAir = d.armor === "air";
    if (isAir && u.airState === "grounded") return;
    if(isAir){
      if(u.flightAttackExit&&(dist2d(u,u.flightAttackExit)<mobility.combat.airEgressArrival||w.time>=(u.flightAttackExitUntil??0))){u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;}
      if(d.category!=="heli"&&target)goal=u.flightAttackExit??{x:target.x,z:target.z};
      else if(u.flightAttackExit)goal=u.flightAttackExit;
      if(d.category!=="heli"){
        if(goal)u.flightOrbitCenter=undefined;
        else {const center=u.flightOrbitCenter??{x:u.x,z:u.z};u.flightOrbitCenter=center;const angle=w.time*.22+u.id;goal={x:center.x+Math.sin(angle)*45,z:center.z+Math.cos(angle)*45};}
      }
      if(goal)moveAirTo(u,goal,dt,w);
      else {u.motionSpeed=Math.max(0,(u.motionSpeed??0)-mobility.helicopter.braking*dt);u.y+=Math.max(-4*dt,Math.min(4*dt,heightAt(u.x,u.z)+mobility.helicopter.altitude-u.y));u.flightBank=(u.flightBank??0)*Math.max(0,1-dt*4);}
    }
    if(u.def.domain==="sea") {if(goal&&!outOfFuel(u)){if(moveSeaTo(w,u,goal,dt)&&["move","amove"].includes(u.mode))finishMoveWaypoint(u);}else u.motionSpeed=0;}
    let sx = 0, sz = 0;
    // Spatial separation – only nearby cells (was O(n²) over all entities)
    const sepRange = d.radius + 10;
    const sepRange2 = sepRange * sepRange;
    w.spatial.queryRadius(u.x, u.z, sepRange, (o) => {
      if (o === u || o.dead || o.garrisonId || o.loadedIntoId!==null || (o.def.armor==="air") !== isAir) return;
      const ox = u.x - o.x, oz = u.z - o.z;
      const d2 = ox * ox + oz * oz;
      if (d2 > sepRange2 || d2 < 1e-4) return;
      const m = d.radius + o.def.radius + 0.85;
      if (d2 < m * m) {
        const dd = Math.sqrt(d2), k = ((m - dd) / m) * (o.def.speed === 0 ? 3.4 : 1.25);
        sx += (ox / dd) * k; sz += (oz / dd) * k;
      }
    });
    let dx = 0, dz = 0, moving = false;
    if (goal) {
      const gx = goal.x - u.x, gz = goal.z - u.z, gd = Math.hypot(gx, gz);
      if (u.def.domain!=="sea" && goal === u.dest && gd < mobility.navigation.arrival && u.mode!=="patrol"&&u.mode!=="enter-building"&&!transporting) {
        finishMoveWaypoint(u);
      }
      else { dx = gx / gd; dz = gz / gd; moving = true; }
    }
    if (moving && !isAir && u.def.domain!=="sea") {
      let navDx = dx, navDz = dz;
      if (u.navPath.length) {
        while (u.navPathIndex < u.navPath.length && Math.hypot(u.x - u.navPath[u.navPathIndex].x, u.z - u.navPath[u.navPathIndex].z) < Math.max(mobility.navigation.arrival,w.nav.cellSize*.75)) u.navPathIndex++;
        smoothWaypoint(w,u);
        if (u.navPathIndex < u.navPath.length) { const p = u.navPath[u.navPathIndex], m = Math.hypot(p.x-u.x,p.z-u.z)||1; navDx=(p.x-u.x)/m; navDz=(p.z-u.z)/m; }
      } else if (u.flowField && isAir) {
        const f = u.flowField.directionAt(u, u.def.radius);
        if (f) { navDx=f.x; navDz=f.z; }
      }
      let ex = navDx + sx * .65, ez = navDz + sz * .65;
      const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l;
      const reverse=!!u.combatWithdrawing&&!!d.turret;
      const want = Math.atan2(reverse?-ex:ex, reverse?-ez:ez);
      u.heading = turnToward(u.heading, want, d.turnRate * dt);
      const diff = Math.abs(wrapAngle(want - u.heading));
      const slope = (heightAt(u.x + ex * 2, u.z + ez * 2) - u.y) / 2;
      const terrainMod=groundTerrainFactor(w,u);
      const supplyMove = (u.supply ?? 100) > 10 ? 1 : 0.78;
      const roleMove = u.role === "siege" ? 0.92 : 1;
      const fuelMul = outOfFuel(u) ? 0 : 1;
      const componentMove=u.components?Math.max(.15,1-u.components.engine/160-u.components.tracks/180):1;
      const sp = d.speed * componentMove * combatSpeedFactor * terrainMod * supplyMove * roleMove * moraleSpeedMul(u) * fuelMul * Math.min(1.3, Math.max(0.35, 1 - slope * 1.2)) * (d.category === "infantry" ? 1 : Math.max(0, Math.cos(diff)));
      const profile=mobilityProfile(u);
      const distanceToWaypoint=u.navPathIndex<u.navPath.length?Math.hypot(u.x-u.navPath[u.navPathIndex].x,u.z-u.navPath[u.navPathIndex].z):goal?dist2d(u,goal):0;
      const desiredSpeed=Math.min(sp*(reverse?mobility.combat.reverseSpeed:1),Math.sqrt(Math.max(0,goal?dist2d(u,goal)-1:0)*2*profile.braking));
      const currentSpeed=u.motionSpeed??0;u.motionSpeed=currentSpeed+Math.max(-profile.braking*dt,Math.min(profile.acceleration*dt,desiredSpeed-currentSpeed));
      const travel=Math.min(distanceToWaypoint,u.motionSpeed*dt);
      const moveX=d.category==="infantry"?ex:Math.sin(u.heading)*(reverse?-1:1),moveZ=d.category==="infantry"?ez:Math.cos(u.heading)*(reverse?-1:1);
      const nx=u.x+moveX*travel,nz=u.z+moveZ*travel;
      if(isAir || u.navPath.length && w.nav.isWalkableWorld(nx,nz,d.radius) && bodyClear(w,u,{x:nx,z:nz})) {u.x=nx;u.z=nz;}
      else if(!isAir){const px=u.x+navDx*travel,pz=u.z+navDz*travel;if(u.navPath.length&&w.nav.isWalkableWorld(px,pz,d.radius)&&bodyClear(w,u,{x:px,z:pz})){u.x=px;u.z=pz;}else {
        const avoided=groundSidestep(w,u,navDx,navDz,travel);
        if(!avoided){u.navWaiting=true;u.motionSpeed=Math.max(0,(u.motionSpeed??0)-profile.braking*dt);u.stuckTime+=dt;}
      }}
    }
    if(!goal&&!isAir&&d.domain!=="sea"){
      u.motionSpeed=Math.max(0,(u.motionSpeed??0)-mobilityProfile(u).braking*dt);
      if((u.motionSpeed??0)>.25){const nx=u.x+Math.sin(u.heading)*u.motionSpeed!*dt,nz=u.z+Math.cos(u.heading)*u.motionSpeed!*dt;if(w.nav.isWalkableWorld(nx,nz,d.radius)&&bodyClear(w,u,{x:nx,z:nz})){u.x=nx;u.z=nz;}else u.motionSpeed=0;}
    }
    const limit=MAP_SIZE/2-10;u.x=Math.max(-limit,Math.min(limit,u.x));u.z=Math.max(-limit,Math.min(limit,u.z));
    if(!isAir&&d.domain!=="sea"&&!u.garrisonId)u.y=heightAt(u.x,u.z);
    // Sideways avoidance can oscillate without approaching a waypoint. Count
    // actual route progress, not any displacement, before clearing the jam timer.
    const progressGoal=u.navPath[u.navPathIndex]??goal;
    const progress=progressGoal?Math.hypot(u.stuckX-progressGoal.x,u.stuckZ-progressGoal.z)-dist2d(u,progressGoal):0;
    if(moving&&progress<.5)u.stuckTime+=dt;
    else {u.stuckTime=0;u.stuckX=u.x;u.stuckZ=u.z;}
    if(u.stuckTime>mobility.navigation.jamDelay&&goal&&!isAir&&d.domain!=="sea"&&w.time>=(u.roadPathRetryAt??0)){
      const parked:Array<Point&{radius:number}>=[];
      w.spatial.queryRadius(u.x,u.z,mobility.navigation.parkedSearchRadius,e=>{if(e!==u&&!e.dead&&e.loadedIntoId==null&&!e.garrisonId&&e.def.speed>0&&e.def.domain==="land"&&(!e.dest||e.mode==="hold"))parked.push({x:e.x,z:e.z,radius:e.def.radius});});
      const path=findPath(w.nav,u,goal,u.def.radius,u.fastMove&&u.mode==="move"?travelPathCost(w,u):undefined,parked);
      if(path.length){u.navPath=path;u.navPathIndex=0;u.roadPathGoal={...goal};}
      u.roadPathRetryAt=w.time+mobility.navigation.blockedRetry;u.stuckTime=0;u.stuckX=u.x;u.stuckZ=u.z;
    }
  }

  if((u.motionSpeed??0)>.5)u.stationaryFireReadyAt=w.time+mobility.combat.weaponSettleTime;

  // Aim + fire
  // - Turret units (tank, ifv, aa): can shoot on the move once turret is on target
  // - Hull-aim units (inf, special, apc, artillery, mlrs): must face target; artillery/mlrs should be nearly stopped
  const stab = d.stabilizer ?? (d.turret ? "full" : "none");
  const canFireOnMove = stab === "full";
  const mustStopToFire = stab === "none" && ["artillery", "mlrs", "mortar"].includes(u.kind);
  const isMovingFast = (u.motionSpeed??0)>.6 || !!goal && d.speed > 0;

  let aligned = true;
  if (target) {
    const absWant = Math.atan2(target.x - u.x, target.z - u.z);
    if (d.turret) {
      const want = wrapAngle(absWant - u.heading);
      u.turretYaw = turnToward(u.turretYaw, want, (u.kind === "tank" ? 2.4 : 3.2) * dt);
      aligned = Math.abs(wrapAngle(want - u.turretYaw)) < 0.14;
    } else {
      // Hull must turn toward target (infantry, fixed guns)
      if (!goal && (inRange || u.mode === "attack" || u.mode === "hold")) {
        u.heading = turnToward(u.heading, absWant, d.turnRate * dt);
      }
      aligned = Math.abs(wrapAngle(absWant - u.heading)) < 0.2;
    }
  }

  const stationaryOk = !mustStopToFire || !isMovingFast;
  const moveOk = canFireOnMove || !isMovingFast || (inRange && !mustStopToFire);
  const weaponIndex=target?selectWeapon(u,target,true):-1;
  const spec=weaponIndex>=0?weaponSpec(u,weaponIndex):null;
  if(d.domain==="sea"&&spec?.weapon==="missile")aligned=true;
  const spotted=target?isSpottedBy(target,u.team,w.time):false;
  if(target&&spec&&(!u.flightAttackExit)&&(spec.fireOnMove!==false||w.time>=(u.stationaryFireReadyAt??0))&&spotted&&aligned&&stationaryOk&&moveOk&&!disabled&&moraleState(u)!=="routing"&&u.standingOrder!=="holdfire"&&(u.firingArc>=Math.PI*2-.01||inFiringArc(u,target))&&hasSpotter(w,u,target)&&(indirect||spec.visual==="cruise"||w.vision.hasLineOfSight(u,target))){
    const muzzle=weaponMuzzle(u,spec,weaponIndex);
    fireProjectile(w,u,target,muzzle.x,muzzle.y,muzzle.z,weaponIndex);

    const p=w.projectiles[w.projectiles.length-1];if(p){const factor=(1+u.veteran*.06)*supplyFactor*(.65+w.teamMorale[u.team]/100*.35)*moraleAccuracyMul(u);p.damage*=factor;if(p.impactDamage!=null)p.impactDamage*=factor;}
    const reload=spec.cooldown*(.95+w.rng()*.1)*(u.components?1+u.components.turret/130+u.components.crew/220:1)/Math.max(.7,d.reloadSkill??1)/(spec.weapon!=="bullet"&&u.squadMaxMembers?Math.max(.3,u.squadFirepower??1):1);
    if(weaponIndex===0)u.cooldown=reload;else {u.weaponCooldowns??=[];u.weaponCooldowns[weaponIndex]=reload;}
    u.lastCombatTime=w.time;
    if(d.category==="air"&&u.airMission!=="cap"&&target.def.armor!=="air"){
      const away=spec.weapon==="missile"?Math.atan2(u.x-target.x,u.z-target.z):u.heading,span=mobility.combat.airEgressDistance,edge=w.mapSize/2-20;
      u.flightAttackExit={x:Math.max(-edge,Math.min(edge,u.x+Math.sin(away)*span)),z:Math.max(-edge,Math.min(edge,u.z+Math.cos(away)*span))};u.flightAttackExitUntil=w.time+mobility.combat.airEgressTime;
    }
  }
}


/** Derived status for the HUD; it reads the same constraints as the firing loop. */
export function combatStatus(w:World,u:Entity):string {
  if(u.garrisonId)return u.mode==="leave-building"?"Garnison · ootab vaba väljapääsu":"Garnison · piiratud laskesektor";
  if(u.garrisonOrderId)return "Läheneb hoone sissepääsule";
  if(u.loadedIntoId!=null){const carrier=w.byId.get(u.loadedIntoId);return "Transpordis · "+(carrier?w.unitDisplayName(carrier.kind,carrier.team):"pardal");}
  if(u.mode==="transport-load")return "Kogub jalaväge · kohad broneeritud";
  if(u.mode==="transport-unload")return "Viib väljumiskohta · ootab vaba väljapääsu";
  if(u.navWaiting)return "Ootab vaba läbipääsu · otsib möödumisteed";
  if(u.mode==="move"&&u.fastMove)return "Kiirliikumine · eeldatava sõiduaja järgi";
  if((u.disabledUntil??0)>w.time)return "Relvasüsteem häiritud";
  if(u.standingOrder==="holdfire")return "Tuli keelatud";
  if(u.kind==="engineer"&&u.mode==="repair"&&u.target){
    if(dist2d(u,u.target)>12)return "Läheneb remondikohale mööda läbitavat teed";
    const depot=repairDepotFor(w,u.target);
    return depot?"Remondib · kulutab lao remondivaru":"Remont ootab · vaja lähedast remondivaruga ladu";
  }
  if(u.def.armor==="air"&&u.supplyDepotId==null&&u.kind!=="cargoPlane")return airOperationStatus(w,u);
  if(outOfAmmo(u))return "Laskemoon otsas — vaja varustust";
  if(moraleState(u)==="routing")return "Taandub";
  if(u.fireMission){
    const spec=weaponSpec(u),distance=dist2d(u,u.fireMission);
    if(distance>effectiveWeaponRange(u))return "Tulemissioon ootab · sihtpunkt liiga kaugel";
    if(distance<spec.minimumRange)return "Tulemissioon ootab · sihtpunkt liiga lähedal";
    if((u.motionSpeed??0)>.5)return "Peatub tulemissiooni avamiseks";
    if(!w.vision.isVisible(u.team,u.fireMission.x,u.fireMission.z)&&!w.getFreshIntel(u.team,20).some(c=>dist2d(c,u.fireMission!)<22))return "Tulemissioon ootab · vaja vaatlejat või värsket luurekontakti";
    if(u.cooldown>0||w.time<(u.artilleryReadyAt??0))return "Tulemissioon · laadib järgmist lasku või salvet";
    return "Tulemissioon · sihib ja avab kaudtule";
  }
  if(u.combatWithdrawing&&u.target&&!u.holdPosition)return "Taastab laskekaugust · hoiab relva vaenlase suunas";
  if(!u.target)return u.dest?"Liigub · otsib sihtmärki":"Valmis · sihtmärk puudub";
  if(!isSpottedBy(u.target,u.team,w.time))return "Luurekontakt kadunud";
  if(dist2d(u,u.target)-u.target.def.radius>effectiveWeaponRange(u,u.target))return "Läheneb sihtmärgile";
  if(!["artillery","mortar","mlrs"].includes(u.kind)&&!w.vision.hasLineOfSight(u,u.target))return "Tulejoon blokeeritud · otsib positsiooni";
  const slot=selectWeapon(u,u.target);
  if(slot>=0&&dist2d(u,u.target)<weaponSpec(u,slot).minimumRange)return "Sihtmärk liiga lähedal";
  if(slot>=0&&((u.motionSpeed??0)>.5||w.time<(u.stationaryFireReadyAt??0))&&weaponSpec(u,slot).fireOnMove===false)return "Peatub · sobiva relvaga liikumiselt ei tulista";
  if(selectWeapon(u,u.target,true)<0)return "Relv laadib / sihtmärk väljaspool sobiva relva ulatust";
  return "Sihib / avab tule";
}

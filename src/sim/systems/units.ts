import type { World } from "../World";
import type { Entity, Point } from "../types";
import logisticsConfig from "../../data/logistics.json";
import mobility from "../../data/mobility.json";
import { heightAt, MAP_SIZE } from "../heightmap";
import { dist2d, turnToward, wrapAngle } from "../math";
import { fireProjectile, canEngage, effectiveWeaponRange } from "./combat";
import { isSpottedBy } from "./sensors";
import { moraleSpeedMul, moraleAccuracyMul, moraleState } from "./morale";
import { outOfFuel, outOfAmmo } from "./tacticalSupply";
import { updateAirDoctrine } from "./airDoctrine";
import { pointInFeature } from "../mapFeatures";
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
    if (e.dead || e.team === u.team || e.underConstruction || e === u) return;
    // Auto-acquire only spotted contacts (Wargame); keeps recon valuable
    if (!isSpottedBy(e, u.team, w.time)) return;
    const dx = e.x - u.x, dz = e.z - u.z;
    const distSq = dx * dx + dz * dz;

    const d = Math.sqrt(distSq) - e.def.radius;
    if (d > range) return;
    if (!hasSpotter(w, u, e)) return;
    if (!canEngage(u,e)) return;
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
    if (priority < bestScore) { bestScore = priority; best = e; }
  });
  return best;
}

function clearGroundSegment(w:World,u:Entity,p:Point):boolean {
  const distance=dist2d(u,p),steps=Math.max(1,Math.ceil(distance));
  for(let i=1;i<=steps;i++)if(!w.nav.isWalkableWorld(u.x+(p.x-u.x)*i/steps,u.z+(p.z-u.z)*i/steps,u.def.radius))return false;
  return true;
}
function bodyClear(w:World,u:Entity,p:Point):boolean {
  let clear=true;
  w.spatial.queryRadius(p.x,p.z,u.def.radius+8,o=>{
    if(o===u||o.dead||o.loadedIntoId!=null||o.def.speed===0||o.def.domain!=="land")return;
    const old=dist2d(u,o),next=dist2d(p,o),min=(u.def.radius+o.def.radius)*.9+mobility.navigation.bodyClearance;
    if(next<min&&next<old-.001)clear=false;
  });return clear;
}
function smoothWaypoint(w:World,u:Entity):void {
  for(let i=u.navPathIndex+1;i<u.navPath.length;i++){
    if(dist2d(u,u.navPath[i])>mobility.navigation.lookAhead||!clearGroundSegment(w,u,u.navPath[i]))break;
    u.navPathIndex=i;
  }
}

function moveRoadTruckTo(w: World, u: Entity, goal: Point, dt: number, arrival=3.2): boolean {
  const finalGoal=goal;
  if(Math.hypot(finalGoal.x-u.x,finalGoal.z-u.z)<=arrival){u.motionSpeed=0;return true;}
  if(!u.roadTripGoal||Math.hypot(u.roadTripGoal.x-finalGoal.x,u.roadTripGoal.z-finalGoal.z)>5){u.roadTripGoal={...finalGoal};u.patrolIndex=0;u.navPath=[];}
  const depot=u.supplyDepotId!=null?w.byId.get(u.supplyDepotId):null;
  const route=depot?.logisticsWaypoints??[];
  const reverse=u.logisticsSourceIndex!=null?u.cargo>0:u.cargo<=0;
  while(u.patrolIndex<route.length){const waypoint=route[reverse?route.length-1-u.patrolIndex:u.patrolIndex];if(Math.hypot(waypoint.x-u.x,waypoint.z-u.z)>5)break;u.patrolIndex++;u.navPath=[];}
  if(u.patrolIndex<route.length)goal=route[reverse?route.length-1-u.patrolIndex:u.patrolIndex];
  const dist=Math.hypot(goal.x-u.x,goal.z-u.z);
  if(goal===finalGoal&&dist<=arrival)return true;
  if(!u.navPath.length && u.roadPathGoal && Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)<5 && w.time<(u.roadPathRetryAt??0))return false;
  if(!u.navPath.length || u.navPathIndex>=u.navPath.length || !u.roadPathGoal || Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)>5){
    u.navPath=findPath(w.nav,u,goal,u.def.radius);u.navPathIndex=0;u.roadPathGoal={...goal};u.roadPathRetryAt=w.time+2;
    if(!u.navPath.length)return false;
  }
  let p=goal;
  while(u.navPathIndex<u.navPath.length && Math.hypot(u.x-u.navPath[u.navPathIndex].x,u.z-u.navPath[u.navPathIndex].z)<mobility.navigation.arrival)u.navPathIndex++;
  smoothWaypoint(w,u);
  if(u.navPathIndex<u.navPath.length)p=u.navPath[u.navPathIndex];
  const dx=p.x-u.x,dz=p.z-u.z,len=Math.hypot(dx,dz)||1;
  const want=Math.atan2(dx,dz);u.heading=turnToward(u.heading,want,u.def.turnRate*dt);
  const roadFeature=w.mapFeatures.find(f=>(f.kind==="road"||f.kind==="bridge")&&pointInFeature(u.x,u.z,f,3));
  const road=!!roadFeature;
  if (roadFeature?.kind === "bridge" && (w.infrastructureDamage.get(roadFeature.id) ?? 0) >= 1) { u.mode="idle"; u.dest=null; return false; }
  const componentSpeed = u.components ? Math.max(0.30, 1 - (u.components.engine ?? 0) / 180 - (u.components.tracks ?? 0) / 260) : 1;
  const speed=u.def.speed*componentSpeed*(road?1.28:1)*((u.supply??100)>10?1:0.75)*(outOfFuel(u)?0:1);
  const desiredSpeed=Math.min(speed*Math.max(0,Math.cos(wrapAngle(want-u.heading))),Math.sqrt(Math.max(0,dist-arrival)*mobility.wheeled.braking*2));
  u.motionSpeed=(u.motionSpeed??0)+Math.max(-mobility.wheeled.braking*dt,Math.min(mobility.wheeled.acceleration*dt,desiredSpeed-(u.motionSpeed??0)));
  const step=Math.min(len,(u.motionSpeed??0)*dt);const nx=u.x+dx/len*step,nz=u.z+dz/len*step;
  if((w.nav.isWalkableWorld(nx,nz,u.def.radius)||!w.nav.isWalkableWorld(u.x,u.z,u.def.radius))&&bodyClear(w,u,{x:nx,z:nz})){u.x=nx;u.z=nz;}else {u.navPath=[];u.roadPathRetryAt=w.time+.5;}u.y=heightAt(u.x,u.z);u.stuckX=u.x;u.stuckZ=u.z;
  return false;
}

function updateRoadTruck(w: World, u: Entity, dt: number): void {
  const depot = u.supplyDepotId != null ? w.byId.get(u.supplyDepotId) : null;
  if (!depot || depot.dead) { u.mode="idle"; u.dest=null; return; }
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
          const amount=u.cargo;
          w.receiveSupply(depot,amount);
          w.roadCargoDelivered[u.team]+=amount;
          w.events.push({type:"supply-delivered",team:u.team,x:u.x,z:u.z,amount});
          u.cargo=0; u.logisticsPhase="idle"; u.logisticsLoadProgress=0; u.dest={x:source.x,z:source.z};
        }
      }
      return;
    }
  }

  // Outbound resupply: finite warehouse stocks -> truck -> forward depot.
  const main=w.primarySupplyDepot(u.team);
  if(!main || main===depot) {u.mode="idle";u.dest=null;return;}
  if(u.cargo<=0) {
    u.dest={x:main.x,z:main.z};u.mode="move";
    if(!moveRoadTruckTo(w,u,u.dest,dt,16))return;
    if(!w.connectedSupplyNodes(u.team).some(n=>n.id===depot.id))return;
    u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
    if(u.logisticsLoadProgress<3)return;
    const payload={ammo:0,fuel:0,repair:0};
    const keys=["ammo","fuel","repair"] as const;
    for(const key of keys){const stockKey=key==="ammo"?"ammoStock":key==="fuel"?"fuelStock":"repairStock";
      const request=Math.min(cap/3,Math.max(0,600-(depot[stockKey]??0)));
      const take=Math.min(request,Math.max(0,(main[stockKey]??0)-100));
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
  depot.ammoStock=(depot.ammoStock??0)+payload.ammo;depot.fuelStock=(depot.fuelStock??0)+payload.fuel;depot.repairStock=(depot.repairStock??0)+payload.repair;
  w.roadCargoDelivered[u.team]+=u.cargo;w.events.push({type:"supply-delivered",team:u.team,x:depot.x,z:depot.z,amount:u.cargo});
  u.cargo=0;u.logisticsPayload=undefined;u.logisticsPhase="idle";u.logisticsLoadProgress=0;u.dest={x:main.x,z:main.z};

}

function moveSeaTo(u: Entity, target: Point, dt: number): boolean {
  if(outOfFuel(u))return false;
  const d = Math.hypot(u.x-target.x,u.z-target.z);
  if (d <= 3.5) return true;
  const dx=target.x-u.x,dz=target.z-u.z;
  u.heading=turnToward(u.heading,Math.atan2(dx,dz),u.def.turnRate*dt);
  const componentSpeed = u.components ? Math.max(0.30, 1 - (u.components.engine ?? 0) / 180 - (u.components.tracks ?? 0) / 260) : 1;
  u.x += Math.sin(u.heading)*u.def.speed*componentSpeed*dt; u.z += Math.cos(u.heading)*u.def.speed*componentSpeed*dt;
  u.y = Math.max(0.4, heightAt(u.x,u.z)-0.8);
  return false;
}

/** Kinematic flight is simulated: inertia, bank, climb and approach are saved state. */
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
  if(!helicopter&&!landing&&distance<18&&u.mode!=="patrol"){const next=u.moveQueue?.shift();u.dest=next??null;u.mode=next?(u.queuedMoveType??"move"):"idle";u.flightOrbitCenter=next?undefined:{...target};}
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
    if (!moveSeaTo(u, {x:target.x,z:target.z}, dt)) return;
    if (u.cargoUnitIds.length < 8) { target.loadedIntoId=u.id; target.mode="idle"; target.dest=null; target.target=null; u.cargoUnitIds.push(target.id); }
    u.transportTargetId=null; u.mode="idle"; u.dest=null; return;
  }
  if (u.mode === "transport-unload") {
    if (!u.unloadPoint) { u.mode="idle"; return; }
    if (!moveSeaTo(u,u.unloadPoint,dt)) return;
    const ids=[...u.cargoUnitIds]; ids.forEach((id,i)=>{ const passenger=w.byId.get(id); if(!passenger||passenger.dead)return; passenger.loadedIntoId=null; passenger.x=u.unloadPoint!.x+(i%3-1)*3; passenger.z=u.unloadPoint!.z+(Math.floor(i/3))*3; passenger.y=heightAt(passenger.x,passenger.z); passenger.px=passenger.x; passenger.pz=passenger.z; passenger.mode="idle"; });
    u.cargoUnitIds=[]; u.unloadPoint=null; u.mode="idle"; u.dest=null; return;
  }
  const goal=u.target&&!u.target.dead?{x:u.target.x,z:u.target.z}:u.dest; if(goal) moveSeaTo(u,goal,dt);
}

function updateCargoPlane(w: World, u: Entity, dt: number): void {
  const base = u.logisticsHome;
  if (!base) { u.dead = true; return; }
  // Inbound: fly to the developed airbase. The plane is a real entity, so AA can shoot it down.
  if (u.cargo > 0 && u.logisticsPhase === "idle") {
    u.mode = "patrol"; u.dest = base;
    if (!moveAirTo(u, base, dt, w)) return;
    const delivered = u.cargo;
    const destination=w.entities.find(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind==="airbase"&&Math.hypot(e.x-base.x,e.z-base.z)<15);
    if(!destination){u.cargo=0;u.dead=true;return;}
    const depot=w.nearestSupplyDepot(u.team,destination,false);
    if(depot)w.receiveSupply(depot,delivered);
    w.airCargoDelivered[u.team] += delivered;
    w.events.push({ type: "supply-delivered", team: u.team, x: u.x, z: u.z, amount: delivered });
    u.cargo = 0;
    u.logisticsPhase = "loading";
    // Turn around and leave the map.
    const exitX = u.team === 0 ? MAP_SIZE/2-10 : -MAP_SIZE/2+10;
    u.dest = { x: exitX, z: base.z };
    return;
  }
  if (u.logisticsPhase === "loading") {
    moveAirTo(u, u.dest ?? {x: u.team === 0 ? MAP_SIZE/2-10 : -MAP_SIZE/2+10, z: base.z}, dt, w);
    // Reaching the edge removes the flight from the battlefield.
    if (Math.abs(u.x) > MAP_SIZE/2-22) u.dead = true;
  }
}

function updateTransport(w: World, u: Entity, dt: number): void {
  if (u.mode === "transport-load") {
    const target = u.transportTargetId ? w.byId.get(u.transportTargetId) : null;
    if (!target || target.dead || target.loadedIntoId !== null) { u.mode = "idle"; u.transportTargetId = null; return; }
    if (!moveAirTo(u, target, dt, w)) { u.dest = { x: target.x, z: target.z }; return; }
    if (u.cargoUnitIds.length < 8) {
      target.loadedIntoId = u.id; target.mode = "idle"; target.dest = null; target.target = null;
      u.cargoUnitIds.push(target.id);
    }
    u.transportTargetId = null; u.mode = "idle"; u.dest = null;
    return;
  }
  if (u.mode === "transport-unload") {
    const point = u.unloadPoint;
    if (!point) { u.mode = "idle"; return; }
    if (!moveAirTo(u, point, dt, w)) return;
    const ids = [...u.cargoUnitIds];
    ids.forEach((id, i) => {
      const passenger = w.byId.get(id);
      if (!passenger || passenger.dead) return;
      const angle = (i / Math.max(1, ids.length)) * Math.PI * 2;
      passenger.loadedIntoId = null; passenger.x = point.x + Math.cos(angle) * 3; passenger.z = point.z + Math.sin(angle) * 3;
      passenger.y = heightAt(passenger.x, passenger.z); passenger.px = passenger.x; passenger.pz = passenger.z; passenger.mode = "idle";
    });
    u.cargoUnitIds = []; u.unloadPoint = null; u.mode = "idle"; u.dest = null;
    return;
  }
  if(u.supplyDepotId==null){if(u.dest&&!outOfFuel(u))moveAirTo(u,u.dest,dt,w);return;}
  const depot=w.byId.get(u.supplyDepotId);
  if(!depot||depot.dead){
    const replacement=w.primarySupplyDepot(u.team);
    if(!replacement){u.mode="idle";u.dest=null;return;}
    u.supplyDepotId=replacement.id;u.logisticsHome={x:replacement.x-replacement.def.radius-5,z:replacement.z};return;
  }
  const home=u.logisticsHome??{x:depot.x-depot.def.radius-5,z:depot.z};u.logisticsHome=home;
  if(outOfFuel(u)){u.hp=0;u.dead=true;w.lossValue[u.team]+=u.def.cost;w.roadCargoLost[u.team]+=u.cargo;u.cargo=0;w.events.push({type:"death",x:u.x,y:u.y,z:u.z,big:false,kind:u.kind});return;}
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
      w.receiveSupply(depot,u.cargo);w.roadCargoDelivered[u.team]+=u.cargo;w.events.push({type:"supply-delivered",team:u.team,x:u.x,z:u.z,amount:u.cargo});
      u.cargo=0;u.logisticsPhase="idle";u.logisticsLoadProgress=0;
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

export function updateUnits(w: World, dt: number): void {
  for (const u of w.entities) if (!u.dead && u.loadedIntoId === null) stepUnit(w, u, dt);
}

function stepUnit(w: World, u: Entity, dt: number): void {
  const d = u.def;
  if (u.kind === "cargoPlane") { updateCargoPlane(w, u, dt); return; }
  if (u.kind === "transport") { updateTransport(w, u, dt); return; }
  if (u.kind === "logiTruck") { updateRoadTruck(w, u, dt); return; }
  if (u.kind === "landingcraft") { updateLandingCraft(w, u, dt); return; }
  if (u.kind === "special" && u.mode !== "attack") {
    const target = w.entities.find(e=>!e.dead && e.team!==u.team && e.def.building && Math.hypot(e.x-u.x,e.z-u.z)<7);
    if (target) { target.hp = Math.max(0,target.hp-18*dt); w.sabotageBuilding(target, 25); u.mode="sabotage"; u.target=target; if(target.hp<=0) { target.dead=true; w.lossValue[target.team] += target.def.cost; } return; }
  }
  const disabled = (u.disabledUntil ?? 0) > w.time;
  const combatSpeedFactor = disabled ? 0.25 : 1;
  if (u.kind === "engineer" && (u.mode === "build" || u.mode === "repair")) {
    const target = u.target;
    if (!target || target.dead) { u.mode = "idle"; u.target = null; u.dest = null; return; }
    if (target.def.speed > 0 && !target.def.building) {
      if (Math.hypot(u.x - target.x, u.z - target.z) <= 12) {
        const depot = w.nearestSupplyDepot(target.team, {x: target.x, z: target.z}, true);
        const available = depot && dist2d(depot,target)<80 ? depot.repairStock??0 : 0;
        const repair = Math.min(10 * w.repairMultiplier(u.team) * dt, available);
        if (depot) depot.repairStock = Math.max(0, available - repair);
        if (repair > 0) {
          target.hp = Math.min(target.def.hp, target.hp + repair);
          if (target.components) {
            const step = repair * 3.2;
            for (const key of ["engine","tracks","turret","weapon","crew","ammo"] as const) target.components[key] = Math.max(0, target.components[key] - step);
          }
          target.disabledUntil = Math.max(0, Math.min(target.disabledUntil ?? 0, w.time + 0.5));
          if (target.hp >= target.def.hp * 0.995 && target.components && Object.values(target.components).every(v => v < 1)) {
            target.hp = target.def.hp; u.mode = "idle"; u.target = null; u.dest = null;
          }
        }
        return;
      }
    }
    if (Math.hypot(u.x - target.x, u.z - target.z) > 11) {
      if(!u.navPath.length || !u.roadPathGoal || Math.hypot(u.roadPathGoal.x-target.x,u.roadPathGoal.z-target.z)>5 || u.stuckTime>1){
        u.navPath=findPath(w.nav,u,target,u.def.radius);u.navPathIndex=0;u.roadPathGoal={x:target.x,z:target.z};u.stuckTime=0;
      }
      while(u.navPathIndex<u.navPath.length && Math.hypot(u.x-u.navPath[u.navPathIndex].x,u.z-u.navPath[u.navPathIndex].z)<mobility.navigation.arrival)u.navPathIndex++;
      const p = u.navPath[u.navPathIndex] ?? target;
      const before=Math.hypot(u.x-target.x,u.z-target.z);
      const dx = p.x - u.x, dz = p.z - u.z, len = Math.hypot(dx,dz) || 1;
      u.heading = turnToward(u.heading, Math.atan2(dx,dz), d.turnRate * dt);
      u.x += Math.sin(u.heading) * d.speed * dt * Math.min(1, len / 3) * combatSpeedFactor;
      u.z += Math.cos(u.heading) * d.speed * dt * Math.min(1, len / 3) * combatSpeedFactor;
      u.y = heightAt(u.x,u.z);
      if(Math.hypot(u.x-target.x,u.z-target.z)>=before-.005)u.stuckTime+=dt;else u.stuckTime=0;
    }
    return;
  }
  const supplyFactor = u.def.speed === 0 || (u.supply ?? 100) > 20 ? 1 : 0.65;
  const effectiveRange = effectiveWeaponRange(u);u.firingRange=effectiveRange;
  u.cooldown = Math.max(0, u.cooldown - dt);

  if (u.fireMission && !u.artilleryDisplace && ["artillery","mortar","mlrs"].includes(u.kind)) {u.target=null;return;}
  if (!d.damage && d.speed === 0) return;

  const isAir = d.armor === "air";
  if (isAir) {
    const home=u.airMissionHomeId?w.byId.get(u.airMissionHomeId):null;
    const helicopter=u.def.category==="heli";
    const pads=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind===(helicopter?"helipad":"airbase"));
    const pad=home&&!home.dead&&!home.underConstruction?home:[...pads].sort((a,b)=>dist2d(u,a)-dist2d(u,b))[0]??null;
    if(pad)u.airMissionHomeId=pad.id;
    const atPad=!!pad&&dist2d(u,pad)<14;
    if(atPad && u.y-heightAt(u.x,u.z)<4 && (u.airState==="returning"||u.airState==="landing")){u.airState="rearming";u.motionSpeed=0;u.y=heightAt(u.x,u.z);u.airLandingPhase=undefined;u.mode="idle";u.dest=null;u.target=null;}
    if(atPad&&pad&&(u.airState==="rearming"||u.airState==="grounded")){
      const depot=w.nearestSupplyDepot(u.team,pad,false);
      if(depot&&dist2d(depot,pad)<80&&w.productionOperational(pad).operational){
        const fuel=Math.min((u.maxFuel??0)-(u.fuel??0),34*dt,depot.fuelStock??0);
        const ammo=Math.min((u.maxAmmo??0)-(u.ammo??0),2.2*dt,depot.ammoStock??0);
        const repair=Math.min(u.def.hp-u.hp,u.def.hp*.05*dt,depot.repairStock??0);
        u.fuel=(u.fuel??0)+fuel;u.ammo=(u.ammo??0)+ammo;u.hp+=repair;
        depot.fuelStock=(depot.fuelStock??0)-fuel;depot.ammoStock=(depot.ammoStock??0)-ammo;depot.repairStock=(depot.repairStock??0)-repair;
      }
      if((u.ammo??0)>=(u.maxAmmo??0)*.95&&(u.fuel??0)>=(u.maxFuel??0)*.95)u.airState="grounded";
    }
    if(u.airState==="grounded"){
      if(pad&&w.productionOperational(pad).operational&&(u.fuel??0)>(u.maxFuel??0)*.3&&(u.ammo??0)>0&&["attack","amove","move","patrol"].includes(u.mode)) {u.airState="taxi";u.airSortieTime=0;}
      else return;
    }
    if(u.airState==="rearming")return;
    if(u.airState==="taxi"){
      u.airSortieTime=(u.airSortieTime??0)+dt;const duration=helicopter?mobility.helicopter.takeoffTime:mobility.aircraft.takeoffTime;
      if(!helicopter){u.x+=Math.sin(u.heading)*3*dt;u.z+=Math.cos(u.heading)*3*dt;}u.y=heightAt(u.x,u.z);
      if(u.airSortieTime<duration)return;
      u.airState="airborne";u.airSortieCount=(u.airSortieCount??0)+1;u.airSortieTime=0;u.airLandingPhase=undefined;
    }
    u.airSortieTime=(u.airSortieTime??0)+dt;
    if(u.airState==="airborne") updateAirDoctrine(w,u,dt);
    const reason=(u.fuel??0)<(u.maxFuel??0)*.22?"fuel":(u.ammo??0)<=0?"ammo":u.hp<u.def.hp*.35?"damage":null;
    if(reason&&u.airState!=="returning"){u.airState="returning";u.airReturnReason=reason;u.airLandingPhase="approach";}
    if((u.fuel??0)<=0){u.hp=0;u.dead=true;w.lossValue[u.team]+=u.def.cost;return;}
    if(u.airState==="returning"){
      u.target=null;u.mode="move";u.dest=pad?{x:pad.x,z:pad.z}:null;
      if(pad){
        if(!helicopter && u.airLandingPhase!=="final"){
          const approach={x:pad.x-Math.sin(pad.heading)*70,z:pad.z-Math.cos(pad.heading)*70};
          if(dist2d(u,approach)>18){moveAirTo(u,approach,dt,w);return;}
          u.airLandingPhase="final";
        }
        moveAirTo(u,pad,dt,w);
      }
      return;
    }
  }

  // sihtmärgi valik – throttle retarget (~every 4 ticks staggered by id)
  if (u.mode === "attack" && (!u.target || u.target.dead)) {
    u.target = nearestEnemy(w, u, Math.max(effectiveRange, u.aggro));
    if (!u.target) u.mode = "idle";
  }
  if (u.mode !== "attack") {
    const lim = u.mode === "move" ? effectiveRange : Math.max(effectiveRange, u.aggro);
    const needNew = !u.target || u.target.dead || dist2d(u, u.target) - u.target.def.radius > lim * 1.15;
    if (needNew) {
      const tick = Math.floor(w.time * 30);
      if ((tick + u.id) % 4 === 0 || !u.target || u.target.dead) {
        u.target = nearestEnemy(w, u, lim);
      }
    }
  }
  const t = u.target;
  // Explicit attack orders keep the target even through fog; auto-acquire still needs vision
  if (t && (!isSpottedBy(t,u.team,w.time) || !canEngage(u,t))) {
    if (u.mode === "attack") u.mode="amove";
    u.target=null;
  }
  if (u.mode === "patrol" && u.patrolPoints.length && u.dest && Math.hypot(u.x-u.dest.x,u.z-u.dest.z) < (d.category==="air"?18:3)) {
    u.patrolIndex = (u.patrolIndex + 1) % u.patrolPoints.length; u.dest = u.patrolPoints[u.patrolIndex]; u.navPath = []; u.navPathIndex = 0;
  }
  const target = u.target;
  const inRange = !!target && dist2d(u, target) - target.def.radius <= effectiveRange * 0.92;
  let goal: Point | null = null;
  const indirect=["artillery","mortar","mlrs"].includes(u.kind);
  const clearShot=!target || indirect || w.vision.hasLineOfSight(u,target);
  if (target && u.mode !== "move") {
    if ((!inRange || !clearShot) && !u.holdPosition && u.mode!=="hold") {
      goal = target;
      if(!clearShot && inRange && d.armor!=="air") {
        // Walk around the obstruction to a real firing position, retaining the attack order.
        if(w.time >= (u.roadPathRetryAt??0) || !u.roadPathGoal) {
          const angle=Math.atan2(u.x-target.x,u.z-target.z),radius=effectiveRange*.72;
          for(const offset of [0,.55,-.55,1.1,-1.1,1.65,-1.65,Math.PI]){
            const p={x:target.x+Math.sin(angle+offset)*radius,z:target.z+Math.cos(angle+offset)*radius};
            if(!w.nav.isWalkableWorld(p.x,p.z,d.radius)||!w.vision.hasLineOfSight({...u,...p,y:heightAt(p.x,p.z)},target))continue;
            const path=findPath(w.nav,u,p,d.radius);if(!path.length)continue;
            u.navPath=path;u.navPathIndex=0;u.roadPathGoal=p;break;
          }
          u.roadPathRetryAt=w.time+2;
        }
        goal=u.roadPathGoal??target;
      }
    }
  } else if (["move","amove","patrol"].includes(u.mode)) goal = u.dest;
  if(target && d.armor!=="air" && d.speed>0 && dist2d(u,target)<(d.minimumRange??0) && !u.holdPosition && u.mode!=="hold" && u.mode!=="move"){
    const a=Math.atan2(u.x-target.x,u.z-target.z),distance=Math.max((d.minimumRange??0)*1.6,effectiveRange*.4);
    const retreat={x:target.x+Math.sin(a)*distance,z:target.z+Math.cos(a)*distance};
    if(w.nav.isWalkableWorld(retreat.x,retreat.z,d.radius))goal=retreat;
  }
  if(target && d.category==="heli" && u.mode!=="move" && !u.holdPosition && u.mode!=="hold"){
    const distance=dist2d(u,target),standoff=effectiveRange*.78;
    if(distance<standoff*.68){const a=Math.atan2(u.x-target.x,u.z-target.z);goal={x:target.x+Math.sin(a)*standoff,z:target.z+Math.cos(a)*standoff};}
    else if(!inRange){const a=Math.atan2(u.x-target.x,u.z-target.z);goal={x:target.x+Math.sin(a)*standoff,z:target.z+Math.cos(a)*standoff};}
  }
  if(goal && d.armor!=="air" && d.domain!=="sea" && (!u.roadPathGoal || Math.hypot(u.roadPathGoal.x-goal.x,u.roadPathGoal.z-goal.z)>5 || !u.navPath.length && w.time>=(u.roadPathRetryAt??0))) {
    u.navPath=findPath(w.nav,u,goal,d.radius);u.navPathIndex=0;u.roadPathGoal={x:goal.x,z:goal.z};u.roadPathRetryAt=w.time+1.5;
  }

  // liikumine
  if (d.speed > 0) {
    const isAir = d.armor === "air";
    if (isAir && u.airState === "grounded") return;
    if(isAir){
      if(d.category!=="heli"&&target)goal={x:target.x,z:target.z};
      if(d.category!=="heli"){
        if(goal)u.flightOrbitCenter=undefined;
        else {const center=u.flightOrbitCenter??{x:u.x,z:u.z};u.flightOrbitCenter=center;const angle=w.time*.22+u.id;goal={x:center.x+Math.sin(angle)*45,z:center.z+Math.cos(angle)*45};}
      }
      if(goal)moveAirTo(u,goal,dt,w);
      else {u.motionSpeed=Math.max(0,(u.motionSpeed??0)-mobility.helicopter.braking*dt);u.y+=Math.max(-4*dt,Math.min(4*dt,heightAt(u.x,u.z)+mobility.helicopter.altitude-u.y));u.flightBank=(u.flightBank??0)*Math.max(0,1-dt*4);}
    }
    if(u.def.domain==="sea") {if(goal&&!outOfFuel(u))moveSeaTo(u,goal,dt);}
    let sx = 0, sz = 0;
    // Spatial separation – only nearby cells (was O(n²) over all entities)
    const sepRange = d.radius + 10;
    const sepRange2 = sepRange * sepRange;
    w.spatial.queryRadius(u.x, u.z, sepRange, (o) => {
      if (o === u || o.dead || o.loadedIntoId!==null || (o.def.armor==="air") !== isAir) return;
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
      if (goal === u.dest && gd < mobility.navigation.arrival && u.mode!=="patrol") {
        const next=u.moveQueue?.shift();u.mode=next?(u.queuedMoveType??"move"):"idle";u.dest=next??null;u.navPath=[];u.navPathIndex=0;u.flowField=null;
      }
      else { dx = gx / gd; dz = gz / gd; moving = true; }
    }
    if (moving && !isAir && u.def.domain!=="sea") {
      let navDx = dx, navDz = dz;
      if (u.navPath.length) {
        while (u.navPathIndex < u.navPath.length && Math.hypot(u.x - u.navPath[u.navPathIndex].x, u.z - u.navPath[u.navPathIndex].z) < mobility.navigation.arrival) u.navPathIndex++;
        smoothWaypoint(w,u);
        if (u.navPathIndex < u.navPath.length) { const p = u.navPath[u.navPathIndex], m = Math.hypot(p.x-u.x,p.z-u.z)||1; navDx=(p.x-u.x)/m; navDz=(p.z-u.z)/m; }
      } else if (u.flowField && isAir) {
        const f = u.flowField.directionAt(u, u.def.radius);
        if (f) { navDx=f.x; navDz=f.z; }
      }
      let ex = navDx + sx * .65, ez = navDz + sz * .65;
      const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l;
      const want = Math.atan2(ex, ez);
      u.heading = turnToward(u.heading, want, d.turnRate * dt);
      const diff = Math.abs(wrapAngle(want - u.heading));
      const slope = (heightAt(u.x + ex * 2, u.z + ez * 2) - u.y) / 2;
      const road = w.mapFeatures.some(f => (f.kind === "road" || f.kind === "bridge") && pointInFeature(u.x,u.z,f,1.5));
      const cover = w.mapFeatures.some(f => f.kind === "cover" && f.appearance!=="field" && f.appearance!=="yard" && pointInFeature(u.x,u.z,f,1.5));
      const terrainMod = road ? 1.22 : cover ? d.category==="infantry" ? mobility.infantry.forestSpeed : mobility.tracked.forestSpeed : 1;
      const supplyMove = (u.supply ?? 100) > 10 ? 1 : 0.78;
      const roleMove = u.role === "siege" ? 0.92 : 1;
      const fuelMul = outOfFuel(u) ? 0 : 1;
      const componentMove=u.components?Math.max(.15,1-u.components.engine/160-u.components.tracks/180):1;
      const sp = d.speed * componentMove * combatSpeedFactor * terrainMod * supplyMove * roleMove * moraleSpeedMul(u) * fuelMul * Math.min(1.3, Math.max(0.35, 1 - slope * 1.2)) * (d.category === "infantry" ? 1 : Math.max(0, Math.cos(diff)));
      const profile=d.category==="infantry"?mobility.infantry:["apc","reconVehicle","logiTruck"].includes(u.kind)?mobility.wheeled:mobility.tracked;
      const distanceToWaypoint=u.navPathIndex<u.navPath.length?Math.hypot(u.x-u.navPath[u.navPathIndex].x,u.z-u.navPath[u.navPathIndex].z):goal?dist2d(u,goal):0;
      const desiredSpeed=Math.min(sp,Math.sqrt(Math.max(0,goal?dist2d(u,goal)-1:0)*2*profile.braking));
      const currentSpeed=u.motionSpeed??0;u.motionSpeed=currentSpeed+Math.max(-profile.braking*dt,Math.min(profile.acceleration*dt,desiredSpeed-currentSpeed));
      const travel=Math.min(distanceToWaypoint,u.motionSpeed*dt);
      const moveX=d.category==="infantry"?ex:Math.sin(u.heading),moveZ=d.category==="infantry"?ez:Math.cos(u.heading);
      const nx=u.x+moveX*travel,nz=u.z+moveZ*travel;
      if(isAir || u.navPath.length && w.nav.isWalkableWorld(nx,nz,d.radius) && bodyClear(w,u,{x:nx,z:nz})) {u.x=nx;u.z=nz;}
      else if(!isAir){const px=u.x+navDx*travel,pz=u.z+navDz*travel;if(u.navPath.length&&w.nav.isWalkableWorld(px,pz,d.radius)&&bodyClear(w,u,{x:px,z:pz})){u.x=px;u.z=pz;}else {
        let avoided=false;
        for(const side of [u.id%2?1:-1,u.id%2?-1:1]){
          const ax=u.x+(navDx*.25-navDz*side*mobility.navigation.sidestep)*travel,az=u.z+(navDz*.25+navDx*side*mobility.navigation.sidestep)*travel;
          if(w.nav.isWalkableWorld(ax,az,d.radius)&&bodyClear(w,u,{x:ax,z:az})){u.x=ax;u.z=az;avoided=true;break;}
        }
        if(!avoided){u.motionSpeed=Math.max(0,(u.motionSpeed??0)-profile.braking*dt);u.stuckTime+=dt;}
      }}
    }
    if(!goal&&!isAir){
      u.motionSpeed=Math.max(0,(u.motionSpeed??0)-mobility.tracked.braking*dt);
      if((u.motionSpeed??0)>.25){const nx=u.x+Math.sin(u.heading)*u.motionSpeed!*dt,nz=u.z+Math.cos(u.heading)*u.motionSpeed!*dt;if(w.nav.isWalkableWorld(nx,nz,d.radius)&&bodyClear(w,u,{x:nx,z:nz})){u.x=nx;u.z=nz;}else u.motionSpeed=0;}
    }
    const limit=MAP_SIZE/2-10;u.x=Math.max(-limit,Math.min(limit,u.x));u.z=Math.max(-limit,Math.min(limit,u.z));
    if(!isAir)u.y=heightAt(u.x,u.z);
    const moved = Math.hypot(u.x - u.stuckX, u.z - u.stuckZ);
    if (moving && moved < 0.15 * dt) u.stuckTime += dt;
    else if (moved > 0.5) { u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z; }
    if (u.stuckTime > 1.2 && goal && !isAir) {
      u.navPath = findPath(w.nav, u, goal, u.def.radius); u.navPathIndex = 0;
      u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
    }
  }

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
  const rangeOk = !!target && dist2d(u, target) - target.def.radius <= effectiveRange && dist2d(u,target)>=(d.minimumRange??0);

  // Must have LOS; for auto-fire also require Wargame "spotted" (attack orders keep target)
  const spotted = target ? isSpottedBy(target, u.team, w.time) : false;
  const canShootTarget = target && spotted && canEngage(u,target);
  if (target && canShootTarget && rangeOk && aligned && stationaryOk && moveOk && !disabled && u.cooldown === 0 && d.damage
      && moraleState(u) !== "routing"
      && !outOfAmmo(u)
      && u.standingOrder !== "holdfire"
      && ((u.maxAmmo ?? 0) === 0 || (u.ammo ?? 0) > 0)
      && (u.firingArc >= Math.PI * 2 - 0.01 || inFiringArc(u, target))
      && hasSpotter(w, u, target)
      && (["artillery","mortar","mlrs"].includes(u.kind) || w.vision.hasLineOfSight(u, target))) {
    const a = u.heading + (d.turret ? u.turretYaw : 0);
    const muzzle =
      u.kind === "tank" || u.kind === "ifv" ? 4.2 :
      u.kind === "artillery" || u.kind === "mlrs" || u.kind === "mortar" ? 3.2 :
      u.kind === "aa" ? 2.4 :
      u.kind === "inf" || u.kind === "special" ? 0.9 : 1.4;
    const muzzleY =
      u.kind === "inf" || u.kind === "special" || u.kind === "engineer" ? 1.35 :
      u.kind === "tank" ? 2.55 :
      u.kind === "artillery" || u.kind === "mortar" ? 3.0 : 2.2;
    const veteranFactor = 1 + u.veteran * 0.06;
    const moraleFactor = 0.65 + (w.teamMorale[u.team] / 100) * 0.35;
    fireProjectile(w, u, target, u.x + Math.sin(a) * muzzle, u.y + muzzleY, u.z + Math.cos(a) * muzzle);
    if (w.projectiles.length) {const p=w.projectiles[w.projectiles.length-1];const factor=veteranFactor*supplyFactor*moraleFactor*moraleAccuracyMul(u);p.damage*=factor;if(p.impactDamage!=null)p.impactDamage*=factor;}
    const reloadJitter = u.kind === "tank" || u.kind === "artillery" ? (0.95 + w.rng() * 0.12) : (0.85 + w.rng() * 0.3);
    const reloadSkill = d.reloadSkill ?? 1;
    const turretPenalty = u.components ? 1 + (u.components.turret ?? 0) / 130 + (u.components.crew ?? 0) / 220 : 1;
    u.cooldown = d.cooldown * reloadJitter * turretPenalty / Math.max(0.7, reloadSkill);
    u.lastCombatTime = w.time;
  }
}


/** Derived status for the HUD; it reads the same constraints as the firing loop. */
export function combatStatus(w:World,u:Entity):string {
  if((u.disabledUntil??0)>w.time)return "Relvasüsteem häiritud";
  if(u.standingOrder==="holdfire")return "Tuli keelatud";
  if(outOfAmmo(u))return "Laskemoon otsas — vaja varustust";
  if(moraleState(u)==="routing")return "Taandub";
  if(!u.target)return u.dest?"Liigub · otsib sihtmärki":"Valmis · sihtmärk puudub";
  if(dist2d(u,u.target)-u.target.def.radius>effectiveWeaponRange(u))return "Läheneb sihtmärgile";
  if(!["artillery","mortar","mlrs"].includes(u.kind)&&!w.vision.hasLineOfSight(u,u.target))return "Tulejoon blokeeritud · otsib positsiooni";
  if(dist2d(u,u.target)<(u.def.minimumRange??0))return "Sihtmärk liiga lähedal";
  if(u.cooldown>0)return "Laadimine";
  return "Sihib / avab tule";
}

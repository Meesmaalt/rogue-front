import {warehousePoint,requestWarehouseDoor} from './warehouse';
import {airframeFor} from './airframes';
import ops from '../data/aircraft-operations.json';
import {turnToward,wrapAngle} from './math';
import layout from '../data/base-life.json';
import {depotCrewPoint} from './baseLayout';
import {availableDepotPads,depotPad} from "./depotPads";
import {findPath} from "./nav/Pathfinder";
import type {World} from './World';
import type {Entity,Point} from './types';
import rules from '../data/logistics.json';
import {heightAt} from './heightmap';
const cfg=rules.handling;

function crewPoint(w:World,depot:Entity,index:number,place:'rest'|'bays',radius:number):Point|null {const p=depotCrewPoint(depot,index,place);return w.nav.isWalkableWorld(p.x,p.z,radius)?p:w.nav.nearestWalkable(p,radius);}
/** Persistent depot staff exist before the delivery and return to their own parking bay. */
export function ensureDepotCrews(w:World):void {
 for(const depot of w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.kind==='supply')){
  const count=Math.min(layout.depot.maxCrews,Math.max(1,1+w.supplyDepotLevel(depot),w.entities.filter(e=>!e.dead&&e.kind==='transport'&&e.supplyDepotId===depot.id&&e.cargo>0).length));
  for(let index=0;index<count;index++){
   if(w.entities.some(e=>!e.dead&&e.groundService?.depotId===depot.id&&e.groundService.crewIndex===index))continue;
   const rest=crewPoint(w,depot,index,'rest',layout.depot.walkRadius);if(!rest)continue;
   const worker=w.spawn('groundHandler',depot.team,rest.x,rest.z);worker.def={...worker.def,speed:layout.depot.walkSpeed,radius:layout.depot.walkRadius,turnRate:layout.depot.turnRate};
   worker.groundService={carrierId:0,depotId:depot.id,crewIndex:index,crewState:'rest',onFoot:true,phase:'pickup',progress:0,air:true,dockSlot:index};
  }
 }
}
export function prepareDepotCrew(w:World,carrier:Entity,depot:Entity):Entity|undefined {
 const current=w.byId.get(carrier.groundServiceId??-1);if(current&&!current.dead)return current;
 const worker=w.entities.find(e=>!e.dead&&e.groundService?.depotId===depot.id&&e.groundService.crewState==='rest');if(!worker)return;
 const job=worker.groundService!;job.carrierId=carrier.id;job.phase='pickup';job.progress=0;job.crewState='walking';job.air=carrier.kind==='cargoPlane'||carrier.logisticsRoute==='strategic';
 const home=carrier.logisticsHome??carrier,dx=depot.x-home.x,dz=depot.z-home.z,d=Math.hypot(dx,dz)||1;
 job.stagingPoint=w.nav.nearestWalkable({x:home.x+dx/d*(cfg.padRadius+3),z:home.z+dz/d*(cfg.padRadius+3)},layout.depot.forkliftRadius)??undefined;
 job.pickupPoint=undefined;carrier.groundServiceId=worker.id;worker.navPath=[];worker.roadPathGoal=undefined;return worker;
}
function finishCrewJob(u:Entity,carrier:Entity|undefined):void {
 if(carrier)carrier.groundServiceId=undefined;
 if(u.groundService?.crewIndex!=null){u.groundService.crewState='parking';u.groundService.carrierId=0;u.groundService.progress=0;u.navPath=[];u.roadPathGoal=undefined;}
 else u.dead=true;
}
/** Stable per-depot leases shared by inbound and collecting helicopters. */
export function logisticsLandingPoint(w:World,depot:Entity,u:Entity):Point|null {
 const used=new Set(w.entities.filter(e=>e!==u&&!e.dead&&e.kind==='transport'&&e.supplyDepotId===depot.id).map(e=>e.logisticsPadSlot));
 const pads=availableDepotPads(w,depot);
 if(u.logisticsPadSlot!=null&&!used.has(u.logisticsPadSlot)){const p=pads.find(p=>p.slot===u.logisticsPadSlot);if(p)return p;}
 const candidates=[...pads.filter(p=>p.slot===u.logisticsPadSlot),...pads.filter(p=>p.slot!==u.logisticsPadSlot)];
 for(const p of candidates){const slot=p.slot;if(used.has(slot)||[...used].some(i=>i!=null&&Math.hypot(depotPad(depot,i).x-p.x,depotPad(depot,i).z-p.z)<cfg.padSpacing))continue;
  if(w.entities.some(e=>e!==u&&!e.dead&&e.loadedIntoId==null&&e.def.armor!=='air'&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+cfg.padRadius))continue;
  if(!Array.from({length:8},(_,i)=>depotDock(w,depot,i)).some(dock=>dock&&findPath(w.nav,dock,p,1.1).length))continue;
  u.logisticsPadSlot=slot;return p;
 }return null;
}
export function cargoPickupPoint(u:Entity,faction:Parameters<typeof airframeFor>[0]='usa'):Point {const frame=airframeFor(faction,u.kind),distance=frame?.style==='cargo'?frame.length*(ops.cargo.rearFraction+ops.cargo.rampFraction)*(u.def.modelScale??1)+ops.cargo.rampGap:u.def.radius+cfg.pickupGap;return {x:u.x-Math.sin(u.heading)*distance,z:u.z-Math.cos(u.heading)*distance};}
export function depotDock(w:World,depot:Entity,slot=0):Point|null {const raw=warehousePoint(depot),offset=(slot%4-1.5)*1.4;raw.x+=Math.cos(depot.heading+ (depot.kind==='supply'?Math.PI/2:0))*offset;raw.z-=Math.sin(depot.heading+(depot.kind==='supply'?Math.PI/2:0))*offset;return w.nav.nearestWalkable(raw,layout.depot.forkliftRadius);}

/** Keep the aircraft parked until both its hold and the service vehicle are empty. */
export function handleGroundCargo(w:World,u:Entity,depot:Entity,dt:number):boolean {
 u.airState='grounded';u.motionSpeed=0;u.y=heightAt(u.x,u.z);u.flightVx=u.flightVz=0;
 if(u.kind==='transport'&&u.cargo>.001&&!u.groundServiceId)prepareDepotCrew(w,u,depot);
 const previous=w.byId.get(u.groundServiceId??-1);
 if(u.cargo<=.001&&(!previous||previous.dead)){u.groundServiceId=undefined;u.cargoDoor=Math.max(0,(u.cargoDoor??0)-dt/cfg.doorSeconds);return u.cargoDoor<=.001;}
 u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
 if(u.logisticsLoadProgress<cfg.rotorStopSeconds)return false;
 u.cargoDoor=Math.min(1,(u.cargoDoor??0)+dt/cfg.doorSeconds);
 let handler=w.byId.get(u.groundServiceId??-1);
 if(handler?.dead){u.groundServiceId=undefined;handler=undefined;}
 if(!handler&&u.cargo>.001){
  if(w.time<(u.groundServiceRetryAt??0))return false;u.groundServiceRetryAt=w.time+2;
  const onFoot=u.kind==='transport',radius=onFoot?layout.depot.forkliftRadius:1.1;
  const used=new Set(w.entities.filter(e=>!e.dead&&e.groundService?.depotId===depot.id).map(e=>e.groundService?.dockSlot??0));
  const rear=cargoPickupPoint(u,w.factionForTeam(u.team)),points=[rear,...[1,-1,2,-2].map(side=>({x:rear.x+Math.cos(u.heading)*side*cfg.pickupGap,z:rear.z-Math.sin(u.heading)*side*cfg.pickupGap}))].map(raw=>{const point=w.nav.nearestWalkable(raw,radius);return point&&Math.hypot(point.x-raw.x,point.z-raw.z)<=cfg.pickupGap*2?point:null;}).filter((p):p is Point=>p!=null);
  const parked=w.entities.filter(e=>!e.dead&&e.loadedIntoId==null&&e.def.armor!=='air'&&e.def.speed>0).map(e=>({x:e.x,z:e.z,radius:e.def.radius}));
  for(let slot=0;slot<16;slot++){if(used.has(slot))continue;const dock=depotDock(w,depot,slot);
   if(!dock||parked.some(e=>Math.hypot(e.x-dock.x,e.z-dock.z)<e.radius+radius+.2))continue;
   const pickup=points.find(p=>findPath(w.nav,dock,p,radius,undefined,parked).length>0);if(!pickup)continue;
   handler=w.spawn('groundHandler',u.team,dock.x,dock.z);if(onFoot)handler.def={...handler.def,speed:layout.depot.forkliftSpeed,radius:layout.depot.forkliftRadius,turnRate:layout.depot.turnRate};handler.groundService={onFoot,pickupPoint:pickup,carrierId:u.id,depotId:depot.id,phase:'pickup',progress:0,dockSlot:slot,air:u.kind==='cargoPlane'||u.logisticsRoute==='strategic'};u.groundServiceId=handler.id;break;
  }
 }
 return false;
}
export function logisticsDeparture(u:Entity,dt:number):boolean {
 if((u.cargoDoor??0)>0){u.cargoDoor=Math.max(0,(u.cargoDoor??0)-dt/cfg.doorSeconds);u.motionSpeed=0;return false;}
 if(u.airState==='grounded'){u.airState='taxi';u.airSortieTime=0;}
 if(u.airState==='taxi'){u.airSortieTime=(u.airSortieTime??0)+dt;u.motionSpeed=0;if(u.airSortieTime<cfg.spoolSeconds)return false;u.airState='airborne';}
 return true;
}
/** Real cargo is removed from the hold only at the ramp and credited only at the warehouse. */
export function updateGroundHandler(w:World,u:Entity,dt:number,move:(target:Point)=>boolean):void {
 const job=u.groundService;if(!job)return;const carrier=w.byId.get(job.carrierId);let depot=w.byId.get(job.depotId);
 if(!depot||depot.dead){depot=w.entities.filter(e=>e.kind==='supply'&&!e.dead&&!e.underConstruction&&e.team===u.team&&w.hasCommandLink(e)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];if(!depot){u.motionSpeed=0;return;}job.depotId=depot.id;job.handlingStage=undefined;job.handlingOutside=undefined;job.phase=u.cargo>0?'deliver':'pickup';}
 if(job.crewIndex!=null){
  const index=job.crewIndex,bay=crewPoint(w,depot,index,'bays',layout.depot.forkliftRadius),rest=crewPoint(w,depot,index,'rest',layout.depot.walkRadius);
  const walking=job.crewState==='walking'||job.crewState==='returning'||job.crewState==='rest';
  const radius=walking?layout.depot.walkRadius:layout.depot.forkliftRadius,speed=walking?layout.depot.walkSpeed:layout.depot.forkliftSpeed;
  if(u.def.radius!==radius||u.def.speed!==speed)u.def={...u.def,radius,speed,turnRate:layout.depot.turnRate};
  if(job.crewState==='rest'){u.motionSpeed=0;return;}
  if(job.crewState==='walking'){if(!bay||!move(bay))return;job.crewState='boarding';job.progress=0;return;}
  if(job.crewState==='boarding'){u.motionSpeed=0;job.progress+=dt;if(job.progress<layout.depot.boardingSeconds)return;job.crewState='driving';job.progress=0;u.navPath=[];u.roadPathGoal=undefined;return;}
  if(job.crewState==='parking'){if(!bay||!move(bay))return;job.crewState='returning';job.progress=0;u.navPath=[];u.roadPathGoal=undefined;return;}
  if(job.crewState==='returning'){if(!rest||!move(rest))return;job.crewState='rest';u.motionSpeed=0;return;}
  if(job.crewState==='driving'&&(!carrier||carrier.dead||carrier.logisticsManual)){if(u.cargo<=.001){finishCrewJob(u,carrier);return;}job.phase='deliver';}
  if(job.phase==='pickup'&&carrier&&(carrier.airState!=='grounded'||(carrier.logisticsLoadProgress??0)<cfg.rotorStopSeconds)){
   if(job.stagingPoint)move(job.stagingPoint);else u.motionSpeed=0;return;
  }
 }
 const dock=depotDock(w,depot,job.dockSlot);if(!dock){u.motionSpeed=0;return;}
 if(job.handlingStage){updateInteriorHandling(w,u,depot,carrier,dt);return;}
 if(job.phase==='pickup'||job.phase==='load'){
  if(!carrier||carrier.dead||carrier.supplyDepotId!==depot.id||carrier.logisticsManual||carrier.airState!=='grounded'){
   if(u.cargo>0)job.phase='deliver';else {finishCrewJob(u,carrier);return;}
  }else {
   const raw=job.pickupPoint??cargoPickupPoint(carrier,w.factionForTeam(carrier.team)),point=w.nav.nearestWalkable(raw,u.def.radius);
   if(!point||Math.hypot(point.x-raw.x,point.z-raw.z)>cfg.pickupGap*2){finishCrewJob(u,carrier);return;}
   if(!move(point)){if(job.phase==='pickup'){job.progress=(u.motionSpeed??0)<.1?job.progress+dt:0;if(job.progress>5){finishCrewJob(u,carrier);}}return;}const facing=Math.atan2(carrier.x-u.x,carrier.z-u.z);u.heading=turnToward(u.heading,facing,u.def.turnRate*dt);u.motionSpeed=0;if(Math.abs(wrapAngle(facing-u.heading))>cfg.loadingHeadingTolerance){job.progress=0;return;}
   if(job.phase!=='load')job.progress=0;job.phase='load';
   if((carrier.cargoDoor??0)<.95)return;
   if(carrier.kind==='cargoPlane'){job.handlingStage='hold-enter';job.handlingOutside={x:u.x,z:u.z};job.progress=0;return;}
   job.progress+=dt;if(job.progress<cfg.loadSeconds)return;
   const amount=Math.min(job.onFoot?cfg.porterCapacity:cfg.capacity,carrier.cargo);carrier.cargo-=amount;u.cargo+=amount;job.progress=0;job.phase='deliver';const d=Math.hypot(u.x-carrier.x,u.z-carrier.z)||1;job.retreatPoint={x:u.x+(u.x-carrier.x)/d*cfg.reverseDistance,z:u.z+(u.z-carrier.z)/d*cfg.reverseDistance};
  }
 }
 if(job.phase==='deliver'||job.phase==='unload'){
  if(job.retreatPoint){u.motionReverse=true;if(!move(job.retreatPoint))return;job.retreatPoint=undefined;u.motionReverse=false;u.navPath=[];u.roadPathGoal=undefined;}
  if(!move(dock)){
   job.blockedTime=(u.motionSpeed??0)<.1?(job.blockedTime??0)+dt:0;
   if(job.blockedTime>cfg.porterJamSeconds){const used=new Set(w.entities.filter(e=>e!==u&&!e.dead&&e.groundService?.depotId===depot.id).map(e=>e.groundService?.dockSlot));
    for(let offset=1;offset<=16;offset++){const slot=((job.dockSlot??0)+offset)%16,next=depotDock(w,depot,slot);if(!used.has(slot)&&next&&findPath(w.nav,u,next,u.def.radius).length){job.dockSlot=slot;break;}}
    job.blockedTime=0;job.progress=0;u.navPath=[];u.roadPathGoal=undefined;u.roadPathRetryAt=0;}
   return;
  }job.blockedTime=0;u.motionSpeed=0;requestWarehouseDoor(w,depot);
  if((depot.warehouseDoor??0)<.95||w.entities.some(e=>e!==u&&!e.dead&&e.groundService?.depotId===depot!.id&&e.groundService.handlingStage?.startsWith('warehouse')))return;
  job.phase='unload';job.handlingStage='warehouse-enter';job.handlingOutside={x:u.x,z:u.z};job.progress=0;

 }
}

/** Interior lanes are reserved to one loader; coarse navigation stops at the doorway. */
function updateInteriorHandling(w:World,u:Entity,depot:Entity,carrier:Entity|undefined,dt:number):void {
 const j=u.groundService!,stage=j.handlingStage!,warehouse=stage.startsWith('warehouse');
 if(!warehouse&&(!carrier||carrier.dead)){j.handlingStage=undefined;j.phase=u.cargo>0?'deliver':'pickup';return;}
 if(warehouse)requestWarehouseDoor(w,depot);
 const frame=carrier?airframeFor(w.factionForTeam(carrier.team),carrier.kind):undefined;
 const depth=frame?frame.length*ops.cargo.rearFraction*(carrier!.def.modelScale??1)-ops.cargo.holdDepth:0;
 const inside=warehouse?warehousePoint(depot,true):{x:carrier!.x-Math.sin(carrier!.heading)*depth,z:carrier!.z-Math.cos(carrier!.heading)*depth};
 const outside=j.handlingOutside??u,exit=stage.endsWith('exit'),stationary=stage==='hold-load'||stage==='warehouse-unload';
 if(!stationary){
  const target=exit?outside:inside,dx=target.x-u.x,dz=target.z-u.z,d=Math.hypot(dx,dz),step=Math.min(d,ops.warehouse.driveSpeed*dt);
  const heading=Math.atan2(dx,dz)+(exit?Math.PI:0);u.heading=turnToward(u.heading,heading,u.def.turnRate*dt);u.motionReverse=exit;u.motionSpeed=0;if(Math.abs(wrapAngle(heading-u.heading))>cfg.loadingHeadingTolerance)return;u.motionSpeed=step/dt;
  u.x+=dx/(d||1)*step;u.z+=dz/(d||1)*step;
  const whole=Math.hypot(inside.x-outside.x,inside.z-outside.z)||1,amount=Math.max(0,Math.min(1,1-Math.hypot(u.x-inside.x,u.z-inside.z)/whole));
  u.y=heightAt(u.x,u.z)+(warehouse?0:ops.cargo.rampHeight*(carrier!.def.modelScale??1)*amount);
  if(d>ops.warehouse.driveSpeed*dt)return;
  u.motionSpeed=0;u.motionReverse=false;j.progress=0;u.navPath=[];u.roadPathGoal=undefined;
  if(!exit){j.handlingStage=warehouse?'warehouse-unload':'hold-load';return;}
  j.handlingStage=undefined;j.handlingOutside=undefined;
  if(!warehouse){j.phase='deliver';return;}
  if(carrier&&!carrier.dead&&carrier.cargo>.001){j.phase='pickup';}else finishCrewJob(u,carrier);return;
 }
 u.motionSpeed=0;j.progress+=dt;
 if(stage==='hold-load'){
  if(j.progress<cfg.loadSeconds)return;
  const amount=Math.min(cfg.capacity,carrier!.cargo);carrier!.cargo-=amount;u.cargo+=amount;j.handlingStage='hold-exit';return;
 }
 if(j.progress<cfg.unloadSeconds||depot.underConstruction||depot.logisticsPaused||(depot.disabledUntil??0)>w.time||!w.hasCommandLink(depot)||w.powerStatus(u.team).ratio<.25)return;
 const accepted=w.receiveSupply(depot,u.cargo);u.cargo=Math.max(0,u.cargo-accepted);
 if(j.air)w.airCargoDelivered[u.team]+=accepted;else w.roadCargoDelivered[u.team]+=accepted;
 if(accepted>0)w.events.push({type:'supply-delivered',team:u.team,x:u.x,z:u.z,amount:accepted});
 if(u.cargo<=.001)j.handlingStage='warehouse-exit';
}

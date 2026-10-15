import {findPath} from "./nav/Pathfinder";
import type {World} from './World';
import type {Entity,Point} from './types';
import rules from '../data/logistics.json';
import {heightAt} from './heightmap';
const cfg=rules.handling;
/** Stable per-depot leases shared by inbound and collecting helicopters. */
export function logisticsLandingPoint(w:World,depot:Entity,u:Entity):Point|null {
 const used=new Set(w.entities.filter(e=>e!==u&&!e.dead&&e.kind==='transport'&&e.supplyDepotId===depot.id).map(e=>e.logisticsPadSlot));
 const candidate=(slot:number):Point=>{const side=Math.floor(slot/5),row=slot%5-2,r=depot.def.radius+cfg.padClearance;return side<2?{x:depot.x+(side===0?-r:r),z:depot.z+row*cfg.padSpacing}:{x:depot.x+row*cfg.padSpacing,z:depot.z+(side===2?r:-r)};};
 if(u.logisticsPadSlot!=null&&!used.has(u.logisticsPadSlot)){const p=candidate(u.logisticsPadSlot);if(w.nav.isWalkableWorld(p.x,p.z,cfg.padRadius))return p;}
 for(let slot=0;slot<cfg.maxPads;slot++){if(used.has(slot))continue;const p=candidate(slot);if([...used].some(i=>i!=null&&Math.hypot(candidate(i).x-p.x,candidate(i).z-p.z)<cfg.padSpacing))continue;if(!w.nav.isWalkableWorld(p.x,p.z,cfg.padRadius))continue;
  if(w.entities.some(e=>e!==u&&!e.dead&&e.loadedIntoId==null&&e.def.armor!=='air'&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+cfg.padRadius))continue;
  if(!Array.from({length:8},(_,i)=>depotDock(w,depot,i)).some(dock=>dock&&findPath(w.nav,dock,p,1.1).length))continue;
  u.logisticsPadSlot=slot;return p;
 }return null;
}
export function cargoPickupPoint(u:Entity):Point {return {x:u.x-Math.sin(u.heading)*(u.def.radius+cfg.pickupGap),z:u.z-Math.cos(u.heading)*(u.def.radius+cfg.pickupGap)};}
export function depotDock(w:World,depot:Entity,slot=0):Point|null {const angle=(slot%8)*Math.PI/4,r=depot.def.radius+cfg.dockGap+Math.floor(slot/8)*4;return w.nav.nearestWalkable({x:depot.x+Math.sin(angle)*r,z:depot.z+Math.cos(angle)*r},1.1);}
/** Keep the aircraft parked until both its hold and the service vehicle are empty. */
export function handleGroundCargo(w:World,u:Entity,depot:Entity,dt:number):boolean {
 u.airState='grounded';u.motionSpeed=0;u.y=heightAt(u.x,u.z);u.flightVx=u.flightVz=0;
 const previous=w.byId.get(u.groundServiceId??-1);
 if(u.cargo<=.001&&(!previous||previous.dead)){u.groundServiceId=undefined;u.cargoDoor=Math.max(0,(u.cargoDoor??0)-dt/cfg.doorSeconds);return u.cargoDoor<=.001;}
 u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
 if(u.logisticsLoadProgress<cfg.rotorStopSeconds)return false;
 u.cargoDoor=Math.min(1,(u.cargoDoor??0)+dt/cfg.doorSeconds);
 let handler=w.byId.get(u.groundServiceId??-1);
 if(handler?.dead){u.groundServiceId=undefined;handler=undefined;}
 if(!handler&&u.cargo>.001){
  if(w.time<(u.groundServiceRetryAt??0))return false;u.groundServiceRetryAt=w.time+2;
  const used=new Set(w.entities.filter(e=>!e.dead&&e.groundService?.depotId===depot.id).map(e=>e.groundService?.dockSlot??0)),raw=cargoPickupPoint(u),pickup=w.nav.nearestWalkable(raw,1.1);
  if(!pickup||Math.hypot(pickup.x-raw.x,pickup.z-raw.z)>cfg.pickupGap*2)return false;
  const parked=w.entities.filter(e=>!e.dead&&e.loadedIntoId==null&&e.def.armor!=='air'&&e.def.speed>0).map(e=>({x:e.x,z:e.z,radius:e.def.radius}));
  for(let slot=0;slot<16;slot++){if(used.has(slot))continue;const dock=depotDock(w,depot,slot);
   if(!dock||parked.some(e=>Math.hypot(e.x-dock.x,e.z-dock.z)<e.radius+1.3)||!findPath(w.nav,dock,pickup,1.1,undefined,parked).length)continue;
   handler=w.spawn('groundHandler',u.team,dock.x,dock.z);handler.groundService={carrierId:u.id,depotId:depot.id,phase:'pickup',progress:0,dockSlot:slot,air:u.kind==='cargoPlane'||u.logisticsRoute==='strategic'};u.groundServiceId=handler.id;break;
  }
 }
 return false;
}
export function logisticsDeparture(u:Entity,dt:number):boolean {
 if(u.airState==='grounded'){u.airState='taxi';u.airSortieTime=0;}
 if(u.airState==='taxi'){u.airSortieTime=(u.airSortieTime??0)+dt;u.motionSpeed=0;if(u.airSortieTime<cfg.spoolSeconds)return false;u.airState='airborne';}
 return true;
}
/** Real cargo is removed from the hold only at the ramp and credited only at the warehouse. */
export function updateGroundHandler(w:World,u:Entity,dt:number,move:(target:Point)=>boolean):void {
 const job=u.groundService;if(!job)return;const carrier=w.byId.get(job.carrierId);let depot=w.byId.get(job.depotId);
 if(!depot||depot.dead){depot=w.entities.filter(e=>e.kind==='supply'&&!e.dead&&!e.underConstruction&&e.team===u.team&&w.hasCommandLink(e)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];if(!depot){u.motionSpeed=0;return;}job.depotId=depot.id;}
 const dock=depotDock(w,depot,job.dockSlot);if(!dock){u.motionSpeed=0;return;}
 if(job.phase==='pickup'||job.phase==='load'){
  if(!carrier||carrier.dead||carrier.supplyDepotId!==depot.id||carrier.airState!=='grounded'){
   if(u.cargo>0)job.phase='deliver';else {u.dead=true;return;}
  }else {
   const raw=cargoPickupPoint(carrier),point=w.nav.nearestWalkable(raw,u.def.radius);
   if(!point||Math.hypot(point.x-raw.x,point.z-raw.z)>cfg.pickupGap*2){u.motionSpeed=0;return;}
   if(!move(point)){if(job.phase==='pickup'){job.progress=(u.motionSpeed??0)<.1?job.progress+dt:0;if(job.progress>5){u.dead=true;carrier.groundServiceId=undefined;}}return;}if(job.phase!=='load')job.progress=0;job.phase='load';u.motionSpeed=0;
   if((carrier.cargoDoor??0)<.95)return;job.progress+=dt;if(job.progress<cfg.loadSeconds)return;
   const amount=Math.min(cfg.capacity,carrier.cargo);carrier.cargo-=amount;u.cargo+=amount;job.progress=0;job.phase='deliver';
  }
 }
 if(job.phase==='deliver'||job.phase==='unload'){
  if(!move(dock))return;job.phase='unload';u.motionSpeed=0;job.progress+=dt;if(job.progress<cfg.unloadSeconds)return;
  if(depot.underConstruction||depot.logisticsPaused||(depot.disabledUntil??0)>w.time||!w.hasCommandLink(depot)||w.powerStatus(u.team).ratio<.25)return;
  const accepted=w.receiveSupply(depot,u.cargo);u.cargo=Math.max(0,u.cargo-accepted);
  if(job.air)w.airCargoDelivered[u.team]+=accepted;else w.roadCargoDelivered[u.team]+=accepted;
  if(accepted>0)w.events.push({type:'supply-delivered',team:u.team,x:u.x,z:u.z,amount:accepted});
  if(u.cargo>.001)return;
  if(carrier&&!carrier.dead&&carrier.cargo>.001){job.phase='pickup';job.progress=0;}else {u.dead=true;if(carrier)carrier.groundServiceId=undefined;}
 }
}

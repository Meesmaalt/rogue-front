import rules from '../data/logistics.json';
import life from '../data/base-life.json';
import {basePoint} from './baseLayout';
import {dist2d} from './math';
import type {Entity,Point} from './types';
import type {World} from './World';
const cfg=rules.resourceConvoys;
function headquarters(w:World,team:Entity['team']):Entity|undefined{return w.entities.find(e=>!e.dead&&!e.underConstruction&&e.team===team&&e.kind==='hq');}
function clearRoute(u:Entity):void{u.navPath=[];u.navPathIndex=0;u.roadTripGoal=undefined;u.roadPathGoal=undefined;u.roadPathRetryAt=0;u.stuckTime=0;}

/** One facility-owned truck per working captured site. Building another supply depot never creates a convoy. */
export function dispatchResourceConvoys(w:World,lastSpawn:number[]):void {
 for(const team of w.teams){
  if(w.time-lastSpawn[team]<cfg.dispatchInterval)continue;
  lastSpawn[team]=w.time;
  const hq=headquarters(w,team);if(!hq)continue;
  for(let i=0;i<w.resourcePoints.length;i++){
   const site=w.resourcePoints[i];
   if(site.controlledBy!==team||!site.active||(site.disabledUntil??0)>w.time||site.amount<1)continue;
   if(w.entities.some(e=>!e.dead&&e.resourceConvoy?.sourceIndex===i&&e.team===team))continue;
   const def=w.unitDefinition('logiTruck',team);
   const pickup=[0,1,-1,2,-2].map(n=>w.nav.nearestWalkable({x:site.x+n*(def.radius*2+1),z:site.z},def.radius)).find(p=>p&&dist2d(p,site)<=site.radius+cfg.pickupArrival&&!w.entities.some(e=>!e.dead&&e.def.speed>0&&e.def.domain!=='air'&&e.loadedIntoId==null&&dist2d(e,p)<e.def.radius+def.radius));
   const local=cfg.dock,dock=w.nav.nearestWalkable(basePoint(hq,local.x+(i%3)*local.spacing,local.z+Math.floor(i/3)*local.spacing),def.radius);
   if(!pickup||!dock)continue;
   // The real driving planner handles connectivity and later obstructions. A short
   // preflight A* budget used to suppress perfectly valid long-distance routes.
   const truck=w.spawn('logiTruck',team,pickup.x,pickup.z);
   truck.resourceConvoy={sourceIndex:i,homeId:hq.id,pickup,dock,phase:'loading'};
   truck.supplyDepotId=hq.id;truck.logisticsSourceIndex=i;truck.logisticsCargoCapacity=cfg.capacity;
   truck.logisticsHome={...dock};truck.logisticsTarget={...pickup};truck.logisticsLoadProgress=0;truck.mode='idle';
   break;
  }
 }
}

/** Older saves used the same truck type for automatic routes. Keep their real cargo and move collection home to HQ. */
export function adoptLegacyResourceConvoy(w:World,u:Entity):boolean {
 if(u.resourceConvoy||u.logisticsSourceIndex==null)return !!u.resourceConvoy;
 const home=headquarters(w,u.team),site=w.resourcePoints[u.logisticsSourceIndex];if(!home||!site)return false;
 const pickup=w.nav.nearestWalkable(site,u.def.radius),dock=w.nav.nearestWalkable(basePoint(home,cfg.dock.x+(u.logisticsSourceIndex%3)*cfg.dock.spacing,cfg.dock.z),u.def.radius);
 if(!pickup||!dock)return false;
 u.resourceConvoy={sourceIndex:u.logisticsSourceIndex,homeId:home.id,pickup,dock,phase:u.cargo>0?'to-hq':'to-source'};
 u.supplyDepotId=home.id;u.logisticsHome={...dock};u.logisticsTarget={...pickup};u.logisticsLoadProgress=0;clearRoute(u);return true;
}

export function updateResourceConvoy(w:World,u:Entity,dt:number,move:(point:Point,arrival:number)=>boolean):boolean {
 const duty=u.resourceConvoy;if(!duty)return false;
 let home=w.byId.get(duty.homeId);
 if(!home||home.dead||home.team!==u.team){
  home=headquarters(w,u.team);
  if(!home){u.motionSpeed=0;u.dest=null;return true;}
  duty.homeId=home.id;u.supplyDepotId=home.id;
  duty.dock=w.nav.nearestWalkable(basePoint(home,cfg.dock.x,cfg.dock.z),u.def.radius)??{...duty.dock};clearRoute(u);
 }
 const site=w.resourcePoints[duty.sourceIndex],valid=site?.controlledBy===u.team&&site.active&&(site.disabledUntil??0)<=w.time;
 if(!valid&&duty.phase!=='to-hq'&&duty.phase!=='unloading'&&duty.phase!=='retiring'){
  duty.phase=u.cargo>0?'to-hq':'retiring';u.logisticsLoadProgress=0;clearRoute(u);
 }
 u.mode='move';
 if(duty.phase==='to-source'){
  u.dest=duty.pickup;if(move(duty.pickup,cfg.pickupArrival)){duty.phase='loading';u.logisticsLoadProgress=0;}return true;
 }
 if(duty.phase==='loading'){
  u.motionSpeed=0;u.dest=null;if(!valid)return true;
  if(site.amount<1){u.logisticsLoadProgress=0;return true;}
  u.logisticsLoadProgress=(u.logisticsLoadProgress??0)+dt;
  if(u.logisticsLoadProgress>=cfg.loadSeconds){
   const amount=Math.min(cfg.capacity,Math.floor(site.amount));site.amount-=amount;u.cargo=amount;
   duty.phase='to-hq';u.logisticsPhase='loading';u.logisticsLoadProgress=0;clearRoute(u);
  }return true;
 }
 if(duty.phase==='to-hq'||duty.phase==='retiring'){
  u.dest=duty.dock;
  if(move(duty.dock,cfg.dockArrival)){
   if(duty.phase==='retiring'){u.dead=true;return true;}
   duty.phase='unloading';u.logisticsPhase='unloading';u.dest=null;u.motionSpeed=0;
  }return true;
 }
 u.dest=null;u.motionSpeed=0;
 if(u.cargo<=0&&!w.entities.some(e=>!e.dead&&e.hqCargo?.truckId===u.id)){
  duty.phase=valid?'to-source':'retiring';u.logisticsPhase='idle';clearRoute(u);return true;
 }
 // Construction has first refusal: only local, parked, free teams volunteer for handling.
 for(const crew of w.entities){
  if(u.cargo<=0)break;
  if(crew.dead||crew.constructionCrew?.homeId!==home.id||crew.hqCargo||crew.target||crew.loadedIntoId!=null||crew.constructionCrew.transportId||crew.engineerDuty?.phase!=='rest'||dist2d(crew,home)>life.engineer.homeRadius)continue;
  const side=u.def.radius+crew.def.radius+1,rawPickup={x:u.x-Math.cos(u.heading)*side,z:u.z+Math.sin(u.heading)*side};
  const pickup=w.nav.isWalkableWorld(rawPickup.x,rawPickup.z,crew.def.radius)?rawPickup:w.nav.nearestWalkable(rawPickup,crew.def.radius);
  const door=w.nav.nearestWalkable(basePoint(home,cfg.door.x,cfg.door.z),crew.def.radius);
  if(!pickup||!door)continue;
  crew.hqCargo={truckId:u.id,homeId:home.id,phase:'pickup',pickup,door};
  crew.engineerDuty.phase='cargo';crew.mode='idle';crew.dest=null;clearRoute(crew);
 }
 return true;
}

/** Cargo remains on the truck, then on the walking crew, until it actually reaches HQ. */
export function updateHqCargo(w:World,u:Entity,_dt:number,move:(point:Point)=>boolean):boolean {
 const duty=u.hqCargo;if(!duty)return false;
 const finish=()=>{u.hqCargo=undefined;u.dest=null;u.mode='idle';u.motionSpeed=0;if(u.engineerDuty){u.engineerDuty.phase='rest';u.engineerDuty.idleFor=0;}clearRoute(u);};
 let home=w.byId.get(duty.homeId);
 if(!home||home.dead||home.team!==u.team){
  home=headquarters(w,u.team);
  if(!home){u.motionSpeed=0;return true;}
  duty.homeId=home.id;duty.door=w.nav.nearestWalkable(basePoint(home,cfg.door.x,cfg.door.z),u.def.radius)??duty.door;clearRoute(u);
 }
 const truck=w.byId.get(duty.truckId);
 if(duty.phase==='pickup'){
  if(!truck||truck.dead||truck.resourceConvoy?.phase!=='unloading'||truck.cargo<=0){finish();return true;}
  u.dest=duty.pickup;if(!move(duty.pickup)){duty.readyAt=undefined;return true;}
  duty.readyAt??=w.time+cfg.workerPickupSeconds;if(w.time<duty.readyAt)return true;
  u.cargo=Math.min(cfg.workerBatch,truck.cargo);truck.cargo-=u.cargo;duty.phase='deliver';duty.readyAt=undefined;clearRoute(u);return true;
 }
 u.dest=duty.door;if(!move(duty.door)){duty.readyAt=undefined;return true;}
 duty.readyAt??=w.time+cfg.workerUnloadSeconds;if(w.time<duty.readyAt)return true;
 const amount=w.receiveSupply(home,u.cargo);u.cargo=Math.max(0,u.cargo-amount);w.roadCargoDelivered[u.team]+=amount;
 if(amount>0)w.events.push({type:'supply-delivered',team:u.team,x:home.x,z:home.z,amount});
 if(u.cargo>0)return true;
 if(truck&&!truck.dead&&truck.cargo>0&&truck.resourceConvoy?.phase==='unloading'&&!w.entities.some(e=>!e.dead&&e.team===u.team&&e.underConstruction&&!e.upgrading&&e.builderIds.length===0)){
  duty.phase='pickup';duty.readyAt=undefined;clearRoute(u);
 }else finish();
 return true;
}

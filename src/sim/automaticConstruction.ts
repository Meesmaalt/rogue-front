import {cargoPickupPoint} from './groundHandling';
import logisticsRules from '../data/logistics.json';
import config from '../data/base-life.json';
import mobility from '../data/mobility.json';
import {externalEntry} from './externalSupply';
import {pointInFeature} from './mapFeatures';
import {basePoint,hqStaffPoint} from './baseLayout';
import {findPath} from './nav/Pathfinder';
import {heightAt} from './heightmap';
import {dist2d} from './math';
import {BUILDINGS,isBuildable} from './buildings';
import type {World} from './World';
import type {Entity,Point,Team} from './types';
const cfg=config.construction;
export function constructionHubs(w:World,team:Team):Entity[]{return w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===team&&(e.kind==='hq'||w.isFOB(e)));}
export function constructionReach(w:World,building:Entity):number{return Math.max(config.engineer.workDistance,building.def.radius+config.engineer.vanRadius+w.nav.cellSize*2);}
export function automaticAircraft(e:Entity):boolean{return !!e.constructionFlight||e.kind==='transport'&&e.supplyDepotId!=null;}
export function constructionHelper(e:Entity):boolean{return !!(e.constructionCrew||e.constructionFlight);}
function route(w:World,from:Point,to:Point):Point[]{return findPath(w.nav,from,to,config.engineer.vanRadius,undefined,[],cfg.pathSearchLimit);}
/** Stable site approaches are planned once, not moved/replanned underneath a turning van every tick. */
export function constructionApproach(w:World,from:Point,building:Entity):{point:Point;path:Point[]}|null {
 const angle=Math.atan2(from.x-building.x,from.z-building.z),radius=constructionReach(w,building)-config.engineer.vanRadius;
 let attempts=0;
 for(let i=0;i<cfg.landingSamples&&attempts<cfg.pathAttempts;i++){
  const a=angle+i*Math.PI*2/cfg.landingSamples,p={x:building.x+Math.sin(a)*radius,z:building.z+Math.cos(a)*radius};
  if(!w.nav.isWalkableWorld(p.x,p.z,config.engineer.vanRadius))continue;
  attempts++;const path=route(w,from,p);if(path.length||dist2d(from,p)<1)return {point:p,path};
 }
 return null;
}
function landingPoint(w:World,center:Point,crew?:Entity):Point|null {
 for(const ring of cfg.landingRings)for(let i=0;i<cfg.landingSamples;i++){
  const a=i*Math.PI*2/cfg.landingSamples,p={x:center.x+Math.sin(a)*ring,z:center.z+Math.cos(a)*ring};
  if(!w.nav.isWalkableWorld(p.x,p.z,cfg.aircraftClearance))continue;
  if(w.mapFeatures.some(f=>(f.appearance==='forest'||f.appearance==='hedge')&&pointInFeature(p.x,p.z,f,cfg.aircraftClearance)))continue;
  if(w.entities.some(e=>!e.dead&&e.def.building&&dist2d(e,p)<e.def.radius+cfg.aircraftClearance))continue;
  if(w.entities.some(e=>!e.dead&&e.constructionFlight&&e.airState!=='airborne'&&dist2d(e,p)<cfg.aircraftClearance*2))continue;
  if(Math.abs(heightAt(p.x+6,p.z)-heightAt(p.x-6,p.z))>2||Math.abs(heightAt(p.x,p.z+6)-heightAt(p.x,p.z-6))>2)continue;
  if(crew?.target&&!constructionApproach(w,p,crew.target))continue;
  return p;
 }return null;
}
function clearRoute(u:Entity):void {u.navPath=[];u.navPathIndex=0;u.roadPathGoal=undefined;u.roadPathRetryAt=0;u.stuckTime=0;}
export function startConstructionAirlift(w:World,u:Entity,home:Entity):boolean {
 const crew=u.constructionCrew!;
 if(w.entities.some(e=>!e.dead&&e.constructionFlight?.homeId===home.id&&e.constructionFlight.phase!=='parked'))return false;
 if(w.teamCredits[u.team]<cfg.airliftCost||w.teamResources[u.team]<cfg.airliftCost)return false;
 const site=u.target&&landingPoint(w,u.target,u);if(!site)return false;
 let carrier=w.entities.find(e=>!e.dead&&e.constructionFlight?.homeId===home.id&&e.constructionFlight.phase==='parked');
 const origin=carrier??landingPoint(w,home);if(!origin)return false;
 const pickup=dist2d(u,origin)>60?landingPoint(w,u):null;if(dist2d(u,origin)>60&&!pickup)return false;
 const arriving=!carrier;
 if(!carrier){const entry=externalEntry(w,u.team,origin);carrier=w.spawn('transport',u.team,entry.x,entry.z);carrier.def={...carrier.def,damage:0,weapons:[],producible:false};carrier.y+=logisticsRules.external.helicopterAltitude;carrier.py=carrier.y;carrier.heading=carrier.pHeading=Math.atan2(origin.x-entry.x,origin.z-entry.z);}
 w.teamCredits[u.team]-=cfg.airliftCost;w.teamResources[u.team]-=cfg.airliftCost;if(u.team===w.playerTeam){w.credits=w.teamCredits[u.team];w.resources=w.teamResources[u.team];}
 // Drive the actual van to the transport before boarding; remote crews request an empty pickup flight.
 crew.transportId=carrier.id;crew.workPoint=undefined;
 carrier.constructionFlight={homeId:home.id,crewId:u.id,phase:arriving?'arriving':pickup?'pickup':'loading',pickup:pickup??undefined,home:{x:origin.x,z:origin.z},site,readyAt:w.time+cfg.loadingSeconds};
 carrier.mode='transport-unload';carrier.airState=arriving?'airborne':'grounded';carrier.fuel=carrier.maxFuel;carrier.cargoDoor=arriving?0:1;carrier.airSortieTime=0;
 clearRoute(u);return true;
}
/** Bounded permanent work pool per HQ/FOB; foundations remain queued until an actual crew is available. */
export function dispatchConstruction(w:World):void {
 const hubs=w.entities.filter(e=>!e.dead&&!e.underConstruction&&(e.kind==='hq'||w.isFOB(e)));
 for(const home of hubs){
  if(w.time<(home.constructionDispatchAt??0))continue;home.constructionDispatchAt=w.time+cfg.dispatchInterval;
  const count=Math.min(cfg.maxCrews,(home.kind==='hq'?cfg.hqCrews:cfg.fobCrews)+w.producerLevel(home)-1);
  for(const u of w.entities){if(u.dead||u.constructionCrew?.homeId!==home.id||u.constructionCrew.slot<count||u.loadedIntoId!=null||u.constructionCrew.transportId)continue;u.target=null;u.dest=null;u.mode='idle';if(u.engineerDuty?.phase==='rest'){u.dead=true;if(home.constructionRoster)home.constructionRoster[u.constructionCrew.slot]=0;}}
  for(let slot=0;slot<count;slot++){
   home.constructionRoster??=[];home.constructionReplacementAt??=[];
   const previous=w.byId.get(home.constructionRoster[slot])??w.entities.find(e=>e.constructionCrew?.homeId===home.id&&e.constructionCrew.slot===slot);
   if(home.constructionRoster[slot]&&(!previous||previous.dead)){if(!home.constructionReplacementAt[slot])home.constructionReplacementAt[slot]=w.time+cfg.replacementSeconds;if(w.time<home.constructionReplacementAt[slot])continue;}
   if(previous&&!previous.dead)continue;
   if(previous)previous.constructionCrew=undefined;
   const rest=home.kind==='hq'?hqStaffPoint(slot,'rest'):{x:cfg.fobRest.x+slot*2,z:cfg.fobRest.z};
   const p=w.nav.nearestWalkable(basePoint(home,rest.x,rest.z),config.depot.walkRadius);if(!p)continue;
   const u=w.spawn('engineer',home.team,p.x,p.z);u.constructionCrew={homeId:home.id,slot};u.def={...u.def,name:'Ehitusmeeskond',damage:0,range:0,weapons:[],radius:config.depot.walkRadius,supplyUsePerSec:0,cost:0,producible:false};u.ammo=u.maxAmmo=0;u.squadMembers=u.squadMaxMembers=cfg.workersPerCrew;const bay=home.kind==='hq'?hqStaffPoint(slot,'van'):{x:cfg.fobVan.x,z:cfg.fobVan.z+slot*config.engineer.van.spacing},park=w.nav.nearestWalkable(basePoint(home,bay.x,bay.z),config.engineer.vanRadius);u.engineerDuty={homeId:home.id,phase:'rest',idleFor:0,vanPoint:park??undefined,vanHeading:home.heading};home.constructionRoster[slot]=u.id;home.constructionReplacementAt[slot]=0;
  }
 }
 const jobs=w.entities.filter(e=>!e.dead&&e.underConstruction&&!e.upgrading&&isBuildable(e.kind)).sort((a,b)=>a.id-b.id);
 for(const job of jobs){
  job.builderIds=job.builderIds.filter(id=>{const u=w.byId.get(id);if(u&&!u.constructionCrew&&u.target===job){u.target=null;u.dest=null;u.mode='idle';u.engineerDuty=undefined;}return !!u&&!u.dead&&!!u.constructionCrew&&u.target===job;});
  const home=hubs.filter(h=>h.team===job.team).sort((a,b)=>dist2d(a,job)-dist2d(b,job)||a.id-b.id)[0];if(!home)continue;
  const desired=Math.min(BUILDINGS[job.kind as keyof typeof BUILDINGS].maxBuilders,job.constructionTime>=10?2:1);
  for(const u of w.entities){
   if(job.builderIds.length>=desired)break;
   const crew=u.constructionCrew;
   if(u.dead||!crew||w.time<(crew.retryAt??0)||crew.homeId!==home.id||crew.slot>=Math.min(cfg.maxCrews,(home.kind==='hq'?cfg.hqCrews:cfg.fobCrews)+w.producerLevel(home)-1)||u.loadedIntoId!=null||crew.transportId||u.target&&!u.target.dead||!['rest','working'].includes(u.engineerDuty?.phase??''))continue;
   u.target=job;u.mode='build';u.dest={x:job.x,z:job.z};crew.workPoint=undefined;crew.blockedFor=0;clearRoute(u);
   const distance=dist2d(u,job),approach=distance>cfg.remoteDistance?null:constructionApproach(w,u,job),length=approach?.path.reduce((sum,p,i,arr)=>sum+dist2d(i?arr[i-1]:u,p),0)??Infinity;
   const remote=distance>cfg.remoteDistance||!approach||length>Math.max(1,distance)*cfg.detourRatio;
   if(remote){if(!startConstructionAirlift(w,u,home)){crew.retryAt=w.time+cfg.pathRetry;u.target=null;u.dest=null;u.mode='idle';continue;}}
   else crew.workPoint=approach!.point;
   u.engineerDuty={homeId:home.id,phase:remote?'rest':'to-van',idleFor:0,vanPoint:u.engineerDuty?.vanPoint,vanHeading:u.engineerDuty?.vanHeading};job.builderIds.push(u.id);
  }
 }
 for(const u of w.entities){
  const crew=u.constructionCrew;if(!crew)continue;
  if(u.dead){crew.retryAt??=w.time+cfg.replacementSeconds;continue;}
  const home=w.byId.get(crew.homeId);if(home&&!home.dead)continue;
  const next=hubs.filter(h=>h.team===u.team).sort((a,b)=>dist2d(a,u)-dist2d(b,u))[0];
  if(next){crew.homeId=next.id;if(u.engineerDuty)u.engineerDuty.homeId=next.id;}else {u.motionSpeed=0;u.target=null;u.dest=null;u.mode='idle';}
 }
}
/** Physical construction airlift; the crew boards, flies, unloads, then drives from the landing zone. */
export function updateConstructionFlight(w:World,u:Entity,dt:number,fly:(p:Point)=>boolean):boolean {
 const f=u.constructionFlight;if(!f)return false;const crew=w.byId.get(f.crewId);
 const home=w.byId.get(f.homeId);
 if(!home||home.dead){const next=constructionHubs(w,u.team).sort((a,b)=>dist2d(a,u)-dist2d(b,u))[0],point=next&&landingPoint(w,next);if(next&&point){f.homeId=next.id;f.home=point;}}
 if(f.phase==='parked'){u.motionSpeed=0;u.airState='grounded';return true;}
 if(!crew||crew.dead){f.returnTrip=true;if(f.phase==='loading'){f.phase='parked';return true;}if(f.phase!=='returning'&&f.phase!=='unloading'){f.phase='returning';f.departed=false;f.readyAt=w.time+cfg.spoolSeconds;}}
 if(f.phase==='arriving'){
  u.mode='transport-unload';u.airState='returning';if(fly(f.pickup??f.home)){f.phase='loading';f.departed=false;u.airState='grounded';u.motionSpeed=0;u.flightVx=u.flightVz=0;}return true;
 }
 if(f.phase==='pickup'){
  if(!f.departed){u.airState='taxi';u.airSortieTime=(u.airSortieTime??0)+dt;if(w.time<f.readyAt)return true;u.y+=mobility.helicopter.climbRate*dt;if(u.y-heightAt(u.x,u.z)<cfg.aircraftClearance)return true;f.departed=true;}
  u.mode='transport-unload';u.airState='returning';if(fly(f.pickup!)){f.phase='loading';f.departed=false;u.airState='grounded';u.motionSpeed=0;}return true;
 }
 if(f.phase==='working'){
  u.airState='grounded';u.motionSpeed=0;
  if(crew?.target&&!crew.target.dead&&crew.target.underConstruction)return true;
  if(crew&&!crew.dead){crew.constructionCrew!.transportId=u.id;crew.engineerDuty={homeId:f.homeId,phase:'travel',idleFor:0,vanPoint:{x:crew.x,z:crew.z}};}
  f.phase='loading';f.returnTrip=true;f.boardingAt=undefined;
 }
 if(f.phase==='loading'){
  u.airState='grounded';u.cargoDoor=1;
  // Ground crew is moved by its normal navigation callback to the aircraft side.
  if(!crew||dist2d(crew,cargoPickupPoint(u))>logisticsRules.handling.porterArrival+1)return true;
  f.boardingAt??=w.time;if(w.time-f.boardingAt<cfg.loadingSeconds)return true;
  crew.loadedIntoId=u.id;u.cargoUnitIds=[crew.id];crew.motionSpeed=0;f.phase=f.returnTrip?'returning':'outbound';f.readyAt=w.time+cfg.spoolSeconds;u.cargoDoor=0;u.airSortieTime=0;
 }
 if(f.phase==='unloading'){
  u.airState='grounded';u.cargoDoor=Math.min(1,(u.cargoDoor??0)+dt);u.motionSpeed=0;
  if(w.time<f.readyAt)return true;
  if(crew&&!crew.dead){crew.loadedIntoId=null;if(f.returnTrip){crew.target=null;crew.dest=null;crew.mode='idle';}const drop=cargoPickupPoint(u);crew.x=drop.x;crew.z=drop.z;crew.y=heightAt(crew.x,crew.z);crew.px=crew.x;crew.pz=crew.z;crew.constructionCrew!.transportId=undefined;crew.constructionCrew!.workPoint=crew.target?constructionApproach(w,crew,crew.target)?.point:undefined;crew.engineerDuty={homeId:f.homeId,phase:f.returnTrip?'return':'travel',idleFor:0,vanPoint:{x:crew.x,z:crew.z}};clearRoute(crew);}
  u.cargoUnitIds=[];f.phase=f.returnTrip?'parked':'working';u.airState='grounded';u.cargoDoor=0;return true;
 }
 if(!f.departed){u.airState='taxi';u.airSortieTime=(u.airSortieTime??0)+dt;if(w.time<f.readyAt)return true;u.y+=mobility.helicopter.climbRate*dt;if(u.y-heightAt(u.x,u.z)<cfg.aircraftClearance)return true;f.departed=true;}
 u.airState='returning';u.mode='transport-unload';
 if(fly(f.phase==='outbound'?f.site:f.home)){
  u.flightVx=u.flightVz=0;u.airState='grounded';u.motionSpeed=0;f.departed=false;
  f.phase='unloading';f.readyAt=w.time+cfg.unloadingSeconds;
 }
 if(crew?.loadedIntoId===u.id){crew.x=u.x;crew.y=u.y;crew.z=u.z;}
 return true;
}
/** Walk to the waiting airlift; preserve navigation and collision handling. */
export function updateConstructionBoarding(w:World,u:Entity,move:(p:Point)=>boolean):boolean {
 const id=u.constructionCrew?.transportId;if(id==null)return false;const carrier=w.byId.get(id);
 if(carrier?.constructionFlight?.phase==='pickup'||carrier?.constructionFlight?.phase==='arriving'){u.motionSpeed=0;return true;}
 if(!carrier||carrier.dead){u.constructionCrew!.transportId=undefined;u.loadedIntoId=null;u.target=null;u.mode='idle';return false;}
 const ramp=cargoPickupPoint(carrier);
 const original=u.def;u.def={...original,speed:config.engineer.vanSpeed,radius:config.engineer.vanRadius,turnRate:config.engineer.vanTurnRate};
 try{move(ramp);}finally{u.def=original;}
 u.engineerDuty={homeId:u.constructionCrew!.homeId,phase:'travel',idleFor:0,vanPoint:{x:u.x,z:u.z}};return true;
}

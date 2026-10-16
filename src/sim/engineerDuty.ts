import {turnToward,wrapAngle} from './math';
import {constructionApproach,constructionReach,startConstructionAirlift} from './automaticConstruction';
import config from '../data/base-life.json';
import {basePoint,hqStaffPoint} from './baseLayout';
import type {World} from './World';
import type {Entity,Point} from './types';
const cfg=config.engineer;
/** The engineer, van and construction share one saved fixed-tick duty state. */
export function updateEngineerDuty(w:World,u:Entity,dt:number,move:(p:Point)=>boolean):boolean {
 if(!u.constructionCrew){u.engineerDuty=undefined;return false;}
 if(u.kind!=='engineer'||u.dead||u.loadedIntoId!=null||u.garrisonId)return false;
 const work=(u.mode==='build'||u.mode==='repair')&&!!u.target&&!u.target.dead;
 if(!work&&u.mode!=='idle'){u.engineerDuty=undefined;return false;}
 let duty=u.engineerDuty;
 if(!duty){
  const hq=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind==='hq'&&Math.hypot(e.x-u.x,e.z-u.z)<cfg.homeRadius).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!hq)return false;duty=u.engineerDuty={homeId:hq.id,phase:work?'to-van':'working',idleFor:0};
 }
 const home=w.byId.get(duty.homeId);if(!home||home.dead){u.engineerDuty=undefined;return false;}
 const slot=u.constructionCrew.slot,vanBase=home.kind==='hq'?hqStaffPoint(slot,'van'):{x:config.construction.fobVan.x,z:config.construction.fobVan.z+slot*cfg.van.spacing},restBase=home.kind==='hq'?hqStaffPoint(slot,'rest'):{x:config.construction.fobRest.x+(slot%2)*cfg.rest.spacing,z:config.construction.fobRest.z+Math.floor(slot/2)*cfg.rest.spacing};
 const van=w.nav.nearestWalkable(basePoint(home,vanBase.x,vanBase.z),cfg.vanRadius),rest=w.nav.nearestWalkable(basePoint(home,restBase.x,restBase.z),u.def.radius);
 if(work){
  duty.idleFor=0;
  if(duty.phase==='rest'||duty.phase==='return')duty.phase='to-van';
  if(duty.phase==='working'&&u.target&&Math.hypot(u.x-u.target.x,u.z-u.target.z)>constructionReach(w,u.target))duty.phase='travel';
 }else if(duty.phase==='working'){
  duty.idleFor+=dt;if(duty.idleFor<cfg.restAfter)return false;if(!duty.vanPoint){duty.phase='rest';if(van)duty.vanPoint={...van};}else duty.phase='return';
 }
 const drive=(p:Point):boolean=>{const original=u.def;u.def={...original,speed:cfg.vanSpeed,radius:cfg.vanRadius,turnRate:cfg.vanTurnRate};try{return move(p);}finally{u.def=original;}};
 if(duty.phase==='to-van'){
  const door=van&&w.nav.nearestWalkable(basePoint({...home,x:van.x,z:van.z},cfg.vanRadius+.3,0),u.def.radius);
  if(!door||!move(door))return true;duty.phase='boarding';duty.readyAt=w.time+cfg.boardingSeconds;duty.vanPoint=van??duty.vanPoint;duty.vanHeading=home.heading;return true;
 }
 if(duty.phase==='boarding'){u.motionSpeed=0;if(w.time<(duty.readyAt??0))return true;if(duty.vanPoint){u.x=duty.vanPoint.x;u.z=duty.vanPoint.z;u.px=u.x;u.pz=u.z;}duty.phase=work?'travel':'return';return true;}
 if(duty.phase==='travel'){
  if(!u.target){duty.phase='return';return true;}
  const distance=Math.hypot(u.target.x-u.x,u.target.z-u.z);
  if(distance<=constructionReach(w,u.target)){duty.phase='working';duty.vanPoint={x:u.x,z:u.z};u.motionSpeed=0;return false;}
  const crew=u.constructionCrew!;
  if(!crew.workPoint||!w.nav.isWalkableWorld(crew.workPoint.x,crew.workPoint.z,cfg.vanRadius)){
   if(w.time<(crew.retryAt??0))return true;crew.retryAt=w.time+config.construction.pathRetry;crew.workPoint=constructionApproach(w,u,u.target)?.point;
  }
  const before={x:u.x,z:u.z};if(crew.workPoint)drive(crew.workPoint);duty.vanHeading=u.heading;
  crew.blockedFor=Math.hypot(u.x-before.x,u.z-before.z)<.01?(crew.blockedFor??0)+dt:0;
  if(crew.blockedFor>config.construction.jamAirliftSeconds){crew.blockedFor=0;crew.workPoint=undefined;startConstructionAirlift(w,u,home);}
  duty.vanPoint={x:u.x,z:u.z};return true;
 }
 if(duty.phase==='return'){
  if(!van||!drive(van)){duty.vanHeading=u.heading;duty.vanPoint={x:u.x,z:u.z};return true;}
  duty.vanPoint={...van};u.motionSpeed=0;u.heading=turnToward(u.heading,home.heading,cfg.vanTurnRate*dt);duty.vanHeading=u.heading;if(Math.abs(wrapAngle(home.heading-u.heading))>.1)return true;duty.phase='rest';return true;
 }
 if(duty.phase==='rest'){
  if(rest&&!move(rest))return true;u.motionSpeed=0;return true;
 }
 return false;
}

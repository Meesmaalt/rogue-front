import config from '../data/base-life.json';
import {basePoint} from './baseLayout';
import type {World} from './World';
import type {Entity,Point} from './types';
const cfg=config.engineer;
/** The engineer, van and construction share one saved fixed-tick duty state. */
export function updateEngineerDuty(w:World,u:Entity,dt:number,move:(p:Point)=>boolean):boolean {
 if(u.kind!=='engineer'||u.dead||u.loadedIntoId!=null||u.garrisonId)return false;
 const work=(u.mode==='build'||u.mode==='repair')&&!!u.target&&!u.target.dead;
 if(!work&&u.mode!=='idle'){u.engineerDuty=undefined;return false;}
 let duty=u.engineerDuty;
 if(!duty){
  const hq=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===u.team&&e.kind==='hq'&&Math.hypot(e.x-u.x,e.z-u.z)<cfg.homeRadius).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!hq)return false;duty=u.engineerDuty={homeId:hq.id,phase:work?'to-van':'working',idleFor:0};
 }
 const home=w.byId.get(duty.homeId);if(!home||home.dead){u.engineerDuty=undefined;return false;}
 const van=w.nav.nearestWalkable(basePoint(home,cfg.van.x,cfg.van.z+(u.id%3)*cfg.van.spacing),cfg.vanRadius),rest=w.nav.nearestWalkable(basePoint(home,cfg.rest.x+(u.id%2)*cfg.rest.spacing,cfg.rest.z+Math.floor((u.id%4)/2)*cfg.rest.spacing),u.def.radius);
 if(work){
  duty.idleFor=0;
  if(duty.phase==='rest'||duty.phase==='return')duty.phase='to-van';
  if(duty.phase==='working'&&u.target&&Math.hypot(u.x-u.target.x,u.z-u.target.z)>cfg.workDistance)duty.phase='travel';
 }else if(duty.phase==='working'){
  duty.idleFor+=dt;if(duty.idleFor<cfg.restAfter)return false;if(!duty.vanPoint){duty.phase='rest';if(van)duty.vanPoint={...van};}else duty.phase='return';
 }
 const drive=(p:Point):boolean=>{const original=u.def;u.def={...original,speed:cfg.vanSpeed,radius:cfg.vanRadius,turnRate:cfg.vanTurnRate};try{return move(p);}finally{u.def=original;}};
 if(duty.phase==='to-van'){
  if(!van||!move(van))return true;duty.phase='boarding';duty.readyAt=w.time+cfg.boardingSeconds;duty.vanPoint={x:u.x,z:u.z};return true;
 }
 if(duty.phase==='boarding'){u.motionSpeed=0;if(w.time<(duty.readyAt??0))return true;duty.phase=work?'travel':'return';return true;}
 if(duty.phase==='travel'){
  if(!u.target){duty.phase='return';return true;}
  const distance=Math.hypot(u.target.x-u.x,u.target.z-u.z);
  if(distance<=cfg.workDistance){duty.phase='working';duty.vanPoint={x:u.x,z:u.z};u.motionSpeed=0;return false;}
  const span=Math.max(0,distance-Math.max(cfg.vanRadius*2,cfg.workDistance-w.nav.cellSize)),point=w.nav.nearestWalkable({x:u.x+(u.target.x-u.x)/distance*span,z:u.z+(u.target.z-u.z)/distance*span},cfg.vanRadius);
  if(point)drive(point);duty.vanPoint={x:u.x,z:u.z};return true;
 }
 if(duty.phase==='return'){
  if(!van||!drive(van)){duty.vanPoint={x:u.x,z:u.z};return true;}
  duty.vanPoint={...van};duty.phase='rest';return true;
 }
 if(duty.phase==='rest'){
  if(rest&&!move(rest))return true;u.motionSpeed=0;return true;
 }
 return false;
}

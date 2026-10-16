import rules from '../data/battle-smoke.json';
import type {World} from './World';
import type {Entity,Point} from './types';
import {heightAt} from './heightmap';
export interface SmokeCloud extends Point {id:number;y:number;born:number;expires:number}
export function smokeCapacity(u:Entity):number {
 if(u.def.building||u.def.domain!=='land'||u.constructionCrew||u.groundService)return 0;
 return (rules.vehicleKinds as string[]).includes(u.kind)?rules.vehicleCharges:(rules.infantryKinds as string[]).includes(u.kind)?rules.infantryCharges:0;
}
export function smokeCharges(u:Entity):number {return u.smokeCharges??smokeCapacity(u);}
export function smokeReady(u:Entity,time:number):boolean {return smokeCapacity(u)>0&&!u.dead&&!u.underConstruction&&u.loadedIntoId==null&&!u.garrisonId&&!u.airdrop&&(u.disabledUntil??0)<=time&&smokeCharges(u)>0&&time>=(u.smokeReadyAt??0);}
export function smokeState(cloud:SmokeCloud,time:number){
 const age=Math.max(0,time-cloud.born),build=Math.min(1,age/rules.growSeconds),fade=Math.max(0,Math.min(1,(cloud.expires-time)/rules.fadeSeconds));
 return {radius:rules.radius*(.3+.7*build),density:build*fade};
}
/** Optical screen, not immunity. Radar, terrain and rounds already in flight keep their own rules. */
export class BattleSmoke {
 private clouds:SmokeCloud[]=[];
 private time=0;
 private prepared:Array<SmokeCloud&{radius:number;density:number}>=[];
 private prepare():void {this.prepared=this.clouds.map(c=>({...c,...smokeState(c,this.time)}));}
 get active():readonly SmokeCloud[]{return this.clouds;}
 tick(time:number):void {this.time=time;for(let i=this.clouds.length-1;i>=0;i--)if(this.clouds[i].expires<=time)this.clouds.splice(i,1);this.prepare();}
 deploy(w:World,u:Entity):boolean {
  if(!smokeReady(u,w.time)||this.clouds.length>=rules.maxClouds)return false;
  const edge=w.mapSize/2-rules.radius,x=Math.max(-edge,Math.min(edge,u.x+Math.sin(u.heading)*rules.forwardOffset)),z=Math.max(-edge,Math.min(edge,u.z+Math.cos(u.heading)*rules.forwardOffset));
  this.clouds.push({id:w.nextId++,x,z,y:heightAt(x,z),born:w.time,expires:w.time+rules.duration});this.time=w.time;this.prepare();
  u.smokeCharges=smokeCharges(u)-1;u.smokeReadyAt=w.time+rules.cooldown;u.smokeReloadProgress=0;
  w.events.push({type:'smoke-deployed',team:u.team,unitId:u.id,x,y:heightAt(x,z),z});return true;
 }
 /** Exact cylinder/segment intervals avoid sampling through a small new cloud. */
 blocks(a:Entity,b:Entity):boolean {
  if(!this.clouds.length)return false;
  const ax=a.x,ay=a.y+a.def.height*.7,az=a.z,dx=b.x-ax,dy=b.y+b.def.height*.65-ay,dz=b.z-az,length=Math.hypot(dx,dy,dz);
  if(length<rules.minimumRayLength)return false;
  let depth=0;
  for(const cloud of this.prepared){
   const state=cloud;if(state.density<=0)continue;
   if(Math.max(ax,b.x)<cloud.x-state.radius||Math.min(ax,b.x)>cloud.x+state.radius||Math.max(az,b.z)<cloud.z-state.radius||Math.min(az,b.z)>cloud.z+state.radius)continue;
   const ox=ax-cloud.x,oz=az-cloud.z,qa=dx*dx+dz*dz,qb=2*(ox*dx+oz*dz),qc=ox*ox+oz*oz-state.radius**2;
   let start=0,end=1;
   if(qa<.000001){if(qc>0)continue;}else {const discriminant=qb*qb-4*qa*qc;if(discriminant<0)continue;const root=Math.sqrt(discriminant);start=Math.max(0,(-qb-root)/(2*qa));end=Math.min(1,(-qb+root)/(2*qa));}
   if(Math.abs(dy)<.000001){if(ay<cloud.y||ay>cloud.y+rules.height)continue;}else {const bottom=(cloud.y-ay)/dy,top=(cloud.y+rules.height-ay)/dy;start=Math.max(start,Math.min(bottom,top));end=Math.min(end,Math.max(bottom,top));}
   if(end>start)depth+=(end-start)*length*state.density*rules.density;
   if(depth>=rules.blockDepth)return true;
  }
  return false;
 }
 snapshot():{time:number;clouds:SmokeCloud[]}{return {time:this.time,clouds:this.clouds.map(c=>({...c}))};}
 restore(state?:ReturnType<BattleSmoke['snapshot']>):void {this.time=state?.time??0;this.clouds=(state?.clouds??[]).map(c=>({...c}));this.prepare();}
}
/** Charges are finite stores; replenishment is stationary and consumes ammunition. */
export function refillSmoke(w:World,u:Entity,depot:Entity|null,dt:number):void {
 const capacity=smokeCapacity(u);if(!capacity||smokeCharges(u)>=capacity)return;
 if(!depot||u.loadedIntoId!=null||u.garrisonId||(u.motionSpeed??0)>.5||(u.suppression??0)>20||w.time-u.lastCombatTime<rules.serviceSafetySeconds||(depot.ammoStock??0)<rules.ammoPerCharge){u.smokeReloadProgress=0;return;}
 u.smokeReloadProgress=(u.smokeReloadProgress??0)+dt;
 if(u.smokeReloadProgress>=rules.reloadSeconds){depot.ammoStock=(depot.ammoStock??0)-rules.ammoPerCharge;u.smokeCharges=smokeCharges(u)+1;u.smokeReloadProgress=0;}
}

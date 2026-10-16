import rules from '../data/logistics.json';
import type {World} from './World';
import type {Entity,Point} from './types';
import {maxHitPoints,travelPathCost} from './unitStats';
import {findPath} from './nav/Pathfinder';
import {serviceFuelAvailable} from './stockLogistics';
import {weaponAmmo,weaponSpec} from './systems/combat';
import {supplyRadiusFor,tacticalSupplyNodes} from './systems/tacticalSupply';
import {constructionHelper} from './automaticConstruction';
import {depotPad} from './depotPads';

const cfg=rules.vehicleService;
const components=['engine','tracks','turret','weapon','crew','ammo'] as const;
export function canVehicleService(u:Entity):boolean {
 return !u.dead&&!u.def.building&&u.def.speed>0&&u.def.domain==='land'&&u.def.category!=='infantry'&&!u.squadMaxMembers&&!constructionHelper(u)&&!['logiTruck','groundHandler'].includes(u.kind)&&u.loadedIntoId==null&&!u.airdrop&&!u.refit;
}
function needs(u:Entity){
 return {repair:Math.max(maxHitPoints(u)-u.hp,Math.max(0,...Object.values(u.components??{}))/rules.groundRepair.componentPerStock)>cfg.tolerance,
 fuel:(u.maxFuel??0)-(u.fuel??0)>cfg.tolerance,
 ammo:(u.maxAmmo??0)-(u.ammo??0)>cfg.tolerance||(u.def.weapons??[]).some((_,i)=>i>0&&weaponSpec(u,i).ammoCapacity-weaponAmmo(u,i)>cfg.tolerance)};
}
function missingStock(u:Entity,d:Entity):string[] {
 const n=needs(u),out:string[]=[];
 if(n.repair&&(d.repairStock??0)<=cfg.tolerance)out.push('remondivaru');
 if(n.ammo&&(d.ammoStock??0)<=cfg.tolerance)out.push('laskemoon');
 if(n.fuel&&serviceFuelAvailable(d)<=cfg.tolerance)out.push('kütus');
 return out;
}
/** Only run on orders or a bounded retry; never search paths every frame/tick. */
export function planVehicleService(w:World,u:Entity):{depotId:number;point:Point}|null {
 const nodes=tacticalSupplyNodes(w,u.team).sort((a,b)=>missingStock(u,a).length-missingStock(u,b).length||Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id);
 for(const d of nodes){
  const n=needs(u);
  if((n.repair||n.fuel||n.ammo)&&missingStock(u,d).length===Number(n.repair)+Number(n.fuel)+Number(n.ammo))continue;
  const occupied=w.entities.filter(e=>e!==u&&!e.dead&&e.loadedIntoId==null&&!e.garrisonId);
  const points:Point[]=[];
  for(const radius of cfg.parkingRings){
   if(radius>=supplyRadiusFor(d,w)-u.def.radius)continue;
   const angle=Math.atan2(u.x-d.x,u.z-d.z);
   for(let i=0;i<cfg.parkingSlots;i++){
    const a=angle+i*Math.PI*2/cfg.parkingSlots,p={x:d.x+Math.sin(a)*radius,z:d.z+Math.cos(a)*radius};
    if(!w.nav.isWalkableWorld(p.x,p.z,u.def.radius+cfg.parkingClearance))continue;
    if(occupied.some(e=>e.def.speed>0&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+u.def.radius+cfg.parkingClearance||e.vehicleService&&e.vehicleService.phase!=='ready'&&Math.hypot(e.vehicleService.point.x-p.x,e.vehicleService.point.z-p.z)<e.def.radius+u.def.radius+cfg.parkingClearance))continue;
    if(d.kind==='supply'&&Array.from({length:rules.handling.padLevels[2]},(_,slot)=>depotPad(d,slot)).some(q=>Math.hypot(q.x-p.x,q.z-p.z)<rules.handling.padRadius+u.def.radius+cfg.parkingClearance))continue;
    points.push(p);
   }
  }
  points.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
  for(const point of points.slice(0,cfg.pathAttempts))if(findPath(w.nav,u,point,u.def.radius,travelPathCost(w,u),[],cfg.pathNodeBudget).length)return {depotId:d.id,point};
 }
 return null;
}

/** Shared status for the HUD and tests; servicing never creates stock or credits. */
export function vehicleServiceStatus(w:World,u:Entity):string {
 const s=u.vehicleService;if(!s)return '';
 if(s.phase==='ready')return 'Teenindatud · valmis uueks käsuks';
 if(s.phase==='blocked')return 'Teenindus peatatud · baas või läbipääs puudub';
 if(s.phase==='travel')return (u.maxFuel??0)>0&&(u.fuel??0)<=.5?'Kütus otsas · vajab varustusveokit':'Teel teenindusse';
 if(s.phase==='danger')return 'Teenindus pausil · üksus on tule all';
 const d=w.byId.get(s.depotId),missing=d?missingStock(u,d):[];
 return s.phase==='stock'?'Ootab tarnet: '+missing.join(', '):'Teenindamisel · remont, kütus ja moon';
}
export function vehicleServiceProgress(u:Entity):number {
 const ratios=[u.hp/maxHitPoints(u)];
 if((u.maxFuel??0)>0)ratios.push((u.fuel??0)/u.maxFuel!);
 if((u.maxAmmo??0)>0)ratios.push((u.ammo??0)/u.maxAmmo!);
 for(let i=1;i<(u.def.weapons?.length??0);i++){const cap=weaponSpec(u,i).ammoCapacity;if(cap>0)ratios.push(weaponAmmo(u,i)/cap);}
 if(u.components)ratios.push(...Object.values(u.components).map(v=>1-Math.min(1,v/100)));
 return Math.max(0,Math.min(1,...ratios));
}
export function updateVehicleService(w:World,u:Entity,dt:number,move:(p:Point)=>boolean):boolean {
 const s=u.vehicleService;if(!s||s.phase==='ready')return false;
 if(!canVehicleService(u)){u.vehicleService=undefined;return false;}
 if(u.hp<s.lastHp-cfg.tolerance)s.safeAfter=w.time+cfg.safeSeconds;
 s.lastHp=u.hp;
 let d=w.byId.get(s.depotId);
 const unavailable=!d||d.dead||d.team!==u.team||d.underConstruction||(d.disabledUntil??0)>w.time||!w.nav.isWalkableWorld(s.point.x,s.point.z,u.def.radius);
 if(unavailable||s.phase==='blocked'){
  s.phase='blocked';
  if(w.time>=s.retryAt){
   s.retryAt=w.time+cfg.retrySeconds;const plan=planVehicleService(w,u);
   if(plan){s.depotId=plan.depotId;s.point=plan.point;s.phase='travel';u.navPath=[];u.roadTripGoal=undefined;d=w.byId.get(plan.depotId);}
   else s.phase='blocked';
  }
  if(s.phase==='blocked'||!d){u.motionSpeed=0;u.dest=null;return true;}
 }
 if(!d)return true;
 if(Math.hypot(u.x-s.point.x,u.z-s.point.z)>cfg.arrival){s.phase='travel';u.mode='move';u.dest={...s.point};u.target=null;u.holdPosition=false;move(s.point);return true;}
 u.motionSpeed=0;u.dest=null;u.target=null;u.mode='hold';u.holdPosition=true;u.navPath=[];u.roadTripGoal=undefined;
 if(w.time<s.safeAfter){s.phase='danger';return true;}
 const work=Math.max(maxHitPoints(u)-u.hp,Math.max(0,...Object.values(u.components??{}))/rules.groundRepair.componentPerStock);
 const repair=Math.max(0,Math.min(work,cfg.repairPerSecond*w.repairMultiplier(u.team)*dt,d.repairStock??0));
 if(repair>0){
  d.repairStock=(d.repairStock??0)-repair;u.hp=Math.min(maxHitPoints(u),u.hp+repair);
  if(u.components)for(const key of components)u.components[key]=Math.max(0,u.components[key]-repair*rules.groundRepair.componentPerStock);
 }
 const n=needs(u);
 if(!n.repair&&!n.ammo&&!n.fuel){s.phase='ready';u.fastMove=false;w.events.push({type:'unit-serviced',team:u.team,unitId:u.id,x:u.x,z:u.z});return false;}
 s.phase=missingStock(u,d).length?'stock':'working';return true;
}

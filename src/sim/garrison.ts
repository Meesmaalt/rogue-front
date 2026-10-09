import rules from '../data/garrison.json';
import type {World} from './World';
import type {Entity,Point,Projectile,WeaponSpec} from './types';
import type {MapFeatureDef} from './mapFeatures';
import {heightAt} from './heightmap';
import {maxHitPoints} from './unitStats';
import {isPassenger} from './transport';
import {findPath} from './nav/Pathfinder';
export const GARRISON_RULES=rules;
export function isGarrisonBuilding(f:MapFeatureDef):boolean {
 return f.kind==='building'&&f.garrisonable!==false&&!['resource-oil','resource-industrial','yard'].includes(f.appearance??'')&&f.width>=rules.minimumWidth&&f.depth>=rules.minimumWidth&&(f.height??3)>=rules.minimumHeight;
}
export function garrisonCapacity(f:MapFeatureDef):number {return isGarrisonBuilding(f)?Math.max(1,Math.min(rules.maxSquads,f.garrisonCapacity??Math.floor(f.width*f.depth/rules.areaPerSquad))):0;}
export function garrisonOccupants(w:World,id:string,reserved=false):Entity[] {return w.entities.filter(u=>!u.dead&&(u.garrisonId===id||reserved&&u.garrisonOrderId===id));}
export function buildingCondition(w:World,f:MapFeatureDef):number {return w.infrastructureDamage.get(f.id)??0;}
/** Structural damage progressively removes concealment and protection; roof crews are exposed. */
export function garrisonCover(w:World,u:Entity):number {
 return u.garrisonId?(isRoofSquad(u)?rules.roofAccuracyCover:rules.windowAccuracyCover)*(1-(w.infrastructureDamage.get(u.garrisonId)??0)):0;
}
export function garrisonProtection(w:World,u:Entity,bullet:boolean):number {
 if(!u.garrisonId)return 1;
 const base=isRoofSquad(u)?(bullet?rules.roofSmallArmsMultiplier:rules.roofHeavyWeaponMultiplier):(bullet?rules.smallArmsMultiplier:rules.heavyWeaponMultiplier);
 return base+(1-base)*(w.infrastructureDamage.get(u.garrisonId)??0);
}
export function garrisonConcealment(w:World,u:Entity):number {
 return garrisonCover(w,u)/rules.windowAccuracyCover*rules.detectionCover;
}
function localPoint(f:MapFeatureDef,x:number,z:number):Point {const a=f.rotation??0;return {x:f.x+x*Math.cos(a)+z*Math.sin(a),z:f.z-x*Math.sin(a)+z*Math.cos(a)};}
function normal(f:MapFeatureDef,slot:number):number {return (f.rotation??0)+slot*Math.PI/2;}
export function garrisonPort(f:MapFeatureDef,slot:number,roof=false):Point&{y:number;facing:number} {
 const a=slot*Math.PI/2,offset=roof?-rules.roofOffset:rules.windowOffset;
 const p=localPoint(f,Math.sin(a)*(f.width/2+offset),Math.cos(a)*(f.depth/2+offset));
 return {...p,y:heightAt(f.x,f.z)+(roof?(f.height??3)+.1:Math.min(rules.windowHeight,(f.height??3)-1.7)),facing:normal(f,slot)};
}
export function isRoofSquad(u:Entity):boolean {return u.kind==='manpad';}
export function garrisonFaces(u:Entity,p:Point):boolean {
 if(!u.garrisonId)return true;
 const dx=p.x-u.x,dz=p.z-u.z,d=Math.hypot(dx,dz)||1,a=u.garrisonFacing??u.heading;
 return (Math.sin(a)*dx+Math.cos(a)*dz)/d>=Math.cos(rules.firingArc/2);
}
export function garrisonWeaponUsable(u:Entity,spec:WeaponSpec):boolean {
 return !u.garrisonId||(spec.flight!=='ballistic'&&(spec.targets!=='air'||isRoofSquad(u)));
}
export function garrisonWeaponAllowed(u:Entity,spec:WeaponSpec,t:Entity,sector=true):boolean {
 return garrisonWeaponUsable(u,spec)&&(!sector||garrisonFaces(u,t));
}
function valid(w:World,u:Entity,f:MapFeatureDef):boolean {
 const occupants=garrisonOccupants(w,f.id,true).filter(e=>e!==u);
 return isPassenger(u)&&!u.dead&&u.loadedIntoId==null&&isGarrisonBuilding(f)&&buildingCondition(w,f)<1&&occupants.length<garrisonCapacity(f)&&occupants.every(e=>e.team===u.team);
}
function clearOrders(u:Entity):void {u.target=null;u.dest=null;u.navPath=[];u.navPathIndex=0;u.moveQueue=[];u.moveQueueStyles=[];u.moveGroup=undefined;u.flowField=null;u.fastMove=false;u.fireMission=null;}
/** Real approach to an accessible facade; the squad is placed inside only after reaching this doorway. */
export function orderGarrison(w:World,u:Entity,f:MapFeatureDef):boolean {
 if(u.garrisonId===f.id)return true;
 if(!valid(w,u,f)||u.garrisonId&&!leaveGarrison(w,u))return false;
 const doors=Array.from({length:4},(_,slot)=>{const a=slot*Math.PI/2,p=localPoint(f,Math.sin(a)*(f.width/2+u.def.radius+rules.doorClearance),Math.cos(a)*(f.depth/2+u.def.radius+rules.doorClearance));return p;}).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
 for(const door of doors){
  if(!w.nav.isWalkableWorld(door.x,door.z,u.def.radius))continue;
  const path=findPath(w.nav,u,door,u.def.radius);if(!path.length)continue;
  clearOrders(u);u.garrisonOrderId=f.id;u.garrisonEntryPoint=door;u.garrisonOrderDeadline=w.time+rules.entryTimeout;u.mode='enter-building';u.dest=door;u.holdPosition=false;u.navPath=path;u.roadPathGoal=door;return true;
 }
 return false;
}
function setPort(u:Entity,f:MapFeatureDef,slot:number):void {
 const p=garrisonPort(f,slot,isRoofSquad(u));u.garrisonSlot=slot;u.garrisonFacing=p.facing;u.x=u.px=p.x;u.z=u.pz=p.z;u.y=p.y;u.heading=u.pHeading=p.facing;u.motionSpeed=0;
}
/** Exterior exit is derived from the facade, not from the roof/window coordinates. */
export function leaveGarrison(w:World,u:Entity):boolean {
 const f=w.mapFeatures.find(f=>f.id===u.garrisonId);if(!f)return !u.garrisonId;
 const start=(u.garrisonSlot??0)*Math.PI/2;
 for(let extra=rules.doorClearance;extra<=rules.exitSearch;extra+=2)for(let i=0;i<4;i++){
  const a=start+i*Math.PI/2,p=localPoint(f,Math.sin(a)*(f.width/2+u.def.radius+extra),Math.cos(a)*(f.depth/2+u.def.radius+extra));
  if(!w.nav.isWalkableWorld(p.x,p.z,u.def.radius))continue;
  const facade=localPoint(f,Math.sin(a)*(f.width/2+u.def.radius+rules.doorClearance),Math.cos(a)*(f.depth/2+u.def.radius+rules.doorClearance));
  let clear=true;const n=Math.max(1,Math.ceil(Math.hypot(p.x-facade.x,p.z-facade.z)));for(let j=0;j<=n;j++)if(!w.nav.isWalkableWorld(facade.x+(p.x-facade.x)*j/n,facade.z+(p.z-facade.z)*j/n,u.def.radius)){clear=false;break;}if(!clear)continue;
  if(w.entities.some(e=>e!==u&&!e.dead&&!e.garrisonId&&e.loadedIntoId==null&&e.def.domain!=='air'&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+u.def.radius+.5))continue;
  u.garrisonId=undefined;u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;u.garrisonExitPoint=undefined;u.garrisonCollapseSeen=undefined;u.garrisonLookPoint=undefined;clearOrders(u);u.x=u.px=p.x;u.z=u.pz=p.z;u.y=heightAt(p.x,p.z);u.mode='idle';u.holdPosition=false;u.motionSpeed=0;return true;
 }
 return false;
}
export function requestGarrisonExit(w:World,u:Entity,p?:Point):void {
 u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;
 if(!u.garrisonId){clearOrders(u);u.mode=p?"move":"idle";u.dest=p?{...p}:null;return;}
 if(leaveGarrison(w,u)){if(p){u.mode='move';u.dest={...p};}}else {u.mode='leave-building';u.garrisonExitPoint=p?{...p}:undefined;u.garrisonExitRetryAt=0;}
}
export function updateGarrisons(w:World,dt:number,applyDamage:(u:Entity,amount:number)=>void):void {
 for(const u of w.entities){
  if(u.dead||u.loadedIntoId!=null)continue;
  if(u.garrisonId){
   const f=w.mapFeatures.find(f=>f.id===u.garrisonId);if(!f)continue;
   const ruined=buildingCondition(w,f)>=1;
   if(ruined&&!u.garrisonCollapseSeen){u.garrisonCollapseSeen=true;applyDamage(u,maxHitPoints(u)*rules.collapseDamageFraction);}
   if(ruined||u.mode==='leave-building'||u.mode==='move'||u.mode==='amove'){
    if(w.time>=(u.garrisonExitRetryAt??0)){u.garrisonExitRetryAt=w.time+rules.exitRetry;const dest=u.garrisonExitPoint??u.dest;if(leaveGarrison(w,u)&&dest){u.mode='move';u.dest={...dest};}}
    if(ruined&&u.garrisonId&&!u.dead)applyDamage(u,maxHitPoints(u)*rules.trappedDamagePerSecond*dt);
    continue;
   }
   // Ports have a real sector. Scan slowly when idle; a known attack contact may choose a different free port.
   if(w.time>=(u.garrisonShiftAt??0)){
    const occupied=new Set(garrisonOccupants(w,f.id).filter(e=>e!==u&&isRoofSquad(e)===isRoofSquad(u)).map(e=>e.garrisonSlot));
    let slot=((u.garrisonSlot??0)+1)%4;
    const look=u.garrisonLookPoint??(u.target&&!u.target.dead&&w.isSpottedByTeam(u.target,u.team)?u.target:null);
    if(look)slot=Array.from({length:4},(_,i)=>i).sort((a,b)=>{const pa=garrisonPort(f,a),pb=garrisonPort(f,b);return Math.hypot(pa.x-look.x,pa.z-look.z)-Math.hypot(pb.x-look.x,pb.z-look.z);})[0];
    if(!occupied.has(slot)){if(slot!==u.garrisonSlot)setPort(u,f,slot);u.garrisonShiftAt=w.time+(u.target?rules.portShiftTime:rules.scanInterval);}else u.garrisonShiftAt=w.time+rules.portShiftTime;
   }
  }else if(u.garrisonOrderId){
   const f=w.mapFeatures.find(f=>f.id===u.garrisonOrderId);
   if(!f||!valid(w,u,f)||w.time>(u.garrisonOrderDeadline??Infinity)||u.mode!=='enter-building'){u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;if(u.mode==='enter-building'){u.mode='idle';u.dest=null;}continue;}
   const door=u.garrisonEntryPoint;if(!door||Math.hypot(u.x-door.x,u.z-door.z)>rules.entryReach)continue;
   const taken=new Set(garrisonOccupants(w,f.id).filter(e=>isRoofSquad(e)===isRoofSquad(u)).map(e=>e.garrisonSlot));
   const slots=Array.from({length:4},(_,i)=>i).filter(i=>!taken.has(i)).sort((a,b)=>{const pa=garrisonPort(f,a),pb=garrisonPort(f,b);return Math.hypot(pa.x-u.x,pa.z-u.z)-Math.hypot(pb.x-u.x,pb.z-u.z);});
   if(!slots.length)continue;
   clearOrders(u);u.garrisonId=f.id;u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;u.mode='hold';u.holdPosition=true;u.garrisonShiftAt=w.time+rules.scanInterval;setPort(u,f,slots[0]);
  }
 }
}
export function impactGarrisonBuildings(w:World,p:Projectile,applyDamage:(u:Entity,amount:number)=>void):void {
 if(p.weapon==='bullet')return;
 for(const f of w.mapFeatures){
  if((!isGarrisonBuilding(f)&&f.kind!=="bridge")||buildingCondition(w,f)>=1)continue;
  const a=f.rotation??0,dx=p.x-f.x,dz=p.z-f.z,lx=dx*Math.cos(a)-dz*Math.sin(a),lz=dx*Math.sin(a)+dz*Math.cos(a);
  const distance=Math.hypot(Math.max(0,Math.abs(lx)-f.width/2),Math.max(0,Math.abs(lz)-f.depth/2));
  const splash=p.warhead==='kinetic'?0:p.splash??0;
  if(distance>Math.max(.8,splash)||p.y>heightAt(f.x,f.z)+(f.height??3)+Math.max(2,splash))continue;
  const fraction=Math.max(.1,1-distance/Math.max(1,splash)),dealt=p.damage*fraction*(p.warhead==='kinetic'?.5:1);
  const hp=Math.min(rules.maximumHp,Math.max(rules.minimumHp,f.width*f.depth*rules.structureHpPerSquareMetre));
  w.damageInfrastructure(f.id,dealt/hp);
  for(const u of garrisonOccupants(w,f.id)){applyDamage(u,dealt*rules.blastTransmission);u.suppression=Math.min(100,(u.suppression??0)+rules.blastSuppression*fraction);}
 }
}

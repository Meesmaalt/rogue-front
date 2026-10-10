import rules from '../../data/ai-tactics.json';
import type {World} from '../World';
import type {Entity,Team,IntelContact,Point} from '../types';
import {maxHitPoints} from '../unitStats';
import {weaponAmmo,weaponSpec} from '../systems/combat';
export const AI_RULES=rules;
/** Hidden live entities never update a remembered contact. Map bases are public locations, not live HQ references. */
export function knownContacts(w:World,team:Team):IntelContact[] {
 const result=new Map(w.getFreshIntel(team,rules.contactAge).map(c=>[c.entityId,{...c}]));
 for(const e of w.entities)if(e.team!==team&&!e.dead&&e.loadedIntoId==null&&w.isSpottedByTeam(e,team))result.set(e.id,{entityId:e.id,team:e.team,kind:e.kind,x:e.x,z:e.z,lastSeen:w.time,shared:false});
 return [...result.values()].sort((a,b)=>b.lastSeen-a.lastSeen||a.entityId-b.entityId);
}
export function visibleEnemies(w:World,team:Team):Entity[] {return w.entities.filter(e=>!e.dead&&e.team!==team&&e.loadedIntoId==null&&w.isSpottedByTeam(e,team));}
export function fieldCombat(e:Entity):boolean {return !e.dead&&!e.underConstruction&&e.loadedIntoId==null&&e.def.speed>0&&e.def.damage>0&&!['engineer','logiTruck','cargoPlane','transport'].includes(e.kind);}
export function availableCombat(e:Entity):boolean {return fieldCombat(e)&&!e.garrisonId&&!e.garrisonOrderId&&!['resupply','retreat','recon'].includes(e.aiIntent??'');}
export function ammunitionFraction(u:Entity):number {
 const fractions=(u.def.weapons??[weaponSpec(u)]).map((s,i)=>s.damage>0?(s.ammoCapacity>0?Math.min(1,weaponAmmo(u,i)/s.ammoCapacity):1):0);
 return Math.max(0,...fractions);
}
export function componentDamage(u:Entity):number {return Math.max(0,...Object.values(u.components??{}));}
export function needsRecovery(u:Entity):boolean {return (u.supply??100)<rules.lowSupply||ammunitionFraction(u)<rules.lowAmmoFraction||(u.maxFuel??0)>0&&(u.fuel??0)<(u.maxFuel??0)*rules.lowAmmoFraction||u.hp<maxHitPoints(u)*rules.retreatHealth||componentDamage(u)>rules.retreatComponentDamage||(u.morale??100)<rules.retreatMorale;}
export function recoveryComplete(u:Entity):boolean {return (u.supply??100)>=rules.recoveredSupply&&ammunitionFraction(u)>=.5&&(!(u.maxFuel??0)||(u.fuel??0)>=(u.maxFuel??0)*.5)&&u.hp>=maxHitPoints(u)*rules.readyHealth&&componentDamage(u)<=rules.readyComponentDamage&&(u.morale??100)>rules.retreatMorale;}

/** Keep marching/fire solutions intact across the operational and doctrine timers.
 * Pending orders also count: both commanders run before the next command pass. */
export function issueGroundObjective(w:World,u:Entity,point:Point,intent:'attack'|'defend'):boolean {
 if(!availableCombat(u)||needsRecovery(u)||u.def.armor==='air'||u.def.domain==='sea')return false;
 if(w.pending.some(c=>'ids' in c&&c.ids.includes(u.id)))return false;
 const sameIntent=u.aiIntent===intent;
 if(sameIntent&&u.dest&&Math.hypot(u.dest.x-point.x,u.dest.z-point.z)<=rules.orderGoalTolerance)return false;
 if(sameIntent&&!u.dest&&Math.hypot(u.x-point.x,u.z-point.z)<=rules.orderArrivalTolerance+u.def.radius)return false;
 // Base/QRF defense may interrupt an attack; routine attacks never interrupt visible combat.
 if((intent==='attack'||sameIntent)&&u.target&&!u.target.dead&&w.isSpottedByTeam(u.target,u.team))return false;
 if(intent==='attack'&&u.aiIntent==='attack'&&u.dest){
  const dest=u.dest;
  if(!w.operationalMap.sectors.some(s=>w.operationalMap.objectiveSecured(u.team,s)&&Math.hypot(dest.x-s.center.x,dest.z-s.center.z)<=s.radius))return false;
 }
 u.aiIntent=intent;
 w.issue({type:'amove',ids:[u.id],...point,team:u.team});return true;
}

/** Keep ready units nearest the base in reserve; don't reshuffle marching attackers into it. */
export function offensiveForce(w:World,team:Team,units:Entity[],ratio=rules.reserveRatio):Entity[] {
 const base=w.bases[team],count=Math.max(1,Math.floor(units.length*ratio));
 const reserve=new Set([...units].sort((a,b)=>Number(a.aiIntent==='attack')-Number(b.aiIntent==='attack')||Math.hypot(a.x-base.x,a.z-base.z)-Math.hypot(b.x-base.x,b.z-base.z)||a.id-b.id).slice(0,count).map(e=>e.id));
 return units.filter(e=>!reserve.has(e.id));
}

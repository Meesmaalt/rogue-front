import rules from '../../data/ai-tactics.json';
import type {World} from '../World';
import type {Entity,Team,IntelContact} from '../types';
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
export function needsRecovery(u:Entity):boolean {return (u.supply??100)<rules.lowSupply||ammunitionFraction(u)<rules.lowAmmoFraction||(u.maxFuel??0)>0&&(u.fuel??0)<(u.maxFuel??0)*rules.lowAmmoFraction||u.hp<maxHitPoints(u)*rules.retreatHealth||(u.morale??100)<rules.retreatMorale;}
export function recoveryComplete(u:Entity):boolean {return (u.supply??100)>=rules.recoveredSupply&&ammunitionFraction(u)>=.5&&(!(u.maxFuel??0)||(u.fuel??0)>=(u.maxFuel??0)*.5)&&u.hp>=maxHitPoints(u)*rules.readyHealth&&(u.morale??100)>rules.retreatMorale;}

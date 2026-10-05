import {weaponSpec,weaponRange,canEngage} from '../systems/combat';
import {aaThreatAt} from '../systems/airDoctrine';
import {supplyRadiusFor} from '../systems/tacticalSupply';
import {isGarrisonBuilding,garrisonCapacity,garrisonOccupants} from '../garrison';
import {maxHitPoints} from '../unitStats';
import {knownContacts,visibleEnemies,fieldCombat,needsRecovery,recoveryComplete,AI_RULES} from './knowledge';
import type {World} from '../World';
import type {Entity,Team} from '../types';

/** Tactical decisions use the same command path as players and the same known contacts as operational AI. */
export function updateTacticalAI(w:World,team:Team,dt:number):void {
 if(dt<=0)return;
 const own=w.entities.filter(e=>!e.dead&&e.team===team&&e.loadedIntoId==null),enemies=visibleEnemies(w,team),contacts=knownContacts(w,team);
 const nodes=own.filter(e=>!e.underConstruction&&(e.disabledUntil??0)<=w.time&&['hq','supply'].includes(e.kind));
 for(const u of own.filter(fieldCombat)){
  if(w.time<(u.aiDecisionAt??0))continue;u.aiDecisionAt=w.time+AI_RULES.decisionInterval;
  if(['returning','rearming','taxi','landing'].includes(u.airState??''))continue;
  if(u.def.armor==='air'){
   if(u.airState==='grounded'&&recoveryComplete(u)&&['retreat','resupply'].includes(u.aiIntent??''))u.aiIntent=null;
   if(needsRecovery(u)||aaThreatAt(w,team,u.x,u.z)>.82&&u.airMission!=='sead'){u.aiIntent='retreat';w.issue({type:'air-return',ids:[u.id],team});}
   continue;
  }
  if(u.aiIntent==='resupply'||u.aiIntent==='retreat'){
   if(recoveryComplete(u)){u.aiIntent=null;w.issue({type:'hold',ids:[u.id],team});}else recover(u);
   continue;
  }
  const hostile=enemies.filter(e=>canEngage(e,u)&&Math.hypot(e.x-u.x,e.z-u.z)<AI_RULES.localThreatRadius);
  const friendly=own.filter(e=>fieldCombat(e)&&canEngage(e,hostile[0]??u)&&Math.hypot(e.x-u.x,e.z-u.z)<AI_RULES.localThreatRadius);
  if(needsRecovery(u)||hostile.length>Math.max(2,friendly.length*AI_RULES.outnumberedRatio)){u.aiIntent='resupply';recover(u);continue;}
  if(['artillery','mortar','mlrs'].includes(u.kind)){
   if(u.garrisonId||u.fireMission||u.artilleryDisplace)continue;
   const spec=weaponSpec(u),contact=contacts.find(c=>['artillery','mlrs','aa','supply','factory','hq'].includes(c.kind)&&Math.hypot(c.x-u.x,c.z-u.z)<=weaponRange(u,spec)&&Math.hypot(c.x-u.x,c.z-u.z)>=spec.minimumRange);
   if(contact){u.aiIntent=contact.kind==='artillery'||contact.kind==='mlrs'?'counterbattery':'attack';w.issue({type:'fire-mission',ids:[u.id],x:contact.x,z:contact.z,team});}continue;
  }
  if(['reconInf','reconVehicle','sniper'].includes(u.kind)){
   if(u.garrisonId||u.garrisonOrderId||u.target&&!u.target.dead)continue;
   const contact=contacts[0],base=w.bases[team],objective=contact??[...w.resourcePoints].sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
   if(objective){const d=Math.hypot(objective.x-base.x,objective.z-base.z)||1,standoff=contact?Math.min(AI_RULES.scoutStandoff,d*.4):0;u.aiIntent='recon';w.issue({type:'move',ids:[u.id],x:objective.x+(base.x-objective.x)/d*standoff,z:objective.z+(base.z-objective.z)/d*standoff,team});}continue;
  }
  if(u.aiIntent==='defend'&&u.squadMaxMembers&&!u.garrisonId&&!u.garrisonOrderId){
   const house=w.mapFeatures.filter(f=>isGarrisonBuilding(f)&&(w.infrastructureDamage.get(f.id)??0)<1&&Math.hypot(f.x-u.x,f.z-u.z)<30&&garrisonOccupants(w,f.id,true).filter(e=>e.team===team).length<garrisonCapacity(f)&&!enemies.some(e=>e.garrisonId===f.id)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
   if(house)w.issue({type:'enter-building',ids:[u.id],featureId:house.id,team});
  }
 }
 function recover(u:Entity):void {
  const needAmmo=(u.maxAmmo??0)>0,needFuel=(u.maxFuel??0)>0,needRepair=u.hp<maxHitPoints(u)*AI_RULES.readyHealth;
  const d=nodes.filter(n=>(!needAmmo||(n.ammoStock??0)>0)&&(!needFuel||(n.fuelStock??0)>0)&&(!needRepair||(n.repairStock??0)>0)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!d){w.issue({type:'hold',ids:[u.id],team});return;}
  if(Math.hypot(d.x-u.x,d.z-u.z)>supplyRadiusFor(d,w)*.75){const a=Math.atan2(u.x-d.x,u.z-d.z),r=d.def.radius+u.def.radius+6;w.issue({type:'move',ids:[u.id],x:d.x+Math.sin(a)*r,z:d.z+Math.cos(a)*r,team});}
  else {w.issue({type:'hold',ids:[u.id],team});if(needRepair){const engineers=own.filter(e=>e.kind==='engineer'&&!e.garrisonId&&e.mode!=='build'&&Math.hypot(e.x-u.x,e.z-u.z)<supplyRadiusFor(d,w));if(engineers.length)w.issue({type:'repair',ids:[engineers[0].id],targetId:u.id,team});}}
 }
}

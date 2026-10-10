import {serviceFuelAvailable} from "../stockLogistics";
import {weaponSpec,weaponRange,canEngage} from '../systems/combat';
import {aaThreatAt} from '../systems/airDoctrine';
import {findPath} from '../nav/Pathfinder';
import {supplyRadiusFor} from '../systems/tacticalSupply';
import {isGarrisonBuilding,garrisonCapacity,garrisonOccupants} from '../garrison';
import {maxHitPoints} from '../unitStats';
import {knownContacts,visibleEnemies,fieldCombat,needsRecovery,recoveryComplete,ammunitionFraction,componentDamage,AI_RULES} from './knowledge';
import type {World} from '../World';
import type {Entity,Team} from '../types';

/** Tactical decisions use the same command path as players and the same known contacts as operational AI. */
export function updateTacticalAI(w:World,team:Team,dt:number):void {
 if(dt<=0)return;
 const own=w.entities.filter(e=>!e.dead&&e.team===team&&e.loadedIntoId==null),enemies=visibleEnemies(w,team),contacts=knownContacts(w,team);
 const nodes=own.filter(e=>!e.underConstruction&&(e.disabledUntil??0)<=w.time&&['hq','supply'].includes(e.kind));
 const repairClaims=new Set(own.filter(e=>e.kind==='engineer'&&e.mode==='repair'&&e.target&&!e.target.dead).map(e=>e.id));
 for(const u of own.filter(e=>e.def.domain!=="sea"&&fieldCombat(e))){
  if(w.time<(u.aiDecisionAt??0))continue;u.aiDecisionAt=w.time+AI_RULES.decisionInterval;
  if(['returning','rearming','taxi','landing'].includes(u.airState??''))continue;
  if(u.def.armor==='air'){
   if(u.airState==='grounded'&&recoveryComplete(u)&&['retreat','resupply'].includes(u.aiIntent??''))u.aiIntent=null;
   if(needsRecovery(u)||aaThreatAt(w,team,u.x,u.z)>.82&&u.airMission!=='sead'){u.aiIntent='retreat';w.issue({type:'air-return',ids:[u.id],team});}
   continue;
  }
  if(u.aiIntent==='resupply'||u.aiIntent==='retreat'){
   if(recoveryComplete(u)){for(const e of own)if(e.kind==='engineer'&&e.mode==='repair'&&e.target===u)w.issue({type:'stop',ids:[e.id],team});u.aiIntent=null;w.issue({type:'hold',ids:[u.id],team});}else recover(u);
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
  const needAmmo=ammunitionFraction(u)<.5,needFuel=(u.maxFuel??0)>0&&(u.fuel??0)<(u.maxFuel??0)*.5;
  const needRepair=u.hp<maxHitPoints(u)*AI_RULES.readyHealth||componentDamage(u)>AI_RULES.readyComponentDamage,needSupply=(u.supply??100)<AI_RULES.recoveredSupply;
  const ranked=nodes.map(n=>({node:n,score:Math.hypot(n.x-u.x,n.z-u.z)+((needAmmo&&(n.ammoStock??0)<=0||needFuel&&serviceFuelAvailable(n)<=0||needRepair&&(n.repairStock??0)<=0||needSupply&&(n.ammoStock??0)+(n.fuelStock??0)<=0)?1000:0)+enemies.filter(e=>e.def.damage>0&&Math.hypot(e.x-n.x,e.z-n.z)<AI_RULES.localThreatRadius).length*AI_RULES.defenseRadius})).sort((a,b)=>a.score-b.score||a.node.id-b.node.id);
  let depot:Entity|undefined,point:{x:number;z:number}|undefined;
  for(const {node:n} of ranked.slice(0,AI_RULES.recoveryPathCandidates)){
   if(Math.hypot(n.x-u.x,n.z-u.z)<=supplyRadiusFor(n,w)*.75){depot=n;break;}
   const a=Math.atan2(u.x-n.x,u.z-n.z),r=n.def.radius+u.def.radius+AI_RULES.servicePadding;
   for(const offset of [(u.id%5-2)*.25,.7,-.7,1.4,-1.4,Math.PI]){const p={x:n.x+Math.sin(a+offset)*r,z:n.z+Math.cos(a+offset)*r};if(w.nav.isWalkableWorld(p.x,p.z,u.def.radius)&&findPath(w.nav,u,p,u.def.radius).length){depot=n;point=p;break;}}
   if(depot)break;
  }
  if(!depot){if(u.mode!=='hold')w.issue({type:'hold',ids:[u.id],team});return;}
  if(point){if(u.mode!=='move'||!u.dest||Math.hypot(u.dest.x-point.x,u.dest.z-point.z)>3)w.issue({type:'move',ids:[u.id],x:point.x,z:point.z,team});return;}
  if(u.mode!=='hold')w.issue({type:'hold',ids:[u.id],team});
  if(needRepair&&(depot.repairStock??0)>0){
   if(own.some(e=>e.kind==='engineer'&&e.mode==='repair'&&e.target===u))return;
   const engineer=own.filter(e=>e.kind==='engineer'&&!e.garrisonId&&!repairClaims.has(e.id)&&['idle','hold','move'].includes(e.mode)&&Math.hypot(e.x-u.x,e.z-u.z)<AI_RULES.repairDispatchRadius&&!(e.dest&&w.resourcePoints.some(r=>!r.active&&Math.hypot(r.x-e.dest!.x,r.z-e.dest!.z)<r.radius))).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id)[0];
   if(engineer){repairClaims.add(engineer.id);w.issue({type:'repair',ids:[engineer.id],targetId:u.id,team});}
  }
 }
}

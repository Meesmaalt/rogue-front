import {requestGarrisonExit} from "../garrison";
import type { World } from "../World";
import type { Entity } from "../types";
import { FACTIONS } from "../factions";
import mobility from "../../data/mobility.json";
import policy from "../../data/morale-policy.json";
import {automaticUnit,constructionHelper} from "../automaticConstruction";
import {findPath} from "../nav/Pathfinder";
import {replaceTask} from "./commands";

export type MoraleState = "steady" | "shaken" | "pinned" | "routing";

export function moraleState(u: Entity): MoraleState {
  const m = u.morale ?? 100;
  const s = u.suppression ?? 0;
  if (u.moraleRetreat || m < policy.routingMorale || s > policy.routingSuppression) return "routing";
  if (m < policy.pinnedMorale || s > policy.pinnedSuppression) return "pinned";
  if (m < policy.shakenMorale || s > policy.shakenSuppression) return "shaken";
  return "steady";
}

/** Panic does not replace the facility flight, unloading or construction controllers. */
function canRetreat(u:Entity):boolean {
  return u.def.domain!=="air"&&u.def.armor!=="air"&&u.def.domain!=="sea"&&
    !automaticUnit(u)&&!constructionHelper(u)&&!u.engineerDuty&&!u.groundService&&
    u.kind!=="groundHandler"&&u.logisticsRoute!=="strategic"&&!u.airdrop;
}

function rallyNode(w:World,u:Entity,b:Entity):boolean {
  return !b.dead&&b.team===u.team&&!b.underConstruction&&(b.disabledUntil??0)<=w.time&&
    ["hq","supply","barracks"].includes(b.kind);
}

/** Bounded search, only on entry, route failure or loss of the rally facility. */
function planRetreat(w:World,u:Entity):void {
  const retreat=u.moraleRetreat!;
  retreat.retryAt=w.time+policy.routeRetrySeconds;
  retreat.nodeId=undefined;retreat.point=undefined;
  const firstAngle=(retreat.attempt??0)%policy.routeAngles.length;
  retreat.attempt=(retreat.attempt??0)+1;
  const nodes=w.entities.filter(b=>rallyNode(w,u,b)).sort((a,b)=>
    Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id);
  for(const node of nodes.slice(0,policy.routeNodeCandidates)){
    const angle=Math.atan2(u.x-node.x,u.z-node.z);
    const gap=node.def.radius+u.def.radius+mobility.combat.retreatRallyGap;
    for(let i=0;i<policy.routeAngles.length;i++){
      const offset=policy.routeAngles[(firstAngle+i)%policy.routeAngles.length];
      const point={x:node.x+Math.sin(angle+offset)*gap,z:node.z+Math.cos(angle+offset)*gap};
      if(!w.nav.isWalkableWorld(point.x,point.z,u.def.radius))continue;
      const path=findPath(w.nav,u,point,u.def.radius,undefined,[],policy.routeSearchLimit);
      // One search per facility; rotate approaches on the next timed retry.
      if(!path.length&&Math.hypot(u.x-point.x,u.z-point.z)>policy.arrivalDistance)break;
      retreat.nodeId=node.id;retreat.point=point;
      u.navPath=path;u.navPathIndex=0;u.roadPathGoal={...point};
      u.roadPathRetryAt=retreat.retryAt;
      return;
    }
  }
}

/** Suppression recovery and hysteretic ground retreat, independent of rendering. */
export function updateMorale(w: World, dt: number): void {
  let plans=policy.routePlansPerTick;
  for (const u of w.entities) {
    if (u.dead || u.def.speed === 0 || u.loadedIntoId!=null) continue;
    if ((u.suppression ?? 0) > 0) {
      const decay=policy.suppressionDecay[u.def.discipline==="high"?"high":u.def.discipline==="low"?"low":"normal"]*dt;
      u.suppression=Math.max(0,(u.suppression??0)-decay);
    }
    if ((u.suppression??0)<policy.recoverySuppression&&(u.morale??100)<100) {
      const fac=u.team===w.playerTeam?w.playerFaction:w.enemyFaction;
      let regen=policy.recoveryRate*dt*(FACTIONS[fac].bonuses.moraleMul??1);
      if(u.def.discipline==="high")regen*=policy.highDisciplineRecovery;
      if(w.entities.some(b=>rallyNode(w,u,b)&&Math.hypot(b.x-u.x,b.z-u.z)<policy.baseRecoveryRadius))regen*=policy.baseRecoveryMultiplier;
      if((u.supply??100)<policy.lowSupplyThreshold)regen*=policy.lowSupplyRecoveryMultiplier;
      u.morale=Math.min(100,(u.morale??100)+regen);
    }
    if(!canRetreat(u)){u.moraleRetreat=undefined;continue;}
    if(u.moraleRetreat&&(u.morale??100)>=policy.rallyMorale&&(u.suppression??0)<policy.rallySuppression){
      u.moraleRetreat=undefined;u.mode="hold";u.holdPosition=true;u.dest=null;u.target=null;
      u.navPath=[];u.navPathIndex=0;u.roadPathGoal=undefined;u.navWaiting=false;
      continue;
    }
    if(moraleState(u)!=="routing")continue;
    if(!u.moraleRetreat){
      replaceTask(w,u);
      u.moraleRetreat={retryAt:w.time};
    }
    const retreat=u.moraleRetreat;
    const node=retreat.nodeId==null?undefined:w.byId.get(retreat.nodeId);
    const valid=!!node&&rallyNode(w,u,node)&&!!retreat.point&&w.nav.isWalkableWorld(retreat.point.x,retreat.point.z,u.def.radius);
    if(!valid){retreat.nodeId=undefined;retreat.point=undefined;}
    if(plans>0&&w.time>=retreat.retryAt&&(!valid||(u.stuckTime??0)>policy.stuckSeconds)){planRetreat(w,u);plans--;}
    const current=retreat.nodeId==null?undefined:w.byId.get(retreat.nodeId);
    const point=current&&rallyNode(w,u,current)&&retreat.point&&w.nav.isWalkableWorld(retreat.point.x,retreat.point.z,u.def.radius)?retreat.point:undefined;
    u.target=null;u.holdPosition=false;
    if(u.garrisonId){requestGarrisonExit(w,u,point??{x:u.x,z:u.z});continue;}
    if(point&&Math.hypot(u.x-point.x,u.z-point.z)>policy.arrivalDistance){u.mode="move";u.dest=point;}
    else {u.mode="hold";u.holdPosition=true;u.dest=null;}
  }
}

export function moraleSpeedMul(u: Entity): number {
  const st = moraleState(u);
  if (st === "routing") return 1.15; // flee faster
  if (st === "pinned") return 0.45;
  if (st === "shaken") return 0.8;
  return 1;
}

export function moraleAccuracyMul(u: Entity): number {
  const st = moraleState(u);
  if (st === "routing") return 0.15;
  if (st === "pinned") return 0.45;
  if (st === "shaken") return 0.75;
  return 1;
}

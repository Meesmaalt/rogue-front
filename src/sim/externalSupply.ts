import {logisticsLandingPoint} from "./groundHandling";
import rules from '../data/logistics.json';
import type {World} from './World';
import type {Entity,Point,Team} from './types';
export function externalDepotReady(w:World,depot:Entity):boolean {
 return depot.kind==='supply'&&!depot.dead&&!depot.underConstruction&&!depot.logisticsPaused&&(depot.disabledUntil??0)<=w.time&&w.hasCommandLink(depot)&&w.powerStatus(depot.team).ratio>=.25;
}
/** Receiving an external shipment must not require stocks that the shipment is meant to restore. */
export function airportDepot(w:World,base:Entity):Entity|null {
 if(base.dead||base.underConstruction||(base.disabledUntil??0)>w.time)return null;
 if(base.kind!=='airbase'||!w.hasCommandLink(base)||w.powerStatus(base.team).ratio<.25)return null;
 return base;
}
export function externalEntry(w:World,team:Team,target:Point):Point {
 const half=w.mapSize/2+rules.external.edgeMargin;
 // The rear edge is closest to the team's base; the aircraft genuinely originates outside the map.
 const base=w.bases[team],xSide=base.x<0?-1:1,zSide=base.z<0?-1:1;
 return Math.abs(base.x)>=Math.abs(base.z)?{x:xSide*half,z:Math.max(-w.mapSize*.44,Math.min(w.mapSize*.44,target.z))}:{x:Math.max(-w.mapSize*.44,Math.min(w.mapSize*.44,target.x)),z:zSide*half};
}
export function externalHelicopterCapacity(w:World,depot:Entity):number {return (rules.external.helicopterCapacity+w.supplyDepotLevel(depot)*rules.external.capacityPerLevel)*w.incomeMultiplier;}
export function externalHelicopterInterval(w:World,depot:Entity):number {return rules.external.helicopterInterval/(1+w.supplyDepotLevel(depot)*rules.external.frequencyPerLevel);}
export function dispatchExternalHelicopters(w:World):void {
 for(const depot of w.entities.filter(d=>externalDepotReady(w,d))){
  if(w.time<(depot.nextLogisticsDispatch??0))continue;
  const flights=w.entities.filter(e=>!e.dead&&e.kind==='transport'&&e.logisticsRoute==='strategic'&&e.supplyDepotId===depot.id);
  if(flights.length>=Math.min(rules.external.maxHelicopters,2+w.supplyDepotLevel(depot)))continue;
  const placeholder={...depot,logisticsPadSlot:undefined} as Entity,home=logisticsLandingPoint(w,depot,placeholder);if(!home){depot.nextLogisticsDispatch=w.time+5;continue;}const entry=externalEntry(w,depot.team,home),h=w.spawn('transport',depot.team,entry.x,entry.z);h.logisticsPadSlot=placeholder.logisticsPadSlot;
  h.y+=rules.external.helicopterAltitude;h.py=h.y;h.heading=Math.atan2(home.x-h.x,home.z-h.z);h.pHeading=h.heading;
  h.supplyDepotId=depot.id;h.logisticsHome=home;h.logisticsTarget=entry;h.logisticsSourceIndex=null;h.logisticsRoute='strategic';h.logisticsPhase='idle';h.cargo=externalHelicopterCapacity(w,depot);h.logisticsCargoCapacity=h.cargo;h.mode='patrol';h.dest=home;
  depot.nextLogisticsDispatch=w.time+externalHelicopterInterval(w,depot);
 }
}

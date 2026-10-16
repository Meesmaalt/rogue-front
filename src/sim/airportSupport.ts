import rules from '../data/airport-support.json';
import type {Entity} from './types';
import type {World} from './World';
export function airportStockCapacity(w:World,pad:Entity):{ammo:number;fuel:number;repair:number} {
 const factor=1+Math.max(0,w.producerLevel(pad)-rules.minimumLevel)*rules.levelBonus;return {ammo:rules.stocks.ammo*factor,fuel:rules.stocks.fuel*factor,repair:rules.stocks.repair*factor};
}
export function airportHasSupport(w:World,pad:Entity):boolean {return pad.kind==='airbase'&&w.producerLevel(pad)>=rules.minimumLevel;}
/** Upgrade includes the first stock load; further finite deliveries are bought from the national budget. */
export function updateAirportSupport(w:World):void {
 for(const pad of w.entities){
  if(pad.dead||pad.underConstruction||!airportHasSupport(w,pad))continue;const cap=airportStockCapacity(w,pad);
  if(!pad.airportStoresInitialized){pad.airportStoresInitialized=true;pad.ammoStock=cap.ammo;pad.fuelStock=cap.fuel;pad.repairStock=cap.repair;continue;}
  if(!w.hasCommandLink(pad)||w.powerStatus(pad.team).ratio<.25||(pad.disabledUntil??0)>w.time)continue;
  const needs=(pad.ammoStock??0)<cap.ammo*rules.refillThreshold||(pad.fuelStock??0)<cap.fuel*rules.refillThreshold||(pad.repairStock??0)<cap.repair*rules.refillThreshold;
  if(!needs||Math.min(w.teamCredits[pad.team],w.teamResources[pad.team])<rules.refillCost)continue;
  w.teamCredits[pad.team]-=rules.refillCost;w.teamResources[pad.team]-=rules.refillCost;
  pad.ammoStock=Math.min(cap.ammo,(pad.ammoStock??0)+cap.ammo*rules.refillFraction);pad.fuelStock=Math.min(cap.fuel,(pad.fuelStock??0)+cap.fuel*rules.refillFraction);pad.repairStock=Math.min(cap.repair,(pad.repairStock??0)+cap.repair*rules.refillFraction);
  if(pad.team===w.playerTeam){w.credits=w.teamCredits[pad.team];w.resources=w.teamResources[pad.team];}
 }
}

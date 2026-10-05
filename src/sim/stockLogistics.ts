import rules from '../data/logistics.json';
import type {Entity} from './types';
import type {World} from './World';
export const STOCK_KEYS=['ammo','fuel','repair'] as const;
export type StockPayload=Record<typeof STOCK_KEYS[number],number>;
export function stockCapacity(w:World,depot:Entity):StockPayload {
 const factor=1+w.supplyDepotLevel(depot)*rules.depot.capacityPerLevel;
 return {ammo:rules.depot.ammoCapacity*factor,fuel:rules.depot.fuelCapacity*factor,repair:rules.depot.repairCapacity*factor};
}
export function stockTotal(depot:Entity):number {return (depot.ammoStock??0)+(depot.fuelStock??0)+(depot.repairStock??0);}
/** Transfer only what fits. The caller retains the unaccepted payload. No income is created. */
export function depositPayload(w:World,depot:Entity,payload:StockPayload):number {
 if(depot.dead||depot.underConstruction)return 0;
 const cap=stockCapacity(w,depot);let accepted=0;
 for(const key of STOCK_KEYS){const field=`${key}Stock` as const,take=Math.max(0,Math.min(payload[key],cap[key]-(depot[field]??0)));depot[field]=(depot[field]??0)+take;payload[key]-=take;accepted+=take;}
 depot.logisticsStorage=stockTotal(depot);depot.logisticsMaxStorage=cap.ammo+cap.fuel+cap.repair;return accepted;
}
/** Resource cargo is converted only at a warehouse. Spill allocation avoids a full ammo bin blocking fuel. */
export function receiveResourceCargo(w:World,depot:Entity,amount:number):number {
 if(amount<=0||depot.dead||depot.underConstruction)return 0;
 const cap=stockCapacity(w,depot),priority=depot.logisticsPriority??'balanced';
 const weights:StockPayload=rules.resourceAllocation[priority];
 const budget=amount*rules.resourceStockFraction,payload:StockPayload={ammo:0,fuel:0,repair:0};let remaining=budget;
 for(const key of STOCK_KEYS){const field=`${key}Stock` as const;payload[key]=Math.max(0,Math.min(budget*weights[key],cap[key]-(depot[field]??0)));remaining-=payload[key];}
 for(const key of STOCK_KEYS){const field=`${key}Stock` as const,take=Math.max(0,Math.min(remaining,cap[key]-(depot[field]??0)-payload[key]));payload[key]+=take;remaining-=take;}
 const accepted=depositPayload(w,depot,payload)/rules.resourceStockFraction;
 w.teamResources[depot.team]+=accepted*rules.resourceIncomeFraction;w.teamCredits[depot.team]+=accepted*rules.resourceIncomeFraction;
 if(depot.team===w.playerTeam){w.resources=w.teamResources[depot.team];w.credits=w.teamCredits[depot.team];}return accepted;
}
export function logisticsStatus(w:World,u:Entity):string {
 const depot=w.byId.get(u.supplyDepotId??-1),cap=depot?stockCapacity(w,depot):null;
 if(!depot||depot.dead)return 'Tarne katkestatud · ladu puudub';
 if((u.fuel??0)<=.5)return 'Kütus otsas · vajab lähedal ladu või kütusekoormaga konvoid';
 if(u.cargo>0&&cap&&STOCK_KEYS.every(k=>(depot[`${k}Stock`]??0)>=cap[k]))return 'Sihtladu täis · koorem jääb pardale';
 if(depot.logisticsPaused&&u.cargo<=0)return 'Veod peatatud · naaseb või ootab laos';
 if(u.logisticsSourceIndex!=null){const source=w.resourcePoints[u.logisticsSourceIndex];if(u.cargo<=0&&(!source||source.controlledBy!==u.team||!source.active||(source.disabledUntil??0)>w.time))return 'Allikas katkestatud · ootab taastumist';}
 if(u.cargo>0)return `Tarne laosse · koorem ${Math.floor(u.cargo)}`;
 if(u.kind==='logiTruck'&&!u.navPath.length&&u.dest)return 'Marsruudi või laadimise ootel';
 return u.logisticsTarget?'Ressursi või varude kogumine':'Ootab töötavat allikat';
}

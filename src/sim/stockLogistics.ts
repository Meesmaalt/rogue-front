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
/** Normal servicing leaves a small production reserve; fuel priority releases it. */
export function serviceFuelAvailable(depot:Entity):number {
 return Math.max(0,(depot.fuelStock??0)-(depot.kind==='supply'&&depot.logisticsPriority!=='fuel'?rules.depot.serviceFuelReserve:0));
}
/** Transfer only what fits. The caller retains the unaccepted payload. No income is created. */
export function depositPayload(w:World,depot:Entity,payload:StockPayload):number {
 if(depot.dead||depot.underConstruction)return 0;
 const cap=stockCapacity(w,depot);let accepted=0;
 for(const key of STOCK_KEYS){const field=`${key}Stock` as const,take=Math.max(0,Math.min(payload[key],cap[key]-(depot[field]??0)));depot[field]=(depot[field]??0)+take;payload[key]-=take;accepted+=take;}
 depot.logisticsStorage=stockTotal(depot);depot.logisticsMaxStorage=cap.ammo+cap.fuel+cap.repair;return accepted;
}
/** Recover a starved trunk from a connected forward warehouse's real surplus. */
export function needsBackhaul(main:Entity,forward:Entity):boolean {
 return (main.fuelStock??0)<rules.convoyReserve&&(forward.fuelStock??0)>rules.convoyReserve||
        (main.ammoStock??0)<rules.convoyReserve&&(forward.ammoStock??0)>rules.convoyReserve;
}
/** Load a finite convoy by destination deficits and priority; redistribute unused capacity. */
export function withdrawPayload(w:World,source:Entity,destination:Entity,capacity:number):StockPayload {
 const cap=stockCapacity(w,destination),weights=rules.resourceAllocation[destination.logisticsPriority??'balanced'];
 const payload:StockPayload={ammo:0,fuel:0,repair:0},available:StockPayload={ammo:0,fuel:0,repair:0};
 for(const key of STOCK_KEYS)available[key]=Math.max(0,Math.min(cap[key]-(destination[`${key}Stock`]??0),(source[`${key}Stock`]??0)-rules.convoyReserve));
 let remaining=Math.max(0,capacity);
 for(const key of STOCK_KEYS){const take=Math.min(available[key],capacity*weights[key]);payload[key]=take;remaining-=take;}
 for(const key of STOCK_KEYS){const take=Math.min(available[key]-payload[key],remaining);payload[key]+=take;remaining-=take;}
 for(const key of STOCK_KEYS)source[`${key}Stock`]=Math.max(0,(source[`${key}Stock`]??0)-payload[key]);
 source.logisticsStorage=stockTotal(source);return payload;
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
/** Stable nearest valid site; an explicit source selection remains authoritative. */
export function collectionSource(w:World,depot:Entity,from:Entity):number|null {
 let best:number|null=null,distance=Infinity;
 for(let i=0;i<w.resourcePoints.length;i++){
  const r=w.resourcePoints[i];if(depot.preferredResourceIndex!=null&&depot.preferredResourceIndex!==i||r.controlledBy!==depot.team||!r.active||(r.disabledUntil??0)>w.time||r.amount<1)continue;
  const d=Math.hypot(r.x-from.x,r.z-from.z);if(d<distance){distance=d;best=i;}
 }
 return best;
}
export function logisticsStatus(w:World,u:Entity):string {
 const depot=w.byId.get(u.supplyDepotId??-1),backhaul=u.logisticsSourceIndex==null&&u.logisticsPhase==='unloading',destination=backhaul?w.primarySupplyDepot(u.team):depot,cap=destination?stockCapacity(w,destination):null;
 if(!depot||depot.dead)return 'Tarne katkestatud · ladu puudub';
 if((u.fuel??0)<=.5)return 'Kütus otsas · vajab lähedal ladu või kütusekoormaga konvoid';
 if(u.cargo>0&&cap&&STOCK_KEYS.every(k=>(destination?.[`${k}Stock`]??0)>=cap[k]))return 'Sihtladu täis · koorem jääb pardale';
 if(depot.logisticsPaused&&u.cargo<=0)return 'Veod peatatud · naaseb või ootab laos';
 if(u.logisticsSourceIndex!=null){const source=w.resourcePoints[u.logisticsSourceIndex];if(u.cargo<=0&&(!source||source.controlledBy!==u.team||!source.active||(source.disabledUntil??0)>w.time))return 'Allikas katkestatud · ootab taastumist';}
 if(u.navWaiting)return 'Marsruut takistatud · otsib läbipääsu';
 if(u.logisticsSourceIndex!=null&&u.cargo<=0&&(w.resourcePoints[u.logisticsSourceIndex]?.amount??0)<1)return 'Rajatis kogub varu · koorma ootel';
 if(backhaul)return 'Tagasitarne · edasiladu → pealadu';
 if(u.logisticsSourceIndex==null&&u.cargo<=0){
  const main=w.primarySupplyDepot(u.team);
  if(!w.connectedSupplyNodes(u.team).some(n=>n.id===depot.id))return 'FOB ühendus katkenud · uut koormat ei väljastata';
  if(main&&main!==depot&&STOCK_KEYS.every(k=>(main[`${k}Stock`]??0)<=rules.convoyReserve))return 'Pealao varu reservis · ootab kogumistarneid';
 }
 if(u.cargo>0)return `Tarne laosse · koorem ${Math.floor(u.cargo)}`;
 if(u.kind==='logiTruck'&&!u.navPath.length&&u.dest)return 'Marsruudi või laadimise ootel';
 return u.logisticsTarget?'Ressursi või varude kogumine':'Ootab töötavat allikat';
}

import type {World} from '../sim/World';
import type {Entity,UnitKind} from '../sim/types';
import {MAX_QUEUE} from '../sim/constants';
import {producerKind} from '../sim/systems/production';
const producers=new Set(['missileCommand','barracks','factory','helipad','airbase','shipyard']);
/** Explicit selection only: never redirect an order to another base building. */
export function selectedProductionBuilding(world:World,selection:ReadonlySet<number>):Entity|undefined {
 for(const id of selection){const u=world.byId.get(id);if(u&&!u.dead&&u.team===world.playerTeam&&producers.has(u.kind))return u;}
 return undefined;
}
export function buildingOrderState(world:World,producer:Entity|undefined,kind:UnitKind,running:boolean):{visible:boolean;reason:string} {
 if(!producer||producer.dead||producer.team!==world.playerTeam||producerKind(kind)!==producer.kind)return {visible:false,reason:'Vali sobiv tootmishoone'};
 let reason='';const cost=world.unitDefinition(kind).cost,hq=world.hq[world.playerTeam];
 if(!running)reason='Mäng on peatatud';
 else if(!hq||hq.dead||hq.underConstruction)reason='Peakorter pole valmis';
 else if(producer.underConstruction)reason='Hoone ehitamisel';
 else if(producer.productionQueue.length>=MAX_QUEUE)reason='Järjekord täis';
 else if(Math.min(world.resources,world.credits)<cost)reason=`Puudu ${Math.ceil(cost-Math.min(world.resources,world.credits))} krediiti`;
 else if(!world.canProduceAtLevel(producer,kind))reason='Vajab taset '+world.unitRequiredBuildingLevel(kind);
 else {const state=world.productionOperational(producer,kind);if(!state.operational)reason=state.reason;}
 return {visible:true,reason};
}

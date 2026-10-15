import type {World} from './World';
import type {Entity,Point} from './types';
import rules from '../data/logistics.json';
import {heightAt} from './heightmap';
const cfg=rules.handling;
export interface DepotPad extends Point {slot:number;heading:number}
/** Shared by reservation, placement and scenery. Centre pads are used before outlying rows. */
export function depotPad(depot:Pick<Entity,'x'|'z'|'heading'|'def'>,slot:number):DepotPad {
 const side=slot%4,row=Math.floor(slot/4),offset=(row===0?0:(row%2?1:-1)*Math.ceil(row/2))*cfg.padSpacing,r=depot.def.radius+cfg.padClearance;
 const x=side<2?(side===0?-r:r):offset,z=side<2?offset:(side===2?r:-r),c=Math.cos(depot.heading),s=Math.sin(depot.heading);
 return {x:depot.x+x*c+z*s,z:depot.z-x*s+z*c,heading:depot.heading,slot};
}
export function availableDepotPads(w:World,depot:Entity):DepotPad[]{
 const pads:DepotPad[]=[];
 const occupied=[...new Set(w.entities.filter(u=>!u.dead&&u.kind==='transport'&&u.supplyDepotId===depot.id&&u.logisticsPadSlot!=null).map(u=>u.logisticsPadSlot!))].sort((a,b)=>a-b);
 const order=[...occupied,...Array.from({length:cfg.maxPads},(_,i)=>i).filter(i=>!occupied.includes(i))];
 for(const slot of order){
  const p=depotPad(depot,slot);if(!w.nav.isWalkableWorld(p.x,p.z,cfg.padRadius)||pads.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<cfg.padSpacing))continue;
  const y=heightAt(p.x,p.z);if([0,1,2,3].some(i=>Math.abs(heightAt(p.x+Math.sin(i*Math.PI/2)*cfg.padRadius,p.z+Math.cos(i*Math.PI/2)*cfg.padRadius)-y)>cfg.padHeightTolerance))continue;
  pads.push(p);
 }return pads;
}
export function visibleDepotPads(w:World,depot:Entity):DepotPad[]{
 const used=new Set(w.entities.filter(u=>!u.dead&&u.supplyDepotId===depot.id&&u.kind==='transport').map(u=>u.logisticsPadSlot));
 return availableDepotPads(w,depot).filter((p,i)=>i<cfg.permanentPads+w.supplyDepotLevel(depot)||used.has(p.slot));
}

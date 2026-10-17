import rules from '../data/aircraft-operations.json';
import layout from '../data/base-life.json';
import scale from '../data/battle-scale.json';
import type {Entity,Point} from './types';
import type {World} from './World';
export function warehouseLayout(e:Pick<Entity,'kind'>){
 const airport=scale.airfieldLayout.structures.find(s=>s.kind==='terminal')!;
 return e.kind==='airbase'?{...airport,doorX:airport.x,doorZ:airport.z+airport.depth/2,heading:0}:{...layout.depot.hall,doorX:layout.depot.hall.x+layout.depot.hall.width/2,doorZ:layout.depot.hall.z,heading:Math.PI/2};
}
export function warehousePoint(e:Pick<Entity,'kind'|'x'|'z'|'heading'>,inside=false):Point {
 const l=warehouseLayout(e),distance=inside?-rules.warehouse.insideDepth:rules.warehouse.approachGap;
 const x=l.doorX+Math.sin(l.heading)*distance,z=l.doorZ+Math.cos(l.heading)*distance,c=Math.cos(e.heading),s=Math.sin(e.heading);
 return {x:e.x+c*x+s*z,z:e.z-s*x+c*z};
}
export function warehouseWalls(e:Pick<Entity,'kind'>){
 const l=warehouseLayout(e),t=rules.warehouse.wallThickness,gap=rules.warehouse.doorWidth;
 if(l.heading===0){const side=(l.width-gap)/2;return [{x:l.x,z:l.z-l.depth/2,width:l.width,depth:t},{x:l.x-l.width/2,z:l.z,width:t,depth:l.depth},{x:l.x+l.width/2,z:l.z,width:t,depth:l.depth},...[-1,1].map(sign=>({x:l.x+sign*(gap+side)/2,z:l.doorZ,width:side,depth:t}))];}
 const side=(l.depth-gap)/2;return [{x:l.x-l.width/2,z:l.z,width:t,depth:l.depth},{x:l.x,z:l.z-l.depth/2,width:l.width,depth:t},{x:l.x,z:l.z+l.depth/2,width:l.width,depth:t},...[-1,1].map(sign=>({x:l.doorX,z:l.z+sign*(gap+side)/2,width:t,depth:side}))];
}
export function requestWarehouseDoor(w:World,e:Entity):void {e.warehouseDoorUntil=w.time+rules.warehouse.holdOpenSeconds;}
export function updateWarehouseDoors(w:World,dt:number):void {
 for(const e of w.entities)if(!e.dead&&(e.kind==='supply'||e.kind==='airbase')){
  if(w.entities.some(u=>!u.dead&&u.kind==='logiTruck'&&u.supplyDepotId===e.id&&(u.logisticsPhase==='unloading'||u.logisticsPhase==='loading')&&Math.hypot(u.x-e.x,u.z-e.z)<rules.warehouse.vehicleApproachDistance))requestWarehouseDoor(w,e);
  const open=(e.warehouseDoorUntil??0)>w.time;e.warehouseDoor=Math.max(0,Math.min(1,(e.warehouseDoor??0)+(open?1:-1)*dt/rules.warehouse.doorSeconds));}
}

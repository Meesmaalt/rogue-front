import layout from '../data/base-life.json';
import terrainConfig from '../data/terrain.json';
/** Depot geometry uses world metres; other military models keep their authored scale. */
export function buildingScale(kind:string):number{return kind==='supply'?1:terrainConfig.render.buildings.militaryScale*(kind==='hq'?layout.hq.scale:1);}
/** Shared layout for static furniture (Architecture.ts) and animated sitters (UnitRenderer/BaseLife). Model-space units, before the building scale. */
export interface Seat{x:number;z:number;/** Local facing angle, 0 = +z. */heading:number}
export const HQ_LOUNGE={x:5.8,z:9.6};
export const DEPOT_LOUNGE={x:layout.depot.rest.x,z:layout.depot.rest.z};
/** Three practical outdoor benches, one row per construction team. */
export function hqSeats():Seat[]{return Array.from({length:9},(_,i)=>({x:HQ_LOUNGE.x+(i%3-1)*.75,z:HQ_LOUNGE.z+Math.floor(i/3)*1.9,heading:Math.PI}));}
/** Bench rows beside the depot office; enough places for two workers per helipad up to the pad cap. */
export function depotSeats(count:number):Seat[]{
 const seats:Seat[]=[];for(let i=0;i<count;i++)seats.push({x:DEPOT_LOUNGE.x+Math.floor(i/2)*layout.depot.rest.spacing+(i%2===0?-.28:.28),z:DEPOT_LOUNGE.z+.6,heading:Math.PI});
 return seats;
}
export function seatWorld(anchor:{x:number;z:number;heading:number},scale:number,seat:Seat):{x:number;z:number;heading:number}{
 const c=Math.cos(anchor.heading),s=Math.sin(anchor.heading),lx=seat.x*scale,lz=seat.z*scale;
 return {x:anchor.x+c*lx+s*lz,z:anchor.z-s*lx+c*lz,heading:anchor.heading+seat.heading};
}

/** Engineering yard: wall rack for hammers/shovels (dynamic tools are drawn by BaseLife), barrow parking. */
export const HQ_RACK={x:-6.9,z:.2};
export function rackSlots():Array<{x:number;y:number;z:number}>{return [-1.05,-.35,.35,1.05].map(dz=>({x:HQ_RACK.x+.18,y:1.55,z:HQ_RACK.z+dz}));}
/** Where engineers stand to take their tools from the rack before leaving for work. */
export function rackSpots():Seat[]{return [-1.05,-.35,.35,1.05].map(dz=>({x:HQ_RACK.x+1.1,z:HQ_RACK.z+dz,heading:-Math.PI/2}));}
export const HQ_BARROW={x:HQ_RACK.x+1.9,z:HQ_RACK.z+3.1,heading:.7};
/** Forklift bays in front of the depot; one per crew. */
export function depotBays(count:number):Seat[]{return Array.from({length:count},(_,i)=>({x:layout.depot.bays.x+i*layout.depot.bays.spacing,z:layout.depot.bays.z,heading:0}));}

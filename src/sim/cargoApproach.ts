import type {Point} from './types';
/** Extend the runway centreline to the world boundary; arrivals already have the correct heading. */
export function runwayEdgePoint(size:number,pad:Point&{heading:number},margin:number,outbound=false):Point {
 const half=size/2+margin,sign=outbound?1:-1,dx=Math.sin(pad.heading)*sign,dz=Math.cos(pad.heading)*sign;
 const tx=Math.abs(dx)>.00001?((dx>0?half:-half)-pad.x)/dx:Infinity;
 const tz=Math.abs(dz)>.00001?((dz>0?half:-half)-pad.z)/dz:Infinity;
 const distance=Math.max(1,Math.min(tx>0?tx:Infinity,tz>0?tz:Infinity));
 return {x:pad.x+dx*distance,z:pad.z+dz*distance};
}

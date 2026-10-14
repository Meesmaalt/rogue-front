export interface TrailPoint {x:number;y:number;z:number}
/** Distance-based spacing keeps the same trail density at 30 or 144 FPS, with bounded catch-up. */
export function sampleProjectileTrail(from:TrailPoint,to:TrailPoint,spacing:number,maxSamples:number):TrailPoint[] {
 const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);if(distance<spacing)return [];
 const count=Math.min(maxSamples,Math.floor(distance/spacing)),advance=count===maxSamples?distance:count*spacing;
 return Array.from({length:count},(_,i)=>{const t=(i+1)/count*advance/distance;return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t};});
}

import {NavGrid} from './NavGrid';
import {pointInFeature,type MapFeatureDef} from '../mapFeatures';
import type {Point} from '../types';
/** Derived navigation mask: only authored water, with banks/bridges/solid piers excluded. */
export class WaterNavGrid extends NavGrid {
 private readonly surfaces:Float32Array;
 private readonly access=new Map<string,Point|null>();
 private readonly hasWater:boolean;
 constructor(features:readonly MapFeatureDef[]){
  super([],[],false);this.hasWater=features.some(f=>f.kind==="water");this.blocked.fill(1);this.surfaces=new Float32Array(this.blocked.length);
  for(const f of features.filter(f=>f.kind==='water'))this.paint(f,false);
  for(const f of features.filter(f=>['bridge','building','wall','chokepoint'].includes(f.kind)))this.paint(f,true);
 }
 private paint(f:MapFeatureDef,solid:boolean):void {
  const r=Math.hypot(f.width,f.depth)/2+2,a=this.worldToCell(f.x-r,f.z-r),b=this.worldToCell(f.x+r,f.z+r);
  for(let iz=a.z;iz<=b.z;iz++)for(let ix=a.x;ix<=b.x;ix++){
   const p=this.cellToWorld(ix,iz);if(!pointInFeature(p.x,p.z,f))continue;
   const index=this.index(ix,iz);this.blocked[index]=solid?1:0;if(!solid)this.surfaces[index]=f.surfaceHeight??0;
  }
 }
 override isWalkableWorld(x:number,z:number,radius=0):boolean {
  const half=this.width*this.cellSize/2;if(Math.abs(x)>=half||Math.abs(z)>=half)return false;
  return super.isWalkableWorld(x,z,radius);
 }
 surfaceAt(x:number,z:number):number {const c=this.worldToCell(x,z);return this.surfaces[this.index(c.x,c.z)];}
 nearestWater(p:Point,radius=0,maxDistance=64):Point|null {
  if(!this.hasWater)return null;
  if(this.isWalkableWorld(p.x,p.z,radius))return {...p};
  const key=`${p.x}/${p.z}/${radius}/${maxDistance}`;if(this.access.has(key)){const cached=this.access.get(key);return cached?{...cached}:null;}
  let best:Point|null=null,dist=maxDistance;
  const a=this.worldToCell(p.x-maxDistance,p.z-maxDistance),b=this.worldToCell(p.x+maxDistance,p.z+maxDistance);
  for(let iz=a.z;iz<=b.z;iz++)for(let ix=a.x;ix<=b.x;ix++){
   if(this.isBlocked(ix,iz,radius))continue;const q=this.cellToWorld(ix,iz),d=Math.hypot(q.x-p.x,q.z-p.z);
   if(d<dist){best=q;dist=d;}
  }if(this.access.size>=128)this.access.clear();this.access.set(key,best);return best;
 }
}

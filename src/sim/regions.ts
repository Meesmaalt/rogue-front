import profiles from '../data/regions.json';
import {Rng} from './rng';
export type RegionId=keyof typeof profiles;
export type TerrainProfile='farmland'|'farmland-natural'|`region-${RegionId}`;
export type ReliefShape='ridge'|'mesa'|'dune';
export interface RegionalLandform {x:number;z:number;width:number;depth:number;height:number;group?:string;shape?:ReliefShape;rotation?:number}
export const REGION_IDS:readonly RegionId[]=['italy','siberia','canyon','desert'];
export const REGIONS=profiles;
export function regionFromProfile(profile?:string):RegionId|undefined {
 const id=profile?.slice(7) as RegionId;
 return profile?.startsWith('region-')&&REGION_IDS.includes(id)?id:undefined;
}
export function regionDefaults(region:RegionId){const p=REGIONS[region];return {sea:p.sea,mountains:true,forest:true,river:p.river,lakes:p.lakes,region};}
/** Continuous seeded districts; independent of traversal order and parcel boundaries. */
export function regionalNoise(x:number,z:number,seed:number,span:number):number {
 const ix=Math.floor(x/span),iz=Math.floor(z/span),tx=x/span-ix,tz=z/span-iz,sx=tx*tx*(3-2*tx),sz=tz*tz*(3-2*tz);
 const at=(dx:number,dz:number)=>new Rng((seed^Math.imul(ix+dx,374761393)^Math.imul(iz+dz,668265263))>>>0).next();
 return (at(0,0)*(1-sx)+at(1,0)*sx)*(1-sz)+(at(0,1)*(1-sx)+at(1,1)*sx)*sz;
}
export function reliefKernel(distanceSquared:number,shape?:ReliefShape):number {
 if(distanceSquared>=1)return 0;
 if(shape==='mesa'){
  // Wide tableland, a rock face, then a continuous footslope. No height steps.
  const t=Math.max(0,Math.min(1,(Math.sqrt(distanceSquared)-.55)/.3));
  return (1-t*t*(3-2*t))*.95+(1-distanceSquared)**2*.05;
 }
 if(shape==='dune')return (1-distanceSquared)**3;
 return (1-distanceSquared)**2;
}

/** A bounded, differentiable weighted envelope removes max seams without stacking ridge pieces. */
export function regionalReliefAt(p:{x:number;z:number},forms:readonly RegionalLandform[]):number {
 let total=0;const groups=new Map<string,{weighted:number;weight:number}>();
 for(const f of forms){const a=f.rotation??0,dx=p.x-f.x,dz=p.z-f.z,u=dx*Math.cos(a)-dz*Math.sin(a),v=dx*Math.sin(a)+dz*Math.cos(a),h=f.height*reliefKernel((u/f.width)**2+(v/f.depth)**2,f.shape);
  if(h===0)continue;
  if(f.group){const g=groups.get(f.group)??{weighted:0,weight:0},weight=h*h*h;g.weighted+=weight*h;g.weight+=weight;groups.set(f.group,g);}else total+=h;
 }
 for(const g of groups.values())if(g.weight)total+=g.weighted/g.weight;return total;
}

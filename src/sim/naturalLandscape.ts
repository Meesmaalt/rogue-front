import config from '../data/map-generation.json';
import {Rng} from './rng';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import type {Point} from './types';
import type {Landform} from './regionalLandscape';
/** Low rolling relief supplements the large ridges while leaving settlement/road corridors clear. */
export function naturalHills(size:number,archetype:string,rng:Rng,features:readonly MapFeatureDef[],protectedPoints:readonly (Point&{r:number})[]):Landform[]{
 const cfg=config.naturalLandscape,forms:Landform[]=[],random=(lo:number,hi:number)=>lo+rng.next()*(hi-lo);
 const obstacles=features.filter(f=>['water','road','building','bridge'].includes(f.kind));
 for(let i=0;i<cfg.hills;i++)for(let attempt=0;attempt<cfg.attempts;attempt++){
  const p={x:random(-size*.43,size*.43),z:random(-size*.43,size*.43)},width=random(...cfg.width as [number,number]),depth=width*random(...cfg.depthRatio as [number,number]),radius=Math.max(width,depth);
  if(protectedPoints.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.r+radius)||obstacles.some(f=>pointInFeature(p.x,p.z,f,radius+cfg.roadClearance))||forms.some(f=>Math.hypot(f.x-p.x,f.z-p.z)<radius+f.width*.5))continue;
  forms.push({...p,width,depth,height:random(...(archetype==='highlands'?cfg.highlandHeight:cfg.height) as [number,number]),shape:'ridge',rotation:random(-Math.PI,Math.PI)});break;
 }
 return forms;
}
/** Every new edge point stays inside its convex parcel, keeping road/water clearances. */
export function naturalForestEdge(points:Point[],rng:Rng):Point[]{
 const cfg=config.naturalLandscape,center={x:points.reduce((n,p)=>n+p.x,0)/points.length,z:points.reduce((n,p)=>n+p.z,0)/points.length},out:Point[]=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/cfg.edgeStep));
  for(let j=0;j<steps;j++){const x=a.x+(b.x-a.x)*j/steps,z=a.z+(b.z-a.z)*j/steps,dist=Math.hypot(center.x-x,center.z-z)||1,inset=Math.min(dist*.12,cfg.edgeInset[0]+rng.next()*(cfg.edgeInset[1]-cfg.edgeInset[0]));out.push({x:x+(center.x-x)*inset/dist,z:z+(center.z-z)*inset/dist});}
 }return out;
}

/** Correlated woodland masses follow regional soils rather than independent parcel coin flips. */
export function naturalWoodlandAt(x:number,z:number,seed:number,archetype:string):boolean {
 const span=config.freshGeneration.forestNoiseSpan,ix=Math.floor(x/span),iz=Math.floor(z/span);
 const sx=(x/span-ix)**2*(3-2*(x/span-ix)),sz=(z/span-iz)**2*(3-2*(z/span-iz));
 const at=(dx:number,dz:number)=>new Rng((seed^Math.imul(ix+dx,374761393)^Math.imul(iz+dz,668265263))>>>0).next();
 const noise=(at(0,0)*(1-sx)+at(1,0)*sx)*(1-sz)+(at(0,1)*(1-sx)+at(1,1)*sx)*sz;
 return noise>config.freshGeneration.forestNoiseThreshold+(archetype==='forest'?-.14:archetype==='urban'?.08:0);
}

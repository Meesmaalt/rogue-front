import rules from '../data/construction-policy.json';
import {BUILDINGS,isBuildable} from './buildings';
import {depotLayoutLevel,depotCompound} from './depotLayout';
import {MapFeatureIndex,forestDensityAt,type MapFeatureDef} from './mapFeatures';
import type {Entity,Point,UnitKind} from './types';
export interface SiteArea extends Point {heading:number;left:number;right:number;back:number;front:number}
export function constructionArea(kind:UnitKind,x:number,z:number,heading:number):SiteArea {
 if(kind==='supply')return {x,z,heading,...depotCompound(rules.depotReserveLevel)};
 const r=isBuildable(kind)?BUILDINGS[kind].footprint:0;return {x,z,heading,left:-r,right:r,back:-r,front:r};
}
export function siteLocal(area:SiteArea,p:Point):Point {const dx=p.x-area.x,dz=p.z-area.z,c=Math.cos(area.heading),s=Math.sin(area.heading);return {x:dx*c-dz*s,z:dx*s+dz*c};}
export function insideSite(area:SiteArea,p:Point,padding=0):boolean {const q=siteLocal(area,p);return q.x>=area.left-padding&&q.x<=area.right+padding&&q.z>=area.back-padding&&q.z<=area.front+padding;}
export function siteWorld(area:SiteArea,x:number,z:number):Point {const c=Math.cos(area.heading),s=Math.sin(area.heading);return {x:area.x+c*x+s*z,z:area.z-s*x+c*z};}
/** Separating-axis test for planned compounds, including foundations and future upgrades. */
export function sitesOverlap(a:SiteArea,b:SiteArea,margin=0):boolean {
 const corners=(s:SiteArea)=>[[s.left-margin,s.back-margin],[s.right+margin,s.back-margin],[s.right+margin,s.front+margin],[s.left-margin,s.front+margin]].map(([x,z])=>siteWorld(s,x,z)),aa=corners(a),bb=corners(b);
 for(const angle of [a.heading,b.heading])for(const axis of [{x:Math.cos(angle),z:-Math.sin(angle)},{x:Math.sin(angle),z:Math.cos(angle)}]){const pa=aa.map(p=>p.x*axis.x+p.z*axis.z),pb=bb.map(p=>p.x*axis.x+p.z*axis.z);if(Math.max(...pa)<Math.min(...pb)||Math.max(...pb)<Math.min(...pa))return false;}return true;
}
const forests=new WeakMap<readonly MapFeatureDef[],MapFeatureIndex>();
/** Reject woodland masses; a few edge trees can be cleared by the foundation. */
export function siteInDenseForest(features:readonly MapFeatureDef[],area:SiteArea):boolean {
 let index=forests.get(features);if(!index){index=new MapFeatureIndex(features.filter(f=>f.appearance==='forest'));forests.set(features,index);}let dense=0;
 for(let i=0;i<rules.forestSamples;i++)for(let j=0;j<rules.forestSamples;j++){const p=siteWorld(area,area.left+(i+.5)*(area.right-area.left)/rules.forestSamples,area.back+(j+.5)*(area.front-area.back)/rules.forestSamples);if(forestDensityAt(p.x,p.z,index.at(p.x,p.z))>rules.forestDensity)dense++;}return dense/(rules.forestSamples**2)>rules.forestCoverage;
}
export function entitySite(e:Entity):SiteArea{return constructionArea(e.kind,e.x,e.z,e.heading);}
/** Clearance follows the built compound; the larger placement reservation stays untouched. */
export function builtSite(e:Entity):SiteArea {
 return e.kind==='supply'?{x:e.x,z:e.z,heading:e.heading,...depotCompound(depotLayoutLevel(e))}:entitySite(e);
}

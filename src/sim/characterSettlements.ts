import config from '../data/region-character.json';
import generation from '../data/map-generation.json';
import {Rng} from './rng';
import {featureCorners,type MapFeatureDef} from './mapFeatures';
import {footprintsOverlap,type Settlement} from './settlements';
import type {RegionId} from './regions';
import type {Point} from './types';

const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function project(p:Point,road:MapFeatureDef):Point {
 const a=road.rotation??0,t=Math.max(-road.depth/2,Math.min(road.depth/2,(p.x-road.x)*Math.sin(a)+(p.z-road.z)*Math.cos(a)));
 return {x:road.x+Math.sin(a)*t,z:road.z+Math.cos(a)*t};
}
/** Compact frontage-led villages. Local lanes serve actual lots instead of an empty road grid. */
export function buildCharacterSettlement(index:number,town:Settlement,region:RegionId,rng:Rng,existing:readonly MapFeatureDef[],size:number):MapFeatureDef[]{
 const cfg=config.settlement,p=config[region],random=(a:number,b:number)=>a+(b-a)*rng.next(),span=(cfg.radiusBase+town.blocks*cfg.radiusPerBlock)*p.spread;
 const highways=existing.filter(f=>f.kind==='road'&&f.roadClass!=='track'&&f.roadClass!=='street');
 const nearest=highways.reduce<MapFeatureDef|undefined>((best,f)=>!best||distance(project(town,f),town)<distance(project(town,best),town)?f:best,undefined);
 if(!nearest)return [];
 const center=project(town,nearest),angle=nearest.rotation??town.angle,c=Math.cos(angle),s=Math.sin(angle);
 const transform=(x:number,z:number):Point=>({x:center.x+x*c+z*s,z:center.z-x*s+z*c});
 const features:MapFeatureDef[]=[],streets:MapFeatureDef[]=[],houses:MapFeatureDef[]=[];
 const hard=existing.filter(f=>f.kind==='building'||f.kind==='water'||f.kind==='bridge'||f.appearance==='yard');
 const road=(a:Point,b:Point)=>{
  const f:MapFeatureDef={id:`town-${index}-lane-${streets.length}`,kind:'road',x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:cfg.laneWidth,depth:distance(a,b)+.3,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass:region==='siberia'?'track':'street',label:'Külatänav'};
  if(featureCorners(f).some(p=>Math.max(Math.abs(p.x),Math.abs(p.z))>size/2-12)||hard.some(o=>footprintsOverlap(f,o,3)))return;
  streets.push(f);features.push(f);
 };
 const side=rng.next()<.5?-1:1;
 if(region==='italy'||region==='desert'){
  // One inhabited loop, attached to the regional route at both ends.
  const points=[[0,-span*.62],[side*span*.58,-span*.72],[side*span*.95,-span*.3],[side*span*.92,span*.35],[side*span*.5,span*.7],[0,span*.58]].map(([x,z])=>transform(x,z));
  for(let i=1;i<points.length;i++)road(points[i-1],points[i]);
 }else{
  // Timber and roadside settlements grow as short side lanes off the main road.
  for(const sign of [-1,1]){const a=transform(0,sign*span*.35),b=transform(sign*span*.55,sign*span*.28),d=transform(sign*span*.8,sign*span*.58);road(a,b);if(town.blocks>2)road(b,d);}
 }
 // Only lanes physically connected to the main network may acquire houses.
 const connected=new Set<MapFeatureDef>(highways);let grew=true;
 while(grew){grew=false;for(const r of streets)if(!connected.has(r)&&[...connected].some(o=>footprintsOverlap(r,o,.8))){connected.add(r);grew=true;}}
 for(let i=streets.length-1;i>=0;i--)if(!connected.has(streets[i])){const f=streets[i];streets.splice(i,1);features.splice(features.indexOf(f),1);}
 let landmark:MapFeatureDef|undefined;
 heartSearch:for(const sign of [side,-side])for(const along of [.05,-.48,.48])for(const setback of [26,43]){
  const q=transform(sign*setback,span*along),candidate:MapFeatureDef={id:`town-${index}-heart`,kind:'cover',appearance:'yard',landmark:p.landmark as MapFeatureDef['landmark'],...q,width:cfg.squareSize,depth:cfg.squareSize*1.2,rotation:angle,blocksMovement:false,color:region==='siberia'?0xa8b4b5:region==='italy'?0xb4ac98:0xb4a18a,label:p.label};
  if([...hard,...streets,...highways.filter(f=>distance(f,q)<span*2)].some(o=>footprintsOverlap(candidate,o,2)))continue;
  landmark=candidate;features.push(candidate);break heartSearch;
 }
 const blockers=[...existing.filter(f=>['building','road','bridge','water'].includes(f.kind)||f.appearance==='yard'),...streets,...(landmark?[landmark]:[])];
 const place=(q:Point,a:number,streetWidth:number,side:number,central:boolean)=>{
  const style=p.styles[Math.floor(rng.next()*p.styles.length)] as NonNullable<MapFeatureDef['buildingStyle']>,def=generation.settlementVariety.buildings[style];
  const width=random(def.width[0],def.width[1]),depth=random(def.depth[0],def.depth[1]);
  const offset=side*(streetWidth/2+depth/2+cfg.frontSetback+random(0,1.8));
  const house:MapFeatureDef={id:`town-${index}-house-${houses.length}`,kind:'building',appearance:'farmhouse',x:q.x+Math.cos(a)*offset,z:q.z-Math.sin(a)*offset,width,depth,height:random(def.height[0],def.height[1])*p.heightScale,rotation:a+Math.PI/2+(side<0?Math.PI:0),buildingStyle:style,roofStyle:region==='desert'?'flat':undefined,color:p.roofs[houses.length%p.roofs.length],facadeColor:p.facades[Math.floor(rng.next()*p.facades.length)],district:central?'center':'rural',garrisonCapacity:1,label:region==='siberia'?'Metsaküla hoone':region==='desert'?'Kõrbeküla hoone':def.label};
  if(featureCorners(house).some(p=>Math.max(Math.abs(p.x),Math.abs(p.z))>size/2-15)||blockers.some(f=>footprintsOverlap(house,f,cfg.roadClearance))||houses.some(f=>footprintsOverlap(house,f,1.8)))return width;
  houses.push(house);features.push(house,{id:`garden-${house.id}`,kind:'cover',appearance:'yard',x:house.x,z:house.z,width:width+3,depth:depth+5,rotation:house.rotation,blocksMovement:false,color:region==='siberia'?0xb2bdbb:region==='desert'?0xb9aa8b:0x92977b});return width;
 };
 // Follow the real curved highway, sampling its centreline rather than drawing a second spine.
 for(const sign of [-1,1])for(let t=-span;t<span;){
  const estimate=transform(0,t),r=highways.reduce((best,f)=>distance(project(estimate,f),estimate)<distance(project(estimate,best),estimate)?f:best,nearest),q=project(estimate,r);
  if(distance(q,estimate)>18){t+=12;continue;}
  t+=place(q,r.rotation??0,r.width,sign,Math.abs(t)<span*.4)+random(...cfg.lotGap as [number,number]);
 }
 for(const street of streets)for(const sign of [-1,1]){
  const a=street.rotation??0;
  for(let t=-street.depth/2+8;t<street.depth/2-6;){const q={x:street.x+Math.sin(a)*t,z:street.z+Math.cos(a)*t};t+=place(q,a,street.width,sign,false)+random(...cfg.lotGap as [number,number]);}
 }
 return features;
}

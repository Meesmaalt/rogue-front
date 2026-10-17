import config from '../data/world-character.json';
import {Rng} from './rng';
import {featureCorners,MapFeatureIndex,type MapFeatureDef} from './mapFeatures';
import {footprintsOverlap} from './settlements';
import {regionalReliefAt,type RegionId,type RegionalLandform} from './regions';
import type {Point} from './types';

/** Rare paired landmarks sit beside real routes, on dry stable ground, away from production and bases. */
export function addRegionalLandmarks(seed:number,size:number,region:RegionId,features:MapFeatureDef[],forms:readonly RegionalLandform[],bases:readonly Point[],resources:readonly Point[]):void {
 const cfg=config.placement,p=config.landmarks[region],rng=new Rng(seed^0x3a2b71),roads=features.filter(f=>f.kind==='road'&&f.roadClass==='secondary'),index=new MapFeatureIndex(features),chosen:Point[]=[];
 const candidates=roads.flatMap(r=>cfg.setbacks.flatMap(setback=>[-1,1].map(side=>{const a=r.rotation??0;return {x:r.x+Math.cos(a)*side*setback,z:r.z-Math.sin(a)*side*setback,road:r,score:rng.next()};}))).sort((a,b)=>a.score-b.score);
 const valid=(f:MapFeatureDef)=>{
  if(Math.max(Math.abs(f.x),Math.abs(f.z))>size/2-45||bases.some(b=>Math.hypot(b.x-f.x,b.z-f.z)<cfg.baseClearance)||resources.some(r=>Math.hypot(r.x-f.x,r.z-f.z)<cfg.resourceClearance)||chosen.some(r=>Math.hypot(r.x-f.x,r.z-f.z)<size*.22))return false;
  const radius=Math.max(45,cfg.townClearance+16),near=index.query(f.x-radius,f.z-radius,f.x+radius,f.z+radius);
  if(near.some(o=>o.kind==='building'&&Math.hypot(o.x-f.x,o.z-f.z)<cfg.townClearance||(o.kind==='water'||o.kind==='road'||o.kind==='bridge'||o.appearance==='yard')&&footprintsOverlap({...f,width:30,depth:30},o,cfg.footprintClearance)))return false;
  const heights=[f,...featureCorners(f)].map(q=>regionalReliefAt(q,forms));return Math.max(...heights)<cfg.maximumHeight&&Math.max(...heights)-Math.min(...heights)<cfg.maximumReliefRange;
 };
 for(const q of candidates){
  if(chosen.length>=cfg.pairLimit*2)break;
  const a=q.road.rotation??0,make=(x:number,z:number,rotation:number):MapFeatureDef=>({id:'',kind:'building',landmarkStructure:p.kind as MapFeatureDef['landmarkStructure'],x,z,width:p.width,depth:p.depth,height:p.height,rotation,color:p.roof,facadeColor:p.wall,garrisonable:false,label:p.label});
  const f=make(q.x,q.z,a),opposite=make(-q.x,-q.z,a+Math.PI);if(!valid(f)||!valid(opposite)||Math.hypot(f.x-opposite.x,f.z-opposite.z)<size*.22)continue;
  // The exact mirrored route anchor is used; access cannot cross water or an existing building.
  const endpoints=[{x:q.road.x,z:q.road.z},{x:-q.road.x,z:-q.road.z}];
  const pair=[f,opposite],tracks=pair.map((f,i):MapFeatureDef=>{const b=endpoints[i],d=Math.hypot(b.x-f.x,b.z-f.z);return {id:'',kind:'road',x:(b.x+f.x)/2,z:(b.z+f.z)/2,width:3,depth:d,rotation:Math.atan2(b.x-f.x,b.z-f.z),roadClass:'track',label:'Maamärgi juurdepääs'};});
  if(tracks.some(t=>index.query(t.x-130,t.z-130,t.x+130,t.z+130).some(o=>(o.kind==='water'||o.kind==='building'||o.appearance==='yard')&&footprintsOverlap(t,o,3))))continue;
  for(const [i,f] of pair.entries()){
   const n=chosen.length;f.id=`regional-landmark-${n}`;const track=tracks[i];track.id=`regional-landmark-access-${n}`;
   // Stop the lane at the facade; never paint asphalt through a structure.
   const endTrim=f.depth/2+2,angle=track.rotation??0;track.x+=Math.sin(angle)*endTrim/2;track.z+=Math.cos(angle)*endTrim/2;track.depth-=endTrim;
   features.push(f,track,{id:`regional-landmark-yard-${n}`,kind:'cover',appearance:'yard',x:f.x,z:f.z,width:28,depth:28,rotation:f.rotation,blocksMovement:false,color:region==='siberia'?0xb4bfbd:region==='desert'?0xb7a584:0xaaa68c});chosen.push(f);
  }
 }
}

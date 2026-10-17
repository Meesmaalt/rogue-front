import config from '../data/region-character.json';
import {Rng} from './rng';
import {MapFeatureIndex,pointInFeature,featureCorners,type MapFeatureDef} from './mapFeatures';
import {REGIONS,type RegionId,type RegionalLandform} from './regions';
import {footprintsOverlap} from './settlements';
import type {Point} from './types';

/** Ecological accents follow banks and rock toes; open manoeuvre space remains deliberately open. */
export function enrichRegionalCharacter(seed:number,size:number,region:RegionId,features:MapFeatureDef[],forms:readonly RegionalLandform[],reserved:readonly (Point&{r:number})[],forest:boolean):void {
 const rng=new Rng(seed^0x2b65d3),random=(a:number,b:number)=>a+(b-a)*rng.next(),cfg=config.landscape,p=config[region];
 const index=new MapFeatureIndex(features),patches:MapFeatureDef[]=[],fringe:MapFeatureDef[]=[];
 const add=(q:Point,width:number,depth:number,rotation:number,landscape:NonNullable<MapFeatureDef['landscape']>)=>{
  if(patches.length>=cfg.patchLimit||Math.max(Math.abs(q.x)+width/2,Math.abs(q.z)+depth/2)>size/2-16||reserved.some(r=>Math.hypot(r.x-q.x,r.z-q.z)<r.r+Math.max(width,depth)/2))return;
  const near=index.at(q.x,q.z);
  if(near.some(f=>(['water','building','road','bridge'].includes(f.kind)||f.appearance==='yard'||f.appearance==='field')&&pointInFeature(q.x,q.z,f,Math.min(width,depth)*.25)))return;
  if(patches.some(f=>Math.hypot(f.x-q.x,f.z-q.z)<Math.min(f.width,width)*.7))return;
  patches.push({id:`character-${landscape}-${patches.length}`,kind:'cover',...q,width,depth,rotation,shape:'ellipse',blocksMovement:false,landscape,color:parseInt((landscape==='scree'?p.stoneTint:p.groundTint).slice(1),16)});
 };
 const water=features.filter(f=>f.kind==='water'&&f.waterBody!=='sea');
 for(let i=0;i<water.length;i+=cfg.bankStride){
  const w=water[i],a=w.rotation??0;
  for(const side of [-1,1]){
   const t=w.waterBody==='lake'?random(-.3,.3)*w.depth:0,offset=side*(w.width/2+random(...cfg.bankOffset as [number,number]));
   add({x:w.x+Math.cos(a)*offset+Math.sin(a)*t,z:w.z-Math.sin(a)*offset+Math.cos(a)*t},random(...cfg.patchWidth as [number,number]),random(...cfg.patchDepth as [number,number]),a,p.surface as 'meadow'|'wash');
  }
 }
 // Scree collects beside the ridge, rather than appearing uniformly over the whole map.
 for(const [i,f] of forms.entries()){
  if(i%2)continue;
  const a=f.rotation??0;
  for(const side of [-1,1]){
   const t=random(-.4,.4)*f.width,offset=side*f.depth*.92;
   add({x:f.x+Math.cos(a)*t+Math.sin(a)*offset,z:f.z-Math.sin(a)*t+Math.cos(a)*offset},Math.min(85,f.width*.7),random(24,46),a,region==='desert'&&f.shape==='dune'?'wash':'scree');
  }
 }
 // Sparse edge copses provide a genuine cover transition, with the same forest rules as the main mass.
 if(forest)for(const wood of features.filter(f=>f.appearance==='forest'&&f.width>45&&f.depth>45)){
  if(fringe.length>=cfg.treeFringeLimit)break;
  const a=random(0,Math.PI*2),q={x:wood.x+Math.cos(a)*wood.width*.48,z:wood.z+Math.sin(a)*wood.depth*.48};
  if(pointInFeature(q.x,q.z,wood)||reserved.some(r=>Math.hypot(r.x-q.x,r.z-q.z)<r.r+20))continue;
  const copse:MapFeatureDef={id:`character-copse-${fringe.length}`,kind:'cover',appearance:'forest',...q,width:random(18,32),depth:random(18,35),shape:'ellipse',height:region==='siberia'?8:5,density:.38,blocksMovement:false,color:parseInt(REGIONS[region].forest.slice(1),16),label:'Hõre metsaserv'};
  if(featureCorners(copse).some(p=>Math.max(Math.abs(p.x),Math.abs(p.z))>size/2-12)||index.query(q.x-35,q.z-35,q.x+35,q.z+35).some(f=>(['water','road','building','bridge'].includes(f.kind)||f.appearance==='yard'||f.appearance==='field')&&footprintsOverlap(copse,f,4)))continue;
  fringe.push(copse);
 }
 features.push(...patches,...fringe);
}

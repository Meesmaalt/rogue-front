import config from '../data/italian-landscape.json';
import {Rng} from './rng';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from './mapFeatures';
import type {Point} from './types';
/** Agricultural districts add visual variety while retaining the original traversable parcels and corridors. */
export function enrichItalianLandscape(seed:number,features:MapFeatureDef[],protectedPoints:readonly Point[]):void {
 const rng=new Rng((seed^0x5d71b3)>>>0),index=new MapFeatureIndex(features),roads=features.filter(f=>f.kind==='road'),farms:Point[]=[];
 for(const field of features.filter(f=>f.appearance==='field'&&f.cropPattern!=='bare'&&f.width>26&&f.depth>26)){
  const choice=rng.next(),district=Math.sin(field.x/230+seed*.001)+Math.cos(field.z/190);
  field.landUse=choice<.27?'vineyard':choice<.46?'olive':choice<.54&&district>-.5?'citrus':choice<.73?'pasture':undefined;
  if(field.landUse){field.color=config.colors[field.landUse];field.label={vineyard:'Viinamarjaistandus',olive:'Oliivisalu',citrus:'Tsitruseistandus',pasture:'Karjamaa'}[field.landUse];}
  if(farms.length>=config.farmLimit||rng.next()>config.farmChance||protectedPoints.some(p=>Math.hypot(p.x-field.x,p.z-field.z)<config.protectedRadius)||farms.some(p=>Math.hypot(p.x-field.x,p.z-field.z)<150))continue;
  const p={x:field.x,z:field.z};if(!pointInFeature(p.x,p.z,field)||index.at(p.x,p.z).some(f=>['road','water','building','bridge'].includes(f.kind)&&pointInFeature(p.x,p.z,f,config.farmClearance)))continue;
  let connection:Point|undefined,best=config.farmRoadDistance;
  for(const road of roads){const a=road.rotation??0,t=Math.max(-road.depth/2,Math.min(road.depth/2,(p.x-road.x)*Math.sin(a)+(p.z-road.z)*Math.cos(a))),q={x:road.x+Math.sin(a)*t,z:road.z+Math.cos(a)*t},d=Math.hypot(q.x-p.x,q.z-p.z);if(d>=best)continue;
   let clear=true;for(let step=1;step<=8&&clear;step++){const x=p.x+(q.x-p.x)*step/8,z=p.z+(q.z-p.z)*step/8;clear=!index.at(x,z).some(f=>['water','building'].includes(f.kind)&&pointInFeature(x,z,f,3));}if(clear){best=d;connection=q;}
  }
  if(!connection)continue;const n=farms.length,angle=Math.atan2(connection.x-p.x,connection.z-p.z),start={x:p.x+Math.sin(angle)*6,z:p.z+Math.cos(angle)*6};farms.push(p);
  features.push({id:`italian-farm-${n}`,kind:'building',appearance:'farmhouse',...p,width:8,depth:9,height:n%3===0?7.5:4.8,rotation:angle,buildingStyle:n%3===0?'civic':'rural',color:0xa35e42,facadeColor:n%2?0xd2c6ad:0xc6b493,garrisonCapacity:1,label:n%3===0?'Külakabel':'Istanduse talumaja'},
   {id:`italian-farm-access-${n}`,kind:'road',x:(start.x+connection.x)/2,z:(start.z+connection.z)/2,width:3.5,depth:best-6,rotation:angle,roadClass:'track',blocksMovement:false,label:'Talu kruusatee'});
 }
}

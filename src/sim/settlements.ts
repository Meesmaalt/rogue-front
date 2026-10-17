import config from '../data/map-generation.json';
import {Rng} from './rng';
import {featureCorners,type MapFeatureDef} from './mapFeatures';
import type {Point} from './types';
export type SettlementLayout='oldtown'|'grid'|'ribbon'|'fork'|'crescent'|'courtyard';
export interface Settlement extends Point {angle:number;blocks:number}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Separating-axis footprint test allows close neighbours without overlapping rotated lots. */
export function footprintsOverlap(a:MapFeatureDef,b:MapFeatureDef,clearance=0):boolean {
 if(distance(a,b)>Math.hypot(a.width,a.depth)/2+Math.hypot(b.width,b.depth)/2+clearance)return false;
 const pa=featureCorners(a),pb=featureCorners(b);
 for(const poly of [pa,pb])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],length=distance(p,q);if(length<1e-8)continue;
  const nx=-(q.z-p.z)/length,nz=(q.x-p.x)/length;
  const aa=pa.map(p=>p.x*nx+p.z*nz),bb=pb.map(p=>p.x*nx+p.z*nz);
  if(Math.max(...aa)+clearance<=Math.min(...bb)||Math.max(...bb)+clearance<=Math.min(...aa))return false;
 }
 return true;
}
export function buildVariedSettlement(index:number,town:Settlement,rng:Rng,existing:readonly MapFeatureDef[],rural=false,refined=false):MapFeatureDef[] {
 const cfg=config.settlementVariety,random=(a:number,b:number)=>a+(b-a)*rng.next();
 const role=index===0?'city':index===1?'town':index%3===2?'hamlet':'village';
 const refinement=config.settlementRefinement,layouts=refined?refinement.layouts:cfg.layouts;
 const layout=(role==='hamlet'?'ribbon':layouts[Math.floor(rng.next()*layouts.length)]) as SettlementLayout;
 const scale=cfg.roles[role],span=town.blocks*cfg.blockSpan*random(scale.spread[0],scale.spread[1]);
 const transform=(x:number,z:number):Point=>({x:town.x+x*Math.cos(town.angle)+z*Math.sin(town.angle),z:town.z-x*Math.sin(town.angle)+z*Math.cos(town.angle)});
 const streets:MapFeatureDef[]=[],features:MapFeatureDef[]=[];
 const road=(id:string,a:Point,b:Point)=>{const depth=distance(a,b);if(depth<.1)return;const f:MapFeatureDef={id:`town-${index}-${id}`,kind:'road',x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:scale.streetWidth,depth:depth+.4,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass:'street',label:'Asulatänav'};streets.push(f);features.push(f);};
 const line=(id:string,points:Point[])=>{for(let i=1;i<points.length;i++)road(`${id}-${i}`,points[i-1],points[i]);};
 const extent=town.blocks*config.blockDepth/2+35,spineX=-town.blocks*config.blockWidth/2+Math.ceil(town.blocks/2)*config.blockWidth;
 // Preserve the regional connection anchors independently of the settlement shape.
 road('spine',transform(spineX,-Math.max(extent,span)),transform(spineX,Math.max(extent,span)));
 if(refined&&layout==='grid'){
  const count=role==='city'?cfg.cityGridStreets:cfg.villageGridStreets,gap=span*2/count;
  const nodes=Array.from({length:count+1},(_,ix)=>Array.from({length:count+1},(_,iz)=>transform(-span+ix*gap+(ix>0&&ix<count?random(-gap*refinement.gridJitter,gap*refinement.gridJitter):0),-span+iz*gap+(iz>0&&iz<count?random(-gap*refinement.gridJitter,gap*refinement.gridJitter):0))));
  for(let i=0;i<=count;i++){line(`cross-${i}`,nodes[i]);line(`block-${i}`,nodes.map(row=>row[i]));}
 }else if(refined&&(layout==='crescent'||layout==='courtyard')){
  const points=Array.from({length:cfg.loopSegments+1},(_,i)=>{
   const a=(layout==='crescent'?.2:0)+i/cfg.loopSegments*Math.PI*(layout==='crescent'?1.6:2);
   return transform(Math.cos(a)*span,Math.sin(a)*span*.72);
  });line('perimeter',points);
  const anchor=transform(spineX,0);
  for(const i of [0,Math.floor(cfg.loopSegments/3),Math.floor(cfg.loopSegments*2/3),cfg.loopSegments])road(`connector-${i}`,anchor,points[i]);
  if(layout==='courtyard')line('cross-ward',[points[Math.floor(cfg.loopSegments/4)],transform(-span*.25,0),points[Math.floor(cfg.loopSegments*3/4)]]);
 }else if(layout==='grid'){
  const count=role==='city'?cfg.cityGridStreets:cfg.villageGridStreets,gap=span*2/count;
  for(let i=0;i<=count;i++){
   const offset=-span+i*gap;
   road(`cross-${i}`,transform(-span,offset),transform(span,offset));
   road(`block-${i}`,transform(offset,-span),transform(offset,span));
  }
 }else if(layout==='oldtown'){
  const rings:Point[][]=[],phase=random(0,Math.PI*2),stretch=random(.68,1.12);
  for(let ring=0;ring<2;ring++){
   const radius=span*(ring===0?.48:1),points=Array.from({length:cfg.loopSegments},(_,i)=>{
    const a=i/cfg.loopSegments*Math.PI*2,r=1+.19*Math.sin(a*2+phase)+.1*Math.cos(a*3-phase);
    return transform(Math.cos(a)*radius*r,Math.sin(a)*radius*r*stretch);
   });line(`ring-${ring}`,[...points,points[0]]);rings.push(points);
  }
  for(let j=0;j<cfg.loopSegments;j+=cfg.spokeStride){road(`inner-${j}`,town,rings[0][j]);road(`outer-${j}`,rings[0][j],rings[1][j]);}
 }else{
  const bend=random(-span*.25,span*.25),branches=role==='hamlet'?2:4;
  for(let i=0;i<branches;i++){
   const z=(i/(branches-1)-.5)*span*1.4,side=i%2?1:-1;
   const p=transform(spineX,z),a=transform(side*span*.5,z+bend),b=transform(side*span*(layout==='fork'?1.35:1),z+(layout==='fork'?side*span*.5:bend));
   line(`branch-${i}`,[p,a,b]);
   if(layout==='fork')road(`branch-side-${i}`,a,transform(side*span*.8,z-bend-span*.22));
  }
 }
 road('boundary',town,transform(town.blocks*config.blockWidth/2,0));
 const blockers=[...existing,...streets].filter(f=>(['building','road','bridge','water'].includes(f.kind)||f.id.startsWith('base-airfield-yard-')));
 const houses:MapFeatureDef[]=[],parks:MapFeatureDef[]=[];
 let civicPlaced=false;
 if(refined&&role!=='hamlet'){
  for(let i=0;i<refinement.parkCount;i++)for(let attempt=0;attempt<12;attempt++){
   const p=transform(random(-span*.65,span*.65),random(-span*.65,span*.65)),width=random(refinement.parkWidth[0],refinement.parkWidth[1]);
   const park:MapFeatureDef={id:`town-${index}-park-${i}`,kind:'cover',appearance:'forest',...p,width,depth:width*1.15,shape:'ellipse',height:4.5,density:refinement.parkDensity,blocksMovement:false,label:role==='city'?'Linnapark':'Külasalu'};
   if(blockers.some(f=>footprintsOverlap(park,f,3))||parks.some(f=>footprintsOverlap(park,f,3)))continue;
   parks.push(park);features.push(park);break;
  }
 }
 const paletteIndex=refined?Math.floor(rng.next()*refinement.facades.length):0;

 for(const street of streets){
  const angle=street.rotation??0,length=street.depth;
  for(const side of [-1,1]){
   let cursor=-length/2+cfg.cornerSetback;
   while(cursor<length/2-cfg.cornerSetback){
    const core=role==='city'||role==='town';
    const tEstimate=cursor+5,pEstimate={x:street.x+Math.sin(angle)*tEstimate,z:street.z+Math.cos(angle)*tEstimate},central=distance(pEstimate,town)<span*refinement.centerRadius;
    const styles=rural?cfg.ruralStyles:refined&&core?(central?refinement.centerStyles:refinement.edgeStyles):core?cfg.urbanStyles:cfg.villageStyles;
    const style=refined&&!civicPlaced&&role!=='hamlet'&&central?'civic':styles[Math.floor(rng.next()*styles.length)] as NonNullable<MapFeatureDef['buildingStyle']>,def=cfg.buildings[style];
    const width=random(def.width[0],def.width[1]),depth=random(def.depth[0],def.depth[1]),height=random(def.height[0],def.height[1]);
    const t=cursor+width/2;cursor+=width+random(scale.gap[0],scale.gap[1]);
    if(t+width/2>length/2-cfg.cornerSetback||rng.next()>scale.occupancy)continue;
    const offset=side*(street.width/2+depth/2+cfg.frontSetback);
    const house:MapFeatureDef={id:`town-${index}-house-${houses.length}`,kind:'building',appearance:'farmhouse',x:street.x+Math.sin(angle)*t+Math.cos(angle)*offset,z:street.z+Math.cos(angle)*t-Math.sin(angle)*offset,width,depth,height,rotation:angle+Math.PI/2+(side<0?Math.PI:0),buildingStyle:style,color:(refined?(core?refinement.cityRoofs:refinement.villageRoofs):cfg.roofColors)[Math.floor(rng.next()*(refined?3:cfg.roofColors.length))],...(refined?{facadeColor:refinement.facades[(paletteIndex+(houses.length%3===0?1:0))%refinement.facades.length],district:rural?'rural' as const:central?'center' as const:'residential' as const}:{}),label:style==='civic'&&role!=='city'?'Külakeskus':def.label,garrisonCapacity:style==='apartment'?3:1};
    if(blockers.some(f=>footprintsOverlap(house,f,cfg.minimumClearance))||houses.some(f=>footprintsOverlap(house,f,cfg.minimumClearance))||parks.some(f=>footprintsOverlap(house,f,2)))continue;
    if(style==='civic')civicPlaced=true;
    houses.push(house);features.push(house,{id:`garden-${house.id}`,kind:'cover',appearance:'yard',x:house.x,z:house.z,width:width+1,depth:depth+2,rotation:house.rotation,color:0x919981,blocksMovement:false});
   }
  }
 }
 return features;
}
/** Isolated industrial yards have one hall, an office and a warehouse, with a real road access. */
export function buildIndustrialClusters(size:number,rng:Rng,existing:readonly MapFeatureDef[],reserved:readonly (Point&{r:number})[]):MapFeatureDef[] {
 const cfg=config.settlementVariety,features:MapFeatureDef[]=[],random=(a:number,b:number)=>a+(b-a)*rng.next();
 const roads=existing.filter(f=>f.kind==='road'&&f.roadClass!=='street');
 for(let cluster=0;cluster<cfg.industrialClusters;cluster++)for(let attempt=0;attempt<cfg.industrialAttempts;attempt++){
  const road=roads[Math.floor(rng.next()*roads.length)],a=road.rotation??0,t=random(-road.depth*.4,road.depth*.4),side=rng.next()<.5?-1:1;
  const access={x:road.x+Math.sin(a)*t,z:road.z+Math.cos(a)*t},p={x:access.x+Math.cos(a)*side*cfg.industrialSetback,z:access.z-Math.sin(a)*side*cfg.industrialSetback};
  if(Math.max(Math.abs(p.x),Math.abs(p.z))>size/2-75||reserved.some(b=>distance(p,b)<b.r+cfg.industrialSetback))continue;
  const rotate=(x:number,z:number)=>({x:p.x+x*Math.cos(a)+z*Math.sin(a),z:p.z-x*Math.sin(a)+z*Math.cos(a)});
  const parts:MapFeatureDef[]=[{style:'industrial',x:0,z:0,w:22,d:28,h:8},{style:'warehouse',x:side*25,z:-10,w:12,d:17,h:5},{style:'shop',x:side*22,z:15,w:8,d:10,h:5}].map((b,i)=>({id:`industry-${cluster}-building-${i}`,kind:'building',appearance:'farmhouse',...rotate(b.x,b.z),width:b.w,depth:b.d,height:b.h,rotation:a,buildingStyle:b.style as MapFeatureDef['buildingStyle'],label:i===0?'Tehasehoone':i===1?'Ladu':'Tehase kontor',garrisonCapacity:1,color:0x747b7b}));
  const from=rotate(-side*17,0),depth=distance(from,access),track:MapFeatureDef={id:`industry-${cluster}-access`,kind:'road',x:(from.x+access.x)/2,z:(from.z+access.z)/2,width:4,depth,rotation:Math.atan2(access.x-from.x,access.z-from.z),roadClass:'track',label:'Tehase juurdepääs'};
  const blockers=[...existing,...features].filter(f=>(['building','water'].includes(f.kind)||f.id.startsWith('base-airfield-yard-')));
  if(parts.some(b=>[...blockers,...existing.filter(f=>f.kind==='road')].some(f=>footprintsOverlap(b,f,3)))||blockers.some(b=>footprintsOverlap(track,b,2)))continue;
  features.push(...parts,track,{id:`industry-${cluster}-yard`,kind:'cover',appearance:'yard',...p,width:70,depth:54,rotation:a,color:0x96978d,blocksMovement:false});break;
 }
 return features;
}

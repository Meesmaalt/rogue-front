import {buildCharacterSettlement} from './characterSettlements';
import {enrichRegionalCharacter} from './regionalCharacter';
import {distanceToPlanRiver,type RegionalPlan} from './regionPlans';
import {addPlanInfrastructure,planResourceSites} from './regionInfrastructure';
import {Rng} from './rng';
import {REGIONS,regionDefaults,regionalNoise,reliefKernel,regionalReliefAt,type RegionId,type RegionalLandform,type ReliefShape} from './regions';
import type {MissionDef,Point,MapResourceDef} from './types';
import type {MapArchetype,MapOptions} from './proceduralMap';
import {MapFeatureIndex,featureCorners,type MapFeatureDef} from './mapFeatures';
import {buildVariedSettlement,footprintsOverlap} from './settlements';
import {subtractParcel,parcelArea,convexHull} from './regionalLandscape';
import {addInteriorLakes,refineRoadConnections} from './mapRefinement';
import {enrichItalianLandscape} from './italianLandscape';
import battle from '../data/battle-scale.json';
import generation from '../data/map-generation.json';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** V17: a region plan owns relief belts, lowland routes and districts before local detail. */
export function generateRegionalMap(seed:number,archetype:MapArchetype,size:number,input?:MapOptions,plan?:RegionalPlan):MissionDef {
 const region:RegionId=input?.region??'italy',p=REGIONS[region],options={...regionDefaults(region),...input},rng=new Rng(seed),random=(a:number,b:number)=>a+(b-a)*rng.next();
 const features:MapFeatureDef[]=[],forms:RegionalLandform[]=[],half=size/2;
 const bases:MissionDef['map']['bases']=[{x:-size*.37,z:size*.35,r:48},{x:size*.37,z:-size*.35,r:48}];
 const bend=random(.028,.048)*size,phase=random(-.4,.4),lane=size*random(.22,.26);
 // Three crossings, a valley and two feeder roads form the master plan. Cosmetic asymmetry comes later.
 const riverX=(z:number)=>Math.sin(z/size*Math.PI*2)*bend+Math.sin(z/size*Math.PI*6)*bend*.18;
 const spine=(side:number,z:number)=>side*size*.285+Math.sin(z/size*Math.PI*2)*size*.012;
 const road=(id:string,a:Point,b:Point,width=7,roadClass:MapFeatureDef['roadClass']='secondary')=>{
  const length=distance(a,b);if(length<1)return;
  features.push({id,kind:'road',x:(a.x+b.x)/2,z:(a.z+b.z)/2,width,depth:length+.4,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass,label:roadClass==='track'?'Juurdepääsutee':'Maantee'});
 };
 const route=(id:string,points:Point[],width=7)=>{for(let i=1;i<points.length;i++)road(`${id}-${i}`,points[i-1],points[i],width);};
 for(const [team,b] of bases.entries()){
  const sign=team===0?1:-1,a=team===0?Math.PI*.75:-Math.PI/4,mid=(battle.generationAirfield.runwayStart+battle.generationAirfield.runwayEnd)/2;
  features.push({id:`base-airfield-yard-${team}`,kind:'cover',appearance:'yard',x:b.x+battle.readyAirfield.x*sign+Math.sin(a)*mid,z:b.z+battle.readyAirfield.z*sign+Math.cos(a)*mid,width:battle.generationAirfield.runwayWidth+55,depth:battle.generationAirfield.runwayEnd-battle.generationAirfield.runwayStart+40,rotation:a,blocksMovement:false});
 }
 if(plan)addPlanInfrastructure(plan,size,options.river,features);
 if(!plan){
 if(options.river)for(let i=0;i<96;i++){
  const za=-half-20+i*(size+40)/96,zb=-half-20+(i+1)*(size+40)/96,a={x:riverX(za),z:za},b={x:riverX(zb),z:zb};
  features.push({id:`region-river-${i}`,kind:'water',waterBody:'river',x:(a.x+b.x)/2,z:(za+zb)/2,width:region==='canyon'?24:28,depth:distance(a,b)+2,rotation:Math.atan2(b.x-a.x,b.z-a.z),surfaceHeight:-.8,label:'Jõgi'});
 }

 const crossingZ=[-lane,0,lane];
 for(const side of [-1,1]){
  route(`feeder-${side}`,Array.from({length:41},(_,i)=>{const z=-size*.44+i*size*.88/40;return {x:spine(side,z),z};}));
  const b=bases[side===-1?0:1];road(`base-link-${side}`,b,{x:spine(side,b.z),z:b.z});
 }
 for(const [i,z] of crossingZ.entries()){
  const cx=riverX(z),deck=56;
  if(options.river)features.push({id:`bridge-${i}`,kind:'bridge',x:cx,z,width:16,depth:deck,rotation:Math.PI/2,surfaceHeight:1.4,label:'Jõesild'});
  else road(`cross-center-${i}`,{x:cx-deck/2,z},{x:cx+deck/2,z});
  for(const side of [-1,1]){
   const start={x:cx+side*deck/2,z},end={x:spine(side,z),z};
   const points=Array.from({length:13},(_,j)=>{const t=j/12;return {x:start.x+(end.x-start.x)*t,z:z+Math.sin(t*Math.PI)*Math.sin(i+phase)*size*.008};});
   route(`cross-${i}-${side}`,points);
  }
 }
 }
 if(options.sea)for(const side of [-1,1])features.push({id:`region-sea-${side}`,kind:'water',waterBody:'sea',x:0,z:side*(half-30),width:size+10,depth:60,surfaceHeight:-.8,label:'Meri'});
 // Resource loading areas are reserved along the transport network before settlement growth.
 const plannedSites=plan?planResourceSites(plan,size,features):undefined;
 const targets:Point[]=plannedSites??[{x:spine(-1,size*.17)+30,z:size*.17},{x:spine(1,-size*.17)-30,z:-size*.17},{x:size*.075,z:35},
  {x:spine(-1,-size*.31)+32,z:-size*.31},{x:spine(1,size*.31)-32,z:size*.31},
  {x:-size*.16,z:-lane+32},{x:size*.16,z:lane-32},{x:spine(-1,-size*.40)+32,z:-size*.40},{x:spine(1,size*.40)-32,z:size*.40}];
 const resources:MapResourceDef[]=targets.map((t,i)=>({...t,amount:generation.mapRefinement.initialFactoryStock,maxStock:2400,radius:14,facility:(["depot","depot","factory","oilfield","oilfield","factory","factory","mine","mine"] as const)[i],facilityOffset:plannedSites?.[i].offset??{x:i%2?-20:20,z:i%2?-20:20},active:false,level:1,startupProgress:0,productionRate:0,controlledBy:null,controlProgress:.5,label:i<2?'Varustustehas':i===3||i===4?'Naftatöötlemistehas':i>=7?'Rikastustehas':'Masinatehas'}));
 for(const [i,r] of resources.entries()){
  const f={x:r.x+r.facilityOffset!.x,z:r.z+r.facilityOffset!.z};
  features.push({id:`resource-yard-${i}`,kind:'cover',appearance:'yard',...f,width:36,depth:32,blocksMovement:false,color:region==='siberia'?0xb2bec2:0xaaa18c});
  const roads=features.filter(f=>f.kind==='road');let best=Infinity,chosen:Point|undefined;
  for(const f of roads){const a=f.rotation??0,t=Math.max(-f.depth/2,Math.min(f.depth/2,(r.x-f.x)*Math.sin(a)+(r.z-f.z)*Math.cos(a))),q={x:f.x+Math.sin(a)*t,z:f.z+Math.cos(a)*t},d=distance(r,q);if(d<best){best=d;chosen=q;}}
  if(chosen)road(`resource-access-${i}`,r,chosen,4.5,'track');
 }
 const townPlans=plan?plan.towns.map(t=>({...t,blocks:Math.max(1,Math.round(t.blocks*p.settlementScale*(archetype==='urban'?1.35:1)))})):[{x:spine(-1,-lane),z:-lane},{x:spine(1,lane),z:lane},{x:spine(-1,size*.075),z:size*.075},{x:spine(1,-size*.075),z:-size*.075},
  {x:spine(-1,size*.30),z:size*.30},{x:spine(1,-size*.30),z:-size*.30}].map((t,i)=>({...t,angle:random(-.15,.15),blocks:Math.max(1,Math.round((i<2?(archetype==='urban'?4:3):2)*p.settlementScale))}));
 const protectedPoints=[...bases.map(b=>({...b,r:110})),...resources.map(r=>({...r,r:75})),...townPlans.map(t=>({...t,r:t.blocks*35+35}))];
 if(options.lakes)addInteriorLakes(size,rng,features,protectedPoints,true,plan?.lakeGuides);
 // Long overlapping forms create connected belts. Their low gaps are deliberate road/settlement corridors.
 // Layout candidates exist before local streets or parcel painting.
 if(plan&&options.mountains){
  const index=new MapFeatureIndex(features.filter(f=>f.kind==='road'||f.kind==='bridge'||f.kind==='water'||f.appearance==='yard'),96,12),seen=new Set<string>();
  const valid=(f:RegionalLandform)=>{
   const probe:MapFeatureDef={id:'ridge',kind:'cover',x:f.x,z:f.z,width:f.width*2,depth:f.depth*2,rotation:f.rotation,shape:'ellipse'};
   return !protectedPoints.some(p=>distance(p,f)<p.r+Math.min(f.width,f.depth)*.55)&&!index.query(f.x-Math.hypot(f.width,f.depth),f.z-Math.hypot(f.width,f.depth),f.x+Math.hypot(f.width,f.depth),f.z+Math.hypot(f.width,f.depth)).some(o=>footprintsOverlap(probe,o,9));
  };
  for(const [pathIndex,path] of plan.ridgePaths.entries())for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],length=distance(a,b),count=Math.max(1,Math.ceil(length/(size*.04)));
   for(let j=0;j<count;j++){
    const t=(j+.5)/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(x>=0)continue;
    const key=`${Math.round(x/20)}/${Math.round(z/20)}`;if(seen.has(key))continue;seen.add(key);
    for(const scale of [1,.8,.6]){
     const f:RegionalLandform={x,z,width:size*(region==='desert'?.075:.052)*scale*(plan.relief?.widthScale??1),depth:size*(region==='desert'?.025:.037)*scale*(plan.relief?.depthScale??1),height:p.reliefHeight*(.85+new Rng(seed^Math.imul(pathIndex+1,0x761b)).next()*.2)*(archetype==='highlands'?1.35:1)*(plan.relief?.heightScale??1),group:`belt-${pathIndex}`,shape:plan.relief?.shape??p.reliefShape as ReliefShape,rotation:Math.atan2(-(b.z-a.z),b.x-a.x)};
     const opposite={...f,x:-x,z:-z,group:`belt-${pathIndex}-opposite`,rotation:(f.rotation??0)+Math.PI};
     if(valid(f)&&valid(opposite)){forms.push(f,opposite);break;}
    }
   }
  }
 }
 if(!plan&&options.mountains){
  const backbone=features.filter(f=>f.kind==='road'||f.kind==='water'||f.id.startsWith('base-airfield'));
  const index=new MapFeatureIndex(backbone,96,20),step=Math.max(100,size*.045),count=Math.ceil(size*.84/step);
  for(const side of [-1,1])for(const belt of [0,1])for(let j=0;j<=count;j++){
   const z=-size*.42+j*size*.84/count,x=side*size*(belt===0?.125:.415)+Math.sin(z/size*Math.PI*3+phase)*size*.018;
   const width=size*(region==='desert'?.034:belt===0?.072:.062),depth=size*(region==='desert'?.11:.075),shape=p.reliefShape as ReliefShape;
   const probe:MapFeatureDef={id:'relief',kind:'cover',x,z,width:width*2,depth:depth*2,shape:'ellipse'};
   if(protectedPoints.some(t=>distance(t,probe)<t.r+width*.7))continue;
   // Keep full road clearance, but permit the river valley beside a connected canyon wall.
   if(index.query(x-width,z-depth,x+width,z+depth).some(f=>footprintsOverlap(probe,f,14)))continue;
   forms.push({x,z,width,depth,height:p.reliefHeight*random(.75,1.12)*(archetype==='highlands'?1.35:1),shape,rotation:random(region==='desert'?-.38:-.12,region==='desert'?-.18:.12)});
  }
 }
 // Settlements use existing frontage/lot logic; reserves protect airfields and industrial pickup yards.
 for(const [i,t] of townPlans.entries()){
  const reserves=resources.flatMap((r,j)=>plan?[{id:`reserve-loading-${j}`,kind:'building' as const,x:r.x,z:r.z,width:40,depth:40},{id:`reserve-factory-${j}`,kind:'building' as const,x:r.x+r.facilityOffset!.x,z:r.z+r.facilityOffset!.z,width:32,depth:32}]:[{id:`reserve-resource-${j}`,kind:'building' as const,x:r.x,z:r.z,width:100,depth:100}]);
  const canonical=plan?[0,0,3,3,2,2][i]:i,localRng=plan?new Rng(seed^Math.imul(Math.floor(i/2)+1,0x75ab9)):rng;
  const buildings=plan?buildCharacterSettlement(i,t,region,localRng,[...features,...reserves],size):buildVariedSettlement(canonical,t,localRng,[...features,...reserves],region!=='italy',true);

  features.push(...buildings);
 }
 for(const f of features)if(f.kind==='building'){
  if(!plan){f.color=p.roof;f.facadeColor=p.facade;}
  if(region==='siberia')f.label=f.buildingStyle==='industrial'?'Töökoja hoone':'Taiga asula';
 }
 // Fields belong to lowland agricultural districts, not every empty polygon on the map.
 const blockers=new MapFeatureIndex(features.filter(f=>['water','building','road','bridge'].includes(f.kind)||f.appearance==='yard'),96,8);
 const cell=Math.max(64,Math.min(115,size/30)),steps=Math.ceil((size-24)/cell),gridStep=(size-24)/steps;
 const nodes=Array.from({length:steps+1},(_,j)=>Array.from({length:steps+1},(_,i)=>({x:-half+12+i*gridStep+(i>0&&i<steps?random(-.17,.17)*gridStep:0),z:-half+12+j*gridStep+(j>0&&j<steps?random(-.17,.17)*gridStep:0)})));
 for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){
  const poly=[nodes[j][i],nodes[j][i+1],nodes[j+1][i+1],nodes[j+1][i]],s={x:poly.reduce((a,p)=>a+p.x,0)/4,z:poly.reduce((a,p)=>a+p.z,0)/4};
  if(bases.some(b=>distance(b,s)<130)||townPlans.some(t=>distance(t,s)<t.blocks*32+30))continue;
  const district=regionalNoise(s.x,s.z,seed^0x362ad,Math.max(260,size*.13));
  const riverDistance=plan?distanceToPlanRiver(plan,s):Math.abs(s.x-riverX(s.z));
  const threshold=p.forestThreshold+(plan?.forestBias??0)+(archetype==='forest'?-.13:archetype==='urban'?.1:0);
  const plannedRelief=(v:Point)=>plan?regionalReliefAt(v,forms):forms.reduce((h,f)=>{const a=f.rotation??0,dx=v.x-f.x,dz=v.z-f.z;return h+f.height*reliefKernel(((dx*Math.cos(a)-dz*Math.sin(a))/f.width)**2+((dx*Math.sin(a)+dz*Math.cos(a))/f.depth)**2,f.shape);},0);
  const woodValue=(v:Point)=>regionalNoise(v.x,v.z,seed^0x362ad,Math.max(260,size*.13))-threshold-(region==='canyon'?Math.min(1,plannedRelief(v)/35):0);
  const forestPoly:Point[]=[];
  if(options.forest&&!(region==='desert'&&riverDistance>size*.1))for(let k=0;k<poly.length;k++){
   const a=poly[k],b=poly[(k+1)%poly.length],va=woodValue(a),vb=woodValue(b);
   if(va>=0)forestPoly.push(a);
   if((va>=0)!==(vb>=0)){const t=va/(va-vb);forestPoly.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
  const woodland=forestPoly.length>=3&&parcelArea(forestPoly)>100;
  let pieces=[woodland?forestPoly:poly];
  for(const f of blockers.query(s.x-gridStep,s.z-gridStep,s.x+gridStep,s.z+gridStep)){
   const mask=convexHull(featureCorners({...f,width:f.width+7,depth:f.depth+7}));
   pieces=pieces.flatMap(poly=>subtractParcel(poly,mask,100)).sort((a,b)=>parcelArea(b)-parcelArea(a)).slice(0,8);
  }
  const localRelief=Math.max(plannedRelief(s),...poly.map(plannedRelief));
  const cultivated=!woodland&&localRelief<9&&(region==='italy'&&district<p.cropChance&&Math.abs(s.x)<size*.37||region==='canyon'&&options.river&&riverDistance<size*.08);
  if(!woodland&&!cultivated)continue;
  for(const [k,polygon] of pieces.entries()){
   if(parcelArea(polygon)<220)continue;
   const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
   features.push({id:`region-${woodland?'wood':'field'}-${i}-${j}-${k}`,kind:'cover',appearance:woodland?'forest':'field',...(!woodland&&plan?{parcelId:`regional-parcel-${i}-${j}`}:{}) ,x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,depth:maxZ-minZ,polygon,blocksMovement:false,height:region==='siberia'?11:7,density:region==='siberia'?.9:.75,color:parseInt(p.ground.slice(1),16),...(woodland?{}:{landUse:region==='canyon'?'pasture':undefined,cropRotation:Math.PI/2})});
  }
 }
 if(region==='italy')enrichItalianLandscape(seed,features,[...bases,...resources]);
 if(plan)enrichRegionalCharacter(seed,size,region,features,forms,[...bases.map(b=>({...b,r:130})),...resources.map(r=>({...r,r:65}))],options.forest);
 if(!options.forest)for(let i=features.length-1;i>=0;i--)if(features[i].appearance==='forest')features.splice(i,1);
 refineRoadConnections(features);
 // Encode both region and exact overrides. Old generation versions retain their own defaults and IDs.
 const regionIndex=['italy','siberia','canyon','desert'].indexOf(region),mask=Number(options.sea)|Number(options.mountains)<<1|Number(options.forest)<<2|Number(options.river)<<3|Number(options.lakes===false)<<4|regionIndex<<5|(plan&&input?.layout!=null?(input.layout+1)<<7:0);
 const id=`procedural-v${plan?18:17}-${archetype}-${size}-${seed>>>0}-o${mask}`,name=`${p.name}${plan?' · '+plan.name:''} · ${seed>>>0}`;
 const quantize=(n:number)=>Math.round(n*1000)/1000;
 for(const f of features){for(const key of ['x','z','width','depth','height'] as const)if(f[key]!=null)f[key]=quantize(f[key]!);if(f.rotation!=null)f.rotation=Math.round(f.rotation*1e6)/1e6;if(f.polygon)f.polygon=f.polygon.map(p=>({x:quantize(p.x),z:quantize(p.z)}));}
 return {id,name,seed:seed>>>0,briefing:p.description,objectives:[],map:{...(plan?{layout:{id:plan.id,name:plan.name}}:{}),id,name,size,theme:'temperate',terrainProfile:`region-${region}`,heightmap:'',maxHeight:160,landforms:forms,features,resources,bases,baseDefenses:false}};
}

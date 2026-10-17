import {generateRegionalMap} from './regionalMap';
import {REGION_IDS,type RegionId} from './regions';
import {addInteriorLakes,refineRoadConnections} from "./mapRefinement";
import {enrichItalianLandscape} from './italianLandscape';
import {naturalHills,naturalForestEdge,naturalWoodlandAt,interiorRidges} from "./naturalLandscape";
import battleScale from "../data/battle-scale.json";
import type {MissionDef,MapResourceDef,Point} from "./types";
import {MapFeatureIndex,pointInFeature,featureCorners,type MapFeatureDef} from "./mapFeatures";
import {Rng} from "./rng";
import config from "../data/map-generation.json";
import {buildOrganicTown,buildMountainRanges,ridgeReliefAt,subtractParcel,parcelArea,convexHull} from "./regionalLandscape";
import {buildVariedSettlement,buildIndustrialClusters} from "./settlements";
import greenValley from "../data/maps/green-valley.json";

export interface MapOptions {sea:boolean;mountains:boolean;forest:boolean;river:boolean;lakes?:boolean;region?:RegionId}
export function mapOptionsMask(o:MapOptions):number {return Number(o.sea)|Number(o.mountains)<<1|Number(o.forest)<<2|Number(o.river)<<3|Number(o.lakes===false)<<4|(o.region?REGION_IDS.indexOf(o.region)<<5:0);}
export function decodeMapOptions(n:number):MapOptions {return {sea:!!(n&1),mountains:!!(n&2),forest:!!(n&4),river:!!(n&8),...(n&16?{lakes:false}:{}),...(n>=32?{region:REGION_IDS[(n>>5)&3]}:{})};}
export type MapArchetype="balanced"|"river"|"highlands"|"urban"|"coastal"|"forest";
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function polygonFeature(id:string,points:Point[],appearance:"field"|"forest",color?:number):MapFeatureDef {
  const xs=points.map(p=>p.x),zs=points.map(p=>p.z),loX=Math.min(...xs),hiX=Math.max(...xs),loZ=Math.min(...zs),hiZ=Math.max(...zs);
  return {id,kind:"cover",appearance,x:(loX+hiX)/2,z:(loZ+hiZ)/2,width:hiX-loX,depth:hiZ-loZ,polygon:points,color,blocksMovement:false};
}
/** Convex half-plane clipping builds Voronoi land parcels without a runtime geometry dependency. */
function clip(points:Point[],nx:number,nz:number,limit:number):Point[] {
  const result:Point[]=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=a.x*nx+a.z*nz-limit,db=b.x*nx+b.z*nz-limit;
    if(da<=0)result.push(a);
    if((da<=0)!==(db<=0)){const t=da/(da-db);result.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
  return result;
}

export const GENERATED_MAP_SIZES:readonly number[]=config.largeSizes;
export const METRIC_MAP_SIZES:readonly number[]=battleScale.mapSizes;
export function generateProceduralMap(inputSeed:number,archetype:MapArchetype="balanced",requestedSize=config.defaultSize,generationVersion:3|4|5|6|7|8|9|10|11|12|13|14|15|16|17=[2560,3072,5120].includes(requestedSize)?11:requestedSize>=4096?10:8,options?:MapOptions):MissionDef {
  if(generationVersion===17){if(!METRIC_MAP_SIZES.includes(requestedSize))throw new Error('Kaardi suurus pole toetatud');return generateRegionalMap(inputSeed>>>0,archetype,requestedSize,options);}
  // 1280 retains v2 geometry for existing saved matches; v3 sizes are deliberately bounded.
  const legacy=requestedSize===config.size;
  if((requestedSize>=4096&&generationVersion<9)||(!legacy&&![...GENERATED_MAP_SIZES,...METRIC_MAP_SIZES].includes(requestedSize)))throw new Error("Kaardi suurus pole toetatud");
  const landscape=!legacy&&generationVersion>=6;
  const regional=!legacy&&generationVersion>=4,profile=config.profiles[archetype];
  const seed=inputSeed>>>0,rng=new Rng(seed),size=requestedSize,half=size/2,features:MapFeatureDef[]=[];
  const random=(lo:number,hi:number)=>lo+rng.next()*(hi-lo);
  const italian=generationVersion>=13,cfg=config.mediterranean,volcanic=italian&&(options?.mountains??true)&&seed%cfg.volcanoSeedDivisor===0;
  const baseX=size*random(.36,.40),baseZ=size*random(.33,.37);
  const bases:MissionDef["map"]["bases"]=[{x:-baseX,z:baseZ,r:config.baseRadius},{x:baseX,z:-baseZ,r:config.baseRadius}];
  const towns=[{x:-size*random(.185,.24),z:-size*random(.12,.18),angle:random(-.25,.25),blocks:3},{x:size*random(.185,.24),z:size*random(.12,.18),angle:random(-.25,.25),blocks:3},
    {x:-size*random(.27,.30),z:size*random(.245,.275),angle:random(-.4,.4),blocks:2},{x:size*random(.27,.30),z:-size*random(.245,.275),angle:random(-.4,.4),blocks:2}];
  if(regional){towns[0].blocks=profile.mainBlocks;towns[1].blocks=profile.mainBlocks;}
  if(!legacy){
    // Frontier settlements and rear villages form distinct zones, rather than expanding house footprints.
    for(const side of [-1,1]){
      towns.push({x:side*size*random(.13,.17),z:side*size*random(.025,.055),angle:random(-.35,.35),blocks:2});
      towns.push({x:side*size*random(.17,.22),z:-side*size*random(.32,.36),angle:random(-.4,.4),blocks:2});
    }
  }
  if(!legacy&&generationVersion>=7){
    towns[0].blocks=Math.floor(random(archetype==="urban"?4:3,6));
    towns[1].blocks=Math.floor(random(3,5));
    for(let i=2;i<towns.length;i++)towns[i].blocks=i%3===2?1:2;
    // Frontier villages sit on the opposite side of their main city, leaving room for dense wards.
    for(const i of [4,6])towns[i].z=-Math.sign(towns[i].x)*size*random(.045,.10);
  }
  // Shared strategic anchors; local streets, parcels and vegetation remain organic.
  if(generationVersion>=16){for(const [a,b] of [[0,1],[2,3],[4,6],[5,7]]){towns[b]={...towns[a],x:-towns[a].x,z:-towns[a].z,angle:towns[a].angle+Math.PI};}}
  const phase=random(-.3,.3),amplitude=generationVersion>=11?size*random(...config.freshGeneration.riverAmplitudeRatio as [number,number]):random(38,70);
  const riverX=(z:number)=>(volcanic&&generationVersion<16?size*cfg.riverOffsetRatio:0)+Math.sin(z/size*Math.PI*2+(generationVersion>=16?0:phase))*amplitude+Math.sin(z/size*Math.PI*5)*13;
  const blocked=(p:Point,r:number,kinds:readonly string[]=["building","water"])=>features.some(f=>(kinds.includes(f.kind)||generationVersion>=15&&f.id.startsWith("base-airfield-yard-"))&&pointInFeature(p.x,p.z,f,r));
  const road=(id:string,a:Point,b:Point,width:number,roadClass:MapFeatureDef["roadClass"]="secondary")=>{
    const length=distance(a,b);if(length<.1)return;
    features.push({id,kind:"road",x:(a.x+b.x)/2,z:(a.z+b.z)/2,width,depth:length+.4,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass,label:roadClass==="street"?"Asulatänav":roadClass==="track"?"Talutee":"Maantee"});
  };
  const corridor=(id:string,points:Point[],width=config.roadWidth,cls:MapFeatureDef["roadClass"]="secondary")=>{
    const rounded:Point[]=[points[0]];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1],radius=Math.min(28,distance(a,b)*.22,distance(b,c)*.22);
      const p={x:b.x+(a.x-b.x)*radius/distance(a,b),z:b.z+(a.z-b.z)*radius/distance(a,b)},q={x:b.x+(c.x-b.x)*radius/distance(b,c),z:b.z+(c.z-b.z)*radius/distance(b,c)};
      rounded.push(p);
      for(let j=1;j<=8;j++){const t=j/8;rounded.push({x:(1-t)**2*p.x+2*(1-t)*t*b.x+t*t*q.x,z:(1-t)**2*p.z+2*(1-t)*t*b.z+t*t*q.z});}
    }
    rounded.push(points.at(-1)!);for(let i=1;i<rounded.length;i++)road(`${id}-${i}`,rounded[i-1],rounded[i],width,cls);
  };
  // Hydrology precedes roads/settlements. Crossings alone permit ground passage.
  for(let i=0;i<((options?.river??true)?config.riverSteps:0);i++){
    const za=-half-16+i*(size+32)/config.riverSteps,zb=-half-16+(i+1)*(size+32)/config.riverSteps,a={x:riverX(za),z:za},b={x:riverX(zb),z:zb};
    features.push({id:`river-${i}`,kind:"water",waterBody:"river",x:(a.x+b.x)/2,z:(za+zb)/2,width:config.riverWidth,depth:distance(a,b)+2,rotation:Math.atan2(b.x-a.x,b.z-a.z),surfaceHeight:-.8,label:"Jõgi"});
  }
  if(generationVersion<15){
  const lakeCenter={x:175+random(-18,18),z:-size*.36},lakeWidth=archetype==="river"?130:220;
  const shore=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,r=1+.07*Math.sin(a*3+phase)+.025*Math.cos(a*5);return {x:lakeCenter.x+Math.cos(a)*lakeWidth*.5*r,z:lakeCenter.z+Math.sin(a)*72.5*r};});
  features.push({...polygonFeature("lake",shore,"field"),kind:"water",appearance:undefined,waterBody:"lake",surfaceHeight:-.8,blocksMovement:true,label:"Järv"});
  }
  if(options?.sea??archetype==="coastal")features.push({id:"sea",kind:"water",waterBody:"sea",x:0,z:-half+38,width:size,depth:76,surfaceHeight:-.8,label:"Meri"});
  if(generationVersion>=16&&(options?.sea??archetype==="coastal"))features.push({id:"sea-opposite",kind:"water",waterBody:"sea",x:0,z:half-38,width:size,depth:76,surfaceHeight:-.8,label:"Meri"});
  const crossingZ=[-size*random(.22,.26),random(-20,20),size*random(.22,.26)],bridges:MapFeatureDef[]=[];
  for(let i=0;i<crossingZ.length;i++){
    const z=crossingZ[i],b:MapFeatureDef={id:`bridge-${i}`,kind:(options?.river??true)?"bridge":"road",x:riverX(z),z,width:generationVersion>=9?16:10,depth:56,rotation:Math.PI/2,surfaceHeight:1.4,label:"Jõesild"};features.push(b);bridges.push(b);
  }
  if(generationVersion>=16){crossingZ[1]=0;crossingZ[2]=-crossingZ[0];for(let i=0;i<bridges.length;i++){bridges[i].x=riverX(crossingZ[i]);bridges[i].z=crossingZ[i];}}
  const through=(town:typeof towns[number],sign:number):Point[]=>{
    const cols=archetype==="urban"&&town.blocks===3?4:town.blocks;
    const x=-cols*config.blockWidth/2+Math.ceil(cols/2)*config.blockWidth,z=town.blocks*config.blockDepth/2+35;
    return [sign,-sign].map(side=>({x:town.x+x*Math.cos(town.angle)+side*z*Math.sin(town.angle),z:town.z-x*Math.sin(town.angle)+side*z*Math.cos(town.angle)}));
  };
  corridor("west-spine",[bases[0],...through(towns[2],1),{x:towns[0].x+21,z:130},...through(towns[0],1),{x:-size*.29,z:-half+(landscape&&archetype==="coastal"?95:65)}]);
  corridor("east-spine",[bases[1],...through(towns[3],generationVersion>=16?1:-1),{x:towns[1].x+(generationVersion>=16?-21:21),z:-130},...through(towns[1],generationVersion>=16?1:-1),{x:size*.29,z:half-(generationVersion>=16&&archetype==="coastal"?95:65)}]);
  for(let i=0;i<bridges.length;i++){
    const b=bridges[i];corridor(`cross-west-${i}`,[{x:-size*.35,z:b.z},{x:b.x-b.depth/2,z:b.z}]);
    corridor(`cross-east-${i}`,volcanic&&i===1?[{x:b.x+b.depth/2,z:b.z},{x:-size*.10,z:size*cfg.bypassRatio},{x:size*.10,z:size*cfg.bypassRatio},{x:size*.35,z:b.z}]:[{x:b.x+b.depth/2,z:b.z},{x:size*.35,z:b.z}]);
  }
  if(!legacy){
    for(let i=4;i<towns.length;i++){
      const t=towns[i],cols=t.blocks,w=cols*config.blockWidth;
      const endpoint={x:t.x+w*.5*Math.cos(t.angle),z:t.z-w*.5*Math.sin(t.angle)};
      if(generationVersion>=15){
        // Use the settlement's real spine anchor and the nearest dry main-road projection.
        // The former outer-map L bend produced kilometre-long rectangular detours.
        const spineX=-cols*config.blockWidth/2+Math.ceil(cols/2)*config.blockWidth;
        const anchor={x:t.x+spineX*Math.cos(t.angle),z:t.z-spineX*Math.sin(t.angle)};
        const choices=features.filter(f=>f.kind==="road").map(f=>{
          const a=f.rotation??0,u=Math.max(-f.depth/2,Math.min(f.depth/2,(anchor.x-f.x)*Math.sin(a)+(anchor.z-f.z)*Math.cos(a)));
          const point={x:f.x+Math.sin(a)*u,z:f.z+Math.cos(a)*u};return {point,d:distance(anchor,point)};
        }).sort((a,b)=>a.d-b.d);
        const connection=choices.find(({point,d})=>{const steps=Math.max(1,Math.ceil(d/5));for(let j=0;j<=steps;j++)if(blocked({x:anchor.x+(point.x-anchor.x)*j/steps,z:anchor.z+(point.z-anchor.z)*j/steps},3,["water"]))return false;return true;});
        if(connection)corridor(`regional-link-${i}`,[anchor,connection.point],5.5);
        continue;
      }
      // Connect at a ward boundary; a central spur would erase the small lots.
      const target={x:Math.sign(t.x)*size*.35,z:bridges.reduce((a,b)=>Math.abs(a.z-t.z)<Math.abs(b.z-t.z)?a:b).z};
      corridor(`regional-link-${i}`,[endpoint,{x:target.x,z:endpoint.z},target],5.5);
    }
  }
  if(generationVersion>=15)for(const [team,b] of bases.entries()){const sign=team===0?1:-1,a=team===0?Math.PI*.75:-Math.PI/4,mid=(battleScale.generationAirfield.runwayStart+battleScale.generationAirfield.runwayEnd)/2;features.push({id:`base-airfield-yard-${team}`,kind:"cover",appearance:"yard",x:b.x+battleScale.readyAirfield.x*sign+Math.sin(a)*mid,z:b.z+battleScale.readyAirfield.z*sign+Math.cos(a)*mid,width:battleScale.generationAirfield.runwayWidth+20,depth:battleScale.generationAirfield.runwayEnd-battleScale.generationAirfield.runwayStart+20,rotation:a,blocksMovement:false,color:0x899582});}
  // V6 settlement streets are organic connected loops; old layouts remain byte-for-byte reconstructible.
  // Compact lots follow streets. A town transform rotates its whole ward, never individual random houses.
  for(let ti=0;ti<towns.length;ti++){
    const style=regional?profile.styles[ti%profile.styles.length] as MapFeatureDef["buildingStyle"]:undefined;
    if(landscape&&generationVersion>=7){features.push(...buildVariedSettlement(ti,towns[ti],rng,features,archetype==="forest",generationVersion>=8));continue;}
    if(landscape){
      features.push(...buildOrganicTown(ti,towns[ti],style,profile.height,profile.houseChance,rng,features));continue;
    }
    const town=towns[ti],cols=archetype==="urban"&&ti<2?4:town.blocks,rows=town.blocks,w=cols*config.blockWidth,d=rows*config.blockDepth;
    const transform=(x:number,z:number):Point=>({x:town.x+x*Math.cos(town.angle)+z*Math.sin(town.angle),z:town.z-x*Math.sin(town.angle)+z*Math.cos(town.angle)});
    for(let x=0;x<=cols;x++)road(`town-${ti}-street-x-${x}`,transform(-w/2+x*config.blockWidth,-d/2),transform(-w/2+x*config.blockWidth,d/2),config.streetWidth,"street");
    for(let z=0;z<=rows;z++)road(`town-${ti}-street-z-${z}`,transform(-w/2,-d/2+z*config.blockDepth),transform(w/2,-d/2+z*config.blockDepth),config.streetWidth,"street");
    // Ward perimeter joins the existing through-road with an accessible central connector.
    road(`town-${ti}-access`,town,transform(w/2,0),config.streetWidth,"street");
    let house=0;
    for(let bx=0;bx<cols;bx++)for(let bz=0;bz<rows;bz++){
      const cx=-w/2+(bx+.5)*config.blockWidth,cz=-d/2+(bz+.5)*config.blockDepth;
      for(const side of [-1,1])for(let lot=0;lot<4;lot++){
        if(rng.next()<(regional?1-profile.houseChance:.08))continue;
        const p=transform(cx+(lot-1.5)*9.1,cz+side*9),width=random(...config.houseWidth as [number,number]),depth=random(...config.houseDepth as [number,number]);
        if(blocked(p,Math.max(width,depth)/2+1,["road","building","water"])||bases.some(b=>distance(p,b)<b.r+35))continue;
        const id=`town-${ti}-house-${house++}`;
        features.push({id,kind:"building",appearance:"farmhouse",...p,width,depth,height:regional?random(profile.height[0],profile.height[1]):rng.next()<.18?6.1:random(3.9,4.8),...(regional?{buildingStyle:style}:{}),color:[0x985f4c,0x8a5949,0x626b6f][house%3],rotation:town.angle+(side<0?Math.PI:0),garrisonCapacity:1,label:"Linnaelamu"});
        features.push({id:`garden-${id}`,kind:"cover",appearance:"yard",...p,width:9,depth:13,rotation:town.angle,color:0x919981,blocksMovement:false});
      }
    }
  }
  if(!legacy){
    // Small lakes occupy unbuilt meadow pockets: real water/nav masks, never cosmetic blue decals.
    if(generationVersion>=15&&(options?.lakes??true))addInteriorLakes(size,rng,features,[...bases.map(b=>({...b,r:b.r+180})),...towns.map(t=>({...t,r:t.blocks*25})),...([{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},volcanic?{x:size*.09,z:size*.13}:{x:-110,z:40},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29},{x:size*.13,z:-size*.08},{x:-size*.13,z:size*.08},{x:-size*.25,z:-size*.39},{x:size*.25,z:size*.39}].map(p=>({...p,r:75})))],generationVersion>=16);
    for(let i=0;i<(generationVersion<15?3:0);i++){
      const p={x:random(-half+140,half-140),z:random(-half+140,half-140)};
      if(blocked(p,85,["road","building","water"])||bases.some(b=>distance(p,b)<b.r+110))continue;
      const points=Array.from({length:32},(_,j)=>{const a=j*Math.PI/16,r=1+.08*Math.sin(a*3+i);return {x:p.x+Math.cos(a)*48*r,z:p.z+Math.sin(a)*32*r};});
      features.push({...polygonFeature(`pond-${i}`,points,"field"),kind:"water",appearance:undefined,waterBody:"lake",surfaceHeight:-.8,blocksMovement:true,label:"Metsajärv"});
    }
    // Small farm clusters occupy meadow pockets and are connected before parcel cover is painted.
    for(let i=0;i<12;i++){
      const p={x:random(-half+120,half-120),z:random(-half+120,half-120)};
      if(blocked(p,32,["building","water","road"])||bases.some(b=>distance(p,b)<b.r+90)||towns.some(t=>distance(p,t)<110))continue;
      const nearest=features.filter(f=>f.kind==="road").reduce((a,b)=>distance(a,p)<distance(b,p)?a:b);
      const angle=nearest.rotation??0,t=Math.max(-nearest.depth/2,Math.min(nearest.depth/2,(p.x-nearest.x)*Math.sin(angle)+(p.z-nearest.z)*Math.cos(angle)));
      const q={x:nearest.x+Math.sin(angle)*t,z:nearest.z+Math.cos(angle)*t};
      // Never carve new tracks through an existing village or water. Sample the full access.
      if(Array.from({length:Math.ceil(distance(p,q)/5)+1},(_,j)=>{const k=j/Math.ceil(distance(p,q)/5);return {x:p.x+(q.x-p.x)*k,z:p.z+(q.z-p.z)*k};}).some(a=>blocked(a,3)))continue;
      road(`farm-track-${i}`,p,q,3.8,"track");
      for(let j=0;j<3;j++){
        const h={x:p.x+(j-1)*13,z:p.z+15};if(blocked(h,7,["building","water","road"]))continue;
        features.push({id:`farm-${i}-${j}`,kind:"building",appearance:"farmhouse",...h,width:7,depth:8,height:4.1,color:0x8a5949,garrisonCapacity:1,label:j===0?"Talumaja":"Taluhoone"});
        features.push({id:`farm-yard-${i}-${j}`,kind:"cover",appearance:"yard",...h,width:11,depth:12,color:0x919981,blocksMovement:false});
      }
    }
  }
  if(!legacy&&generationVersion>=7)features.push(...buildIndustrialClusters(size,rng,features,[...bases,...towns.map(t=>({...t,r:t.blocks*40+30}))]));
  if(generationVersion>=10&&generationVersion<15)for(const [team,b] of bases.entries()){const sign=team===0?1:-1,a=team===0?Math.PI*.75:-Math.PI/4,mid=(battleScale.generationAirfield.runwayStart+battleScale.generationAirfield.runwayEnd)/2;features.push({id:`base-airfield-yard-${team}`,kind:"cover",appearance:"yard",x:b.x+battleScale.readyAirfield.x*sign+Math.sin(a)*mid,z:b.z+battleScale.readyAirfield.z*sign+Math.cos(a)*mid,width:battleScale.generationAirfield.runwayWidth+20,depth:battleScale.generationAirfield.runwayEnd-battleScale.generationAirfield.runwayStart+20,rotation:a,blocksMovement:false,color:0x899582});}
  const landscapeForms=landscape?buildMountainRanges(size,archetype,rng,features,[...bases.map(b=>({...b,r:b.r+55})),...towns.map(t=>({...t,r:110})),
    ...[{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29}].map(p=>({...p,r:75}))]):[];
  if(generationVersion>=10)landscapeForms.push(...naturalHills(size,archetype,rng,features,[...bases.map(b=>({...b,r:320})),...towns.map(t=>({...t,r:140})),...[{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},{x:-110,z:40},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29},{x:size*.13,z:-size*.08},{x:-size*.13,z:size*.08},{x:-size*.25,z:-size*.39},{x:size*.25,z:size*.39}].map(p=>({...p,r:100}))]));
  if(generationVersion>=12)landscapeForms.push(...interiorRidges(size,rng,features,[...bases.map(b=>({...b,r:320})),...[{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},{x:-110,z:40},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29},{x:size*.13,z:-size*.08},{x:-size*.13,z:size*.08},{x:-size*.25,z:-size*.39},{x:size*.25,z:size*.39}].map(p=>({...p,r:100}))],landscapeForms));
  if(volcanic){
    // A compact extinct caldera with an open crater floor. Existing compact ridge
    // kernels give a connected rim without adding a renderer mesh or new save format.
    const clear=size*cfg.volcanoClearRadiusRatio;
    for(let i=landscapeForms.length-1;i>=0;i--)if(Math.hypot(landscapeForms[i].x,landscapeForms[i].z)<clear+Math.max(landscapeForms[i].width,landscapeForms[i].depth))landscapeForms.splice(i,1);
    for(let i=0;i<cfg.volcanoPeaks;i++){
      const a=i*Math.PI*2/cfg.volcanoPeaks;
      landscapeForms.push({x:Math.cos(a)*size*cfg.volcanoRadiusRatio,z:Math.sin(a)*size*cfg.volcanoRadiusRatio,width:size*cfg.volcanoWidthRatio,depth:size*cfg.volcanoDepthRatio,height:cfg.volcanoHeight*(1+.12*Math.sin(a*3+phase)),rotation:-a+Math.PI/2,shape:"ridge"});
    }
  }
  // Jittered Voronoi parcels create connected land use, rather than floating rectangular stamps.
  const sites:Point[]=[],step=legacy?config.parcelSpacing:(landscape?config.landUse.parcelSpacing:config.regionalParcelSpacing)*Math.pow(size/config.defaultSize,generationVersion>=10?config.naturalLandscape.parcelScaleExponent:1);
  for(let z=-half+step*.55;z<half-30;z+=step)for(let x=-half+step*.55;x<half-30;x+=step)sites.push({x:x+random(-step*.22,step*.22),z:z+random(-step*.22,step*.22)});
  const parcelMasks=landscape?features.filter(f=>f.kind==="water"||f.kind==="road"&&f.roadClass!=="street"||generationVersion>=10&&f.appearance==="yard").map(f=>convexHull(featureCorners({...f,width:f.width+8,depth:f.depth+4}))):[];
  if(generationVersion>=10)for(const b of bases)parcelMasks.push(Array.from({length:16},(_,i)=>({x:b.x+Math.cos(i*Math.PI/8)*100,z:b.z+Math.sin(i*Math.PI/8)*100})));
  const forestCenters=[{x:-size*.27,z:-size*.32},{x:size*.27,z:size*.32},{x:-size*.08,z:size*.3}];
  for(let i=0;i<sites.length;i++){
    const s=sites[i];if(bases.some(b=>distance(s,b)<b.r+80)||towns.some(t=>distance(s,t)<(t.blocks>2?115:85)))continue;
    let poly:Point[]=[{x:-half+10,z:-half+10},{x:half-10,z:-half+10},{x:half-10,z:half-10},{x:-half+10,z:half-10}];
    for(let j=0;j<sites.length&&poly.length;j++)if(i!==j){const t=sites[j];poly=clip(poly,t.x-s.x,t.z-s.z,(t.x*t.x+t.z*t.z-s.x*s.x-s.z*s.z)/2);}
    if(poly.length<3)continue;
    // Leave a meadow/riverbank buffer, and never paint cropland across a lake or city.
    const probes=[s,...poly,...poly.map((p,j)=>({x:(p.x+poly[(j+1)%poly.length].x)/2,z:(p.z+poly[(j+1)%poly.length].z)/2}))];
    if(!landscape&&probes.some(p=>blocked(p,8,["water"])||towns.some(t=>distance(p,t)<(t.blocks>2?90:58))))continue;
    const woods=italian ? (!volcanic||Math.hypot(s.x,s.z)>size*cfg.volcanoClearRadiusRatio)&&ridgeReliefAt(s,landscapeForms)<cfg.forestElevationLimit&&(naturalWoodlandAt(s.x,s.z,seed,archetype,13)||forestCenters.some(c=>distance(s,c)<size*cfg.forestCenterRatio)) : (landscape&&probes.some(p=>ridgeReliefAt(p,landscapeForms)>config.landUse.mountainForestHeight))||forestCenters.some(c=>distance(s,c)<(legacy?(archetype==="forest"?205:145):size*(archetype==="forest"?.15:.10)))||(generationVersion>=11?naturalWoodlandAt(s.x,s.z,seed,archetype,generationVersion):rng.next()<(archetype==="forest"?.28:.13));
    if(landscape){
      let pieces=[poly];
      for(const corners of parcelMasks){
        const mx=Math.min(...corners.map(p=>p.x)),mz=Math.min(...corners.map(p=>p.z)),hx=Math.max(...corners.map(p=>p.x)),hz=Math.max(...corners.map(p=>p.z));
        pieces=pieces.flatMap(piece=>{
          const px=Math.min(...piece.map(p=>p.x)),pz=Math.min(...piece.map(p=>p.z)),qx=Math.max(...piece.map(p=>p.x)),qz=Math.max(...piece.map(p=>p.z));
          return px<=hx&&qx>=mx&&pz<=hz&&qz>=mz?subtractParcel(piece,corners):[piece];
        });
        if(pieces.length>config.landUse.maxParcelPieces){pieces.sort((a,b)=>parcelArea(b)-parcelArea(a));pieces.length=config.landUse.maxParcelPieces;}
      }
      pieces.sort((a,b)=>parcelArea(b)-parcelArea(a));
      for(let j=0;j<pieces.length;j++){
        const piece=pieces[j],area=parcelArea(piece),perimeter=piece.reduce((sum,p,k)=>sum+distance(p,piece[(k+1)%piece.length]),0);
        if(area<config.landUse.minimumArea||area/(perimeter*perimeter)<config.landUse.minimumCompactness)continue;
        const f=polygonFeature(`parcel-${i}-${j}`,generationVersion>=10&&generationVersion<12&&woods?naturalForestEdge(piece,rng):piece,woods?"forest":"field",(italian?cfg.cropColors:config.cropColors)[i%(italian?cfg.cropColors:config.cropColors).length]);
        if(woods){f.height=8;f.density=generationVersion>=10?random(...config.naturalLandscape.forestDensity as [number,number]):random(.7,.9);}
        else {const nearest=features.filter(r=>r.kind==="road"&&r.roadClass!=="street").reduce((a,b)=>distance(a,s)<distance(b,s)?a:b);f.cropRotation=(nearest.rotation??0)+Math.PI/2;}
        features.push(f);
        if(!woods&&j===0&&rng.next()<config.landUse.hedgeChance){
          let edge=0;for(let k=1;k<piece.length;k++)if(distance(piece[k],piece[(k+1)%piece.length])>distance(piece[edge],piece[(edge+1)%piece.length]))edge=k;
          const a=piece[edge],b=piece[(edge+1)%piece.length];
          if(distance(a,b)<config.landUse.hedgeMinimumLength||[.15,.5,.85].some(t=>blocked({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},6,["water","road","building"])))continue;
          features.push({id:`hedge-${i}-${j}`,kind:"cover",appearance:"forest",shape:"ellipse",x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:4,depth:distance(a,b)*.8,rotation:Math.atan2(b.x-a.x,b.z-a.z),height:3.4,density:.65,blocksMovement:false,label:"Põlluhekk"});
        }
      }
      continue;
    }
    const f=polygonFeature(`parcel-${i}`,poly,woods?"forest":"field",(italian?cfg.cropColors:config.cropColors)[i%(italian?cfg.cropColors:config.cropColors).length]);
    if(woods){f.height=8;f.density=generationVersion>=10?random(...config.naturalLandscape.forestDensity as [number,number]):random(.7,.9);}features.push(f);
    if(!woods&&rng.next()<.42){
      const a=poly[0],b=poly[1];features.push({id:`hedge-${i}`,kind:"cover",appearance:"forest",shape:"ellipse",x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:5,depth:distance(a,b)*.82,rotation:Math.atan2(b.x-a.x,b.z-a.z),height:3.4,density:.7,blocksMovement:false,label:"Põlluhekk"});
    }
  }
  const accessBlockers=regional?new MapFeatureIndex(features.filter(f=>f.kind==="building"||f.kind==="water"),64,4):undefined;
  const resources:MapResourceDef[]=[];
  const desired=[{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},volcanic?{x:size*.09,z:size*.13}:{x:-110,z:40},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29}];
  if(!legacy)desired.push({x:size*.13,z:-size*.08},{x:-size*.13,z:size*.08},{x:-size*.25,z:-size*.39},{x:size*.25,z:size*.39});
  if(generationVersion>=16)desired[2]={x:0,z:0};
  const paired=new Map([[0,1],[3,4],[5,6],[7,8]]);
  for(let i=0;i<desired.length;i++){
    const previous=generationVersion>=16?[...paired].find(([,b])=>b===i)?.[0]:undefined;
    if(previous!=null)desired[i]={x:-resources[previous].x,z:-resources[previous].z};
    let chosen:Point|undefined,offset:Point|undefined;
    for(let radius=0;radius<=96&&!chosen;radius+=16)for(let n=0;n<16&&!chosen;n++){
      const p={x:desired[i].x+Math.sin(n*Math.PI/8)*radius,z:desired[i].z+Math.cos(n*Math.PI/8)*radius};
      if((landscape&&ridgeReliefAt(p,landscapeForms)>2)||blocked(p,6)||bases.some(b=>distance(p,b)<b.r+100))continue;
      if(generationVersion>=16&&paired.has(i)){
        const mirror={x:-p.x,z:-p.z};
        if(blocked(mirror,6)||(landscape&&ridgeReliefAt(mirror,landscapeForms)>2)||bases.some(b=>distance(mirror,b)<b.r+100))continue;
      }
      if(previous!=null&&radius>0)continue;
      for(const off of [{x:22,z:18},{x:-22,z:-18},{x:22,z:-18},{x:-22,z:18},{x:0,z:26}]){
        if(blocked({x:p.x+off.x,z:p.z+off.z},9,["building","road","water"])||generationVersion>=16&&paired.has(i)&&blocked({x:-p.x-off.x,z:-p.z-off.z},9,["building","road","water"]))continue;chosen=p;offset=off;break;
      }
    }
    if(!chosen||!offset)throw new Error("Kaardigeneraator ei leidnud turvalist ressursikohta");
    resources.push({...chosen,amount:generationVersion>=16?config.mapRefinement.initialFactoryStock:legacy?config.resourceStock:config.regionalResourceStock,maxStock:legacy?config.resourceStock:config.regionalResourceStock,radius:config.resourceRadius,controlledBy:null,controlProgress:.5,facility:(generationVersion>=16?["depot","depot","factory","oilfield","oilfield","factory","factory","mine","mine"]:["depot","depot","factory","mine","oilfield","factory","factory","oilfield","mine"])[i] as MapResourceDef["facility"],level:1,active:false,startupProgress:0,productionRate:0,disabledUntil:0,facilityOffset:offset,label:i<2?"Kodupiirkonna ladu":i===2||i===5||i===6?"Rinde tööstus":i>=7?"Tagala tööstus":"Tööstusala"});
    if(generationVersion>=16){const names={depot:"Varustustehas",oilfield:"Naftatöötlemistehas",factory:"Masinatehas",mine:"Rikastustehas"};resources[i].label=names[resources[i].facility!];}
    const facility={x:chosen.x+offset.x,z:chosen.z+offset.z};features.push({id:`resource-yard-${i}`,kind:"cover",appearance:"yard",...facility,width:32,depth:26,color:0x8d9085,blocksMovement:false});
    let closest:Point|undefined,best=Infinity;
    for(const r of features.filter(f=>f.kind==="road")){
      const a=r.rotation??0,t=Math.max(-r.depth/2,Math.min(r.depth/2,(chosen.x-r.x)*Math.sin(a)+(chosen.z-r.z)*Math.cos(a))),q={x:r.x+Math.sin(a)*t,z:r.z+Math.cos(a)*t};
      const length=distance(chosen,q);if(length>=best)continue;
      if(regional){
        const steps=Math.max(1,Math.ceil(length/4));let obstructed=false;
        for(let j=0;j<=steps&&!obstructed;j++){const t=j/steps;const x=chosen.x+(q.x-chosen.x)*t,z=chosen.z+(q.z-chosen.z)*t;obstructed=accessBlockers!.at(x,z).some(f=>pointInFeature(x,z,f,3.5));}
        if(obstructed)continue;
      }
      best=length;closest=q;
    }
    if(closest){
      road(`resource-access-${i}`,chosen,closest,4.5,"track");
      // Access is authored after the wards; it must not run through the physical warehouse.
      const safe=[offset,{x:-22,z:-18},{x:22,z:-18},{x:-22,z:18},{x:0,z:26},{x:0,z:-26},{x:26,z:0},{x:-26,z:0}].find(off=>!blocked({x:chosen!.x+off.x,z:chosen!.z+off.z},9,["building","road","water"]));
      if(!safe)throw new Error("Ressursilao juurdepääs blokeerib rajatise");
      resources[i].facilityOffset=safe;const yard=features.find(f=>f.id===`resource-yard-${i}`)!;yard.x=chosen.x+safe.x;yard.z=chosen.z+safe.z;
    }
  }
  const landforms:NonNullable<MissionDef["map"]["landforms"]>=forestCenters.slice(0,2).map(p=>({...p,width:180,depth:145,height:archetype==="highlands"?28:random(12,20)}));
  if(!legacy){
    // Height and woods share regional centers, creating defensible ridges with concealed approaches.
    for(const t of towns.slice(4,6))landforms.push({x:t.x+Math.sign(t.x)*80,z:t.z,width:150,depth:110,height:archetype==="highlands"?24:11});
  }
  if(regional){
    landforms.length=0;
    for(let i=0;i<profile.hills;i++){
      const side=i%2===0?-1:1,width=random(profile.hillWidth[0],profile.hillWidth[1]);
      landforms.push({x:side*size*random(.20,.37),z:size*random(-.34,.34),width,depth:width*random(.65,.92),height:random(profile.hillHeight[0],profile.hillHeight[1])});
    }
  }
  if(generationVersion===5&&!legacy&&archetype==="highlands"){
    landforms.length=0;const relief=config.ridgeRelief;
    for(let i=0;i<relief.count;i++)for(let attempt=0;attempt<48;attempt++){
      const width=random(relief.width[0],relief.width[1]),depth=random(relief.depth[0],relief.depth[1]);
      const p={x:(i%2?-1:1)*size*random(.16,.37),z:size*random(-.35,.35)};
      if(resources.some(r=>distance(p,r)<width+relief.clearance)||bases.some(b=>distance(p,b)<width+b.r)||towns.some(t=>distance(p,t)<width+65)||landforms.some(f=>distance(p,f)<width+f.width*.6))continue;
      landforms.push({...p,width,depth,height:random(relief.height[0],relief.height[1]),shape:"ridge",rotation:random(-Math.PI,Math.PI)});break;
    }
  }
  if(landscape){landforms.length=0;landforms.push(...landscapeForms);}
  if(options&&!options.mountains)landforms.length=0;
  if(options&&!options.forest)for(let i=features.length-1;i>=0;i--)if(features[i].appearance==="forest")features.splice(i,1);
  if(italian)for(const f of features)if(f.kind==="building"&&f.appearance==="farmhouse"){f.color=cfg.roofColors[(f.id.length+Math.round(Math.abs(f.x)))%cfg.roofColors.length];if(f.buildingStyle!=="industrial"&&f.buildingStyle!=="warehouse")f.facadeColor=0xc9bea2;}
  if(volcanic){
    const ground=polygonFeature("caldera-ground",Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,r=size*.069*(1+.04*Math.sin(a*5+phase));return {x:Math.cos(a)*r,z:Math.sin(a)*r};}),"field",0x82796c);
    ground.cropPattern="bare";ground.label="Kustunud vulkaani kivine kraater";features.push(ground);
  }
  if(generationVersion>=14)enrichItalianLandscape(seed,features,[...bases,...resources]);
  if(generationVersion>=15)refineRoadConnections(features);
  // Canonical millimetre coordinates keep generated map hashes stable across clients.
  const quantize=(n:number)=>Math.round(n*1000)/1000;
  for(const f of features){for(const key of ["x","z","width","depth","height"] as const)if(f[key]!=null)f[key]=quantize(f[key]!);if(f.rotation!=null)f.rotation=Math.round(f.rotation*1e6)/1e6;if(f.polygon)f.polygon=f.polygon.map(p=>({x:quantize(p.x),z:quantize(p.z)}));}
  for(const b of bases){b.x=quantize(b.x);b.z=quantize(b.z);}
  for(const r of resources){r.x=quantize(r.x);r.z=quantize(r.z);}
  for(const f of landforms){f.x=quantize(f.x);f.z=quantize(f.z);f.height=quantize(f.height);}
  const names:Record<MapArchetype,string>={balanced:"Järvemaa",river:"Jõeäär",highlands:"Kõrgustik",urban:"Linnapiirkond",coastal:"Rannikupiirkond",forest:"Metsapiirkond"};
  const id=legacy?`procedural-v${config.version}-${archetype}-${seed}`:`procedural-v${generationVersion}-${archetype}-${size}-${seed}${options?`-o${mapOptionsMask(options)}`:""}`,name=`${italian?(volcanic?"Vulkaani org":"Vahemere "+names[archetype].toLowerCase()):names[archetype]} · ${seed}`;
  return {id,name,seed,objectives:[],briefing:italian?"Vahemere lahingumaastik: terrakotakatustega asulad, avatud põllud, metsasalud ja kivised kõrgendikud. Viinamarjaistandused, oliivi- ja tsitrusesalud, küpressialleed ning talukohad vahelduvad põldude ja kiviste kõrgendikega. Mõnel seemnel kerkib keskel kustunud vulkaani kraater. Tellimiseks vali tootmishoone; kaitse varustuslende.":landscape?"Genereeritud lahingumaastik: looklevate tänavatega asulad, seotud mäeharjad, põllud ja metsaalad. Kolm jõesilda ühendavad lahingupiirkondi. Kindlusta asulad, kasuta orgusid ja varjatud lähenemisi ning kaitse ressursivedusid.":"Genereeritud lahingumaastik: tihedad majakvartalid, talud, kolm sillaületust, järv ja põllu-/metsavööndid. Kindlusta asulad, kasuta varjatud lähenemisi ning kaitse füüsilisi ressursivedusid.",map:{id,name,size,theme:"temperate",terrainProfile:generationVersion>=10?"farmland-natural":"farmland",landforms,baseDefenses:false,heightmap:"",maxHeight:italian?120:40,bases,resources,features}};
}

export const FOCUS_MAP=greenValley as unknown as MissionDef;
export const CURATED_MAPS:readonly MissionDef[]=[];
export function getPlayableMap(id:string):MissionDef|undefined {
  const biome=/^procedural-v17-(balanced|river|highlands|urban|coastal|forest)-(2048|2560|3072|4096|5120|6144)-(0|[1-9]\d*)(?:-o(0|[1-9]\d*))?$/.exec(id);
  if(biome){const mask=Number(biome[4]??14);if(Number(biome[3])>4294967295||mask>127)return undefined;const m=generateRegionalMap(Number(biome[3]),biome[1] as MapArchetype,Number(biome[2]),biome[4]!=null?decodeMapOptions(mask):undefined);return biome[4]!=null?m:{...m,id,map:{...m.map,id}};}

  const custom=/^(procedural-v(?:13|14|15|16)-(?:balanced|river|highlands|urban|coastal|forest)-(?:2048|2560|3072|4096|5120|6144)-(\d+))-o(\d+)$/.exec(id);
  if(custom){const mask=Number(custom[3]);if(mask>(/^procedural-v(?:15|16)-/.test(custom[1])?31:15)||String(mask)!==custom[3]||Number(custom[2])>4294967295)return undefined;const parts=custom[1].split('-');return generateProceduralMap(Number(custom[2]),parts[2] as MapArchetype,Number(parts[3]),Number(parts[1].slice(1)) as 13|14|15|16,decodeMapOptions(mask));}
  const current=/^procedural-v(11|12|13|14|15|16)-(balanced|river|highlands|urban|coastal|forest)-(2048|2560|3072|4096|5120|6144)-(\d+)$/.exec(id);
  if(current)return Number(current[4])<=4294967295?generateProceduralMap(Number(current[4]),current[2] as MapArchetype,Number(current[3]),Number(current[1]) as 11|12|13|14|15|16):undefined;
  const metric=/^procedural-v(9|10)-(balanced|river|highlands|urban|coastal|forest)-(4096|6144)-(\d+)$/.exec(id);
  if(metric)return Number(metric[4])<=4294967295?generateProceduralMap(Number(metric[4]),metric[2] as MapArchetype,Number(metric[3]),Number(metric[1]) as 9|10):undefined;
  const regional=/^procedural-v(3|4|5|6|7|8)-(balanced|river|highlands|urban|coastal|forest)-(1536|1792|2048)-(\d+)$/.exec(id);
  if(regional)return Number(regional[4])<=4294967295?generateProceduralMap(Number(regional[4]),regional[2] as MapArchetype,Number(regional[3]),Number(regional[1]) as 3|4|5|6|7|8):undefined;
  const match=/^procedural-(?:v2-)?(balanced|river|highlands|urban|coastal|forest)-(\d+)$/.exec(id);
  if(!match||Number(match[2])>4294967295)return undefined;
  const map=generateProceduralMap(Number(match[2]),match[1] as MapArchetype,config.size);
  return id.startsWith("procedural-v2-")?map:{...map,id,map:{...map.map,id}};
}

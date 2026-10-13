import type {MissionDef,MapResourceDef,Point} from "./types";
import {pointInFeature,type MapFeatureDef} from "./mapFeatures";
import {Rng} from "./rng";
import config from "../data/map-generation.json";
import greenValley from "../data/maps/green-valley.json";

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

export function generateProceduralMap(inputSeed:number,archetype:MapArchetype="balanced"):MissionDef {
  const seed=inputSeed>>>0,rng=new Rng(seed),size=config.size,half=size/2,features:MapFeatureDef[]=[];
  const random=(lo:number,hi:number)=>lo+rng.next()*(hi-lo);
  const baseX=size*random(.36,.40),baseZ=size*random(.33,.37);
  const bases:MissionDef["map"]["bases"]=[{x:-baseX,z:baseZ,r:config.baseRadius},{x:baseX,z:-baseZ,r:config.baseRadius}];
  const towns=[{x:-size*random(.185,.24),z:-size*random(.12,.18),angle:random(-.25,.25),blocks:3},{x:size*random(.185,.24),z:size*random(.12,.18),angle:random(-.25,.25),blocks:3},
    {x:-size*random(.27,.30),z:size*random(.245,.275),angle:random(-.4,.4),blocks:2},{x:size*random(.27,.30),z:-size*random(.245,.275),angle:random(-.4,.4),blocks:2}];
  const phase=random(-.3,.3),amplitude=random(38,70);
  const riverX=(z:number)=>Math.sin(z/size*Math.PI*2+phase)*amplitude+Math.sin(z/size*Math.PI*5)*13;
  const blocked=(p:Point,r:number,kinds:readonly string[]=["building","water"])=>features.some(f=>kinds.includes(f.kind)&&pointInFeature(p.x,p.z,f,r));
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
  for(let i=0;i<config.riverSteps;i++){
    const za=-half-16+i*(size+32)/config.riverSteps,zb=-half-16+(i+1)*(size+32)/config.riverSteps,a={x:riverX(za),z:za},b={x:riverX(zb),z:zb};
    features.push({id:`river-${i}`,kind:"water",waterBody:"river",x:(a.x+b.x)/2,z:(za+zb)/2,width:config.riverWidth,depth:distance(a,b)+2,rotation:Math.atan2(b.x-a.x,b.z-a.z),surfaceHeight:-.8,label:"Jõgi"});
  }
  const lakeCenter={x:175+random(-18,18),z:-size*.36},lakeWidth=archetype==="river"?130:220;
  const shore=Array.from({length:64},(_,i)=>{const a=i*Math.PI/32,r=1+.07*Math.sin(a*3+phase)+.025*Math.cos(a*5);return {x:lakeCenter.x+Math.cos(a)*lakeWidth*.5*r,z:lakeCenter.z+Math.sin(a)*72.5*r};});
  features.push({...polygonFeature("lake",shore,"field"),kind:"water",appearance:undefined,waterBody:"lake",surfaceHeight:-.8,blocksMovement:true,label:"Järv"});
  if(archetype==="coastal")features.push({id:"sea",kind:"water",waterBody:"sea",x:0,z:-half+38,width:size,depth:76,surfaceHeight:-.8,label:"Meri"});
  const crossingZ=[-size*random(.22,.26),random(-20,20),size*random(.22,.26)],bridges:MapFeatureDef[]=[];
  for(let i=0;i<crossingZ.length;i++){
    const z=crossingZ[i],b:MapFeatureDef={id:`bridge-${i}`,kind:"bridge",x:riverX(z),z,width:10,depth:56,rotation:Math.PI/2,surfaceHeight:1.4,label:"Jõesild"};features.push(b);bridges.push(b);
  }
  const through=(town:typeof towns[number],sign:number):Point[]=>{
    const cols=archetype==="urban"&&town.blocks===3?4:town.blocks;
    const x=-cols*config.blockWidth/2+Math.ceil(cols/2)*config.blockWidth,z=town.blocks*config.blockDepth/2+35;
    return [sign,-sign].map(side=>({x:town.x+x*Math.cos(town.angle)+side*z*Math.sin(town.angle),z:town.z-x*Math.sin(town.angle)+side*z*Math.cos(town.angle)}));
  };
  corridor("west-spine",[bases[0],...through(towns[2],1),{x:towns[0].x+21,z:130},...through(towns[0],1),{x:-size*.29,z:-half+65}]);
  corridor("east-spine",[bases[1],...through(towns[3],-1),{x:towns[1].x+21,z:-130},...through(towns[1],-1),{x:size*.29,z:half-65}]);
  for(let i=0;i<bridges.length;i++){
    const b=bridges[i];corridor(`cross-west-${i}`,[{x:-size*.35,z:b.z},{x:b.x-b.depth/2,z:b.z}]);
    corridor(`cross-east-${i}`,[{x:b.x+b.depth/2,z:b.z},{x:size*.35,z:b.z}]);
  }
  // Compact lots follow streets. A town transform rotates its whole ward, never individual random houses.
  for(let ti=0;ti<towns.length;ti++){
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
        if(rng.next()<.08)continue;
        const p=transform(cx+(lot-1.5)*9.1,cz+side*9),width=random(...config.houseWidth as [number,number]),depth=random(...config.houseDepth as [number,number]);
        if(blocked(p,Math.max(width,depth)/2+1,["road","building","water"])||bases.some(b=>distance(p,b)<b.r+35))continue;
        const id=`town-${ti}-house-${house++}`;
        features.push({id,kind:"building",appearance:"farmhouse",...p,width,depth,height:rng.next()<.18?6.1:random(3.9,4.8),color:[0x985f4c,0x8a5949,0x626b6f][house%3],rotation:town.angle+(side<0?Math.PI:0),garrisonCapacity:1,label:"Linnaelamu"});
        features.push({id:`garden-${id}`,kind:"cover",appearance:"yard",...p,width:9,depth:13,rotation:town.angle,color:0x919981,blocksMovement:false});
      }
    }
  }
  // Jittered Voronoi parcels create connected land use, rather than floating rectangular stamps.
  const sites:Point[]=[],step=config.parcelSpacing;
  for(let z=-half+step*.55;z<half-30;z+=step)for(let x=-half+step*.55;x<half-30;x+=step)sites.push({x:x+random(-step*.22,step*.22),z:z+random(-step*.22,step*.22)});
  const forestCenters=[{x:-size*.27,z:-size*.32},{x:size*.27,z:size*.32},{x:-size*.08,z:size*.3}];
  for(let i=0;i<sites.length;i++){
    const s=sites[i];if(bases.some(b=>distance(s,b)<b.r+80)||towns.some(t=>distance(s,t)<(t.blocks>2?115:85)))continue;
    let poly:Point[]=[{x:-half+10,z:-half+10},{x:half-10,z:-half+10},{x:half-10,z:half-10},{x:-half+10,z:half-10}];
    for(let j=0;j<sites.length&&poly.length;j++)if(i!==j){const t=sites[j];poly=clip(poly,t.x-s.x,t.z-s.z,(t.x*t.x+t.z*t.z-s.x*s.x-s.z*s.z)/2);}
    if(poly.length<3)continue;
    // Leave a meadow/riverbank buffer, and never paint cropland across a lake or city.
    const probes=[s,...poly,...poly.map((p,j)=>({x:(p.x+poly[(j+1)%poly.length].x)/2,z:(p.z+poly[(j+1)%poly.length].z)/2}))];
    if(probes.some(p=>blocked(p,8,["water"])||towns.some(t=>distance(p,t)<(t.blocks>2?90:58))))continue;
    const woods=forestCenters.some(c=>distance(s,c)<(archetype==="forest"?205:145))||rng.next()<(archetype==="forest"?.28:.13);
    const f=polygonFeature(`parcel-${i}`,poly,woods?"forest":"field",config.cropColors[i%config.cropColors.length]);
    if(woods){f.height=8;f.density=random(.7,.9);}features.push(f);
    if(!woods&&rng.next()<.42){
      const a=poly[0],b=poly[1];features.push({id:`hedge-${i}`,kind:"cover",appearance:"forest",shape:"ellipse",x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:5,depth:distance(a,b)*.82,rotation:Math.atan2(b.x-a.x,b.z-a.z),height:3.4,density:.7,blocksMovement:false,label:"Põlluhekk"});
    }
  }
  const resources:MapResourceDef[]=[];
  const desired=[{x:-size*.31,z:size*.17},{x:size*.31,z:-size*.17},{x:-110,z:40},{x:-size*.29,z:-size*.29},{x:size*.29,z:size*.29}];
  for(let i=0;i<desired.length;i++){
    let chosen:Point|undefined,offset:Point|undefined;
    for(let radius=0;radius<=96&&!chosen;radius+=16)for(let n=0;n<16&&!chosen;n++){
      const p={x:desired[i].x+Math.sin(n*Math.PI/8)*radius,z:desired[i].z+Math.cos(n*Math.PI/8)*radius};
      if(blocked(p,6)||bases.some(b=>distance(p,b)<b.r+100))continue;
      for(const off of [{x:22,z:18},{x:-22,z:-18},{x:22,z:-18},{x:-22,z:18},{x:0,z:26}]){
        if(blocked({x:p.x+off.x,z:p.z+off.z},9,["building","road","water"]))continue;chosen=p;offset=off;break;
      }
    }
    if(!chosen||!offset)throw new Error("Kaardigeneraator ei leidnud turvalist ressursikohta");
    resources.push({...chosen,amount:config.resourceStock,maxStock:config.resourceStock,radius:config.resourceRadius,controlledBy:null,controlProgress:.5,facility:["depot","depot","factory","mine","oilfield"][i] as MapResourceDef["facility"],level:1,active:false,startupProgress:0,productionRate:0,disabledUntil:0,facilityOffset:offset,label:i<2?"Kodupiirkonna ladu":i===2?"Rinde tööstus":"Tööstusala"});
    const facility={x:chosen.x+offset.x,z:chosen.z+offset.z};features.push({id:`resource-yard-${i}`,kind:"cover",appearance:"yard",...facility,width:32,depth:26,color:0x8d9085,blocksMovement:false});
    let closest:Point|undefined,best=Infinity;
    for(const r of features.filter(f=>f.kind==="road")){
      const a=r.rotation??0,t=Math.max(-r.depth/2,Math.min(r.depth/2,(chosen.x-r.x)*Math.sin(a)+(chosen.z-r.z)*Math.cos(a))),q={x:r.x+Math.sin(a)*t,z:r.z+Math.cos(a)*t};
      if(distance(chosen,q)<best){best=distance(chosen,q);closest=q;}
    }
    if(closest){
      road(`resource-access-${i}`,chosen,closest,4.5,"track");
      // Access is authored after the wards; it must not run through the physical warehouse.
      const safe=[offset,{x:-22,z:-18},{x:22,z:-18},{x:-22,z:18},{x:0,z:26},{x:0,z:-26},{x:26,z:0},{x:-26,z:0}].find(off=>!blocked({x:chosen!.x+off.x,z:chosen!.z+off.z},9,["building","road","water"]));
      if(!safe)throw new Error("Ressursilao juurdepääs blokeerib rajatise");
      resources[i].facilityOffset=safe;const yard=features.find(f=>f.id===`resource-yard-${i}`)!;yard.x=chosen.x+safe.x;yard.z=chosen.z+safe.z;
    }
  }
  const landforms=forestCenters.slice(0,2).map(p=>({...p,width:180,depth:145,height:archetype==="highlands"?28:random(12,20)}));
  // Canonical millimetre coordinates keep generated map hashes stable across clients.
  const quantize=(n:number)=>Math.round(n*1000)/1000;
  for(const f of features){for(const key of ["x","z","width","depth","height"] as const)if(f[key]!=null)f[key]=quantize(f[key]!);if(f.rotation!=null)f.rotation=Math.round(f.rotation*1e6)/1e6;if(f.polygon)f.polygon=f.polygon.map(p=>({x:quantize(p.x),z:quantize(p.z)}));}
  for(const b of bases){b.x=quantize(b.x);b.z=quantize(b.z);}
  for(const r of resources){r.x=quantize(r.x);r.z=quantize(r.z);}
  for(const f of landforms){f.x=quantize(f.x);f.z=quantize(f.z);f.height=quantize(f.height);}
  const names:Record<MapArchetype,string>={balanced:"Järvemaa",river:"Jõeäär",highlands:"Kõrgustik",urban:"Linnapiirkond",coastal:"Rannikupiirkond",forest:"Metsapiirkond"};
  const id=`procedural-v${config.version}-${archetype}-${seed}`,name=`${names[archetype]} · ${seed}`;
  return {id,name,seed,objectives:[],briefing:"Genereeritud lahingumaastik: tihedad majakvartalid, kolm sillaületust, järv ja põllu-/metsavööndid. Kindlusta asulad, kasuta varjatud lähenemisi ning kaitse füüsilisi ressursivedusid.",map:{id,name,size,theme:"temperate",terrainProfile:"farmland",landforms,baseDefenses:false,heightmap:"",maxHeight:40,bases,resources,features}};
}

export const FOCUS_MAP=greenValley as unknown as MissionDef;
export const GENERATED_MAP=generateProceduralMap(62510,"balanced");
export const CURATED_MAPS:readonly MissionDef[]=[GENERATED_MAP,FOCUS_MAP];
export function getPlayableMap(id:string):MissionDef|undefined {
  const fixed=CURATED_MAPS.find(m=>m.id===id);if(fixed)return fixed;
  const match=/^procedural-(?:v2-)?(balanced|river|highlands|urban|coastal|forest)-(\d+)$/.exec(id);
  if(!match||Number(match[2])>4294967295)return undefined;
  const map=generateProceduralMap(Number(match[2]),match[1] as MapArchetype);
  return id.startsWith("procedural-v2-")?map:{...map,id,map:{...map.map,id}};
}

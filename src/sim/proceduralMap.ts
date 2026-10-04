import type { MissionDef, MapResourceDef } from "./types";
import type { MapFeatureDef } from "./mapFeatures";
import type { BaseDef } from "./heightmap";
import { Rng } from "./rng";

export type MapArchetype = "balanced" | "river" | "highlands" | "urban" | "coastal" | "forest";



function road(id:string,x:number,z:number,width:number,depth:number,rotation=0): MapFeatureDef { return {id,kind:"road",x,z,width,depth,rotation}; }
function bridge(id:string,x:number,z:number,width:number,depth:number,rotation=0): MapFeatureDef { return {id,kind:"bridge",x,z,width,depth,rotation}; }
function building(id:string,x:number,z:number,w:number,d:number,rotation=0,height=7): MapFeatureDef { return {id,kind:"building",x,z,width:w,depth:d,rotation,height}; }
function cover(id:string,x:number,z:number,w:number,d:number,h=1.5,rotation=0): MapFeatureDef { return {id,kind:"cover",x,z,width:w,depth:d,height:h,rotation}; }
function choke(id:string,x:number,z:number,w:number,d:number,rotation=0): MapFeatureDef { return {id,kind:"chokepoint",x,z,width:w,depth:d,rotation,height:3}; }
function water(id:string,x:number,z:number,w:number,d:number,rotation=0): MapFeatureDef { return {id,kind:"water",x,z,width:w,depth:d,rotation,blocksMovement:true}; }

function addForest(features:MapFeatureDef[], rng:Rng, cx:number,cz:number,count:number,spread:number, startId:number): number {
  let id=startId;
  for(let i=0;i<count;i++){
    const a=rng.next()*Math.PI*2, r=Math.sqrt(rng.next())*spread;
    const x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r;
    const w=5+rng.next()*8,d=5+rng.next()*8;
    features.push(cover(`tree-${id++}`,x,z,w,d,2.1+rng.next()*1.1,rng.next()*Math.PI));
  }
  return id;
}

function addCity(features:MapFeatureDef[], cx:number,cz:number, rows:number, cols:number, spacing:number, seed:number, idStart:number): number {
  let id=idStart; const rng=new Rng(seed);
  for(let z=0;z<rows;z++) for(let x=0;x<cols;x++){
    const ox=(x-(cols-1)/2)*spacing+(rng.next()-.5)*5;
    const oz=(z-(rows-1)/2)*spacing+(rng.next()-.5)*5;
    features.push(building(`bld-${id++}`,cx+ox,cz+oz,7+rng.next()*7,7+rng.next()*7,rng.next()<.5?0:Math.PI/2,6+rng.next()*8));
  }
  return id;
}

function resources(points:Array<[number,number]>, amount=1200): MapResourceDef[] {
  const kinds: MapResourceDef["facility"][] = ["mine", "factory", "oilfield", "depot", "factory"];
  return points.map(([x,z], i) => {
    const facility = kinds[i % kinds.length];
    const level = facility === "factory" ? 2 : facility === "oilfield" ? 1 : 1;
    const maxStock = facility === "depot" ? 2200 : facility === "factory" ? 1900 : facility === "oilfield" ? 1500 : 1700;
    return {x,z,amount:Math.min(amount,maxStock),radius:14,controlledBy:null,controlProgress:0,facility,level,active:false,startupProgress:0,maxStock,productionRate:0,disabledUntil:0};
  });
}

function common(id:string,name:string,theme:MissionDef["map"]["theme"],bases:[BaseDef,BaseDef],features:MapFeatureDef[],resources:MapResourceDef[],seed:number,briefing:string): MissionDef {
  return {id,name,briefing,seed,objectives:[],map:{id,name,theme,heightmap:"",maxHeight:72,resources,bases,features}};
}

export function generateProceduralMap(seed:number, archetype:MapArchetype="balanced"): MissionDef {
  const rng=new Rng(seed|0);
  const bases:[BaseDef,BaseDef]=[{x:-145,z:145,r:34},{x:145,z:-145,r:34}];
  const f:MapFeatureDef[]=[];
  let id=1;
  // Primary road network: three lanes with natural offsets.
  f.push(road(`main-${id++}`,0,0,15,330,Math.PI/4));
  f.push(road(`cross-${id++}`,0,0,13,300,-Math.PI/4));
  f.push(road(`north-${id++}`,-65,0,11,170,0));
  f.push(road(`south-${id++}`,65,0,11,170,Math.PI/2));

  if(archetype==="river" || archetype==="coastal"){
    // Broad diagonal water obstacle with three crossing points.
    const rot=archetype==="river"?Math.PI/4:0;
    for(let i=0;i<5;i++){
      const t=(i-2)/2;
      f.push(water(`water-${id++}`,t*70,-t*55,48,150,rot));
    }
    f.push(bridge(`bridge-a-${id++}`,-62,62,18,46,rot));
    f.push(bridge(`bridge-b-${id++}`,0,0,20,48,rot));
    f.push(bridge(`bridge-c-${id++}`,62,-62,18,46,rot));
  }
  if(archetype==="highlands"){
    for(let i=0;i<12;i++){
      const a=rng.next()*Math.PI*2,r=70+Math.sqrt(rng.next())*75;
      f.push(choke(`ridge-${id++}`,Math.cos(a)*r,Math.sin(a)*r,8+rng.next()*12,30+rng.next()*40,rng.next()*Math.PI));
    }
  }
  if(archetype==="urban"){
    id=addCity(f,-55,55,3,4,25,seed+11,id);
    id=addCity(f,55,-55,3,4,25,seed+29,id);
    f.push(choke(`city-choke-${id++}`,0,0,24,70,Math.PI/2));
    f.push(road(`city-avenue-${id++}`,0,0,20,240,0));
  }
  if(archetype==="forest" || archetype==="balanced"){
    id=addForest(f,rng,-65,-5,34,70,id);
    id=addForest(f,rng,65,5,34,70,id);
  }
  if(archetype==="coastal"){
    f.push(water(`sea-${id++}`,0,-185,400,45,0));
    f.push(road(`coast-road-${id++}`,0,-150,12,300,0));
  }
  // Tactical cover and minor villages around the central contest area.
  for(let i=0;i<18;i++){
    const a=rng.next()*Math.PI*2,r=25+Math.sqrt(rng.next())*95;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)>135&&Math.abs(z)>135) continue;
    f.push(cover(`cover-${id++}`,x,z,4+rng.next()*7,4+rng.next()*7,1.4+rng.next()*1.2,rng.next()*Math.PI));
  }
  const rp=resources([[-90,90],[0,0],[90,-90],[-15,-110],[110,15]], archetype==="urban"?1000:1200);
  const names:{[k in MapArchetype]:string}={balanced:"Frontier Balance",river:"Three Bridges",highlands:"Iron Highlands",urban:"Grey District",coastal:"Coastal Spearhead",forest:"Black Forest"};
  return common(`procedural-${archetype}-${Math.abs(seed)}`,names[archetype],archetype==="urban"?"city":archetype==="highlands"?"mountains":"desert",bases,f,rp,seed,`Procedural ${archetype} map. Deterministic seed ${seed}.`);
}

import greenValley from "../data/maps/green-valley.json";
export const FOCUS_MAP = greenValley as unknown as MissionDef;
export const CURATED_MAPS: readonly MissionDef[] = [
  FOCUS_MAP,
  generateProceduralMap(18031,"balanced"),
  generateProceduralMap(77124,"river"),
  generateProceduralMap(44017,"highlands"),
  generateProceduralMap(91266,"urban"),
  generateProceduralMap(31884,"coastal"),
  generateProceduralMap(65021,"forest"),
];

export function getPlayableMap(id:string): MissionDef | undefined {
  const fixed=CURATED_MAPS.find(m=>m.id===id); if(fixed) return fixed;
  const match=/^procedural-(balanced|river|highlands|urban|coastal|forest)-(-?\d+)$/.exec(id);
  return match ? generateProceduralMap(Number(match[2]),match[1] as MapArchetype) : undefined;
}

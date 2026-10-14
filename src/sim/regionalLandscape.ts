import config from '../data/map-generation.json';
import {Rng} from './rng';
import {featureCorners, pointInFeature, type MapFeatureDef} from './mapFeatures';
import type {Point, MissionDef} from './types';

export type Landform = NonNullable<MissionDef['map']['landforms']>[number];
type Town = Point & {angle:number;blocks:number};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Compact support shared by placement and the height field; overlapping peaks form a range. */
export function ridgeReliefAt(p:Point,forms:readonly Landform[]):number {
  let h=0;
  for(const f of forms){
    const a=f.rotation??0,dx=p.x-f.x,dz=p.z-f.z;
    const d=((dx*Math.cos(a)-dz*Math.sin(a))/f.width)**2+((dx*Math.sin(a)+dz*Math.cos(a))/f.depth)**2;
    if(d<1)h+=f.height*(1-d)**2;
  }
  return h;
}

/** Streets grow as loops and connecting lanes; every house fronts an actual road. */
export function buildOrganicTown(index:number,town:Town,style:MapFeatureDef['buildingStyle'],height:readonly number[],chance:number,rng:Rng,existing:readonly MapFeatureDef[]):MapFeatureDef[] {
  const cfg=config.organicSettlements,features:MapFeatureDef[]=[],streets:MapFeatureDef[]=[];
  const random=(a:number,b:number)=>a+(b-a)*rng.next();
  const transform=(x:number,z:number):Point=>({x:town.x+x*Math.cos(town.angle)+z*Math.sin(town.angle),z:town.z-x*Math.sin(town.angle)+z*Math.cos(town.angle)});
  const road=(id:string,a:Point,b:Point)=>{
    const length=distance(a,b);if(length<.1)return;
    const f:MapFeatureDef={id:`town-${index}-${id}`,kind:'road',x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:cfg.streetWidth,depth:length+.6,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass:'street',label:'Asulatänav'};
    streets.push(f);features.push(f);
  };
  const growth=index<2?cfg.centerGrowth:1;
  const rx=town.blocks*config.blockWidth*.55*growth*random(.85,1.16),rz=town.blocks*config.blockDepth*.65*growth*random(.85,1.16),phase=random(0,Math.PI*2);
  const innerOffset={x:random(-rx*.12,rx*.12),z:random(-rz*.12,rz*.12)};
  const rings:Point[][]=[];
  for(let ring=0;ring<2;ring++){
    const scale=ring===0?.46:1,points:Point[]=[];
    for(let j=0;j<cfg.loopSegments;j++){
      const a=j*Math.PI*2/cfg.loopSegments,warp=1+.18*Math.sin(a*2+phase)+.12*Math.cos(a*3-phase)+.05*Math.sin(a*5+phase);
      points.push(transform(Math.cos(a)*rx*scale*warp+(ring===0?innerOffset.x:0),Math.sin(a)*rz*scale*warp+(ring===0?innerOffset.z:0)));
    }
    for(let j=0;j<points.length;j++)road(`loop-${ring}-${j}`,points[j],points[(j+1)%points.length]);
    rings.push(points);
  }
  // A continuous spine joins the same boundary endpoints as the regional highway.
  const cols=town.blocks,spineX=-cols*config.blockWidth/2+Math.ceil(cols/2)*config.blockWidth,extent=town.blocks*config.blockDepth/2+35;
  road('spine',transform(spineX,-extent),transform(spineX,extent));
  for(let j=0;j<cfg.loopSegments;j+=cfg.spokeStride){road(`lane-inner-${j}`,town,rings[0][j]);road(`lane-outer-${j}`,rings[0][j],rings[1][j]);}
  road('boundary-link',rings[1][0],transform(cols*config.blockWidth/2,0));
  const blockers=[...existing,...streets],houses:MapFeatureDef[]=[];
  for(const street of streets){
    const a=street.rotation??0,length=street.depth,slots=Math.floor(length/cfg.lotSpacing);
    for(let j=0;j<slots;j++)for(const side of [-1,1]){
      if(rng.next()>chance)continue;
      const t=(j+.5)*length/Math.max(1,slots)-length/2,offset=side*cfg.frontageOffset;
      const p={x:street.x+Math.sin(a)*t+Math.cos(a)*offset,z:street.z+Math.cos(a)*t-Math.sin(a)*offset};
      const width=random(config.houseWidth[0],config.houseWidth[1]),depth=random(config.houseDepth[0],config.houseDepth[1]),radius=Math.hypot(width,depth)/2+cfg.lotClearance;
      if(blockers.some(f=>['road','building','water','bridge'].includes(f.kind)&&pointInFeature(p.x,p.z,f,radius))||houses.some(f=>pointInFeature(p.x,p.z,f,radius)))continue;
      const id=`town-${index}-house-${houses.length}`;
      const house:MapFeatureDef={id,kind:'building',appearance:'farmhouse',...p,width,depth,height:random(height[0],height[1]),buildingStyle:style,rotation:a+(side<0?Math.PI:0),color:cfg.houseColors[houses.length%cfg.houseColors.length],garrisonCapacity:1,label:index<2?'Linnaelamu':'Külaelamu'};
      houses.push(house);features.push(house,{id:`garden-${id}`,kind:'cover',appearance:'yard',...p,width:width+3,depth:depth+5,rotation:house.rotation,color:0x919981,blocksMovement:false});
    }
  }
  return features;
}

/** Seeded foothill belts, with connected compact peaks and deliberate lowland corridors. */
export function buildMountainRanges(size:number,archetype:string,rng:Rng,features:readonly MapFeatureDef[],protectedPoints:readonly (Point&{r:number})[]):Landform[] {
  const cfg=config.mountainRanges,forms:Landform[]=[],mountain=archetype==='highlands';
  const profile=config.profiles[archetype as keyof typeof config.profiles];
  const random=(a:number,b:number)=>a+(b-a)*rng.next();
  const roads=features.filter(f=>f.kind==='road'||f.kind==='bridge'||f.kind==='water'||f.kind==='building');
  // Test the whole support, not just the summit: roads and settlements stay in valleys.
  const obstacles=roads.flatMap(f=>{
    if(f.kind==='road'||f.kind==='bridge'){
      const n=Math.max(1,Math.ceil(f.depth/cfg.obstacleSampleSpacing)),a=f.rotation??0;
      return Array.from({length:n+1},(_,i)=>({x:f.x+Math.sin(a)*(i/n-.5)*f.depth,z:f.z+Math.cos(a)*(i/n-.5)*f.depth,r:f.width/2+cfg.roadClearance}));
    }
    return [{x:f.x,z:f.z,r:Math.max(f.width,f.depth)/2},...featureCorners(f).map(p=>({...p,r:cfg.roadClearance}))];
  }).concat(protectedPoints);
  for(const side of [-1,1]){
    const x=side*size*random(cfg.beltPosition[0],cfg.beltPosition[1]),z=size*random(-.08,.08),angle=random(-.22,.22);
    for(let i=0;i<cfg.peaksPerBelt;i++){
      const p={x:x+Math.sin(angle)*((i-(cfg.peaksPerBelt-1)/2)*size*cfg.peakSpacing),z:z+Math.cos(angle)*((i-(cfg.peaksPerBelt-1)/2)*size*cfg.peakSpacing)};
      const f:Landform={...p,width:size*cfg.alongRadius,depth:size*cfg.acrossRadius,height:random(...(mountain?cfg.mountainHeight:profile.hillHeight) as [number,number]),shape:'ridge',rotation:Math.PI/2-angle};
      if(Math.abs(p.x)+f.depth>size/2-12||Math.abs(p.z)+f.width>size/2-12)continue;
      const overlaps=obstacles.some(o=>{
        const a=f.rotation!,dx=o.x-f.x,dz=o.z-f.z,u=dx*Math.cos(a)-dz*Math.sin(a),v=dx*Math.sin(a)+dz*Math.cos(a);
        return (u/(f.width+o.r))**2+(v/(f.depth+o.r))**2<1;
      });
      if(!overlaps)forms.push(f);
    }
  }
  return forms;
}

/** Subtract a convex mask, keeping disjoint convex remnants instead of discarding entire fields. */
export function subtractParcel(points:Point[],mask:readonly Point[]):Point[][] {
  const clip=(poly:Point[],a:Point,b:Point,inside:boolean):Point[]=>{
    const out:Point[]=[],cross=(p:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],dp=cross(p),dq=cross(q),ip=inside?dp>=0:dp<=0,iq=inside?dq>=0:dq<=0;
      if(ip)out.push(p);if(ip!==iq){const t=dp/(dp-dq);out.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}
    }
    return out;
  };
  const signed=mask.reduce((sum,a,i)=>{const b=mask[(i+1)%mask.length];return sum+a.x*b.z-b.x*a.z;},0),boundary=signed<0?[...mask].reverse():mask;
  let remainder=points;const pieces:Point[][]=[];
  for(let i=0;i<boundary.length&&remainder.length>=3;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],outside=clip(remainder,a,b,false);
    if(outside.length>=3&&parcelArea(outside)>config.landUse.minimumArea)pieces.push(outside);
    remainder=clip(remainder,a,b,true);
  }
  return pieces;
}
export function parcelArea(points:readonly Point[]):number {
  return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.z-q.x*p.z;},0))/2;
}

/** Water outlines may be concave; a conservative convex hull keeps subtraction valid. */
export function convexHull(points:readonly Point[]):Point[] {
  const sorted=[...points].sort((a,b)=>a.x-b.x||a.z-b.z);
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const lower:Point[]=[],upper:Point[]=[];
  for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2)!,lower.at(-1)!,p)<=0)lower.pop();lower.push(p);}
  for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2)!,upper.at(-1)!,p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}

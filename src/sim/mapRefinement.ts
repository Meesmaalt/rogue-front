import config from '../data/map-generation.json';
import {MapFeatureIndex,pointInFeature,featureCorners,type MapFeatureDef} from './mapFeatures';
import {footprintsOverlap} from './settlements';
import type {Rng} from './rng';
import type {Point} from './types';
const cfg=config.mapRefinement;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Try complete shore footprints in free lowland pockets, not three random center points. */
export function addInteriorLakes(size:number,rng:Rng,features:MapFeatureDef[],protectedPoints:readonly (Point&{r:number})[],paired=false,preferred:readonly Point[]=[]):void {
 const random=(a:number,b:number)=>a+(b-a)*rng.next();
 const requested=Math.min(cfg.maxLakes,Math.max(cfg.minimumLakes,Math.floor(size/cfg.lakeCountDivisor)+1)),count=paired?Math.max(2,Math.floor(requested/2)*2):requested;
 const blockers=features.filter(f=>['road','bridge','building','water'].includes(f.kind)||f.appearance==='yard');
 const index=new MapFeatureIndex(blockers),placed:MapFeatureDef[]=[];
 for(let i=0;i<count;i+=paired?2:1)for(let attempt=0;attempt<cfg.lakeAttempts;attempt++){
  const width=Math.min(cfg.lakeMaximumWidth,size*random(...cfg.lakeWidthRatio as [number,number])),depth=width*random(...cfg.lakeDepthRatio as [number,number]);
  const side=i%2?-1:1;let x=side*size*random(.09,.36),z=size*(i<2?(i===0?-1:1)*random(.09,.34):random(-.34,.34));const phase=random(0,Math.PI*2),guide=preferred[Math.floor(i/(paired?2:1))];
  if(guide&&attempt<40){x=guide.x+random(-1,1)*size*.012;z=guide.z+random(-1,1)*size*.012;}
  const polygon=Array.from({length:cfg.lakeVertices},(_,j)=>{
   const a=j*Math.PI*2/cfg.lakeVertices,r=1+.065*Math.sin(a*3+phase)+.035*Math.cos(a*5-phase);
   const lx=Math.cos(a)*width*.5*r,lz=Math.sin(a)*depth*.5*r,c=Math.cos(phase),s=Math.sin(phase);
   return {x:x+lx*c+lz*s,z:z-lx*s+lz*c};
  });
  const xs=polygon.map(p=>p.x),zs=polygon.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const f:MapFeatureDef={id:`basin-lake-${i}`,kind:'water',waterBody:'lake',x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,depth:maxZ-minZ,polygon,surfaceHeight:-.8,blocksMovement:true,label:i===0?'Suurjärv':'Metsajärv'};
  const candidates=paired?[f,{...f,id:`basin-lake-${i+1}`,x:-f.x,z:-f.z,polygon:f.polygon!.map(p=>({x:-p.x,z:-p.z}))}]:[f];
  if(candidates.some(candidate=>{
   if(protectedPoints.some(p=>distance(p,candidate)<p.r+Math.max(candidate.width,candidate.depth)/2+cfg.shoreClearance))return true;
   const x=candidate.x,z=candidate.z,w=candidate.width/2+cfg.shoreClearance,d=candidate.depth/2+cfg.shoreClearance;
   const nearby=index.query(x-w,z-d,x+w,z+d);
   return [...nearby,...placed].some(o=>footprintsOverlap(candidate,o,cfg.shoreClearance));
  })||paired&&footprintsOverlap(candidates[0],candidates[1],cfg.shoreClearance))continue;
  features.push(...candidates);placed.push(...candidates);break;
 }
}

function ends(f:MapFeatureDef):[Point,Point]{const a=f.rotation??0,dx=Math.sin(a)*f.depth/2,dz=Math.cos(a)*f.depth/2;return [{x:f.x-dx,z:f.z-dz},{x:f.x+dx,z:f.z+dz}];}
function segment(f:MapFeatureDef,a:Point,b:Point,id=f.id):MapFeatureDef{return {...f,id,x:(a.x+b.x)/2,z:(a.z+b.z)/2,depth:distance(a,b)+.4,rotation:Math.atan2(b.x-a.x,b.z-a.z)};}

/** Snap near-miss T junctions, then give true crossings a shared centerline node.
 * This only changes v15 geometry; bridges retain their authored deck footprints. */
export function refineRoadConnections(features:MapFeatureDef[]):void {
 const roads=features.filter(f=>f.kind==='road'),index=new MapFeatureIndex(roads,64,cfg.junctionSnapDistance);
 const obstacles=new MapFeatureIndex(features.filter(f=>f.kind==='water'||f.kind==='building'));
 for(const f of roads){
  const points=ends(f);let changed=false;
  for(let k=0;k<2;k++){
   const p=points[k],near=index.query(p.x-cfg.junctionSnapDistance,p.z-cfg.junctionSnapDistance,p.x+cfg.junctionSnapDistance,p.z+cfg.junctionSnapDistance);let best=cfg.junctionSnapDistance,chosen:Point|undefined;
   if(near.some(o=>o!==f&&pointInFeature(p.x,p.z,o)))continue;
   for(const o of near){
    if(o===f||Math.abs(Math.sin((o.rotation??0)-(f.rotation??0)))<cfg.junctionMinimumAngle)continue;
    const [a,b]=ends(o),dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    const q={x:a.x+t*dx,z:a.z+t*dz},d=distance(p,q);if(d>=best)continue;
    if([p,q,{x:(p.x+q.x)/2,z:(p.z+q.z)/2}].some(v=>obstacles.at(v.x,v.z).some(o=>pointInFeature(v.x,v.z,o,f.width/2))))continue;
    best=d;chosen=q;
   }
   if(chosen){points[k]=chosen;changed=true;}
  }
  if(changed&&distance(points[0],points[1])>=cfg.minimumRoadPiece)Object.assign(f,segment(f,points[0],points[1]));
 }
 const updated=new MapFeatureIndex(roads),replacement=new Map<MapFeatureDef,MapFeatureDef[]>();
 for(const f of roads){
  const [a,b]=ends(f),dx=b.x-a.x,dz=b.z-a.z,length=distance(a,b),cuts=[0,1],corners=featureCorners(f);
  for(const o of updated.query(Math.min(...corners.map(p=>p.x)),Math.min(...corners.map(p=>p.z)),Math.max(...corners.map(p=>p.x)),Math.max(...corners.map(p=>p.z)))){
   if(o===f)continue;const [c,d]=ends(o),ex=d.x-c.x,ez=d.z-c.z,den=dx*ez-dz*ex;
   if(Math.abs(den)<1e-8||Math.abs(Math.sin((o.rotation??0)-(f.rotation??0)))<cfg.junctionMinimumAngle)continue;
   const t=((c.x-a.x)*ez-(c.z-a.z)*ex)/den,u=((c.x-a.x)*dz-(c.z-a.z)*dx)/den;
   if(t*length>cfg.minimumRoadPiece&&(1-t)*length>cfg.minimumRoadPiece&&u>=0&&u<=1&&!cuts.some(v=>Math.abs(v-t)*length<cfg.minimumRoadPiece))cuts.push(t);
  }
  if(cuts.length===2)continue;cuts.sort((a,b)=>a-b);
  replacement.set(f,cuts.slice(1).map((t,i)=>segment(f,{x:a.x+dx*cuts[i],z:a.z+dz*cuts[i]},{x:a.x+dx*t,z:a.z+dz*t},`${f.id}-junction-${i}`)));
 }
 if(replacement.size)features.splice(0,features.length,...features.flatMap(f=>replacement.get(f)??[f]));
}

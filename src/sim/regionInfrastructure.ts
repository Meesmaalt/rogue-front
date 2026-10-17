import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import type {Point} from './types';
import type {RegionalPlan} from './regionPlans';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const mirrored=(p:Point):Point=>({x:-p.x,z:-p.z});
export function segmentIntersection(a:Point,b:Point,c:Point,d:Point):Point|undefined {
 const dx=b.x-a.x,dz=b.z-a.z,ex=d.x-c.x,ez=d.z-c.z,den=dx*ez-dz*ex;if(Math.abs(den)<1e-8)return;
 const t=((c.x-a.x)*ez-(c.z-a.z)*ex)/den,u=((c.x-a.x)*dz-(c.z-a.z)*dx)/den;
 if(t<0||t>1||u<0||u>1)return;return {x:a.x+dx*t,z:a.z+dz*t};
}
/** Shared centreline geometry determines both the true river crossing and deck orientation. */
export function addPlanInfrastructure(plan:RegionalPlan,size:number,river:boolean,features:MapFeatureDef[]):void {
 const waters:Array<{a:Point;b:Point;width:number}>=[],roads:Array<{a:Point;b:Point;id:string}>=[],bridges:MapFeatureDef[]=[];
 const riverWidth=plan.id==='long-canyon'?24:28;
 if(river)for(const [lineIndex,line] of plan.rivers.entries())for(let i=1;i<line.length;i++){
  const a=line[i-1],b=line[i],count=Math.ceil(distance(a,b)/Math.max(28,size/128));waters.push({a,b,width:riverWidth});
  for(let j=0;j<count;j++){
   const from={x:a.x+(b.x-a.x)*j/count,z:a.z+(b.z-a.z)*j/count},to={x:a.x+(b.x-a.x)*(j+1)/count,z:a.z+(b.z-a.z)*(j+1)/count};
   features.push({id:`plan-river-${lineIndex}-${i}-${j}`,kind:'water',waterBody:'river',x:(from.x+to.x)/2,z:(from.z+to.z)/2,width:riverWidth,depth:distance(from,to)+2,rotation:Math.atan2(to.x-from.x,to.z-from.z),surfaceHeight:-.8,label:'Jõgi'});
  }
 }
 for(const road of plan.roads)for(let i=1;i<road.points.length;i++)roads.push({a:road.points[i-1],b:road.points[i],id:`${road.id}-${i}`});
 for(const r of roads)for(const w of waters){
  const q=segmentIntersection(r.a,r.b,w.a,w.b);if(!q||bridges.some(b=>distance(b,q)<18))continue;
  const roadAngle=Math.atan2(r.b.x-r.a.x,r.b.z-r.a.z),waterAngle=Math.atan2(w.b.x-w.a.x,w.b.z-w.a.z),sine=Math.abs(Math.sin(roadAngle-waterAngle));
  if(sine<.2)throw new Error('Tee ja jõe ristumisnurk on silla jaoks liiga väike.');
  bridges.push({id:`plan-bridge-${bridges.length}`,kind:'bridge',...q,width:18,depth:w.width/sine+32,rotation:roadAngle,surfaceHeight:1.4,label:'Jõesild'});
 }
 const append=(id:string,a:Point,b:Point)=>{if(distance(a,b)<.3)return;features.push({id,kind:'road',x:(a.x+b.x)/2,z:(a.z+b.z)/2,width:7,depth:distance(a,b)+.4,rotation:Math.atan2(b.x-a.x,b.z-a.z),roadClass:'secondary',label:'Maantee'});};
 for(const r of roads){
  let intervals:Array<[number,number]>=[[0,1]];
  for(const bridge of bridges){
   if(distance(r.a,bridge)>distance(r.a,r.b)+bridge.depth)continue;
   const a=bridge.rotation??0,c=Math.cos(a),s=Math.sin(a),local=(p:Point)=>({x:(p.x-bridge.x)*c-(p.z-bridge.z)*s,z:(p.x-bridge.x)*s+(p.z-bridge.z)*c});
   const u=local(r.a),v=local(r.b);let lo=0,hi=1;
   for(const [p,d,half] of [[u.x,v.x-u.x,bridge.width/2],[u.z,v.z-u.z,bridge.depth/2]]){
    if(Math.abs(d)<1e-8){if(Math.abs(p)>half){lo=1;hi=0;break;}continue;}
    const t1=(-half-p)/d,t2=(half-p)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));
   }
   if(lo>=hi)continue;
   intervals=intervals.flatMap(([a,b])=>hi<=a||lo>=b?[[a,b] as [number,number]]:([[a,Math.max(a,lo)],[Math.min(b,hi),b]] as Array<[number,number]>).filter(([x,y])=>y-x>1e-5));
  }
  intervals.forEach(([a,b],i)=>append(`${r.id}-${i}`,{x:r.a.x+(r.b.x-r.a.x)*a,z:r.a.z+(r.b.z-r.a.z)*a},{x:r.a.x+(r.b.x-r.a.x)*b,z:r.a.z+(r.b.z-r.a.z)*b}));
 }
 features.push(...bridges);
}
export interface PlannedResource extends Point {offset:Point}
/** Paired dry loading/factory footprints are found before towns occupy the network. */
export function planResourceSites(plan:RegionalPlan,size:number,features:readonly MapFeatureDef[]):PlannedResource[]{
 const sites:PlannedResource[]=[],roads=features.filter(f=>f.kind==='road'),obstacles=features.filter(f=>f.kind==='water'||f.id.startsWith('base-airfield'));
 const candidates:Point[]=[];
 for(const road of roads){const a=road.rotation??0;for(const side of [-1,1])for(const setback of [32,48])candidates.push({x:road.x+Math.cos(a)*side*setback,z:road.z-Math.sin(a)*side*setback});}
 const valid=(p:Point,offset:Point)=>{
  const facility={x:p.x+offset.x,z:p.z+offset.z};
  return Math.max(Math.abs(p.x),Math.abs(p.z),Math.abs(facility.x),Math.abs(facility.z))<size/2-65&&
   plan.nodes.slice(0,2).every(b=>distance(b,p)>135)&&plan.towns.every(t=>distance(t,p)>65)&&sites.every(s=>distance(s,p)>95)&&
   !obstacles.some(f=>pointInFeature(p.x,p.z,f,18)||pointInFeature(facility.x,facility.z,f,15))&&
   !roads.some(f=>pointInFeature(facility.x,facility.z,f,12));
 };
 const pick=(guide:Point,paired:boolean)=>{
  const ordered=[...candidates].sort((a,b)=>distance(a,guide)-distance(b,guide));
  for(const p of ordered)for(const offset of [{x:20,z:20},{x:-20,z:-20},{x:20,z:-20},{x:-20,z:20}]){
   if(!valid(p,offset)||paired&&!valid(mirrored(p),mirrored(offset)))continue;
   const result={...p,offset};sites.push(result);if(paired)sites.push({...mirrored(p),offset:mirrored(offset)});return result;
  }
  throw new Error('Paigutusele ei leidunud kuiva tootmisala.');
 };
 const home=pick(plan.resourceGuides[0],true),flank=pick(plan.resourceGuides[1],true),front=pick(plan.resourceGuides[2],true),rear=pick(plan.resourceGuides[3],true);
 // A shared neutral site occupies the nearest dry network point to the contested centre.
 const centre=pick({x:0,z:0},false);
 const pair=(r:PlannedResource)=>({...mirrored(r),offset:mirrored(r.offset)});
 return [home,pair(home),centre,flank,pair(flank),front,pair(front),rear,pair(rear)];
}

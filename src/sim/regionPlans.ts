import definitions from '../data/region-plans.json';
import {Rng} from './rng';
import type {Point} from './types';
import {REGION_IDS,type RegionId,type ReliefShape} from './regions';
export type RegionLayoutIndex=0|1|2;
export const REGION_PLANS=definitions;
export interface PlanRoad {id:string;points:Point[];from:number;to:number}
export interface RegionalPlan {
 id:string;name:string;index:RegionLayoutIndex;topology:string;forestBias:number;
 nodes:Point[];roads:PlanRoad[];rivers:Point[][];towns:Array<Point&{angle:number;blocks:number}>;
 resourceGuides:Point[];ridgePaths:Point[][];lakeGuides?:Point[];relief?:{shape:ReliefShape;heightScale:number;widthScale:number;depthScale:number};
}
const length=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const mirror=(p:Point):Point=>({x:-p.x,z:-p.z});
function smoothLine(points:Point[]):Point[]{
 const out:Point[]=[];
 for(let i=0;i<points.length-1;i++)for(let j=0;j<8;j++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)],t=j/8;
  const value=(key:'x'|'z')=>.5*(2*b[key]+(-a[key]+c[key])*t+(2*a[key]-5*b[key]+4*c[key]-d[key])*t*t+(-a[key]+3*b[key]-3*c[key]+d[key])*t*t*t);
  out.push({x:value('x'),z:value('z')});
 }
 out.push(points[points.length-1]);return out;
}
/** Twelve authored graphs, with paired seeded perturbations rather than rotating one common board. */
export function createRegionalPlan(region:RegionId,seed:number,size:number,explicit?:RegionLayoutIndex):RegionalPlan {
 const selector=new Rng(seed^Math.imul(REGION_IDS.indexOf(region)+1,0x45d9f3b));
 const index=explicit??Math.floor(selector.next()*3) as RegionLayoutIndex,definition=definitions[region][index];
 const rng=new Rng(seed^0x739ad),random=(a:number,b:number)=>a+(b-a)*rng.next();
 const nodes:Point[]=[{x:-size*.37,z:size*.35},{x:size*.37,z:-size*.35}];
 const towns:RegionalPlan['towns']=[];
 for(const [i,p] of definition.townPairs.entries()){
  const point={x:(p[0]+random(-.008,.008))*size,z:(p[1]+random(-.008,.008))*size},angle=random(-.25,.25);
  nodes.push(point,mirror(point));towns.push({...point,angle,blocks:i===0?3:2},{...mirror(point),angle:angle+Math.PI,blocks:i===0?3:2});
 }
 const edges:Array<[number,number]>=[],keys=new Set<string>();
 const edge=(a:number,b:number)=>{const key=[Math.min(a,b),Math.max(a,b)].join('/');if(a!==b&&!keys.has(key)){keys.add(key);edges.push([a,b]);}};
 const nearest=(p:Point,indices:number[])=>indices.reduce((a,b)=>length(nodes[a],p)<length(nodes[b],p)?a:b);
 const townIndices=[2,3,4,5,6,7];
 if(definition.topology==='ladder'){
  for(const [a,b] of [[6,4],[4,2],[7,5],[5,3],[2,7],[4,5],[6,3]])edge(a,b);
 }else if(definition.topology==='fork'){
  nodes.push({x:-size*.075,z:size*.045},{x:size*.075,z:-size*.045});
  for(const n of [2,4,6]){edge(n,8);edge(n+1,9);}edge(8,9);edge(2,5);edge(3,4);
 }else {
  const order=[...townIndices].sort((a,b)=>Math.atan2(nodes[a].z,nodes[a].x)-Math.atan2(nodes[b].z,nodes[b].x));
  for(let i=0;i<order.length;i++)edge(order[i],order[(i+1)%order.length]);
  if(definition.topology==='ring'){edge(6,7);}
 }
 const home=nearest(nodes[0],townIndices);edge(0,home);edge(1,home%2===0?home+1:home-1);
 // A second paired base exit avoids a single approach becoming the whole battle.
 const alternate=nearest(nodes[0],townIndices.filter(i=>i!==home&&i!==(home%2===0?home+1:home-1)));
 edge(0,alternate);edge(1,alternate%2===0?alternate+1:alternate-1);
 const roads:PlanRoad[]=edges.map(([from,to],i)=>{
  const a=nodes[from],b=nodes[to],d=length(a,b),bend=definition.curve*size;
  // The curve sign is invariant under a 180-degree paired edge transformation.
  const sign=(a.x*b.z-a.z*b.x)>=0?1:-1,dx=(b.z-a.z)/d,dz=-(b.x-a.x)/d;
  const segments=Math.max(3,Math.ceil(d/45));
  return {id:`plan-road-${i}`,from,to,points:Array.from({length:segments+1},(_,j)=>{
   const t=j/segments,bulge=Math.sin(t*Math.PI)*bend*sign;
   return {x:a.x+(b.x-a.x)*t+dx*bulge,z:a.z+(b.z-a.z)*t+dz*bulge};
  })};
 });
 const river=smoothLine(definition.river.map(([x,z])=>({x:x*size,z:z*size}))),rivers=[river];
 if(definition.id==='branching-valley'){
  const branch=[{x:-size*.22,z:-size*.52},{x:-size*.14,z:-size*.32},{x:-size*.07,z:-size*.16},{x:0,z:0}];rivers.push(smoothLine(branch),smoothLine([...branch].reverse().map(mirror)));
 }
 // Ridge axes are the dual of each layout: ring interiors, spokes or long valley walls.
 const ridgePaths:Point[][]=[];
 if(definition.topology==='ring'||definition.topology==='bypass'){
  for(const side of [-1,1])ridgePaths.push(Array.from({length:7},(_,i)=>{const a=-1.25+i/6*2.5;return {x:side*size*(.12+Math.cos(a)*.09),z:side*size*Math.sin(a)*.19};}));
 }else if(definition.topology==='fork'){
  for(const side of [-1,1])for(const z of [-.16,.16])ridgePaths.push([{x:side*size*.10,z:z*size},{x:side*size*.21,z:z*size*.8},{x:side*size*.41,z:z*size*.7}]);
 }else for(const side of [-1,1])ridgePaths.push([{x:side*size*.12,z:-size*.43},{x:side*size*.16,z:0},{x:side*size*.12,z:size*.43}]);
 for(const side of [-1,1])ridgePaths.push([{x:side*size*.43,z:-size*.43},{x:side*size*.42,z:0},{x:side*size*.43,z:size*.43}]);
 return {id:definition.id,name:definition.name,index,topology:definition.topology,forestBias:definition.forestBias,nodes,roads,rivers,towns,
  relief:{...definition.relief,shape:definition.relief.shape as ReliefShape},lakeGuides:definition.lakeGuides.map(([x,z])=>({x:x*size,z:z*size})),resourceGuides:[{x:(nodes[0].x+nodes[home].x)/2,z:(nodes[0].z+nodes[home].z)/2},nodes[2],nodes[4],nodes[6]],ridgePaths};
}
/** Graph travel uses actual polyline lengths. It is a preparation-time diagnostic, not a tick cost. */
export function planTravelDistances(plan:RegionalPlan,start:number):number[]{
 const distances=plan.nodes.map(()=>Infinity),done=new Set<number>();distances[start]=0;
 while(done.size<plan.nodes.length){let node=-1;for(let i=0;i<distances.length;i++)if(!done.has(i)&&(node<0||distances[i]<distances[node]))node=i;if(node<0||!Number.isFinite(distances[node]))break;done.add(node);
  for(const road of plan.roads){const next=road.from===node?road.to:road.to===node?road.from:-1;if(next<0)continue;const cost=road.points.slice(1).reduce((sum,p,i)=>sum+length(p,road.points[i]),0);distances[next]=Math.min(distances[next],distances[node]+cost);}
 }
 return distances;
}
export function distanceToPlanRiver(plan:RegionalPlan,p:Point):number {
 let best=Infinity;
 for(const line of plan.rivers)for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t));}
 return best;
}

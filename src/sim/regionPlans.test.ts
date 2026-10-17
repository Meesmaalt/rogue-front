import {expect,it} from 'vitest';
import {createRegionalPlan,planTravelDistances,REGION_PLANS,type RegionLayoutIndex} from './regionPlans';
import {REGION_IDS} from './regions';
it.each(REGION_IDS)('%s has three genuinely different connected graphs with two independent base routes',region=>{
 const signatures=new Set<string>();
 for(const index of [0,1,2] as RegionLayoutIndex[]){const p=createRegionalPlan(region,43,4096,index),a=planTravelDistances(p,0),b=planTravelDistances(p,1);
  expect(p.id).toBe(REGION_PLANS[region][index].id);expect(a.every(Number.isFinite)).toBe(true);
  for(let i=2;i<p.nodes.length;i+=2)expect(a[i]).toBeCloseTo(b[i+1],5);
  for(const road of p.roads)expect(Number.isFinite(planTravelDistances({...p,roads:p.roads.filter(r=>r!==road)},0)[1])).toBe(true);
  signatures.add(JSON.stringify({nodes:p.nodes,edges:p.roads.map(r=>[r.from,r.to]),water:p.rivers}));
 }
 expect(signatures.size).toBe(3);
});
it('automatic selection covers every layout and is repeatable independently of map size',()=>{
 for(const region of REGION_IDS){const seen=new Set();for(let seed=0;seed<25;seed++){
  const p=createRegionalPlan(region,seed,2048);seen.add(p.index);expect(createRegionalPlan(region,seed,6144).id).toBe(p.id);expect(createRegionalPlan(region,seed,2048)).toEqual(p);
 }expect(seen.size).toBe(3);}
});

it.each(REGION_IDS)('%s seeds change river bends and road curvature while retaining the selected graph',region=>{
 const plans=[43,91,201].map(seed=>createRegionalPlan(region,seed,2048,1));
 expect(new Set(plans.map(p=>JSON.stringify(p.rivers))).size).toBe(3);
 const curves=plans.map(p=>p.roads.map(r=>{const a=r.points[0],b=r.points.at(-1)!,mid=r.points[Math.floor(r.points.length/2)];return Math.abs((b.z-a.z)*(mid.x-a.x)-(b.x-a.x)*(mid.z-a.z))/Math.hypot(b.x-a.x,b.z-a.z);}));
 expect(new Set(curves.map(v=>v.map(n=>n.toFixed(2)).join('/'))).size).toBe(3);
 for(const p of plans){expect(p.id).toBe(plans[0].id);expect(p.topology).toBe(plans[0].topology);expect(p.roads.length).toBe(plans[0].roads.length);expect(planTravelDistances(p,0).every(Number.isFinite)).toBe(true);}
});

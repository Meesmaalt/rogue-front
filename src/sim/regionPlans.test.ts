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

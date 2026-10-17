import {expect,it} from 'vitest';
import {addPlanInfrastructure} from './regionInfrastructure';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import type {RegionalPlan} from './regionPlans';
it('oblique river crossings produce aligned decks and a continuous road without submerged asphalt',()=>{
 const plan:RegionalPlan={id:'crossing',name:'Test',index:0,topology:'test',forestBias:0,nodes:[],towns:[],ridgePaths:[],resourceGuides:[],
  rivers:[[{x:-100,z:-500},{x:100,z:500}]],roads:[{id:'road',from:0,to:1,points:[{x:-500,z:-100},{x:500,z:100}]}]};
 const features:MapFeatureDef[]=[];addPlanInfrastructure(plan,2048,true,features);
 const deck=features.find(f=>f.kind==='bridge')!;expect(deck).toBeDefined();expect(deck.rotation).toBeCloseTo(Math.atan2(1000,200));
 for(let i=0;i<=200;i++){const t=i/200,x=-500+1000*t,z=-100+200*t;
  expect(features.some(f=>(f.kind==='road'||f.kind==='bridge')&&pointInFeature(x,z,f,1))).toBe(true);
  if(features.some(f=>f.kind==='water'&&pointInFeature(x,z,f)))expect(pointInFeature(x,z,deck)).toBe(true);
 }
 for(const road of features.filter(f=>f.kind==='road'))for(const t of [-.45,0,.45]){
  const x=road.x+Math.sin(road.rotation!)*road.depth*t,z=road.z+Math.cos(road.rotation!)*road.depth*t;
  expect(features.some(f=>f.kind==='water'&&pointInFeature(x,z,f))).toBe(false);
 }
});

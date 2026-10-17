import {expect,it} from 'vitest';
import {buildCharacterSettlement} from './characterSettlements';
import {Rng} from './rng';
import {REGION_IDS} from './regions';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import {footprintsOverlap} from './settlements';

it.each(REGION_IDS)('%s villages have inhabited frontage, a clear focal yard and compact connected lanes',region=>{
 const main:MapFeatureDef={id:'highway',kind:'road',roadClass:'secondary',x:0,z:0,width:7,depth:600};
 const water:MapFeatureDef={id:'lake',kind:'water',x:100,z:50,width:40,depth:80,shape:'ellipse'};
 for(const seed of [0,43,4294967295]){
  const town={x:0,z:0,angle:0,blocks:3},f=buildCharacterSettlement(0,town,region,new Rng(seed),[main,water],2048),houses=f.filter(f=>f.kind==='building'),lanes=f.filter(f=>f.kind==='road');
  expect(buildCharacterSettlement(0,town,region,new Rng(seed),[main,water],2048)).toEqual(f);
  expect(houses.length).toBeGreaterThan(14);expect(lanes.length).toBeLessThanOrEqual(5);
  const heart=f.find(f=>f.landmark);expect(heart).toBeDefined();
  for(const h of houses){
   expect([main,water,...lanes,...houses.filter(o=>o!==h),heart!].some(o=>footprintsOverlap(h,o,.5)),h.id).toBe(false);
   expect([main,...lanes].some(r=>pointInFeature(h.x,h.z,r,Math.max(h.width,h.depth)+5))).toBe(true);
   expect(Math.hypot(h.x,h.z)).toBeLessThan(110);
   expect(h.roofStyle==='flat').toBe(region==='desert');
  }
  // Every local lane reaches the main route through actual touching road surfaces.
  const reached=new Set<MapFeatureDef>([main]);let changed=true;
  while(changed){changed=false;for(const r of lanes)if(!reached.has(r)&&[...reached].some(o=>footprintsOverlap(r,o,.8))){reached.add(r);changed=true;}}
  expect(lanes.every(r=>reached.has(r))).toBe(true);
 }
});
it('an obstructed loop cannot leave an inhabited island of disconnected lanes',()=>{
 const main:MapFeatureDef={id:'highway',kind:'road',roadClass:'secondary',x:0,z:0,width:7,depth:600};
 for(const seed of [1,2,3,4]){
  const barriers:MapFeatureDef[]=[-1,1].flatMap(side=>[-1,1].map(sign=>({id:`barrier-${side}-${sign}`,kind:'building',x:side*30,z:sign*45,width:40,depth:18})));
  const f=buildCharacterSettlement(0,{x:0,z:0,angle:0,blocks:3},'italy',new Rng(seed),[main,...barriers],2048),lanes=f.filter(f=>f.kind==='road'),reached=new Set<MapFeatureDef>([main]);let changed=true;
  while(changed){changed=false;for(const r of lanes)if(!reached.has(r)&&[...reached].some(o=>footprintsOverlap(r,o,.8))){reached.add(r);changed=true;}}
  expect(lanes.every(r=>reached.has(r))).toBe(true);
  for(const h of f.filter(f=>f.kind==='building'))expect([main,...lanes].some(r=>pointInFeature(h.x,h.z,r,Math.max(h.width,h.depth)+5))).toBe(true);
 }
});

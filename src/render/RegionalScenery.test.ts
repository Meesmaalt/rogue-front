import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {sampleRegionalScenery,createSettlementLandmarks} from './RegionalScenery';
import {createForest,sampleForest} from './Terrain';
import {resetHeightmap,setTerrainProfile,setMapSize,setBases} from '../sim/heightmap';
import {pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
afterEach(resetHeightmap);
it('regional detail leaves roads and airport reserves clear and has a bounded instance budget',()=>{
 setMapSize(2048);setBases([]);setTerrainProfile('region-desert',[]);
 const features:MapFeatureDef[]=[{id:'road',kind:'road',x:0,z:0,width:15,depth:1800},{id:'airport',kind:'cover',appearance:'yard',x:300,z:300,width:300,depth:400}];
 const points=sampleRegionalScenery(features);expect(points.length).toBeGreaterThan(500);expect(points.length).toBeLessThanOrEqual(5000);
 expect(points.some(p=>features.some(f=>pointInFeature(p.x,p.z,f,3)))).toBe(false);
});
it('all near and far evergreen/deciduous canopies supply the colours required by their shared material',()=>{
 for(const region of ['italy','siberia'] as const){setTerrainProfile(`region-${region}`,[]);
  const f:MapFeatureDef={id:'forest',kind:'cover',appearance:'forest',x:0,z:0,width:40,depth:40,density:1};
  const group=createForest([f],sampleForest([f],100));let crowns=0;
  group.traverse(o=>{if(o instanceof THREE.InstancedMesh&&o.userData.forestCrownCount){crowns++;const color=o.geometry.getAttribute('color');expect(color).toBeDefined();expect(Math.max(...color.array)).toBeGreaterThan(0);}});
  expect(crowns).toBeGreaterThan(0);
 }
});
it('ground accents cluster at their ecological patches and focal points use coloured geometry',()=>{
 setMapSize(2048);setBases([]);setTerrainProfile('region-canyon',[]);
 const f:MapFeatureDef[]=[{id:'scree',kind:'cover',x:100,z:100,width:150,depth:110,landscape:'scree',blocksMovement:false},{id:'heart',kind:'cover',appearance:'yard',x:-100,z:-100,width:20,depth:24,landmark:'rest'}];
 const points=sampleRegionalScenery(f);expect(points.filter(p=>p.clustered).length/points.length).toBeGreaterThan(.5);
 expect(points.filter(p=>p.clustered&&p.rock).length/points.filter(p=>p.clustered).length).toBeGreaterThan(.8);
 expect(Math.max(...points.filter(p=>p.clustered).map(p=>p.size))).toBeGreaterThan(3);
 const group=createSettlementLandmarks(f);let count=0;group.traverse(o=>{if(o instanceof THREE.Mesh){count++;expect(o.geometry.getAttribute('color')).toBeDefined();expect(o.geometry.boundingSphere?.radius??0).toBeLessThan(10);}});expect(count).toBe(1);
});

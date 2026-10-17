import {expect,it,afterEach} from 'vitest';
import {sampleCrops,fieldCrop,createCropFields} from './CropFields';
import {pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import {resetHeightmap} from '../sim/heightmap';
import * as THREE from 'three';
afterEach(resetHeightmap);
it('crop rows are deterministic, bounded and leave roads, bare soil and yards empty',()=>{
 const features:MapFeatureDef[]=[{id:'field-a',kind:'cover',appearance:'field',x:0,z:0,width:100,depth:70,cropRotation:.45,polygon:[{x:-50,z:-35},{x:50,z:-35},{x:35,z:35},{x:-40,z:35}]},{id:'soil',kind:'cover',appearance:'field',cropPattern:'bare',x:130,z:0,width:60,depth:60},{id:'road',kind:'road',x:0,z:0,width:8,depth:100}];
 const points=sampleCrops(features,350);expect(points.length).toBeGreaterThan(100);expect(points.length).toBeLessThanOrEqual(350);expect(points).toEqual(sampleCrops(features,350));expect(fieldCrop(features[1])).toBe('soil');
 for(const p of points){expect(pointInFeature(p.x,p.z,features[0])).toBe(true);expect(pointInFeature(p.x,p.z,features[2],1.3)).toBe(false);}
 const group=createCropFields(features);expect(group.children.length).toBeGreaterThan(0);
 group.traverse(o=>{if(o instanceof THREE.InstancedMesh){expect(o.count).toBeGreaterThan(0);expect(o.boundingSphere?.radius).toBeGreaterThan(0);expect([...o.instanceMatrix.array].every(Number.isFinite)).toBe(true);}});
});

it('fragments cut from one agricultural parcel keep one treatment, crop and colour',async()=>{
 const {enrichItalianLandscape}=await import('../sim/italianLandscape');
 const fragments:import('../sim/mapFeatures').MapFeatureDef[]=[0,1,2].map(i=>({id:`fragment-${i}`,parcelId:'one-parcel',kind:'cover',appearance:'field',x:i*120,z:i*85,width:90,depth:80,cropRotation:.5}));
 enrichItalianLandscape(43,fragments,fragments.map(f=>({x:f.x,z:f.z})));
 expect(new Set(fragments.map(f=>f.landUse)).size).toBe(1);expect(new Set(fragments.map(f=>f.color)).size).toBe(1);expect(new Set(fragments.map(fieldCrop)).size).toBe(1);
});

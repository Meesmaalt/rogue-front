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

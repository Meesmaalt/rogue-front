import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createResourceIndustry} from './ResourceIndustry';
it('all four industrial silhouettes fit their actual navigation footprint',()=>{
 const heights=[];
 for(const kind of ['depot','factory','oilfield','mine'] as const){
  const group=createResourceIndustry(kind),bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
  expect(size.x).toBeLessThanOrEqual(13);expect(size.z).toBeLessThanOrEqual(12);expect(size.y).toBeGreaterThan(4);
  heights.push(size.y);
 }
 expect(new Set(heights).size).toBeGreaterThanOrEqual(3);
});

import {expect,it} from 'vitest';
import * as THREE from 'three';
import config from '../data/world-character.json';
import {createLandmarkStructure} from './LandmarkStructures';
import type {MapFeatureDef} from '../sim/mapFeatures';
it('regional skyline structures fit their actual footprint and reuse one coloured geometry per design',()=>{
 for(const p of Object.values(config.landmarks)){
  const f:MapFeatureDef={id:'landmark',kind:'building',x:0,z:0,width:p.width,depth:p.depth,height:p.height,color:p.roof,facadeColor:p.wall,landmarkStructure:p.kind as MapFeatureDef['landmarkStructure']};
  const root=createLandmarkStructure(f),copy=createLandmarkStructure(f),b=new THREE.Box3().setFromObject(root);
  expect(Math.max(Math.abs(b.min.x),Math.abs(b.max.x))).toBeLessThanOrEqual(p.width/2+.01);expect(Math.max(Math.abs(b.min.z),Math.abs(b.max.z))).toBeLessThanOrEqual(p.depth/2+.01);expect(b.max.y).toBeLessThanOrEqual(p.height+.01);expect(b.max.y).toBeGreaterThan(p.height*.8);
  expect(root.children).toHaveLength(1);expect((root.children[0] as THREE.Mesh).geometry).toBe((copy.children[0] as THREE.Mesh).geometry);expect((root.children[0] as THREE.Mesh).geometry.getAttribute('color')).toBeDefined();expect(root.userData.structureId).toBe('landmark');
 }
});

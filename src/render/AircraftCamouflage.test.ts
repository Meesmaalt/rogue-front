import {expect,it} from 'vitest';
import * as THREE from 'three';
import {aircraftCamouflage} from './AircraftCamouflage';
it('enlarges cargo patches without changing shared vehicle textures or allocating per LOD/instance',()=>{
 const original=new THREE.Texture();original.colorSpace=THREE.SRGBColorSpace;original.wrapS=original.wrapT=THREE.RepeatWrapping;
 const near=aircraftCamouflage(original),far=aircraftCamouflage(original);
 expect(near).toBe(far);expect(near).not.toBe(original);expect(original.repeat.x).toBe(1);
 expect(near.repeat.x).toBeLessThan(.3);expect(near.colorSpace).toBe(original.colorSpace);expect(near.wrapS).toBe(THREE.RepeatWrapping);expect(near.anisotropy).toBeGreaterThanOrEqual(4);
 const bomber=aircraftCamouflage(original,"bomber");expect(bomber).not.toBe(near);expect(aircraftCamouflage(original,"bomber")).toBe(bomber);expect(bomber.repeat.x).toBeGreaterThan(near.repeat.x);
 expect(aircraftCamouflage(new THREE.Texture())).not.toBe(near);
});

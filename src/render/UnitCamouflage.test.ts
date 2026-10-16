import {expect,it} from 'vitest';
import * as THREE from 'three';
import {applyUnitCamouflage,camouflageTexture} from './UnitCamouflage';
it('camouflage uses cached distinct textures and never repaints the source or the cockpit',()=>{
 const armor=new THREE.MeshStandardMaterial({color:0x556644});armor.name='armor';const glass=new THREE.MeshStandardMaterial({color:0x263f4b}),a=new THREE.Group(),b=new THREE.Group();for(const g of [a,b]){g.add(new THREE.Mesh(new THREE.BoxGeometry(),armor),new THREE.Mesh(new THREE.BoxGeometry(),glass));}applyUnitCamouflage(a,'desert');applyUnitCamouflage(b,'desert');expect((a.children[0] as THREE.Mesh).material).toBe((b.children[0] as THREE.Mesh).material);expect((a.children[0] as THREE.Mesh).material).not.toBe(armor);expect((a.children[1] as THREE.Mesh).material).toBe(glass);expect(armor.map).toBeNull();expect(camouflageTexture('winter')).not.toBe(camouflageTexture('desert'));
});

import {expect,it} from "vitest";
import * as THREE from "three";
import {TerrainCulling} from "./TerrainCulling";
it("rejects whole distant LOD roots and restores them when the camera reaches the area",()=>{
 const terrain=new THREE.Group(),material=new THREE.MeshBasicMaterial(),geometry=new THREE.BoxGeometry(10,10,10);
 for(const x of [0,900]){const lod=new THREE.LOD();lod.position.x=x;lod.addLevel(new THREE.Mesh(geometry,material),0);lod.addLevel(new THREE.Mesh(geometry,material),100);terrain.add(lod);}
 const camera=new THREE.PerspectiveCamera(42,1,1,600);camera.position.set(0,150,180);camera.lookAt(0,0,0);
 const culling=new TerrainCulling(terrain);culling.sync(camera);expect(culling.totalGroups).toBe(2);expect(culling.visibleGroups).toBe(1);expect(terrain.children[1].visible).toBe(false);
 camera.position.x=900;camera.lookAt(900,0,0);culling.sync(camera);expect(culling.visibleGroups).toBe(1);expect(terrain.children[1].visible).toBe(true);expect(terrain.children[0].visible).toBe(false);
 geometry.dispose();material.dispose();
});

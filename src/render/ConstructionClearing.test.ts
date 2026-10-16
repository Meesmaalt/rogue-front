import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {syncForestTerrain} from './Terrain';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
afterEach(resetHeightmap);
it('a foundation clears individual vegetation instances inside its site and keeps surrounding trees',()=>{
 const w=new World(18,false,[],[],[],false),root=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),2),matrix=new THREE.Matrix4();mesh.setMatrixAt(0,matrix);mesh.setMatrixAt(1,matrix.makeTranslation(70,0,0));mesh.userData.vegetationPoints=[{x:0,z:0},{x:70,z:0}];mesh.userData.vegetationMatrices=mesh.instanceMatrix.array.slice();root.add(mesh);const b=w.spawn('generator',0,0,0);b.underConstruction=true;syncForestTerrain(root,w);const p=new THREE.Vector3(),r=new THREE.Quaternion(),s=new THREE.Vector3();mesh.getMatrixAt(0,matrix);matrix.decompose(p,r,s);expect(s.length()).toBe(0);mesh.getMatrixAt(1,matrix);matrix.decompose(p,r,s);expect(s.x).toBe(1);expect(syncForestTerrain(root,w)).toBe(false);
});

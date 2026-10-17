import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {createSettlementLandmarks} from './RegionalScenery';
import {syncForestTerrain} from './Terrain';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
afterEach(resetHeightmap);
it('a foundation clears individual vegetation instances inside its site and keeps surrounding trees',()=>{
 const w=new World(18,false,[],[],[],false),root=new THREE.Group(),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),2),matrix=new THREE.Matrix4();mesh.setMatrixAt(0,matrix);mesh.setMatrixAt(1,matrix.makeTranslation(70,0,0));mesh.userData.vegetationPoints=[{x:0,z:0},{x:70,z:0}];mesh.userData.vegetationMatrices=mesh.instanceMatrix.array.slice();root.add(mesh);const b=w.spawn('generator',0,0,0);b.underConstruction=true;w.terrain.clearBuilding(b);syncForestTerrain(root,w);const p=new THREE.Vector3(),r=new THREE.Quaternion(),s=new THREE.Vector3();mesh.getMatrixAt(0,matrix);matrix.decompose(p,r,s);expect(s.length()).toBe(0);mesh.getMatrixAt(1,matrix);matrix.decompose(p,r,s);expect(s.x).toBe(1);expect(syncForestTerrain(root,w)).toBe(false);b.dead=true;w.entities.splice(w.entities.indexOf(b),1);syncForestTerrain(root,w);mesh.getMatrixAt(0,matrix);matrix.decompose(p,r,s);expect(s.length()).toBe(0);
});
it('village focal props clear through the same foundation clearing path as natural scenery',()=>{
 const root=createSettlementLandmarks([{id:'well',kind:'cover',appearance:'yard',x:0,z:0,width:18,depth:22,landmark:'well'}]);
 const w=new World(18,false,[],[],[],false),b=w.spawn('generator',0,0,0);b.underConstruction=true;w.terrain.clearBuilding(b);syncForestTerrain(root,w);
 let hidden=0;root.traverse(o=>{if(o instanceof THREE.InstancedMesh){const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();o.getMatrixAt(0,m);m.decompose(p,q,s);expect(s.length()).toBe(0);hidden++;}});expect(hidden).toBe(1);
});

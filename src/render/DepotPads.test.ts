import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {createDepotPad} from './DepotPads';
import {renderedGroundHeightAt} from './GroundSurface';
import {resetHeightmap} from '../sim/heightmap';
afterEach(resetHeightmap);
it('marked landing surface and H conform to the rendered terrain at the actual leased coordinates',()=>{
 const pad=createDepotPad({x:40,z:25,heading:Math.PI/3,slot:2});pad.updateMatrixWorld(true);
 expect(pad.name).toBe('DepotHelicopterPad-2');expect(pad.children).toHaveLength(5);
 const p=new THREE.Vector3();let vertices=0;
 pad.traverse(o=>{if(o instanceof THREE.Mesh){const positions=o.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);const above=p.y-renderedGroundHeightAt(p.x,p.z);expect(above).toBeGreaterThan(.025);expect(above).toBeLessThan(.08);vertices++;}}});expect(vertices).toBeGreaterThan(100);
 const bounds=new THREE.Box3().setFromObject(pad);expect((bounds.min.x+bounds.max.x)/2).toBeCloseTo(40);expect((bounds.min.z+bounds.max.z)/2).toBeCloseTo(25);
});

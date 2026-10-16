import {createChinook} from '../../src/render/Chinook';
import * as THREE from 'three';
const model=createChinook();model.updateMatrixWorld(true);
const triangles:Array<{p:number[];c:number[]}>=[];
model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const p=o.geometry.getAttribute('position'),idx=o.geometry.index,material=o.material as THREE.MeshStandardMaterial;
 for(let i=0;i<(idx?.count??p.count);i+=3){const a:number[]=[];for(let k=0;k<3;k++){const v=new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(o.matrixWorld);a.push(v.x,v.y,v.z);}triangles.push({p:a,c:[material.color.r,material.color.g,material.color.b]});}});
process.stdout.write(JSON.stringify(triangles));

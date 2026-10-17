import * as THREE from 'three';
import {batchStaticScene} from './Architecture';
import type {MapResourceDef} from '../sim/types';

/** Compact civilian production sites. Every component fits the 13 × 12 m navigation footprint. */
export function createResourceIndustry(kind:MapResourceDef['facility']):THREE.Group {
 const g=new THREE.Group();
 const materials={wall:new THREE.MeshStandardMaterial({color:0xb5aa8e,roughness:.86}),roof:new THREE.MeshStandardMaterial({color:0x53666b,roughness:.72}),steel:new THREE.MeshStandardMaterial({color:0x8e9898,metalness:.5,roughness:.5}),dark:new THREE.MeshStandardMaterial({color:0x353c3b,roughness:.9}),ochre:new THREE.MeshStandardMaterial({color:0xb58b43,roughness:.8}),glass:new THREE.MeshStandardMaterial({color:0x426b78,metalness:.25,roughness:.3})};
 type Material=keyof typeof materials;
 const add=(geo:THREE.BufferGeometry,m:Material,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(geo,materials[m]);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:Material)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const cylinder=(x:number,y:number,z:number,r:number,h:number,m:Material)=>add(new THREE.CylinderGeometry(r,r,h,12),m,x,y,z);
 box(0,.15,0,12.8,.3,11.8,'dark');
 if(kind==='oilfield'){
  box(-3,1.7,-1,5,3.1,6,'wall');box(-3,3.35,-1,5.3,.25,6.3,'roof');
  for(const z of [-3,2]){cylinder(3,1.8,z,1.75,3.2,'steel');cylinder(3,3.45,z,1.8,.15,'roof');}
  cylinder(-4,6.4,3.5,.75,6,'steel');cylinder(-1.5,5.3,3.5,.55,4,'steel');
  for(const z of [-4,0,4]){box(0,1,z,7,.22,.22,'ochre');box(0,2.1,z,.2,2.2,.2,'steel');}
 }else if(kind==='mine'){
  box(-2,2,-1,6,3.7,7,'wall');box(-2,4,-1,6.4,.3,7.4,'roof');
  for(const z of [-3,1]){cylinder(3.5,3,z,1.5,5.5,'ochre');add(new THREE.ConeGeometry(1.5,1.2,12),'dark',3.5,6.3,z);}
  const conveyor=box(.4,3.2,3.5,8,.5,1.3,'dark');conveyor.rotation.z=.22;
  for(const x of [-2,1,4])box(x,1.6,3.5,.2,3.2,.2,'steel');
 }else{
  box(-1,2,0,9,3.7,10,'wall');
  for(const x of [-4,-1,2]){const roof=box(x,4.1,0,3.1,.3,10.5,'roof');roof.rotation.z=-.12;box(x,3.8,-4.9,2,.55,.12,'glass');}
  box(4.5,1.4,-2,2.2,2.5,5,'wall');box(4.5,2.8,-2,2.5,.25,5.3,'roof');
  for(const x of [-3,1]){box(x,1.45,5.08,2.2,2.6,.12,'dark');box(x,.35,5.4,2.5,.4,1,'steel');}
  if(kind==='factory'){cylinder(4.5,5,2,.55,7,'steel');box(-1,4.5,1,3,.7,2,'steel');}
  else for(const x of [-4,-1,2]){box(x,.8,-5.4,1.5,1,.8,'ochre');box(x,2,-5.4,1.5,1,.8,'ochre');}
 }
 for(const x of [-3,-1,1])box(x,2.8,-5.1,1.1,.7,.12,'glass');
 return batchStaticScene(g);
}

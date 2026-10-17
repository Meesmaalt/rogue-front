import * as THREE from 'three';
import {CharacterGeometry} from './CharacterGeometry';
import {getTerrainRegion} from '../sim/heightmap';
import {REGIONS} from '../sim/regions';
import {batchStaticScene} from './Architecture';
import type {MapResourceDef} from '../sim/types';

/** Compact civilian production sites. Every component fits the 13 × 12 m navigation footprint. */
export function createResourceIndustry(kind:MapResourceDef['facility']):THREE.Group {
 const g=new THREE.Group(),region=getTerrainRegion(),profile=region?REGIONS[region]:undefined;
 const materials={wall:new THREE.MeshStandardMaterial({color:profile?.facade??0xb5aa8e,roughness:.86}),roof:new THREE.MeshStandardMaterial({color:region==='siberia'?0x8d9da2:region==='desert'?0x99856a:0x53666b,roughness:.72}),steel:new THREE.MeshStandardMaterial({color:0x8e9898,metalness:.5,roughness:.5}),dark:new THREE.MeshStandardMaterial({color:0x353c3b,roughness:.9}),ochre:new THREE.MeshStandardMaterial({color:0xb58b43,roughness:.8}),glass:new THREE.MeshStandardMaterial({color:0x426b78,metalness:.25,roughness:.3})};
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
 const details=new CharacterGeometry(),steel=0x8e9690,rust=region==='siberia'?0x8a9694:0x997853;
 const detailBox=details.box.bind(details);
 if(kind==='oilfield'){
  for(const z of [-3,2])for(const y of [1.1,2.7])details.add(new THREE.TorusGeometry(1.76,.055,4,12),rust,3,y,z,Math.PI/2);
  for(let y=.6;y<8.8;y+=.55)detailBox(.65,.06,.12,steel,-4,y,4.3);for(const x of [-4.4,-3.6])detailBox(.1,8.8,.12,steel,x,4.4,4.3);
  for(const z of [-3.5,1.5]){details.add(new THREE.TorusGeometry(.3,.055,5,10),0xa76e44,.3,1.1,z,0,Math.PI/2);detailBox(.6,.1,.1,steel,0,1.1,z);}
 }else if(kind==='mine'){
  for(let y=.5;y<5.5;y+=.5)detailBox(.6,.06,.12,steel,5.1,y,1);for(const x of [4.7,5.5])detailBox(.08,5.5,.1,steel,x,2.75,1);
  for(const x of [-2,0,2,4])details.add(new THREE.CylinderGeometry(.16,.16,1.5,7),steel,x,3.1+x*.21,3.5,Math.PI/2);
  detailBox(2.3,.18,1.5,rust,3.7,6.95,-1);detailBox(.12,1,.12,steel,4.6,6.4,-1);
 }else{
  detailBox(8,.16,.7,rust,-1,3.5,5.45);for(const x of [-4.5,2.5])detailBox(.12,3.6,.12,steel,x,1.8,5.7);
  for(const x of [-3,1])for(const side of [-1,1])for(let y=.5;y<2.8;y+=.32)detailBox(.12,.12,.13,y%0.64<.32?0xc4ad60:0x353d39,x+side*1.2,y,5.21);
  for(const x of [-3,0,2]){detailBox(1.2,.45,1.4,steel,x,4.6,1);for(let z=.5;z<1.6;z+=.25)detailBox(1,.035,.1,0x3d4541,x,4.85,z);}
 }
 const detailMesh=new THREE.Mesh(details.finish(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83,metalness:.16}));detailMesh.castShadow=detailMesh.receiveShadow=true;g.add(detailMesh);
 const result=batchStaticScene(g),lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,7,5),new THREE.MeshBasicMaterial({color:0x78847b}));lamp.name='IndustrySignal';lamp.position.set(-5.4,4.1,4.6);lamp.visible=false;result.add(lamp);return result;
}

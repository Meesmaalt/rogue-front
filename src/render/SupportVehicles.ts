import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {UnitKind,Team} from '../sim/types';

/** Small unarmed support silhouettes; static pieces are batched by material. */
export function createSupportVehicle(kind:UnitKind,team:Team):{group:THREE.Group;turret:null}|null {
 if(kind!=='transportVan'&&kind!=='scoutHeli')return null;
 const group=new THREE.Group(),body=team===0?0x677653:0x76664c,accent=team===0?0x78cce7:0xe87965;
 const materials=new Map<number,THREE.MeshStandardMaterial>(),parts=new Map<number,THREE.BufferGeometry[]>();
 const material=(color:number)=>{let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.8});materials.set(color,m);}return m;};
 const part=(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,rz=0,rx=0)=>{
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new THREE.Vector3(1,1,1));
  geometry.applyMatrix4(matrix);const list=parts.get(color)??[];list.push(geometry);parts.set(color,list);
 };
 const box=(w:number,h:number,d:number,color:number,x:number,y:number,z:number)=>part(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 if(kind==='transportVan'){
  group.name='InfantryTransportVan';
  box(1.9,1.32,3.6,body,0,1.08,-.25);box(1.9,.65,1.05,body,0,.75,1.98);
  box(1.74,.58,.08,0x263d49,0,1.43,1.6);box(.055,.55,.85,0x263d49,-.96,1.43,1.08);box(.055,.55,.85,0x263d49,.96,1.43,1.08);
  box(1.98,.2,.16,0x242a2c,0,.42,2.53);box(1.1,.28,.08,0x242a2c,0,.76,2.52);
  for(const x of [-.73,.73])box(.32,.18,.09,0xe5d9a6,x,.83,2.53);
  for(const x of [-1,1])for(const z of [-1.28,1.36])part(new THREE.CylinderGeometry(.42,.42,.24,10),0x262b2c,x,.43,z,Math.PI/2);
  for(const x of [-.47,.47])box(.85,1.06,.055,body,x,1.04,-2.08);
  box(.08,.65,.065,0x222829,0,1.12,-2.12);box(.16,.32,.06,accent,.69,1.16,-2.14);
  box(1.7,.06,2.1,0x444c3f,0,1.78,-.55);
 }else{
  group.name='ScoutHelicopter';
  part(new THREE.SphereGeometry(1,12,8),body,0,1.25,.25);
  box(1.3,.76,1.42,0x263e4a,0,1.48,.86);
  box(.4,.3,3.5,body,0,1.2,-2.1);box(.09,1.12,.65,body,0,1.74,-3.72);box(1.5,.08,.5,body,0,1.2,-2.9);
  for(const x of [-.86,.86]){box(.12,.12,2.7,0x31383a,x,.18,.1);box(.09,.7,.09,0x31383a,x,.52,-.65);box(.09,.7,.09,0x31383a,x,.52,.75);}
  box(.18,.8,.18,0x31383a,0,2.15,0);part(new THREE.SphereGeometry(.28,8,6),0x303b3e,0,2.68,0);box(.21,.18,.08,0x466b73,0,2.68,.26);
  const rotor=new THREE.Group();rotor.name='RotorMain';rotor.position.set(0,2.45,0);
  for(const angle of [0,Math.PI/2]){const blade=new THREE.Mesh(new THREE.BoxGeometry(6.3,.045,.15),material(0x303638));blade.rotation.y=angle;rotor.add(blade);}group.add(rotor);
  const tail=new THREE.Group();tail.name='TailRotor';tail.position.set(.18,1.55,-3.66);
  for(const angle of [0,Math.PI/2]){const blade=new THREE.Mesh(new THREE.BoxGeometry(.045,1.1,.1),material(0x303638));blade.rotation.x=angle;tail.add(blade);}group.add(tail);
  box(.08,.25,.55,accent,.95,1.3,-.2);
 }
 for(const [color,geometries] of parts){const geometry=mergeGeometries(geometries);if(geometry){const mesh=new THREE.Mesh(geometry,material(color));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}for(const g of geometries)g.dispose();}
 return {group,turret:null};
}

import * as THREE from 'three';
import {CharacterGeometry} from './CharacterGeometry';
import type {MapFeatureDef} from '../sim/mapFeatures';
const cache=new Map<string,THREE.BufferGeometry>();
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94});material.userData.sharedArt=true;
/** Landmarks are actual bounded map structures, not giant decorative pathfinding surprises. */
export function createLandmarkStructure(f:MapFeatureDef):THREE.Group {
 const key=[f.landmarkStructure,f.facadeColor,f.color].join('/');let geometry=cache.get(key);
 if(!geometry){
  const g=new CharacterGeometry(),wall=f.facadeColor??0xb6aa8a,roof=f.color??0x8c785f,dark=0x41483e,wood=0x75634d;
  const box=g.box.bind(g),pillar=(x:number,z:number,h:number)=>box(.38,h,.38,wood,x,h/2,z);
  box(f.width,2,f.depth,0x8c897b,0,-.6,0);
  if(f.landmarkStructure==='chapel'){
   box(7.2,4.5,9.2,wall,0,2.25,0);for(const side of [-1,1])box(4.3,.22,9.5,roof,side*1.9,5.2,0,-side*.48);
   box(2.8,12.8,3,wall,-2,6.4,-2.8);box(3.1,.3,3.3,0xc5bca5,-2,11.1,-2.8);
   for(const side of [-1,1])box(1.4,1.7,.04,dark,-2,11.9,-2.8+side*1.51);
   g.add(new THREE.ConeGeometry(2.05,2.8,4),roof,-2,14.1,-2.8,0,Math.PI/4);
   box(.13,1.5,.13,dark,-2,16.15,-2.8);box(.85,.13,.13,dark,-2,16.45,-2.8);
   box(1.6,2.5,.12,dark,0,1.25,4.66);for(const side of [-1,1])for(const z of [-2,1.5])box(.08,1.3,.65,dark,side*3.65,2.9,z);
  }else if(f.landmarkStructure==='lookout'){
   for(const x of [-2.8,2.8])for(const z of [-2.8,2.8]){pillar(x,z,15);g.beam(new THREE.Vector3(x,1,z),new THREE.Vector3(-x,14,z),.2,wood);}
   box(7.5,.4,7.5,wood,0,15,0);box(5.5,2.5,5.5,wall,0,16.4,0);
   for(const side of [-1,1]){box(4.7,.8,.08,0x637a7c,0,16.7,side*2.78);box(.08,.8,4.7,0x637a7c,side*2.78,16.7,0);}
   for(const side of [-1,1])box(4.2,.18,7.7,roof,side*1.9,18.9,0,-side*.35);
   for(let y=.5;y<15;y+=.5)box(1.1,.09,.18,wood,0,y,2.95);for(const x of [-.65,.65])box(.12,15,.15,wood,x,7.5,2.95);
  }else if(f.landmarkStructure==='waterTower'){
   for(const x of [-2.9,2.9])for(const z of [-2.9,2.9]){box(.32,11,.32,roof,x,5.5,z);g.beam(new THREE.Vector3(x,1,z),new THREE.Vector3(-x,10,z),.14,roof);}
   g.add(new THREE.CylinderGeometry(3.8,3.8,4.3,16),wall,0,12.8,0);g.add(new THREE.ConeGeometry(3.9,1.1,16),roof,0,15.4,0);
   for(const y of [10.9,13,14.6])g.add(new THREE.TorusGeometry(3.82,.09,4,16),roof,0,y,0,Math.PI/2);
   for(let y=.5;y<15;y+=.5)box(.8,.07,.13,roof,3.1,y,0);for(const z of [-.48,.48])box(.1,15,.13,roof,3.1,7.5,z);
  }else{
   box(7.8,10.7,7.8,wall,0,5.35,0);box(8.7,.5,8.7,roof,0,10.9,0);
   for(const side of [-1,1])for(const p of [-3.5,-1.8,0,1.8,3.5]){box(.8,1.3,.8,wall,p,11.8,side*3.8);box(.8,1.3,.8,wall,side*3.8,11.8,p);}
   box(1.4,2.6,.1,dark,0,1.3,3.96);for(const y of [4.5,8])for(const side of [-1,1]){box(.15,1,.1,dark,side*2,y,3.96);box(.1,1,.15,dark,side*3.96,y,1);}
   box(2.6,.2,2.2,wood,0,3,3.3);box(.12,1.5,.12,wood,1.1,2,3.8);box(.12,1.5,.12,wood,-1.1,2,3.8);
   g.add(new THREE.CylinderGeometry(.05,.07,1.5,5),wood,1.5,13,1.5);box(1,.5,.04,0xaa7856,2,13.5,1.5);
  }
  geometry=g.finish();geometry.userData.sharedArt=true;cache.set(key,geometry);
 }
 const root=new THREE.Group(),mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);root.userData.structureId=f.id;root.userData.structureHeight=f.height;return root;
}

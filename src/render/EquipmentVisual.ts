import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Entity} from '../sim/types';
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:.2});material.userData.sharedArt=true;
const cache=new Map<string,THREE.BufferGeometry>();
/** Small merged attachments share one material and geometry across identical refits. */
export function syncEquipmentVisual(root:THREE.Object3D,u:Entity):boolean {
 if(root.userData.equipmentState===u.equipment)return false;
 root.userData.equipmentState=u.equipment;const old=root.getObjectByName('EquipmentKit');if(old)root.remove(old);
 if(!u.equipment)return true;
 const key=u.kind+'/'+JSON.stringify(u.equipment);let geometry=cache.get(key);
 if(!geometry){
  const parts:THREE.BufferGeometry[]=[],radius=u.def.radius,height=u.def.height;
  const part=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{
   const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);const colors=new Float32Array(g.attributes.position.count*3),tint=new THREE.Color(color);
   for(let i=0;i<g.attributes.position.count;i++)tint.toArray(colors,i*3);g.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(g);
  };
  if(['reactive','reinforced'].includes(u.equipment.protection??''))for(const side of [-1,1])for(let i=0;i<3;i++)part(.2,height*.3,radius*.6,side*radius*.8,height*.42,(i-1)*radius*.65,0x737c64);
  if(u.equipment.protection==='aps')for(const side of [-1,1]){part(.6,.3,.6,side*radius*.65,height*.8,0,0x596b61);part(.1,.7,.1,side*radius*.65,height*.95,0,0xb9c2b1);}
  if(u.equipment.mobility==='engine')part(radius*.9,.18,radius*.5,0,height*.65,-radius*.8,0x353f3b);
  if(u.equipment.weapon&&u.equipment.weapon!=='standard'){
   if(u.def.squadSize||u.squadMaxMembers)part(.7,.55,1.1,.5,.6,.7,0x555f4c);
   else for(const side of [-1,1])part(.45,.4,radius*.8,side*radius*.7,height*.65,radius*.2,0x68776a);
  }
  if(!parts.length)return true;geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());geometry.userData.sharedArt=true;cache.set(key,geometry);
 }
 const mesh=new THREE.Mesh(geometry,material);mesh.name='EquipmentKit';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return true;
}

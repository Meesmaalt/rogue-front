import * as THREE from 'three';
import config from '../data/world-character.json';
import type {UnitKind} from '../sim/types';
import type {FactionId} from '../sim/factions';
const airborne=new Set<UnitKind>(['fighter','interceptor','multirole','attackAircraft','ecm','bomber','heli','gunship','casHeli','transport','cargoPlane','airTransport','scoutHeli']);
/** Bake restrained wear once into cached armour vertices; glass, markings, moving pivots and source maps stay intact. */
export function applyModelCharacter(root:THREE.Object3D,kind:UnitKind,faction:FactionId):void {
 if(root.userData.characterBaked)return;root.userData.characterBaked=true;
 const flight=airborne.has(kind),tint=new THREE.Color(flight?0x929b98:0x958971),seed=faction==='usa'?17:faction==='russia'?41:73;
 root.traverse(o=>{
  if(!(o instanceof THREE.Mesh)||Array.isArray(o.material)||!(o.material instanceof THREE.MeshStandardMaterial)||o.material.name!=='armor')return;
  const source=o.geometry;if(source.userData.characterBaked)return;const geometry=source.clone();geometry.computeBoundingBox();const box=geometry.boundingBox!,position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),original=geometry.getAttribute('color'),colors=new Float32Array(position.count*3),height=Math.max(.1,box.max.y-box.min.y);
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i),lower=1-Math.max(0,Math.min(1,(y-box.min.y)/height)),hash=(Math.sin(x*23.4+z*19.7+y*13.1+seed)*431.7)%1,up=normal?Math.max(0,normal.getY(i)):0;
   const dirt=(flight?up*.035:Math.pow(lower,2)*config.wear.vehicleDust),edge=(Math.abs(hash)>.83?config.wear.vehicleEdgeWear:0)*(flight?.5:1);
   const c=new THREE.Color(original?.getX(i)??1,original?.getY(i)??1,original?.getZ(i)??1);c.lerp(tint,dirt).multiplyScalar(1-edge);c.toArray(colors,i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.userData={...source.userData,sharedArt:true,characterBaked:true};o.geometry=geometry;
 });
}

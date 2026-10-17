import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Vertex-painted static detail uses one material instead of a mesh per bolt or plank. */
export class CharacterGeometry {
 private readonly parts:THREE.BufferGeometry[]=[];
 add(geometry:THREE.BufferGeometry,color:number,x=0,y=0,z=0,rx=0,ry=0,rz=0):void {
  geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
  const g=geometry.index?geometry.toNonIndexed():geometry;if(g!==geometry)geometry.dispose();const tint=new THREE.Color(color),colors=new Float32Array(g.getAttribute('position').count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=tint.r;colors[i+1]=tint.g;colors[i+2]=tint.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));this.parts.push(g);
 }
 box(w:number,h:number,d:number,color:number,x=0,y=0,z=0,rz=0):void {this.add(new THREE.BoxGeometry(w,h,d),color,x,y,z,0,0,rz);}
 beam(a:THREE.Vector3,b:THREE.Vector3,width:number,color:number):void {
  const delta=b.clone().sub(a),g=new THREE.BoxGeometry(width,delta.length(),width);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));const p=a.clone().add(b).multiplyScalar(.5);this.add(g,color,p.x,p.y,p.z);
 }
 finish():THREE.BufferGeometry {const result=mergeGeometries(this.parts)!;this.parts.forEach(g=>g.dispose());result.computeBoundingBox();result.computeBoundingSphere();return result;}
}

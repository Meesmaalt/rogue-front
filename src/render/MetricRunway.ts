import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BATTLE_SCALE} from '../sim/battleScale';
import {heightAt} from '../sim/heightmap';
import type {Entity} from '../sim/types';
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});material.userData.sharedArt=true;
/** One static draw; local geometry follows the exact simulated facility heading. */
export function createMetricRunway(pad:Entity):THREE.Mesh {
 const pieces:THREE.BufferGeometry[]=[];
 const start=BATTLE_SCALE.aircraft.runwayStart,end=BATTLE_SCALE.aircraft.runwayEnd;
 function strip(width:number,length:number,forward:number,color:number){
  const g=new THREE.PlaneGeometry(width,length,1,Math.max(1,Math.ceil(length/12))).rotateX(-Math.PI/2),p=g.attributes.position,c=new THREE.Color(color),colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i)+forward;const wx=pad.x+Math.cos(pad.heading)*x+Math.sin(pad.heading)*z,wz=pad.z-Math.sin(pad.heading)*x+Math.cos(pad.heading)*z;p.setXYZ(i,x,heightAt(wx,wz)-pad.y+.07,z);colors.set([c.r,c.g,c.b],i*3);}
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(g);
 }
 strip(BATTLE_SCALE.aircraft.runwayWidth,end-start,(start+end)/2,0x3b4142);
 for(let z=start+12;z<end-10;z+=24)strip(.65,10,z,0xdadacb);
 const geometry=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name='MetricRunway';mesh.receiveShadow=true;return mesh;
}

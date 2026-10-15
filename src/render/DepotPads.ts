import * as THREE from 'three';
import {visibleDepotPads,type DepotPad} from '../sim/depotPads';
import type {World} from '../sim/World';
import type {Entity} from '../sim/types';
import rules from '../data/logistics.json';
import {renderedGroundHeightAt,groundRectangle} from './GroundSurface';
const concrete=new THREE.MeshStandardMaterial({color:0x586661,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
const paint=new THREE.MeshStandardMaterial({color:0xe0e1c9,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
const colors=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6});
const baseColors=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-.5,polygonOffsetUnits:-1});
for(const m of [concrete,paint,colors,baseColors])m.userData.sharedArt=true;
export function createDepotPad(p:DepotPad):THREE.Group {
 const group=new THREE.Group();group.name=`DepotHelicopterPad-${p.slot}`;const r=rules.handling.padRadius;
 const surface=(geometry:THREE.BufferGeometry,material:THREE.Material,offset:number)=>{
  const pos=geometry.getAttribute('position'),c=Math.cos(p.heading),s=Math.sin(p.heading);
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),wx=p.x+x*c+z*s,wz=p.z-x*s+z*c;pos.setXYZ(i,wx,renderedGroundHeightAt(wx,wz)+offset,wz);}
  geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;group.add(mesh);
 };
 surface(new THREE.CircleGeometry(r,48).rotateX(-Math.PI/2),concrete,.035);
 surface(new THREE.RingGeometry(r*.81,r*.86,48).rotateX(-Math.PI/2),paint,.055);
 const origin={...p,y:0};
 for(const [left,right,start,end] of [[-2.3,-1.55,-3.3,3.3],[1.55,2.3,-3.3,3.3],[-1.55,1.55,-.4,.4]]){
  const mesh=new THREE.Mesh(groundRectangle(origin,left,right,start,end,0xe0e1c9,.07),colors);mesh.position.set(p.x,0,p.z);mesh.rotation.y=p.heading;group.add(mesh);
 }
 group.userData.slot=p.slot;return group;
}
/** Local geometry shared by the finished depot and its construction ghost. */
export function createDepotBase(depot:Pick<Entity,'x'|'y'|'z'|'heading'>,pads:readonly DepotPad[],level=0):THREE.Mesh {
 const r=rules.handling,c=Math.cos(depot.heading),s=Math.sin(depot.heading);
 let left=-r.baseHalfWidth,right=r.baseHalfWidth,start=level>0?-12:-r.baseHalfDepth,end=r.baseHalfDepth;
 for(const p of pads){const dx=p.x-depot.x,dz=p.z-depot.z,x=c*dx-s*dz,z=s*dx+c*dz;left=Math.min(left,x-r.padRadius-1);right=Math.max(right,x+r.padRadius+1);start=Math.min(start,z-r.padRadius-1);end=Math.max(end,z+r.padRadius+1);}
 const base=new THREE.Mesh(groundRectangle(depot,left,right,start,end,0x747b70,.025),baseColors);base.name='DepotSharedFoundation';return base;
}
/** Markings use the exact slots leased by the simulation, including additional occupied pads. */
export class DepotPads {
 readonly group=new THREE.Group();private stamp=-Infinity;private key='';
 constructor(scene:THREE.Scene){this.group.name='DepotLandingPads';scene.add(this.group);}
 sync(w:World):void {
  if(w.time>=this.stamp&&w.time-this.stamp<.5)return;this.stamp=w.time;
  const depots=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.kind==='supply'&&e.team===w.playerTeam);
  const pads=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.kind==='supply'&&e.team===w.playerTeam).flatMap(e=>visibleDepotPads(w,e).map(p=>({...p,depotId:e.id})));
  const key=pads.map(p=>`${p.depotId}/${p.slot}/${p.x}/${p.z}/${p.heading}`).join('|')+depots.map(e=>`/${e.id}/${w.supplyDepotLevel(e)}`).join('');if(key===this.key)return;this.key=key;
  this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.group.clear();
  for(const depot of depots){
   const base=createDepotBase(depot,pads.filter(p=>p.depotId===depot.id),w.supplyDepotLevel(depot));base.position.set(depot.x,depot.y,depot.z);base.rotation.y=depot.heading;this.group.add(base);
  }
  for(const p of pads)this.group.add(createDepotPad(p));
 }
}

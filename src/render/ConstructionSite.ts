import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import policy from '../data/construction-policy.json';
import type {Entity} from '../sim/types';

const cfg=policy.visual;
/** Temporary construction materials never mutate the shared building/camouflage cache. */
export class ConstructionSite {
 readonly group=new THREE.Group();
 private readonly plane=new THREE.Plane(new THREE.Vector3(0,-1,0),0);
 private readonly originals=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
 private readonly copies=new Map<THREE.Material,THREE.Material>();
 private readonly foundation=new THREE.Group();
 private readonly scaffold=new THREE.Group();
 private readonly stores=new THREE.Group();
 private readonly height:number;
 private readonly baseY:number;
 constructor(private readonly parent:THREE.Object3D,models:THREE.Object3D[]){
  this.group.name='ConstructionSite';
  parent.updateWorldMatrix(true,true);
  const inverse=parent.matrixWorld.clone().invert(),bounds=new THREE.Box3(),part=new THREE.Box3(),matrix=new THREE.Matrix4();
  for(const model of models)model.traverse(o=>{
   if(!(o instanceof THREE.Mesh)||!o.geometry.getAttribute('position'))return;
   o.geometry.computeBoundingBox();if(o.geometry.boundingBox){matrix.multiplyMatrices(inverse,o.matrixWorld);part.copy(o.geometry.boundingBox).applyMatrix4(matrix);bounds.union(part);}
   this.originals.set(o,o.material);
   const clone=(m:THREE.Material)=>{let copy=this.copies.get(m);if(!copy){copy=m.clone();copy.userData={...m.userData,sharedArt:false};copy.clippingPlanes=[this.plane];copy.clipShadows=true;copy.needsUpdate=true;this.copies.set(m,copy);}return copy;};
   o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);
  });
  if(bounds.isEmpty())bounds.set(new THREE.Vector3(-4,0,-4),new THREE.Vector3(4,6,4));
  this.height=Math.max(.5,bounds.max.y-bounds.min.y);this.baseY=bounds.min.y;
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),width=Math.min(cfg.scaffoldSpan,Math.max(3,size.x)),depth=Math.min(cfg.scaffoldSpan,Math.max(3,size.z));
  const concrete=new THREE.MeshStandardMaterial({color:0xa1957b,roughness:1}),steel=new THREE.MeshStandardMaterial({color:0x64716d,roughness:.72,metalness:.35}),timber=new THREE.MeshStandardMaterial({color:0x958266,roughness:1});
  const base=new THREE.Mesh(new THREE.BoxGeometry(width,cfg.baseHeight,depth),concrete);base.position.set(center.x,cfg.baseHeight/2,center.z);base.receiveShadow=true;this.foundation.add(base);
  const tubes:THREE.BufferGeometry[]=[],boards:THREE.BufferGeometry[]=[],crates:THREE.BufferGeometry[]=[];
  const box=(out:THREE.BufferGeometry[],w:number,h:number,d:number,x:number,y:number,z:number)=>out.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
  const x0=center.x-width/2-cfg.scaffoldGap,x1=center.x+width/2+cfg.scaffoldGap,z0=center.z-depth/2-cfg.scaffoldGap,z1=center.z+depth/2+cfg.scaffoldGap;
  const floors=Math.min(cfg.maxFloors,Math.max(1,Math.ceil(this.height/cfg.floorHeight))),top=Math.min(cfg.scaffoldHeight,this.height);
  // Four sides share one steel batch and one board batch regardless of building size.
  for(const x of [x0,x1])for(const z of [z0,z1])box(tubes,.12,top,.12,x,top/2,z);
  for(let floor=1;floor<=floors;floor++){
   const y=top*floor/floors;
   for(const z of [z0,z1]){box(tubes,x1-x0,.09,.09,center.x,y+.7,z);box(boards,x1-x0,.12,.6,center.x,y,z);}
   for(const x of [x0,x1]){box(tubes,.09,.09,z1-z0,x,y+.7,center.z);box(boards,.6,.12,z1-z0,x,y,center.z);}
  }
  const batch=(geometries:THREE.BufferGeometry[],material:THREE.Material,target:THREE.Group)=>{
   const merged=mergeGeometries(geometries);for(const g of geometries)g.dispose();if(!merged)return;
   const mesh=new THREE.Mesh(merged,material);mesh.castShadow=false;mesh.receiveShadow=true;target.add(mesh);
  };
  batch(tubes,steel,this.scaffold);batch(boards,timber,this.scaffold);
  for(let i=0;i<3;i++)box(crates,.9,.65,.8,x0+.8+i, .35,z0+.8);
  batch(crates,timber,this.stores);
  // Boundary stakes and striped boards stay visible while a crew is still on the way.
  const markers:THREE.BufferGeometry[]=[];
  for(const x of [x0,x1])for(const z of [z0,z1]){box(markers,.12,.9,.12,x,.45,z);box(markers,.65,.18,.12,x,.85,z);}
  batch(markers,new THREE.MeshStandardMaterial({color:0xd6ae5a,roughness:1}),this.group);
  this.group.add(this.foundation,this.scaffold,this.stores);parent.add(this.group);
 }
 update(e:Entity,progress:number,detailed:boolean):void {
  const p=Math.max(0,Math.min(1,progress)),structure=Math.max(0,Math.min(1,(p-policy.stages.foundationEnd)/(policy.stages.structureEnd-policy.stages.foundationEnd)));
  this.plane.constant=e.y+this.baseY+(p<policy.stages.clearingEnd?-.2:Math.max(.1,this.height*structure));
  this.foundation.visible=p>=policy.stages.clearingEnd;
  this.foundation.scale.y=Math.min(1,Math.max(.05,(p-policy.stages.clearingEnd)/(policy.stages.foundationEnd-policy.stages.clearingEnd)));
  this.scaffold.visible=detailed&&p>=policy.stages.foundationEnd&&p<cfg.scaffoldEnd;
  this.scaffold.scale.y=Math.max(.05,Math.min(1,(p-policy.stages.foundationEnd)/.15));
  this.stores.visible=detailed&&p>0&&p<cfg.scaffoldEnd;
 }
 dispose():void {
  for(const [mesh,material] of this.originals)mesh.material=material;
  for(const copy of this.copies.values())copy.dispose();this.copies.clear();this.originals.clear();
  this.parent.remove(this.group);
  const materials=new Set<THREE.Material>();
  this.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  for(const material of materials)material.dispose();this.group.clear();
 }
}

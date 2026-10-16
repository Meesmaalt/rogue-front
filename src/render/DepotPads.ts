import {depotFences,depotCompound,depotLayoutLevel} from '../sim/depotLayout';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {visibleDepotPads,type DepotPad} from '../sim/depotPads';
import type {World} from '../sim/World';
import type {Entity} from '../sim/types';
import rules from '../data/logistics.json';
import {renderedGroundHeightAt,groundRectangle} from './GroundSurface';
const concrete=new THREE.MeshStandardMaterial({color:0x586661,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
const paint=new THREE.MeshStandardMaterial({color:0xe0e1c9,roughness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
const colors=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6});
const baseColors=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-.5,polygonOffsetUnits:-1});
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
 // Only working surfaces are gravelled: keep the terrain visible between the pad and the warehouse.
 const pieces=[[-6,7,-7-(level>0?2:0),6],[-10,2,5,11],[0,13,9,16],[4,11,-3,12]].map(([l,r,a,b])=>groundRectangle(depot,l,r,a,b,0x8e8876,.025,2));
 const geometry=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());
 const base=new THREE.Mesh(geometry,baseColors);base.name='DepotSharedFoundation';base.userData.padCount=pads.length;return base;
}
/** Level-specific fence and gate posts; shared collision plan keeps every pad inside. */
export function createDepotFence(level:number):THREE.Group {
 const group=new THREE.Group();group.name='DepotCompoundLevel'+level;const height=level===3?1.9:level===2?1.65:1.45;
 for(const f of depotFences(level)){const horizontal=f.width>f.depth,length=Math.max(f.width,f.depth),n=Math.ceil(length/3),pieces:THREE.BufferGeometry[]=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number)=>pieces.push(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
  for(let i=0;i<=n;i++){const t=-length/2+i*length/n;box(.13,height,.13,horizontal?t:0,height/2,horizontal?0:t);}
  for(const y of [.35,height-.1])box(f.width,.06,f.depth,0,y,0);
  for(let i=1;i<n*2;i++){const t=-length/2+i*length/(n*2);box(.025,height-.4,.025,horizontal?t:0,height/2+.1,horizontal?0:t);}
  const geo=mergeGeometries(pieces,false)!;pieces.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geo,fenceMaterial),panel=new THREE.Group();panel.name='FencePanel';panel.userData.axis=horizontal?'x':'z';panel.position.set(f.x,0,f.z);panel.add(mesh);group.add(panel);
 }
 const b=depotCompound(level);group.userData.bounds=b;return group;
}
const fenceMaterial=new THREE.MeshStandardMaterial({color:0x65716b,roughness:.9});
/** Markings use the exact slots leased by the simulation, including additional occupied pads. */
export class DepotPads {
 readonly group=new THREE.Group();
 private readonly transitions=new THREE.Group();private layouts=new Map<number,{level:number;fence:THREE.Group}>();private animations:Array<{root:THREE.Group;at:number;old:boolean}>=[];
 onRebuild:(x:number,z:number)=>void=()=>{};/** Pads per own depot, refreshed with the markings; BaseLife seats one crew per pad. */readonly padsByDepot=new Map<number,DepotPad[]>();private stamp=-Infinity;private key='';
 constructor(scene:THREE.Scene){this.group.name='DepotLandingPads';scene.add(this.group,this.transitions);}
 private animate(time:number):void {
  this.animations=this.animations.filter(a=>{if(!a.root.parent)return false;const t=(time-a.at)/1.8;a.root.children.forEach((panel,i)=>{const p=Math.max(0,Math.min(1,t*1.8-i*.035));if(a.old){panel.rotation[panel.userData.axis as 'x'|'z']=Math.min(Math.PI/2,p*Math.PI)*((i%2)?1:-1);panel.position.y=-p*.12;panel.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).opacity=Math.max(0,1-p*1.3);});}else panel.scale.y=Math.max(.015,Math.min(1,(t-.2)*1.6-i*.04));});if(t<1)return true;if(a.old){a.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});a.root.removeFromParent();}else a.root.children.forEach(p=>p.scale.y=1);return false;});
 }
 sync(w:World):void {
  this.animate(w.time);
  if(w.time>=this.stamp&&w.time-this.stamp<.5)return;this.stamp=w.time;
  const depots=w.entities.filter(e=>!e.dead&&(!e.underConstruction||e.upgrading)&&e.kind==='supply'&&e.team===w.playerTeam);
  const pads=w.entities.filter(e=>!e.dead&&(!e.underConstruction||e.upgrading)&&e.kind==='supply'&&e.team===w.playerTeam).flatMap(e=>visibleDepotPads(w,e).map(p=>({...p,depotId:e.id})));
  this.padsByDepot.clear();for(const depot of depots)this.padsByDepot.set(depot.id,pads.filter(p=>p.depotId===depot.id));
  const key=pads.map(p=>`${p.depotId}/${p.slot}/${p.x}/${p.z}/${p.heading}`).join('|')+depots.map(e=>`/${e.id}/${w.supplyDepotLevel(e)}`).join('');if(key===this.key)return;this.key=key;
  const changed=new Set<number>();for(const depot of depots){const prev=this.layouts.get(depot.id);if(prev&&prev.level!==depotLayoutLevel(depot)){changed.add(depot.id);const old=prev.fence;old.removeFromParent();old.traverse(o=>{if(o instanceof THREE.Mesh){const mat=(o.material as THREE.Material).clone();mat.transparent=true;mat.depthWrite=false;o.material=mat;}});this.transitions.add(old);this.animations.push({root:old,at:w.time,old:true});this.onRebuild(depot.x,depot.z);}}
  this.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.group.clear();this.layouts.clear();
  for(const depot of depots){
   const fence=createDepotFence(depotLayoutLevel(depot));fence.position.set(depot.x,depot.y+.04,depot.z);fence.rotation.y=depot.heading;this.group.add(fence);this.layouts.set(depot.id,{level:depotLayoutLevel(depot),fence});if(changed.has(depot.id)){fence.children.forEach(p=>p.scale.y=.015);this.animations.push({root:fence,at:w.time,old:false});}
   const base=createDepotBase(depot,pads.filter(p=>p.depotId===depot.id),w.supplyDepotLevel(depot));base.position.set(depot.x,depot.y,depot.z);base.rotation.y=depot.heading;this.group.add(base);
  }
  for(const p of pads)this.group.add(createDepotPad(p));
 }
}

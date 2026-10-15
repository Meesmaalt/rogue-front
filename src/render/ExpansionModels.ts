import * as THREE from 'three';
import type {UnitKind,Team} from '../sim/types';
import type {Model} from './models';
const materialCache=new Map<number,THREE.MeshStandardMaterial>();
function material(color:number):THREE.MeshStandardMaterial {let m=materialCache.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.85});m.userData.sharedArt=true;materialCache.set(color,m);}return m;}
export function createExpansionModel(kind:UnitKind,team:Team):Model|null {
 if(!['gunTurret','flakTurret','atTurret','missileCommand','icbmSilo','cruiseLauncher'].includes(kind))return null;
 const group=new THREE.Group();group.name=kind;const body=team===0?0x526756:0x71604e,accent=team===0?0x63b9df:0xe39871;
 const box=(parent:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color=body)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 const cylinder=(parent:THREE.Group,r:number,h:number,x:number,y:number,z:number,color=body)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),material(color));m.position.set(x,y,z);parent.add(m);return m;};
 let turret:THREE.Group|null=null;
 if(kind==='missileCommand'){
  box(group,15,4,10,0,2,0);box(group,8,2.5,8,2,5,0,0x737a71);box(group,15,.25,10,0,4.2,0,0x353c38);
  for(const x of [-5,0,5])box(group,3,2.8,.15,x,1.6,5.1,0x343b38);
  cylinder(group,.12,6,-6,7,-3,accent);const dish=new THREE.Mesh(new THREE.SphereGeometry(1.4,12,6,0,Math.PI*2,0,Math.PI/2),material(0x8c978a));dish.rotation.z=.7;dish.position.set(-6,9,-3);group.add(dish);
 }else if(kind==='icbmSilo'){
  cylinder(group,7,.5,0,.25,0,0x858b7b);cylinder(group,5,.7,0,.65,0,0x454c43);cylinder(group,4.4,.25,0,1.12,0,0x6b7368);
  box(group,.25,.08,8,0,1.3,0,accent);box(group,4,2.5,3,6,1.25,-4);for(const x of [-7,7])box(group,.2,1.8,.2,x,.9,4,accent);
 }else if(kind==='cruiseLauncher'){
  box(group,3.5,1.2,9,0,1.6,0);box(group,3.3,2.2,2.5,0,2.6,3.1);box(group,2.7,.7,.1,0,3,4.4,0x2c444c);
  for(const x of [-1.9,1.9])for(const z of [-3,-1,1,3]){const wheel=cylinder(group,.65,.42,x,.7,z,0x242a28);wheel.rotation.z=Math.PI/2;}
  turret=new THREE.Group();turret.name='Turret';turret.position.y=2.5;
  for(const x of [-.7,.7])for(const y of [.4,1.3]){const tube=box(turret,1,.75,6,x,y,-.3,0x414b40);tube.rotation.x=-.28;}group.add(turret);
 }else {
  cylinder(group,3.8,.5,0,.25,0,0x8c9184);cylinder(group,2.2,2.6,0,1.8,0);box(group,4.3,.45,4.3,0,3.2,0,0x454f44);
  turret=new THREE.Group();turret.name='Turret';turret.position.y=3.4;box(turret,2.1,1.1,2,0,.5,0);
  if(kind==='atTurret'){for(const x of [-1.1,1.1])box(turret,.7,.7,2.7,x,1,1,0x313a31);}
  else for(const x of kind==='flakTurret'?[-.55,.55]:[0]){const gun=cylinder(turret,.11,3,x,.9,2.2,0x263029);gun.name='Gun';gun.rotation.x=Math.PI/2;}
  box(turret,.3,.6,.4,.8,1.4,0,accent);group.add(turret);
 }
 return {group,turret};
}
const canopyMaterial=new THREE.MeshStandardMaterial({color:0xd3c4a0,side:THREE.DoubleSide,roughness:1});canopyMaterial.userData.sharedArt=true;
const canopyGeometry=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);canopyGeometry.userData.sharedArt=true;
export function createParachute(radius:number):THREE.Group {
 const group=new THREE.Group();group.name='AirdropParachute';const scale=Math.max(2,radius*2.4),height=scale*2.7,canopy=new THREE.Mesh(canopyGeometry,canopyMaterial);canopy.scale.set(scale,scale*.55,scale);canopy.position.y=height;group.add(canopy);
 const points:number[]=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;points.push(Math.cos(a)*scale,height,Math.sin(a)*scale,0,1,0);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x5e625a})));return group;
}

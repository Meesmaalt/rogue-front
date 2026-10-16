import layout from '../data/base-life.json';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const materials=new Map<number,THREE.MeshStandardMaterial>();
function mat(color:number):THREE.MeshStandardMaterial {let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.12});m.userData.sharedArt=true;m.userData.camouflage=color===0x626c45||color===0x78815b;materials.set(color,m);}return m;}
// Proportion reference: https://www.boeing.com/defense/military-rotorcraft/h-47-chinook
/** CH-47 silhouette in tactical scale: wide cargo body, raised aft pylon and two counter-rotating three-blade rotors. */
export function createChinook(tactical=false):THREE.Group {
 const root=new THREE.Group();root.name='CH47Chinook';const body=new THREE.Group();root.add(body);
 const olive=0x626c45,dark=0x242e29,glass=0x304d56,trim=0x78815b;
 const mesh=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(w:number,h:number,d:number,c:number,x:number,y:number,z:number)=>mesh(body,new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const sphere=(rx:number,ry:number,rz:number,c:number,x:number,y:number,z:number)=>{const m=mesh(body,new THREE.SphereGeometry(1,tactical?10:16,tactical?6:10),c,x,y,z);m.scale.set(rx,ry,rz);return m;};
 box(1.75,1.45,3.6,olive,0,1.22,.95);for(const side of [-1,1])box(.16,1.45,2.2,olive,side*.8,1.22,-1.95);box(1.75,.15,2.2,olive,0,.57,-1.95);box(1.75,.15,2.2,olive,0,1.94,-1.95);sphere(.89,.9,1.12,olive,0,1.35,2.45);
 box(1.2,.3,4.8,trim,0,2.04,-.15);
 // Broad rounded cockpit with two divided forward windscreens and side panes.
 sphere(.72,.48,.85,glass,0,1.83,2.75);box(.07,.85,.07,trim,0,1.9,3.36);
 for(const side of [-1,1]){
  sphere(.25,.38,2.2,olive,side*.9,.75,-.1);
  for(let i=0;i<5;i++){const pane=mesh(body,new THREE.CircleGeometry(.14,tactical?8:12),glass,side*.889,1.6,1.4-i*.8);pane.rotation.y=side*Math.PI/2;}
  const engine=mesh(body,new THREE.CylinderGeometry(.3,.34,1.35,tactical?10:16),trim,side*1.02,2.37,-2.2);engine.rotation.x=Math.PI/2;
  const exhaust=mesh(body,new THREE.CylinderGeometry(.22,.25,.35,10),dark,side*1.03,2.37,-2.96);exhaust.rotation.x=Math.PI/2;
  for(const z of [-2.05,2]){box(.1,.55,.12,dark,side*.82,.44,z);const wheel=mesh(body,new THREE.CylinderGeometry(.23,.23,.18,12),0x202725,side*.93,.23,z);wheel.rotation.z=Math.PI/2;}
 }
 box(.85,.52,1.15,olive,0,2.26,2.1);const aft=box(.95,1.2,1.4,olive,0,2.5,-2.55);aft.rotation.x=-.12;
 for(const side of [-1,1])box(.16,1.55,.65,olive,side*.8,1.25,-3.2);box(1.7,.16,.65,olive,0,2,-3.2);box(1.5,.08,.6,dark,0,.5,-3.2);box(1.4,.08,.04,dark,0,1.85,-3.2);box(.08,.15,1.3,trim,-.9,1.35,-2.8);
 if(!tactical){box(.06,.48,.06,dark,.45,2.5,.3);box(.06,.35,.06,dark,-.45,2.4,1.1);box(.4,.08,.65,dark,0,2.24,-.8);}
 // Merge the static hull by material, retaining the animated rotor pivots separately.
 body.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();body.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const a=o.geometry.clone().applyMatrix4(o.matrixWorld),g=a.index?a.toNonIndexed():a;if(g!==a)a.dispose();const parts=batches.get(o.material)??[];parts.push(g);batches.set(o.material,parts);o.geometry.dispose();}});body.clear();
 for(const [material,parts] of batches){const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());const m=new THREE.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;body.add(m);}
 for(const [index,z,y] of [[0,2.15,2.95],[1,-2.55,3.48]]){
  const rotor=new THREE.Group();rotor.name=index===0?'RotorMainFront':'RotorCounter';rotor.position.set(0,y,z);rotor.userData.rotationDirection=index===0?1:-1;root.add(rotor);
  mesh(rotor,new THREE.CylinderGeometry(.17,.22,.16,12),dark,0,0,0);
  for(let blade=0;blade<3;blade++){const arm=new THREE.Group();arm.rotation.y=blade*Math.PI*2/3+(index?Math.PI/3:0);rotor.add(arm);const m=mesh(arm,new THREE.BoxGeometry(.2,.045,4.05),dark,0,0,2.12);m.rotation.z=.01;mesh(arm,new THREE.BoxGeometry(.21,.047,.24),0xb9b7a0,0,0,4.02);}
 }
 const ramp=new THREE.Group();ramp.name='CargoRamp';ramp.userData.integrated=true;ramp.position.set(0,.5,-3.58);root.add(ramp);
 mesh(ramp,new THREE.BoxGeometry(1.48,1.5,.12),olive,0,.75,0);for(const x of [-.65,.65])mesh(ramp,new THREE.BoxGeometry(.07,1.45,.14),trim,x,.75,-.08);for(const y of [.15,.5,.85,1.2])mesh(ramp,new THREE.BoxGeometry(1.3,.055,.15),dark,0,y,-.09);
 root.scale.setScalar(layout.chinook.modelScale);root.userData.aircraftType='CH-47';root.userData.rotorBlades=3;return root;
}

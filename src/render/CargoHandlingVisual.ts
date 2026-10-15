import * as THREE from 'three';
const materials=new Map<number,THREE.MeshStandardMaterial>();
function mat(color:number){let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.8});m.userData.sharedArt=true;materials.set(color,m);}return m;}
function box(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,color:number){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);g.add(m);return m;}
export function createGroundHandler():THREE.Group {
 const g=new THREE.Group();g.name='AirportCargoLoader';box(g,1.9,.45,3.5,0,.7,0,0xc9a64f);box(g,1.4,.7,1,0,1.2,1.1,0xd3b45c);box(g,1.25,.5,.05,0,1.55,1.63,0x253b43);
 for(const x of [-1,1])for(const z of [-1.1,1.1]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.3,10),mat(0x242a27));m.rotation.z=Math.PI/2;m.position.set(x,.4,z);g.add(m);}
 const cargo=new THREE.Group();cargo.name='HandlingCargo';for(const x of [-.45,.45])for(const z of [-.7,0]){box(cargo,.8,.7,.65,x,1.4,z,0x838365);box(cargo,.82,.06,.67,x,1.75,z,0xb3b49a);}g.add(cargo);return g;
}
export function createCargoRamp(radius:number,height:number):THREE.Group {
 const g=new THREE.Group();g.name='CargoRamp';g.position.set(0,Math.max(.6,height*.23),-radius*.95);
 const width=Math.max(1.6,radius*.65),length=Math.max(1.8,height*.5);
 box(g,width,length,.12,0,length/2,0,0x303b33);box(g,width*.8,length*.7,.14,0,length/2,-.08,0x1d2727);
 for(const x of [-width*.42,width*.42])box(g,.08,length,.18,x,length/2,-.12,0xb9ad77);return g;
}
/** A two-person warehouse crew carries the same cargo accounted for by the simulation. */
export function createWarehouseCrew():THREE.Group {
 const group=new THREE.Group();group.name='WarehouseCrew';
 const cargo=new THREE.Group();cargo.name='HandlingCargo';group.add(cargo);
 for(const x of [-.65,.65]){
  box(group,.38,.55,.27,x,1.05,0,0xd5a842);box(group,.32,.08,.3,x,1.28,0,0xe9d48a);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6),mat(0xb58c6c));head.position.set(x,1.49,0);group.add(head);
  box(group,.36,.09,.32,x,1.65,0,0xe7c45d);
  for(const side of [-1,1]){const leg=new THREE.Group();leg.name=side<0?'PorterLeftLeg':'PorterRightLeg';leg.position.set(x+side*.11,.8,0);box(leg,.17,.7,.2,0,-.35,0,0x3a4b53);box(leg,.2,.12,.32,0,-.7,.05,0x242d31);group.add(leg);box(group,.14,.4,.15,x+side*.26,1.05,.15,0xd5a842);}
  box(cargo,.62,.48,.55,x,1,.42,0x94794c);box(cargo,.05,.49,.56,x,1,.42,0xd1c29b);
 }
 return group;
}

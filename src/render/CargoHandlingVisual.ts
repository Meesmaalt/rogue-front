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

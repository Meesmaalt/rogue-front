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

/** Compact warehouse forklift: driver, mast that lifts the pallet while carrying, spinning wheels. */
export function createForklift(withDriver=true):THREE.Group {
 const g=new THREE.Group();g.name='WarehouseForklift';
 box(g,.95,.28,1.7,0,.42,0,0xd6a62c);box(g,.8,.55,.7,0,.78,-.45,0xe1b53a);box(g,.5,.08,.5,0,1.1,.1,0x2d3234);
 for(const x of [-.4,.4]){box(g,.06,1.15,.06,x,1.45,.52,0x3b4144);box(g,.06,.06,.7,x,1.62,.2,0x3b4144);}
 const roof=box(g,.95,.06,.8,0,1.95,.05,0x3b4144);roof.name='ForkRoof';
 const mast=new THREE.Group();mast.name='ForkMast';mast.position.set(0,0,.95);g.add(mast);
 for(const x of [-.28,.28])box(mast,.07,1.7,.08,x,.95,0,0x4a5155);
 const fork=new THREE.Group();fork.name='ForkCarriage';mast.add(fork);for(const x of [-.25,.25])box(fork,.1,.05,1.05,x,.18,.45,0x6e777a);
 const cargo=new THREE.Group();cargo.name='HandlingCargo';cargo.position.set(0,.22,.5);fork.add(cargo);
 box(cargo,.85,.12,.8,0,.06,0,0x8a6a3f);for(const x of [-.22,.22])for(const y of [0,1]){box(cargo,.38,.4,.55,x,.38+y*.42,0,0x94794c);box(cargo,.04,.41,.56,x,.38+y*.42,0,0xd1c29b);}
 for(const x of [-.5,.5])for(const z of [-.6,.55]){const w=new THREE.Mesh(new THREE.CylinderGeometry(z<0?.3:.26,z<0?.3:.26,.22,12),mat(0x242a27));w.name='ForkWheel';w.rotation.z=Math.PI/2;w.position.set(x,z<0?.3:.26,z);g.add(w);}
 if(withDriver){
  box(g,.3,.5,.22,0,1.28,-.12,0xf08a24);const head=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat(0xb58c6c));head.position.set(0,1.68,-.12);g.add(head);
  box(g,.3,.09,.28,0,1.8,-.12,0xe7c45d);for(const x of [-.14,.14])box(g,.14,.14,.55,x,1.1,.15,0x3a4b53);
 }
 return g;
}
/** Seated chill-out worker (static pose) used by depot crews and engineers' lounge. */
export function createSeatedWorker(vest=0xf08a24):THREE.Group {
 const g=new THREE.Group();g.name='SeatedWorker';
 box(g,.38,.5,.26,0,.82,0,vest);box(g,.4,.12,.28,0,.6,0,0x3a4b53);for(const x of [-.1,.1]){box(g,.17,.17,.55,x,.52,.3,0x3a4b53);box(g,.17,.5,.17,x,.27,.55,0x3a4b53);box(g,.2,.1,.3,x,.04,.64,0x242a27);}
 for(const x of [-.25,.25])box(g,.12,.12,.4,x,.75,.15,0x4d5b52);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),mat(0xb58c6c));head.name='SeatedHead';head.position.set(0,1.2,0);g.add(head);
 box(g,.34,.09,.3,0,1.33,0,0xe7c45d);
 return g;
}

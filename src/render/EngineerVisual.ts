import layout from '../data/base-life.json';
import * as THREE from 'three';
const materials=new Map<number,THREE.MeshStandardMaterial>();
function mat(color:number){let m=materials.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.8,metalness:color===0x8d979b?.5:0});m.userData.sharedArt=true;materials.set(color,m);}return m;}
function box(g:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:number){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
function cyl(g:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,color:number){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8),mat(color));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
/** Hammer with its pivot at the grip: the head sits up and forward of the hand. */
export function createHammer():THREE.Group {
 const g=new THREE.Group();g.name='EngHammer';const handle=cyl(g,.022,.5,0,.2,.05,0x8a6a3f);handle.rotation.x=.3;
 box(g,.09,.09,.2,0,.46,.12,0x8d979b);return g;
}
/** Shovel with its pivot at the grip; blade at the lower end. */
export function createShovel():THREE.Group {
 const g=new THREE.Group();g.name='EngShovel';cyl(g,.02,1.05,0,.1,0,0x8a6a3f);box(g,.08,.06,.06,0,.64,0,0x6e5535);box(g,.2,.3,.03,0,-.5,0,0x8d979b);return g;
}
/** One-wheel barrow: tub, handles, wheel and a load of bricks/sand that is visible while working. */
export function createWheelbarrow():THREE.Group {
 const g=new THREE.Group();g.name='EngBarrow';
 box(g,.7,.3,.9,0,.6,.1,0xd1a52a);box(g,.62,.06,.8,0,.78,.1,0xe1b53a);
 for(const side of [-1,1]){box(g,.05,.05,1.3,side*.28,.48,-.4,0x3b4144);box(g,.05,.4,.05,side*.3,.24,-.98,0x3b4144);}
 const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.1,12),mat(0x1f2321));wheel.rotation.z=Math.PI/2;wheel.position.set(0,.24,.72);wheel.name='BarrowWheel';g.add(wheel);
 const load=new THREE.Group();load.name='BarrowLoad';for(let i=0;i<6;i++)box(load,.22,.14,.14,-.2+(i%3)*.2,.86+Math.floor(i/3)*.14,.0+((i*7)%3)*.14,0xa4553c);g.add(load);
 return g;
}
/** Hard hat and hi-vis vest are merged into the soldier body; props below stay separate so UnitRenderer can swing them. */
export function addEngineerProps(member:THREE.Group):void {
 const hammer=createHammer();hammer.position.set(.3,.95,.22);hammer.rotation.x=.4;member.add(hammer);
 const shovel=createShovel();shovel.position.set(-.18,1.2,-.36);shovel.rotation.set(-.15,0,.12);member.add(shovel);
}
/** Open-sided service van: visible driver, tool rack and short flatbed. */
export function createToolVan():THREE.Group {
 const g=new THREE.Group();g.name='EngineerToolVan';box(g,1.6,.35,3,0,.62,0,0xb5ad74);box(g,1.5,.5,1.5,0,.95,-.6,0x8a946b);box(g,1.4,.12,1.2,0,1.85,.8,0xc9bd80);
 for(const x of [-.65,.65])box(g,.06,1,.06,x,1.35,1.25,0x414b46);
 box(g,1.1,.42,.05,0,1.55,1.3,0x415d65);box(g,.35,.5,.25,.35,1.35,.65,0xed8d30);const head=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),mat(0xbd9271));head.position.set(.35,1.73,.65);g.add(head);
 for(const x of [-.85,.85])for(const z of [-.95,.95]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.18,12),mat(0x242b28));w.rotation.z=Math.PI/2;w.position.set(x,.3,z);w.name='VanWheel';g.add(w);}
 for(const x of [-.5,0,.5])box(g,.32,.35,.6,x,1.3,-.6,0xc28e36);const shovel=createShovel();shovel.position.set(-.65,1.35,-.7);shovel.rotation.z=Math.PI/2;g.add(shovel);g.scale.setScalar(layout.engineer.vanModelScale);return g;
}

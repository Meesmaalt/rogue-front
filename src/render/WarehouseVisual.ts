import * as THREE from 'three';
import {warehouseLayout,warehouseWalls} from '../sim/warehouse';
import type {Entity} from '../sim/types';
import ops from '../data/aircraft-operations.json';
const shared=new Map<number,THREE.MeshStandardMaterial>();
function material(color:number){let m=shared.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.85});m.userData.sharedArt=true;shared.set(color,m);}return m;}
export function createWarehouse(kind:'airbase'|'supply',palette?:{wall:THREE.Material;metal:THREE.Material;floor:THREE.Material;yellow:THREE.Material}):THREE.Group {
 const root=new THREE.Group(),l=warehouseLayout({kind}),wall=palette?.wall??material(0xa4b1a8),metal=palette?.metal??material(0x526b6b),floor=palette?.floor??material(0x666c65),yellow=palette?.yellow??material(0xe7b544);
 function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=root){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
 for(const b of warehouseWalls({kind}))box(b.width,l.height,b.depth,b.x,l.height/2,b.z,wall);
 box(l.width,.12,l.depth,l.x,.08,l.z,floor);box(l.width+.5,.22,l.depth+.5,l.x,l.height+.1,l.z,metal);
 const doorFrame=new THREE.Group();doorFrame.position.set(l.doorX,0,l.doorZ);doorFrame.rotation.y=l.heading;root.add(doorFrame);
 const drum=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,ops.warehouse.doorWidth,12),metal);drum.rotation.z=Math.PI/2;drum.position.set(0,ops.warehouse.doorHeight+.25,0);doorFrame.add(drum);
 box(ops.warehouse.doorWidth, l.height-ops.warehouse.doorHeight,.35,0,(l.height+ops.warehouse.doorHeight)/2,0,wall,doorFrame);
 const door=new THREE.Group();door.name='WarehouseDoor';door.userData.dynamic=true;door.position.set(0,ops.warehouse.doorHeight/2,0);doorFrame.add(door);
 box(ops.warehouse.doorWidth,ops.warehouse.doorHeight,.12,0,0,0,metal,door);
 for(let y=-1.3;y<1.5;y+=.3)box(ops.warehouse.doorWidth,.035,.16,0,y,0,floor,door);
 for(const side of [-1,1]){box(.18,ops.warehouse.doorHeight,.25,side*ops.warehouse.doorWidth/2,ops.warehouse.doorHeight/2,0,yellow,doorFrame);box(.12,.6,.12,side*(ops.warehouse.doorWidth/2+.5),.3,1,yellow,doorFrame);}
 for(const side of [-1,1])for(let i=0;i<3;i++){const x=l.x+side*(l.width/2-1),z=l.z-l.depth*.3+i*.9;box(.9,.8,.8,x,.5,z,floor);box(.93,.1,.83,x,.95,z,yellow);}
 return root;
}
export function updateWarehouseVisual(g:THREE.Object3D,e:Entity):void {
 if(e.kind!=='supply'&&e.kind!=='airbase')return;
 g.traverse(o=>{if(o.name==='WarehouseDoor'){const open=e.warehouseDoor??0;o.scale.y=Math.max(.001,1-open);o.position.y=Number(o.userData.closedY??ops.warehouse.doorHeight/2)+open*ops.warehouse.doorHeight/2;}});
}

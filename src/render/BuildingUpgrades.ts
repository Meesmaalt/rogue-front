import {addHqStaffStation} from './HqStaffArea';
import * as THREE from 'three';
import airport from '../data/airport-support.json';
/** Phase 73: architectural upgrade silhouettes. Each level adds a real module,
 * not just a marker, so a developed base is visibly larger/more capable. */
function addBuildingLevelArchitecture(kit: THREE.Group, kind: string, level: number): void {
  if(level<2)return;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8b978b, roughness: 0.88, metalness: 0.08 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x596965, roughness: 0.68, metalness: 0.28 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xb98b38, roughness: 0.62, metalness: 0.2 });
  const glass=new THREE.MeshStandardMaterial({color:0x4b7580,roughness:.35,metalness:.25}),dark=new THREE.MeshStandardMaterial({color:0x253836,roughness:.9});
  const module = (x:number,y:number,z:number,w:number,d:number,h:number,mat=concrete) => {
    const part=new THREE.Group();part.name='UpgradeModule';part.position.set(x,y,z);kit.add(part);
    const box=(width:number,height:number,depth:number,m:THREE.Material,px:number,py:number,pz:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),m);mesh.position.set(px,py,pz);part.add(mesh);};
    box(w,h,d,mat,0,h/2,0);box(w+.25,.15,d+.25,steel,0,h+.07,0);for(const side of [-1,1])box(w+.3,.05,.07,accent,0,h+.17,side*(d/2+.08));
    if(h>1.5){for(const side of [-1,1]){box(w*.7,h*.27,.07,glass,0,h*.65,side*(d/2+.05));box(.07,h*.27,d*.65,glass,side*(w/2+.05),h*.65,0);}
    for(const side of [-1,1]){box(.12,h,.12,accent,side*(w/2-.08),h/2,d/2+.02);box(Math.min(1.3,w*.3),.55,.07,glass,side*w*.24,h*.65,d/2+.05);}box(Math.min(.9,w*.3),Math.min(1.8,h*.7),.08,dark,0,Math.min(.9,h*.35),d/2+.08);}
    for(const dz of [-.25,.25])box(Math.max(.4,w*.45),.07,.12,steel,0,h+.2,dz);
  };
  const silo = (x:number,z:number,r:number,h:number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),steel); m.position.set(x,h/2,z); kit.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r*0.82,r*0.82,0.12,12),accent); cap.position.set(x,h+0.06,z); kit.add(cap);
  };
  const mast = (x:number,z:number,h:number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,h,7),steel); m.position.set(x,h/2,z); kit.add(m);
    for (const yy of [h*0.35,h*0.65]) { const arm=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.06,0.06),accent); arm.position.set(x,yy,z); kit.add(arm); }
  };
  if(kind==='hq')addHqStaffStation(kit,level-1,concrete,steel);
  if (level === 2) {
    if(kind==='hq'){
      module(-1,8.2,-1,5.8,4.1,2.5,steel);mast(-4,-3,9);
    } else if (["landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy"].includes(kind)) {
      module(-1,kind==="landStrategy"?6.6:4.1,0,4.2,3,1.8,concrete);mast(0,-3,8);
    } else if (kind === "factory") {
      module(-1,5.6,0,4.5,3,1.7,steel);silo(-2.8,-3.1,.65,8);
    } else if (kind === "barracks") {
      module(-2,4.1,0,2.4,3,1.8,concrete);module(1,4.1,0,2.4,3,1.8,concrete);
    } else if (kind === "supply") {
      module(-4.2,0,-8,4.8,5.5,3.5,steel);module(-4.2,3.5,-8,5.3,6,.35,accent);
    } else if (kind === "airbase") {
      const b=airport.structures[0];module(b.x,0,b.z,b.width,b.depth,b.height,steel);for(const x of [80,84])silo(x,80,1.6,4);
    } else if (kind === "helipad") {
      module(-4.9,4.2,-6.1,5,3,1.8,steel);
    } else if (kind === "refinery") {
      for(const x of [-2.4,2.4])silo(x,-.6,1.3,6.5);module(0,4.9,2,3.5,1.5,1.2,steel);
    } else if (kind === "radar") {
      mast(0,0,8);module(-2,4.1,0,2.5,2,1.7,steel);
    } else if (kind === "generator") {
      module(-2.5,2.1,0,2,2.6,1.2,steel);module(.8,2.1,0,2,2.6,1.2,steel);silo(0,2.4,.7,4.5);
    } else if (kind === "shipyard") {
      module(-1,5.6,0,4.5,3,1.8,steel);mast(0,-4.2,11);
    } else if (kind === "bunker" || kind === "aa") {
      module(0,2.7,0,3,2.5,1.2,concrete);
    }
  }
  if (level >= 3) {
    if(kind==='hq'){
      module(-1,10.7,-1,3.5,3.2,3.2,steel);mast(2,-3,14.5);
      const dish=new THREE.Mesh(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.5),accent);dish.position.set(2,14.5,-3);kit.add(dish);
    } else if (["landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy"].includes(kind)) {
      module(-1,kind==="landStrategy"?8.6:6.1,0,3.5,2.8,2.4,steel);mast(0,1,11);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.0,0.32,0.16,16),accent); dish.rotation.x=Math.PI/2; dish.position.set(0,11.1,1); kit.add(dish);
    } else if (kind === "factory") {
      module(-1,7.6,0,3.5,2.8,2.3,steel);for(const x of [-2,0,2])silo(x,-2.8,.72,10);mast(3,2,11);
    } else if (kind === "barracks") {
      module(-1,6.1,0,4.8,3.5,2,concrete);mast(0,-2.8,10);
    } else if (kind === "supply") {
      module(4.2,0,-8,4.8,5.5,3.5,steel);module(4.2,3.5,-8,5.3,6,.35,accent);
    } else if (kind === "airbase") {
      const b=airport.structures[1];module(b.x,0,b.z,b.width,b.depth,b.height,steel);mast(80,-86,9);
    } else if (kind === "helipad") {
      module(-4.9,6.3,-6.1,3.5,2.5,2.1,steel);mast(-4,-6,10);
    } else if (kind === "refinery") {
      for(const x of [-2.4,0,2.4])silo(x,0,.85,8.5);mast(0,-3.2,10);
    } else if (kind === "radar") {
      mast(0,0,12); const dish=new THREE.Mesh(new THREE.CylinderGeometry(1.4,0.38,0.18,16),accent); dish.rotation.x=Math.PI/2; dish.position.set(0,12.05,0); kit.add(dish);
    } else if (kind === "generator") {
      module(-.6,3.5,0,4,3,1.8,steel);silo(0,-2.5,.9,7);
    } else if (kind === "shipyard") {
      module(-1,7.7,0,4,3,2,steel);mast(0,-3,13);
    } else if (kind === "bunker" || kind === "aa") {
      module(0,4.1,0,2.5,2.5,1.5,concrete);mast(0,-2,7);
    }
  }
}


export function createBuildingUpgradeStages(kind:string,level:number,target=level):THREE.Group {
 const root=new THREE.Group();root.name='BuildingLevelDetails';
 for(let n=2;n<=target;n++){
  const stage=new THREE.Group();stage.name='UpgradeStage'+n;stage.userData.level=n;addBuildingLevelArchitecture(stage,kind,n);
  stage.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});
  const parts=[...stage.children];parts.forEach(o=>{o.userData.finishedPosition=o.position.clone();o.userData.finishedScale=o.scale.clone();});
  const scaffold=new THREE.Group();scaffold.name='UpgradeFramework';const material=new THREE.LineBasicMaterial({color:0x6ecadc,transparent:true,opacity:.38,depthWrite:false});
  for(const part of parts.filter(p=>p instanceof THREE.Group).slice(0,5)){const bounds=new THREE.Box3().setFromObject(part),size=bounds.getSize(new THREE.Vector3()),box=new THREE.BoxGeometry(size.x+.25,size.y+.25,size.z+.25),line=new THREE.LineSegments(new THREE.EdgesGeometry(box),material);box.dispose();line.position.copy(bounds.getCenter(new THREE.Vector3()));scaffold.add(line);}
  stage.add(scaffold);root.add(stage);
 }
 return root;
}
export function updateBuildingUpgradeStages(root:THREE.Group,level:number,progress:number):void {
 for(const stage of root.children){const complete=Number(stage.userData.level)<=level,parts=stage.children.filter(p=>p.name!=='UpgradeFramework');
  parts.forEach((part,index)=>{const t=complete?1:Math.max(0,Math.min(1,(progress-index/Math.max(1,parts.length)*.35)/.65)),e=t*t*(3-2*t);part.visible=t>.001;const scale=part.userData.finishedScale as THREE.Vector3,position=part.userData.finishedPosition as THREE.Vector3;part.scale.set(scale.x*(.85+.15*e),scale.y*e,scale.z*(.85+.15*e));part.position.copy(position);if(part instanceof THREE.Mesh)part.position.y=position.y*e;});
  const scaffold=stage.getObjectByName('UpgradeFramework');if(scaffold)scaffold.visible=!complete&&progress<.999;
 }
}

import * as THREE from 'three';
import type {UnitKind} from '../sim/types';
const glyphs:Record<string,number[][]>={
 H:[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],Q:[[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0],[.6,.3,1.2,-.1]],
 I:[[0,1,1,1],[.5,1,.5,0],[0,0,1,0]],N:[[0,0,0,1],[0,1,1,0],[1,0,1,1]],F:[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5]],
 A:[[0,0,.5,1],[.5,1,1,0],[.2,.4,.8,.4]],R:[[0,0,0,1],[0,1,1,1],[1,1,1,.5],[1,.5,0,.5],[.4,.5,1,0]],M:[[0,0,0,1],[0,1,.5,.5],[.5,.5,1,1],[1,1,1,0]],
 S:[[1,1,0,1],[0,1,0,.5],[0,.5,1,.5],[1,.5,1,0],[1,0,0,0]],U:[[0,1,0,0],[0,0,1,0],[1,0,1,1]],P:[[0,0,0,1],[0,1,1,1],[1,1,1,.5],[1,.5,0,.5]],
 E:[[0,0,0,1],[0,1,1,1],[0,.5,.8,.5],[0,0,1,0]],L:[[0,1,0,0],[0,0,1,0]],D:[[0,0,0,1],[0,1,.7,1],[.7,1,1,.7],[1,.7,1,.3],[1,.3,.7,0],[.7,0,0,0]],
 O:[[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]],W:[[0,1,.2,0],[.2,0,.5,.5],[.5,.5,.8,0],[.8,0,1,1]],G:[[1,1,0,1],[0,1,0,0],[0,0,1,0],[1,0,1,.5],[1,.5,.5,.5]],
 T:[[0,1,1,1],[.5,1,.5,0]],C:[[1,1,0,1],[0,1,0,0],[0,0,1,0]],B:[[0,0,0,1],[0,1,1,1],[1,1,1,0],[1,0,0,0],[0,.5,1,.5]],
};
export function facilityLabel(text:string,material:THREE.Material):THREE.Group {
 const g=new THREE.Group();g.name='FacilityLabel:'+text;const width=text.length*1.35;
 for(let i=0;i<text.length;i++)for(const [x1,y1,x2,y2] of glyphs[text[i]]??[]){const dx=x2-x1,dy=y2-y1,m=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx,dy),.13,.04),material);m.position.set(i*1.35+(x1+x2)/2-width/2,(y1+y2)/2,0);m.rotation.z=Math.atan2(dy,dx);g.add(m);}return g;
}
/** Geometry-only wayfinding and function-specific silhouettes survive the RTS camera distance. */
export function addFacilityDetails(g:THREE.Group,kind:UnitKind,metal:THREE.Material,mark:THREE.Material,dark:THREE.Material):void {
 const labels:Partial<Record<UnitKind,string>>={hq:'HQ',barracks:'INF',factory:'ARM',supply:'SUP',generator:'PWR',refinery:'FUEL',helipad:'H',airbase:'AIR',landCommand:'LAND',airCommand:'AIR',seaCommand:'SEA',landStrategy:'LAND',airStrategy:'AIR',seaStrategy:'SEA',combatEngineer:'ENG',radar:'RADAR',shipyard:'DOCK'};
 const text=labels[kind];if(!text)return;g.userData.facilityLabel=text;
 const label=facilityLabel(text,mark);label.rotation.x=-Math.PI/2;label.position.set(-1,kind==='hq'?6.3:kind==='landStrategy'?5.4:kind==='factory'||kind==='shipyard'?5:kind==='helipad'?.3:4.1,kind==='helipad'?6:0);if(kind==='helipad')label.scale.setScalar(3.3);g.add(label);
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m=metal)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
 const features:string[]=[];
 if(kind==='hq'){features.push('command-tower');box(2.8,2,2.4,-1,5.2,-1);for(const x of [-2,-.8,.4])box(.08,2.4,.08,x,7,-1,dark);}
 if(kind==='barracks'){features.push('training-yard','bunks');for(let i=0;i<5;i++){box(.15,1.1,.15,-4+i*1.6,.55,5.3);box(1.3,.12,.25,-3.4+i*1.6,1,5.3);}for(const x of [-3,0,3])box(2,.4,.8,x,.3,-5,mark);}
 if(kind==='factory'){features.push('gantry','exhausts');for(const x of [-4,4])box(.4,7,.4,x,3.5,3);box(8.5,.5,.5,0,7,3,mark);box(.15,2,.15,1,5.8,3,dark);for(const x of [-3,-1])box(.45,3,.45,x,5,-3,dark);}
 if(kind==='supply')features.push('open-loading-dock');
 if(kind==='helipad'){features.push('H-mark','windsock');const ring=new THREE.Mesh(new THREE.RingGeometry(4.8,5.1,40).rotateX(-Math.PI/2),mark);ring.position.set(-1,.27,6);g.add(ring);box(.1,5,.1,8,2.5,4,dark);box(2,.5,.5,9,4.8,4,mark);}
 if(kind==='generator'){features.push('cooling-fins');for(let i=0;i<6;i++)box(.1,2,2,-3+i,1.2,1.6,dark);}
 if(kind==='radar'){features.push('radar-lattice');for(const x of [-2,2])box(.2,6,.2,x,3,-3);box(4.6,.3,.3,0,6,-3);}
 if(kind==='landStrategy'){features.push('map-room');box(5,1.6,3,-1,4.5,0);}
 if(kind==='airStrategy'){features.push('tracking-array');for(const x of [-3,0,3])box(2.4,.25,2,x,5.5,-3,mark);}
 if(kind==='seaStrategy'){features.push('communications-mast');box(.25,8,.25,0,4,-4);for(const y of [5,6,7])box(5,.12,.12,0,y,-4);}
 // Working fittings share the existing material batches and stay on the original structure.
 if(['hq','landCommand','airCommand','seaCommand','landStrategy','airStrategy','seaStrategy','radar'].includes(kind)){
  features.push('communications-cabinet');box(1.35,1.1,1.1,2.8,3.3,-2.5,dark);for(const y of [3,3.25,3.5])box(1,.055,.07,2.8,y,-1.91,metal);
 }
 if(['factory','combatEngineer','shipyard'].includes(kind)){
  features.push('service-bay');for(const side of [-1,1])for(let i=0;i<5;i++)box(.18,.13,.12,side*3.8,.4+i*.24,3.55,i%2?dark:mark);
  box(1.1,.5,.9,2.7,.3,3.2,dark);box(1.4,.12,1,2.7,.65,3.2,metal);
 }
 if(kind==='generator'||kind==='refinery'){
  features.push('service-pipes');for(const x of [-2.5,2.5]){box(.13,.13,3.8,x,.4,-.3,metal);box(.3,.8,.3,x,.6,1.7,dark);box(.6,.1,.1,x,1,1.7,mark);}
 }
 if(kind==='barracks'){
  features.push('field-lockers');for(const x of [-2.8,-1.8,-.8]){box(.8,1.7,.55,x,.85,-3.8,dark);box(.05,.1,.04,x+.2,1,-3.5,mark);}
 }
 g.userData.facilityDetails=features;
}

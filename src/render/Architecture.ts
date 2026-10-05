import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import type {UnitKind,Team} from "../sim/types";
import type {FactionId} from "../sim/factions";
import {mulberry32} from "../sim/rng";

const textures=new Map<string,THREE.CanvasTexture>();
const materials=new Map<string,THREE.MeshStandardMaterial>();
function surface(kind:"plaster"|"brick"|"metal"|"roof"|"concrete"):THREE.CanvasTexture {
  const cached=textures.get(kind);if(cached)return cached;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=256;const c=canvas.getContext("2d")!,random=mulberry32(311+kind.length);
  const image=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    let v=215+random()*35;
    if(kind==="brick"&&(y%16<2||(x+(Math.floor(y/16)%2)*24)%48<2))v=145;
    if(kind==="roof"&&(y%12<2||(x+(Math.floor(y/12)%2)*10)%20<1))v=155;
    if(kind==="metal"&&x%16<2)v=155;
    const i=(y*256+x)*4;image.data[i]=v;image.data[i+1]=v;image.data[i+2]=v;image.data[i+3]=255;
  }
  c.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);texture.anisotropy=8;textures.set(kind,texture);return texture;
}
function material(color:number,kind?:Parameters<typeof surface>[0],metalness=.05):THREE.MeshStandardMaterial {
  const key=`${color}/${kind}/${metalness}`;let m=materials.get(key);if(m)return m;
  const map=kind?surface(kind):null;
  m=new THREE.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==="roof"?.07:kind==="brick"?.04:.015,roughness:metalness>.2?.76:.94,metalness});
  m.userData.sharedArt=true;materials.set(key,m);return m;
}
function box(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material):THREE.Mesh {const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);return mesh;}
function cylinder(g:THREE.Group,r:number,h:number,x:number,y:number,z:number,m:THREE.Material):THREE.Mesh {const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),m);mesh.position.set(x,y,z);mesh.castShadow=true;g.add(mesh);return mesh;}
function roof(g:THREE.Group,w:number,d:number,y:number,rise:number,m:THREE.Material):void {
  const angle=Math.atan2(rise,w/2),length=Math.hypot(w/2,rise);
  for(const side of [-1,1]){const panel=box(g,length,.14,d,side*w/4,y+rise/2,0,m);panel.rotation.z=-side*angle;}
  box(g,.15,.16,d,0,y+rise,0,m);
  // Gable ends seal the roof; no floating pyramid on a cube.
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute([-w/2,y,-d/2,w/2,y,-d/2,0,y+rise,-d/2,-w/2,y,d/2,0,y+rise,d/2,w/2,y,d/2],3));geometry.setAttribute("uv",new THREE.Float32BufferAttribute([0,0,1,0,.5,1,0,0,.5,1,1,0],2));geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,m);g.add(mesh);
}
function facade(g:THREE.Group,w:number,d:number,h:number,floors:number,wall:THREE.Material):void {
  const glass=material(0x334951,undefined,.35),frames=material(0xa2a695),door=material(0x514f43,"metal");
  for(const side of [-1,1])for(let floor=0;floor<floors;floor++)for(let x=-w/2+1.6;x<w/2-1;x+=2.4){
    const y=1.7+floor*2.5,z=side*(d/2+.055);
    box(g,1.15,1.25,.1,x,y,z,frames);box(g,.95,1.05,.12,x,y,z+side*.015,glass);box(g,.055,1.1,.15,x,y,z+side*.025,frames);box(g,1.25,.08,.3,x,y-.64,z,wall);
  }
  for(const side of [-1,1]){
    box(g,w+.08,.4,.07,0,.42,side*(d/2+.06),wall);
    for(let z=-d/2+1.6;z<d/2-1;z+=2.8){box(g,.1,1.25,1.1,side*(w/2+.05),1.7,z,frames);box(g,.12,1.05,.92,side*(w/2+.07),1.7,z,glass);}
  }
  box(g,1.35,2.05,.12,0,1.08,d/2+.08,door);box(g,1.8,.12,.9,0,2.3,d/2+.35,frames);box(g,2,.16,1.2,0,.08,d/2+.4,wall);
  for(const x of [-w/2+.12,w/2-.12])box(g,.07,h,.09,x,h/2,d/2+.12,frames);
}
/** Original civilian models: gable roof, facade, sill, rain pipes, chimney and annex. */
export function createCivilianBuilding(width:number,depth:number,height:number,variant=0):THREE.Group {
  const g=new THREE.Group(),wall=material([0xb9b4a3,0xa39f91,0xc5bba7,0x9a9d8e][variant%4],variant%3===1?"brick":"plaster"),concrete=material(0x8c8e83,"concrete"),tiles=material([0x706259,0x565f61,0x8a7060][variant%3],"roof");
  box(g,width+.3,.22,depth+.3,0,.11,0,concrete);box(g,width,height,depth,0,height/2+.2,0,wall);roof(g,width+.7,depth+.7,height+.2,1.5,tiles);facade(g,width,depth,height,height>5?2:1,concrete);
  box(g,.65,2,.7,width*.25,height+1.5,-depth*.2,material(0x8a786b,"brick"));box(g,.8,.12,.85,width*.25,height+2.54,-depth*.2,concrete);
  if(variant%2===0){box(g,width*.27,1.5,depth*.35,-width*.34,.95,-depth*.33,wall);box(g,width*.29,.15,depth*.38,-width*.34,1.78,-depth*.33,tiles);}
  return batch(g);
}
const kinds=new Set(["hq","barracks","factory","supply","generator","helipad","airbase","refinery","shipyard","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy","combatEngineer"]);
export function createBuildingModel(kind:UnitKind,team:Team,faction:FactionId):{group:THREE.Group;turret:null}|null {
  if(!kinds.has(kind))return null;
  const g=new THREE.Group(),concrete=material(0x8b8d84,"concrete"),wall=material(faction==="usa"?0x9c9d8c:faction==="russia"?0x969b88:0xa4a393,"plaster"),steel=material(0x646f68,"metal",.3),dark=material(0x424a48,"metal",.3),trim=material(team===0?0x6995a1:0xa77b64);
  const industrial=["factory","supply","shipyard","airbase"].includes(kind),width=kind==="hq"?15:industrial?12:9,depth=industrial?11:8,height=industrial?4.5:kind==="hq"?5.5:3;
  box(g,width+1,.22,depth+1,0,.11,0,concrete);
  if(kind==="helipad"||kind==="airbase"){
    box(g,kind==="airbase"?10:12,.12,kind==="airbase"?32:12,0,.12,6,dark);
    const marking=material(0xc8c7b8);if(kind==="helipad"){box(g,.25,.03,4,-1,.21,6,marking);box(g,.25,.03,4,1,.21,6,marking);box(g,2,.03,.25,0,.21,6,marking);}else for(let z=-6;z<21;z+=5)box(g,.18,.03,2,0,.21,z,marking);
    const shed=createCivilianBuilding(6,5,2.5,1);shed.position.set(0,0,-7);g.add(shed);box(g,1.2,.14,1.8,2,3,-7,trim);
  }else if(kind==="generator"){
    box(g,7,1.4,4,0,.95,0,steel);for(const x of [-2.1,2.1]){cylinder(g,.38,3.8,x,2.4,0,dark);cylinder(g,.48,.15,x,4.4,0,dark);}for(let z=-1.5;z<2;z+=.45)box(g,7.08,.08,.06,0,1.2,z,dark);box(g,1.1,2,1.3,3,1.2,2.5,wall);
  }else if(kind==="refinery"){
    for(const x of [-2.2,2.2]){cylinder(g,1.7,4,x,2.2,0,steel);cylinder(g,1.85,.2,x,4.3,0,concrete);}box(g,7,.25,.25,0,1.2,2.3,dark);box(g,1.3,2,1.3,0,1.2,-3,wall);
  }else{
    box(g,width,height,depth,0,height/2+.22,0,wall);
    if(industrial){roof(g,width+.7,depth+.7,height+.22,1.2,steel);for(const x of [-3.2,3.2]){box(g,4.2,3.1,.13,x,1.75,depth/2+.08,dark);for(let y=.4;y<3.2;y+=.28)box(g,4.1,.045,.15,x,y,depth/2+.16,steel);}box(g,3,2.7,4,-width*.32,1.5,-depth*.27,wall);}
    else{box(g,width+.4,.23,depth+.4,0,height+.35,0,steel);facade(g,width,depth,height,height>5?2:1,concrete);}
    box(g,2,.7,1.4,width*.25,height+.8,-depth*.2,dark);for(let x=-.75;x<=.75;x+=.3)box(g,.1,.6,1.45,width*.25+x,height+.8,-depth*.2,steel);
    box(g,2,.16,1.3,0,height*.8,depth/2+.23,trim);
    if(kind==="hq"||kind.includes("Command")||kind.includes("Strategy")){cylinder(g,.07,5,width*.32,height+2.7,-depth*.32,dark);const dish=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8,0,Math.PI*2,0,Math.PI*.5),steel);dish.position.set(width*.32,height+3.5,-depth*.32);dish.rotation.x=-.6;g.add(dish);}
    if(kind==="supply"){for(const side of [-1,1])for(let i=0;i<3;i++){box(g,1.2,.9,1.2,side*(width/2-.9),.65+i*.9,-depth/2+1,material(0x80785d,"metal"));}for(const x of [-1.2,1.2])cylinder(g,.45,1.4,x,.9,depth/2-1,steel);}
    for(const x of [-width/2+.18,width/2-.18])box(g,.1,height,.1,x,height/2+.22,depth/2+.12,steel);
  }
  return {group:batch(g),turret:null};
}
/** Merge architecture by material without losing texture UVs. */
function batch(g:THREE.Group):THREE.Group {
  g.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  g.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const transformed=o.geometry.clone().applyMatrix4(o.matrixWorld);const geometry=transformed.index?transformed.toNonIndexed():transformed;if(geometry!==transformed)transformed.dispose();if(!geometry.getAttribute("uv"))geometry.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count*2),2));const list=batches.get(o.material)??[];list.push(geometry);batches.set(o.material,list);o.geometry.dispose();}});
  g.clear();for(const [material,parts] of batches){const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}}
  return g;
}

/** Batch static map surfaces per material and 64 m cell. Cell bounds preserve
 * frustum culling; animated buildings/units never enter this function. */
export function batchStaticScene(source:THREE.Group,cellSize=64):THREE.Group {
  source.updateMatrixWorld(true);
  const buckets=new Map<string,{material:THREE.MeshStandardMaterial;parts:THREE.BufferGeometry[];cast:boolean;receive:boolean}>();
  source.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||Array.isArray(o.material)||!(o.material instanceof THREE.MeshStandardMaterial))return;
    o.geometry.computeBoundingBox();
    const m=o.material,position=o.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
    const key=[Math.floor(position.x/cellSize),Math.floor(position.z/cellSize),m.color.getHex(),m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.side,m.polygonOffset,m.polygonOffsetFactor,o.castShadow,o.receiveShadow].join('/');
    const transformed=o.geometry.clone().applyMatrix4(o.matrixWorld),g=transformed.index?transformed.toNonIndexed():transformed;
    if(g!==transformed)transformed.dispose();
    if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));
    let b=buckets.get(key);if(!b){b={material:m,parts:[],cast:o.castShadow,receive:o.receiveShadow};buckets.set(key,b);}else if(m!==b.material&&!m.userData.sharedArt)m.dispose();
    b.parts.push(g);o.geometry.dispose();
  });
  source.clear();
  for(const b of buckets.values()){
    const geometry=mergeGeometries(b.parts);b.parts.forEach(p=>p.dispose());
    if(!geometry)continue;geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,b.material);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;mesh.matrixAutoUpdate=false;source.add(mesh);
  }
  return source;
}

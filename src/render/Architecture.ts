import baseLayout from '../data/base-life.json';
import {BATTLE_SCALE} from "../sim/battleScale";
import {facilityLabel,addFacilityDetails} from "./FacilityDetails";
import {renderedGroundHeightAt} from "./GroundSurface";
import type {Entity} from "../sim/types";
import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import type {UnitKind,Team} from "../sim/types";
import type {MapFeatureDef} from "../sim/mapFeatures";
import type {FactionId} from "../sim/factions";
import {mulberry32} from "../sim/rng";
import {HQ_LOUNGE,DEPOT_LOUNGE,HQ_RACK,hqSeats,depotBays,buildingScale} from "./lounge";

const textures=new Map<string,THREE.CanvasTexture>();
const materials=new Map<string,THREE.MeshStandardMaterial>();
function surface(kind:"plaster"|"brick"|"metal"|"roof"|"concrete"|"facade1"|"facade2"|"facade3"|"camouflage"|"asphalt"):THREE.CanvasTexture {
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
  c.putImageData(image,0,0);
  if(kind==="camouflage"){
    const palette=["#aabdb7","#73978f","#8baaa5","#c5cec0","#506f6b"];
    c.fillStyle=palette[0];c.fillRect(0,0,256,256);
    for(let i=0;i<210;i++){const x=random()*256,z=random()*256,r=10+random()*29;c.fillStyle=palette[i%palette.length];c.beginPath();c.moveTo(x-r,z-r*.3);c.lineTo(x-r*.2,z-r);c.lineTo(x+r,z-r*.5);c.lineTo(x+r*.6,z+r);c.lineTo(x-r*.8,z+r*.65);c.closePath();c.fill();}
  }
  if(kind.startsWith("facade")){
    const floors=kind==="facade3"?3:kind==="facade2"?2:1;
    for(let floor=0;floor<floors;floor++)for(const x of [43,111,179]){
      const y=floors>1?18+floor*(210/floors):75;c.fillStyle="#b4b5a8";c.fillRect(x-3,y-3,39,54);c.fillStyle="#4b5b5c";c.fillRect(x,y,33,47);c.fillStyle="#969d96";c.fillRect(x+15,y,2,47);c.fillRect(x,y+23,33,2);
    }
    c.fillStyle="#797c72";c.fillRect(0,238,256,18);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(kind.startsWith("facade")?1:2,kind.startsWith("facade")?1:2);texture.anisotropy=8;textures.set(kind,texture);return texture;
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
/** Hipped silhouette shares its low-cost geometry between both civilian LODs. */
function hipRoof(g:THREE.Group,w:number,d:number,y:number,rise:number,m:THREE.Material):void {
  const ridge=d/2-Math.min(w*.4,d*.28),geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute([-w/2,y,-d/2,w/2,y,-d/2,w/2,y,d/2,-w/2,y,d/2,0,y+rise,-ridge,0,y+rise,ridge],3));
  geometry.setAttribute("uv",new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,.5,.5-ridge/d,.5,.5+ridge/d],2));
  geometry.setIndex([0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0]);geometry.computeVertexNormals();g.add(new THREE.Mesh(geometry,m));
}
/** Original civilian models: gable roof, facade, sill, rain pipes, chimney and annex. */
export function createCivilianBuilding(width:number,depth:number,height:number,variant=0,tactical=false,roofColor?:number,style:MapFeatureDef["buildingStyle"]="residential",facadeColor?:number):THREE.Group {
  const g=new THREE.Group(),wall=material(facadeColor??[0xb9b4a3,0xa39f91,0xc5bba7,0x9a9d8e][variant%4],(style==="industrial"||style==="warehouse")?"metal":height>8?"facade3":height>5?"facade2":"facade1"),concrete=material(0x8c8e83,"concrete"),tiles=material(roofColor??[0x706259,0x565f61,0x8a7060][variant%3],"roof");
  // Height describes the whole house, rather than a wall plus an extra tall roof.
  const bodyHeight=style==="civic"?height*.65:height;
  const rise=(style==="industrial"||style==="apartment")?.24:Math.min(1.25,bodyHeight*.22),wallHeight=bodyHeight-rise-.2;
  box(g,width+.3,.2,depth+.3,0,.1,0,concrete);
  box(g,width,wallHeight,depth,0,wallHeight/2+.2,0,wall);
  if(style==="industrial"||style==="apartment")box(g,width+.35,.24,depth+.35,0,height-.12,0,material(0x7c8384,"metal"));
  else if(style==="rowhouse"||variant%4===1)hipRoof(g,width+.35,depth+.35,wallHeight+.2,rise,tiles);else roof(g,width+.35,depth+.35,wallHeight+.2,rise,tiles);
  box(g,1.15,1.95,.10,0,1.18,depth/2+.06,material(0x514f43,"metal"));
  box(g,1.65,.14,.85,0,.12,depth/2+.35,concrete);
  if(style!=="civic")box(g,.42,.85,.45,width*.25,height-.05,-depth*.2,material(0x8a786b,"brick"));
  if(style==="industrial"){
    box(g,2,height*.6,2,-width*.35,height*1.3,-depth*.3,material(0x8a786b,"brick"));
    for(const x of [-width*.22,width*.22])box(g,width*.25,3,.16,x,1.7,depth/2+.1,material(0x514f43,"metal"));
  }
  if(style==="civic"){
    const towerW=Math.min(3.6,width*.28),towerD=Math.min(3.8,depth*.28),towerZ=-depth*.18;
    box(g,towerW,height*.3,towerD,0,height*.8,towerZ,wall);
    const tower=new THREE.Group();hipRoof(tower,towerW+.2,towerD+.2,height*.95,height*.05,tiles);tower.position.z=towerZ;g.add(tower);
    for(const side of [-1,1])box(g,towerW*.48,towerW*.48,.08,0,height*.83,towerZ+side*(towerD/2+.04),concrete);
  }
  if(style==="apartment"){
    box(g,width*.7,.6,depth*.6,0,height+.3,0,concrete);
    if(!tactical)for(let y=3;y<height-1;y+=3)for(const side of [-1,1])box(g,width*.28,.13,.7,side*width*.26,y,depth/2+.26,concrete);
  }
  if(style==="rowhouse")for(const side of [-1,1])box(g,1.1,1.9,.1,side*width*.28,1.1,depth/2+.08,material(0x514f43,"metal"));
  if(style==="shop"){box(g,width*.8,.16,1.7,0,2.6,depth/2+.7,tiles);box(g,width*.6,1.3,.12,0,1.7,depth/2+.09,material(0x334951,undefined,.35));}
  if(style==="barn"||style==="warehouse")box(g,width*.45,height*.55,.14,0,height*.29,depth/2+.1,material(0x514f43,"metal"));
  if(!tactical){
    // Windows are baked into the shared facade atlas in both LODs.
    // Keep small close-view rain pipes, rather than hundreds of window boxes.
    for(const x of [-width/2+.12,width/2-.12])box(g,.07,wallHeight,.09,x,wallHeight/2+.2,depth/2+.12,concrete);
    if(style!=="civic")box(g,.55,.1,.6,width*.25,height+.42,-depth*.2,concrete);
    // Alternate a porch and a small storefront; avoid giant overlapping annexes.
    if(variant%3===0){box(g,2,.12,1.2,0,.15,depth/2+.55,concrete);box(g,2.2,.12,1.4,0,2.35,depth/2+.6,tiles);}
    if(variant%3===1){box(g,2,.95,.12,-width*.23,1.45,depth/2+.1,material(0x334951,undefined,.35));box(g,2.2,.12,.75,-width*.23,2.1,depth/2+.35,tiles);}
  }
  return batchDistantHouse(g);
}

let distantHouseMaterial:THREE.MeshStandardMaterial|undefined;
const houseAtlasKinds=["facade1","facade2","facade3","roof","concrete","metal","brick"] as const;
/** One shared opaque material/draw per distant house, while retaining its garrison root. */
function batchDistantHouse(group:THREE.Group):THREE.Group {
  if(!distantHouseMaterial){
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
    const c=canvas.getContext("2d")!;c.fillStyle="#fff";c.fillRect(0,0,512,256);
    houseAtlasKinds.forEach((kind,i)=>{
      const image=surface(kind).image as HTMLCanvasElement,x=(i%4)*128,y=Math.floor(i/4)*128,repeat=kind.startsWith("facade")?1:2;
      // Repeat within each atlas cell; gutters keep neighbouring materials out of mip edges.
      for(let z=0;z<repeat;z++)for(let a=0;a<repeat;a++)c.drawImage(image,x+2+a*124/repeat,y+2+z*124/repeat,124/repeat,124/repeat);
    });
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    distantHouseMaterial=new THREE.MeshStandardMaterial({map:texture,vertexColors:true,roughness:.94});distantHouseMaterial.userData.sharedArt=true;
  }
  group.updateMatrixWorld(true);const parts:THREE.BufferGeometry[]=[];
  group.traverse(o=>{
    if(!(o instanceof THREE.Mesh)||!(o.material instanceof THREE.MeshStandardMaterial))return;
    const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),uv=source.getAttribute("uv"),n=source.getAttribute("position").count;
    source.applyMatrix4(o.matrixWorld);
    const tile=houseAtlasKinds.findIndex(kind=>o.material instanceof THREE.MeshStandardMaterial&&o.material.map===textures.get(kind));
    const index=tile<0?7:tile,colors=new Float32Array(n*3);
    for(let i=0;i<n;i++){
      uv.setXY(i,((index%4)*128+2+uv.getX(i)*124)/512,1-(Math.floor(index/4)*128+2+(1-uv.getY(i))*124)/256);
      o.material.color.toArray(colors,i*3);
    }
    source.setAttribute("color",new THREE.BufferAttribute(colors,3));parts.push(source);
  });
  const geometry=mergeGeometries(parts,false)!;for(const p of parts)p.dispose();
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});group.clear();
  const mesh=new THREE.Mesh(geometry,distantHouseMaterial);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return group;
}

/** Low canvas pavilions and attached utility modules echo the reference's field-base silhouettes. */
function pavilion(g:THREE.Group,w:number,d:number,h:number,x:number,z:number,camo:THREE.Material,wall:THREE.Material,poles:THREE.Material,open=false):void {
 const hall=new THREE.Group();hall.position.set(x,0,z);
 if(!open){box(hall,w,h*.68,d,0,h*.34+.2,0,wall);box(hall,w*.5,h*.48,.12,0,h*.25+.2,d/2+.08,poles);}
 const roofGroup=new THREE.Group();hipRoof(roofGroup,w+.5,d+.5,h*.7,h*.3,camo);hall.add(roofGroup);
 for(const side of [-1,1])for(const end of [-1,1])box(hall,.12,h*.75,.12,side*w*.47,h*.375,end*d*.47,poles);
 box(hall,w+.3,.16,d+.3,0,.08,0,material(0x898c7d,"concrete"));g.add(hall);
}
function fieldCrates(g:THREE.Group,x:number,z:number,count:number):void {
 const crates=material(0x827e5e,"metal");for(let i=0;i<count;i++){const w=.9+(i%2)*.25;box(g,w,.75,w,x+(i%3)*1.2,.4+Math.floor(i/3)*.75,z,crates);box(g,w+.04,.07,w+.04,x+(i%3)*1.2,.76+Math.floor(i/3)*.75,z,material(0x898c7d,"concrete"));}
}
function mast(g:THREE.Group,x:number,z:number,h:number,team:Team,steel:THREE.Material):void {
 cylinder(g,.07,h,x,h/2,z,steel);box(g,1.5,.7,.04,x+.75,h-.7,z,material(team===0?0x699fc5:0xac765f));
}

/** Shared palette keeps each military model within the draw-batch budget (one mesh per material). */
interface Pal{wall:THREE.Material;dark:THREE.Material;camo:THREE.Material;concrete:THREE.Material;steel:THREE.Material;trim:THREE.Material;accent:THREE.Material;crates:THREE.Material;wood:THREE.Material;yellow:THREE.Material;glass:THREE.Material}
/** Furniture helpers: built facing +z (back rest at -z); the group heading turns them. */
function furniture(g:THREE.Group,x:number,z:number,heading:number):THREE.Group {const f=new THREE.Group();f.position.set(x,0,z);f.rotation.y=heading;g.add(f);return f;}
function sofa(g:THREE.Group,x:number,z:number,heading:number,width:number,fabric:THREE.Material,cushion:THREE.Material,legs:THREE.Material):void {
 const f=furniture(g,x,z,heading);
 box(f,width,.28,.95,0,.3,0,fabric);box(f,width,.62,.22,0,.72,-.42,fabric);for(const side of [-1,1])box(f,.2,.5,.95,side*(width/2-.1),.5,0,fabric);
 const n=Math.max(1,Math.round(width/.9));for(let i=0;i<n;i++)box(f,width/n-.12,.16,.7,-width/2+width/n*(i+.5),.52,.08,cushion);
 for(const side of [-1,1])for(const t of [-1,1])box(f,.08,.2,.08,side*(width/2-.1),.1,t*.35,legs);
}
function sawhorse(g:THREE.Group,x:number,z:number,heading:number,p:Pal):void {
 const f=furniture(g,x,z,heading);for(const side of [-1,1]){box(f,.08,.8,.08,side*.6,.4,-.2,p.wood);box(f,.08,.8,.08,side*.6,.4,.2,p.wood);}box(f,1.5,.08,.1,0,.8,0,p.wood);box(f,1.4,.06,.35,0,.86,0,p.crates);
}
function hqYard(g:THREE.Group,p:Pal):void {
 // Field work break area: simple timber benches, steel lockers and a water station.
 const seats=hqSeats();
 for(let row=0;row<3;row++){const seat=seats[row*3+1];box(g,2.9,.14,.55,seat.x,.55,seat.z,p.wood);box(g,2.9,.4,.08,seat.x,.92,seat.z+.3,p.wood);for(const side of [-1,1])box(g,.12,.5,.45,seat.x+side*1,.25,seat.z,p.steel);}
 box(g,1.5,1.8,.65,HQ_LOUNGE.x+2.4,.9,HQ_LOUNGE.z+1.8,p.steel);
 box(g,.7,1.1,.7,HQ_LOUNGE.x-2.3,.55,HQ_LOUNGE.z+1.8,p.wall);cylinder(g,.21,.45,HQ_LOUNGE.x-2.3,1.3,HQ_LOUNGE.z+1.8,p.trim);
 engineerYard(g,p);
}
/** Engineering yard shared by the HQ and the Combat Engineer centre: tool rack (tools are added dynamically), workbench, materials, scaffold. */
function engineerYard(g:THREE.Group,p:Pal):void {
 box(g,3.4,.06,6.2,HQ_RACK.x-.3,.05,HQ_RACK.z+.6,p.concrete);
 for(const z of [-1.4,1.4])box(g,.14,2.2,.14,HQ_RACK.x,1.1,HQ_RACK.z+z,p.wood);
 box(g,.1,1.5,3.1,HQ_RACK.x,1.45,HQ_RACK.z,p.camo);box(g,.14,.16,3.3,HQ_RACK.x,2.28,HQ_RACK.z,p.dark);box(g,.18,.5,1.2,HQ_RACK.x+.1,2.55,HQ_RACK.z,p.yellow);
 for(let i=0;i<4;i++)box(g,.2,.05,.05,HQ_RACK.x+.12,1.45,HQ_RACK.z-1.05+i*.7,p.steel);
 box(g,1.0,.08,3.0,HQ_RACK.x+1.1,.9,HQ_RACK.z+2.2,p.wood);for(const z of [-1.2,1.2])for(const x of [-.4,.4])box(g,.08,.88,.08,HQ_RACK.x+1.1+x,.44,HQ_RACK.z+2.2+z,p.dark);
 for(let i=0;i<6;i++)box(g,2.2,.12,.5,HQ_RACK.x+1.7,.15+i*.13,HQ_RACK.z-2.3,p.wood);
 for(let i=0;i<8;i++)box(g,.3,.15,.2,HQ_RACK.x+2.7+(i%4)*.34,.22+Math.floor(i/4)*.17,HQ_RACK.z-2.6,p.crates);
 box(g,1.1,.14,1.1,HQ_RACK.x+2.9,.1,HQ_RACK.z-2.6,p.wood);
 for(const x of [-.5,.5])for(const z of [-.5,.5])box(g,.07,2.4,.07,HQ_RACK.x+2.2+x,1.3,HQ_RACK.z+3.6+z,p.steel);
 for(const y of [.9,1.8])box(g,1.2,.06,1.2,HQ_RACK.x+2.2,y,HQ_RACK.z+3.6,p.wood);
 sawhorse(g,HQ_RACK.x+1.4,HQ_RACK.z+.2,Math.PI/2,p);
}
function depotYard(g:THREE.Group,p:Pal):void {
 const h=baseLayout.depot.hall;
 // Compact low warehouse; its walls match the simulation footprint in metres.
 pavilion(g,h.width,h.depth,h.height,h.x,h.z,p.camo,p.wall,p.dark,false);
 for(const z of [-3,1]){box(g,.14,2.4,1.8,4.06,1.3,z,p.dark);box(g,.18,.12,2,4.1,2.6,z,p.yellow);}
 box(g,1.4,.16,6,4.9,.14,-1,p.concrete);
 for(const z of [-3,0,3]){box(g,.8,.14,.8,5.1,.3,z,p.wood);}
 // Narrow fascia and open terrace keep people, forks and cargo visible from above.
 box(g,1.8,.12,.5,4.8,2.8,-1,p.camo);
 const lx=DEPOT_LOUNGE.x,lz=DEPOT_LOUNGE.z;
 box(g,7.5,.06,2.6,lx+2.7,.08,lz+.5,p.concrete);
 for(let i=0;i<4;i++)sofa(g,lx+i*baseLayout.depot.rest.spacing,lz+.6,Math.PI,1.2,p.camo,p.trim,p.dark);
 box(g,.8,1.5,.6,lx-1,.75,lz-.8,p.accent);box(g,.65,1.2,.55,lx-1,.6,lz+.5,p.wall);
 fieldCrates(g,-5,-4,3);cylinder(g,.04,2.5,-3.2,4.3,-4,p.steel);
 for(const bay of depotBays(4)){for(const side of [-1,1])box(g,.06,.025,2.4,bay.x+side*.9,.08,bay.z,p.yellow);box(g,1.8,.025,.06,bay.x,.08,bay.z-1.2,p.yellow);box(g,.14,.9,.14,bay.x,.45,bay.z-1.4,p.dark);}

}
const kinds=new Set(["hq","barracks","factory","supply","generator","helipad","airbase","refinery","shipyard","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy","combatEngineer","radar"]);
export function createBuildingModel(kind:UnitKind,team:Team,faction:FactionId):{group:THREE.Group;turret:null}|null {
 if(!kinds.has(kind))return null;
 const g=new THREE.Group(),concrete=material(0x8b8d84,"concrete"),wall=material(faction==="usa"?0xc1c7bd:faction==="russia"?0xa4ae91:0xbab59b,"plaster"),steel=material(0x646f68,"metal",.3),dark=material(0x424a48,"metal",.3),camo=material(faction==="usa"?0xb5d2cd:faction==="russia"?0xa9b69b:0xc1b69c,"camouflage"),trim=material(team===0?0x6995a1:0xa77b64);
 const pal:Pal={wall,dark,camo,concrete,steel,trim,accent:material(team===0?0x699fc5:0xac765f),crates:material(0x827e5e,"metal"),wood:material(0x7a5d3b),yellow:material(0xe0b53a),glass:trim};
 if(kind==="airbase"||kind==="helipad"){
  const airbase=kind==="airbase",mark=material(0xd0cbb7);
  box(g,airbase?10:25,.12,airbase?48:18,0,.12,6,material(0x73776e,"asphalt"));
  if(airbase){
   for(let z=-14;z<29;z+=5)box(g,.18,.03,2,0,.21,z,mark);
   box(g,17,.12,36,15,.12,8,concrete);
   for(const x of [11,17])for(let z=-4;z<25;z+=6){box(g,4,.025,.15,x,.2,z+2,mark);box(g,.15,.025,4,x-2,.2,z,mark);}
   pavilion(g,8,7,4,26,-9,camo,wall,dark,true);pavilion(g,6,6,3.5,26,4,camo,wall,dark);
   for(const x of [29,31])box(g,.35,6,.35,x,3,-1,steel);box(g,4,1.7,3,30,6.3,-1,wall);const cap=new THREE.Group();cap.position.set(30,0,-1);hipRoof(cap,4.4,3.4,7.15,.9,camo);g.add(cap);
   fieldCrates(g,23,9,4);mast(g,29,-15,6,team,steel);
  }else{
   for(const x of [-7,0,7]){box(g,.25,.03,4,x-1,.21,6,mark);box(g,.25,.03,4,x+1,.21,6,mark);box(g,2,.03,.25,x,.21,6,mark);}
   pavilion(g,6,4,3.4,-4,-5,camo,wall,dark,true);fieldCrates(g,2,-5,3);mast(g,7,-4,4,team,steel);
  }
 }else if(kind==='hq'){
  const [hall,wing,rear]=baseLayout.hq.solidBoxes;
  pavilion(g,hall.width,hall.depth,4.6,hall.x,hall.z,camo,wall,dark);
  pavilion(g,wing.width,wing.depth,3.3,wing.x,wing.z,camo,wall,dark);
  pavilion(g,rear.width,rear.depth,3.2,rear.x,rear.z,camo,wall,dark);
  // Operations gallery, entrance canopy and distinct glass command room.
  box(g,5.8,1.45,2.7,-1,4.85,-1,pal.glass);box(g,6.2,.22,3.1,-1,5.7,-1,steel);
  for(const x of [-3,-1,1])box(g,.12,1.5,2.8,x,4.9,-1,trim);
  for(const x of [-3.6,-1.8,0,1.8]){box(g,.9,.8,.1,x,2,2.57,pal.glass);box(g,1.1,.1,.2,x,2.5,2.6,trim);}
  for(const x of [-3,-1,1])box(g,1.1,.9,.09,x,2,-4.56,trim);
  for(const z of [-3,-1,1])box(g,.09,.9,1.1,-5.05,2,z,trim);
  for(const z of [0,1.5,3])box(g,.09,.8,.9,7.29,1.9,z,trim);
  for(const x of [-4.5,-3,-1.5])box(g,.9,.75,.09,x,1.9,-7.05,trim);
  box(g,2.4,2.6,.14,3.1,1.4,4.05,dark);box(g,3.2,.14,1.2,3.1,3,4.5,steel);
  for(const x of [2,4.2])box(g,.13,2.9,.13,x,1.45,4.9,trim);
  for(const x of [-4.7,-3]){box(g,.65,1,.8,x,3.55,-5.5,steel);cylinder(g,.12,1.5,x,4.4,-5.5,dark);}
  mast(g,-4.2,-3,7.8,team,steel);hqYard(g,pal);
 }else if(kind=="supply"){
  depotYard(g,pal);
 }else if(kind==="generator"){
  box(g,6,1.5,3.6,-.6,.95,0,steel);for(const x of [-2.1,.7]){cylinder(g,.32,3.8,x,2.6,-.7,dark);cylinder(g,.43,.15,x,4.6,-.7,steel);}pavilion(g,2.5,3,2.4,3.5,0,camo,wall,dark);for(let z=-1.3;z<1.6;z+=.5)box(g,6,.08,.1,-.6,1.3,z,dark);
 }else if(kind==="refinery"){
  for(const x of [-2,2]){cylinder(g,1.5,3.5,x,1.95,-.5,steel);cylinder(g,1.65,.22,x,3.85,-.5,concrete);}box(g,7,.2,.3,0,1.4,2,steel);pavilion(g,3,2.5,2.5,0,3,camo,wall,dark);
 }else if(kind==="factory"||kind==="shipyard"){
  pavilion(g,8,8,4.5,-1,0,camo,wall,dark,true);pavilion(g,3,5,2.8,4.5,-1,camo,wall,dark);fieldCrates(g,-3,4,5);
  for(const x of [-3,1])box(g,2.7,2.7,.15,x,1.5,4.05,dark);
  box(g,1.3,3.2,1.3,3.8,1.7,3,steel);cylinder(g,.3,5,3.8,4.6,3,dark);
  if(kind==="shipyard"){const crane=material(0xbba054,"metal");for(const x of [-6,-4])box(g,.4,8,.4,x,4,-2,crane);box(g,3,.5,9,-5,8,1,crane);cylinder(g,.07,5,-5,5.5,5,dark);}
 }else{
  const command=kind.includes("Command")||kind.includes("Strategy"),height=3.2;
  pavilion(g,6.5,6.5,height,-1,-.5,camo,wall,dark);
  pavilion(g,3.2,4,height*.75,3.5,1.3,camo,wall,dark,kind==="barracks");
  fieldCrates(g,-3,3.5,kind==="barracks"?6:3);
  if(command||kind==="radar"){
   mast(g,3.5,-3.3,height+3,team,steel);
   const dish=new THREE.Mesh(new THREE.SphereGeometry(kind==="radar"?1.7:1.05,10,6,0,Math.PI*2,0,Math.PI*.5),steel);dish.position.set(3.4,height+1,-1);dish.rotation.x=-.7;g.add(dish);
   box(g,1.5,2.4,1.6,-3.8,1.35,-3.4,dark);for(let i=0;i<3;i++)box(g,.9,.08,.15,-3.8,1.1+i*.35,-2.55,trim);
  }else{mast(g,3,-3,4,team,steel);for(const x of [-2,0,2])box(g,1.2,.6,1.4,x,.35,-4.1,concrete);}
 }

 if(kind==="airCommand"){
  for(const x of [2,4])box(g,.18,4,.18,x,2,1.5,dark);
  box(g,3,1.8,2.8,3,4.3,1.5,wall);const cap=new THREE.Group();cap.position.y=4.2;pavilion(cap,3.2,2.9,1.2,3,1.5,camo,wall,dark,true);g.add(cap);
 }
 if(kind==="barracks")pavilion(g,3,3,2.4,-3,-4.2,camo,wall,dark,true);
 if(kind==="landCommand")box(g,4,.25,1.2,-1,.7,3.3,steel);
 if(kind==="seaCommand")for(const z of [-2,0,2])cylinder(g,.7,2.4,-3.8,1.3,z,steel);
 if(kind.includes("Strategy")){box(g,4.5,2.4,2.3,0,1.4,-4,wall);for(const x of [-2,0,2])cylinder(g,.04,5,x,3,-4.2,steel);}
 if(kind==="combatEngineer"){engineerYard(g,pal);box(g,4,.15,1.5,-1,1,3.5,steel);for(const x of [-2,-.5,1])box(g,.45,.6,.8,x,1.35,3.5,material(0xb0a568,"metal"));}
 if(['factory','barracks','combatEngineer','landCommand','airCommand','seaCommand'].includes(kind)){
  for(const x of [-3,-1,1]){box(g,.8,.55,.08,x,2.5,3.55,pal.glass);box(g,.95,.08,.16,x,2.85,3.6,trim);}
  for(const z of [-2,0,2])box(g,.1,2.7,.08,-4.4,1.5,z,trim);
  box(g,1.4,.18,1.1,-1,4.65,-1,steel);for(const z of [-1.4,-1,-.6])box(g,1.3,.05,.08,-1,4.78,z,dark);
 }
 addFacilityDetails(g,kind,steel,kind==='helipad'?material(0xd0cbb7):trim,dark);
 g.scale.setScalar(buildingScale(kind));
 g.userData.militarySilhouette=kind;return {group:batch(g),turret:null};
}
/** Structured metric airport: free apron at the real parking positions, hangars behind it. */
export function createMetricAirfieldStructures(pad:Pick<Entity,"x"|"y"|"z"|"heading"|"team">):THREE.Group {
 const group=new THREE.Group(),wall=material(0xa9b5ad,'plaster'),camo=material(0x89aaa3,'camouflage'),steel=material(0x646f68,'metal',.3),dark=material(0x424a48,'metal',.3);
 function foundation(g:THREE.Group,x:number,z:number,width:number,depth:number){
  let y=-Infinity;for(const dx of [-width/2,width/2])for(const dz of [-depth/2,depth/2]){
   const wx=pad.x+Math.cos(pad.heading)*(x+dx)+Math.sin(pad.heading)*(z+dz),wz=pad.z-Math.sin(pad.heading)*(x+dx)+Math.cos(pad.heading)*(z+dz);
   y=Math.max(y,renderedGroundHeightAt(wx,wz)-pad.y);
  }
  g.position.set(x,y+.12,z);box(g,width+.8,.5,depth+.8,0,-.1,0,material(0x858b83,'concrete'));group.add(g);
 }
 for(const s of BATTLE_SCALE.airfieldLayout.structures){
  const building=new THREE.Group();
  if(s.kind==='tower'){
   box(building,6,7,6,0,3.5,0,wall);box(building,8,2.5,8,0,8.3,0,dark);hipRoof(building,9,9,9.6,1,camo);mast(building,2,2,13,pad.team,steel);
  }else{
   pavilion(building,s.width,s.depth,s.height,0,0,camo,wall,dark,s.kind==='hangar');
   if(s.kind==='hangar'){box(building,.15,4.8,15,-s.width/2-.1,2.5,0,dark);for(const z of [-7.5,7.5])box(building,.2,5,.2,-s.width/2-.2,2.5,z,steel);}
   else {const label=facilityLabel('AIR',material(0xeee5bb));label.rotation.x=-Math.PI/2;label.position.y=s.height+.08;label.scale.setScalar(2.8);building.add(label);box(building,10,.2,4,0,2.6,-8,steel);}
  }
  foundation(building,s.x,s.z,s.width,s.depth);
 }
 group.userData.militarySilhouette='airbase';return batch(group);
}
/** Merge architecture by material without losing texture UVs. */
function batch(g:THREE.Group):THREE.Group {
  g.updateMatrixWorld(true);const inverseRoot=g.matrixWorld.clone().invert(),batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  g.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const transformed=o.geometry.clone().applyMatrix4(inverseRoot.clone().multiply(o.matrixWorld));const geometry=transformed.index?transformed.toNonIndexed():transformed;if(geometry!==transformed)transformed.dispose();if(!geometry.getAttribute("uv"))geometry.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count*2),2));const list=batches.get(o.material)??[];list.push(geometry);batches.set(o.material,list);o.geometry.dispose();}});
  g.clear();for(const [material,parts] of batches){const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);}}
  return g;
}

/** Batch static map surfaces per material and 64 m cell. Cell bounds preserve
 * frustum culling; animated buildings/units never enter this function. */
export function batchStaticScene(source:THREE.Group,cellSize=64):THREE.Group {
  const retained=source.children.filter(o=>o.userData.structureId||o.userData.bridgeId);retained.forEach(o=>source.remove(o));
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
  if(retained.length)source.add(...retained);
  return source;
}

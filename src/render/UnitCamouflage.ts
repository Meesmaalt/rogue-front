import * as THREE from 'three';
import profiles from '../data/camouflages.json';
const textures=new Map<string,THREE.DataTexture>(),variants=new WeakMap<THREE.Material,Map<string,THREE.Material>>();
export function selectedCamouflage():string {try{const id=new URLSearchParams(location.search).get('camo')??localStorage.getItem('rogue-front.camo');return profiles.some(p=>p.id===id)?id!:'standard';}catch{return 'standard';}}
/** Shared macro-patch texture and cached material variants; no per-frame texture work. */
export function camouflageTexture(id:string):THREE.DataTexture {
 const cached=textures.get(id);if(cached)return cached;const p=profiles.find(p=>p.id===id)??profiles[0],data=new Uint8Array(64*64*4),palette=p.colors.map(c=>new THREE.Color(c));
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const bx=Math.floor((x+Math.sin(y*.17)*4)/9),by=Math.floor((y+Math.cos(x*.13)*3)/8),hash=Math.abs(Math.imul(bx+3,374761393)^Math.imul(by+7,668265263)),c=palette[hash%3],i=(y*64+x)*4;data[i]=Math.round(c.r*255);data[i+1]=Math.round(c.g*255);data[i+2]=Math.round(c.b*255);data[i+3]=255;}
 const texture=new THREE.DataTexture(data,64,64);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.sharedArt=true;textures.set(id,texture);return texture;
}
export function applyUnitCamouflage(root:THREE.Object3D,id:string):void {
 if(id==='standard')return;
 root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const replace=(m:THREE.Material)=>{
  if(!(m instanceof THREE.MeshStandardMaterial)||m.name!=='armor'&&!m.userData.camouflage)return m;
  let family=variants.get(m);if(!family){family=new Map();variants.set(m,family);}let variant=family.get(id);
  if(!variant){const v=m.clone();v.map=camouflageTexture(id);v.color.set(0xffffff);v.userData={...m.userData,sharedArt:true};variant=v;family.set(id,v);}return variant;
 };o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);});
}

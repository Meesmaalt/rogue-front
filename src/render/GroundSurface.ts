import {BATTLE_SCALE} from "../sim/battleScale";
import type {MapFeatureDef} from "../sim/mapFeatures";
import * as THREE from 'three';
import {MAP_SIZE,groundHeightAt} from '../sim/heightmap';
import config from '../data/terrain.json';
import type {Point} from '../sim/types';

export function groundLayout(){
 const columns=Math.ceil(MAP_SIZE/config.render.groundTileSize),span=MAP_SIZE/columns,segments=Math.ceil(config.render.groundSegments/columns);
 return {columns,span,segments,step:span/segments};
}
/** The rendered mesh is triangular and coarser than the simulation height grid. */
export function renderedGroundHeightAt(x:number,z:number):number {
 const {step}=groundLayout(),u=(x+MAP_SIZE/2)/step,v=(z+MAP_SIZE/2)/step,ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz;
 const ax=-MAP_SIZE/2+ix*step,az=-MAP_SIZE/2+iz*step;
 const b=groundHeightAt(ax,az+step),d=groundHeightAt(ax+step,az);
 return fx+fz<=1?groundHeightAt(ax,az)*(1-fx-fz)+b*fz+d*fx:b*(1-fx)+d*(1-fz)+groundHeightAt(ax+step,az+step)*(fx+fz-1);
}
interface SurfaceOrigin extends Point {y:number;heading:number}
/** Clip each ground triangle to a local rectangle: the entire surface stays above the mesh. */
export function groundRectangle(origin:SurfaceOrigin,left:number,right:number,start:number,end:number,color:number,offset:number):THREE.BufferGeometry {
 const {step}=groundLayout(),half=MAP_SIZE/2,c=Math.cos(origin.heading),s=Math.sin(origin.heading);
 const world=(x:number,z:number)=>({x:origin.x+c*x+s*z,z:origin.z-s*x+c*z});
 const corners=[world(left,start),world(right,start),world(left,end),world(right,end)];
 const minX=Math.floor((Math.min(...corners.map(p=>p.x))+half)/step),maxX=Math.ceil((Math.max(...corners.map(p=>p.x))+half)/step);
 const minZ=Math.floor((Math.min(...corners.map(p=>p.z))+half)/step),maxZ=Math.ceil((Math.max(...corners.map(p=>p.z))+half)/step);
 const positions:number[]=[],colors:number[]=[],uv:number[]=[],tint=new THREE.Color(color);
 const local=(x:number,z:number)=>({x:(x-origin.x)*c-(z-origin.z)*s,z:(x-origin.x)*s+(z-origin.z)*c});
 function clip(poly:Point[],axis:'x'|'z',limit:number,sign:number):Point[]{
  const out:Point[]=[];for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-limit)*sign,db=(b[axis]-limit)*sign;
   if(da<=0)out.push(a);
   if((da<=0)!==(db<=0)){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }return out;
 }
 for(let iz=minZ;iz<maxZ;iz++)for(let ix=minX;ix<maxX;ix++){
  const x=-half+ix*step,z=-half+iz*step,a=local(x,z),b=local(x,z+step),d=local(x+step,z),q=local(x+step,z+step);
  for(let poly of [[a,b,d],[b,q,d]]){
   poly=clip(clip(clip(clip(poly,'x',left,-1),'x',right,1),'z',start,-1),'z',end,1);
   for(let i=1;i<poly.length-1;i++)for(const p of [poly[0],poly[i],poly[i+1]]){
    const w=world(p.x,p.z);positions.push(p.x,renderedGroundHeightAt(w.x,w.z)-origin.y+offset,p.z);colors.push(tint.r,tint.g,tint.b);uv.push(p.x/16,p.z/16);
   }
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry;
}

/** Airport scenery masks clear the apron as well as the existing reserved runway. */
export function withAirfieldAprons(features:readonly MapFeatureDef[]):readonly MapFeatureDef[]{
 const cfg=config.render.airfield,mid=(cfg.apronStart+cfg.apronEnd)/2,x=(cfg.apronLeft+cfg.apronRight)/2;
 const yards=features.filter(f=>/^base-airfield-yard-\d+$/.test(f.id));
 return [...features,...yards.map(f=>{const a=f.rotation??0,z=mid-(BATTLE_SCALE.aircraft.runwayStart+BATTLE_SCALE.aircraft.runwayEnd)/2;return {...f,id:`${f.id}-apron`,x:f.x+Math.cos(a)*x+Math.sin(a)*z,z:f.z-Math.sin(a)*x+Math.cos(a)*z,width:cfg.apronRight-cfg.apronLeft+8,depth:cfg.apronEnd-cfg.apronStart+8};})];
}

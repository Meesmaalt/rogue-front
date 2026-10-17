import * as THREE from 'three';
import {featureCorners,type MapFeatureDef} from '../sim/mapFeatures';
import {subtractParcel} from '../sim/regionalLandscape';
import {renderedGroundHeightAt} from './GroundSurface';
import type {Point} from '../sim/types';
import config from '../data/terrain.json';
const boundaryCache=new WeakMap<MapFeatureDef,{points:Point[];minX:number;maxX:number;minZ:number;maxZ:number}>();

/** Subtract already-owned pavement from each terrain triangle. No coplanar
 * asphalt or shoulder faces survive at crossings, T junctions or curved joins. */
export function clipRoadOverlap(source:THREE.BufferGeometry,masks:readonly MapFeatureDef[]):THREE.BufferGeometry {
 if(!masks.length)return source;
 const bounds=masks.map(f=>{let bounds=boundaryCache.get(f);if(!bounds){const points=featureCorners(f);bounds={points,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};boundaryCache.set(f,bounds);}return bounds;});
 const p=source.attributes.position,c=source.attributes.color,positions:number[]=[],colors:number[]=[],uv:number[]=[],normals:number[]=[];
 for(let i=0;i<p.count;i+=3){
  const triangle=Array.from({length:3},(_,j)=>({x:p.getX(i+j),z:p.getZ(i+j)})),xs=triangle.map(p=>p.x),zs=triangle.map(p=>p.z);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  let pieces:Point[][]=[triangle];
  for(const mask of bounds){
   if(mask.minX>=maxX||mask.maxX<=minX||mask.minZ>=maxZ||mask.maxZ<=minZ)continue;
   pieces=pieces.flatMap(poly=>subtractParcel(poly,mask.points,.000001));if(!pieces.length)break;
  }
  const lift=p.getY(i)-renderedGroundHeightAt(p.getX(i),p.getZ(i));
  for(const polygon of pieces)for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]]){
   positions.push(v.x,renderedGroundHeightAt(v.x,v.z)+lift,v.z);
   colors.push(c.getX(i),c.getY(i),c.getZ(i),c.itemSize===4?c.getW(i):1);uv.push(v.x/config.render.roads.worldSpan,v.z/config.render.roads.worldSpan);
   const nx=-(renderedGroundHeightAt(v.x+2,v.z)-renderedGroundHeightAt(v.x-2,v.z))/4,nz=-(renderedGroundHeightAt(v.x,v.z+2)-renderedGroundHeightAt(v.x,v.z-2))/4,n=Math.hypot(nx,1,nz);normals.push(nx/n,1/n,nz/n);
  }
 }
 source.dispose();const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return g;
}

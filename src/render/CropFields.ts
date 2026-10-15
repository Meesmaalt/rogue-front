import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import {renderedGroundHeightAt} from './GroundSurface';
import config from '../data/crops.json';
export type CropKind='wheat'|'rapeseed'|'vegetables'|'soil';
export function fieldCrop(f:MapFeatureDef):CropKind {
 if(f.cropPattern==='bare')return 'soil';
 let hash=0;for(const c of f.id)hash=(hash*31+c.charCodeAt(0))>>>0;
 return (['wheat','rapeseed','vegetables'] as const)[hash%3];
}
export const cropColors:Record<CropKind,number>={wheat:0xaaa267,rapeseed:0xb8ad50,vegetables:0x637848,soil:0x927b70};
export interface CropPoint {x:number;z:number;heading:number;kind:Exclude<CropKind,'soil'>}
/** Proportional budget prevents large maps spending all their plants on the first field. */
export function sampleCrops(features:readonly MapFeatureDef[],budget=config.budget):CropPoint[]{
 const fields=features.filter(f=>f.appearance==='field'&&fieldCrop(f)!=='soil'),area=fields.reduce((sum,f)=>sum+f.width*f.depth,0),spacing=Math.max(config.spacing,Math.sqrt(area/Math.max(1,budget)));
 const points:CropPoint[]=[],index=new MapFeatureIndex(features);
 for(const f of fields){
  const kind=fieldCrop(f);if(kind==='soil')continue;
  const a=(f.rotation??0)+(f.cropRotation??0),c=Math.cos(a),s=Math.sin(a),span=Math.hypot(f.width,f.depth),limit=Math.floor(budget*f.width*f.depth/Math.max(1,area));let placed=0;
  for(let z=-span/2+spacing/2;z<span/2&&placed<limit;z+=spacing)for(let x=-span/2+spacing/2;x<span/2&&placed<limit;x+=spacing){
   const wx=f.x+x*c+z*s,wz=f.z-x*s+z*c;if(!pointInFeature(wx,wz,f,-1))continue;
   if(index.at(wx,wz).some(b=>b!==f&&(['road','bridge','water','building','wall'].includes(b.kind)||b.appearance==='yard')&&pointInFeature(wx,wz,b,1.3)))continue;
   points.push({x:wx,z:wz,heading:a,kind});placed++;
  }
 }return points;
}
function plantGeometry(kind:Exclude<CropKind,'soil'>):THREE.BufferGeometry {
 const parts:THREE.BufferGeometry[]=[];
 for(const x of [-.25,0,.25]){
  if(kind==='vegetables')parts.push(new THREE.ConeGeometry(.3,.45,5).translate(x,.24,0));
  else {parts.push(new THREE.CylinderGeometry(.035,.045,.85,4).translate(x,.43,0));parts.push(new THREE.ConeGeometry(kind==='wheat'?.09:.19,kind==='wheat'?.35:.2,5).translate(x,.94,0));}
 }
 const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return geometry;
}
export function createCropFields(features:readonly MapFeatureDef[]):THREE.Group {
 const group=new THREE.Group();group.name='GrowingCrops';
 const cells=new Map<string,CropPoint[]>();for(const p of sampleCrops(features)){const key=`${Math.floor(p.x/config.cellSize)}/${Math.floor(p.z/config.cellSize)}/${p.kind}`,list=cells.get(key)??[];list.push(p);cells.set(key,list);}
 const materials={wheat:new THREE.MeshStandardMaterial({color:0xc8b66a,roughness:1}),rapeseed:new THREE.MeshStandardMaterial({color:0xc4c544,roughness:1}),vegetables:new THREE.MeshStandardMaterial({color:0x547c39,roughness:1})};
 const geometry={wheat:plantGeometry('wheat'),rapeseed:plantGeometry('rapeseed'),vegetables:plantGeometry('vegetables')};
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),axis=new THREE.Vector3(0,1,0);
 for(const points of cells.values()){
  const centerX=points.reduce((n,p)=>n+p.x,0)/points.length,centerZ=points.reduce((n,p)=>n+p.z,0)/points.length;
  const kind=points[0].kind,mesh=new THREE.InstancedMesh(geometry[kind],materials[kind],points.length);mesh.name=`Crop-${kind}`;
  points.forEach((p,i)=>{q.setFromAxisAngle(axis,p.heading);matrix.compose(new THREE.Vector3(p.x-centerX,renderedGroundHeightAt(p.x,p.z)+.05,p.z-centerZ),q,scale);mesh.setMatrixAt(i,matrix);});mesh.computeBoundingSphere();
  const lod=new THREE.LOD();lod.userData.cropLOD=true;lod.position.set(centerX,0,centerZ);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),config.drawDistance,.15);group.add(lod);
 }return group;
}

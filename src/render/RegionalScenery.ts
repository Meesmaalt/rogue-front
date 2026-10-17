import * as THREE from 'three';
import {getTerrainRegion,MAP_SIZE} from '../sim/heightmap';
import {REGIONS,regionalNoise} from '../sim/regions';
import {mulberry32} from '../sim/rng';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import {renderedGroundHeightAt} from './GroundSurface';
export interface SceneryPoint {x:number;z:number;size:number;angle:number;rock:boolean}
/** Visual ground detail only: does not add invisible pathfinding obstacles or concealment. */
export function sampleRegionalScenery(features:readonly MapFeatureDef[]):SceneryPoint[]{
 const region=getTerrainRegion();if(!region)return [];
 const p=REGIONS[region],budget=Math.min(24000,Math.round(p.sceneryBudget*(MAP_SIZE/2048)**2)),rnd=mulberry32(7621),index=new MapFeatureIndex(features),out:SceneryPoint[]=[];
 for(let i=0;i<budget*3&&out.length<budget;i++){
  const x=(rnd()-.5)*(MAP_SIZE-20),z=(rnd()-.5)*(MAP_SIZE-20),near=index.at(x,z);
  if(near.some(f=>(['road','water','building','bridge'].includes(f.kind)||f.appearance==='yard'||f.appearance==='field')&&pointInFeature(x,z,f,4)))continue;
  const h=renderedGroundHeightAt(x,z),slope=Math.hypot(renderedGroundHeightAt(x+4,z)-renderedGroundHeightAt(x-4,z),renderedGroundHeightAt(x,z+4)-renderedGroundHeightAt(x,z-4))/8;
  const rock=rnd()<(region==='canyon'?.65:region==='desert'?.38:.25)+slope*.5;
  if(!rock&&regionalNoise(x,z,7621,150)<.35)continue;
  if(h<0)continue;
  out.push({x,z,rock,size:(rock?.65:.45)+rnd()*(rock?2.2:1.1),angle:rnd()*Math.PI*2});
 }
 return out;
}
export function createRegionalScenery(features:readonly MapFeatureDef[]):THREE.Group {
 const root=new THREE.Group();root.name='RegionalGroundDetail';const region=getTerrainRegion();if(!region)return root;
 const points=sampleRegionalScenery(features),cells=new Map<string,SceneryPoint[]>();
 for(const p of points){const key=`${p.rock}/${Math.floor(p.x/128)}/${Math.floor(p.z/128)}`,list=cells.get(key)??[];list.push(p);cells.set(key,list);}
 const rock=new THREE.IcosahedronGeometry(1,0),scrub=new THREE.IcosahedronGeometry(1,0);
 const stone=new THREE.MeshStandardMaterial({color:REGIONS[region].rock,roughness:1}),plant=new THREE.MeshStandardMaterial({color:region==='siberia'?0x899a9f:region==='desert'?0x8b885e:0x687050,roughness:1});
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),scale=new THREE.Vector3();
 for(const list of cells.values()){
  const origin={x:list[0].x,z:list[0].z},isRock=list[0].rock,mesh=new THREE.InstancedMesh(isRock?rock:scrub,isRock?stone:plant,list.length);
  for(const [i,p] of list.entries()){
   rotation.setFromAxisAngle(axis,p.angle);scale.set(p.size,p.size*(isRock?.6:.45),p.size*.8);
   matrix.compose(new THREE.Vector3(p.x-origin.x,renderedGroundHeightAt(p.x,p.z)+scale.y*.45,p.z-origin.z),rotation,scale);mesh.setMatrixAt(i,matrix);
  }
  mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.userData.vegetationPoints=list;mesh.userData.vegetationMatrices=mesh.instanceMatrix.array.slice();
  const lod=new THREE.LOD();lod.position.set(origin.x,0,origin.z);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),320,.15);root.add(lod);
 }
 return root;
}

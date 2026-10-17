import * as THREE from 'three';
import {createSceneryGeometry,type SceneryKind} from './SceneryGeometry';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import character from '../data/region-character.json';
import {getTerrainRegion,getProceduralSeed,MAP_SIZE} from '../sim/heightmap';
import {REGIONS,regionalNoise} from '../sim/regions';
import {mulberry32} from '../sim/rng';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import {renderedGroundHeightAt} from './GroundSurface';
export interface SceneryPoint {x:number;z:number;size:number;angle:number;rock:boolean;clustered:boolean;deadwood:boolean;kind:SceneryKind;stretch:number;tint:number}
/** Visual ground detail only: does not add invisible pathfinding obstacles or concealment. */
export function sampleRegionalScenery(features:readonly MapFeatureDef[]):SceneryPoint[]{
 const region=getTerrainRegion();if(!region)return [];
 const patches=features.filter(f=>f.landscape),seed=getProceduralSeed(),cfg=character.scenery;
 const banks=new MapFeatureIndex(features.filter(f=>f.kind==='water'),96,cfg.waterDistance),woods=new MapFeatureIndex(features.filter(f=>f.appearance==='forest'),96,32);
 const p=REGIONS[region],budget=Math.min(24000,Math.round(p.sceneryBudget*(MAP_SIZE/2048)**2)),rnd=mulberry32(seed^7621),index=new MapFeatureIndex(features,64,8),out:SceneryPoint[]=[];
 for(let i=0;i<budget*3&&out.length<budget;i++){
  const clustered=patches.length>0&&rnd()<character.landscape.sceneryClusterShare,patch=clustered?patches[Math.floor(rnd()*patches.length)]:undefined;
  const a=rnd()*Math.PI*2,r=Math.sqrt(rnd()),lx=Math.cos(a)*r*(patch?.width??0)/2,lz=Math.sin(a)*r*(patch?.depth??0)/2,angle=patch?.rotation??0;
  const x=patch?patch.x+Math.cos(angle)*lx+Math.sin(angle)*lz:(rnd()-.5)*(MAP_SIZE-20),z=patch?patch.z-Math.sin(angle)*lx+Math.cos(angle)*lz:(rnd()-.5)*(MAP_SIZE-20),near=index.at(x,z);
  if(Math.max(Math.abs(x),Math.abs(z))>MAP_SIZE/2-10)continue;
  if(near.some(f=>(['road','water','building','bridge'].includes(f.kind)||f.appearance==='yard'||f.appearance==='field')&&pointInFeature(x,z,f,4)))continue;
  const h=renderedGroundHeightAt(x,z),slope=Math.hypot(renderedGroundHeightAt(x+4,z)-renderedGroundHeightAt(x-4,z),renderedGroundHeightAt(x,z+4)-renderedGroundHeightAt(x,z-4))/8;
  const rock=rnd()<(patch?.landscape==='scree'?.88:patch?.landscape==='meadow'?.12:region==='canyon'?.6:region==='desert'?.34:.22)+slope*.5;
  if(!rock&&regionalNoise(x,z,seed^7621,150)<.35)continue;
  if(h<0)continue;
  const size=(rock?.45:.45)+Math.pow(rnd(),rock?2.5:1)*(rock?(patch?.landscape==='scree'?3.4:2.2):1.1);
  const district=regionalNoise(x,z,seed^0x8ab1,cfg.districtSpan),wet=banks.at(x,z).some(f=>pointInFeature(x,z,f,cfg.waterDistance));
  let kind:SceneryKind=rock?(district<cfg.slabShare?'slab':'boulder'):'scrub';
  if(!rock){
   if(wet&&rnd()<cfg.reedShare)kind='reed';
   else if(region==='siberia'&&clustered&&rnd()<cfg.deadwoodShare&&woods.at(x,z).some(f=>pointInFeature(x,z,f,32)))kind=rnd()<cfg.stumpShare?'stump':'log';
   else if(region==='canyon'&&district<cfg.cactusShare)kind='cactus';
   else if(district<cfg.grassShare)kind='grass';
  }
  const stretch=cfg.stretch[0]+rnd()*(cfg.stretch[1]-cfg.stretch[0]),radius=size*cfg.footprint[kind]*Math.max(stretch,1);
  if(near.some(f=>(['road','water','building','bridge'].includes(f.kind)||f.appearance==='yard'||f.appearance==='field')&&pointInFeature(x,z,f,Math.max(4,radius))))continue;
  out.push({x,z,rock,clustered,deadwood:kind==='log',kind,stretch,tint:cfg.tint[0]+district*(cfg.tint[1]-cfg.tint[0]),size,angle:rnd()*Math.PI*2});
 }
 return out;
}
export function createRegionalScenery(features:readonly MapFeatureDef[]):THREE.Group {
 const root=new THREE.Group();root.name='RegionalGroundDetail';const region=getTerrainRegion();if(!region)return root;
 const points=sampleRegionalScenery(features),cells=new Map<string,SceneryPoint[]>();
 for(const p of points){const key=`${p.kind}/${Math.floor(p.x/character.scenery.cellSize)}/${Math.floor(p.z/character.scenery.cellSize)}`,list=cells.get(key)??[];list.push(p);cells.set(key,list);}
 const geometries=new Map<SceneryKind,THREE.BufferGeometry>();
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),scale=new THREE.Vector3();
 for(const list of cells.values()){
  const origin={x:list[0].x,z:list[0].z},kind=list[0].kind;
  if(!geometries.has(kind))geometries.set(kind,createSceneryGeometry(kind,region));
  const mesh=new THREE.InstancedMesh(geometries.get(kind)!,material,list.length);mesh.name=`RegionalScenery:${kind}`;
  for(const [i,p] of list.entries()){
   rotation.setFromAxisAngle(axis,p.angle);scale.set(p.size*p.stretch,p.size,p.size*.85);
   matrix.compose(new THREE.Vector3(p.x-origin.x,renderedGroundHeightAt(p.x,p.z)-.035,p.z-origin.z),rotation,scale);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color().setScalar(p.tint));
  }
  mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.userData.vegetationPoints=list;mesh.userData.vegetationMatrices=mesh.instanceMatrix.array.slice();
  const lod=new THREE.LOD();lod.position.set(origin.x,0,origin.z);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),character.scenery.drawDistance,.15);root.add(lod);
 }
 root.add(createSettlementLandmarks(features));return root;
}

/** Small visual focal points stay inside the reserved, driveable village yard. */
function landmarkGeometry(kind:NonNullable<MapFeatureDef['landmark']>):THREE.BufferGeometry {
 const parts:THREE.BufferGeometry[]=[];
 const add=(g:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{
  g.translate(x,y,z);const c=new THREE.Color(color),values=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<values.length;i+=3){values[i]=c.r;values[i+1]=c.g;values[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(values,3));const part=g.index?g.toNonIndexed():g;if(part!==g)g.dispose();parts.push(part);
 };
 const box=(w:number,h:number,d:number,color:number,x:number,y:number,z:number)=>add(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const bench=(x:number,z:number)=>{box(2,.16,.55,0x7a6e53,x,.65,z);for(const side of [-1,1])box(.16,.6,.45,0x62675d,x+side*.7,.3,z);};
 if(kind==='square'){
  add(new THREE.CylinderGeometry(1.7,1.9,.55,12),0xb9b099,0,.28,0);add(new THREE.CylinderGeometry(1.45,1.45,.08,12),0x718a86,0,.59,0);add(new THREE.CylinderGeometry(.22,.4,1.6,8),0xc3bba6,0,1.1,0);
  for(const side of [-1,1]){bench(side*4,3);add(new THREE.CylinderGeometry(.12,.2,1.8,5),0x7d7055,side*5,.9,-4);add(new THREE.ConeGeometry(.9,5.5,7),0x40553b,side*5,3.5,-4);}
 }else if(kind==='timber'){
  for(let row=0;row<3;row++)for(let i=0;i<4-row;i++)add(new THREE.CylinderGeometry(.34,.4,4,7).rotateZ(Math.PI/2),0x81715a,-2,row*.6+.4,i*.72+row*.35-1.3);
  box(3,.18,2.5,0x8b9290,4,2.2,-2);for(const side of [-1,1])box(.16,2.2,.16,0x7d7055,4+side*1.2,1.1,-2);bench(3,3);
 }else if(kind==='well'){
  add(new THREE.CylinderGeometry(1.2,1.35,.8,10),0x9b8f71,0,.4,0);add(new THREE.CylinderGeometry(.9,.9,.03,10),0x4c5043,0,.82,0);
  for(const side of [-1,1])box(.18,2.7,.18,0x796a4c,side*1.45,1.35,0);box(3.3,.2,2,0xa48d68,0,2.7,0);bench(4,3);
  for(const x of [-3.5,3.5])add(new THREE.CylinderGeometry(.45,.6,1,8),0xa48462,x,.5,-3);
 }else{
  box(4,.16,2.7,0x887b65,-2,2.7,0);for(const x of [-3.6,-.4])for(const z of [-1,1])box(.14,2.6,.14,0x786b52,x,1.3,z);bench(-2,0);
  add(new THREE.CylinderGeometry(.9,.9,2.2,10),0x8c9692,3,1.1,-2);box(1.4,.18,.45,0xa68a61,3,2.65,2);box(.16,2.7,.16,0x766b55,3,1.35,2);
 }
 const result=mergeGeometries(parts)!;result.computeBoundingSphere();parts.forEach(p=>p.dispose());return result;
}
export function createSettlementLandmarks(features:readonly MapFeatureDef[]):THREE.Group {
 const group=new THREE.Group();group.name='VillageFocalPoints';const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 for(const kind of ['square','timber','rest','well'] as const){
  const sites=features.filter(f=>f.landmark===kind);if(!sites.length)continue;const shape=landmarkGeometry(kind);
  for(const f of sites){const mesh=new THREE.InstancedMesh(shape,material,1);mesh.setMatrixAt(0,new THREE.Matrix4());mesh.userData.vegetationPoints=[{x:f.x,z:f.z}];mesh.userData.vegetationMatrices=mesh.instanceMatrix.array.slice();mesh.computeBoundingSphere();mesh.receiveShadow=true;const lod=new THREE.LOD();lod.position.set(f.x,renderedGroundHeightAt(f.x,f.z)+.02,f.z);lod.rotation.y=f.rotation??0;lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),character.landscape.landmarkDrawDistance,.15);group.add(lod);}
 }
 return group;
}

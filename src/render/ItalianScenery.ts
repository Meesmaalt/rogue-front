import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import config from '../data/italian-landscape.json';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import {renderedGroundHeightAt} from './GroundSurface';
type Kind='vineyard'|'olive'|'citrus'|'cypress'|'terrace'|'bellTower';
interface Plant{x:number;z:number;angle:number;kind:Kind}
/** Bounded agricultural detail: shared instanced trees/vines, culled in regional cells. */
export function sampleItalianScenery(features:readonly MapFeatureDef[]):Plant[]{
 const fields=features.filter(f=>f.landUse&&f.landUse!=='pasture'),area=fields.reduce((n,f)=>n+f.width*f.depth,0),index=new MapFeatureIndex(features),out:Plant[]=[];let terraces=0;
 const clear=(x:number,z:number)=>!index.at(x,z).some(f=>['water','road','bridge','building'].includes(f.kind)&&pointInFeature(x,z,f,2));
 for(const f of fields){const kind=f.landUse as 'vineyard'|'olive'|'citrus',budget=Math.floor(config.instanceBudget*f.width*f.depth/Math.max(1,area)),spacing=Math.max(kind==='vineyard'?config.vineSpacing:config.orchardSpacing,Math.sqrt(area/config.instanceBudget)),angle=(f.cropRotation??0)+(f.rotation??0),c=Math.cos(angle),s=Math.sin(angle),span=Math.hypot(f.width,f.depth);let count=0;
  for(let z=-span/2+spacing/2;z<span/2&&count<budget;z+=spacing)for(let x=-span/2+spacing/2;x<span/2&&count<budget;x+=spacing){const wx=f.x+x*c+z*s,wz=f.z-x*s+z*c;if(!pointInFeature(wx,wz,f)||!clear(wx,wz))continue;out.push({x:wx,z:wz,angle,kind});count++;
   if(kind==='vineyard'&&terraces<config.terraceLimit&&f.width>config.terraceWidth&&count%9===0&&Math.abs(renderedGroundHeightAt(wx+4,wz)-renderedGroundHeightAt(wx-4,wz))>.4){out.push({x:wx,z:wz,angle,kind:'terrace'});terraces++;}
  }
 }
 for(const f of features.filter(f=>f.id.startsWith('italian-farm-')&&f.kind==='building'))for(const side of [-1,1])for(let i=0;i<3;i++){const a=f.rotation??0,lx=side*7,lz=8+i*7,x=f.x+Math.cos(a)*lx+Math.sin(a)*lz,z=f.z-Math.sin(a)*lx+Math.cos(a)*lz;if(clear(x,z))out.push({x,z,angle:a,kind:'cypress'});}
 for(const f of features.filter(f=>f.kind==='building'&&f.id.startsWith('italian-farm-')&&f.buildingStyle==='civic'))out.push({x:f.x,z:f.z,angle:f.rotation??0,kind:'bellTower'});
 return out;
}
function geometry(kind:Kind):THREE.BufferGeometry {
 const parts:THREE.BufferGeometry[]=[];
 const add=(g:THREE.BufferGeometry,color:number,x=0,y=0,z=0)=>{g.translate(x,y,z);const c=new THREE.Color(color),data=new Float32Array(g.getAttribute('position').count*3);for(let i=0;i<data.length;i+=3){data[i]=c.r;data[i+1]=c.g;data[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(data,3));const part=g.index?g.toNonIndexed():g;if(part!==g)g.dispose();parts.push(part);};
 if(kind==='bellTower'){add(new THREE.BoxGeometry(2.4,9,2.4),0xc9b99b,2.1,4.5,-1);for(const side of [-1,1])add(new THREE.BoxGeometry(1,.9,.03),0x3e4238,2.1,7.7,-1+side*1.21);const roof=new THREE.ConeGeometry(2,2,4).rotateY(Math.PI/4);add(roof,0x9b6246,2.1,10,-1);add(new THREE.BoxGeometry(.1,1,.1),0x564d40,2.1,11.4,-1);add(new THREE.BoxGeometry(.6,.1,.1),0x564d40,2.1,11.5,-1);}
 else if(kind==='vineyard'){add(new THREE.BoxGeometry(.8,.85,3.8),0x65764a,0,1.1,0);for(const z of [-1.9,1.9])add(new THREE.CylinderGeometry(.06,.07,1.5,5),0x9c8969,0,.75,z);}
 else if(kind==='terrace')add(new THREE.BoxGeometry(.45,.4,7),0xa9a18a,0,.2,0);
 else if(kind==='cypress'){add(new THREE.CylinderGeometry(.13,.2,2,5),0x77684c,0,1,0);add(new THREE.ConeGeometry(.9,6,7),0x3d5438,0,4.1,0);}
 else {add(new THREE.CylinderGeometry(.13,.25,2.6,6),0x83735a,0,1.3,0);const crown=new THREE.IcosahedronGeometry(1,1);crown.scale(kind==='olive'?2.1:1.7,1.3,1.8);add(crown,kind==='olive'?0x839379:0x50733d,0,3,0);if(kind==='citrus')for(const x of [-.8,.7])for(const z of [-.7,.65])add(new THREE.IcosahedronGeometry(.14,0),0xdd9e38,x,2.6,z);}
 const result=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return result;
}
export function createItalianScenery(features:readonly MapFeatureDef[]):THREE.Group {
 const root=new THREE.Group();root.name='ItalianAgriculture';const cells=new Map<string,Plant[]>();
 for(const p of sampleItalianScenery(features)){const key=`${p.kind}/${Math.floor(p.x/config.cellSize)}/${Math.floor(p.z/config.cellSize)}`,list=cells.get(key)??[];list.push(p);cells.set(key,list);}
 const shapes=new Map<Kind,THREE.BufferGeometry>(),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),scale=new THREE.Vector3(1,1,1);
 for(const points of cells.values()){const kind=points[0].kind;let shape=shapes.get(kind);if(!shape){shape=geometry(kind);shapes.set(kind,shape);}const mesh=new THREE.InstancedMesh(shape,material,points.length),x=points.reduce((n,p)=>n+p.x,0)/points.length,z=points.reduce((n,p)=>n+p.z,0)/points.length;mesh.name='Italian-'+kind;mesh.castShadow=false;mesh.receiveShadow=false;
  points.forEach((p,i)=>{q.setFromAxisAngle(axis,p.angle);matrix.compose(new THREE.Vector3(p.x-x,renderedGroundHeightAt(p.x,p.z)+.03,p.z-z),q,scale);mesh.setMatrixAt(i,matrix);});mesh.computeBoundingSphere();const lod=new THREE.LOD();lod.position.set(x,0,z);lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),config.drawDistance,.15);root.add(lod);
 }return root;
}

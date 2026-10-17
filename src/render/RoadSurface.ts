import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {groundRectangle} from './GroundSurface';
import {terrainNoise} from './TerrainDetail';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
import config from '../data/terrain.json';
import {groundHeightAt} from '../sim/heightmap';
import {featureCorners} from '../sim/mapFeatures';
import {clipRoadOverlap} from './RoadOverlap';
const cfg=config.render.roads;
let asphalt:THREE.DataTexture|undefined;
/** Fixed world texel density, independent of the total map size. */
export function roadTexture():THREE.DataTexture {
 if(asphalt)return asphalt;
 const n=cfg.textureSize,bytes=new Uint8Array(n*n*4);
 for(let z=0;z<n;z++)for(let x=0;x<n;x++){
  const fine=terrainNoise(x/2,z/2,n/2),patch=terrainNoise(x/32,z/32,n/32);
  const v=Math.round(184+fine*51+patch*20),i=(z*n+x)*4;bytes[i]=v;bytes[i+1]=v;bytes[i+2]=v;bytes[i+3]=255;
 }
 asphalt=new THREE.DataTexture(bytes,n,n,THREE.RGBAFormat);asphalt.name='world-asphalt';asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;
 asphalt.colorSpace=THREE.SRGBColorSpace;asphalt.minFilter=THREE.LinearMipmapLinearFilter;asphalt.magFilter=THREE.LinearFilter;asphalt.generateMipmaps=true;asphalt.anisotropy=cfg.anisotropy;asphalt.needsUpdate=true;
 return asphalt;
}
/** Two material batches per spatial chunk; exact ground-triangle clipping avoids
 * floating roads and terrain intersections. Junctions share world asphalt UVs. */
export function createRoadSurfaces(features:readonly MapFeatureDef[]):THREE.Group {
 const group=new THREE.Group();group.name='sharp-road-network';
 const priority={arterial:0,secondary:1,street:2,track:3};
 const roads=features.filter(f=>f.kind==='road').sort((a,b)=>priority[a.roadClass??'secondary']-priority[b.roadClass??'secondary']);
 const rank=new Map(roads.map((f,i)=>[f,i])),index=new MapFeatureIndex(features.filter(f=>f.kind==='road'||f.kind==='bridge'));
 const buckets=new Map<string,{asphalt:THREE.BufferGeometry[];solid:THREE.BufferGeometry[]}>();
 const texture=roadTexture(),roadMat=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.012,roughness:.97,vertexColors:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const solidMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 for(const f of roads){
  const corners=featureCorners(f),nearby=index.query(Math.min(...corners.map(p=>p.x))-2,Math.min(...corners.map(p=>p.z))-2,Math.max(...corners.map(p=>p.x))+2,Math.max(...corners.map(p=>p.z))+2);
  const previous=nearby.filter(o=>o!==f&&(o.kind==='bridge'||(rank.get(o)??Infinity)<rank.get(f)!));
  const markingMasks=nearby.filter(o=>o!==f&&(o.kind==='bridge'||Math.abs(Math.sin((o.rotation??0)-(f.rotation??0)))>.25)).map(o=>({...o,width:o.width+2}));
  const key=`${Math.floor(f.x/cfg.chunkSpan)}/${Math.floor(f.z/cfg.chunkSpan)}`;
  let bucket=buckets.get(key);if(!bucket){bucket={asphalt:[],solid:[]};buckets.set(key,bucket);}
  const a=f.rotation??0,origin={x:f.x,z:f.z,y:0,heading:a};
  const rect=(width:number,start:number,end:number,color:number,lift:number,textured:boolean,masks:readonly MapFeatureDef[]=[])=>{
   if(end-start<.001)return;
   const g=groundRectangle(origin,-width/2,width/2,start,end,color,lift);g.rotateY(a);g.translate(f.x,0,f.z);
   const p=g.attributes.position,uv=g.attributes.uv,normal=g.attributes.normal;
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),nx=-(groundHeightAt(x+2,z)-groundHeightAt(x-2,z))/4,nz=-(groundHeightAt(x,z+2)-groundHeightAt(x,z-2))/4,length=Math.hypot(nx,1,nz);
    uv.setXY(i,x/cfg.worldSpan,z/cfg.worldSpan);normal.setXYZ(i,nx/length,1/length,nz/length);
   }
   const clipped=clipRoadOverlap(g,masks);
   if(clipped.attributes.position.count)bucket![textured?'asphalt':'solid'].push(clipped);else clipped.dispose();
  };
  const track=f.roadClass==='track',street=f.roadClass==='street',lift=track?.05:street?.075:.10;
  rect(f.width+1.4,-f.depth/2,f.depth/2,track?0xa39c81:0x8a907b,.025,false,previous.map(o=>({...o,width:o.width+1.4})));
  rect(f.width,-f.depth/2,f.depth/2,track?0xa39a7d:0x656d69,lift,true,previous);
  if(track||street)continue;
  const phase=f.x*Math.sin(a)+f.z*Math.cos(a),period=cfg.dashPeriod;
  for(let z=Math.floor((-f.depth/2+phase)/period)*period-phase;z<f.depth/2;z+=period){
   const start=Math.max(-f.depth/2,z),end=Math.min(f.depth/2,z+cfg.dashLength);if(end<=start)continue;
   const mid=(start+end)/2,x=f.x+Math.sin(a)*mid,zz=f.z+Math.cos(a)*mid;
   if(index.at(x,zz).some(o=>o!==f&&(o.kind==='bridge'||Math.abs(Math.sin((o.rotation??0)-a))>.25)&&pointInFeature(x,zz,o,1)))continue;
   rect(cfg.markingWidth,start,end,0xe0dec8,lift+.025,false,markingMasks);
  }
 }
 for(const bucket of buckets.values())for(const type of ['asphalt','solid'] as const){
  if(!bucket[type].length)continue;
  const geometry=mergeGeometries(bucket[type],false)!;bucket[type].forEach(g=>g.dispose());geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,type==='asphalt'?roadMat:solidMat);mesh.name=`road-${type}`;mesh.receiveShadow=true;group.add(mesh);
 }
 if(!buckets.size){roadMat.dispose();solidMat.dispose();}
 return group;
}

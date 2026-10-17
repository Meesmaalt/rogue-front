import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {createRoadSurfaces,roadTexture} from './RoadSurface';
import {renderedGroundHeightAt} from './GroundSurface';
import {resetHeightmap,setBases,setMapSize,setTerrainProfile,setProceduralSeed} from '../sim/heightmap';
import config from '../data/terrain.json';
import {FogOfWar} from './FogOfWar';
import {World} from '../sim/World';
afterEach(resetHeightmap);
it('road surfaces and markings stay above the actual terrain triangles at arbitrary angles',()=>{
 setMapSize(4096);setBases([]);setProceduralSeed(42);setTerrainProfile('farmland-natural',[{x:40,z:35,width:180,depth:110,height:20,shape:'ridge',rotation:.7}]);
 const group=createRoadSurfaces([{id:'main',kind:'road',x:20,z:30,width:8,depth:290,rotation:.63,roadClass:'arterial'}]);
 expect(group.children).toHaveLength(2);let markings=0;
 for(const mesh of group.children as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]){
  const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,c=mesh.geometry.attributes.color;
  expect(p.count).toBeLessThan(10000);expect([...mesh.geometry.attributes.normal.array].every(Number.isFinite)).toBe(true);expect(mesh.geometry.groups).toHaveLength(0);expect(mesh.geometry.boundingSphere).not.toBeNull();
  for(let i=0;i<p.count;i++){expect(uv.getX(i)).toBeCloseTo(p.getX(i)/config.render.roads.worldSpan,4);expect(uv.getY(i)).toBeCloseTo(p.getZ(i)/config.render.roads.worldSpan,4);if(c.getX(i)>.7)markings++;}
  for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;expect(y-renderedGroundHeightAt(x,z)).toBeGreaterThan(.02);expect(y-renderedGroundHeightAt(x,z)).toBeLessThan(.14);}
  mesh.geometry.dispose();
 }
 expect(markings).toBeGreaterThan(0);
});
it('asphalt texel density and allocation stay constant from small maps to 6 km maps',()=>{
 const texture=roadTexture();expect(texture).toBe(roadTexture());expect(texture.image.data.byteLength).toBeLessThanOrEqual(256*256*4);expect(texture.generateMipmaps).toBe(true);expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
 for(const size of [2048,6144]){
  setMapSize(size);const group=createRoadSurfaces([{id:'road',kind:'road',x:20,z:20,width:8,depth:80}]);
  const mesh=group.children.find(o=>o.name==='road-asphalt') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  expect(mesh.material.map).toBe(texture);const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  for(let i=0;i<p.count;i++)expect(uv.getX(i)*config.render.roads.worldSpan).toBeCloseTo(p.getX(i),4);
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 }
});

it('sharp asphalt and paint retain world visibility fog instead of revealing hidden road networks',()=>{
 const world=new World(42,false,[],[],[],false),group=createRoadSurfaces([{id:'road',kind:'road',x:0,z:0,width:8,depth:80}]);
 new FogOfWar(group,world);
 for(const mesh of group.children as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]){
  const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}} as Parameters<typeof mesh.material.onBeforeCompile>[0];
  mesh.material.onBeforeCompile(shader,{} as THREE.WebGLRenderer);
  expect(shader.fragmentShader).toContain('texture2D(rfFogCurrent, rfFogUV)');expect(shader.vertexShader).toContain('rfFogPosition');expect(mesh.material.customProgramCacheKey()).toContain('world-visibility-fog-v1');
  mesh.geometry.dispose();
 }
});

it.each([Math.PI/2,Math.PI/4])('crossing roads cover each asphalt point once rather than stacking coplanar strips (angle=%s)',rotation=>{
 setMapSize(2048);setBases([{x:0,z:0,r:200}]);
 const group=createRoadSurfaces([{id:'a',kind:'road',x:0,z:0,width:8,depth:40},{id:'b',kind:'road',x:0,z:0,width:8,depth:40,rotation}]);
 let area=0;
 for(const mesh of group.children as THREE.Mesh<THREE.BufferGeometry>[]){
  if(mesh.name==='road-asphalt'){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3)area+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;}
  mesh.geometry.dispose();
 }
 expect(area).toBeCloseTo(640-64/Math.sin(rotation),2);expect(group.children.length).toBeLessThanOrEqual(8);
});

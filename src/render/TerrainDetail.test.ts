import {afterEach,expect,it} from 'vitest';
import * as THREE from 'three';
import {applyTerrainDetail,createTerrainDetailTexture,setTerrainDetailQuality,terrainDetailPixels,terrainNoise} from './TerrainDetail';
import {FogOfWar} from './FogOfWar';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
import config from '../data/terrain.json';
afterEach(resetHeightmap);
const compile=(material:THREE.MeshStandardMaterial)=>{
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}} as Parameters<typeof material.onBeforeCompile>[0];
 material.onBeforeCompile(shader,{} as THREE.WebGLRenderer);return shader;
};
it('packed micro-surface pixels are deterministic, bounded and contain multiple scales of detail',()=>{
 const bytes=terrainDetailPixels();expect(bytes).toEqual(terrainDetailPixels());expect(bytes.byteLength).toBe(256*256*4);
 let opaque=true;const red=new Set<number>(),green=new Set<number>(),blue=new Set<number>();for(let i=0;i<bytes.length;i+=4){red.add(bytes[i]);green.add(bytes[i+1]);blue.add(bytes[i+2]);opaque &&= bytes[i+3]===255;}
 expect(opaque).toBe(true);expect(red.size).toBeGreaterThan(100);expect(green.size).toBeGreaterThan(100);expect(blue.size).toBeGreaterThan(100);
});
it('periodic patches meet at the texture borders without changing world detail scale on larger maps',()=>{
 for(const [x,z] of [[.25,.73],[-.01,2.2],[4.1,-8.2]])expect(terrainNoise(x,z,4)).toBeCloseTo(terrainNoise(x+4,z-4,4),12);
 for(const size of [4096,6144]){
  const texture=createTerrainDetailTexture(size);expect(texture.repeat.x*24/size).toBeCloseTo(1,12);expect(texture.generateMipmaps).toBe(true);expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);expect(texture.colorSpace).toBe(THREE.NoColorSpace);
  expect(texture.image.data.byteLength).toBeLessThan(512*512*4);texture.dispose();
 }
});
it('detail reuses the bump sampler, fades both albedo and normal relief, and preserves standard lighting',()=>{
 const texture=createTerrainDetailTexture(4096),material=new THREE.MeshStandardMaterial({bumpMap:texture});applyTerrainDetail(material,texture);
 const shader=compile(material);expect(shader.fragmentShader).toContain('texture2D(bumpMap, vBumpMapUv)');expect(shader.fragmentShader).toContain('(dHdxy_fwd() * rfTerrainFade)');expect(shader.fragmentShader).toContain('dot(vViewPosition, vViewPosition)');expect(shader.fragmentShader).toContain('#include <lights_physical_fragment>');
 expect(shader.uniforms.rfTerrainStrength.value).toBe(config.render.detail.quality.medium.albedo);expect(shader.uniforms.rfTerrainFadeRange.value).toEqual(new THREE.Vector2(180**2,650**2));
 texture.dispose();material.dispose();
});
it('quality changes update shared uniforms with no new meshes, geometry, material or shader variants',()=>{
 const texture=createTerrainDetailTexture(4096),material=new THREE.MeshStandardMaterial({bumpMap:texture}),geometry=new THREE.PlaneGeometry(),group=new THREE.Group();applyTerrainDetail(material,texture);
 group.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));const shader=compile(material),key=material.customProgramCacheKey(),version=material.version;
 setTerrainDetailQuality(group,'low');expect(shader.uniforms.rfTerrainStrength.value).toBe(0);expect(material.bumpScale).toBe(0);expect(shader.fragmentShader).toContain('if (bumpScale != 0.0)');
 setTerrainDetailQuality(group,'high');expect(shader.uniforms.rfTerrainStrength.value).toBe(config.render.detail.quality.high.albedo);expect(texture.anisotropy).toBe(8);expect(material.version).toBe(version);expect(material.customProgramCacheKey()).toBe(key);
 expect(group.children).toHaveLength(2);for(const child of group.children){expect((child as THREE.Mesh).geometry).toBe(geometry);expect((child as THREE.Mesh).material).toBe(material);}
 texture.dispose();material.dispose();geometry.dispose();
});
it('the terrain shader composes with world-space visibility fog and retains both cache identities',()=>{
 const world=new World(71,false,[],[],[],false),texture=createTerrainDetailTexture(640),material=new THREE.MeshStandardMaterial({bumpMap:texture}),group=new THREE.Group();applyTerrainDetail(material,texture);const geometry=new THREE.PlaneGeometry();group.add(new THREE.Mesh(geometry,material));
 new FogOfWar(group,world);const shader=compile(material);
 expect(shader.fragmentShader).toContain('rfTerrainFade');expect(shader.fragmentShader).toContain('texture2D(rfFogCurrent, rfFogUV)');expect(material.customProgramCacheKey()).toContain('terrain-micro-surface-v2|world-visibility-fog-v1');expect(shader.vertexShader).toContain('rfFogUV');
 texture.dispose();material.dispose();geometry.dispose();(shader.uniforms.rfFogPrevious.value as THREE.Texture).dispose();(shader.uniforms.rfFogCurrent.value as THREE.Texture).dispose();
});

it('injected normal chunks keep GLSL directives on their own lines',()=>{
 const texture=createTerrainDetailTexture(4096),material=new THREE.MeshStandardMaterial({bumpMap:texture});applyTerrainDetail(material,texture);
 const shader=compile(material);
 for(const line of shader.fragmentShader.split('\n')){
  if(line.includes('#'))expect(line.trim()).toMatch(/^#(?:include|if|ifdef|ifndef|else|elif|endif|define|undef)\b/);
  if(/^\s*#(?:else|endif)\b/.test(line))expect(line.trim()).toMatch(/^#(?:else|endif)\s*$/);
 }
 texture.dispose();material.dispose();
});

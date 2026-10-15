import * as THREE from 'three';
import config from '../data/terrain.json';
import type {GameSettings} from '../ui/Settings';

type Quality=GameSettings['quality'];
const detail=config.render.detail;
interface DetailState {strength:{value:number};fade:{value:THREE.Vector2};texture:THREE.Texture}
function hash(x:number,z:number):number {
 let h=Math.imul(x,374761393)^Math.imul(z,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
/** Periodic value noise: wrapping and mipmapping introduce no tile border. */
export function terrainNoise(x:number,z:number,period=0):number {
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
 const wrap=(v:number)=>period?((v%period)+period)%period:v;
 const at=(dx:number,dz:number)=>hash(wrap(ix+dx),wrap(iz+dz));
 const sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
 return (at(0,0)*(1-sx)+at(1,0)*sx)*(1-sz)+(at(0,1)*(1-sx)+at(1,1)*sx)*sz;
}
/** Packed data: red=microheight, green=fine albedo, blue=soil/grass patches. */
export function terrainDetailPixels(size=detail.textureSize):Uint8Array<ArrayBuffer> {
 const bytes=new Uint8Array(size*size*4);
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(z+.5)/size;
  const fine=terrainNoise(u*64,v*64,64),clumps=terrainNoise(u*16,v*16,16),patch=terrainNoise(u*4,v*4,4);
  const grit=hash(x,z),i=(z*size+x)*4;
  bytes[i]=Math.round(255*(fine*.5+clumps*.35+grit*.15));
  bytes[i+1]=Math.round(255*(fine*.55+grit*.45));bytes[i+2]=Math.round(patch*255);bytes[i+3]=255;
 }
 return bytes;
}
export function createTerrainDetailTexture(mapSize:number):THREE.DataTexture {
 const texture=new THREE.DataTexture(terrainDetailPixels(),detail.textureSize,detail.textureSize,THREE.RGBAFormat);
 texture.name='terrain-micro-surface';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(mapSize/detail.worldSpan,mapSize/detail.worldSpan);
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;
 texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;return texture;
}
/** One extra lookup reuses the existing bump texture; no new geometry, passes or texture allocations. */
export function applyTerrainDetail(material:THREE.MeshStandardMaterial,texture:THREE.Texture,quality:Quality='medium'):void {
 const state:DetailState={strength:{value:0},fade:{value:new THREE.Vector2(detail.fadeStart**2,detail.fadeEnd**2)},texture};
 material.userData.terrainDetail=state;
 const previous=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous(shader,renderer);shader.uniforms.rfTerrainStrength=state.strength;shader.uniforms.rfTerrainFadeRange=state.fade;
  shader.fragmentShader='uniform float rfTerrainStrength; uniform vec2 rfTerrainFadeRange;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float rfTerrainFade = 1.0 - smoothstep(rfTerrainFadeRange.x, rfTerrainFadeRange.y, dot(vViewPosition, vViewPosition));
    #ifdef USE_BUMPMAP
      if (rfTerrainStrength > 0.0) {
        vec3 rfSurface = texture2D(bumpMap, vBumpMapUv).rgb;
        float rfGrain = (rfSurface.g - 0.5) * 1.3 + (rfSurface.b - 0.5) * 0.7;
        float rfMeadow = clamp((diffuseColor.g - diffuseColor.b) * 7.0, 0.0, 1.0);
        vec3 rfTint = mix(vec3(1.03, 1.0, 0.94), vec3(0.97, 1.02, 0.94), rfMeadow);
        diffuseColor.rgb *= mix(vec3(1.0), rfTint * (1.0 + rfGrain * rfTerrainStrength), rfTerrainFade);
      }
    #endif`);
  // Reuse Three's tangent/face handling; fading the gradient avoids distant sparkling.
  const normalMaps=THREE.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()', '(dHdxy_fwd() * rfTerrainFade)');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#ifdef USE_BUMPMAP
    if (bumpScale != 0.0) {
      ${normalMaps}
    }
    #else
    ${normalMaps}
    #endif`);
 };
 material.customProgramCacheKey=()=>key+'|terrain-micro-surface-v2';
 setMaterialQuality(material,quality);
}
function setMaterialQuality(material:THREE.MeshStandardMaterial,quality:Quality):void {
 const state=material.userData.terrainDetail as DetailState|undefined;if(!state)return;
 const profile=detail.quality[quality];state.strength.value=profile.albedo;material.bumpScale=profile.bump;
 if(state.texture.anisotropy!==profile.anisotropy){state.texture.anisotropy=profile.anisotropy;state.texture.needsUpdate=true;}
}
/** Uniform-only material changes: switching detail strength never creates another shader variant. */
export function setTerrainDetailQuality(root:THREE.Object3D,quality:Quality):void {
 const seen=new Set<THREE.Material>();root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(seen.has(material)||!(material instanceof THREE.MeshStandardMaterial))continue;seen.add(material);setMaterialQuality(material,quality);
  }
 });
}

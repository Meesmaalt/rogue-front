import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {warmTerrainBuffers} from './TerrainWarmup';
it('warmup draws all static LOD geometry offscreen and restores culling, target and visibility',()=>{
 const scene=new THREE.Scene(),terrain=new THREE.Group(),lod=new THREE.LOD(),near=new THREE.Mesh(),far=new THREE.Mesh();
 lod.addLevel(near,0);lod.addLevel(far,100);lod.visible=false;near.visible=false;lod.autoUpdate=false;terrain.add(lod);scene.add(terrain);
 const previous=new THREE.WebGLRenderTarget(2,2),targets:unknown[]=[];
 const renderer={shadowMap:{enabled:true},getRenderTarget:()=>previous,setRenderTarget:(t:unknown)=>targets.push(t),render:vi.fn(()=>{expect(lod.visible).toBe(true);expect(near.visible).toBe(true);expect(far.visible).toBe(true);expect(near.frustumCulled).toBe(false);}),info:{reset:vi.fn()}};
 warmTerrainBuffers(renderer as unknown as THREE.WebGLRenderer,scene,new THREE.Camera(),terrain);
 expect(renderer.render).toHaveBeenCalledTimes(1);expect(targets.at(-1)).toBe(previous);expect(renderer.shadowMap.enabled).toBe(true);expect(lod.visible).toBe(false);expect(near.visible).toBe(false);expect(lod.autoUpdate).toBe(false);expect(near.frustumCulled).toBe(true);previous.dispose();
});

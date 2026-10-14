import * as THREE from 'three';
/** Upload every static LOD geometry at setup time; moving into a new ward needs no first upload. */
export function warmTerrainBuffers(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,terrain:THREE.Group):void {
 const states:Array<{object:THREE.Object3D;visible:boolean;culled:boolean}>=[],lods:Array<{lod:THREE.LOD;auto:boolean}>=[];
 terrain.traverse(object=>{states.push({object,visible:object.visible,culled:object.frustumCulled});object.visible=true;object.frustumCulled=false;if(object instanceof THREE.LOD){lods.push({lod:object,auto:object.autoUpdate});object.autoUpdate=false;}});
 const target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true}),previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.enabled;
 try{renderer.shadowMap.enabled=false;renderer.setRenderTarget(target);renderer.render(scene,camera);}
 finally{renderer.setRenderTarget(previous);renderer.shadowMap.enabled=shadows;for(const s of states){s.object.visible=s.visible;s.object.frustumCulled=s.culled;}for(const s of lods)s.lod.autoUpdate=s.auto;target.dispose();renderer.info.reset();}
}

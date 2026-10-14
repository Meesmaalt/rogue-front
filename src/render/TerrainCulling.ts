import terrainConfig from "../data/terrain.json";
import * as THREE from "three";

/** Cull entire static LOD roots before Three traverses their hidden detail meshes. */
export class TerrainCulling {
  private readonly entries:Array<{lod:THREE.LOD;bounds:THREE.Sphere}>=[];
  private readonly frustum=new THREE.Frustum();
  private readonly projection=new THREE.Matrix4();
  private readonly previousProjection=new THREE.Matrix4();
  private readonly previousCameraWorld=new THREE.Matrix4();
  private camera:THREE.Camera|undefined;
  visibleGroups=0;
  get totalGroups():number{return this.entries.length;}
  constructor(terrain:THREE.Group,margin=terrainConfig.render.visibilityMargin){
    terrain.updateMatrixWorld(true);
    terrain.traverse(o=>{
      if(!(o instanceof THREE.LOD))return;
      const box=new THREE.Box3().setFromObject(o);if(box.isEmpty())return;
      const bounds=box.getBoundingSphere(new THREE.Sphere());bounds.radius+=margin;
      o.autoUpdate=false;this.entries.push({lod:o,bounds});
    });
  }
  sync(camera:THREE.Camera):void {
    camera.updateMatrixWorld();
    if(this.camera===camera&&this.previousProjection.equals(camera.projectionMatrix)&&this.previousCameraWorld.equals(camera.matrixWorld))return;
    this.camera=camera;this.previousProjection.copy(camera.projectionMatrix);this.previousCameraWorld.copy(camera.matrixWorld);
    this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    this.visibleGroups=0;
    for(const {lod,bounds} of this.entries){
      lod.visible=this.frustum.intersectsSphere(bounds);
      if(lod.visible){lod.update(camera);this.visibleGroups++;}
    }
  }
}

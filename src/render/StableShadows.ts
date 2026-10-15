import * as THREE from 'three';
import config from '../data/terrain.json';
/** Fixed light direction/projection, snapped in light space; forced refreshes never move coverage. */
export class StableShadows {
 private readonly center=new THREE.Vector3(Infinity,Infinity,Infinity);
 private readonly direction=new THREE.Vector3(70,95,45).normalize();
 private readonly right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),this.direction).normalize();
 private readonly up=new THREE.Vector3().crossVectors(this.direction,this.right).normalize();
 constructor(private readonly sun:THREE.DirectionalLight){
  const camera=sun.shadow.camera,extent=config.render.shadows.extent;
  camera.left=-extent;camera.right=extent;camera.top=extent;camera.bottom=-extent;camera.near=1;camera.far=config.render.shadows.depth;camera.updateProjectionMatrix();
 }
 update(focus:THREE.Vector3,force=false):boolean {
  const cfg=config.render.shadows;
  if(focus.distanceToSquared(this.center)>(cfg.extent*cfg.recenterFraction)**2){
   const texel=cfg.extent*2/this.sun.shadow.mapSize.x,snap=(axis:THREE.Vector3)=>Math.round(focus.dot(axis)/texel)*texel;
   this.center.copy(this.right).multiplyScalar(snap(this.right)).addScaledVector(this.up,snap(this.up)).addScaledVector(this.direction,snap(this.direction));
   this.sun.target.position.copy(this.center);this.sun.position.copy(this.center).addScaledVector(this.direction,cfg.lightDistance);
   this.sun.target.updateMatrixWorld();this.sun.updateMatrixWorld();return true;
  }
  return force;
 }
}

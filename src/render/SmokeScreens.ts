import * as THREE from 'three';
import rules from '../data/battle-smoke.json';
import {smokeState} from '../sim/battleSmoke';
import type {World} from '../sim/World';
/** One bounded billboard batch, rebuilt from saved sim state; no persistent particles or timers. */
export class SmokeScreens {
 private readonly mesh:THREE.InstancedMesh;
 private readonly opacity:THREE.InstancedBufferAttribute;
 private readonly dummy=new THREE.Object3D();
 private readonly matrix=new THREE.Matrix4();
 private readonly frustum=new THREE.Frustum();
 private readonly sphere=new THREE.Sphere();
 constructor(scene:THREE.Scene,private readonly camera:THREE.PerspectiveCamera){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,.85)');gradient.addColorStop(.45,'rgba(255,255,255,.65)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const capacity=rules.maxClouds*rules.visualPuffs,geometry=new THREE.PlaneGeometry(1,1);this.opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);geometry.setAttribute('screenOpacity',this.opacity);
  const material=new THREE.MeshBasicMaterial({color:0xb4b5ad,map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float screenOpacity; varying float vScreenOpacity;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvScreenOpacity=screenOpacity;');
   shader.fragmentShader='varying float vScreenOpacity;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vScreenOpacity;');
  };
  this.mesh=new THREE.InstancedMesh(geometry,material,capacity);this.mesh.name='TacticalSmoke';this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.opacity.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
 }
 sync(world:World,quality:'low'|'medium'|'high'):void {
  this.camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  let count=0;const puffs=quality==='low'?Math.floor(rules.visualPuffs/2):rules.visualPuffs;
  for(const cloud of world.smoke.active){
   const state=smokeState(cloud,world.time);if(!state.density)continue;
   const r=state.radius;
   if(![[0,0],[r,0],[-r,0],[0,r],[0,-r]].some(([x,z])=>world.vision.isVisible(world.playerTeam,cloud.x+x,cloud.z+z)))continue;
   this.sphere.center.set(cloud.x,cloud.y+rules.height/2,cloud.z);this.sphere.radius=r+rules.height;
   if(!this.frustum.intersectsSphere(this.sphere)||this.camera.position.distanceToSquared(this.sphere.center)>rules.visualDistance**2)continue;
   for(let i=0;i<puffs;i++){
    const angle=i*2.39996+cloud.id*.37,ring=i%3===0?.15:.65,wobble=Math.sin(world.time*.4+i)*.3;
    this.dummy.position.set(cloud.x+Math.cos(angle)*r*ring,cloud.y+1+(i%3)*1.8+wobble,cloud.z+Math.sin(angle)*r*ring);
    this.dummy.quaternion.copy(this.camera.quaternion);const size=r*(i%3===0?1.35:1.05);this.dummy.scale.set(size,size,1);this.dummy.updateMatrix();this.mesh.setMatrixAt(count,this.dummy.matrix);this.opacity.setX(count,state.density*.7);count++;
   }
  }
  this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;this.opacity.needsUpdate=true;
 }
}

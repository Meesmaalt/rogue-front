import {expect,it} from 'vitest';
import * as THREE from 'three';
import {StableShadows} from './StableShadows';
import config from '../data/terrain.json';
it('forced caster updates and small focus changes keep the shadow projection anchored',()=>{
 const sun=new THREE.DirectionalLight();sun.shadow.mapSize.set(2048,2048);const stable=new StableShadows(sun),focus=new THREE.Vector3(100,12,-200);
 expect(stable.update(focus)).toBe(true);const position=sun.position.clone(),target=sun.target.position.clone(),projection=sun.shadow.camera.projectionMatrix.clone();
 for(let i=0;i<100;i++){expect(stable.update(focus.clone().add(new THREE.Vector3(i*.01,Math.sin(i)*2,0)),true)).toBe(true);expect(sun.position).toEqual(position);expect(sun.target.position).toEqual(target);expect(sun.shadow.camera.projectionMatrix).toEqual(projection);}
 expect(stable.update(focus,false)).toBe(false);
});
it('coverage recentres in light-space texels without rotating the sun or changing scale',()=>{
 const sun=new THREE.DirectionalLight();sun.shadow.mapSize.set(2048,2048);const stable=new StableShadows(sun);stable.update(new THREE.Vector3());const direction=sun.position.clone().sub(sun.target.position).normalize(),projection=sun.shadow.camera.projectionMatrix.clone();
 expect(stable.update(new THREE.Vector3(300,45,-100))).toBe(true);expect(sun.position.clone().sub(sun.target.position).normalize().distanceTo(direction)).toBeLessThan(1e-12);expect(sun.shadow.camera.projectionMatrix).toEqual(projection);
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right),step=config.render.shadows.extent*2/2048;
 for(const axis of [right,up])expect(sun.target.position.dot(axis)/step).toBeCloseTo(Math.round(sun.target.position.dot(axis)/step),8);
});

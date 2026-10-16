import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {SmokeScreens} from './SmokeScreens';
import {World} from '../sim/World';
import {resetHeightmap,setBases} from '../sim/heightmap';
import rules from '../data/battle-smoke.json';
afterEach(()=>{vi.unstubAllGlobals();resetHeightmap();});
it('one bounded batch follows saved clouds, respects fog and drops expired screens',()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},fillStyle:''})})});
 const bases=[{x:0,z:0,r:200},{x:260,z:260,r:20}];setBases(bases);const w=new World(5,false,[],[],bases,false),u=w.spawn('tank',0,0,0);u.heading=0;w.smoke.deploy(w,u);w.time=3;w.smoke.tick(w.time);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,1000);camera.position.set(0,35,-45);camera.lookAt(0,2,7);const screens=new SmokeScreens(scene,camera),mesh=scene.getObjectByName('TacticalSmoke') as THREE.InstancedMesh;
 vi.spyOn(w.vision,'isVisible').mockReturnValue(true);screens.sync(w,'high');expect(mesh.count).toBe(rules.visualPuffs);expect(mesh.instanceMatrix.count).toBe(rules.maxClouds*rules.visualPuffs);
 screens.sync(w,'low');expect(mesh.count).toBe(Math.floor(rules.visualPuffs/2));vi.mocked(w.vision.isVisible).mockReturnValue(false);screens.sync(w,'high');expect(mesh.count).toBe(0);
 vi.mocked(w.vision.isVisible).mockReturnValue(true);w.time=rules.duration;w.smoke.tick(w.time);screens.sync(w,'high');expect(mesh.count).toBe(0);
});

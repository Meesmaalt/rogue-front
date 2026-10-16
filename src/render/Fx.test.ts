import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {Fx} from './Fx';
import {World} from '../sim/World';
import {setBases,resetHeightmap,heightAt} from '../sim/heightmap';
import effects from '../data/effects.json';
beforeEach(()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},fillStyle:''})})});
});
afterEach(()=>{vi.unstubAllGlobals();resetHeightmap();});
function fixture(){
 const bases=[{x:0,z:-170,r:180},{x:200,z:200,r:30}];setBases(bases);const w=new World(712,false,[],[],bases,false);w.networkMode=true;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,1000);camera.position.set(0,70,-100);camera.lookAt(0,0,-170);camera.updateMatrixWorld();
 const fx=new Fx(scene,camera),meshes=scene.children.filter((c):c is THREE.InstancedMesh=>c instanceof THREE.InstancedMesh);
 return {w,fx,meshes};
}
it('healthy stationary vehicles emit nothing, moving vehicles make dust and engine damage makes smoke',()=>{
 const {w,fx,meshes}=fixture(),u=w.spawn('tank',0,0,-170);
 fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes.map(m=>m.count)).toEqual([0,0,0,0,0]);
 u.motionSpeed=5;u.px=u.x-5/30;fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(2);expect(meshes[0].count).toBe(0);
 u.motionSpeed=0;u.px=u.x;u.components!.engine=80;fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[0].count).toBe(1);
});
it('hidden enemies and carried units never leak damage or movement effects',()=>{
 const {w,fx,meshes}=fixture(),enemy=w.spawn('tank',1,0,-170),carried=w.spawn('tank',0,5,-170);enemy.hp=1;enemy.motionSpeed=10;carried.hp=1;carried.loadedIntoId=999;
 vi.spyOn(w,'isSpottedByTeam').mockReturnValue(false);fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes.every(m=>m.count===0)).toBe(true);
});
it('rotor downwash occurs near the ground, and stops at altitude',()=>{
 const {w,fx,meshes}=fixture(),u=w.spawn('heli',0,0,-170);u.y=heightAt(u.x,u.z)+5;
 fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(3);u.y+=30;fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(3);
});
it('a crowded scene stays within particle capacities and reset clears all transient effects',()=>{
 const {w,fx,meshes}=fixture();for(let i=0;i<100;i++){const u=w.spawn('tank',0,i%10,-170+Math.floor(i/10));u.hp=1;u.motionSpeed=10;u.px=u.x-10/30;}
 for(let i=0;i<100;i++)fx.syncUnitEffects(w,.13);fx.update(0);
 expect(meshes[0].count).toBe(effects.pools.smoke);expect(meshes[2].count).toBe(effects.pools.dust);
 expect(meshes.every((m,i)=>m.count<=Object.values(effects.pools)[i])).toBe(true);fx.reset();expect(meshes.every(m=>m.count===0)).toBe(true);
});

it('blocked vehicles with stale speed intent emit no movement dust',()=>{
 const {w,fx,meshes}=fixture(),u=w.spawn('tank',0,0,-170);u.motionSpeed=12;
 fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(0);
});

it('construction dust follows real work progress and stops when a waiting crew makes no progress',()=>{
 const {w,fx,meshes}=fixture(),b=w.spawn('generator',0,0,-170);b.underConstruction=true;b.constructionTime=10;b.constructionProgress=0;
 fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(0);
 b.constructionProgress=1;fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(1);
 fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(1);
 fx.reset();fx.syncUnitEffects(w,.13);fx.update(0);expect(meshes[2].count).toBe(0);
});

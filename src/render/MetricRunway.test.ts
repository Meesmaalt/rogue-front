import {renderedGroundHeightAt,groundRectangle} from './GroundSurface';
import {afterEach,expect,it} from 'vitest';
import {createMetricRunway} from './MetricRunway';
import {World} from '../sim/World';
import {resetHeightmap,setBases,setMapSize,setProceduralSeed,setTerrainProfile,heightAt} from '../sim/heightmap';
afterEach(resetHeightmap);
it('runway is one coloured geometry matching simulated 340 metre rollout strip',()=>{
 setBases([{x:0,z:0,r:500}]);const w=new World(1,false,[],[],[{x:0,z:0,r:500},{x:200,z:200,r:30}],false),pad=w.spawn('airbase',0,0,0);pad.heading=0;const mesh=createMetricRunway(pad);mesh.geometry.computeBoundingBox();expect(mesh.geometry.boundingBox!.max.z-mesh.geometry.boundingBox!.min.z).toBe(340);expect(mesh.geometry.groups).toHaveLength(0);expect(mesh.geometry.attributes.color.count).toBe(mesh.geometry.attributes.position.count);expect(mesh.children).toHaveLength(0);
});

it('airport paving and markings stay above the actual ground triangles at arbitrary headings',()=>{
 setMapSize(4096);setBases([{x:0,z:0,r:25}]);setProceduralSeed(42);setTerrainProfile('farmland-natural',[{x:60,z:40,width:180,depth:120,height:24,shape:'ridge',rotation:.3}]);
 const w=new World(42,false,[],[],[{x:0,z:0,r:25},{x:1500,z:1500,r:25}],false),pad=w.spawn('airbase',0,15,20);pad.heading=.73;const mesh=createMetricRunway(pad),p=mesh.geometry.attributes.position;
 expect(p.count).toBeLessThan(30000);
 // Check interiors as well as vertices: coarse draping can pass a vertex-only check and still cut through terrain.
 for(let i=0;i<p.count;i+=3)for(const weights of [[1/3,1/3,1/3],[.6,.2,.2],[.1,.45,.45]]){
  const x=weights.reduce((s,w,k)=>s+w*p.getX(i+k),0),z=weights.reduce((s,w,k)=>s+w*p.getZ(i+k),0),y=weights.reduce((s,w,k)=>s+w*p.getY(i+k),0)+pad.y;
  const wx=pad.x+Math.cos(pad.heading)*x+Math.sin(pad.heading)*z,wz=pad.z-Math.sin(pad.heading)*x+Math.cos(pad.heading)*z;
  expect(y-renderedGroundHeightAt(wx,wz)).toBeGreaterThan(.10);expect(y-renderedGroundHeightAt(wx,wz)).toBeLessThan(.17);
 }
 mesh.geometry.dispose();
});
it('draping follows rendered triangles rather than sampling the higher-resolution sim at decal vertices',()=>{
 setMapSize(4096);setBases([{x:0,z:0,r:5}]);setTerrainProfile('farmland-natural',[]);const origin={x:24,z:31,y:heightAt(24,31),heading:.9};
 const g=groundRectangle(origin,-20,20,-50,60,0xffffff,.12);expect(g.attributes.position.count).toBeGreaterThan(6);expect([...g.attributes.position.array].every(Number.isFinite)).toBe(true);g.dispose();
});

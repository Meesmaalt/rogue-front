import {expect,it,vi,afterEach} from 'vitest';
import {sampleMotion,smoothMotion,type MotionPose} from './MotionPresentation';
const pose=():MotionPose=>({x:0,y:0,z:0,heading:0,bank:0,pitch:0,speed:0});
it('samples flight height, banking and the short heading arc between simulation ticks',()=>{
 const e={px:0,x:.1,py:30,y:30.2,pz:0,z:0,pHeading:Math.PI-.02,heading:-Math.PI+.02,pFlightBank:.1,flightBank:.2,pFlightPitch:0,flightPitch:.1,def:{speed:20}},p=pose();
 sampleMotion(e,.5,p);expect(p.y).toBeCloseTo(30.1);expect(p.heading).toBeCloseTo(Math.PI);expect(p.bank).toBeCloseTo(.15);expect(p.pitch).toBeCloseTo(.05);
 sampleMotion(e,1,p);expect(p.x).toBe(e.x);expect(p.y).toBe(e.y);
});
it('ignores stale movement intent for a blocked unit and snaps discontinuous relocations',()=>{
 const e={px:0,x:0,y:5,pz:0,z:0,pHeading:0,heading:0,def:{speed:6},motionSpeed:5},p=pose();sampleMotion(e,.5,p);expect(p.speed).toBe(0);
 e.x=100;sampleMotion(e,.1,p);expect(p.x).toBe(100);expect(p.speed).toBe(0);
});
it('motion fading agrees across frame rates and freezes on pause without overshoot',()=>{
 let slow=6,fast=6;for(let i=0;i<30;i++)slow=smoothMotion(slow,0,10,1/30);for(let i=0;i<120;i++)fast=smoothMotion(fast,0,10,1/120);
 expect(slow).toBeCloseTo(fast,10);expect(slow).toBeLessThan(.001);expect(smoothMotion(fast,6,10,0)).toBe(fast);expect(smoothMotion(0,6,10,.1)).toBeLessThan(6);
});

// Presentation-only regression: fog must never wait for a 100 ms timer after a camera move.
import {Picker} from '../input/Picker';
import {PerspectiveCamera} from 'three';
import type {World} from '../sim/World';
afterEach(()=>vi.unstubAllGlobals());
it('view versions detect pan, zoom and rotation but remain stable without camera changes',()=>{
 const camera=new PerspectiveCamera(42,1,1,1400),picker=new Picker(camera,{} as World);
 const first=picker.viewVersion;expect(picker.viewVersion).toBe(first);camera.position.x=10;expect(picker.viewVersion).toBeGreaterThan(first);
 const moved=picker.viewVersion;camera.rotation.y=.2;expect(picker.viewVersion).toBeGreaterThan(moved);
 const rotated=picker.viewVersion;camera.fov=50;camera.updateProjectionMatrix();expect(picker.viewVersion).toBeGreaterThan(rotated);
});

import {RtsCamera} from './RtsCamera';
import {DirectionalLight,InstancedMesh,LOD,MeshStandardMaterial} from 'three';
import {createForest} from './Terrain';
it('camera eases input and terrain height instead of jumping; explicit focus resets drift',()=>{
 const events=new EventTarget(),surface=new EventTarget();vi.stubGlobal('window',events);vi.stubGlobal('document',new EventTarget());vi.stubGlobal('Element',class {});vi.stubGlobal('innerWidth',1000);vi.stubGlobal('innerHeight',600);
 const camera=new PerspectiveCamera(),sun=new DirectionalLight(),view=new RtsCamera(camera,()=>30,sun,surface as unknown as HTMLElement);
 const light=sun.position.clone();view.update(1/60);expect(view.groundY).toBeGreaterThan(0);expect(view.groundY).toBeLessThan(5);expect(sun.position.equals(light)).toBe(true);
 events.dispatchEvent(Object.assign(new Event('keydown'),{key:'w'}));const start=view.x;view.update(1/60);const first=Math.abs(view.x-start);view.update(1/60);expect(Math.abs(view.x-start)-first).toBeGreaterThan(first);
 view.jumpTo(0,0);expect(view.groundY).toBe(30);expect(view.x).toBe(0);
});
it('rounded forest batches use one opaque crown per tree and no forest shadow casters',()=>{
 const forest=createForest([{id:'woods',kind:'cover',appearance:'forest',x:0,z:0,width:64,depth:64}]);
 const batches:InstancedMesh[]=[];forest.traverse(o=>{if(o instanceof InstancedMesh)batches.push(o);});expect(batches.length).toBeGreaterThan(0);
 let crowns=0;for(const b of batches){expect(b.castShadow).toBe(false);if(!b.userData.forestTrunks){crowns++;expect(b.count).toBe(b.userData.forestPoints.length);expect(b.userData.forestCrownCount).toBe(1);expect((b.material as MeshStandardMaterial).alphaTest).toBe(0);expect(b.geometry.getAttribute('position').count).toBeGreaterThan(4);}}
 expect(crowns).toBeGreaterThan(0);expect(forest.children.every(o=>o instanceof LOD)).toBe(true);
});

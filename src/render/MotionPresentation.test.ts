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
import {FogOfWar} from './FogOfWar';
import {Picker} from '../input/Picker';
import {PerspectiveCamera} from 'three';
import type {World} from '../sim/World';
afterEach(()=>vi.unstubAllGlobals());
it('fog tracks every camera change and interpolates observers in a quarter-pixel layer',()=>{
 const ctx={setTransform:vi.fn(),clearRect:vi.fn(),fillRect:vi.fn(),drawImage:vi.fn(),save:vi.fn(),restore:vi.fn(),createRadialGradient:()=>({addColorStop:vi.fn()})};
 const canvas={width:0,height:0,style:{},getContext:()=>ctx} as unknown as HTMLCanvasElement;
 vi.stubGlobal('innerWidth',1000);vi.stubGlobal('innerHeight',600);vi.stubGlobal('addEventListener',vi.fn());
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>ctx})});
 const fog=new FogOfWar(canvas),observer={dead:false,loadedIntoId:null,underConstruction:false,team:0,px:0,x:20,py:2,y:2,pz:0,z:0,kind:'inf',def:{opticsRange:40}};
 const w={time:1,playerTeam:0,entities:[observer]} as unknown as World;
 const picker={viewVersion:1,toScreen:vi.fn(()=>({x:500,y:300,z:0})),pxPerUnit:()=>1};
 fog.draw(w,picker as unknown as Picker,.25);expect(canvas.width*canvas.height).toBe(1000*600/4);expect(picker.toScreen).toHaveBeenLastCalledWith(5,2.5,0);
 const calls=ctx.drawImage.mock.calls.length;fog.draw(w,picker as unknown as Picker,.25);expect(ctx.drawImage).toHaveBeenCalledTimes(calls);
 picker.viewVersion++;fog.draw(w,picker as unknown as Picker,.25);expect(ctx.drawImage).toHaveBeenCalledTimes(calls+1);
 fog.draw(w,picker as unknown as Picker,.75);expect(picker.toScreen).toHaveBeenLastCalledWith(15,2.5,0);
 fog.setMode('off');const clear=ctx.clearRect.mock.calls.length;fog.draw(w,picker as unknown as Picker);fog.draw(w,picker as unknown as Picker);expect(ctx.clearRect).toHaveBeenCalledTimes(clear+1);
});
it('view versions detect pan, zoom and rotation but remain stable without camera changes',()=>{
 const camera=new PerspectiveCamera(42,1,1,1400),picker=new Picker(camera,{} as World);
 const first=picker.viewVersion;expect(picker.viewVersion).toBe(first);camera.position.x=10;expect(picker.viewVersion).toBeGreaterThan(first);
 const moved=picker.viewVersion;camera.rotation.y=.2;expect(picker.viewVersion).toBeGreaterThan(moved);
 const rotated=picker.viewVersion;camera.fov=50;camera.updateProjectionMatrix();expect(picker.viewVersion).toBeGreaterThan(rotated);
});

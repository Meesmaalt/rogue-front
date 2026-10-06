import {expect,it} from 'vitest';
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

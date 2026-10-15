import {expect,it} from 'vitest';
import {stepSoldier,soldierOffset,type SoldierPose} from './SquadMotion';
const pose=():SoldierPose=>({x:0,z:0,heading:0,stride:0,speed:0});
it('soldiers follow turns in world space instead of rotating rigidly with the squad',()=>{const p=pose();stepSoldier(p,{x:3,z:0},Math.PI/2,4,1,1/60);expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(.11);expect(p.heading).toBeGreaterThan(0);expect(p.heading).toBeLessThan(Math.PI/2);});
it('member phases produce different offsets, response speeds and independent foot cycles',()=>{const a=pose(),b=pose();stepSoldier(a,{x:1,z:0},0,4,0,.1);stepSoldier(b,{x:1,z:0},0,4,5,.1);expect(a.x).not.toBe(b.x);expect(a.stride).not.toBe(b.stride);expect(soldierOffset(0,0,0,1,1)).not.toEqual(soldierOffset(0,0,1,1,1));});
it('stationary soldiers stop advancing their gait, and camera resets do not interpolate across the map',()=>{const p=pose();stepSoldier(p,{x:0,z:0},0,0,0,.1);expect(p.speed).toBe(0);expect(p.stride).toBe(0);stepSoldier(p,{x:100,z:100},1,4,0,.1);expect(p.x).toBe(100);expect(p.speed).toBe(0);});
it('frame subdivision keeps followers close at 30 and 120 FPS',()=>{const a=pose(),b=pose();for(let i=0;i<30;i++)stepSoldier(a,{x:3,z:2},0,4,0,1/30);for(let i=0;i<120;i++)stepSoldier(b,{x:3,z:2},0,4,0,1/120);expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(.03);});

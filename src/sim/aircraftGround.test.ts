import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases,heightAt} from './heightmap';
import {taxiAircraft,lineUpAircraft,takeoffRoll,prepareAircraftStart} from './aircraftGround';
import {basePoint} from './baseLayout';
import {aircraftMobility} from './battleScale';
import {wrapAngle} from './math';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:1000},{x:800,z:800,r:30}];setBases(bases);const w=new World(4,false,[],[],bases,false,true);w.networkMode=true;const pad=w.spawn('airbase',0,0,0),u=w.spawn('fighter',0,0,0);return {w,pad,u};}
it('nose-wheel steering never slides sideways and reaches a perpendicular apron destination',()=>{
 const {u}=fixture();u.heading=0;const target={x:35,z:80};let arrived=false;
 for(let i=0;i<6000&&!arrived;i++){const x=u.x,z=u.z;arrived=taxiAircraft(u,target,1/30);if(!arrived){expect(Math.abs((u.x-x)*Math.cos(u.heading)-(u.z-z)*Math.sin(u.heading))).toBeLessThan(1e-9);expect(u.motionSpeed).toBeLessThanOrEqual(aircraftMobility(u).taxiSpeed);}}
 expect(arrived).toBe(true);expect(Math.hypot(u.x-target.x,u.z-target.z)).toBeLessThan(1.1);
});
it.each([0,Math.PI*.75,-Math.PI/4])('lines up, accelerates and rotates continuously on a runway at %s',heading=>{
 const {pad,u}=fixture();pad.heading=heading;Object.assign(u,basePoint(pad,0,aircraftMobility(u).runwayStart));u.heading=heading+Math.PI/2;
 let aligned=false;for(let i=0;i<3000&&!aligned;i++)aligned=lineUpAircraft(u,pad,1/30);expect(aligned).toBe(true);expect(Math.abs(wrapAngle(u.heading-heading))).toBeLessThan(.06);
 let airborne=false,rotated=false;for(let i=0;i<3000&&!airborne;i++){const before=u.y;airborne=takeoffRoll(u,pad,1/30);expect(u.y-before).toBeLessThan(2);if(u.y>heightAt(u.x,u.z)+.05){rotated=true;expect(u.motionSpeed).toBeGreaterThanOrEqual(45);}}
 expect(rotated).toBe(true);expect(airborne).toBe(true);
});
it('crew and engine startup gate movement and survive a save without desynchronising',()=>{
 const {w,pad,u}=fixture();u.airState='taxi';let ready=false,phases=new Set<string>();
 for(let i=0;i<3000&&!ready;i++){ready=prepareAircraftStart(u,pad,1/30);phases.add(u.airStart!.phase);expect(u.motionSpeed).toBe(0);}
 expect([...phases]).toEqual(['crew','boarding','ignition','ready']);const saved=saveWorld(w);const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saved)));expect(worldHash(copy)).toBe(worldHash(w));
});

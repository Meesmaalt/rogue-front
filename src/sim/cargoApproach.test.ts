import {afterEach,expect,it} from 'vitest';
import {runwayEdgePoint} from './cargoApproach';
import {World} from './World';
import {resetHeightmap,setBases,setMapSize} from './heightmap';
import {updateUnits} from './systems/units';
import {wrapAngle} from './math';
afterEach(resetHeightmap);
it.each([0,Math.PI*.75,-Math.PI/4,Math.PI])('cargo arrives on the extended runway centreline at heading %s',heading=>{
 const pad={x:-600,z:500,heading},entry=runwayEdgePoint(2048,pad,45);
 expect(Math.max(Math.abs(entry.x),Math.abs(entry.z))).toBeGreaterThan(1024);
 expect(Math.abs((entry.x-pad.x)*Math.cos(heading)-(entry.z-pad.z)*Math.sin(heading))).toBeLessThan(1e-8);
 expect(Math.abs(wrapAngle(Math.atan2(pad.x-entry.x,pad.z-entry.z)-heading))).toBeLessThan(1e-8);
});
it.each([0,Math.PI*.75,-Math.PI/4])('metric cargo lands aligned, parks, delivers real stock and takes off at %s',heading=>{
 setMapSize(2048);const bases=[{x:0,z:0,r:1500},{x:800,z:800,r:30}];setBases(bases);const w=new World(42,false,[],[],bases,false,true);w.compactBattle=true;w.networkMode=true;
 w.spawn('hq',0,0,0);w.spawn('generator',0,-20,0);w.spawn('airCommand',0,20,0);const depot=w.spawn('supply',0,0,30),pad=w.spawn('airbase',0,0,0);pad.heading=heading;
 const entry=runwayEdgePoint(w.mapSize,pad,45),plane=w.spawn('cargoPlane',0,entry.x,entry.z);
 plane.airMissionHomeId=pad.id;plane.airState='returning';plane.airLandingPhase='final';plane.motionSpeed=50;plane.heading=heading;plane.y=80;plane.py=80;plane.cargo=300;plane.logisticsRoute='strategic';plane.logisticsHome={x:0,z:0};plane.logisticsTarget=entry;plane.supplyDepotId=depot.id;plane.logisticsPhase='idle';
 let landed=false,parked=false,departed=false;
 for(let tick=0;tick<9000&&!plane.dead;tick++){
  const before=plane.airState;w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);
  const state=String(plane.airState);
  if(before==='returning'&&state==='landing'){landed=true;expect(Math.abs(wrapAngle(plane.heading-heading))).toBeLessThan(.05);expect(Math.abs((plane.x-pad.x)*Math.cos(heading)-(plane.z-pad.z)*Math.sin(heading))).toBeLessThan(1);}
  if(state==='grounded')parked=true;if(state==='airborne')departed=true;
 }
 expect(landed).toBe(true);expect(parked).toBe(true);expect(w.airCargoDelivered[0]).toBe(300);expect(departed).toBe(true);expect(plane.dead).toBe(true);expect(plane.cargo).toBe(0);
},20000);

import {cargoDepartureRunway} from './cargoApproach';
it.each([Math.PI*.75,-Math.PI/4])('cargo departure uses the same runway toward its own rear at %s',heading=>{
 const pad={x:heading>0?-760:760,z:heading>0?700:-700,heading},start=-100,end=240;
 const out=cargoDepartureRunway(pad,start,end),arrival=runwayEdgePoint(2048,pad,60),exit=runwayEdgePoint(2048,out,60,true);
 expect(exit.x).toBeCloseTo(arrival.x);expect(exit.z).toBeCloseTo(arrival.z);
 expect(out.x+Math.sin(out.heading)*start).toBeCloseTo(pad.x+Math.sin(heading)*end);
 expect(out.z+Math.cos(out.heading)*start).toBeCloseTo(pad.z+Math.cos(heading)*end);
});

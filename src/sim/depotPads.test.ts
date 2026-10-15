import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {depotPad,visibleDepotPads,availableDepotPads} from './depotPads';
import {heightAt,resetHeightmap,setBases,setMapSize} from './heightmap';
import {logisticsLandingPoint,handleGroundCargo} from './groundHandling';
import {updateUnits} from './systems/units';
import {wrapAngle} from './math';
afterEach(resetHeightmap);
function fixture(compact=false){
 setMapSize(512);const bases=[{x:0,z:0,r:220},{x:220,z:220,r:20}];setBases(bases);
 const w=new World(52,false,[],[],bases,false,true);w.compactBattle=compact;w.networkMode=true;
 w.spawn('hq',0,-80,0);w.spawn('generator',0,0,-50);const depot=w.spawn('supply',0,0,0);depot.heading=0;depot.ammoStock=depot.fuelStock=depot.repairStock=0;
 w.nav.syncBuildings(w.entities);return {w,depot};
}
function step(w:World){for(const e of w.entities){e.px=e.x;e.py=e.y;e.pz=e.z;e.pHeading=e.heading;}w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
it('visible pads and reserved slots agree, stay clear of buildings and rotate with the depot',()=>{
 const {w,depot}=fixture(),pads=visibleDepotPads(w,depot);expect(pads).toHaveLength(1);depot.supplyLevel=1;expect(visibleDepotPads(w,depot)).toHaveLength(2);depot.supplyLevel=2;expect(visibleDepotPads(w,depot)).toHaveLength(3);depot.supplyLevel=0;
 const h=w.spawn('transport',0,-100,-60);h.supplyDepotId=depot.id;const assigned=logisticsLandingPoint(w,depot,h)!;
 expect(pads.some(p=>p.x===assigned.x&&p.z===assigned.z)).toBe(true);
 expect(w.canPlaceBuilding(0,'generator',pads[0].x,pads[0].z)).toBe(false);
 expect(w.canPlaceBuilding(0,'generator',55,45)).toBe(true);
 const original=depotPad(depot,0);depot.heading=Math.PI/2;const rotated=depotPad(depot,0);expect(rotated.z-depot.z).toBeCloseTo(-(original.x-depot.x));
 const blocked=availableDepotPads(w,depot)[0];w.spawn('factory',0,blocked.x,blocked.z);w.nav.syncBuildings(w.entities);
 expect(availableDepotPads(w,depot).some(p=>p.slot===blocked.slot)).toBe(false);
});
for(const compact of [false,true])it(`a ${compact?'compact':'metric'} helicopter flies all the way to its pad, settles, stops yawing and actually delivers`,()=>{
 const {w,depot}=fixture(compact),h=w.spawn('transport',0,-115,-65);h.supplyDepotId=depot.id;h.logisticsRoute='strategic';h.logisticsPhase='idle';h.cargo=180;h.y=heightAt(h.x,h.z)+50;h.airState='airborne';h.heading=2.2;h.flightVx=14;h.flightVz=5;
 const pad=logisticsLandingPoint(w,depot,h)!;h.logisticsHome=pad;h.logisticsTarget={x:-280,z:-200};
 let locked:number|undefined,landed=false;
 for(let i=0;i<2400;i++){
  step(w);const distance=Math.hypot(h.x-pad.x,h.z-pad.z);
  if(distance<10&&locked==null)locked=h.heading;
  if(locked!=null&&distance<10)expect(Math.abs(wrapAngle(h.heading-locked))).toBeLessThan(.1);
  if(w.byId.get(h.id)?.airState==='grounded'){landed=true;break;}
 }
 expect(landed).toBe(true);expect(Math.hypot(h.x-pad.x,h.z-pad.z)).toBeLessThan(.8);expect(h.y).toBeCloseTo(heightAt(h.x,h.z));
 const heading=h.heading;for(let i=0;i<180;i++)step(w);expect(h.heading).toBe(heading);expect(h.cargoDoor).toBe(1);expect(h.groundServiceId).toBeDefined();
 for(let i=0;i<5400&&w.airCargoDelivered[0]<180;i++)step(w);
 expect(w.airCargoDelivered[0]).toBeCloseTo(180);expect(h.cargo).toBe(0);
});
it('walking crews take a real route around a neighbouring building and finish the full load',()=>{
 const {w,depot}=fixture(),h=w.spawn('transport',0,60,0);w.spawn('factory',0,25,0);w.nav.syncBuildings(w.entities);
 h.supplyDepotId=depot.id;h.airState='grounded';h.cargo=180;h.y=heightAt(h.x,h.z);
 for(let i=0;i<7200&&w.roadCargoDelivered[0]<180;i++){
  handleGroundCargo(w,h,depot,1/30);
  // Freeze only the parked carrier; its byId reference remains available to the real walking system.
  const index=w.entities.indexOf(h);w.entities.splice(index,1);step(w);w.entities.splice(index,0,h);
 }
 expect(w.roadCargoDelivered[0]).toBeCloseTo(180);expect(h.cargo).toBe(0);expect(w.entities.filter(e=>!e.dead&&e.groundService&&e.cargo>0)).toHaveLength(0);
});

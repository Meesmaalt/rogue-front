import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {updateProduction} from './systems/production';
import {updateAirportSupport} from './airportSupport';
import {updateUnits} from './systems/units';
afterEach(resetHeightmap);
it('an internal maintenance hangar builds and services aircraft without a separate supply depot',()=>{
 const bases=[{x:0,z:0,r:300},{x:450,z:450,r:20}];setBases(bases);const w=new World(90,false,[],[],bases,false);w.networkMode=true;
 w.spawn('hq',0,0,0);w.spawn('generator',0,-30,-20);w.spawn('airCommand',0,30,0);const pad=w.spawn('airbase',0,50,0);
 expect(w.productionOperational(pad,'fighter').operational).toBe(true);updateAirportSupport(w);expect(w.productionOperational(pad,'fighter').operational).toBe(true);
 pad.productionQueue=['fighter'];for(let i=0;i<2400&&pad.productionQueue.length;i++){w.time+=1/30;updateProduction(w,1/30);}
 const plane=w.entities.find(e=>e.kind==='fighter')!;expect(plane).toBeDefined();expect(w.entities.some(e=>e.kind==='supply')).toBe(false);plane.fuel=0;plane.ammo=0;plane.airState='rearming';const before=pad.fuelStock!;updateUnits(w,1/30);expect(plane.fuel).toBeGreaterThan(0);expect(pad.fuelStock).toBeLessThan(before);
 const money=w.credits;pad.ammoStock=0;updateAirportSupport(w);expect(pad.ammoStock).toBeGreaterThan(0);expect(w.credits).toBe(money-100);
});

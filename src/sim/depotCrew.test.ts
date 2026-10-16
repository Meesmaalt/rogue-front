import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases,heightAt} from './heightmap';
import {ensureDepotCrews,prepareDepotCrew,handleGroundCargo,logisticsLandingPoint} from './groundHandling';
import {updateUnits} from './systems/units';
import {buildingSolidBoxes} from './baseLayout';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
it('persistent driver gets the forklift before landing, delivers without crossing walls and returns to rest',()=>{
 const bases=[{x:0,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(81,false,[],[],bases,false);w.networkMode=true;
 w.spawn('hq',0,-40,0);w.spawn('generator',0,0,-35);const depot=w.spawn('supply',0,0,0);depot.heading=.63;depot.ammoStock=depot.fuelStock=depot.repairStock=0;w.nav.syncBuildings(w.entities);ensureDepotCrews(w);
 const crew=w.entities.find(e=>e.groundService?.crewIndex===0)!;expect(crew.groundService?.crewState).toBe('rest');
 const h=w.spawn('transport',0,-80,-50);h.supplyDepotId=depot.id;h.cargo=180;h.airState='airborne';const pad=logisticsLandingPoint(w,depot,h)!;h.logisticsHome=pad;const id=prepareDepotCrew(w,h,depot)!.id;
 const states=new Set<string>();let violated=false;
 // Freeze the aircraft to isolate the real worker path while it stages, then park it for unloading.
 const step=()=>{w.time+=1/30;w.spatial.rebuild(w.entities);const index=w.entities.indexOf(h);w.entities.splice(index,1);updateUnits(w,1/30);w.entities.splice(index,0,h);if(crew.groundService?.crewState)states.add(crew.groundService.crewState);for(const b of buildingSolidBoxes(depot)!){const dx=crew.x-depot.x,dz=crew.z-depot.z,x=Math.cos(depot.heading)*dx-Math.sin(depot.heading)*dz,z=Math.sin(depot.heading)*dx+Math.cos(depot.heading)*dz;if(Math.abs(x-b.x)<b.width/2&&Math.abs(z-b.z)<b.depth/2)violated=true;}};
 for(let i=0;i<360;i++)step();expect(states).toContain('boarding');expect(states).toContain('driving');expect(h.cargo).toBe(180);
 h.x=pad.x;h.z=pad.z;h.y=heightAt(h.x,h.z);h.airState='grounded';
 for(let i=0;i<6000&&(w.roadCargoDelivered[0]<180||crew.groundService?.crewState!=='rest');i++){handleGroundCargo(w,h,depot,1/30);step();}
 expect(violated).toBe(false);expect(w.roadCargoDelivered[0]).toBeCloseTo(180);expect(crew.id).toBe(id);expect(crew.dead).toBe(false);expect(crew.groundService?.crewState).toBe('rest');expect(states).toContain('parking');expect(states).toContain('returning');
 const copy=new World(81,false,[],[],bases,false);loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});

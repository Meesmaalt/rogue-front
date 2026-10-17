import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap} from './heightmap';
import {warehousePoint,warehouseWalls,requestWarehouseDoor,updateWarehouseDoors} from './warehouse';
import {airportDepot} from './externalSupply';
afterEach(resetHeightmap);
it('airport has its own receiving warehouse rather than requiring a nearby supply depot',()=>{
 const w=new World(4,false,[],[],[{x:0,z:0,r:800},{x:800,z:800,r:30}],false,true);w.spawn('hq',0,0,0);w.spawn('generator',0,20,0);const pad=w.spawn('airbase',0,0,0);expect(airportDepot(w,pad)).toBe(pad);
});
it('door has a real opening in the shared walls and opens only for a requested service',()=>{
 for(const kind of ['supply','airbase'] as const){const w=new World(4,false,[],[],[],false),e=w.spawn(kind,0,0,0),inside=warehousePoint(e,true),outside=warehousePoint(e);expect(inside).not.toEqual(outside);expect(warehouseWalls(e)).toHaveLength(5);
 requestWarehouseDoor(w,e);for(let i=0;i<40;i++)updateWarehouseDoors(w,1/30);expect(e.warehouseDoor).toBe(1);w.time=10;for(let i=0;i<40;i++)updateWarehouseDoors(w,1/30);expect(e.warehouseDoor).toBe(0);}
});
it('ordinary warehouse shutters also open for a physical road delivery and close after the truck leaves',()=>{
 const w=new World(4,false,[],[],[],false),depot=w.spawn('supply',0,0,0),truck=w.spawn('logiTruck',0,7,0);truck.supplyDepotId=depot.id;truck.logisticsPhase='unloading';
 for(let i=0;i<40;i++){w.time+=1/30;updateWarehouseDoors(w,1/30);}expect(depot.warehouseDoor).toBe(1);truck.logisticsPhase='idle';w.time+=10;for(let i=0;i<40;i++)updateWarehouseDoors(w,1/30);expect(depot.warehouseDoor).toBe(0);
});

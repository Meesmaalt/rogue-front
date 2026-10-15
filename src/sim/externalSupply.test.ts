import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {dispatchExternalHelicopters,externalHelicopterCapacity,externalHelicopterInterval,airportDepot} from './externalSupply';
import {updateUnits} from './systems/units';
import {damage} from './systems/combat';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
const bases=[{x:-180,z:180,r:200},{x:200,z:-200,r:30}];
afterEach(resetHeightmap);
function fixture(){setBases(bases);const w=new World(914,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-100,0);w.spawn('generator',0,-100,20);const depot=w.spawn('supply',0,-65,0);w.nav.syncBuildings(w.entities);return {w,depot};}
function run(w:World,steps:number){for(let i=0;i<steps;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}}
it('off-map helicopters deliver money and stocks only after reaching a receiving depot, then leave',()=>{
 const {w,depot}=fixture();depot.ammoStock=depot.fuelStock=depot.repairStock=0;const money=w.teamCredits[0];dispatchExternalHelicopters(w);
 const h=w.entities.find(e=>e.kind==='transport')!;expect(h).toBeDefined();expect(Math.max(Math.abs(h.x),Math.abs(h.z))).toBeGreaterThan(w.mapSize/2);expect(w.teamCredits[0]).toBe(money);
 for(let i=0;i<6000&&!h.dead;i++)run(w,1);
 expect(h.dead).toBe(true);expect(w.airCargoDelivered[0]).toBeGreaterThan(0);expect(w.teamCredits[0]).toBeGreaterThan(money);expect(depot.fuelStock).toBeGreaterThan(0);
},15000);
it('upgrades increase capacity and frequency, disabled depots never dispatch, a destroyed receiver creates no money',()=>{
 const {w,depot}=fixture(),capacity=externalHelicopterCapacity(w,depot),interval=externalHelicopterInterval(w,depot);depot.buildingLevel=3;
 expect(externalHelicopterCapacity(w,depot)).toBeGreaterThan(capacity);expect(externalHelicopterInterval(w,depot)).toBeLessThan(interval);
 depot.disabledUntil=100;dispatchExternalHelicopters(w);expect(w.entities.some(e=>e.kind==='transport')).toBe(false);depot.disabledUntil=0;dispatchExternalHelicopters(w);
 const h=w.entities.find(e=>e.kind==='transport')!,money=w.teamCredits[0];depot.dead=true;run(w,400);expect(h.dead).toBe(true);expect(w.teamCredits[0]).toBe(money);expect(w.airCargoDelivered[0]).toBe(0);
});
it('airport cargo needs a nearby completed depot and works even when that warehouse is empty',()=>{
 const {w,depot}=fixture();w.spawn('airCommand',0,-85,-10);const base=w.spawn('airbase',0,-35,0);expect(airportDepot(w,base)).toBe(depot);
 depot.ammoStock=depot.fuelStock=0;expect(airportDepot(w,base)).toBe(depot);depot.disabledUntil=100;expect(airportDepot(w,base)).toBeNull();depot.disabledUntil=0;
 for(let i=0;i<1200;i++)w.tick(1/30);
 expect(w.entities.some(e=>e.kind==='cargoPlane')).toBe(true);
});
it('save and replay hashing retain pending dispatch and inbound external cargo',()=>{
 const {w}=fixture();dispatchExternalHelicopters(w);run(w,30);const {w:copy}=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));run(w,120);run(copy,120);expect(worldHash(copy)).toBe(worldHash(w));
});

it('full receiving warehouses retain inbound cargo and credit only accepted partial unloads',()=>{
 const {w,depot}=fixture();dispatchExternalHelicopters(w);const h=w.entities.find(e=>e.kind==='transport')!;
 h.x=h.logisticsHome!.x;h.z=h.logisticsHome!.z;h.y=0;h.motionSpeed=0;h.flightVx=h.flightVz=0;h.cargo=100;
 depot.ammoStock=1200;depot.fuelStock=1600;depot.repairStock=600;const money=w.teamCredits[0];
 for(let i=0;i<3000&&!w.entities.some(e=>e.kind==='groundHandler'&&e.groundService?.phase==='unload');i++)run(w,1);
 const handler=w.entities.find(e=>e.kind==='groundHandler'&&e.groundService?.phase==='unload')!;expect(handler).toBeDefined();run(w,90);expect(h.cargo+handler.cargo).toBe(100);expect(w.teamCredits[0]).toBe(money);
 depot.fuelStock-=20;run(w,1);expect(h.cargo+handler.cargo).toBeCloseTo(50);expect(w.teamCredits[0]-money).toBeCloseTo(30);
});
it('cargo plane completes a physical airport delivery and exits without granting another payout',()=>{
 const {w,depot}=fixture();w.spawn('airCommand',0,-85,-10);w.spawn('airbase',0,-35,0);
 for(let i=0;i<1200;i++)w.tick(1/30);
 const plane=w.entities.find(e=>e.kind==='cargoPlane')!;expect(plane).toBeDefined();const money=w.teamCredits[0],cargo=plane.cargo;
 for(let i=0;i<6000&&!plane.dead;i++)w.tick(1/30);
 expect(plane.dead).toBe(true);expect(Math.max(Math.abs(plane.x),Math.abs(plane.z))).toBeGreaterThan(w.mapSize/2);expect(plane.cargo).toBe(0);expect(w.teamCredits[0]-money).toBeGreaterThanOrEqual(cargo*.6-1e-5);expect(depot.logisticsStorage).toBeGreaterThan(0);
},15000);

it('no warehouse means no passive money, and destroying an inbound import loses its cargo',()=>{
 const {w,depot}=fixture();depot.dead=true;const credits=w.teamCredits[0];for(let i=0;i<300;i++)w.tick(1/30);expect(w.teamCredits[0]).toBe(credits);
 const receiver=w.spawn('supply',0,-65,0);receiver.ammoStock=receiver.fuelStock=receiver.repairStock=receiver.logisticsStorage=0;dispatchExternalHelicopters(w);const h=w.entities.find(e=>e.kind==='transport')!,cargo=h.cargo;damage(w,h,10000);w.tick(1/30);
 expect(w.airCargoLost[0]).toBe(cargo);expect(w.teamCredits[0]).toBe(credits);expect(receiver.logisticsStorage).toBe(0);
});
it('a plane switches receiving depots if its airport still has another usable warehouse',()=>{
 const {w,depot}=fixture();w.spawn('airCommand',0,-85,-10);const base=w.spawn('airbase',0,-35,0),replacement=w.spawn('supply',0,-20,20);
 for(let i=0;i<1200;i++)w.tick(1/30);const plane=w.entities.find(e=>e.kind==='cargoPlane')!;expect(plane).toBeDefined();depot.dead=true;run(w,1);
 expect(airportDepot(w,base)).toBe(replacement);expect(plane.supplyDepotId).toBe(replacement.id);expect(plane.logisticsPhase).not.toBe('loading');
});

import {it,expect,afterEach} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {stockCapacity,depositPayload,stockTotal} from './stockLogistics';
import {updateUnits} from './systems/units';
import {updateProduction} from './systems/production';
import {updateTacticalSupply} from './systems/tacticalSupply';
import {stationAircraft,assignAirMission} from './systems/airDoctrine';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
const bases=[{x:0,z:0,r:210},{x:250,z:250,r:20}];
function fixture(){setBases(bases);const w=new World(44,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-50,-50);w.spawn('hq',1,200,200);w.spawn('generator',0,-50,-20);return w;}
function steps(w:World,n:number){for(let i=0;i<n;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}}
afterEach(resetHeightmap);
it('resource cargo waits at a full depot, then unloads only accepted amounts; finite payload creates no income; save keeps remainder',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),cap=stockCapacity(w,d);d.ammoStock=cap.ammo;d.fuelStock=cap.fuel;d.repairStock=cap.repair;
 const truck=w.spawn('logiTruck',0,-14,0);truck.supplyDepotId=d.id;truck.logisticsSourceIndex=0;truck.logisticsHome={x:0,z:0};truck.logisticsPhase='loading';truck.cargo=100;
 const money=w.teamCredits[0];steps(w,100);expect(truck.cargo).toBe(100);expect(w.teamCredits[0]).toBe(money);
 d.fuelStock!-=20;steps(w,2);expect(truck.cargo).toBeCloseTo(50);expect(w.teamCredits[0]-money).toBeCloseTo(30);expect(d.fuelStock).toBeCloseTo(cap.fuel);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(w)).toBe(worldHash(copy));steps(w,20);steps(copy,20);expect(worldHash(w)).toBe(worldHash(copy));
 const payload={ammo:30,fuel:20,repair:10};d.ammoStock!-=10;const before=w.teamCredits[0];expect(depositPayload(w,d,payload)).toBeCloseTo(10);expect(payload).toEqual({ammo:20,fuel:20,repair:10});expect(w.teamCredits[0]).toBe(before);expect(stockTotal(d)).toBeCloseTo(cap.ammo+cap.fuel+cap.repair);
});
it('FOB convoy retains blocked bins and resumes after consumption without duplicating stocks or income',()=>{
 const w=fixture(),main=w.spawn('supply',0,-40,0),d=w.spawn('supply',0,35,0),cap=stockCapacity(w,d);d.ammoStock=cap.ammo;d.fuelStock=cap.fuel;d.repairStock=cap.repair;
 const truck=w.spawn('logiTruck',0,21,0);truck.supplyDepotId=d.id;truck.cargo=60;truck.logisticsPayload={ammo:20,fuel:30,repair:10};truck.logisticsPhase='loading';const money=w.teamCredits[0],mainStock=stockTotal(main);
 steps(w,100);expect(truck.cargo).toBe(60);d.ammoStock!-=20;d.fuelStock!-=30;d.repairStock!-=10;steps(w,1);expect(truck.cargo).toBe(0);expect(stockTotal(main)).toBe(mainStock);expect(w.teamCredits[0]).toBe(money);expect(w.roadCargoDelivered[0]).toBe(60);
});
it('production pauses and resumes on real stocks; an empty nearer depot does not block finite convoy fuel rescue',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),factory=w.spawn('factory',0,-10,-20);w.spawn('landCommand',0,-25,-25);factory.productionQueue=['tank'];d.ammoStock=0;d.fuelStock=0;
 updateProduction(w,1/30);expect(factory.productionProgress).toBe(0);expect(w.productionOperational(factory).reason).toContain('laskemoona');w.receiveSupply(d,100);updateProduction(w,1/30);expect(factory.productionProgress).toBeGreaterThan(0);
 const tank=w.spawn('tank',0,100,30),donor=w.spawn('logiTruck',0,110,30);tank.fuel=0;tank.mode='move';donor.logisticsPayload={ammo:0,fuel:20,repair:0};donor.cargo=20;const fuel=donor.cargo;updateTacticalSupply(w,1/30);expect(tank.fuel).toBeGreaterThan(0);expect(donor.cargo+tank.fuel!).toBeCloseTo(fuel);
 const empty=w.spawn('supply',0,102,30),full=w.spawn('supply',0,118,30);empty.ammoStock=empty.fuelStock=empty.repairStock=0;tank.fuel=0;updateTacticalSupply(w,1/30);expect(tank.fuel).toBeGreaterThan(0);expect(full.fuelStock).toBeLessThan(650);
 tank.motionSpeed=0;tank.mode='move';tank.fuel=20;full.fuelStock=0;donor.logisticsPayload.fuel=0;updateTacticalSupply(w,1/30);expect(tank.fuel).toBe(20);
});
it('grounded air service can refuel with zero ammo; disabled taxi holds and a destroyed airborne home redirects to a real alternative',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),pad=w.spawn('airbase',0,10,0);w.spawn('airCommand',0,-20,-20);const plane=w.spawn('fighter',0,10,0);stationAircraft(w,plane,pad);plane.airState='rearming';plane.ammo=0;plane.fuel=10;d.ammoStock=0;const fuel=d.fuelStock!;steps(w,1);expect(plane.fuel).toBeGreaterThan(10);expect(d.fuelStock).toBeLessThan(fuel);expect(plane.airState).toBe('rearming');
 plane.airState='taxi';plane.airTaxiPhase='apron';plane.mode='move';plane.dest={x:100,z:0};pad.disabledUntil=w.time+30;const x=plane.x;steps(w,1);expect(plane.airState).toBe('landing');expect(plane.x).toBe(x);
 const alternate=w.spawn('airbase',0,90,-40);pad.dead=true;plane.airState='airborne';plane.y=70;plane.x=50;plane.z=30;plane.fuel=500;steps(w,1);expect(plane.airMissionHomeId).toBe(alternate.id);expect(plane.airState).toBe('returning');expect(plane.x).not.toBe(alternate.x);
});

it('one real sortie taxis, takes off, returns after ammunition depletion and rearms from warehouse stock',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),pad=w.spawn('airbase',0,10,0);w.spawn('airCommand',0,-20,-20);const plane=w.spawn('fighter',0,10,0);stationAircraft(w,plane,pad);assignAirMission(plane,'cap',{x:90,z:0});
 for(let i=0;i<420;i++)w.tick(1/30);
 expect(plane.airSortieCount).toBe(1);expect(plane.airState).toBe('airborne');const ammo=d.ammoStock!;plane.ammo=0;
 for(let i=0;i<1800&&!['rearming','grounded'].includes(plane.airState??'');i++)w.tick(1/30);
 expect(['rearming','grounded']).toContain(plane.airState);expect(plane.airMissionHomeId).toBe(pad.id);
 for(let i=0;i<120;i++)w.tick(1/30);expect(plane.ammo).toBeGreaterThan(0);expect(d.ammoStock).toBeLessThan(ammo);expect(plane.y).toBeLessThan(3);
});

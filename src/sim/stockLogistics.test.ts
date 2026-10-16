import {it,expect,afterEach} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {stockCapacity,depositPayload,stockTotal,withdrawPayload} from './stockLogistics';
import {updateUnits} from './systems/units';
import {productionStatus,updateProduction} from './systems/production';
import {updateTacticalSupply} from './systems/tacticalSupply';
import {stationAircraft,assignAirMission} from './systems/airDoctrine';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
const bases=[{x:0,z:0,r:210},{x:250,z:250,r:20}];
function fixture(){setBases(bases);const w=new World(44,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-50,-50);w.spawn('hq',1,200,200);w.spawn('generator',0,-50,-20);return w;}
function steps(w:World,n:number){for(let i=0;i<n;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}}
afterEach(resetHeightmap);
it('resource conversion retains unaccepted cargo and finite payload creates no income',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),cap=stockCapacity(w,d);d.ammoStock=cap.ammo;d.fuelStock=cap.fuel;d.repairStock=cap.repair;
 const money=w.teamCredits[0];expect(w.receiveSupply(d,100)).toBe(0);expect(w.teamCredits[0]).toBe(money);
 d.fuelStock!-=20;expect(w.receiveSupply(d,100)).toBeCloseTo(50);expect(w.teamCredits[0]-money).toBeCloseTo(30);
 const payload={ammo:30,fuel:20,repair:10};d.ammoStock!-=10;const before=w.teamCredits[0];expect(depositPayload(w,d,payload)).toBeCloseTo(10);expect(payload).toEqual({ammo:20,fuel:20,repair:10});expect(w.teamCredits[0]).toBe(before);
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
 const w=fixture(),pad=w.spawn('airbase',0,10,0);w.spawn('supply',0,0,0);w.spawn('airCommand',0,-20,-20);pad.buildingLevel=2;pad.airportStoresInitialized=true;pad.ammoStock=420;pad.fuelStock=1800;pad.repairStock=300;const plane=w.spawn('fighter',0,10,0);stationAircraft(w,plane,pad);plane.airState='rearming';plane.ammo=0;plane.fuel=10;pad.ammoStock=0;const fuel=pad.fuelStock!;steps(w,1);expect(plane.fuel).toBeGreaterThan(10);expect(pad.fuelStock).toBeLessThan(fuel);expect(plane.airState).toBe('rearming');
 plane.airState='taxi';plane.airTaxiPhase='apron';plane.mode='move';plane.dest={x:100,z:0};pad.disabledUntil=w.time+30;const x=plane.x;steps(w,1);expect(plane.airState).toBe('landing');expect(plane.x).toBe(x);
 const alternate=w.spawn('airbase',0,90,-40);alternate.buildingLevel=2;pad.dead=true;plane.airState='airborne';plane.y=70;plane.x=50;plane.z=30;plane.fuel=500;steps(w,1);expect(plane.airMissionHomeId).toBe(alternate.id);expect(plane.airState).toBe('returning');expect(plane.x).not.toBe(alternate.x);
});

it('one real sortie taxis, takes off, returns after ammunition depletion and rearms from warehouse stock',()=>{
 const w=fixture(),d=w.spawn('supply',0,0,0),pad=w.spawn('airbase',0,10,0);d.logisticsPaused=true;w.spawn('airCommand',0,-20,-20);pad.buildingLevel=2;pad.airportStoresInitialized=true;pad.ammoStock=420;pad.fuelStock=1800;pad.repairStock=300;const plane=w.spawn('fighter',0,10,0);stationAircraft(w,plane,pad);assignAirMission(plane,'cap',{x:90,z:0});
 for(let i=0;i<420;i++)w.tick(1/30);
 expect(plane.airSortieCount).toBe(1);expect(plane.airState).toBe('airborne');const ammo=pad.ammoStock!;plane.ammo=0;plane.secondaryAmmo=plane.def.weapons!.map(()=>0);
 for(let i=0;i<1800&&!['rearming','grounded'].includes(plane.airState??'');i++)w.tick(1/30);
 expect(['rearming','grounded']).toContain(plane.airState);expect(plane.airMissionHomeId).toBe(pad.id);
 for(let i=0;i<120;i++)w.tick(1/30);expect(plane.ammo).toBeGreaterThan(0);expect(pad.ammoStock).toBeLessThan(ammo);expect(plane.y).toBeLessThan(3);
});

it('completed ground production waits for a legal exit and deploys exactly once after it opens',()=>{
 const w=fixture(),factory=w.spawn('factory',0,-10,-20);w.spawn('supply',0,0,0);w.spawn('landCommand',0,-25,-25);
 factory.productionQueue=['tank'];factory.productionProgress=w.unitDefinition('tank',0).buildTime;
 const blocker=w.spawn('tank',1,factory.x,factory.z);blocker.def={...blocker.def,radius:100};
 const count=w.producedForTeam(0).tank??0;
 expect(w.productionOperational(factory,'tank').operational).toBe(true);
 expect(productionStatus(w,factory)).toContain('väljumisala');updateProduction(w,1/30);
 expect(factory.productionQueue).toEqual(['tank']);expect(w.producedForTeam(0).tank??0).toBe(count);
 blocker.dead=true;updateProduction(w,1/30);const produced=w.entities.find(e=>e.kind==='tank'&&e.team===0)!;
 expect(produced).toBeDefined();expect(w.nav.isWalkableWorld(produced.x,produced.z,produced.def.radius)).toBe(true);
 expect(w.entities.some(e=>e!==produced&&!e.dead&&Math.hypot(e.x-produced.x,e.z-produced.z)<e.def.radius+produced.def.radius)).toBe(false);
 expect(factory.productionQueue).toEqual([]);expect(w.producedForTeam(0).tank).toBe(count+1);
 updateProduction(w,1/30);expect(w.producedForTeam(0).tank).toBe(count+1);
});
it('old collection trucks migrate to a captured-site HQ route without losing loaded cargo',()=>{
 const w=fixture(),depot=w.spawn('supply',0,0,0),truck=w.spawn('logiTruck',0,-14,0);
 truck.supplyDepotId=depot.id;truck.logisticsHome={x:0,z:0};truck.logisticsSourceIndex=0;truck.logisticsPhase='loading';truck.cargo=50;
 steps(w,1);expect(truck.resourceConvoy?.homeId).toBe(w.hq[0]!.id);expect(truck.resourceConvoy?.sourceIndex).toBe(0);expect(truck.cargo).toBe(50);
});

it('a convoy fills its available capacity for the missing stock and honours destination priority without creating income',()=>{
 const w=fixture(),main=w.spawn('supply',0,-40,0),fob=w.spawn('supply',0,35,0),cap=stockCapacity(w,fob);
 fob.ammoStock=0;fob.fuelStock=cap.fuel;fob.repairStock=cap.repair;
 const before=stockTotal(main),money=w.teamCredits[0],payload=withdrawPayload(w,main,fob,150);
 expect(payload).toEqual({ammo:150,fuel:0,repair:0});expect(stockTotal(main)+150).toBeCloseTo(before);expect(w.teamCredits[0]).toBe(money);
 fob.fuelStock=fob.repairStock=0;fob.logisticsPriority='fuel';
 expect(withdrawPayload(w,main,fob,150)).toEqual({ammo:37.5,fuel:97.5,repair:15});
});
it('production ignores disabled warehouses and selects a real local alternative, then stops and recovers with it',()=>{
 const w=fixture(),near=w.spawn('supply',0,0,0),local=w.spawn('supply',0,45,0),factory=w.spawn('factory',0,-10,-20);w.spawn('landCommand',0,-25,-25);
 near.disabledUntil=30;factory.productionQueue=['tank'];const nearAmmo=near.ammoStock!,localAmmo=local.ammoStock!;
 updateProduction(w,1/30);expect(factory.productionProgress).toBeGreaterThan(0);expect(near.ammoStock).toBe(nearAmmo);expect(local.ammoStock).toBeLessThan(localAmmo);
 local.ammoStock=0;const progress=factory.productionProgress;updateProduction(w,1/30);expect(factory.productionProgress).toBe(progress);expect(productionStatus(w,factory)).toContain('laskemoona');
 w.receiveSupply(local,100);updateProduction(w,1/30);expect(factory.productionProgress).toBeGreaterThan(progress);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});

it('a blocked collection route cannot steal a dispatch slot from a reachable source, and dispatch searches are throttled',()=>{
 const w=fixture(),depot=w.spawn('supply',0,0,0);depot.fuelStock=0;
 Object.assign(w.resourcePoints[0],{x:0,z:60,radius:8,controlledBy:0,active:true,amount:200});Object.assign(w.resourcePoints[1],{x:55,z:0,radius:8,controlledBy:0,active:true,amount:200});
 // An impassable strip separates only the first source.
 for(let z=0;z<w.nav.height;z++)for(let x=0;x<w.nav.width;x++){const p=w.nav.cellToWorld(x,z);if(p.z>25&&p.z<35)w.nav.blocked[w.nav.index(x,z)]=1;}
 w.tick(1/30);const collectors=w.entities.filter(e=>e.kind==='logiTruck');expect(collectors).toHaveLength(1);expect(collectors[0].logisticsSourceIndex).toBe(1);
 const timer=w.captureRuntime().roadTruckLastSpawn[0];for(let i=0;i<60;i++)w.tick(1/30);expect(w.captureRuntime().roadTruckLastSpawn[0]).toBe(timer);expect(w.entities.filter(e=>e.kind==='logiTruck')).toHaveLength(1);
});
it('a captured facility replaces its lost truck after the dispatch interval and built depots do not own it',()=>{
 const w=fixture(),main=w.spawn('supply',0,0,0),forward=w.spawn('supply',0,55,0);main.fuelStock=forward.fuelStock=0;
 Object.assign(w.resourcePoints[0],{x:0,z:60,radius:8,controlledBy:0,active:true,amount:200});
 w.tick(1/30);const first=w.entities.find(e=>e.kind==='logiTruck')!;expect(first.supplyDepotId).toBe(w.hq[0]!.id);expect(first.resourceConvoy?.sourceIndex).toBe(0);
 first.dead=true;w.tick(1/30);expect(w.entities.filter(e=>!e.dead&&e.kind==='logiTruck')).toHaveLength(0);
 for(let i=0;i<900;i++)w.tick(1/30);const replacement=w.entities.find(e=>!e.dead&&e.kind==='logiTruck')!;expect(replacement?.resourceConvoy?.sourceIndex).toBe(0);expect(replacement.supplyDepotId).toBe(w.hq[0]!.id);
});

it('collector dispatch feeds headquarters regardless of the number or stock of built depots',()=>{
 const w=fixture(),main=w.spawn('supply',0,0,0),forward=w.spawn('supply',0,55,0),cap=stockCapacity(w,forward);
 main.ammoStock=100;main.fuelStock=0;forward.ammoStock=cap.ammo;forward.fuelStock=cap.fuel;forward.repairStock=cap.repair;
 Object.assign(w.resourcePoints[0],{x:55,z:55,radius:8,controlledBy:0,active:true,amount:200});
 w.tick(1/30);const collector=w.entities.find(e=>e.kind==='logiTruck'&&e.logisticsSourceIndex===0)!;
 expect(collector).toBeDefined();expect(collector.supplyDepotId).toBe(w.hq[0]!.id);
});


it('tank servicing preserves fuel for queued production; explicit fuel priority releases the reserve',()=>{
 const w=fixture(),depot=w.spawn('supply',0,0,0),tank=w.spawn('tank',0,10,0),factory=w.spawn('factory',0,-10,-20);w.spawn('landCommand',0,-25,-25);
 depot.fuelStock=50;tank.fuel=0;factory.productionQueue=['tank'];
 for(let i=0;i<60;i++)updateTacticalSupply(w,1/30);
 expect(depot.fuelStock).toBeCloseTo(40);expect(tank.fuel).toBeCloseTo(10);
 updateProduction(w,1/30);expect(factory.productionProgress).toBeGreaterThan(0);
 const before=tank.fuel!;depot.logisticsPriority='fuel';updateTacticalSupply(w,1/30);expect(tank.fuel).toBeGreaterThan(before);
});


it('an empty old warehouse convoy parks instead of inventing a new inter-depot task',()=>{
 const w=fixture(),main=w.spawn('supply',0,0,0),forward=w.spawn('supply',0,55,0),truck=w.spawn('logiTruck',0,41,0);
 truck.supplyDepotId=forward.id;truck.logisticsSourceIndex=null;const stocks=stockTotal(main)+stockTotal(forward);steps(w,1);
 expect(truck.supplyDepotId).toBeUndefined();expect(truck.mode).toBe('idle');expect(truck.cargo).toBe(0);expect(stockTotal(main)+stockTotal(forward)).toBe(stocks);
});

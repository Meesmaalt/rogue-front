import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import {applyCommands} from './systems/commands';
import {updateUnits} from './systems/units';
import {updateTacticalSupply} from './systems/tacticalSupply';
import {canVehicleService,planVehicleService,updateVehicleService,vehicleServiceStatus,vehicleServiceProgress} from './vehicleService';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {depotPad} from './depotPads';
import rules from '../data/logistics.json';
afterEach(resetHeightmap);
function fixture(){
 const bases=[{x:0,z:0,r:210},{x:250,z:250,r:30}];setBases(bases);
 const w=new World(71,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;
 const depot=w.spawn('supply',0,0,0);depot.heading=0;depot.ammoStock=depot.fuelStock=depot.repairStock=5000;
 const tank=w.spawn('tank',0,80,0);w.nav.syncBuildings(w.entities);w.spatial.rebuild(w.entities);
 return {w,depot,tank};
}
function order(w:World,ids:number[],team:0|1=0){w.issue({type:'vehicle-service',ids,team});applyCommands(w);}
function step(w:World,seconds:number){for(let i=0;i<seconds*30;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateTacticalSupply(w,1/30);updateUnits(w,1/30);}}
it('reserves separate reachable spaces, prefers stocked bases and excludes crews, infantry and hostile commands',()=>{
 const {w,depot,tank}=fixture(),other=w.spawn('tank',0,85,8),inf=w.spawn('inf',0,90,0),helper=w.spawn('engineer',0,90,5);
 helper.constructionCrew={homeId:depot.id,slot:0};
 const empty=w.spawn('supply',0,100,-60);empty.ammoStock=empty.fuelStock=empty.repairStock=0;w.nav.syncBuildings(w.entities);
 tank.hp-=30;other.hp-=30;order(w,[tank.id],1);expect(tank.vehicleService).toBeUndefined();
 expect(canVehicleService(inf)).toBe(false);expect(canVehicleService(helper)).toBe(false);
 order(w,[tank.id,other.id,inf.id,helper.id]);expect(tank.vehicleService?.depotId).toBe(depot.id);expect(other.vehicleService?.depotId).toBe(depot.id);
 const a=tank.vehicleService!.point,b=other.vehicleService!.point;
 expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeGreaterThan(tank.def.radius+other.def.radius);
 expect(Math.hypot(a.x-depotPad(depot,0).x,a.z-depotPad(depot,0).z)).toBeGreaterThan(rules.handling.padRadius+tank.def.radius);
 expect(inf.vehicleService).toBeUndefined();expect(helper.vehicleService).toBeUndefined();
});
it('drives physically to service, repairs components using finite stock and completes all weapon pools',()=>{
 const {w,depot,tank}=fixture();tank.hp-=40;tank.components!.engine=40;tank.ammo=0;tank.fuel=tank.maxFuel!*.7;
 tank.secondaryAmmo=undefined;const start={x:tank.x,z:tank.z},stock=depot.repairStock!,money=w.teamCredits[0];
 order(w,[tank.id]);step(w,1);expect(Math.hypot(tank.x-start.x,tank.z-start.z)).toBeGreaterThan(0);expect(tank.hp).toBe(tank.def.hp-40);
 step(w,100);expect(tank.vehicleService?.phase).toBe('ready');expect(tank.hp).toBe(tank.def.hp);expect(tank.components!.engine).toBe(0);
 expect(depot.repairStock).toBeCloseTo(stock-40);expect(depot.ammoStock).toBeLessThan(5000);expect(depot.fuelStock).toBeLessThan(5000);expect(w.teamCredits[0]).toBe(money);
 expect(vehicleServiceProgress(tank)).toBeCloseTo(1);expect(w.events.filter(e=>e.type==='unit-serviced')).toHaveLength(1);
 tank.hp-=1;tank.ammo=0;updateTacticalSupply(w,1);expect(tank.ammo).toBeGreaterThan(0);
});
it('waits for real repair supplies, pauses under fire and resumes after replenishment',()=>{
 const {w,depot,tank}=fixture();tank.hp-=20;order(w,[tank.id]);const s=tank.vehicleService!;tank.x=s.point.x;tank.z=s.point.z;depot.repairStock=0;
 updateVehicleService(w,tank,1,()=>false);expect(s.phase).toBe('stock');expect(vehicleServiceStatus(w,tank)).toContain('remondivaru');
 depot.repairStock=100;tank.hp-=10;updateVehicleService(w,tank,1,()=>false);expect(s.phase).toBe('danger');expect(depot.repairStock).toBe(100);
 w.time+=rules.vehicleService.safeSeconds;updateVehicleService(w,tank,1,()=>false);expect(tank.hp).toBe(tank.def.hp-22);expect(depot.repairStock).toBe(92);
});
it('reroutes when a depot is destroyed, reports isolation and lets new player orders cancel immediately',()=>{
 const {w,depot,tank}=fixture();tank.hp-=20;order(w,[tank.id]);depot.dead=true;
 updateVehicleService(w,tank,1/30,()=>false);expect(tank.vehicleService?.phase).toBe('blocked');expect(vehicleServiceStatus(w,tank)).toContain('läbipääs');
 const replacement=w.spawn('supply',0,-80,-70);w.nav.syncBuildings(w.entities);w.time+=rules.vehicleService.retrySeconds;
 updateVehicleService(w,tank,1/30,()=>false);expect(tank.vehicleService?.depotId).toBe(replacement.id);expect(tank.vehicleService?.phase).toBe('travel');
 w.issue({type:'stop',ids:[tank.id]});applyCommands(w);expect(tank.vehicleService).toBeUndefined();expect(updateVehicleService(w,tank,1,()=>false)).toBe(false);
});
it('saves reservations, retries and repair work in the deterministic hash',()=>{
 const {w,tank}=fixture();tank.hp-=30;order(w,[tank.id]);step(w,2);
 const state=JSON.parse(JSON.stringify(saveWorld(w))),copy=fixture().w;loadWorld(copy,state);
 expect(worldHash(copy)).toBe(worldHash(w));for(let i=0;i<90;i++){w.tick(1/30);copy.tick(1/30);}expect(worldHash(copy)).toBe(worldHash(w));
 const copied=copy.byId.get(tank.id)!;copied.vehicleService!.point.x+=1;expect(worldHash(copy)).not.toBe(worldHash(w));
});
it('does not select a completely empty depot or magically move a fuel-starved vehicle',()=>{
 const {w,depot,tank}=fixture();tank.hp-=10;depot.repairStock=0;expect(planVehicleService(w,tank)).toBeNull();
 depot.repairStock=50;tank.fuel=0;order(w,[tank.id]);step(w,1);expect(tank.x).toBe(80);expect(vehicleServiceStatus(w,tank)).toContain('varustusveokit');
});

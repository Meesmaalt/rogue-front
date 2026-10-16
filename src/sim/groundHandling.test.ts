import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {heightAt,resetHeightmap,setBases} from './heightmap';
import {handleGroundCargo,logisticsLandingPoint,updateGroundHandler} from './groundHandling';
import {updateUnits} from './systems/units';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {damage} from './systems/combat';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:250},{x:250,z:250,r:30}];setBases(bases);const w=new World(52,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,0,0);w.spawn('generator',0,0,-30);const depot=w.spawn('supply',0,30,0),h=w.spawn('transport',0,0,0);h.supplyDepotId=depot.id;w.nav.syncBuildings(w.entities);const p=logisticsLandingPoint(w,depot,h)!;h.x=p.x;h.z=p.z;h.y=heightAt(p.x,p.z);h.airState='grounded';h.cargo=180;return {w,depot,h};}
function step(w:World,h:ReturnType<World['spawn']>,depot:ReturnType<World['spawn']>){for(const e of w.entities){e.px=e.x;e.py=e.y;e.pz=e.z;e.pHeading=e.heading;}w.time+=1/30;handleGroundCargo(w,h,depot,1/30);w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
it('six collecting/import helicopters reserve distinct unobstructed landing pads',()=>{const {w,depot,h}=fixture(),positions=[{x:h.x,z:h.z}];for(let i=0;i<5;i++){const u=w.spawn('transport',0,0,0);u.supplyDepotId=depot.id;const p=logisticsLandingPoint(w,depot,u)!;expect(p).not.toBeNull();for(const other of positions)expect(Math.hypot(p.x-other.x,p.z-other.z)).toBeGreaterThanOrEqual(20);positions.push(p);expect(logisticsLandingPoint(w,depot,u)).toEqual(p);}});
it('a visible vehicle picks up cargo at the ramp; money changes only at the warehouse',()=>{
 const {w,depot,h}=fixture(),money=w.credits;let transferred=false;for(let i=0;i<3600&&w.roadCargoDelivered[0]<180;i++){step(w,h,depot);const truck=w.entities.find(e=>e.kind==='groundHandler'&&!e.dead);if(truck&&truck.cargo>0&&w.roadCargoDelivered[0]===0){transferred=true;expect(w.credits).toBe(money);expect(h.cargo+truck.cargo).toBe(180);expect(Math.hypot(truck.x-depot.x,truck.z-depot.z)).toBeGreaterThan(depot.def.radius);}}
 expect(transferred).toBe(true);expect(w.roadCargoDelivered[0]).toBeCloseTo(180);expect(w.credits).toBeGreaterThan(money);expect(h.cargo).toBe(0);
});
it('mid-delivery cargo, landing leases, hatch and worker state save deterministically',()=>{const {w,depot,h}=fixture();for(let i=0;i<260;i++)step(w,h,depot);const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));for(let i=0;i<180;i++){step(w,h,depot);step(copy,copy.byId.get(h.id)!,copy.byId.get(depot.id)!);}expect(worldHash(copy)).toBe(worldHash(w));});
it('a destroyed cargo vehicle loses its load instead of paying the warehouse',()=>{const {w,depot,h}=fixture();for(let i=0;i<240;i++)handleGroundCargo(w,h,depot,1/30);const truck=w.byId.get(h.groundServiceId!)!;truck.cargo=80;h.cargo-=80;const money=w.credits;damage(w,truck,10000);expect(w.roadCargoLost[0]).toBe(80);expect(w.credits).toBe(money);});
it('full warehouses leave real goods on the service vehicle and partial acceptance is conserved',()=>{const {w,depot,h}=fixture();handleGroundCargo(w,h,depot,10);const truck=w.byId.get(h.groundServiceId!)!;truck.cargo=100;h.cargo=0;truck.groundService!.phase='unload';truck.groundService!.progress=10;depot.ammoStock=1200;depot.fuelStock=1600;depot.repairStock=600;const money=w.credits;updateGroundHandler(w,truck,1/30,()=>true);expect(truck.cargo).toBe(100);expect(w.credits).toBe(money);depot.fuelStock-=20;updateGroundHandler(w,truck,1/30,()=>true);expect(truck.cargo).toBeCloseTo(50);expect(w.credits-money).toBeCloseTo(30);});
it('simultaneous arrivals get separate service vehicles and keep the cargo total intact',()=>{
 const {w,depot,h}=fixture(),other=w.spawn('transport',0,0,0);other.supplyDepotId=depot.id;const p=logisticsLandingPoint(w,depot,other)!;other.x=p.x;other.z=p.z;other.y=heightAt(p.x,p.z);other.airState='grounded';other.cargo=180;
 handleGroundCargo(w,h,depot,10);handleGroundCargo(w,other,depot,10);const workers=w.entities.filter(e=>e.kind==='groundHandler'&&!e.dead);expect(workers).toHaveLength(2);expect(workers[0].groundService!.dockSlot).not.toBe(workers[1].groundService!.dockSlot);expect(Math.hypot(workers[0].x-workers[1].x,workers[0].z-workers[1].z)).toBeGreaterThan(workers[0].def.radius+workers[1].def.radius);expect(h.cargo+other.cargo+workers.reduce((n,e)=>n+e.cargo,0)).toBe(360);
});
it('cargo already on a vehicle can reach another warehouse after the first one is destroyed',()=>{
 const {w,depot,h}=fixture();handleGroundCargo(w,h,depot,10);const truck=w.byId.get(h.groundServiceId!)!;truck.cargo=100;h.cargo=0;truck.groundService!.phase='deliver';const replacement=w.spawn('supply',0,60,0);depot.dead=true;updateGroundHandler(w,truck,10,()=>true);expect(truck.groundService!.depotId).toBe(replacement.id);expect(truck.cargo).toBe(0);expect(w.roadCargoDelivered[0]).toBeCloseTo(100);
});
it('moving a landed collector closes the hatch, spools up and leaves without a helipad',async()=>{
 const {applyCommands}=await import('./systems/commands'),{w,depot,h}=fixture();
 handleGroundCargo(w,h,depot,10);const worker=w.byId.get(h.groundServiceId!)!;
 worker.cargo=60;h.cargo-=60;worker.groundService!.phase='deliver';
 const start={x:h.x,z:h.z},money=w.credits;
 w.pending.push({type:'move',ids:[h.id],x:h.x+75,z:h.z,team:0});applyCommands(w);
 expect(h.logisticsManual).toBe(true);
 for(let i=0;i<30;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(h.cargoDoor).toBeLessThan(1);expect(Math.hypot(h.x-start.x,h.z-start.z)).toBeLessThan(.1);
 for(let i=0;i<1800;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(h.dead).toBe(false);expect(h.cargoDoor).toBe(0);expect(Math.hypot(h.x-start.x,h.z-start.z)).toBeGreaterThan(60);
 expect(w.credits).toBeGreaterThan(money);expect(worker.cargo).toBe(0);
 w.pending.push({type:'logistics-source',ids:[depot.id],sourceIndex:null,paused:false,team:0});applyCommands(w);expect(h.logisticsManual).toBe(false);
 for(let i=0;i<120;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(h.airState).not.toBe('grounded');expect(h.y).toBeGreaterThan(heightAt(h.x,h.z));
});
it('a helicopter uses a forklift-sized handler while a cargo plane keeps its loader',()=>{
 const {w,depot,h}=fixture();handleGroundCargo(w,h,depot,10);const crew=w.byId.get(h.groundServiceId!)!;
 expect(crew.groundService!.onFoot).toBe(true);expect(crew.def.speed).toBe(4);expect(crew.def.radius).toBe(1);
 const plane=w.spawn('cargoPlane',0,h.x+50,h.z);plane.supplyDepotId=depot.id;plane.cargo=480;handleGroundCargo(w,plane,depot,10);
 const loader=w.byId.get(plane.groundServiceId!)!;expect(loader.groundService!.onFoot).toBe(false);expect(loader.def.speed).toBe(10);
});

it('a loaded crew switches a blocked warehouse approach without losing or crediting its cargo',()=>{
 const {w,depot,h}=fixture();handleGroundCargo(w,h,depot,10);const worker=w.byId.get(h.groundServiceId!)!;
 worker.cargo=100;h.cargo-=100;worker.groundService!.phase='deliver';worker.motionSpeed=0;
 const old=worker.groundService!.dockSlot,money=w.credits;
 for(let i=0;i<100;i++)updateGroundHandler(w,worker,1/30,()=>false);
 expect(worker.groundService!.dockSlot).not.toBe(old);expect(worker.cargo).toBe(100);expect(w.credits).toBe(money);expect(worker.dead).toBe(false);
});

import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {dispatchResourceConvoys,updateResourceConvoy,updateHqCargo} from './resourceConvoys';
import {dispatchConstruction} from './automaticConstruction';
import {updateUnits} from './systems/units';
import {applyCommands} from './systems/commands';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import cfg from '../data/logistics.json';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:-100,z:0,r:220},{x:240,z:240,r:20}];setBases(bases);const w=new World(97,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;const hq=w.spawn('hq',0,-100,0);w.nav.syncBuildings(w.entities);return {w,hq};}
function capture(w:World){Object.assign(w.resourcePoints[0],{x:80,z:10,radius:8,controlledBy:0,active:true,amount:150});w.time=30;dispatchResourceConvoys(w,[-100,-100]);return w.entities.find(e=>!!e.resourceConvoy)!;}
function step(w:World){w.time+=1/30;w.nav.syncBuildings(w.entities);w.spatial.rebuild(w.entities);dispatchConstruction(w);updateUnits(w,1/30);}
it('two built depots create no truck; a captured site owns a separate bounded truck and never commandeers the purchased truck',()=>{
 const {w,hq}=fixture();w.spawn('supply',0,-20,-70);w.spawn('supply',0,60,-70);const bought=w.spawn('logiTruck',0,-70,40);
 w.time=30;dispatchResourceConvoys(w,[-100,-100]);expect(w.entities.filter(e=>e.kind==='logiTruck')).toEqual([bought]);
 const convoy=capture(w);expect(convoy).toBeDefined();expect(convoy.resourceConvoy?.homeId).toBe(hq.id);expect(convoy.x).toBeGreaterThan(40);
 dispatchResourceConvoys(w,[-100,-100]);expect(w.entities.filter(e=>e.resourceConvoy)).toHaveLength(1);expect(bought.supplyDepotId).toBeUndefined();
 w.issue({type:'move',ids:[bought.id,convoy.id],x:-40,z:60});applyCommands(w);expect(bought.dest).toEqual({x:-40,z:60});expect(convoy.dest).not.toEqual(bought.dest);
 step(w);expect(bought.supplyDepotId).toBeUndefined();expect(bought.resourceConvoy).toBeUndefined();
});
it('the physical truck returns to HQ and idle construction workers carry finite batches into the building',()=>{
 const {w,hq}=fixture(),truck=capture(w),start=w.teamResources[0];let driving=false,carried=false,delivered=false;
 for(let i=0;i<6500;i++){
  step(w);driving ||= truck.resourceConvoy?.phase==='to-hq';carried ||= w.entities.some(e=>!!e.hqCargo&&e.cargo>0);
  if(w.roadCargoDelivered[0]>0){delivered=true;break;}
 }
 expect(driving).toBe(true);expect(carried).toBe(true);expect(delivered).toBe(true);expect(w.teamResources[0]).toBeGreaterThan(start);
 const carriedTotal=w.entities.filter(e=>e.hqCargo).reduce((n,e)=>n+e.cargo,0);
 expect(truck.cargo+carriedTotal+w.roadCargoDelivered[0]+w.resourcePoints[0].amount).toBeCloseTo(150);
 expect(truck.resourceConvoy?.homeId).toBe(hq.id);
 const copy=fixture().w;Object.assign(copy.resourcePoints[0],w.resourcePoints[0]);loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
});
it('busy builders leave unloading queued; losing the source sends existing cargo home instead of stealing another source',()=>{
 const {w,hq}=fixture(),truck=capture(w);dispatchConstruction(w);const crew=w.entities.find(e=>e.constructionCrew)!;
 const job=w.spawn('generator',0,-50,30);job.underConstruction=true;job.constructionTime=30;job.builderIds=[crew.id];crew.target=job;crew.mode='build';crew.engineerDuty!.phase='working';
 truck.cargo=100;truck.resourceConvoy!.phase='unloading';const money=w.teamResources[0];
 updateResourceConvoy(w,truck,1/30,()=>true);expect(crew.hqCargo).toBeUndefined();expect(truck.cargo).toBe(100);expect(w.teamResources[0]).toBe(money);
 w.resourcePoints[0].controlledBy=1;truck.resourceConvoy!.phase='to-source';updateResourceConvoy(w,truck,1/30,()=>false);expect(truck.resourceConvoy!.phase).toBe('to-hq');expect(truck.cargo).toBe(100);
 truck.resourceConvoy!.phase='unloading';crew.target=null;crew.mode='idle';crew.engineerDuty!.phase='rest';updateResourceConvoy(w,truck,1/30,()=>true);expect(crew.hqCargo?.homeId).toBe(hq.id);
 // Picking up does not create income. A full HQ retains the carried goods until space exists.
 updateHqCargo(w,crew,1/30,()=>true);w.time+=2;updateHqCargo(w,crew,1/30,()=>true);expect(crew.cargo).toBe(cfg.resourceConvoys.workerBatch);expect(w.teamResources[0]).toBe(money);
 const cap=cfg.depot;hq.ammoStock=cap.ammoCapacity;hq.fuelStock=cap.fuelCapacity;hq.repairStock=cap.repairCapacity;
 updateHqCargo(w,crew,1/30,()=>true);w.time+=2;updateHqCargo(w,crew,1/30,()=>true);expect(crew.cargo).toBe(cfg.resourceConvoys.workerBatch);expect(w.teamResources[0]).toBe(money);
 hq.ammoStock=0;updateHqCargo(w,crew,1/30,()=>true);expect(crew.cargo).toBe(0);expect(w.roadCargoDelivered[0]).toBe(cfg.resourceConvoys.workerBatch);
});
it('HQ level two assigns one team per job and migrates old double assignments without duplicating workers',()=>{
 const {w,hq}=fixture();hq.buildingLevel=2;dispatchConstruction(w);
 const a=w.spawn('generator',0,-50,0),b=w.spawn('generator',0,-50,55);
 for(const job of [a,b]){job.underConstruction=true;job.constructionTime=30;}
 dispatchConstruction(w);expect(a.builderIds).toHaveLength(1);expect(b.builderIds).toHaveLength(1);expect(a.builderIds[0]).not.toBe(b.builderIds[0]);
 const second=w.byId.get(b.builderIds[0])!;b.builderIds=[];second.target=a;second.mode='build';a.builderIds.push(second.id);
 dispatchConstruction(w);expect(a.builderIds).toHaveLength(1);expect(b.builderIds).toHaveLength(1);
});

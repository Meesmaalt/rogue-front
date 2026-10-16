import * as THREE from 'three';
import {createForklift,createSeatedWorker} from './CargoHandlingVisual';
import {createHammer,createShovel,createWheelbarrow} from './EngineerVisual';
import {buildingScale,depotBays,depotSeats,rackSlots,HQ_BARROW} from './lounge';
import type {DepotPad} from '../sim/depotPads';
import type {Entity} from '../sim/types';
import type {World} from '../sim/World';
const HQ_SCALE=buildingScale('hq'),DEPOT_SCALE=buildingScale('supply'),MAX_CREWS=4,REFRESH=.25;
interface Crew{workers:THREE.Group[];forklift:THREE.Group}
interface DepotSet{group:THREE.Group;crews:Crew[]}
interface HqSet{group:THREE.Group;hammers:THREE.Object3D[];shovels:THREE.Object3D[];barrow:THREE.Object3D}
function dispose(group:THREE.Object3D):void{group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});}
function placed(group:THREE.Group,e:Entity):THREE.Group{group.position.set(e.x,e.y,e.z);group.rotation.y=e.heading;return group;}
/**
 * Presentation-only life around the base: one depot crew (two workers + forklift) per helipad, chilling in the depot lounge
 * while their pad is idle, and the HQ tool rack whose hammers/shovels return when engineers rest. Never touches the simulation.
 */
export class BaseLife {
 readonly group=new THREE.Group();
 private readonly depots=new Map<number,DepotSet>();private readonly hqs=new Map<number,HqSet>();
 private clock=REFRESH;private busy=new Map<number,Set<number>>();private resting=new Map<number,number>();
 constructor(scene:THREE.Scene){this.group.name='BaseLife';scene.add(this.group);}
 update(world:World,dt:number,focus:{x:number;z:number;dist:number},padsByDepot:ReadonlyMap<number,DepotPad[]>):void{
  this.clock+=dt;
  if(this.clock>=REFRESH){this.clock=0;this.refresh(world,focus,padsByDepot);}
  const t=world.time;
  for(const set of this.depots.values())if(set.group.visible)set.crews.forEach((crew,i)=>crew.workers.forEach((w,k)=>{
   if(!w.visible)return;const head=w.getObjectByName('SeatedHead');if(head){head.rotation.y=Math.sin(t*.55+i*1.7+k*2.3)*.55;head.rotation.x=Math.sin(t*.8+k*1.1+i)*.07;}
  }));
 }
 private refresh(world:World,focus:{x:number;z:number;dist:number},padsByDepot:ReadonlyMap<number,DepotPad[]>):void{
  const range=focus.dist*1.5+70,near=(e:Entity)=>Math.hypot(e.x-focus.x,e.z-focus.z)<range;
  // Which pad slots currently have a helicopter being handled (aircraft hold, open ramp or active porters)
  this.busy.clear();this.resting.clear();
  const carriers=new Set<number>();
  for(const e of world.entities){
   if(e.dead)continue;
   if(e.groundService)carriers.add(e.groundService.carrierId);
   if(e.kind==='engineer'&&e.mode==='idle'&&!e.dest&&!e.target&&(e.motionSpeed??0)<.1)this.resting.set(e.team,(this.resting.get(e.team)??0)+(e.squadMembers??e.squadMaxMembers??1));
  }
  for(const u of world.entities){
   if(u.dead||u.kind!=='transport'||u.supplyDepotId==null||u.logisticsPadSlot==null)continue;
   if(u.cargo>.001||(u.cargoDoor??0)>0||carriers.has(u.id)){let s=this.busy.get(u.supplyDepotId);if(!s){s=new Set();this.busy.set(u.supplyDepotId,s);}s.add(u.logisticsPadSlot);}
  }
  const depotIds=new Set<number>(),hqIds=new Set<number>();
  for(const e of world.entities){
   if(e.dead||e.underConstruction||e.team!==world.playerTeam)continue;
   if(e.kind==='supply'){depotIds.add(e.id);this.syncDepot(e,near(e),padsByDepot.get(e.id)??[]);}
   else if(e.kind==='hq'||e.kind==='combatEngineer'){hqIds.add(e.id);this.syncHq(e,near(e),this.resting.get(e.team)??0);}
  }
  for(const [id,set] of this.depots)if(!depotIds.has(id)){dispose(set.group);this.group.remove(set.group);this.depots.delete(id);}
  for(const [id,set] of this.hqs)if(!hqIds.has(id)){dispose(set.group);this.group.remove(set.group);this.hqs.delete(id);}
 }
 private syncDepot(depot:Entity,visible:boolean,pads:DepotPad[]):void{
  const count=Math.min(MAX_CREWS,Math.max(1,pads.length));let set=this.depots.get(depot.id);
  if(set&&set.crews.length!==count){dispose(set.group);this.group.remove(set.group);this.depots.delete(depot.id);set=undefined;}
  if(!set){
   const group=placed(new THREE.Group(),depot),seats=depotSeats(MAX_CREWS*2),bays=depotBays(MAX_CREWS),crews:Crew[]=[];
   for(let i=0;i<count;i++){
    const workers=[0,1].map(k=>{const s=seats[i*2+k],w=createSeatedWorker(i%2?0xf08a24:0x6fb35a);w.position.set(s.x*DEPOT_SCALE,.6*(DEPOT_SCALE-1),s.z*DEPOT_SCALE);w.rotation.y=s.heading;group.add(w);return w;});
    const forklift=createForklift(false);forklift.position.set(bays[i].x*DEPOT_SCALE,0,bays[i].z*DEPOT_SCALE);forklift.rotation.y=bays[i].heading;group.add(forklift);crews.push({workers,forklift});
   }
   this.group.add(group);set={group,crews};this.depots.set(depot.id,set);
  }
  set.group.visible=visible;if(!visible)return;
  const busy=this.busy.get(depot.id);
  set.crews.forEach((crew,i)=>{const away=!!busy&&pads[i]!==undefined&&busy.has(pads[i].slot);crew.workers.forEach(w=>{w.visible=!away;});crew.forklift.visible=!away;});
 }
 private syncHq(hq:Entity,visible:boolean,restingMembers:number):void{
  let set=this.hqs.get(hq.id);
  if(!set){
   const group=placed(new THREE.Group(),hq),hammers:THREE.Object3D[]=[],shovels:THREE.Object3D[]=[];
   rackSlots().forEach(slot=>{
    const h=createHammer();h.position.set(slot.x*HQ_SCALE+.06,slot.y*HQ_SCALE-.5,slot.z*HQ_SCALE);h.rotation.set(0,Math.PI/2,Math.PI);group.add(h);hammers.push(h);
    const s=createShovel();s.position.set(slot.x*HQ_SCALE+.12,1.2,slot.z*HQ_SCALE+.3);s.rotation.set(0,0,0);group.add(s);shovels.push(s);
   });
   const barrow=createWheelbarrow();barrow.position.set(HQ_BARROW.x*HQ_SCALE,0,HQ_BARROW.z*HQ_SCALE);barrow.rotation.y=HQ_BARROW.heading;group.add(barrow);
   this.group.add(group);set={group,hammers,shovels,barrow};this.hqs.set(hq.id,set);
  }
  set.group.visible=visible;if(!visible)return;
  set.hammers.forEach((h,i)=>{h.visible=i<restingMembers;});set.shovels.forEach((s,i)=>{s.visible=i<restingMembers;});set.barrow.visible=restingMembers>0;
 }
}

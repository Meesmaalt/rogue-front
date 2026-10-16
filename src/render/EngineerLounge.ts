import * as THREE from 'three';
import {buildingScale,hqSeats,rackSpots,seatWorld} from './lounge';
import type {Entity} from '../sim/types';
import type {World} from '../sim/World';
export interface LoungeState{engIdle?:number;seats?:Array<{x:number;z:number;heading:number}>|null;seatCheck?:number;barrow?:THREE.Object3D|null;
 hq?:{x:number;z:number;heading:number};gearUntil?:number;/** Walking to / standing at the tool rack: members do not sit. */gearPhase?:boolean;/** Hands are empty (tools are on the rack). */toolsAway?:boolean}
const IDLE_BEFORE_LOUNGE=3,LOUNGE_RANGE=28,GEAR_TIME=2;
type Spot={x:number;z:number;heading:number};
function assignedSeats(world:World,e:Entity,home:Entity):Spot[]|null {
 const occupants=world.entities.filter(u=>!u.dead&&u.kind==='engineer'&&u.team===e.team&&(u.engineerDuty?.homeId===home.id||!u.engineerDuty&&Math.hypot(u.x-home.x,u.z-home.z)<LOUNGE_RANGE)).sort((a,b)=>a.id-b.id);
 let offset=0;for(const u of occupants){if(u===e)break;offset+=u.squadMembers??u.squadMaxMembers??1;}
 const seats=hqSeats().slice(offset,offset+(e.squadMembers??e.squadMaxMembers??1));return seats.length?seats.map(s=>seatWorld(home,buildingScale('hq'),s)):null;
}
/**
 * Presentation only. Idle engineers walk to the HQ lounge and sit with their tools back on the rack; when work arrives they
 * first walk to the rack, take hammer and shovel, and only then head out (members follow the squad as usual afterwards).
 */
export function engineerSeats(world:World,e:Entity,st:LoungeState,dt:number):Spot[]|null {
 if(e.engineerDuty){const home=world.byId.get(e.engineerDuty.homeId);st.gearPhase=e.engineerDuty.phase==='to-van'||e.engineerDuty.phase==='boarding';st.toolsAway=e.engineerDuty.phase==='rest'||!!st.gearPhase;return home&&e.engineerDuty.phase==='rest'?assignedSeats(world,e,home):null;}
 const resting=e.mode==='idle'&&!e.dest&&!e.target&&(e.motionSpeed??0)<.1&&!e.garrisonId&&!e.airdrop&&e.loadedIntoId==null;
 st.engIdle=resting?(st.engIdle??0)+dt:0;
 if(st.engIdle>=IDLE_BEFORE_LOUNGE){
  if(world.time>=(st.seatCheck??0)){
   st.seatCheck=world.time+1;
   const hq=world.entities.find(h=>h.kind==='hq'&&!h.dead&&!h.underConstruction&&h.team===e.team&&Math.hypot(h.x-e.x,h.z-e.z)<LOUNGE_RANGE);
   st.hq=hq?{x:hq.x,z:hq.z,heading:hq.heading}:st.hq;st.seats=hq?assignedSeats(world,e,hq):null;
  }
  st.gearUntil=0;st.gearPhase=false;st.toolsAway=!!st.seats;return st.seats??null;
 }
 if(st.seats&&!resting&&st.hq)st.gearUntil=world.time+GEAR_TIME;
 st.seats=null;st.seatCheck=0;
 if(st.gearUntil&&world.time<st.gearUntil&&st.hq){st.gearPhase=true;st.toolsAway=world.time<st.gearUntil-GEAR_TIME*.5;return rackSpots().map(s=>seatWorld(st.hq!,buildingScale('hq'),s));}
 st.gearUntil=0;st.gearPhase=false;st.toolsAway=false;return null;
}
/** Members farther than the follower's teleport distance would snap; walk there in hops instead. */
export function hopTarget(p:{x:number;z:number},target:{x:number;z:number},max=12):{x:number;z:number} {
 const d=Math.hypot(target.x-p.x,target.z-p.z);return d<=max?target:{x:p.x+(target.x-p.x)*max/d,z:p.z+(target.z-p.z)*max/d};
}
export function animateEngineerTools(o:THREE.Object3D,e:Entity,index:number,time:number,seated:boolean):void {
 const ud=o.userData;
 if(ud.hammer===undefined){ud.hammer=o.getObjectByName('EngHammer')??null;ud.shovel=o.getObjectByName('EngShovel')??null;}
 const hammer=ud.hammer as THREE.Object3D|null,shovel=ud.shovel as THREE.Object3D|null,working=e.mode==='build'&&!!e.target,digging=e.mode==='repair'&&!!e.target;
 if(hammer){hammer.visible=!seated;if(working){hammer.position.set(.3,1.12,.3);hammer.rotation.x=-.5+Math.sin(time*9+index*1.7)*.9;}else{hammer.position.set(.3,.95,.22);hammer.rotation.x=.4;}}
 if(shovel){shovel.visible=!seated;if(digging){shovel.position.set(.2,.95,.32);shovel.rotation.set(1+Math.sin(time*4.5+index*1.3)*.45,0,0);}else{shovel.position.set(-.18,1.2,-.36);shovel.rotation.set(-.15,0,.12);}}
}
/** The squad's wheelbarrow shows its load while the engineers are working and rolls its wheel when they move. */
export function animateBarrow(group:THREE.Object3D,st:LoungeState,e:Entity,walkPhase:number,pusher?:THREE.Object3D,parked=false):void {
 if(st.barrow===undefined)st.barrow=group.getObjectByName('EngBarrow')??null;
 const barrow=st.barrow;if(!barrow)return;
 // Pushed ahead of one squad member; parked (hidden) while the engineers rest because the yard shows its own barrow.
 barrow.visible=!e.engineerDuty?.vanPoint&&!parked&&(pusher?.visible??true);
 if(pusher){const r=pusher.rotation.y;barrow.position.set(pusher.position.x+Math.sin(r)*1.3,pusher.position.y,pusher.position.z+Math.cos(r)*1.3);barrow.rotation.y=r;}
 const load=barrow.getObjectByName('BarrowLoad'),wheel=barrow.getObjectByName('BarrowWheel');
 if(load)load.visible=e.mode==='build'||e.mode==='repair';if(wheel)wheel.rotation.x=walkPhase*2;
}

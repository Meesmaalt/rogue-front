import type {Entity} from '../sim/types';
import {wrapAngle} from '../sim/math';
import {SIM_STEP} from '../sim/constants';
import mobility from '../data/mobility.json';
export interface MotionPose {x:number;y:number;z:number;heading:number;bank:number;pitch:number;speed:number}
/** Reuses a caller-owned pose. Cosmetic sampling never changes simulation state. */
type MotionEntity=Pick<Entity,"x"|"y"|"z"|"px"|"py"|"pz"|"heading"|"pHeading"|"flightBank"|"pFlightBank"|"flightPitch"|"pFlightPitch"> & {def:Pick<Entity["def"],"speed">};
export function sampleMotion(e:MotionEntity,alpha:number,out:MotionPose):void {
 const distance=Math.hypot(e.x-e.px,e.z-e.pz),teleport=distance>mobility.presentation.teleportDistance;
 const t=teleport?1:Math.max(0,Math.min(1,alpha));
 out.x=e.px+(e.x-e.px)*t;out.z=e.pz+(e.z-e.pz)*t;
 out.y=(e.py??e.y)+(e.y-(e.py??e.y))*t;
 out.heading=e.pHeading+wrapAngle(e.heading-e.pHeading)*t;
 out.bank=(e.pFlightBank??e.flightBank??0)+((e.flightBank??0)-(e.pFlightBank??e.flightBank??0))*t;
 out.pitch=(e.pFlightPitch??e.flightPitch??0)+((e.flightPitch??0)-(e.pFlightPitch??e.flightPitch??0))*t;
 out.speed=teleport?0:Math.min(e.def.speed*1.5,distance/SIM_STEP);
}
/** Frame-rate independent exponential response, with no overshoot. */
export function smoothMotion(current:number,target:number,response:number,dt:number):number {
 return current+(target-current)*(1-Math.exp(-response*Math.max(0,dt)));
}

export interface SuspensionState {value:number;velocity:number}
/** Analytic damped spring: no substeps or frame-rate dependent Euler wobble. */
export function springSuspension(state:SuspensionState,target:number,dt:number,reset=false):void {
 if(reset){state.value=target;state.velocity=0;return;}
 if(dt<=0)return;
 const omega=Math.PI*2*mobility.presentation.suspensionFrequency,damping=mobility.presentation.suspensionDamping;
 const decay=damping*omega,frequency=omega*Math.sqrt(1-damping*damping),offset=state.value-target;
 const sine=Math.sin(frequency*dt),cosine=Math.cos(frequency*dt),envelope=Math.exp(-decay*dt),b=(state.velocity+decay*offset)/frequency;
 state.value=target+envelope*(offset*cosine+b*sine);
 state.velocity=envelope*((-decay*offset+frequency*b)*cosine+(-decay*b-frequency*offset)*sine);
}

/** Taxi is a ground phase for jets, but helicopters already lift vertically during it. */
export function usesFlightHeight(e:Pick<Entity,'airState'>&{def:Pick<Entity['def'],'armor'|'category'>}):boolean {
 return e.def.armor==='air'&&!['grounded','rearming'].includes(e.airState??'')&&(e.airState!=='taxi'||e.def.category==='heli');
}

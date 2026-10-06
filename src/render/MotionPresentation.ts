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

import type {Entity} from './types';
import mobility from '../data/mobility.json';
import {wrapAngle} from './math';
export function helicopterYawRate(u:Entity):number {
 const speed=Math.min(1,(u.motionSpeed??0)/Math.max(1,u.def.speed));
 return Math.min(u.def.turnRate,mobility.helicopter.yawRate+(mobility.helicopter.cruiseYawRate-mobility.helicopter.yawRate)*speed);
}
/** Movement and weapons share one angular budget from the previous fixed tick. */
export function turnHelicopter(u:Entity,desired:number,dt:number):number {
 const step=helicopterYawRate(u)*dt,delta=wrapAngle(desired-u.pHeading);
 return wrapAngle(u.pHeading+Math.max(-step,Math.min(step,delta)));
}

import {wrapAngle} from '../sim/math';
import config from '../data/squad-presentation.json';
export interface SoldierPose {x:number;z:number;heading:number;stride:number;speed:number}
/** Per-member world-space followers preserve turns and asynchronous steps; presentation only. */
export function stepSoldier(p:SoldierPose,target:{x:number;z:number},heading:number,speed:number,phase:number,dt:number,reset=false):void {
 const distance=Math.hypot(target.x-p.x,target.z-p.z);
 if(reset||distance>config.teleportDistance){p.x=target.x;p.z=target.z;p.heading=heading;p.speed=0;return;}
 const gain=config.followResponse*(.82+(phase%7)*.055),step=Math.min(distance,Math.max(speed*config.catchupMultiplier,config.idleAdjustSpeed)*dt,distance*(1-Math.exp(-gain*dt)));
 const dx=target.x-p.x,dz=target.z-p.z;p.speed=dt>0?step/dt:0;
 if(distance>.001){p.x+=dx/distance*step;p.z+=dz/distance*step;}
 const look=p.speed>config.headingSpeed?Math.atan2(dx,dz):heading;p.heading+=wrapAngle(look-p.heading)*(1-Math.exp(-config.turnResponse*dt));
 p.stride+=step*Math.PI*2/config.strideLength;
}
export function soldierOffset(x:number,z:number,index:number,time:number,pace:number):{x:number;z:number} {
 const phase=index*2.399963;
 return {x:x+Math.sin(time*.83+phase)*config.lateralWander*pace,z:z+Math.cos(time*.61+phase)*config.longitudinalWander*pace};
}

import {wrapAngle} from '../sim/math';
import config from '../data/squad-presentation.json';
export interface SoldierPose {x:number;z:number;heading:number;stride:number;speed:number}
/** Per-member world-space followers preserve turns and asynchronous steps; presentation only. */
export function stepSoldier(p:SoldierPose,target:{x:number;z:number},heading:number,speed:number,phase:number,dt:number,reset=false):void {
 const distance=Math.hypot(target.x-p.x,target.z-p.z);
 if(reset||distance>config.teleportDistance){p.x=target.x;p.z=target.z;p.heading=heading;p.speed=0;return;}
 const gain=config.followResponse*(.82+(phase%7)*.055),step=Math.min(distance,Math.max(speed*config.catchupMultiplier,config.idleAdjustSpeed)*dt,distance*(1-Math.exp(-gain*dt)));
 const dx=target.x-p.x,dz=target.z-p.z;p.speed=dt>0?step/dt:0;
 if(distance<.035&&speed<.15){p.x=target.x;p.z=target.z;p.speed=0;}
 else if(distance>.001){p.x+=dx/distance*step;p.z+=dz/distance*step;}
 const look=p.speed>config.headingSpeed?Math.atan2(dx,dz):heading;p.heading+=wrapAngle(look-p.heading)*(1-Math.exp(-config.turnResponse*dt));
 p.stride+=step*Math.PI*2/config.strideLength;
}
export function soldierOffset(x:number,z:number,index:number,time:number,pace:number):{x:number;z:number} {
 const phase=index*2.399963;
 return {x:x+Math.sin(time*.83+phase)*config.lateralWander*pace,z:z+Math.cos(time*.61+phase)*config.longitudinalWander*pace};
}

import {findPath} from '../sim/nav/Pathfinder';
import type {NavGrid} from '../sim/nav/NavGrid';
type WalkingPose=SoldierPose&{walkPath?:Array<{x:number;z:number}>;walkGoal?:{x:number;z:number}};
/** Presentation follows the same wall mask, with a cached detour instead of freezing against a corner. */
export function stepSoldierNavigated(p:WalkingPose,target:{x:number;z:number},heading:number,speed:number,phase:number,dt:number,nav:NavGrid,reset=false):void {
 if(!nav.isWalkableWorld(p.x,p.z,.22)){const free=nav.nearestWalkable(p,.22);if(free){p.x=free.x;p.z=free.z;p.walkPath=undefined;}}
 if(reset){const safe=nav.isWalkableWorld(target.x,target.z,.22)?target:nav.nearestWalkable(target,.22);if(safe)target=safe;p.walkPath=undefined;p.walkGoal=undefined;stepSoldier(p,target,heading,speed,phase,dt,true);return;}
 const end=nav.isWalkableWorld(target.x,target.z,.22)?target:nav.nearestWalkable(target,.22);if(!end){p.speed=0;return;}
 const clear=(to:{x:number;z:number})=>{const n=Math.max(1,Math.ceil(Math.hypot(to.x-p.x,to.z-p.z)/.5));for(let i=1;i<=n;i++)if(!nav.isWalkableWorld(p.x+(to.x-p.x)*i/n,p.z+(to.z-p.z)*i/n,.22))return false;return true;};
 let goal=end;
 if(!clear(end)){
  if(!p.walkGoal||Math.hypot(p.walkGoal.x-end.x,p.walkGoal.z-end.z)>1.5||!p.walkPath?.length){p.walkPath=findPath(nav,p,end,.22);p.walkGoal={...end};}
  while(p.walkPath&&p.walkPath.length>1&&Math.hypot(p.walkPath[0].x-p.x,p.walkPath[0].z-p.z)<.2)p.walkPath.shift();
  goal=p.walkPath?.[0]??end;
 }else {p.walkPath=undefined;p.walkGoal=undefined;}
 const distance=Math.hypot(goal.x-p.x,goal.z-p.z),limit=config.teleportDistance*.75;
 const next=distance>limit?{x:p.x+(goal.x-p.x)*limit/distance,z:p.z+(goal.z-p.z)*limit/distance}:goal;
 const before={x:p.x,z:p.z};stepSoldier(p,next,heading,speed,phase,dt,false);
 if(!nav.isWalkableWorld(p.x,p.z,.22)){p.x=before.x;p.z=before.z;p.speed=0;p.walkPath=undefined;}
}

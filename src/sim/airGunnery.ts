import rules from '../data/air-gunnery.json';
import type {Entity,WeaponSpec} from './types';
import {SIM_STEP} from './constants';
/** Aircraft fixed cannons never inherit a ground vehicle's virtual turret. */
export function fixedAirGun(u:Entity,spec:WeaponSpec):boolean {return u.def.category==='air'&&spec.flight==='direct'&&(spec.weapon==='cannon'||spec.weapon==='bullet');}
export function noseDirection(u:Entity):{x:number;y:number;z:number} {
 const pitch=u.flightPitch??0,c=Math.cos(pitch);return {x:Math.sin(u.heading)*c,y:-Math.sin(pitch),z:Math.cos(u.heading)*c};
}
/** One 3D lead solution for the firing gate and actual projectile, including muzzle offset. */
export function airGunSolution(u:Entity,t:Entity,spec:WeaponSpec){
 const scale=u.def.modelScale??1,origin={x:u.x+Math.sin(u.heading)*spec.muzzle*scale+Math.cos(u.heading)*(spec.muzzleSide??0)*scale,y:u.y+spec.muzzleHeight*scale,z:u.z+Math.cos(u.heading)*spec.muzzle*scale-Math.sin(u.heading)*(spec.muzzleSide??0)*scale};
 const tx=t.x,ty=t.y+t.def.height*.45,tz=t.z,dx=tx-origin.x,dy=ty-origin.y,dz=tz-origin.z;
 const vx=t.flightVx??Math.sin(t.heading)*(t.motionSpeed??0)*(t.motionReverse?-1:1),vz=t.flightVz??Math.cos(t.heading)*(t.motionSpeed??0)*(t.motionReverse?-1:1),vy=t.py==null?0:(t.y-t.py)/SIM_STEP;
 const a=vx*vx+vy*vy+vz*vz-spec.speed*spec.speed,b=2*(dx*vx+dy*vy+dz*vz),c=dx*dx+dy*dy+dz*dz,disc=b*b-4*a*c;
 let time=Math.sqrt(c)/Math.max(1,spec.speed);
 if(Math.abs(a)>.001&&disc>=0){const root=Math.sqrt(disc),roots=[(-b-root)/(2*a),(-b+root)/(2*a)].filter(n=>n>=0);if(roots.length)time=Math.min(...roots);}
 time=Math.min(rules.maximumLeadSeconds,time);
 const point={x:tx+vx*time,y:ty+vy*time,z:tz+vz*time},ax=point.x-origin.x,ay=point.y-origin.y,az=point.z-origin.z,length=Math.hypot(ax,ay,az)||1,nose=noseDirection(u);
 return {point,origin,time,alignment:(ax*nose.x+ay*nose.y+az*nose.z)/length};
}
export function airGunAligned(u:Entity,t:Entity,spec:WeaponSpec):boolean {return airGunSolution(u,t,spec).alignment>=Math.cos(rules.halfAngle);}
export function airGunRecovering(u:Entity,time:number):boolean {return !!u.airGunBurst&&time>=u.airGunBurst.until&&time<u.airGunBurst.readyAt;}
export function recordAirGunShot(u:Entity,time:number):void {
 if(!u.airGunBurst||time>=u.airGunBurst.readyAt)u.airGunBurst={until:time+rules.burstSeconds,readyAt:time+rules.burstSeconds+rules.pauseSeconds};
}
/** Cap dispersion to the fixed barrel's cone; even a miss cannot shoot sideways/backwards. */
export function constrainAirGunDirection(u:Entity,x:number,y:number,z:number):{x:number;y:number;z:number} {
 const length=Math.hypot(x,y,z)||1,dx=x/length,dy=y/length,dz=z/length,n=noseDirection(u),dot=dx*n.x+dy*n.y+dz*n.z;
 if(dot>=Math.cos(rules.halfAngle))return {x:dx,y:dy,z:dz};
 const tx=dx-n.x*dot,ty=dy-n.y*dot,tz=dz-n.z*dot,tangent=Math.hypot(tx,ty,tz);
 if(tangent<.00001)return n;
 const side=Math.sin(rules.halfAngle)/tangent,forward=Math.cos(rules.halfAngle);return {x:n.x*forward+tx*side,y:n.y*forward+ty*side,z:n.z*forward+tz*side};
}

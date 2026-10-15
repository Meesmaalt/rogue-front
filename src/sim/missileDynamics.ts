import type {Projectile,Entity} from './types';
import physics from '../data/physics.json';
/** A sampled seeker tracks predicted motion with a launch-seeded bias, never a fresh RNG roll. */
export function missileTrackingPoint(p:Projectile,t:Entity):{x:number;y:number;z:number} {
 const eta=Math.min(physics.missiles.maximumLeadSeconds,Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z)/Math.max(1,p.speed));
 const speed=(t.motionSpeed??0)*(t.motionReverse?-1:1),vx=t.flightVx??Math.sin(t.heading)*speed,vz=t.flightVz??Math.cos(t.heading)*speed;
 return {x:t.x+vx*eta+(p.missX??0),y:t.y+t.def.height*.45,z:t.z+vz*eta+(p.missZ??0)};
}
/** Finite thrust, aerodynamic drag, gravity and bounded normal acceleration. */
export function stepMissile(p:Projectile,dx:number,dy:number,dz:number,dt:number):void {
 const speed=Math.hypot(p.vx,p.vy,p.vz)||.001,d=Math.hypot(dx,dy,dz)||.001;
 let ux=p.vx/speed,uy=p.vy/speed,uz=p.vz/speed;
 const dot=Math.max(-1,Math.min(1,(ux*dx+uy*dy+uz*dz)/d)),angle=Math.acos(dot);
 const boosting=(p.age??0)<(p.boostTime??0);
 if(!boosting&&(p.age??0)>physics.missiles.seekerDelay&&(p.age??0)>(p.boostTime??0)+physics.missiles.seekerDelay&&angle>(p.seekerAngle??physics.missiles.seekerAngle))p.guidanceLost=true;
 let turn=0;
 if(!p.guidanceLost){
  const quality=Math.max(physics.minimumGuidanceQuality,p.hitChance??1);
  turn=Math.min(angle,(p.turnRate??3.2)*quality*dt,(p.lateralAcceleration??physics.missiles.lateralAcceleration)*quality/speed*dt);
  if(angle>1e-8&&turn>0){
   // Tangent basis gives the exact angular step, including the antiparallel case.
   let tx=dx/d-ux*dot,ty=dy/d-uy*dot,tz=dz/d-uz*dot,length=Math.hypot(tx,ty,tz);
   if(length<1e-8){tx=-uz;ty=0;tz=ux;length=Math.hypot(tx,tz);if(length<1e-8){tx=1;length=1;}}
   const c=Math.cos(turn),s=Math.sin(turn);ux=ux*c+tx/length*s;uy=uy*c+ty/length*s;uz=uz*c+tz/length*s;
  }
 }
 const powered=(p.age??0)<(p.motorTime??physics.missiles.motorSeconds);
 const thrust=powered?(p.acceleration??0):0,drag=(p.drag??physics.missiles.drag)*speed*speed;
 const next=Math.max(0,Math.min(powered?p.maxSpeed??Infinity:Infinity,speed+(thrust-drag)*dt-speed*turn*physics.missiles.turnEnergyLoss));
 p.vx=ux*next;p.vy=uy*next-physics.gravity*dt;p.vz=uz*next;p.speed=Math.hypot(p.vx,p.vy,p.vz);
}

import expansion from "../../data/expansion.json";
import {strategicImpact} from "../strategicWeapons";
import {stepMissile,missileTrackingPoint} from "../missileDynamics";
import physics from "../../data/physics.json";
import {equipmentModule} from "../equipment";
import {impactGarrisonBuildings,GARRISON_RULES} from "../garrison";
import type { World } from "../World";
import type { Projectile,Entity } from "../types";
import { heightAt } from "../heightmap";
import {pointInFeature,featureBlocksMovement} from "../mapFeatures";
import { damage, hitFace,armorValue,weaponDamageMultiplier,penetrationFactor } from "./combat";

/** First segment entry into an axis-aligned ellipsoid; Infinity means no contact. */
export function segmentBodyEntry(ax:number,ay:number,az:number,bx:number,by:number,bz:number,cx:number,cy:number,cz:number,radius:number,verticalRadius=radius):number {
  const x=(ax-cx)/radius,y=(ay-cy)/verticalRadius,z=(az-cz)/radius;
  const dx=(bx-ax)/radius,dy=(by-ay)/verticalRadius,dz=(bz-az)/radius;
  const c=x*x+y*y+z*z-1;if(c<=0)return 0;
  const a=dx*dx+dy*dy+dz*dz;if(a<=1e-12)return Infinity;
  const b=x*dx+y*dy+z*dz,disc=b*b-a*c;if(disc<0)return Infinity;
  const t=(-b-Math.sqrt(disc))/a;return t>=0&&t<=1?t:Infinity;
}
function blocked(w:World,obstacles:readonly Entity[],p:Projectile,x:number,y:number,z:number):boolean {
  if(y<=heightAt(x,z)+.12)return true;
  for(const f of w.terrain.coverFeaturesAt(x,z))if(f.kind!=="water"&&featureBlocksMovement(f)&&pointInFeature(x,z,f)&&y<heightAt(x,z)+(f.kind==="building"&&(w.infrastructureDamage.get(f.id)??0)>=1?GARRISON_RULES.rubbleHeight:f.height??3))return true;
  for(const e of obstacles)if(!(w.platformRosterOnly&&e.team!==p.team)&&!e.dead&&e.def.speed===0&&e.id!==p.sourceId&&e!==p.target&&Math.hypot(e.x-x,e.z-z)<e.def.radius&&y<e.y+e.def.height)return true;
  return false;
}
function penetrationMultiplier(p:Projectile,e:Entity):number {
  const armor=armorValue(e,hitFace(p.x-p.vx,p.z-p.vz,e));
  const mult=penetrationFactor(p.warhead??"he",p.penetration??0,armor,e.def.category==="infantry"||e.def.armor==="air",Math.hypot(p.x-(p.launchX??p.x),p.z-(p.launchZ??p.z)),e.def);
  return mult*(p.warhead==="heat"?1-(equipmentModule(e,"protection")?.heatProtection??0):1);

}
function impact(w:World,p:Projectile,terrain:boolean):void {
  if(p.strategicPayload){strategicImpact(w,p);return;}
  const opts={weapon:p.weapon,fromX:p.x-p.vx,fromZ:p.z-p.vz,sourceId:p.sourceId,penetration:p.penetration,suppressionPower:p.suppressionPower};
  let result:"penetration"|"ricochet"|"ground"|"airburst"|"miss"=terrain?"ground":"miss";
  impactGarrisonBuildings(w,p,(u,amount)=>damage(w,u,amount,opts));
  const target=p.target;
  let hit:Entity|null=null;
  if(!terrain&&target&&!target.dead&&Math.hypot(target.x-p.x,target.z-p.z)<=target.def.radius+1&&Math.abs(target.y+target.def.height*.45-p.y)<Math.max(2,target.def.height*.6)&&(w.platformRosterOnly||(p.hitRoll??0)<=(p.hitChance??1))){
    const mult=penetrationMultiplier(p,target);hit=target;result=mult>0?"penetration":"ricochet";
    if(mult>0)damage(w,target,(p.impactDamage??p.damage)*mult,opts);
    else {target.suppression=Math.min(100,(target.suppression??0)+4);target.morale=Math.max(0,(target.morale??100)-1);}
    if(target.def.armor==="air")result="airburst";
  }
  const splash=p.warhead==="kinetic"?0:p.splash??0;
  if(p.warhead==="he")w.terrain.ignite(p.x,p.z,p.y,p.damage,splash);
  if(splash>0){
    w.spatial.queryRadius(p.x,p.z,splash+6,e=>{
      if(e.dead||e===hit||e.team===p.team||e.loadedIntoId!=null)return;
      const dy=Math.abs(e.y+e.def.height*.45-p.y),d=Math.hypot(e.x-p.x,e.z-p.z);
      if(d> splash+e.def.radius*.4||dy>Math.max(4,splash))return;
      // High explosions do not magically damage ground troops below aircraft.
      const falloff=Math.max(.1,1-d/Math.max(1,splash));
      damage(w,e,p.damage*weaponDamageMultiplier(p.weapon??"cannon",e.def.armor)*falloff*penetrationMultiplier(p,e),opts);
    });
  }
  // Near misses suppress without inventing a penetration or HP hit.
  w.spatial.queryRadius(p.x,p.z,Math.max(2,splash+3),e=>{
    if(e.dead||e===hit||e.team===p.team||e.loadedIntoId!=null||Math.abs(e.y-p.y)>Math.max(4,splash))return;
    e.suppression=Math.min(100,(e.suppression??0)+(p.weapon==="bullet"?1.4:4)*(p.suppressionPower??1));
  });
  w.events.push({type:"impact",x:p.x,y:p.y,z:p.z,weapon:p.weapon??"cannon",visual:p.visual,result,size:splash});
  const shooter=w.byId.get(p.sourceId);
  if(shooter&&hit?.dead){shooter.xp++;shooter.veteran=Math.min(5,Math.floor(shooter.xp/2));shooter.morale=Math.min(100,(shooter.morale??100)+4);}
}
export function updateProjectiles(w:World,dt:number):void {
  if(!w.projectiles.length)return;
  const obstacles=w.entities.filter(e=>!e.dead&&e.def.speed===0);
  for(let i=w.projectiles.length-1;i>=0;i--){
    const p=w.projectiles[i];p.px=p.x;p.py=p.y;p.pz=p.z;p.age=(p.age??0)+dt;
    if(p.age>(p.lifetime??16)){w.projectiles.splice(i,1);continue;}
    const guided=(p.flight??(p.weapon==="missile"?"guided":"direct"))==="guided";
    const ballistic=p.flight==="ballistic",physicalMissile=guided&&p.motorTime!=null;
    if(guided&&!p.guidanceLost){
      const source=w.byId.get(p.sourceId),t=p.target;
      if(p.pointGuidance&&!t){/* Coordinate guidance has no entity lock to lose. */}
      else if(!t||t.dead||(p.profile==='anti-radiation'&&(t.disabledUntil??0)>w.time)||(p.guidance==="command"&&(!source||source.dead||(source.suppression??0)>85||!w.isSpottedByTeam(t,p.team)||!w.vision.hasLineOfSight(source,t))))p.guidanceLost=true;
      else {
        if(physicalMissile){if(p.age>=(p.nextGuidanceAt??0)){const aim=missileTrackingPoint(p,t);p.tx=aim.x;p.tz=aim.z;p.aimY=aim.y;p.nextGuidanceAt=p.age+physics.missiles.guidanceInterval;}}
        else {const miss=!w.platformRosterOnly&&(p.hitRoll??0)>(p.hitChance??1);
        p.tx=t.x+(miss?p.missX??0:0);p.tz=t.z+(miss?p.missZ??0:0);p.aimY=t.y+t.def.height*.45;}
      }
    }
    let ty=p.aimY??heightAt(p.tx,p.tz)+.15;
    const horizontal=Math.hypot(p.tx-p.x,p.tz-p.z);
    if(p.cruiseAltitude){
      const cruise=Math.max(ty,heightAt(p.x,p.z)+p.cruiseAltitude,w.waterNav.surfaceAt(p.x,p.z)+p.cruiseAltitude);
      const blend=p.pointGuidance?Math.min(1,horizontal/expansion.strategic.terminalDescentDistance):Math.max(0,Math.min(1,(horizontal-10)/35));ty+=(cruise-ty)*blend;
    }
    if(p.visual==="torpedo")ty=w.waterNav.surfaceAt(p.tx,p.tz)+.2;
    if(p.age<(p.boostTime??0))ty=Math.max(ty,p.y+30);
    const boost=p.age<(p.boostTime??0);
    const dx=boost?0:p.tx-p.x,dy=ty-p.y,dz=boost?0:p.tz-p.z,d=Math.hypot(dx,dy,dz)||.001;
    if(physicalMissile)stepMissile(p,dx,dy,dz,dt);
    else if(guided){
      p.speed=Math.min(p.maxSpeed??p.speed,p.speed+(p.acceleration??0)*dt);
      if(!p.guidanceLost){
        const old=Math.hypot(p.vx,p.vy,p.vz)||1,dot=Math.max(-1,Math.min(1,(p.vx*dx+p.vy*dy+p.vz*dz)/(old*d))),angle=Math.acos(dot),blend=Math.min(1,(p.turnRate??3.2)*(w.platformRosterOnly?Math.max(physics.minimumGuidanceQuality,p.hitChance??1):1)*dt/Math.max(.001,angle));
        let vx=p.vx/old*(1-blend)+dx/d*blend,vy=p.vy/old*(1-blend)+dy/d*blend,vz=p.vz/old*(1-blend)+dz/d*blend,len=Math.hypot(vx,vy,vz)||1;
        p.vx=vx/len*p.speed;p.vy=vy/len*p.speed;p.vz=vz/len*p.speed;
      }else {const old=Math.hypot(p.vx,p.vy,p.vz)||1;p.vx=p.vx/old*p.speed;p.vy=p.vy/old*p.speed;p.vz=p.vz/old*p.speed;}
    }
    const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt-(ballistic?.5*(p.gravity??0)*dt*dt:0),nz=p.z+p.vz*dt;
    if(ballistic)p.vy-=(p.gravity??0)*dt;
    const steps=Math.max(1,Math.ceil(Math.hypot(nx-p.x,ny-p.y,nz-p.z)/2));let terrain=false,terrainT=Infinity;
    for(let j=1;j<=steps;j++){const t=j/steps,x=p.px+(nx-p.px)*t,y=p.py+(ny-p.py)*t,z=p.pz+(nz-p.pz)*t;if(blocked(w,obstacles,p,x,y,z)){p.x=x;p.y=Math.max(heightAt(x,z)+.12,y);p.z=z;terrain=true;terrainT=t;break;}}
    if(!terrain){p.x=nx;p.y=ny;p.z=nz;}
    let crossed=false;
    if(w.platformRosterOnly){
      const dx=nx-p.px,dy=ny-p.py,dz=nz-p.pz;let first=terrainT,victim:Entity|null=null;
      w.spatial.queryRadius((nx+p.px)/2,(nz+p.pz)/2,Math.hypot(dx,dz)/2+physics.collisionSearchPadding,e=>{
        if(e.dead||e.team===p.team||e.loadedIntoId!=null||e.id===p.sourceId)return;
        const t=segmentBodyEntry(p.px!,p.py!,p.pz!,nx,ny,nz,e.x,e.y+e.def.height*.45,e.z,Math.max(.5,e.def.radius),Math.max(2,e.def.height*.6));
        if(t<first){first=t;victim=e;}
      });
      const protectedTarget=p.target;
      if(p.weapon==='missile'&&p.warhead==='heat'&&protectedTarget&&!protectedTarget.dead&&protectedTarget.team!==p.team&&(protectedTarget.equipmentCharges??0)>=1&&equipmentModule(protectedTarget,'protection')?.interceptCharges){
        const t=segmentBodyEntry(p.px,p.py,p.pz,nx,ny,nz,protectedTarget.x,protectedTarget.y+1,protectedTarget.z,protectedTarget.def.radius+physics.activeProtectionRadius);
        if(t<terrainT&&t<=first){
          protectedTarget.equipmentCharges=(protectedTarget.equipmentCharges??0)-1;
          w.events.push({type:'impact',x:p.px+dx*t,y:p.py+dy*t,z:p.pz+dz*t,weapon:p.weapon,visual:p.visual,result:'intercept',size:1});w.projectiles.splice(i,1);continue;
        }
      }
      if(victim){p.target=victim;p.x=p.px+dx*first;p.y=p.py+dy*first;p.z=p.pz+dz*first;crossed=true;terrain=false;}
    }
    if(!w.platformRosterOnly&&!crossed&&!terrain&&p.target&&!p.target.dead){const target=p.target,dx=nx-p.px,dy=ny-p.py,dz=nz-p.pz,len=dx*dx+dy*dy+dz*dz||1;
      const t=Math.max(0,Math.min(1,((target.x-p.px)*dx+(target.y+target.def.height*.45-p.py)*dy+(target.z-p.pz)*dz)/len));
      const x=p.px+dx*t,y=p.py+dy*t,z=p.pz+dz*t;
      crossed=Math.hypot(target.x-x,target.y+target.def.height*.45-y,target.z-z)<=Math.max(.5,target.def.radius);
      if(crossed){p.x=x;p.y=y;p.z=z;}
    }
    const arrived=!physicalMissile&&!p.guidanceLost&&(ballistic?(p.age>=(p.flightTime??1)):d<=p.speed*dt+.25&&(!guided||p.vx*dx+p.vy*dy+p.vz*dz>0));
    if(terrain||arrived||crossed){if(arrived&&!terrain&&!crossed){p.x=p.tx;p.y=ty;p.z=p.tz;}impact(w,p,terrain);w.projectiles.splice(i,1);}
  }
}

import {impactGarrisonBuildings,GARRISON_RULES} from "../garrison";
import type { World } from "../World";
import type { Projectile,Entity } from "../types";
import { heightAt } from "../heightmap";
import {pointInFeature,featureBlocksMovement} from "../mapFeatures";
import { damage, hitFace,armorValue,weaponDamageMultiplier,penetrationFactor } from "./combat";

function blocked(w:World,p:Projectile,x:number,y:number,z:number):boolean {
  if(y<=heightAt(x,z)+.12)return true;
  for(const f of w.mapFeatures)if(f.kind!=="water"&&featureBlocksMovement(f)&&pointInFeature(x,z,f)&&y<heightAt(x,z)+(f.kind==="building"&&(w.infrastructureDamage.get(f.id)??0)>=1?GARRISON_RULES.rubbleHeight:f.height??3))return true;
  for(const e of w.entities)if(!e.dead&&e.def.speed===0&&e.id!==p.sourceId&&e!==p.target&&Math.hypot(e.x-x,e.z-z)<e.def.radius&&y<e.y+e.def.height)return true;
  return false;
}
function penetrationMultiplier(p:Projectile,e:Entity):number {
  const armor=armorValue(e,hitFace(p.launchX??p.x,p.launchZ??p.z,e));
  return penetrationFactor(p.warhead??"he",p.penetration??0,armor,e.def.category==="infantry"||e.def.armor==="air",Math.hypot(p.x-(p.launchX??p.x),p.z-(p.launchZ??p.z)));

}
function impact(w:World,p:Projectile,terrain:boolean):void {
  const opts={weapon:p.weapon,fromX:p.launchX??p.x,fromZ:p.launchZ??p.z,sourceId:p.sourceId,penetration:p.penetration,suppressionPower:p.suppressionPower};
  let result:"penetration"|"ricochet"|"ground"|"airburst"|"miss"=terrain?"ground":"miss";
  impactGarrisonBuildings(w,p,(u,amount)=>damage(w,u,amount,opts));
  const target=p.target;
  let hit:Entity|null=null;
  if(!terrain&&target&&!target.dead&&Math.hypot(target.x-p.x,target.z-p.z)<=target.def.radius+1&&Math.abs(target.y+target.def.height*.45-p.y)<Math.max(2,target.def.height*.6)&&(p.hitRoll??0)<=(p.hitChance??1)){
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
  for(let i=w.projectiles.length-1;i>=0;i--){
    const p=w.projectiles[i];p.px=p.x;p.py=p.y;p.pz=p.z;p.age=(p.age??0)+dt;
    if(p.age>(p.lifetime??16)){w.projectiles.splice(i,1);continue;}
    const guided=(p.flight??(p.weapon==="missile"?"guided":"direct"))==="guided";
    const ballistic=p.flight==="ballistic";
    if(guided&&!p.guidanceLost){
      const source=w.byId.get(p.sourceId),t=p.target;
      if(!t||t.dead||(p.guidance==="command"&&(!source||source.dead||(source.suppression??0)>85||!w.isSpottedByTeam(t,p.team)||!w.vision.hasLineOfSight(source,t))))p.guidanceLost=true;
      else {
        const miss=(p.hitRoll??0)>(p.hitChance??1);
        p.tx=t.x+(miss?p.missX??0:0);p.tz=t.z+(miss?p.missZ??0:0);p.aimY=t.y+t.def.height*.45;
      }
    }
    let ty=p.aimY??heightAt(p.tx,p.tz)+.15;
    const horizontal=Math.hypot(p.tx-p.x,p.tz-p.z);
    if(p.cruiseAltitude&&horizontal>25)ty=Math.max(ty,heightAt(p.x,p.z)+p.cruiseAltitude,w.waterNav.surfaceAt(p.x,p.z)+p.cruiseAltitude);
    if(p.visual==="torpedo")ty=w.waterNav.surfaceAt(p.tx,p.tz)+.2;
    if(p.age<(p.boostTime??0))ty=Math.max(ty,p.y+30);
    const dx=p.tx-p.x,dy=ty-p.y,dz=p.tz-p.z,d=Math.hypot(dx,dy,dz)||.001;
    if(guided){
      p.speed=Math.min(p.maxSpeed??p.speed,p.speed+(p.acceleration??0)*dt);
      if(!p.guidanceLost){
        const old=Math.hypot(p.vx,p.vy,p.vz)||1,dot=Math.max(-1,Math.min(1,(p.vx*dx+p.vy*dy+p.vz*dz)/(old*d))),angle=Math.acos(dot),blend=Math.min(1,(p.turnRate??3.2)*dt/Math.max(.001,angle));
        let vx=p.vx/old*(1-blend)+dx/d*blend,vy=p.vy/old*(1-blend)+dy/d*blend,vz=p.vz/old*(1-blend)+dz/d*blend,len=Math.hypot(vx,vy,vz)||1;
        p.vx=vx/len*p.speed;p.vy=vy/len*p.speed;p.vz=vz/len*p.speed;
      }else {const old=Math.hypot(p.vx,p.vy,p.vz)||1;p.vx=p.vx/old*p.speed;p.vy=p.vy/old*p.speed;p.vz=p.vz/old*p.speed;}
    }
    const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt-(ballistic?.5*(p.gravity??0)*dt*dt:0),nz=p.z+p.vz*dt;
    if(ballistic)p.vy-=(p.gravity??0)*dt;
    const steps=Math.max(1,Math.ceil(Math.hypot(nx-p.x,ny-p.y,nz-p.z)/2));let terrain=false;
    for(let j=1;j<=steps;j++){const t=j/steps,x=p.px+(nx-p.px)*t,y=p.py+(ny-p.py)*t,z=p.pz+(nz-p.pz)*t;if(blocked(w,p,x,y,z)){p.x=x;p.y=Math.max(heightAt(x,z)+.12,y);p.z=z;terrain=true;break;}}
    if(!terrain){p.x=nx;p.y=ny;p.z=nz;}
    let crossed=false;
    if(!terrain&&p.target&&!p.target.dead){const target=p.target,dx=nx-p.px,dy=ny-p.py,dz=nz-p.pz,len=dx*dx+dy*dy+dz*dz||1;
      const t=Math.max(0,Math.min(1,((target.x-p.px)*dx+(target.y+target.def.height*.45-p.py)*dy+(target.z-p.pz)*dz)/len));
      const x=p.px+dx*t,y=p.py+dy*t,z=p.pz+dz*t;
      crossed=Math.hypot(target.x-x,target.y+target.def.height*.45-y,target.z-z)<=Math.max(.5,target.def.radius);
      if(crossed){p.x=x;p.y=y;p.z=z;}
    }
    const arrived=!p.guidanceLost&&(ballistic?(p.age>=(p.flightTime??1)):d<=p.speed*dt+.25);
    if(terrain||arrived||crossed){if(arrived&&!terrain&&!crossed){p.x=p.tx;p.y=ty;p.z=p.tz;}impact(w,p,terrain);w.projectiles.splice(i,1);}
  }
}

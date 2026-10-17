import type {World} from './World';
import type {Entity,Projectile,StrategicPayload,Team} from './types';
import data from '../data/expansion.json';
import physics from '../data/physics.json';
import {heightAt} from './heightmap';
import {damage} from './systems/combat';
const cfg=data.strategic;
export function strategicKinds(u:Entity):StrategicPayload[] {return u.kind==='cruiseLauncher'?['cruise']:u.kind==='icbmSilo'?['icbm','nuclear']:[];}
export function nuclearResearchAvailable(w:World,team:Team):boolean {return w.entities.some(e=>!e.dead&&e.team===team&&e.kind==='missileCommand'&&e.nuclearUnlocked);}
function operation(w:World,u:Entity):string {
 if(u.dead||u.underConstruction||(u.disabledUntil??0)>w.time)return 'Rajatis või heitja pole valmis';
 if(!w.hasBuilding(u.team,'missileCommand'))return 'Vajab raketiarenduskeskust';
 if(!w.hasCommandLink(u)||w.powerStatus(u.team).ratio<.25)return 'Vajab energiat ja juhtimisühendust';
 const depot=w.nearestSupplyDepot(u.team,u,true,true);if(!depot||depot.kind!=='supply'||Math.hypot(u.x-depot.x,u.z-depot.z)>cfg.productionRadius)return 'Vajab lähedast ühendatud varustusladu';return '';
}
export function strategicBuildStatus(w:World,u:Entity,payload:StrategicPayload|'research'):{reason:string;cost:number;seconds:number} {
 const item=payload==='research'?cfg.research:cfg.payloads[payload],cost=item?.cost??0,seconds=item?.seconds??0;
 let reason=operation(w,u);
 if(!item)reason='Tundmatu raketikoorem';
 else if(u.strategicWork)reason='Valmistamine on pooleli';
 else if(payload==='research'){
  if(u.kind!=='missileCommand')reason='Uurimine käib raketiarenduskeskuses';
  else if(nuclearResearchAvailable(w,u.team))reason='Tuumatehnoloogia uuritud';
  else if(w.producerLevel(u)<cfg.research.level||!w.hasBuilding(u.team,'airStrategy')||!w.hasBuilding(u.team,'radar'))reason='Vajab raketikeskuse 3. taset, õhustrateegia keskust ja radarit';
 }else if(!strategicKinds(u).includes(payload))reason='Sobimatu raketiheitja';
 else if(payload==='nuclear'&&!nuclearResearchAvailable(w,u.team))reason='Vajab tuumatehnoloogia uurimist';
 else if((u.strategicAmmo?.[payload]??0)>=cfg.payloads[payload].capacity)reason='Raketivaru täis';
 if(!reason&&Math.min(w.teamCredits[u.team],w.teamResources[u.team])<cost)reason='Raha või materjale ei jätku';
 return {reason,cost,seconds};
}
export function beginStrategicBuild(w:World,id:number,payload:StrategicPayload|'research',team:Team):boolean {
 const u=w.byId.get(id);if(!u||u.team!==team)return false;
 const status=strategicBuildStatus(w,u,payload);if(status.reason){reject(w,u,status.reason);return false;}
 w.teamCredits[team]-=status.cost;w.teamResources[team]-=status.cost;if(team===w.playerTeam){w.credits=w.teamCredits[team];w.resources=w.teamResources[team];}
 u.strategicWork={payload,progress:0};return true;
}
function reject(w:World,u:Entity,message:string):void {w.events.push({type:'order-rejected',team:u.team,unitId:u.id,x:u.x,z:u.z,message});}
export function updateStrategicWeapons(w:World,dt:number):void {
 for(const u of w.entities){if(!u.strategicWork||operation(w,u))continue;
  const task=u.strategicWork,item=task.payload==='research'?cfg.research:cfg.payloads[task.payload];task.progress+=dt;
  if(task.progress<item.seconds)continue;
  if(task.payload==='research')u.nuclearUnlocked=true;else {u.strategicAmmo??={};u.strategicAmmo[task.payload]=(u.strategicAmmo[task.payload]??0)+1;}
  u.strategicWork=undefined;w.events.push({type:'build-complete',team:u.team,x:u.x,y:u.y,z:u.z,kind:u.kind});
 }
}
export function strategicStrike(w:World,ids:number[],payload:StrategicPayload,x:number,z:number,team:Team):void {
 if(!Object.hasOwn(cfg.payloads,payload)||!Number.isFinite(x)||!Number.isFinite(z)||Math.max(Math.abs(x),Math.abs(z))>w.mapSize/2)return;
 const item=cfg.payloads[payload];
 for(const id of ids){const u=w.byId.get(id);if(!u||u.dead||u.team!==team||!strategicKinds(u).includes(payload))continue;
  let reason=operation(w,u),distance=Math.hypot(x-u.x,z-u.z);
  if((u.strategicAmmo?.[payload]??0)<1)reason='Valmista kõigepealt rakett';
  else if((u.motionSpeed??0)>cfg.launcherStationarySpeed)reason='Peata heitja enne laskmist';
  else if((u.strategicCooldownUntil??0)>w.time)reason='Heitja valmistub järgmiseks stardiks';
  else if(distance<item.minimumRange||distance>item.range)reason='Sihtpunkt väljaspool strateegilise relva ulatust';
  if(reason){reject(w,u,reason);continue;}
  const angle=w.rng()*Math.PI*2,r=Math.sqrt(w.rng())*item.scatter,tx=x+Math.cos(angle)*r,tz=z+Math.sin(angle)*r,ty=heightAt(tx,tz)+.2,y=u.y+item.launchHeight,time=item.flightSeconds;
  const cruise=payload==='cruise',dx=tx-u.x,dz=tz-u.z,len=Math.hypot(dx,dz)||1;
  const p:Projectile={id:w.nextId++,team,x:u.x,y,z:u.z,px:u.x,py:y,pz:u.z,vx:cruise?dx/len*item.launchSpeed:dx/time,vy:cruise?cfg.payloads.cruise.launchVerticalSpeed:(ty-y+.5*physics.gravity*time*time)/time,vz:cruise?dz/len*item.launchSpeed:dz/time,tx,tz,aimY:ty,target:null,sourceId:u.id,damage:item.damage,impactDamage:item.damage,speed:cruise?item.launchSpeed:Math.hypot(dx/time,dz/time),splash:item.radius,weapon:'missile',visual:payload==='nuclear'?'nuclear':payload==='icbm'?'icbm':'cruise',profile:'cruise',flight:cruise?'guided':'ballistic',guidance:'none',gravity:physics.gravity,flightTime:time,age:0,lifetime:cruise?Math.max(30,distance/item.speed+15):time+4,warhead:'he',strategicPayload:payload,launchX:u.x,launchZ:u.z,hitChance:1,hitRoll:0};
  if(cruise){p.pointGuidance=true;const flight=cfg.payloads.cruise;p.motorTime=flight.motorSeconds;p.maxSpeed=item.speed;p.acceleration=flight.acceleration;p.turnRate=flight.turnRate;p.lateralAcceleration=flight.lateralAcceleration;p.drag=flight.drag;p.seekerAngle=Math.PI;p.cruiseAltitude=item.cruiseAltitude;p.boostTime=flight.boostSeconds;}
  w.projectiles.push(p);u.strategicAmmo![payload]!--;u.strategicCooldownUntil=w.time+cfg.postLaunchCooldown;u.dest=null;u.mode='idle';
  w.events.push({type:'fire',team,x:u.x,y,z:u.z,sourceId:u.id,weapon:'missile',visual:p.visual,dx:0,dy:1,dz:0});
  w.events.push({type:'strategic-launch',team,x:u.x,z:u.z,payload});
 }
}
/** Strategic warheads use one geometric blast with friendly fire for nuclear payloads. */
export function strategicImpact(w:World,p:Projectile):void {
 const payload=p.strategicPayload;if(!payload)return;const item=cfg.payloads[payload];
 for(const e of [...w.entities]){if(e.dead||e.loadedIntoId!=null||payload!=='nuclear'&&w.areAllies(e.team,p.team))continue;
  const distance=Math.hypot(e.x-p.x,e.y-p.y,e.z-p.z);if(distance>item.radius+e.def.radius)continue;
  damage(w,e,item.damage*Math.max(.05,1-distance/(item.radius+e.def.radius)),{weapon:'missile',fromX:p.launchX,fromZ:p.launchZ,sourceId:p.sourceId,penetration:100,suppressionPower:10});
 }
 for(const f of w.mapFeatures)if(f.kind==='building'&&Math.hypot(f.x-p.x,f.z-p.z)<item.radius)w.infrastructureDamage.set(f.id,1);
 w.terrain.ignite(p.x,p.z,p.y,item.damage,item.radius);w.events.push({type:'impact',x:p.x,y:p.y,z:p.z,weapon:'missile',visual:p.visual,result:'ground',size:item.radius});
}

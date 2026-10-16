import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases,heightAt} from './heightmap';
import {airGunAligned,airGunSolution,noseDirection,airGunRecovering,recordAirGunShot} from './airGunnery';
import {weaponSpec,weaponFireBlocker,weaponMuzzle,fireProjectile,selectWeapon} from './systems/combat';
import {updateUnits} from './systems/units';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import rules from '../data/air-gunnery.json';
afterEach(resetHeightmap);
function fixture(){
 const bases=[{x:0,z:0,r:250},{x:260,z:260,r:30}];setBases(bases);const w=new World(33,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;
 const u=w.spawn('fighter',0,0,0),t=w.spawn('heli',1,0,60);u.airState=t.airState='airborne';u.y=t.y=heightAt(0,0)+80;u.py=u.y;t.py=t.y;u.heading=0;t.spottedUntil[0]=999;t.standingOrder='holdfire';u.cooldown=99;
 const slot=u.def.weapons!.findIndex(s=>s.profile==='air-cannon'),spec=weaponSpec(u,slot);return {w,u,t,slot,spec};
}
it('a virtual turret can never aim an aircraft cannon sideways or backwards, while a tank turret still works',()=>{
 const {w,u,t,slot,spec}=fixture();u.heading=Math.PI;u.turretYaw=Math.PI;
 expect(weaponFireBlocker(w,u,t,slot)).toContain('lennuki nina');const muzzle=weaponMuzzle(u,spec,slot);expect(muzzle.z).toBeLessThan(u.z);
 const ammo=u.secondaryAmmo![slot];fireProjectile(w,u,t,muzzle.x,muzzle.y,muzzle.z,slot);expect(w.projectiles).toHaveLength(0);expect(u.secondaryAmmo![slot]).toBe(ammo);
 u.heading=Math.PI/2;u.turretYaw=-Math.PI/2;expect(weaponFireBlocker(w,u,t,slot)).toContain('lennuki nina');
 u.heading=0;expect(weaponFireBlocker(w,u,t,slot)).toBeNull();
 const tank=w.spawn('tank',0,0,0),enemy=w.spawn('tank',1,0,45);enemy.spottedUntil[0]=100;tank.cooldown=0;tank.heading=Math.PI;tank.turretYaw=Math.PI;expect(weaponFireBlocker(w,tank,enemy,0)).toBeNull();
});
it('the nose cone includes elevation and predicted lead rather than just a target centre on the map',()=>{
 const {u,t,spec}=fixture();expect(airGunAligned(u,t,spec)).toBe(true);
 t.y+=35;t.py=t.y;expect(airGunAligned(u,t,spec)).toBe(false);
 t.y=u.y;t.py=t.y;t.flightVx=200;expect(airGunAligned(u,t,spec)).toBe(false);expect(airGunSolution(u,t,spec).point.x).toBeGreaterThan(t.x);
 t.flightVx=0;t.y=u.y+8;t.py=t.y;u.flightPitch=-Math.atan2(t.y+t.def.height*.45-u.y-spec.muzzleHeight,t.z-spec.muzzle);expect(airGunAligned(u,t,spec)).toBe(true);
});
it('actual gun projectiles and muzzle flashes stay in the nose cone even when dispersion misses',()=>{
 const {w,u,t,slot,spec}=fixture();u.turretYaw=Math.PI;
 for(let i=0;i<12;i++){
  w.time=i*(rules.burstSeconds+rules.pauseSeconds+.1);const m=weaponMuzzle(u,spec,slot);fireProjectile(w,u,t,m.x,m.y,m.z,slot);
  const p=w.projectiles.at(-1)!,n=noseDirection(u),speed=Math.hypot(p.vx,p.vy,p.vz);expect((p.vx*n.x+p.vy*n.y+p.vz*n.z)/speed).toBeGreaterThanOrEqual(Math.cos(rules.halfAngle)-1e-8);expect(p.tz).toBeGreaterThan(p.z);
  const event=w.events.at(-1)!;expect(event.type).toBe('fire');if(event.type==='fire')expect(event.dz).toBeGreaterThan(.99);
 }
});
it('short bursts have a real pause that survives new orders and save continuation',()=>{
 const {w,u,t,slot}=fixture();recordAirGunShot(u,0);w.time=rules.burstSeconds+.01;
 expect(airGunRecovering(u,w.time)).toBe(true);expect(weaponFireBlocker(w,u,t,slot)).toBe('Kahuri valangupaus');
 w.issue({type:'stop',ids:[u.id]});w.tick(1/30);expect(airGunRecovering(u,w.time)).toBe(true);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 w.time=u.airGunBurst!.readyAt;expect(airGunRecovering(u,w.time)).toBe(false);recordAirGunShot(u,w.time);expect(u.airGunBurst!.until).toBeGreaterThan(w.time);
});
it('a blocked high-DPS cannon does not prevent a ready missile from firing in its own forward sector',()=>{
 const {w,u,t,slot}=fixture();u.cooldown=0;u.airMissileLock={targetId:t.id,readyAt:0};u.heading=.13;
 expect(weaponFireBlocker(w,u,t,slot)).toContain('lennuki nina');expect(weaponFireBlocker(w,u,t,0)).toBeNull();expect(selectWeapon(u,t,true,w)).toBe(0);
});
it('gun pursuit descends toward a helicopter and breaks away before flying through it',()=>{
 const {w,u,t}=fixture();u.airMission='cap';u.mode='attack';u.target=t;u.motionSpeed=20;u.y+=30;u.py=u.y;
 const height=u.y;for(let i=0;i<15;i++){u.py=u.y;t.py=t.y;w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(u.y).toBeLessThan(height);expect(u.turretYaw).toBe(0);
 u.x=t.x;u.z=t.z-5;u.y=t.y;u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;w.spatial.rebuild(w.entities);updateUnits(w,1/30);expect(u.flightAttackExit).toBeDefined();expect(u.flightAttackExitUntil).toBeGreaterThan(w.time);
});

it('the live firing loop keeps aircraft tracers forward and never swivels a virtual cannon turret',()=>{
 const {w,u,t}=fixture();u.mode='attack';u.target=t;u.airMission='cap';u.turretYaw=Math.PI;u.motionSpeed=10;let shots=0;
 for(let i=0;i<60;i++){
  u.py=u.y;t.py=t.y;u.pHeading=u.heading;w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);
  for(const e of w.events.splice(0))if(e.type==='fire'&&e.sourceId===u.id&&e.visual==='autocannon'){
   const n=noseDirection(u);expect(e.dx!*n.x+e.dy!*n.y+e.dz!*n.z).toBeGreaterThanOrEqual(Math.cos(rules.halfAngle)-1e-8);shots++;
  }
  expect(u.turretYaw).toBe(0);
 }
 expect(shots).toBeGreaterThan(0);expect(u.airGunBurst).toBeDefined();
});

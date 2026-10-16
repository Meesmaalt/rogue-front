import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap,heightAt} from './heightmap';
import {nearestEnemy,updateUnits} from './systems/units';
import {selectWeapon,weaponFireBlocker,fireProjectile,incomingGuidedDamage,weaponMuzzle,weaponSpec} from './systems/combat';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(129,false,[],[],bases,false);w.networkMode=true;return w;}
it('a ground vehicle fires its available cannon while its preferred stationary missile is still settling',()=>{
 const w=fixture(),u=w.spawn('ifv',0,0,0),t=w.spawn('apc',1,0,45);
 u.def={...u.def,weapons:u.def.weapons!.map((s,i)=>({...s,warhead:'he',targets:'all',accuracy:1,damage:i===0?1:10000,fireOnMove:i===0,cooldown:i===0?.2:8}))};
 u.cooldown=0;u.stationaryFireReadyAt=10;u.heading=u.turretYaw=0;t.spottedUntil[0]=100;u.mode='hold';u.holdPosition=true;u.target=t;t.standingOrder='holdfire';
 expect(selectWeapon(u,t,true)).toBe(1);expect(selectWeapon(u,t,true,w)).toBe(0);
 w.spatial.rebuild(w.entities);updateUnits(w,1/30);expect(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id&&e.weaponIndex===0)).toBe(true);
});
it('ground and air guided weapons wait for a likely lethal friendly missile, but ignore lost guidance and keep guns available',()=>{
 const w=fixture(),u=w.spawn('ifv',0,0,0),t=w.spawn('tank',1,0,50);t.spottedUntil[0]=100;u.heading=0;u.turretYaw=0;
 const slot=u.def.weapons!.findIndex(s=>s.flight==='guided');expect(slot).toBeGreaterThanOrEqual(0);
 const muzzle=weaponMuzzle(u,weaponSpec(u,slot),slot);fireProjectile(w,u,t,muzzle.x,muzzle.y,muzzle.z,slot);
 const p=w.projectiles[0];p.impactDamage=10000;p.hitChance=1;p.hitRoll=1;p.penetration=1000;u.weaponCooldowns=[];
 expect(incomingGuidedDamage(w,u,t)).toBeGreaterThan(t.hp);expect(weaponFireBlocker(w,u,t,slot)).toContain('rühma raketitabamust');
 const plane=w.spawn('fighter',0,0,-40),air=w.spawn('heli',1,0,50);plane.cooldown=0;plane.heading=0;plane.airState=air.airState='airborne';plane.y=air.y=heightAt(0,0)+60;air.spottedUntil[0]=100;plane.airMissileLock={targetId:air.id,readyAt:0};
 p.target=air;expect(weaponFireBlocker(w,plane,air,0)).toContain('rühma raketitabamust');
 p.guidanceLost=true;expect(incomingGuidedDamage(w,u,air)).toBe(0);expect(weaponFireBlocker(w,plane,air,0)).toBeNull();
});
it('automatic targeting favours an armed counter-threat over a nearby truck and spreads fire away from a covered target',()=>{
 const w=fixture(),u=w.spawn('tank',0,0,0),truck=w.spawn('logiTruck',1,0,24),threat=w.spawn('atgm',1,0,42);
 for(const t of [truck,threat])t.spottedUntil[0]=100;u.target=truck;w.spatial.rebuild(w.entities);
 expect(nearestEnemy(w,u,150)).toBe(threat);
 const ally=w.spawn('ifv',0,-10,0),slot=ally.def.weapons!.findIndex(s=>s.flight==='guided'),muzzle=weaponMuzzle(ally,weaponSpec(ally,slot),slot);
 fireProjectile(w,ally,threat,muzzle.x,muzzle.y,muzzle.z,slot);w.projectiles[0].impactDamage=10000;w.projectiles[0].hitChance=1;w.projectiles[0].penetration=1000;
 expect(nearestEnemy(w,u,150)).toBe(truck);
});
it('a traversing tank turret preserves its world bearing as the hull starts a sharp turn',()=>{
 const w=fixture(),u=w.spawn('tank',0,0,0),t=w.spawn('tank',1,0,60);
 u.def={...u.def,turnRate:20};u.cooldown=100;u.heading=u.pHeading=0;u.turretYaw=0;u.motionSpeed=.1;u.mode='move';u.dest={x:80,z:0};u.navPath=[{x:80,z:0}];u.navPathIndex=0;u.target=t;t.mode='hold';t.standingOrder='holdfire';t.spottedUntil[0]=100;
 w.spatial.rebuild(w.entities);updateUnits(w,1/30);
 expect(u.heading).toBeGreaterThan(.08);
 const bearing=Math.atan2(t.x-u.x,t.z-u.z);expect(Math.abs(u.heading+u.turretYaw-bearing)).toBeLessThan(.01);
});

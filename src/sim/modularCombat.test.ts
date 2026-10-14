import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,heightAt,setBases} from './heightmap';
import {fireProjectile,weaponSpec} from './systems/combat';
import {updateProjectiles} from './systems/projectiles';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:-170,r:180},{x:200,z:200,r:30}];setBases(bases);const w=new World(712,false,[],[],bases,false);w.networkMode=true;w.platformRosterOnly=true;return w;}
function run(w:World){w.spatial.rebuild(w.entities);for(let i=0;i<150&&w.projectiles.length;i++)updateProjectiles(w,1/30);}
it('a physical projectile hits the first enemy body along its flight, without a second RNG veto',()=>{
 const w=fixture(),a=w.spawn('tank',0,-40,-170),near=w.spawn('tank',1,-15,-170),far=w.spawn('tank',1,15,-170);
 fireProjectile(w,a,far,a.x,a.y+2,a.z);const p=w.projectiles[0];p.hitRoll=1;p.hitChance=0;
 // Aimed geometry is controlled here; the obsolete verdict must not override a real contact.
 p.tx=far.x;p.tz=far.z;p.aimY=far.y+far.def.height*.45;p.vx=p.speed;p.vz=0;p.vy=0;p.y=near.y+near.def.height*.45;
 const hp=near.hp,farHp=far.hp;run(w);expect(near.hp).toBeLessThan(hp);expect(far.hp).toBe(farHp);expect(w.projectiles).toHaveLength(0);
});
it('ballistic weapons share physical gravity, while direct fire does not acquire an artificial arc',()=>{
 const w=fixture(),a=w.spawn('artillery',0,-40,-170),t=w.spawn('tank',1,50,-170);fireProjectile(w,a,t,a.x,a.y+2,a.z);expect(w.projectiles[0].gravity).toBe(9.81);
 const tank=w.spawn('tank',0,-40,-150);fireProjectile(w,tank,t,tank.x,tank.y+2,tank.z);expect(w.projectiles.at(-1)?.gravity).toBe(weaponSpec(tank).gravity);
});
it('APS intercepts an incoming HEAT missile once; empty charges do not offer infinite protection',()=>{
 const w=fixture(),a=w.spawn('heli',0,-18,-170),t=w.spawn('tank',1,-10,-170);a.y=heightAt(a.x,a.z)+6;t.equipment={protection:'aps'};t.equipmentCharges=1;
 fireProjectile(w,a,t,a.x,a.y,a.z,0);const p=w.projectiles[0];p.x=t.x-3;p.y=t.y+2;p.z=t.z;p.hitChance=1;p.hitRoll=0;const hp=t.hp;run(w);
 expect(t.equipmentCharges).toBe(0);expect(t.hp).toBe(hp);expect(w.events.some(e=>e.type==='impact'&&e.result==='intercept')).toBe(true);
 fireProjectile(w,a,t,a.x,a.y,a.z,0);const second=w.projectiles[0];second.x=t.x-3;second.y=t.y+2;second.z=t.z;second.hitChance=1;second.hitRoll=0;run(w);expect(t.hp).toBeLessThan(hp);
});

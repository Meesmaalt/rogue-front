import {expect,it} from 'vitest';
import {stepMissile,missileTrackingPoint} from './missileDynamics';
import type {Entity,Projectile} from './types';
function projectile(extra:Partial<Projectile>={}):Projectile{return {id:1,team:0,sourceId:1,x:0,y:100,z:0,vx:0,vy:0,vz:300,tx:100,tz:100,target:null,damage:10,speed:300,turnRate:3,acceleration:0,maxSpeed:300,motorTime:6,drag:0,lateralAcceleration:90,age:0,hitChance:1,...extra};}
it('normal acceleration limits a fast missile turn and opposite directions do not normalize into a snap',()=>{
 const p=projectile();stepMissile(p,1000,0,0,1/30);expect(Math.atan2(p.vx,p.vz)).toBeCloseTo(90/300/30,6);
 const reverse=projectile();stepMissile(reverse,0,0,-1000,1/30);expect(reverse.vz).toBeGreaterThan(299);expect(reverse.vx).not.toBe(0);
});
it('finite motor burn, drag and gravity remain after guidance is lost',()=>{
 const p=projectile({age:7,acceleration:100,drag:.001,guidanceLost:true});stepMissile(p,0,0,1000,1/30);
 expect(p.vz).toBeLessThan(300);expect(p.vy).toBeLessThan(0);expect(p.speed).toBeLessThan(300);
});
it('a target leaving the seeker cone breaks lock permanently',()=>{
 const p=projectile({age:1,seekerAngle:.7});stepMissile(p,1000,0,-1000,1/30);expect(p.guidanceLost).toBe(true);
 stepMissile(p,0,0,1000,1/30);expect(p.guidanceLost).toBe(true);
});
it('seeker converges from launch bias and leads actual target velocity rather than predicting arbitrary hull heading',()=>{
 const p=projectile({speed:100,missX:8,missZ:-4});const t={x:0,y:100,z:100,heading:Math.PI,flightVx:20,flightVz:0,def:{height:2}} as Entity;
 const aim=missileTrackingPoint(p,t);expect(aim.x).toBe(28);expect(aim.z).toBe(96);expect(aim.y).toBeCloseTo(100.9);p.age=4;const corrected=missileTrackingPoint(p,t);expect(Math.abs(corrected.x-20)).toBeLessThan(1);expect(corrected.z).toBeGreaterThan(99);
});

import {afterEach} from 'vitest';
import {World} from './World';
import {setBases,heightAt,resetHeightmap} from './heightmap';
import {fireProjectile} from './systems/combat';
import {updateProjectiles} from './systems/projectiles';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
it('a lost-lock missile passes the target without snapping to its last aim point',()=>{
 const bases=[{x:0,z:0,r:220},{x:200,z:200,r:20}];setBases(bases);const w=new World(7,false,[],[],bases,false);w.platformRosterOnly=true;w.networkMode=true;
 const a=w.spawn('sam',0,0,0),t=w.spawn('heli',1,30,0);t.y=heightAt(t.x,t.z)+30;fireProjectile(w,a,t,0,30,0);
 const p=w.projectiles[0];p.x=25;p.y=t.y+10;p.z=0;p.vx=300;p.vy=0;p.vz=0;p.speed=300;p.guidanceLost=true;p.tx=30;p.tz=0;p.aimY=t.y+10;p.drag=0;
 w.spatial.rebuild(w.entities);const hp=t.hp;updateProjectiles(w,1/30);expect(p.x).toBeGreaterThan(30);expect(w.projectiles).toContain(p);expect(t.hp).toBe(hp);
 const copy=new World(7,false,[],[],bases,false);loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<20;i++){w.spatial.rebuild(w.entities);copy.spatial.rebuild(copy.entities);updateProjectiles(w,1/30);updateProjectiles(copy,1/30);}expect(worldHash(copy)).toBe(worldHash(w));
});

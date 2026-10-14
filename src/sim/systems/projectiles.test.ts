import {afterEach,expect,it} from 'vitest';
import {World} from '../World';
import {setBases,resetHeightmap} from '../heightmap';
import {fireProjectile} from './combat';
import {segmentBodyEntry,updateProjectiles} from './projectiles';
import type {MapFeatureDef} from '../mapFeatures';
afterEach(resetHeightmap);
function fixture(wallX?:number){
 const bases=[{x:0,z:-170,r:180},{x:200,z:200,r:30}];setBases(bases);
 const features:MapFeatureDef[]=wallX==null?[]:[{id:'wall',kind:'wall',x:wallX,z:-170,width:3,depth:12,height:10}];
 const w=new World(712,false,[],features,bases,false);w.networkMode=true;w.platformRosterOnly=true;
 const a=w.spawn('tank',0,-40,-170),t=w.spawn('tank',1,-10,-170);fireProjectile(w,a,t,a.x,a.y+2,a.z);
 const p=w.projectiles[0];p.x=-30;p.y=t.y+t.def.height*.45;p.z=t.z;p.vx=1500;p.vy=p.vz=0;p.speed=1500;p.tx=100;p.tz=t.z;p.aimY=p.y;p.flight='direct';p.warhead='kinetic';p.penetration=1000;
 w.spatial.rebuild(w.entities);return {w,t,p};
}
it('segment contact uses the entry surface rather than the nearest centre and rejects high flyovers',()=>{
 expect(segmentBodyEntry(0,0,0,20,0,0,10,0,0,3)).toBeCloseTo(.35);
 expect(segmentBodyEntry(10,0,0,20,0,0,10,0,0,3)).toBe(0);
 expect(segmentBodyEntry(0,10,0,20,10,0,10,0,0,3,2)).toBe(Infinity);
 expect(segmentBodyEntry(0,0,0,0,0,0,10,0,0,3)).toBe(Infinity);
});
it('a fast round hits a vehicle before the wall behind it in the same tick',()=>{
 const {w,t}=fixture(5),hp=t.hp;updateProjectiles(w,1/30);
 expect(t.hp).toBeLessThan(hp);expect(w.projectiles).toHaveLength(0);
 expect(w.events.some(e=>e.type==='impact'&&e.result==='penetration'&&e.x<t.x)).toBe(true);
});
it('a wall in front still stops the shot without damaging the vehicle',()=>{
 const {w,t}=fixture(-20),hp=t.hp;updateProjectiles(w,1/30);expect(t.hp).toBe(hp);expect(w.events.some(e=>e.type==='impact'&&e.result==='ground')).toBe(true);
});
it('APS catches a missile crossing its entire protection zone within one tick, consuming one charge',()=>{
 const {w,t,p}=fixture();t.equipment={protection:'aps'};t.equipmentCharges=1;p.weapon='missile';p.warhead='heat';p.guidanceLost=true;
 const hp=t.hp;updateProjectiles(w,1/30);expect(t.hp).toBe(hp);expect(t.equipmentCharges).toBe(0);expect(w.projectiles).toHaveLength(0);
 expect(w.events.some(e=>e.type==='impact'&&e.result==='intercept')).toBe(true);
});
it('APS does not consume a charge for a missile stopped by an earlier wall',()=>{
 const {w,t,p}=fixture(-24);t.equipment={protection:'aps'};t.equipmentCharges=1;p.weapon='missile';p.warhead='heat';p.guidanceLost=true;
 updateProjectiles(w,1/30);expect(t.equipmentCharges).toBe(1);expect(w.events.some(e=>e.type==='impact'&&e.result==='ground')).toBe(true);
});

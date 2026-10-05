import {it,expect,afterEach} from 'vitest';
import {World} from '../World';
import {setBases,setMapSize,setTerrainProfile,resetHeightmap} from '../heightmap';
import {applyCommands} from '../systems/commands';
import {updateUnits} from '../systems/units';
import green from '../../data/maps/green-valley.json';
import type {MapFeatureDef} from '../mapFeatures';
function step(w:World){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
afterEach(resetHeightmap);
it('fast move preserves the longer road and arrives before a direct forest crossing; queued style stays per waypoint',()=>{
 const bases=[{x:0,z:0,r:200},{x:250,z:250,r:20}];setBases(bases);
 const features:MapFeatureDef[]=[{id:'forest',kind:'cover',appearance:'forest',x:0,z:0,width:110,depth:16,density:1},{id:'road',kind:'road',x:0,z:14,width:145,depth:10},{id:'west',kind:'road',x:-66,z:7,width:10,depth:24},{id:'east',kind:'road',x:66,z:7,width:10,depth:24}];
 const make=()=>{const w=new World(77,false,[],features,bases,false);w.networkMode=true;return w;};
 const a=make(),b=make(),normal=a.spawn('apc',0,-65,0),fast=b.spawn('apc',0,-65,0);
 a.issue({type:'move',ids:[normal.id],x:65,z:0});b.issue({type:'fast-move',ids:[fast.id],x:65,z:0});applyCommands(a);applyCommands(b);
 expect(fast.navPath.some(p=>p.z>=9)).toBe(true);
 let ta=0,tb=0;for(let i=1;i<=1800&&(!ta||!tb);i++){step(a);step(b);if(!ta&&normal.mode==='idle')ta=i;if(!tb&&fast.mode==='idle')tb=i;}
 expect(tb).toBeGreaterThan(0);expect(ta).toBeGreaterThan(tb);
 b.issue({type:'fast-move',ids:[fast.id],x:85,z:0});b.issue({type:'amove',ids:[fast.id],x:100,z:0,append:true});b.issue({type:'move',ids:[fast.id],x:115,z:0,append:true});applyCommands(b);expect(fast.moveQueueStyles).toEqual(['amove','move']);
});
it('twelve mixed ground units pass the actual Roheorg base gate and reform at their assigned destinations',()=>{
 setMapSize(960);setTerrainProfile('farmland');setBases(green.map.bases);
 const w=new World(77,false,[],green.map.features as MapFeatureDef[],green.map.bases,true);w.networkMode=true;
 const base=green.map.bases[0];
 const us=Array.from({length:12},(_,i)=>w.spawn(i%3===0?'tank':i%3===1?'apc':'inf',0,base.x-16+(i%3)*12,base.z-16+Math.floor(i/3)*10));
 w.issue({type:'fast-move',ids:us.map(u=>u.id),x:base.x+105,z:base.z});applyCommands(w);
 for(let i=0;i<2100&&us.some(u=>u.mode!=='idle');i++)step(w);

 expect(us.map(u=>({kind:u.kind,x:Math.round(u.x-base.x),z:Math.round(u.z-base.z),mode:u.mode}))).toEqual(us.map(u=>({kind:u.kind,x:Math.round(u.x-base.x),z:Math.round(u.z-base.z),mode:'idle'})));
 expect(us.every(u=>u.x>base.x+50&&w.nav.isWalkableWorld(u.x,u.z,u.def.radius))).toBe(true);
 w.issue({type:'fast-move',ids:us.map(u=>u.id),x:-130,z:-78});applyCommands(w);
 for(let i=0;i<4200&&us.some(u=>u.mode!=='idle');i++)step(w);
 expect(us.every(u=>u.mode==='idle'&&Math.hypot(u.x+130,u.z+78)<45)).toBe(true);
});

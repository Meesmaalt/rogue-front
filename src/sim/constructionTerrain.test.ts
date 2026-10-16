import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import type {MapFeatureDef} from './mapFeatures';
import {builtSite,insideSite,siteWorld} from './buildingPlacement';
import {updateConstruction,constructionStatus} from './systems/construction';
import {coverValueAt} from './systems/sensors';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {TerrainState} from './TerrainState';
afterEach(resetHeightmap);
const forest:MapFeatureDef={id:'wood',kind:'cover',appearance:'forest',x:0,z:0,width:180,depth:180,height:8};
function fixture(){const bases=[{x:0,z:0,r:220},{x:260,z:260,r:30}];setBases(bases);const w=new World(18,false,[],[forest],bases,false);w.networkMode=true;w.externalVictoryMode=true;return w;}
it('site clearance removes woodland cover, slowdown and obscuration permanently and survives save/hash',()=>{
 const w=fixture(),b=w.spawn('generator',0,0,0),tank=w.spawn('tank',0,0,0);
 const density=w.terrain.densityAt(0,0);expect(density).toBeGreaterThan(.25);expect(coverValueAt(w,0,0)).toBeGreaterThan(0);expect(w.terrain.movementFactor(tank)).toBeLessThan(1);
 w.terrain.clearBuilding(b);const revision=w.terrain.revision;w.terrain.clearBuilding(b);expect(w.terrain.revision).toBe(revision);
 expect(w.terrain.densityAt(0,0)).toBe(0);expect(coverValueAt(w,0,0)).toBe(0);expect(w.terrain.movementFactor(tank)).toBe(1);expect(w.terrain.densityAt(50,0)).toBeGreaterThan(0);
 b.dead=true;w.entities.splice(w.entities.indexOf(b),1);w.byId.delete(b.id);expect(w.terrain.densityAt(0,0)).toBe(0);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(copy.terrain.clearedAt(0,0)).toBe(true);expect(worldHash(copy)).toBe(worldHash(w));
 const before=worldHash(copy);copy.terrain.clearSite({x:50,z:50,heading:0,left:-2,right:2,front:2,back:-2});expect(worldHash(copy)).not.toBe(before);
});
it('clears the real rotated warehouse layout, expands only on upgrade and accepts older terrain saves',()=>{
 const w=fixture(),b=w.spawn('supply',0,0,0);b.heading=Math.PI/3;
 w.terrain.clearBuilding(b);const first=builtSite(b),future=siteWorld(first,25,10),within=siteWorld(first,0,20);
 expect(w.terrain.clearedAt(within.x,within.z)).toBe(true);expect(w.terrain.clearedAt(future.x,future.z)).toBe(false);
 b.buildingLevel=2;w.terrain.clearBuilding(b);expect(w.terrain.clearedAt(future.x,future.z)).toBe(true);
 const a=builtSite(b),outside=siteWorld(a,50,50);expect(insideSite(a,outside)).toBe(false);expect(w.terrain.clearedAt(outside.x,outside.z)).toBe(false);
 w.terrain.restore({cells:[],accumulator:0});expect(w.terrain.clearedAt(0,0)).toBe(false);
});
it('a waiting foundation does not clear woods; actual crew work prepares the site and reports construction stages',()=>{
 const w=fixture(),b=w.spawn('generator',0,0,0);b.underConstruction=true;b.constructionTime=10;b.constructionProgress=0;
 updateConstruction(w,1/30);expect(w.terrain.clearedAt(0,0)).toBe(false);
 const home=w.spawn('hq',0,-80,-80),worker=w.spawn('engineer',0,8,0);worker.constructionCrew={homeId:home.id,slot:0};worker.mode='build';worker.target=b;b.builderIds=[worker.id];
 updateConstruction(w,1/30);expect(w.terrain.clearedAt(0,0)).toBe(true);expect(constructionStatus(w,b)).toContain('Platsi ettevalmistus');
 b.constructionProgress=2;expect(constructionStatus(w,b)).toContain('Vundamendi');b.constructionProgress=5;expect(constructionStatus(w,b)).toContain('Karkassi');b.constructionProgress=9;expect(constructionStatus(w,b)).toContain('Viimistlus');
});
it('cleared woodland cannot ignite, and a rotated clearing leaves neighboring woods intact',()=>{
 const t=new TerrainState([forest]);t.clearSite({x:0,z:0,heading:Math.PI/4,left:-15,right:15,back:-4,front:4});
 expect(t.clearedAt(10,-10)).toBe(true);expect(t.clearedAt(10,10)).toBe(false);t.ignite(0,0,0,1000,10);expect(t.fires()).toHaveLength(0);
});

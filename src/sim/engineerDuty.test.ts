import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {updateEngineerDuty} from './engineerDuty';
afterEach(resetHeightmap);
it('construction starts after getting the van, and the same engineer returns to the rest area',()=>{
 const bases=[{x:0,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(80,false,[],[],bases,false);w.networkMode=true;
 w.spawn('hq',0,0,0);const e=w.spawn('engineer',0,12,12),target=w.spawn('factory',0,80,0);target.underConstruction=true;e.mode='build';e.target=target;w.nav.syncBuildings(w.entities);
 const phases=new Set<string>(),move=(p:{x:number;z:number})=>{e.x=p.x;e.z=p.z;return true;};
 for(let i=0;i<180;i++){w.time+=1/30;updateEngineerDuty(w,e,1/30,move);if(e.engineerDuty)phases.add(e.engineerDuty.phase);}
 expect(phases).toContain('boarding');expect(phases).toContain('travel');expect(e.engineerDuty?.phase).toBe('working');expect(e.engineerDuty?.vanPoint).toBeDefined();
 e.mode='idle';e.target=null;
 for(let i=0;i<180;i++){w.time+=1/30;updateEngineerDuty(w,e,1/30,move);}
 expect(e.engineerDuty?.phase).toBe('rest');expect(Math.hypot(e.x,e.z)).toBeLessThan(20);
});
import {updateUnits} from './systems/units';
import {updateConstruction} from './systems/construction';
it('engineers physically collect their van, drive to the site and finish construction',()=>{
 const bases=[{x:0,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(82,false,[],[],bases,false);w.networkMode=true;
 w.spawn('hq',0,0,0);const e=w.spawn('engineer',0,12,12),building=w.spawn('factory',0,80,0);building.underConstruction=true;building.constructionTime=6;building.constructionProgress=0;building.builderIds=[e.id];e.mode='build';e.target=building;w.nav.syncBuildings(w.entities);
 let drove=false;
 for(let i=0;i<3600&&building.underConstruction;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateConstruction(w,1/30);updateUnits(w,1/30);if(e.engineerDuty?.phase==='travel')drove=true;}
 expect(drove).toBe(true);expect(building.underConstruction).toBe(false);expect(e.engineerDuty?.vanPoint).toBeDefined();
});

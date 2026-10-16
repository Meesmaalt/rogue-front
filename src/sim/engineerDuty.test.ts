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
import {setMapSize} from './heightmap';
import {applyCommands} from './systems/commands';
it('the blue construction bar advances from a real first-building command on the coarse grid',()=>{
 setMapSize(4096);const bases=[{x:-700,z:700,r:200},{x:700,z:-700,r:200}];setBases(bases);const w=new World(83,false,[],[],bases,false,true);w.networkMode=true;w.externalVictoryMode=true;
 w.spawn('hq',0,-700,700);const a=w.spawn('engineer',0,-688,712),b=w.spawn('engineer',0,-686,708);w.teamCredits[0]=w.teamResources[0]=w.credits=w.resources=3000;w.nav.syncBuildings(w.entities);
 w.pending.push({type:'build',ids:[a.id,b.id],kind:'generator',x:-670,z:700,team:0});applyCommands(w);const building=w.entities.find(e=>e.kind==='generator')!;expect(building).toBeDefined();
 for(let i=0;i<2700&&building.underConstruction;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateConstruction(w,1/30);updateUnits(w,1/30);}

 expect(building.underConstruction).toBe(false);
});

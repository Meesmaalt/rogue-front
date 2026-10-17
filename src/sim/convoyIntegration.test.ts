import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {generateProceduralMap} from './proceduralMap';
import {resetHeightmap,setMapSize,setBases,setProceduralSeed,setTerrainProfile} from './heightmap';
import {createSkirmish} from './scenario';
import {dispatchResourceConvoys} from './resourceConvoys';
import {updateUnits} from './systems/units';
afterEach(resetHeightmap);
it('starts a facility route on the generated map',()=>{
 const m=generateProceduralMap(43,'balanced',4096,16),map=m.map;
 setMapSize(map.size!);setBases(map.bases);setProceduralSeed(m.seed);setTerrainProfile(map.terrainProfile,map.landforms);
 const w=new World(m.seed,false,map.resources,map.features,map.bases,false,true);w.compactBattle=true;w.networkMode=true;w.externalVictoryMode=true;createSkirmish(w);w.nav.syncBuildings(w.entities);
 const site=w.resourcePoints[0];const engineer=w.spawn('engineer',0,site.x,site.z);engineer.holdPosition=true;
 for(let n=0;n<740;n++)w.tick(1/30);
 expect(site.active).toBe(true);expect(site.productionRate).toBeGreaterThan(0);
 dispatchResourceConvoys(w,[-100,-100]);const truck=w.entities.find(e=>e.resourceConvoy)!;expect(truck).toBeDefined();
 for(let n=0;n<12000;n++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);if(w.roadCargoDelivered[0]>0)break;}
 expect(w.roadCargoDelivered[0]).toBeGreaterThan(0);
},30000);

it('dispatches the previously rejected long route around the river and starts driving',()=>{
 const m=generateProceduralMap(2026,'balanced',4096,15),map=m.map;
 setMapSize(map.size!);setBases(map.bases);setProceduralSeed(m.seed);setTerrainProfile(map.terrainProfile,map.landforms);
 const w=new World(m.seed,false,map.resources,map.features,map.bases,false,true);w.compactBattle=true;createSkirmish(w);w.nav.syncBuildings(w.entities);
 Object.assign(w.resourcePoints[1],{controlledBy:0,active:true});w.time=30;
 dispatchResourceConvoys(w,[-100,-100]);const truck=w.entities.find(e=>e.resourceConvoy)!;expect(truck).toBeDefined();
 const start={x:truck.x,z:truck.z};
 for(let n=0;n<240;n++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(truck.resourceConvoy?.phase).toBe('to-hq');expect(Math.hypot(truck.x-start.x,truck.z-start.z)).toBeGreaterThan(1);
 expect(truck.navPath.length).toBeGreaterThan(0);
},30000);

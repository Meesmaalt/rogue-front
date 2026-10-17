import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap} from './proceduralMap';
import {regionDefaults} from './regions';
import {World} from './World';
import {resetHeightmap,setMapSize,setBases,setTerrainProfile,setProceduralSeed} from './heightmap';
import {applyCommands} from './systems/commands';
import {updateUnits} from './systems/units';
import {pointInFeature} from './mapFeatures';
afterEach(resetHeightmap);
it.each([0,2] as const)('a real APC follows a fast order through the canyon layout %s and crosses a physical bridge',layout=>{
 const m=generateProceduralMap(43,'balanced',2048,18,{...regionDefaults('canyon'),layout});
 setMapSize(2048);setBases(m.map.bases);setProceduralSeed(m.seed);setTerrainProfile(m.map.terrainProfile,m.map.landforms);
 const w=new World(m.seed,false,m.map.resources,m.map.features,m.map.bases,false,true);w.networkMode=true;w.compactBattle=true;
 const from=m.map.bases[0],to=m.map.bases[1],unit=w.spawn('apc',0,from.x,from.z);
 w.issue({type:'fast-move',ids:[unit.id],x:to.x,z:to.z});applyCommands(w);expect(unit.navPath.length).toBeGreaterThan(2);
 const bridges=w.mapFeatures.filter(f=>f.kind==='bridge');let crossed=false;
 for(let i=0;i<12000&&unit.mode!=='idle';i++){
  w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);
  if(bridges.some(f=>pointInFeature(unit.x,unit.z,f)))crossed=true;
 }
 expect(crossed).toBe(true);expect(Math.hypot(unit.x-to.x,unit.z-to.z)).toBeLessThan(20);expect(w.nav.isWalkableWorld(unit.x,unit.z,unit.def.radius)).toBe(true);
},45000);

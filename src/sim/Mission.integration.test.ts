import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {isGarrisonBuilding} from './garrison';
import {MissionController} from './Mission';
import {resetHeightmap,setMapSize,setBases} from './heightmap';
import {saveWorld,loadWorld} from './SaveState';
import type {MissionDef} from './types';
import {getMission} from '../data/missions';
afterEach(resetHeightmap);
it('reinforcements do not erase original destroy targets, including after a restore',()=>{
 const w=new World(92),hq=w.spawn('hq',0,0,0),original=w.spawn('supply',1,60,60);
 const def={id:'objective',map:{bases:w.bases},objectives:[{id:'depot',kind:'destroy',title:'Ladu',description:'Hävita algne ladu',target:{kind:'supply',team:1,count:1}}]} as unknown as MissionDef;
 w.missionController=new MissionController(def,w);w.spawn('supply',1,80,80);original.dead=true;
 const copy=new World(92);loadWorld(copy,saveWorld(w));copy.missionController!.tick(1/30);expect(copy.status).toBe('won');expect(hq.dead).toBe(false);
});
it('tutorial advances on real upgrades, transport and garrison states and restores its active step',()=>{
 const m=getMission("tutorial-logistics");setMapSize(m.map.size!);setBases(m.map.bases);const w=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);
 for(const o of m.map.objects??[])w.spawn(o.kind,o.team,o.x,o.z);
 const mission=new MissionController(m,w);w.missionController=mission;expect(mission.activeObjective?.id).toBe('generator');
 const b=m.map.bases[0];w.spawn('generator',0,b.x-20,b.z-18);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('warehouse');
 // Exercise the same objective evaluator on existing sim states without a long tutorial playthrough.
 const state=mission.snapshot();for(let i=0;i<state.objectives.length;i++)if(i<8)state.objectives[i].complete=true;mission.restore(state);
 const barracks=w.spawn('barracks',0,b.x+20,b.z+18);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('upgrade-barracks');barracks.buildingLevel=2;mission.tick(1/30);expect(mission.activeObjective?.id).toBe('recon');
 const advance=mission.snapshot();for(let i=0;i<advance.objectives.length;i++)if(i<14)advance.objectives[i].complete=true;mission.restore(advance);
 const inf=w.spawn('inf',0,b.x+10,b.z),apc=w.spawn('apc',0,b.x+15,b.z);inf.loadedIntoId=apc.id;apc.cargoUnitIds.push(inf.id);mission.tick(1/30);expect(mission.activeObjective?.id).toBe('urban');
 inf.loadedIntoId=null;inf.garrisonId=m.map.features!.find(isGarrisonBuilding)!.id;mission.tick(1/30);expect(mission.activeObjective?.id).toBe('destroy-enemy-supply');
 const copy=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,m.map.baseDefenses??true);loadWorld(copy,saveWorld(w));expect(copy.missionController!.activeObjective?.id).toBe('destroy-enemy-supply');
});

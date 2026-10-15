import {afterEach,expect,it} from 'vitest';
import {metricUnitDefinition,displayedWeaponDistance} from './battleScale';
import {UNITS} from './units';
import {World} from './World';
import {saveWorld,loadWorld} from './SaveState';
import {resetHeightmap,setBases,setMapSize} from './heightmap';
import {worldHash} from './Replay';
afterEach(resetHeightmap);
it('compresses actual engagement ranges while preserving original weapon readouts and minimum ranges',()=>{
 for(const kind of ['tank','heli','fighter'] as const){const real=metricUnitDefinition(UNITS[kind],kind),compact=metricUnitDefinition(UNITS[kind],kind,true);
 for(const [i,slot] of compact.weapons!.entries()){expect(slot.range).toBeLessThan(real.weapons![i].range*.21);expect(slot.displayRange).toBe(real.weapons![i].range);expect(displayedWeaponDistance(slot,slot.range)).toBeCloseTo(slot.displayRange!);expect(slot.minimumRange).toBeLessThanOrEqual(slot.range);}
 expect(compact.opticsRange).toBeLessThan(real.opticsRange!);expect(real.weapons![0].displayRange).toBeUndefined();}
});
it('retains the compact rules and definitions through save and restore',()=>{
 setMapSize(2048);const bases=[{x:0,z:0,r:1500},{x:700,z:700,r:30}];setBases(bases);const a=new World(1,false,[],[],bases,false,true);a.compactBattle=true;a.networkMode=true;a.spawn('tank',0,0,0);
 const b=new World(1,false,[],[],bases,false,true);loadWorld(b,saveWorld(a));expect(b.compactBattle).toBe(true);expect(worldHash(b)).toBe(worldHash(a));expect(b.spawn('heli',0,50,0).def.weapons![0].displayRange).toBeGreaterThan(500);
});

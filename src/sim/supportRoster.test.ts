import {expect,it} from 'vitest';
import {UNITS,factionUnitDefinition} from './units';
import {FACTION_LIST,factionLandUnits} from './factions';
import {World} from './World';
import {producerKind} from './systems/production';
import {metricUnitDefinition} from './battleScale';
import {tacticalClass} from '../ui/TacticalClass';
it('specialists are purchasable from the right building for every faction',()=>{
 const w=new World(1,false);w.platformRosterOnly=true;const factory=w.spawn('factory',0,0,0),barracks=w.spawn('barracks',0,30,0);factory.buildingLevel=3;barracks.buildingLevel=3;
 for(const faction of FACTION_LIST)for(const kind of ['sam','howitzer','manpad','mortar'] as const){
  expect(factionLandUnits(faction)).toContain(kind);expect(UNITS[kind].producible).toBe(true);
  const p=producerKind(kind);expect(p).toBe(kind==='sam'||kind==='howitzer'?'factory':'barracks');
  expect(w.canProduceAtLevel(p==='factory'?factory:barracks,kind)).toBe(true);
  const d=metricUnitDefinition(factionUnitDefinition(kind,faction),kind,true);expect(d.weapons?.length).toBeGreaterThan(0);expect(d.weapons?.[0].ammoCapacity).toBeGreaterThan(0);
 }
 expect(tacticalClass('sam')).toBe('airDefense');expect(tacticalClass('howitzer')).toBe('artillery');
 expect(UNITS.sam.weapons?.every(s=>s.targets==='air')).toBe(true);
 expect(UNITS.howitzer.weapons?.[0].flight).toBe('ballistic');
 expect(UNITS.howitzer.cost).toBeLessThan(UNITS.artillery.cost);
});

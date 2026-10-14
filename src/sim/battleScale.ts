import {UNITS} from './units';
import data from '../data/battle-scale.json';
import mobility from '../data/mobility.json';
import type {Entity,UnitDef,UnitKind} from './types';
export const BATTLE_SCALE=data;
/** Metres and metres/second; costs, damage, capacities and building footprints stay unchanged. */
export function metricUnitDefinition(base:UnitDef,kind:UnitKind):UnitDef {
 const def={...base,metricScale:true,weapons:base.weapons?.map(s=>{const p=data.weapons[s.profile as keyof typeof data.weapons],overrides=(data.weaponOverrides as Partial<Record<UnitKind,Record<string,Partial<typeof p>>>>)[kind]?.[s.profile];return p?{...s,...p,...overrides,launchSpeed:s.flight==='guided'?Math.min(p.speed,s.launchSpeed*3):p.speed,acceleration:s.acceleration*4}: {...s};})};
 if(base.speed>0)def.speed=(data.speeds as Partial<Record<UnitKind,number>>)[kind]??data.speed[base.category as keyof typeof data.speed]??base.speed;
 if(base.speed>0)def.speed*=base.speed/UNITS[kind].speed;
 def.opticsRange=(base.opticsRange??40)*data.opticsMultiplier;
 if(base.speed===0)def.opticsRange=Math.min(def.opticsRange,kind==='radar'?5000:600);
 if(def.weapons?.length){def.range=Math.max(...def.weapons.map(s=>s.range));def.minimumRange=def.weapons[0].minimumRange;def.projectileSpeed=def.weapons[0].speed;}
 return def;
}

const metricAircraft={...mobility.aircraft,...data.aircraft};
const metricHelicopter={...mobility.helicopter,...data.helicopter};
export function aircraftMobility(u:Entity){return u.def.metricScale?metricAircraft:mobility.aircraft;}
export function helicopterMobility(u:Entity){return u.def.metricScale?metricHelicopter:mobility.helicopter;}

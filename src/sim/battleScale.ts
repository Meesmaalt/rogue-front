import operations from '../data/aircraft-operations.json';
import expansion from "../data/expansion.json";
import {UNITS} from './units';
import data from '../data/battle-scale.json';
import mobility from '../data/mobility.json';
import type {Entity,UnitDef,UnitKind} from './types';
export const BATTLE_SCALE=data;
/** Metres and metres/second; costs, damage, capacities and building footprints stay unchanged. */
export function metricUnitDefinition(base:UnitDef,kind:UnitKind,compact=false):UnitDef {
 const def={...base,metricScale:true,weapons:base.weapons?.map(s=>{const p=data.weapons[s.profile as keyof typeof data.weapons],overrides=(data.weaponOverrides as Partial<Record<UnitKind,Record<string,Partial<typeof p>>>>)[kind]?.[s.profile];return p?{...s,...p,...overrides,launchSpeed:s.flight==='guided'?Math.min(p.speed,s.launchSpeed*3):p.speed,acceleration:s.acceleration*4}: {...s};})};
 if(base.speed>0)def.speed=(data.speeds as Partial<Record<UnitKind,number>>)[kind]??data.speed[base.category as keyof typeof data.speed]??base.speed;
 if(base.speed>0)def.speed*=base.speed/UNITS[kind].speed;
 def.opticsRange=(base.opticsRange??40)*data.opticsMultiplier;
 if(base.speed===0)def.opticsRange=Math.min(def.opticsRange,kind==='radar'?5000:600);
 if(def.weapons?.length){def.range=Math.max(...def.weapons.map(s=>s.range));def.minimumRange=def.weapons[0].minimumRange;def.projectileSpeed=def.weapons[0].speed;}
 if(compact){
  def.compactScale=true;def.displayOpticsRange=def.opticsRange;def.opticsRange*=data.compact.opticsScale;
  if(def.category==='air'&&kind!=='cargoPlane')def.speed*=data.compact.airSpeedScale;
  for(const slot of def.weapons??[]){const factor=slot.targets==='air'&&def.category==='air'?data.compact.airToAirRangeScale:data.compact.rangeScale;slot.displayRange=slot.range;slot.displayMinimumRange=slot.minimumRange;slot.rangeScale=factor;slot.range*=factor;slot.minimumRange*=factor;}
  if(def.weapons?.length){def.range=Math.max(...def.weapons.map(s=>s.range));def.minimumRange=def.weapons[0].minimumRange;}
 }
 return def;
}

const metricAircraft={...mobility.aircraft,...data.aircraft};
const metricHelicopter={...mobility.helicopter,...data.helicopter};
const agileAircraft={...metricAircraft,maxBank:data.aircraftRoles.fighter.maxBank,lateralAcceleration:data.aircraftRoles.fighter.lateralAcceleration*operations.combat.fighterAgility};
const compactAircraft={...metricAircraft,altitude:data.compact.airAltitude,approachAltitude:90};
const compactHelicopter={...metricHelicopter,altitude:data.compact.helicopterAltitude};
const metricAirlift={...metricAircraft,...data.aircraftRoles.heavy,altitude:expansion.airlift.flightAltitude};
export function aircraftMobility(u:Entity){
 if(!u.def.metricScale)return mobility.aircraft;
 if(u.kind==='airTransport'&&!u.def.compactScale)return metricAirlift;
 const profile=u.def.compactScale?compactAircraft:metricAircraft;
 if(u.kind==='cargoPlane'||u.kind==='airTransport'||u.kind==='bomber')return {...profile,...data.aircraftRoles[u.kind==='bomber'?'bomber':'heavy']};
 return u.kind==='ecm'?profile:{...profile,maxBank:agileAircraft.maxBank,lateralAcceleration:agileAircraft.lateralAcceleration};
}
export function helicopterMobility(u:Entity){return u.def.compactScale?compactHelicopter:u.def.metricScale?metricHelicopter:mobility.helicopter;}

export function displayedWeaponDistance(spec:{rangeScale?:number},distance:number):number{return distance/(spec.rangeScale??1);}

import type {Entity} from '../sim/types';
import mobility from '../data/mobility.json';
import config from '../data/audio.json';
/** Thrust/RPM follows flight phase: hovering needs power even with zero ground speed. */
export function aircraftEngineProfile(e:Entity):{power:number;rpm:number} {
 const cfg=config.aircraft,heli=e.def.category==='heli'||config.engineKinds.heli.includes(e.kind);
 const speed=Math.min(1,(e.motionSpeed??0)/Math.max(1,e.def.speed));
 if(e.emergencyLanded||(e.maxFuel??0)>0&&(e.fuel??0)<=0)return {power:0,rpm:e.emergencyLanded?0:heli?cfg.autorotationRpm:0};
 if(e.airState==='grounded'||e.airState==='rearming')return heli?{power:0,rpm:0}:{power:cfg.idlePower,rpm:cfg.idleRpm};
 if(e.airState==='taxi'){
  if(heli){const spool=Math.min(1,(e.airSortieTime??0)/mobility.helicopter.rotorSpoolTime);return {power:cfg.idlePower+(cfg.takeoffPower-cfg.idlePower)*spool,rpm:cfg.idleRpm+(1-cfg.idleRpm)*spool};}
  return {power:e.airTaxiPhase==='runway'?cfg.takeoffPower:cfg.taxiPower,rpm:e.airTaxiPhase==='runway'?1:cfg.taxiRpm};
 }
 if(e.airState==='landing'||e.airState==='returning')return {power:heli?cfg.hoverPower:cfg.approachPower,rpm:heli?1:cfg.approachRpm};
 return {power:heli?cfg.hoverPower+(1-cfg.hoverPower)*speed:cfg.cruisePower+(1-cfg.cruisePower)*speed,rpm:heli?1:cfg.cruiseRpm+(1-cfg.cruiseRpm)*speed};
}

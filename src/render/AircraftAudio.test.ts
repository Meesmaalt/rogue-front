import {expect,it} from 'vitest';
import {aircraftEngineProfile} from './AircraftAudio';
import type {Entity} from '../sim/types';
function aircraft(kind:'heli'|'fighter',state:Entity['airState'],extra:Partial<Entity>={}):Entity{return {kind,airState:state,def:{speed:50,category:kind==='heli'?'heli':'air'},motionSpeed:0,...extra} as Entity;}
it('helicopter hover remains under power, while RPM and volume ramp during startup',()=>{
 const idle=aircraftEngineProfile(aircraft('heli','grounded')),early=aircraftEngineProfile(aircraft('heli','taxi',{airSortieTime:.1})),late=aircraftEngineProfile(aircraft('heli','taxi',{airSortieTime:2})),hover=aircraftEngineProfile(aircraft('heli','airborne'));
 expect(early.rpm).toBeGreaterThan(idle.rpm);expect(late.power).toBeGreaterThan(early.power);expect(hover.power).toBeGreaterThan(.7);expect(hover.rpm).toBe(1);
});
it('jet runway thrust differs from idle/taxi/approach, and zero fuel removes engine power',()=>{
 const runway=aircraftEngineProfile(aircraft('fighter','taxi',{airTaxiPhase:'runway'})),taxi=aircraftEngineProfile(aircraft('fighter','taxi',{airTaxiPhase:'apron'}));
 expect(runway.power).toBeGreaterThan(taxi.power*3);expect(runway.rpm).toBe(1);
 expect(aircraftEngineProfile(aircraft('heli','landing',{fuel:0,maxFuel:100})).power).toBe(0);
});

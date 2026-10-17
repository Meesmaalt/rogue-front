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
it('pilots board before the engine can start, then ignition ramps rather than jumping to taxi power',()=>{
 const start={phase:'crew' as const,progress:0,from:{x:0,z:0},target:{x:5,z:0},runSeconds:2};
 expect(aircraftEngineProfile(aircraft('fighter','taxi',{airStart:start})).power).toBe(0);
 const early=aircraftEngineProfile(aircraft('fighter','taxi',{airStart:{...start,phase:'ignition',progress:.1}}));const late=aircraftEngineProfile(aircraft('fighter','taxi',{airStart:{...start,phase:'ignition',progress:3.8}}));expect(late.rpm).toBeGreaterThan(early.rpm);expect(late.power).toBeGreaterThan(early.power);
});

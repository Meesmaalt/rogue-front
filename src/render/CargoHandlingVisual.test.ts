import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createGroundHandler,createCargoRamp} from './CargoHandlingVisual';
import {aircraftEngineProfile} from './AircraftAudio';
import type {Entity} from '../sim/types';
it('service vehicle has visible removable pallets and remains smaller than combat trucks',()=>{const g=createGroundHandler(),bounds=new THREE.Box3().setFromObject(g);expect(g.getObjectByName('HandlingCargo')).toBeDefined();expect(bounds.max.y).toBeLessThan(2);expect(bounds.max.x-bounds.min.x).toBeLessThan(3);});
it('cargo ramp pivots from the rear sill toward the ground',()=>{const g=createCargoRamp(4,5);expect(g.position.z).toBeLessThan(0);const closed=new THREE.Box3().setFromObject(g);g.rotation.x=-Math.PI*.65;const open=new THREE.Box3().setFromObject(g);expect(open.min.z).toBeLessThan(closed.min.z);});
it('a grounded transport shuts its rotor off and only the start phase spools it up',()=>{const e={kind:'transport',def:{category:'heli',speed:40},airState:'grounded',motionSpeed:0} as Entity;expect(aircraftEngineProfile(e)).toEqual({power:0,rpm:0});e.airState='taxi';e.airSortieTime=0;const early=aircraftEngineProfile(e);e.airSortieTime=3;expect(aircraftEngineProfile(e).rpm).toBeGreaterThan(early.rpm);});

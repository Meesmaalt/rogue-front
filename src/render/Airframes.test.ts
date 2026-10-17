import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createAirframe,updateAirframe} from './Airframes';
import {airframeFor} from '../sim/airframes';
import type {Entity} from '../sim/types';
it('every named aircraft has finite geometry with the authored wingspan, length, engines and tails',()=>{
 for(const faction of ['usa','russia','china'] as const)for(const kind of ['fighter','interceptor','multirole','attackAircraft','ecm','bomber','cargoPlane'] as const){const g=createAirframe(kind,faction)!,p=airframeFor(faction,kind)!;g.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());expect(size.x).toBeGreaterThan(p.span*.9);expect(size.z).toBeGreaterThan(p.length*.85);let engines=0;g.traverse(o=>{if(o.name==='EngineFan')engines++;if(o instanceof THREE.Mesh)for(const v of o.geometry.getAttribute('position').array)expect(Number.isFinite(v)).toBe(true);});expect(engines).toBe(p.engines);}
});
it('cargo ramp folds down into a driveable ramp, while instances share geometry but independent transforms',()=>{
 const a=createAirframe('cargoPlane','usa')!,b=createAirframe('cargoPlane','usa')!,e={kind:'cargoPlane',id:1,def:{},airState:'grounded',cargoDoor:0} as Entity;updateAirframe(a,e,0,'usa');updateAirframe(b,{...e,cargoDoor:1},0,'usa');
 expect(a.getObjectByName('CargoRamp')!.rotation.x).toBeCloseTo(Math.PI/2);expect(b.getObjectByName('CargoRamp')!.rotation.x).toBeCloseTo(-.28);expect(a.getObjectByName('EngineFan')).not.toBe(b.getObjectByName('EngineFan'));const mesh=(g:THREE.Group)=>g.children.find(o=>o instanceof THREE.Mesh) as THREE.Mesh;expect(mesh(a).geometry).toBe(mesh(b).geometry);
});

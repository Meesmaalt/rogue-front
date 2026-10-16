import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createChinook} from './Chinook';
import {createForklift,createDepotHandler} from './CargoHandlingVisual';
it('Chinook has two separated three-blade counter-rotating rotors and no tail rotor',()=>{
 const model=createChinook(),front=model.getObjectByName('RotorMainFront')!,aft=model.getObjectByName('RotorCounter')!;
 expect(front).toBeDefined();expect(aft.position.y).toBeGreaterThan(front.position.y);expect(Math.abs(aft.position.z-front.position.z)).toBeGreaterThan(4);expect(front.children.filter(o=>o.type==='Group')).toHaveLength(3);expect(aft.children.filter(o=>o.type==='Group')).toHaveLength(3);expect(model.getObjectByName('TailRotor')).toBeUndefined();
 const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());expect(size.z/size.x).toBeGreaterThan(1.2);expect(size.z).toBeLessThan(15);
 const forklift=createForklift();expect(forklift.getObjectByName('ForkliftDriver')).toBeDefined();expect(forklift.getObjectByName('ForkRoof')).toBeUndefined();expect(createDepotHandler().getObjectByName('ServiceWalker')).toBeDefined();
});

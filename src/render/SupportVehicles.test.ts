import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createSupportVehicle} from './SupportVehicles';
it('support models have distinct unarmed silhouettes, bounded mesh batches and a real main/tail rotor',()=>{
 const van=createSupportVehicle('transportVan',0)!,heli=createSupportVehicle('scoutHeli',1)!;
 expect(van.group.name).toBe('InfantryTransportVan');expect(heli.group.getObjectByName('RotorMain')).toBeDefined();expect(heli.group.getObjectByName('TailRotor')).toBeDefined();
 for(const model of [van,heli]){const meshes:THREE.Mesh[]=[];model.group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});expect(meshes.length).toBeLessThanOrEqual(10);expect(meshes.every(m=>m.geometry.attributes.position.count>0)).toBe(true);expect(model.turret).toBeNull();}
 expect(new THREE.Box3().setFromObject(van.group).getSize(new THREE.Vector3()).z).toBeGreaterThan(4);
});

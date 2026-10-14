import {expect,it} from 'vitest';
import * as THREE from 'three';
import {syncEquipmentVisual} from './EquipmentVisual';
import type {Entity} from '../sim/types';
it('equipment geometry is shared, merged and refreshed only when the configuration changes',()=>{
 const root=new THREE.Group(),other=new THREE.Group(),u={kind:'tank',def:{radius:2.3,height:2.7},equipment:{protection:'reactive',mobility:'engine'}} as unknown as Entity;
 syncEquipmentVisual(root,u);syncEquipmentVisual(other,u);const kit=root.getObjectByName('EquipmentKit') as THREE.Mesh;
 expect(root.children).toHaveLength(1);expect(kit.geometry).toBe((other.children[0] as THREE.Mesh).geometry);expect(kit.geometry.userData.sharedArt).toBe(true);
 syncEquipmentVisual(root,u);expect(root.children[0]).toBe(kit);u.equipment={protection:'aps'};syncEquipmentVisual(root,u);expect(root.children).toHaveLength(1);expect(root.children[0]).not.toBe(kit);
 u.equipment={protection:'standard'};syncEquipmentVisual(root,u);expect(root.children).toHaveLength(0);
});

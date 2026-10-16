import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createBuildingUpgradeStages,updateBuildingUpgradeStages} from './BuildingUpgrades';
it('upgrade parts emerge in sequence while existing components keep their completed pose',()=>{
 const kit=createBuildingUpgradeStages('hq',2,3);updateBuildingUpgradeStages(kit,2,0);const complete=kit.children[0],next=kit.children[1];expect(complete.children[0].visible).toBe(true);expect(complete.children[0].scale.y).toBe(1);expect(next.children[0].visible).toBe(false);
 updateBuildingUpgradeStages(kit,2,.5);expect(next.children[0].visible).toBe(true);expect(next.children[0].scale.y).toBeGreaterThan(0);expect(next.children[0].scale.y).toBeLessThan(1);expect(next.getObjectByName('UpgradeFramework')!.visible).toBe(true);
 updateBuildingUpgradeStages(kit,3,1);expect(next.children[0].scale.y).toBe(1);expect(next.getObjectByName('UpgradeFramework')!.visible).toBe(false);
 expect(complete.getObjectByName('HQTeamStation2')).toBeDefined();expect(next.getObjectByName('HQTeamStation3')).toBeDefined();
 const airport=createBuildingUpgradeStages('airbase',1,2);updateBuildingUpgradeStages(airport,1,1);const bounds=new THREE.Box3().setFromObject(airport);expect(bounds.min.x).toBeGreaterThan(50);expect(bounds.max.z).toBeGreaterThan(85);
});

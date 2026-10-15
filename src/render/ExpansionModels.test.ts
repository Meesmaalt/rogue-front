import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createExpansionModel,createParachute} from './ExpansionModels';
it('buildable defenses and strategic facilities have finite, distinct geometry',()=>{
 for(const kind of ['gunTurret','flakTurret','atTurret','missileCommand','icbmSilo','cruiseLauncher'] as const){const model=createExpansionModel(kind,0)!;expect(model.group.name).toBe(kind);const bounds=new THREE.Box3().setFromObject(model.group);expect(bounds.isEmpty()).toBe(false);expect(Number.isFinite(bounds.max.y)).toBe(true);expect(bounds.max.y).toBeGreaterThan(1);}
 expect(createExpansionModel('inf',0)).toBeNull();
});
it('vehicle parachutes have a canopy and eight suspension lines',()=>{
 const p=createParachute(4);expect(p.children).toHaveLength(2);const lines=p.children[1] as THREE.LineSegments;expect(lines.geometry.attributes.position.count).toBe(16);expect(new THREE.Box3().setFromObject(p).max.y).toBeGreaterThan(10);
});

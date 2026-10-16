import {afterEach,expect,it} from 'vitest';
import {createItalianScenery,sampleItalianScenery} from './ItalianScenery';
import {resetHeightmap} from '../sim/heightmap';
import * as THREE from 'three';
afterEach(resetHeightmap);
it('Mediterranean plants use bounded valid instanced geometry and leave access roads clear',()=>{
 const fields=[{id:'grove',kind:'cover' as const,appearance:'field' as const,landUse:'olive' as const,x:0,z:0,width:100,depth:100},{id:'vines',kind:'cover' as const,appearance:'field' as const,landUse:'vineyard' as const,x:150,z:0,width:100,depth:100},{id:'citrus',kind:'cover' as const,appearance:'field' as const,landUse:'citrus' as const,x:-150,z:0,width:100,depth:100},{id:'road',kind:'road' as const,x:0,z:0,width:10,depth:180}];
 const points=sampleItalianScenery(fields);expect(points.length).toBeGreaterThan(50);expect(points.length).toBeLessThanOrEqual(2300);expect(points.filter(p=>Math.abs(p.x)<7)).toHaveLength(0);
 const view=createItalianScenery(fields);let count=0;view.traverse(o=>{if(o instanceof THREE.InstancedMesh){count++;expect(o.geometry).toBeTruthy();expect([...o.geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);}});expect(count).toBeGreaterThan(2);
});

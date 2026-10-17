import {expect,it} from 'vitest';
import character from '../data/region-character.json';
import {SCENERY_KINDS,createSceneryGeometry} from './SceneryGeometry';

it('every silhouette has coloured geometry and fits its placement clearance',()=>{
 const signatures=new Set<string>();
 for(const kind of SCENERY_KINDS){const g=createSceneryGeometry(kind,'canyon'),p=g.getAttribute('position');
  expect(g.getAttribute('color').count).toBe(p.count);expect(g.boundingBox!.min.y).toBeGreaterThan(-.2);
  for(let i=0;i<p.count;i++){expect(Math.hypot(p.getX(i),p.getZ(i))).toBeLessThanOrEqual(character.scenery.footprint[kind]+.001);expect(Number.isFinite(p.getY(i))).toBe(true);}
  signatures.add(Array.from(p.array).join(','));g.dispose();
 }expect(signatures.size).toBe(SCENERY_KINDS.length);
});

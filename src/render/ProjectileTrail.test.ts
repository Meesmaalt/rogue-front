import {expect,it} from 'vitest';
import {sampleProjectileTrail} from './ProjectileTrail';
it('trail sampling fills long-frame gaps with a bounded evenly distributed trail',()=>{
 const from={x:0,y:4,z:0},to={x:100,y:14,z:0},points=sampleProjectileTrail(from,to,1,12);
 expect(points).toHaveLength(12);expect(points.at(-1)).toEqual(to);expect(points[0].x).toBeCloseTo(100/12);expect(sampleProjectileTrail(from,{x:.1,y:4,z:0},1,12)).toEqual([]);
});
it('short frames retain a spacing remainder rather than duplicating smoke at a stationary projectile',()=>{
 const p=sampleProjectileTrail({x:0,y:0,z:0},{x:3.4,y:0,z:0},1,20);expect(p.map(x=>x.x)).toEqual([1,2,3]);expect(sampleProjectileTrail(p.at(-1)!,{x:3.4,y:0,z:0},1,20)).toEqual([]);
});

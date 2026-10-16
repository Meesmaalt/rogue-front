import {expect,it} from 'vitest';
import layout from '../data/base-life.json';
import {depotCompound,depotFences} from './depotLayout';
import {pointInFeature} from './mapFeatures';
it('each depot layout encloses all unlocked pads with rotor clearance and retains broad vehicle gates',()=>{
 for(let level=1;level<=3;level++){const b=depotCompound(level),fences=depotFences(level);for(const p of layout.depot.pads.slice(0,level)){expect(p.x-8).toBeGreaterThan(b.left);expect(p.x+8).toBeLessThan(b.right);expect(p.z-8).toBeGreaterThan(b.back);expect(p.z+8).toBeLessThan(b.front);for(const f of fences)expect(pointInFeature(p.x,p.z,{id:'f',kind:'wall',...f},8)).toBe(false);}expect(fences.some(f=>pointInFeature(0,b.front,{id:'gate',kind:'wall',...f},1))).toBe(false);}
 expect(depotCompound(2).right).toBeGreaterThan(depotCompound(1).right);expect(depotCompound(3).front).toBeGreaterThan(depotCompound(2).front);
});

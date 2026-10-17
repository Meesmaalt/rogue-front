import {expect,it} from 'vitest';
import {REGION_IDS,regionDefaults,regionalNoise,reliefKernel,regionFromProfile} from './regions';
import {mapOptionsMask,decodeMapOptions} from './proceduralMap';
it('region IDs survive terrain option encoding without changing historical masks',()=>{
 for(const region of REGION_IDS){const o=regionDefaults(region),decoded=decodeMapOptions(mapOptionsMask(o));expect({...decoded,region:decoded.region??'italy',lakes:decoded.lakes!==false}).toEqual(o);}
 expect(mapOptionsMask({sea:false,mountains:true,forest:true,river:true})).toBe(14);
 expect(regionFromProfile('farmland-natural')).toBeUndefined();
});
it('district noise is seeded and continuous; mesa relief has a plateau and a continuous footslope',()=>{
 expect(regionalNoise(30,70,42,300)).toBe(regionalNoise(30,70,42,300));
 expect(Math.abs(regionalNoise(30,70,42,300)-regionalNoise(31,70,42,300))).toBeLessThan(.01);
 expect(regionalNoise(30,70,42,300)).not.toBe(regionalNoise(30,70,43,300));
 expect(reliefKernel(.25,'mesa')).toBeGreaterThan(reliefKernel(.25,'ridge'));
 for(const shape of ['mesa','dune','ridge'] as const){expect(reliefKernel(1,shape)).toBe(0);expect(reliefKernel(.999999,shape)).toBeLessThan(.00001);}
});

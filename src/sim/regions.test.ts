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

it('overlapping pieces of one ridge retain one plateau height in planning and in the real terrain field',async()=>{
 const {regionalReliefAt}=await import('./regions');
 const {resetHeightmap,setMapSize,setTerrainProfile,setProceduralSeed,heightAt}=await import('./heightmap');
 const p={x:300,z:100},f={...p,width:120,depth:90,height:60,group:'ridge',shape:'mesa' as const};
 try{
  setMapSize(2048);setProceduralSeed(43);setTerrainProfile('region-canyon',[]);const ground=heightAt(p.x,p.z);
  setTerrainProfile('region-canyon',[f,{...f}]);expect(heightAt(p.x,p.z)-ground).toBeCloseTo(60);expect(regionalReliefAt(p,[f,{...f}])).toBeCloseTo(60);
  setTerrainProfile('region-canyon',[f,{...f,group:'separate'}]);expect(heightAt(p.x,p.z)-ground).toBeCloseTo(120);
 }finally{resetHeightmap();}
});

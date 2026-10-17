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

it('ridge joins have continuous gradients, bounded heights and agree with the actual height field',async()=>{
 const {regionalReliefAt,reliefKernel}=await import('./regions');
 const {resetHeightmap,setMapSize,setTerrainProfile,setProceduralSeed,heightAt}=await import('./heightmap');
 const forms=[{x:270,z:100,width:120,depth:90,height:60,group:'joined',shape:'ridge' as const},{x:330,z:100,width:120,depth:90,height:60,group:'joined',shape:'ridge' as const}];
 const sample=(x:number)=>regionalReliefAt({x,z:100},forms),e=.001;
 expect(Math.abs((sample(300+e)-sample(300))/e-(sample(300)-sample(300-e))/e)).toBeLessThan(.001);
 for(let x=160;x<=440;x+=5){
  const p={x,z:100},max=Math.max(...forms.map(f=>f.height*reliefKernel(((x-f.x)/f.width)**2,'ridge')));
  expect(sample(x)).toBeLessThanOrEqual(max+1e-10);expect(sample(x)).toBeCloseTo(regionalReliefAt(p,[...forms].reverse()),10);
 }
 try{setMapSize(2048);setProceduralSeed(43);setTerrainProfile('region-italy',[]);const ground=heightAt(300,100);setTerrainProfile('region-italy',forms);expect(heightAt(300,100)-ground).toBeCloseTo(sample(300),8);}finally{resetHeightmap();}
});

it('a connected ridge reads as a continuous crest instead of a chain of separate hilltops',async()=>{
 const {regionalReliefAt}=await import('./regions');const {default:character}=await import('../data/region-character.json');
 const spacing=2048*character.variation.ridgeSpacing,forms=Array.from({length:23},(_,i)=>({x:(i-11)*spacing,z:0,width:2048*.052,depth:2048*.037,height:40,group:'belt',shape:'ridge' as const}));
 const heights=Array.from({length:401},(_,i)=>regionalReliefAt({x:i-200,z:0},forms));
 expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(.015*40);
});

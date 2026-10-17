import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap,METRIC_MAP_SIZES} from './proceduralMap';
import {REGION_IDS,regionDefaults} from './regions';
import {resetHeightmap,setMapSize,setBases,setTerrainProfile,setProceduralSeed,setTerrainFeatures,ensureHeightCache,heightAt} from './heightmap';
import {validateFreshMap} from './freshMap';
import {pointInFeature} from './mapFeatures';
afterEach(resetHeightmap);
it.each(REGION_IDS)('%s generates distinctive deterministic regional geometry across all supported sizes',region=>{
 for(const size of METRIC_MAP_SIZES){const m=generateProceduralMap(43,'balanced',size,17,regionDefaults(region));
  expect(m.map.terrainProfile).toBe(`region-${region}`);expect(getPlayableMap(m.id)).toEqual(m);expect(m.map.resources).toHaveLength(9);
  expect(m.map.landforms!.length).toBeGreaterThan(20);
  expect(m.map.landforms!.every(f=>f.shape===(region==='canyon'?'mesa':region==='desert'?'dune':'ridge'))).toBe(true);
  if(region!=='italy')expect(m.map.features!.some(f=>f.landUse==='vineyard'||f.landUse==='olive')).toBe(false);
  if(region==='siberia'||region==='desert')expect(m.map.features!.some(f=>f.appearance==='field')).toBe(false);
 }
},120000);
it.each(REGION_IDS)('%s retains actual navigation and runway clearance at small and large scales',region=>{
 for(const size of [2048,6144]){const m=generateProceduralMap(43,'balanced',size,17,regionDefaults(region));let reason='';expect(validateFreshMap(m,r=>reason=r),reason).toBe(true);
  for(const r of m.map.resources)expect(m.map.features!.some(f=>f.kind==='building'&&pointInFeature(r.x,r.z,f,4))).toBe(false);
 }
},120000);
it('region, terrain overrides and seed are reconstructible; malformed masks are rejected',()=>{
 const m=generateProceduralMap(0,'forest',2048,17,{...regionDefaults('siberia'),mountains:false,forest:false,river:false,lakes:false});
 expect(m.map.landforms).toHaveLength(0);expect(m.map.features!.some(f=>f.appearance==='forest'||f.kind==='water')).toBe(false);expect(getPlayableMap(m.id)).toEqual(m);
 for(const suffix of ['128','01','NaN'])expect(getPlayableMap(`procedural-v17-balanced-2048-43-o${suffix}`)).toBeUndefined();
 expect(getPlayableMap('procedural-v16-balanced-2048-43-o32')).toBeUndefined();
});
it('mesa and dune profiles affect real heights rather than only painting the surface',()=>{
 const sample=(region:'canyon'|'desert')=>{const m=generateProceduralMap(43,'balanced',2048,17,regionDefaults(region));setMapSize(2048);setBases(m.map.bases);setProceduralSeed(m.seed);setTerrainProfile(m.map.terrainProfile,m.map.landforms);setTerrainFeatures(m.map.features!);ensureHeightCache();const f=m.map.landforms![8];return {h:heightAt(f.x,f.z),shape:f.shape};};
 const canyon=sample('canyon'),desert=sample('desert');expect(canyon.shape).toBe('mesa');expect(desert.shape).toBe('dune');expect(canyon.h).toBeGreaterThan(desert.h*1.6);
});

import {expect,it,afterEach} from 'vitest';
import {generateProceduralMap,getPlayableMap,decodeMapOptions,mapOptionsMask} from './proceduralMap';
import {validateFreshMap} from './freshMap';
import {resetHeightmap} from './heightmap';
afterEach(resetHeightmap);
it('all terrain flags round trip in a versioned reproducible map ID',()=>{
 for(let n=0;n<16;n++)expect(mapOptionsMask(decodeMapOptions(n))).toBe(n);
 const m=generateProceduralMap(42,'balanced',2048,13,decodeMapOptions(0));
 expect(m.id).toBe('procedural-v13-balanced-2048-42-o0');expect(getPlayableMap(m.id)).toEqual(m);
 expect(m.map.landforms).toEqual([]);expect(m.map.features?.some(f=>f.appearance==='forest'||f.waterBody==='sea'||f.waterBody==='river'||f.kind==='bridge')).toBe(false);
 expect(validateFreshMap(m)).toBe(true);
 for(const suffix of ['16','01','-1','NaN'])expect(getPlayableMap(`procedural-v13-balanced-2048-42-o${suffix}`)).toBeUndefined();
});
it('sea is independent of the regional preset and rivers/forest/relief can be enabled',()=>{
 const m=generateProceduralMap(41,'urban',2048,13,decodeMapOptions(15));
 expect(m.map.features?.some(f=>f.waterBody==='sea')).toBe(true);
 expect(m.map.features?.some(f=>f.waterBody==='river')).toBe(true);
 expect(m.map.features?.some(f=>f.appearance==='forest')).toBe(true);
 expect(m.map.landforms?.length).toBeGreaterThan(0);
});

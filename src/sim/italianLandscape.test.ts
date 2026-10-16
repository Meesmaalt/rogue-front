import {expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {validateFreshMap} from './freshMap';
it('v14 adds deterministic Mediterranean agricultural districts and preserves a replayable, playable map',()=>{
 const m=generateProceduralMap(43,'balanced',2048,14),features=m.map.features!;expect(new Set(features.map(f=>f.landUse).filter(Boolean)).size).toBe(4);expect(features.filter(f=>f.landUse).length).toBeGreaterThan(20);expect(features.some(f=>f.id.startsWith('italian-farm-'))).toBe(true);expect(getPlayableMap(m.id)).toEqual(m);expect(validateFreshMap(m)).toBe(true);
},30000);

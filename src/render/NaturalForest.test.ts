import {afterEach,expect,it} from 'vitest';
import {sampleForest} from './Terrain';
import {generateProceduralMap} from '../sim/proceduralMap';
import {pointInFeature} from '../sim/mapFeatures';
import {resetHeightmap,setMapSize,setBases,setTerrainProfile,setProceduralSeed} from '../sim/heightmap';
afterEach(resetHeightmap);
it('dense natural canopy stays within its placement budget and keeps airfield aprons clear',()=>{
 const m=generateProceduralMap(62510,'balanced',4096),features=m.map.features!;setMapSize(4096);setBases(m.map.bases);setProceduralSeed(m.seed);setTerrainProfile(m.map.terrainProfile,m.map.landforms);
 const sparse=[...sampleForest(features,65000).values()].flat(),dense=[...sampleForest(features).values()].flat();expect(dense.length).toBeGreaterThan(sparse.length*1.4);expect(dense.length).toBeLessThanOrEqual(130000);
 const yards=features.filter(f=>f.id.startsWith('base-airfield-yard-'));for(const p of dense)expect(yards.some(f=>pointInFeature(p.x,p.z,f,2))).toBe(false);
},20000);

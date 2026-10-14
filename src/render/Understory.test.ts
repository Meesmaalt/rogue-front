import {expect,it} from 'vitest';
import {sampleForest,sampleUnderstory} from './Terrain';
import {pointInFeature,type MapFeatureDef} from '../sim/mapFeatures';
it('understory is seeded, bounded and stays within forest away from roads and water',()=>{
 const features:MapFeatureDef[]=[{id:'forest',kind:'cover',appearance:'forest',x:0,z:0,width:120,depth:120,height:8,density:.9},{id:'road',kind:'road',x:0,z:0,width:7,depth:120},{id:'pond',kind:'water',x:30,z:30,width:15,depth:15}];
 const trees=[...sampleForest(features).values()].flat(),shrubs=sampleUnderstory(trees,features,75);
 expect(shrubs.length).toBeGreaterThan(10);expect(shrubs.length).toBeLessThanOrEqual(75);expect(sampleUnderstory(trees,features,75)).toEqual(shrubs);
 for(const p of shrubs){expect(pointInFeature(p.x,p.z,features[0])).toBe(true);expect(features.slice(1).some(f=>pointInFeature(p.x,p.z,f,2))).toBe(false);}
});

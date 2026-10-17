import {expect,it} from 'vitest';
import {enrichRegionalCharacter} from './regionalCharacter';
import {generateProceduralMap} from './proceduralMap';
import {REGION_IDS,regionDefaults} from './regions';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
it.each(REGION_IDS)('%s has bank/footslope accents, regional settlement silhouettes and deterministic character',region=>{
 const m=generateProceduralMap(43,'balanced',2048,18,{...regionDefaults(region),layout:2}),f=m.map.features!;
 expect(generateProceduralMap(43,'balanced',2048,18,{...regionDefaults(region),layout:2})).toEqual(m);
 const patches=f.filter(f=>f.landscape),hearts=f.filter(f=>f.landmark);
 expect(patches.length).toBeGreaterThan(4);expect(patches.length).toBeLessThanOrEqual(110);expect(hearts.length).toBeGreaterThan(0);
 const expected={italy:'square',siberia:'timber',canyon:'rest',desert:'well'}[region];expect(hearts.every(f=>f.landmark===expected)).toBe(true);
 for(const p of patches){expect(p.blocksMovement).toBe(false);expect(f.some(o=>o!==p&&(['road','water','building','bridge'].includes(o.kind)||o.appearance==='yard'||o.appearance==='field')&&pointInFeature(p.x,p.z,o,3))).toBe(false);}
 const houses=f.filter(f=>f.kind==='building'&&f.id.startsWith('town-'));expect(houses.length).toBeGreaterThan(35);expect(new Set(houses.map(h=>h.facadeColor)).size).toBeGreaterThan(1);
 if(region==='desert')expect(houses.every(h=>h.roofStyle==='flat')).toBe(true);
});
it('dry bare terrain does not invent water or woodland accents, and reservations remain untouched',()=>{
 const f:MapFeatureDef[]=[];enrichRegionalCharacter(43,2048,'desert',f,[{x:0,z:0,width:100,depth:100,height:30,shape:'dune'}],[{x:0,z:0,r:300}],false);expect(f).toEqual([]);
});

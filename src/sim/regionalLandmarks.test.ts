import {afterEach,expect,it} from 'vitest';
import {generateProceduralMap} from './proceduralMap';
import {REGION_IDS,regionDefaults} from './regions';
import {resetHeightmap} from './heightmap';
import {pointInFeature} from './mapFeatures';
import {footprintsOverlap} from './settlements';
afterEach(resetHeightmap);
it.each(REGION_IDS)('%s landmarks are paired physical footprints with connected dry access and reserved working space',region=>{
 for(const layout of [0,1,2] as const){
  const m=generateProceduralMap(43,'balanced',2048,18,{...regionDefaults(region),layout}),f=m.map.features!,marks=f.filter(f=>f.landmarkStructure);
  expect(marks.length).toBeGreaterThanOrEqual(2);expect(marks.length%2).toBe(0);expect(marks.length).toBeLessThanOrEqual(4);
  for(let i=0;i<marks.length;i+=2){expect(marks[i].x).toBe(-marks[i+1].x);expect(marks[i].z).toBe(-marks[i+1].z);}
  for(const mark of marks){
   expect(mark.kind).toBe('building');expect(mark.garrisonable).toBe(false);
   expect(f.some(o=>(o.kind==='water'||o.kind==='bridge'||o.kind==='road')&&footprintsOverlap(mark,o,1))).toBe(false);
   const tracks=f.filter(t=>t.id.startsWith(mark.id.replace('regional-landmark-','regional-landmark-access-')));expect(tracks.length).toBeGreaterThan(0);
   expect(tracks.some(track=>f.some(r=>r.kind==='road'&&r.roadClass==='secondary'&&footprintsOverlap(track,r,1)))).toBe(true);
   expect(tracks.some(track=>f.some(r=>(r.kind==='water'||r.kind==='building')&&r!==mark&&footprintsOverlap(track,r,1)))).toBe(false);
   for(const base of m.map.bases)expect(Math.hypot(base.x-mark.x,base.z-mark.z)).toBeGreaterThan(150);
   expect(m.map.resources.some(r=>pointInFeature(r.x,r.z,mark,25))).toBe(false);
  }
 }
},30000);

import {generateProceduralMap} from './proceduralMap';
import {setMapSize,setBases,setProceduralSeed,setTerrainProfile,setTerrainFeatures,ensureHeightCache} from './heightmap';
import { describe, expect, it, beforeEach } from "vitest";
import { BASES, MAP_SIZE, heightAt, resetHeightmap } from "./heightmap";

describe("heightAt", () => {
  beforeEach(resetHeightmap);
  it("on baaside keskel tasane", () => {
    for (const b of BASES) expect(Math.abs(heightAt(b.x, b.z))).toBeLessThan(0.01);
  });
  it("on deterministlik", () => {
    expect(heightAt(12.5, -40.2)).toBe(heightAt(12.5, -40.2));
  });
  it("kaardi serv on mägine", () => {
    expect(heightAt(MAP_SIZE*.51, 0)).toBeGreaterThan(10);
  });
});

it('spatial hydrology keeps reference cached heights at river, bank and bridge samples',()=>{
 resetHeightmap();const m=generateProceduralMap(42,'balanced',2048,11);setMapSize(2048);setBases(m.map.bases);setProceduralSeed(m.seed);setTerrainProfile(m.map.terrainProfile,m.map.landforms);setTerrainFeatures(m.map.features!);ensureHeightCache();
 const points=[...Array.from({length:500},(_,i)=>({x:Math.sin(i*3.77)*2048*.49,z:Math.cos(i*5.13)*2048*.49})),...m.map.features!.filter(f=>f.kind==='water'||f.kind==='bridge').flatMap(f=>[{x:f.x,z:f.z},{x:f.x+13,z:f.z+5},{x:f.x-24,z:f.z-17}])];
 const indices=[0, 1, 2, 3, 500, 501, 502, 560, 561, 562, 692, 693, 694],expected=[6.911671633720398, 5.604956873838502, 5.097036655053909, 5.148242899647996, -3.200000047683716, -3.188760278701782, 10.476645405255365, -3.200000047683716, -3.190797493159772, 1.3329907585457037, -3.200000047683716, -3.200000047683716, -3.200000047683716];
 indices.forEach((index,i)=>expect(heightAt(points[index].x,points[index].z)).toBe(expected[i]));resetHeightmap();
});

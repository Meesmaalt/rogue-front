import {afterEach,expect,it} from "vitest";
import {World} from "../sim/World";
import {resetHeightmap} from "../sim/heightmap";
import {GARRISON_RULES,garrisonWeaponUsable,garrisonWeaponAllowed} from "../sim/garrison";
import {weaponSpec} from "../sim/systems/combat";
import {weaponSector,writeRangeVertices} from "./RangeOverlay";
afterEach(resetHeightmap);
it("range geometry follows the garrison firing sector and retains the inner dead zone",()=>{
 const w=new World(4,false),u=w.spawn("atInf",0,0,0);u.garrisonId="house";u.garrisonFacing=Math.PI/2;
 const sector=weaponSector(u);expect(sector.arc).toBe(GARRISON_RULES.firingArc);
 const points=new Float32Array(160*2*2*3),count=writeRangeVertices(points,0,0,80,12,sector.facing,sector.arc);
 expect(count).toBe(484);
 for(let i=0;i<count;i++){
  const x=points[i*3],z=points[i*3+2],r=Math.hypot(x,z),a=Math.atan2(x,z);
  expect(Math.abs(a-sector.facing)).toBeLessThanOrEqual(sector.arc/2+.00001);
  expect(Math.min(Math.abs(r-80),Math.abs(r-12))).toBeLessThan(.00001);
 }
 const target=w.spawn("tank",1,80,0);expect(garrisonWeaponAllowed(u,weaponSpec(u,1),target)).toBe(true);
 target.x=-80;expect(garrisonWeaponAllowed(u,weaponSpec(u,1),target)).toBe(false);
});
it("normal range remains a circle while unsupported garrison weapons have no usable sector",()=>{
 const w=new World(4,false),u=w.spawn("mortar",0,0,0),points=new Float32Array(1920);
 expect(weaponSector(u).arc).toBeCloseTo(Math.PI*2);
 expect(writeRangeVertices(points,0,0,80,0,0,Math.PI*2)).toBe(320);
 u.garrisonId="house";expect(garrisonWeaponUsable(u,weaponSpec(u))).toBe(false);
 const roof=w.spawn("manpad",0,0,0);roof.garrisonId="house";expect(garrisonWeaponUsable(roof,weaponSpec(roof))).toBe(true);
});

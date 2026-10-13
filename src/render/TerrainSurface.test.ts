import {afterEach,expect,it} from "vitest";
import {createRiverSurface} from "./Terrain";
import {resetHeightmap} from "../sim/heightmap";
import {pointInFeature,type MapFeatureDef} from "../sim/mapFeatures";
afterEach(resetHeightmap);
it("overlapping river pieces render the union once with upward normals and shared world UVs",()=>{
  const features:MapFeatureDef[]=[
    {id:"north",kind:"water",x:0,z:0,width:10,depth:40,surfaceHeight:-.8},
    {id:"east",kind:"water",x:0,z:0,width:10,depth:40,rotation:Math.PI/2,surfaceHeight:-.8},
  ];
  const geometry=createRiverSurface(features),p=geometry.getAttribute("position"),uv=geometry.getAttribute("uv"),index=geometry.index!;
  let area=0;
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    const cross=(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a))-(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a));
    expect(cross).toBeGreaterThanOrEqual(0);area+=cross/2;
    const x=(p.getX(a)+p.getX(b)+p.getX(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
    expect(features.some(f=>pointInFeature(x,z,f,.001))).toBe(true);
  }
  expect(area).toBeCloseTo(700,2);
  for(let i=0;i<p.count;i++){expect(p.getY(i)).toBeCloseTo(-.8);expect(uv.getX(i)).toBeCloseTo(p.getX(i)/6);expect(uv.getY(i)).toBeCloseTo(p.getZ(i)/12);}
  geometry.dispose();
});
it("separate channels stay separate and broad ocean footprints use their existing renderer",()=>{
  const features:MapFeatureDef[]=[
    {id:"a",kind:"water",x:-30,z:0,width:10,depth:40,surfaceHeight:0},
    {id:"b",kind:"water",x:30,z:0,width:10,depth:40,surfaceHeight:0},
    {id:"sea",kind:"water",x:0,z:0,width:200,depth:200,surfaceHeight:0},
  ];
  const geometry=createRiverSurface(features),p=geometry.getAttribute("position");
  expect(p.count).toBeGreaterThan(0);
  for(let i=0;i<p.count;i++)expect(Math.abs(p.getX(i))).toBeGreaterThanOrEqual(25);
  geometry.dispose();
});

import {afterEach,expect,it} from "vitest";
import {createRiverSurface,createCanopyGeometry,createLandscapeBackdrop,sampleForest} from "./Terrain";
import {resetHeightmap,MAP_SIZE,groundHeightAt} from "../sim/heightmap";
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
it("canopy LODs have bounded geometry, finite self-shading and an irregular silhouette",()=>{
  const counts:number[]=[];
  for(const [width,height] of [[12,8],[8,5],[6,3]]){
    const g=createCanopyGeometry(width,height),p=g.getAttribute("position"),colors=g.getAttribute("color");
    counts.push(g.index!.count/3);
    expect([...p.array,...colors.array,...g.getAttribute("normal").array].every(Number.isFinite)).toBe(true);
    expect(Math.max(...Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getY(i),p.getZ(i))))).toBeGreaterThan(1.02);
    expect(Math.min(...colors.array)).toBeGreaterThan(.4);g.dispose();
  }
  expect(counts[0]).toBeLessThanOrEqual(180);expect(counts[1]).toBeLessThanOrEqual(80);expect(counts[2]).toBeLessThanOrEqual(24);
});
it("ground shade and canopy share reproducible placements and shorter hedge trees",()=>{
  const f:MapFeatureDef={id:"trees",kind:"cover",appearance:"forest",x:0,z:0,width:64,depth:64,height:8};
  const layout=sampleForest([f]);expect([...layout]).toEqual([...sampleForest([f])]);
  const trees=[...layout.values()].flat(),hedge=[...sampleForest([{...f,height:3.4}]).values()].flat();
  expect(trees.length).toBeGreaterThan(0);expect(hedge.length).toBeGreaterThan(0);
  expect(Math.max(...hedge.map(p=>p.s))).toBeLessThan(Math.min(...trees.map(p=>p.s)));
});
it("the distant landscape is outside playable bounds with an exactly grounded inner seam",()=>{
  const mesh=createLandscapeBackdrop(),p=mesh.geometry.getAttribute("position"),half=MAP_SIZE/2;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);expect(Math.max(Math.abs(x),Math.abs(z))).toBeGreaterThanOrEqual(half-.001);
    if(Math.abs(Math.max(Math.abs(x),Math.abs(z))-half)<.001)expect(p.getY(i)).toBeCloseTo(groundHeightAt(x,z),3);
  }
  expect(mesh.geometry.index!.count/3).toBeLessThan(7000);mesh.geometry.dispose();
  const coast=createLandscapeBackdrop([{id:"sea",kind:"water",x:-half-50,z:0,width:200,depth:MAP_SIZE+800,surfaceHeight:.7}]);
  const water=coast.geometry.getAttribute("position");
  for(let i=0;i<water.count;i++)if(water.getX(i)<-half)expect(water.getY(i)).toBeCloseTo(.7);
  coast.geometry.dispose();
});

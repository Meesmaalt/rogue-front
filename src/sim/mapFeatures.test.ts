import {expect,it} from 'vitest';
import {MapFeatureIndex,pointInFeature,type MapFeatureDef} from './mapFeatures';
it('retains exact padded hits and source order for rotated narrow roads and sea',()=>{
 const features:MapFeatureDef[]=[
  {id:'road',kind:'road',x:0,z:0,width:8,depth:820},
  {id:'diagonal',kind:'road',x:90,z:-70,width:7,depth:700,rotation:.73},
  {id:'sea',kind:'water',x:-310,z:0,width:420,depth:1024},
 ];
 const index=new MapFeatureIndex(features);
 for(let x=-520;x<520;x+=13)for(let z=-520;z<520;z+=17){
  const exact=features.filter(f=>pointInFeature(x,z,f,3));
  expect(index.at(x,z).filter(f=>pointInFeature(x,z,f,3))).toEqual(exact);
 }
 // A long narrow road no longer pollutes distant inland bins.
 expect(index.at(300,300).some(f=>f.id==='road')).toBe(false);
 expect(index.at(6.9,400).some(f=>f.id==='road')).toBe(true);
});

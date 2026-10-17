import * as THREE from 'three';
import {CharacterGeometry} from './CharacterGeometry';
import character from '../data/region-character.json';
import {REGIONS,type RegionId} from '../sim/regions';
export const SCENERY_KINDS=['boulder','slab','scrub','grass','reed','cactus','stump','log'] as const;
export type SceneryKind=typeof SCENERY_KINDS[number];
/** One shared, vertex-painted mesh per silhouette; never a scene object per twig. */
export function createSceneryGeometry(kind:SceneryKind,region:RegionId):THREE.BufferGeometry{
 const g=new CharacterGeometry(),p=character[region],stone=parseInt(REGIONS[region].rock.slice(1),16),plant=p.plantTint,timber=0x787568;
 if(kind==='boulder'){
  const rock=new THREE.IcosahedronGeometry(1,0),positions=rock.getAttribute('position');
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),scale=.83+Math.sin(x*7+z*5+y*3)*.13;positions.setXYZ(i,x*scale,y*.7*scale,z*scale);}
  rock.computeVertexNormals();g.add(rock,stone,0,.55,0);
 }else if(kind==='slab'){
  for(let i=0;i<3;i++)g.add(new THREE.CylinderGeometry(.85-i*.12,.95-i*.12,.24,5),stone,Math.sin(i*2)*.09,.12+i*.21,Math.cos(i)*.07,0,i*.15,0);
 }else if(kind==='log'){
  g.add(new THREE.CylinderGeometry(.17,.24,2.4,6),timber,0,.25,0,0,0,Math.PI/2);
  g.beam(new THREE.Vector3(.25,.3,0),new THREE.Vector3(.5,.7,.2),.09,timber);
 }else if(kind==='stump'){
  g.add(new THREE.CylinderGeometry(.17,.3,1.05,6),timber,0,.52,0);
  for(const sign of [-1,1])g.beam(new THREE.Vector3(0,.75,0),new THREE.Vector3(sign*.4,1.3,sign*.18),.12,timber);
  if(region==='siberia')g.add(new THREE.ConeGeometry(.3,.13,6),0xc8d1d2,0,1.05,0);
 }else if(kind==='cactus'){
  g.add(new THREE.CylinderGeometry(.16,.22,1.8,7),plant,0,.9,0);g.add(new THREE.SphereGeometry(.16,7,4),plant,0,1.8,0);
  for(const [side,y] of [[-1,.65],[1,1.05]]){
   g.beam(new THREE.Vector3(0,y,0),new THREE.Vector3(side*.5,y,0),.16,plant);
   g.add(new THREE.CylinderGeometry(.09,.12,.65,6),plant,side*.5,y+.3,0);
  }
 }else if(kind==='scrub'){
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3,geometry=new THREE.IcosahedronGeometry(1,0);geometry.scale(.42,.43,.42);
   g.add(geometry,plant,Math.cos(a)*.28,.35+Math.sin(i)*.12,Math.sin(a)*.28);
  }
 }else{
  const reed=kind==='reed',color=reed?p.reedTint:plant;
  for(let i=0;i<5;i++){
   const a=i*2.4,x=Math.cos(a)*.16,z=Math.sin(a)*.16,height=(reed?1.4:.6)*(1-i*.09);
   const tip=new THREE.Vector3(x+Math.cos(a)*.32,height,z+Math.sin(a)*.32);
   g.beam(new THREE.Vector3(x,0,z),tip,reed?.035:.065,color);
   if(reed)g.add(new THREE.CylinderGeometry(.045,.055,.28,4),0x8d805d,tip.x,tip.y,tip.z);
  }
 }
 return g.finish();
}

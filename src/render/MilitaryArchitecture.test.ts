import {updateWarehouseVisual} from './WarehouseVisual';
import type {Entity} from '../sim/types';
import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createBuildingModel,createMetricAirfieldStructures} from './Architecture';
afterEach(()=>vi.unstubAllGlobals());
it('field-base models share textured materials and preserve distinct bounded silhouettes',()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{},fillRect:()=>{},drawImage:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},fill:()=>{},fillStyle:''})})});
 const sizes=new Set<string>();
 for(const kind of ['hq','supply','factory','barracks','airbase','helipad','landCommand','airCommand','seaCommand','landStrategy','airStrategy','seaStrategy','generator','refinery','radar','combatEngineer','shipyard'] as const){
  const result=createBuildingModel(kind,0,'usa')!;expect(result).not.toBeNull();expect(result.group.userData.militarySilhouette).toBe(kind);expect(result.group.userData.facilityLabel).toBeTruthy();if(kind==='helipad')expect(result.group.userData.facilityDetails).toContain('H-mark');if(kind==='factory')expect(result.group.userData.facilityDetails).toContain('gantry');
  const size=new THREE.Box3().setFromObject(result.group).getSize(new THREE.Vector3());sizes.add(size.toArray().map(n=>n.toFixed(1)).join('/'));
  expect(result.group.children.filter(o=>!o.userData.dynamic).length).toBeLessThanOrEqual(12);
  if(kind==='supply'){const door=result.group.getObjectByName('WarehouseDoor')!;expect(door).toBeDefined();const closed=new THREE.Box3().setFromObject(door);updateWarehouseVisual(result.group,{kind,warehouseDoor:1} as Entity);const open=new THREE.Box3().setFromObject(door);expect(open.max.y).toBeCloseTo(closed.max.y,2);expect(open.max.y-open.min.y).toBeLessThan(.01);}
  result.group.traverse(o=>{if(o instanceof THREE.Mesh){expect([...o.geometry.attributes.position.array].every(Number.isFinite)).toBe(true);expect((o.material as THREE.Material).userData.sharedArt).toBe(true);o.geometry.dispose();}});
 }
 expect(sizes.size).toBeGreaterThan(7);
 const field=createMetricAirfieldStructures({x:0,z:0,y:0,heading:0,team:0} as Entity),bounds=new THREE.Box3().setFromObject(field);
 expect(bounds.min.x).toBeGreaterThan(45); // Keep simulated aircraft parking and taxi access empty.
 expect(bounds.min.z).toBeLessThan(-60);expect(bounds.max.z).toBeGreaterThan(55);
 expect(field.children.filter(o=>!o.userData.dynamic).length).toBeLessThanOrEqual(10);expect(field.getObjectByName('WarehouseDoor')).toBeDefined();expect(field.userData.militarySilhouette).toBe('airbase');
});

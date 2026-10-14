import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {createBuildingModel} from './Architecture';
afterEach(()=>vi.unstubAllGlobals());
it('field-base models share textured materials and preserve distinct bounded silhouettes',()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{},fillRect:()=>{},drawImage:()=>{},beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},fill:()=>{},fillStyle:''})})});
 const sizes=new Set<string>();
 for(const kind of ['hq','supply','factory','barracks','airbase','helipad','landCommand','airCommand','seaCommand','landStrategy','airStrategy','seaStrategy','generator','refinery','radar','combatEngineer','shipyard'] as const){
  const result=createBuildingModel(kind,0,'usa')!;expect(result).not.toBeNull();expect(result.group.userData.militarySilhouette).toBe(kind);
  const size=new THREE.Box3().setFromObject(result.group).getSize(new THREE.Vector3());sizes.add(size.toArray().map(n=>n.toFixed(1)).join('/'));
  expect(result.group.children.length).toBeLessThanOrEqual(10);
  result.group.traverse(o=>{if(o instanceof THREE.Mesh){expect([...o.geometry.attributes.position.array].every(Number.isFinite)).toBe(true);expect((o.material as THREE.Material).userData.sharedArt).toBe(true);o.geometry.dispose();}});
 }
 expect(sizes.size).toBeGreaterThan(7);
});

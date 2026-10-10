import {afterEach,expect,it,vi} from "vitest";
import * as THREE from "three";
import {batchStaticScene,createCivilianBuilding} from "./Architecture";

afterEach(()=>vi.unstubAllGlobals());
it("keeps facade materials and roof silhouette across civilian LODs",()=>{
  // Geometry-only check; no WebGL or browser visual-quality claim.
  vi.stubGlobal("document",{createElement:()=>({width:0,height:0,getContext:()=>({
    createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:()=>{},fillRect:()=>{},fillStyle:"",
  })})});
  for(const height of [3.6,6.4]){
    const near=createCivilianBuilding(6.4,7.2,height,3),far=createCivilianBuilding(6.4,7.2,height,3,true);
    const nearBounds=new THREE.Box3().setFromObject(near),farBounds=new THREE.Box3().setFromObject(far);
    expect(Math.abs(nearBounds.max.y-farBounds.max.y)).toBeLessThan(.2);
    const facade=(g:THREE.Group)=>g.children.find(o=>o instanceof THREE.Mesh&&(o.material as THREE.MeshStandardMaterial).map?.repeat.x===1) as THREE.Mesh;
    expect(facade(near).material).toBe(facade(far).material);
    expect(near.children.length).toBeLessThanOrEqual(6);
    expect(farBounds.max.y).toBeGreaterThan(height);
    for(const g of [near,far])g.traverse(o=>{if(o instanceof THREE.Mesh){expect([...o.geometry.attributes.position.array].every(Number.isFinite)).toBe(true);o.geometry.dispose();}});
  }
});
it("batches bridge parts while retaining destruction identity and world bounds",()=>{
  const bridge=new THREE.Group();bridge.userData.bridgeId="crossing";
  const material=new THREE.MeshStandardMaterial();
  for(let i=0;i<20;i++){
    const post=new THREE.Mesh(new THREE.BoxGeometry(.3,1,.3),material);
    post.position.set(3,1,i*2);bridge.add(post);
  }
  const before=new THREE.Box3().setFromObject(bridge),result=batchStaticScene(bridge);
  expect(result.userData.bridgeId).toBe("crossing");expect(result.children).toHaveLength(1);
  const after=new THREE.Box3().setFromObject(result);
  expect(after.min.distanceTo(before.min)).toBeLessThan(1e-5);
  expect(after.max.distanceTo(before.max)).toBeLessThan(1e-5);
  const mesh=result.children[0] as THREE.Mesh;mesh.geometry.dispose();material.dispose();
});

import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {ConstructionSite} from './ConstructionSite';
import {World} from '../sim/World';
import policy from '../data/construction-policy.json';
it('reveals actual building height in stages, uses bounded scaffold batches and restores shared materials',()=>{
 const parent=new THREE.Group(),model=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:0x557766});material.userData.sharedArt=true;
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(8,10,6),material);mesh.position.y=5;model.add(mesh);parent.add(model);parent.position.y=12;
 const e=new World(2,false,[],[],[],false).spawn('factory',0,0,0);e.y=12;
 const site=new ConstructionSite(parent,[model]);site.update(e,0,true);
 const temporary=mesh.material as THREE.Material;expect(temporary).not.toBe(material);expect(material.clippingPlanes).toBeNull();expect(temporary.clippingPlanes?.[0].constant).toBeCloseTo(11.8);expect(parent.scale.y).toBe(1);
 site.update(e,.5,true);expect(temporary.clippingPlanes?.[0].constant).toBeGreaterThan(12);expect(temporary.clippingPlanes?.[0].constant).toBeLessThan(22);
 const scaffold=site.group.children.find(o=>o instanceof THREE.Group&&o.children.length===2)!;expect(scaffold.visible).toBe(true);
 site.update(e,.5,false);expect(scaffold.visible).toBe(false);
 site.update(e,policy.visual.scaffoldEnd,true);expect(scaffold.visible).toBe(false);
 const disposed=vi.spyOn(temporary,'dispose');site.dispose();expect(disposed).toHaveBeenCalledOnce();expect(mesh.material).toBe(material);expect(parent.children).toEqual([model]);
});
it('shares temporary clones across model LODs and handles multi-material geometry',()=>{
 const parent=new THREE.Group(),a=new THREE.Group(),b=new THREE.Group(),material=new THREE.MeshBasicMaterial(),other=new THREE.MeshStandardMaterial();
 const near=new THREE.Mesh(new THREE.BoxGeometry(),[material,other]),far=new THREE.Mesh(new THREE.BoxGeometry(),material);a.add(near);b.add(far);parent.add(a,b);
 const site=new ConstructionSite(parent,[a,b]);expect((near.material as THREE.Material[])[0]).toBe(far.material);site.dispose();expect(near.material).toEqual([material,other]);expect(far.material).toBe(material);
});

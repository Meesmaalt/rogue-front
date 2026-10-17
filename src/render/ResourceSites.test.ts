import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
import {ResourceSites} from './ResourceSites';
vi.mock('./ResourceGround',()=>({resourceGroundTexture:()=>new THREE.Texture()}));
afterEach(()=>{resetHeightmap();vi.unstubAllGlobals();});
it('industry work signals follow ownership and production but reveal no state outside vision',()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({clearRect:()=>{},fillRect:()=>{},fillText:()=>{}})})});
 const w=new World(43,false,[{x:0,z:0,amount:150,radius:14,facility:'depot',controlledBy:0,active:false}],[],[],false),scene=new THREE.Scene(),site=new THREE.Group();site.name='Industry:resource-facility-0';const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18),new THREE.MeshBasicMaterial());lamp.name='IndustrySignal';site.add(lamp);scene.add(site);const view=new ResourceSites(scene,w);
 view.sync(w);expect(lamp.visible).toBe(true);const idle=lamp.material.color.getHex();w.resourcePoints[0].active=true;w.time++;view.sync(w);expect(lamp.material.color.getHex()).not.toBe(idle);
 w.resourcePoints[0].disabledUntil=w.time+10;w.time++;view.sync(w);const disabled=lamp.material.color.getHex();expect(disabled).not.toBe(idle);
 w.resourcePoints[0].controlledBy=1;w.time++;view.sync(w);expect(lamp.visible).toBe(false);
});

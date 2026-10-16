import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {DepotPads} from './DepotPads';
import {World} from '../sim/World';
import {resetHeightmap,setBases,setMapSize} from '../sim/heightmap';
import {availableDepotPads} from '../sim/depotPads';
afterEach(resetHeightmap);
it('a depot upgrade updates navigation, adds its pad and replaces the old fence with a bounded transition',()=>{
 setMapSize(512);const bases=[{x:0,z:0,r:220},{x:220,z:220,r:20}];setBases(bases);const w=new World(18,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-80,0);w.spawn('generator',0,0,-50);const depot=w.spawn('supply',0,0,0);depot.heading=0;w.teamCredits[0]=w.teamResources[0]=5000;w.nav.syncBuildings(w.entities);
 const scene=new THREE.Scene(),view=new DepotPads(scene);view.onRebuild=vi.fn();view.sync(w);expect(view.group.getObjectByName('DepotHelicopterPad-1')).toBeUndefined();expect(w.upgradeSupplyDepot(0,depot.id)).toBe(true);w.tick(1/30);w.time+=1;view.sync(w);expect(availableDepotPads(w,depot)).toHaveLength(2);expect(view.group.getObjectByName('DepotHelicopterPad-1')).toBeDefined();expect(view.onRebuild).toHaveBeenCalledTimes(1);
 const fence=view.group.getObjectByName('DepotCompoundLevel2')!;expect(fence.children[0].scale.y).toBeLessThan(.1);w.time+=3;view.sync(w);expect(fence.children[0].scale.y).toBe(1);expect(scene.children[1].children).toHaveLength(0);
});

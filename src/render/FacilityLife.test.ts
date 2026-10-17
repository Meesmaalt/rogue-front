import {afterEach,expect,it} from 'vitest';
import {World} from '../sim/World';
import {resetHeightmap,setBases} from '../sim/heightmap';
import {createFacilityLife,updateFacilityLife} from './FacilityLife';
afterEach(resetHeightmap);
it('facility signals follow real power, production and construction states without scaling the building',()=>{
 const bases=[{x:-60,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(152,false,[],[],bases,false);w.networkMode=true;w.spawn('hq',0,-60,0);w.spawn('landCommand',0,-50,-35);const power=w.spawn('generator',0,-90,-35),producer=w.spawn('barracks',0,-25,0),life=createFacilityLife(producer);
 updateFacilityLife(life,producer,w,50);expect(life.state).toBe('ready');producer.productionQueue.push('inf');w.time+=1;updateFacilityLife(life,producer,w,50);expect(life.state).toBe('working');
 const load=Array.from({length:12},(_,i)=>w.spawn('factory',0,100+i*15,100));power.dead=true;w.time+=1;updateFacilityLife(life,producer,w,50);expect(life.state).toBe('blocked');
 load.forEach(e=>e.dead=true);power.dead=false;w.time+=1;producer.productionProgress=w.unitDefinition('inf',0).buildTime;updateFacilityLife(life,producer,w,50);expect(life.state).toBe('blocked');
 producer.underConstruction=true;w.time+=1;updateFacilityLife(life,producer,w,50);expect(life.root.visible).toBe(false);producer.underConstruction=false;updateFacilityLife(life,producer,w,300);expect(life.root.visible).toBe(false);expect(life.root.scale.toArray()).toEqual([1,1,1]);
});

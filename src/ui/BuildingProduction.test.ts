import {afterEach,expect,it} from 'vitest';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
import {selectedProductionBuilding,buildingOrderState} from './BuildingProduction';
afterEach(resetHeightmap);
it('orders belong to the selected factory and never fall through to the least busy one',()=>{
 const world=new World(81,false,[],[],[],false),first=world.spawn('factory',0,10,0),chosen=world.spawn('factory',0,40,0),enemy=world.spawn('factory',1,80,0);
 first.productionQueue=[];chosen.productionQueue=['tank'];
 expect(selectedProductionBuilding(world,new Set())).toBeUndefined();expect(selectedProductionBuilding(world,new Set([enemy.id]))).toBeUndefined();
 const selected=selectedProductionBuilding(world,new Set([chosen.id]));expect(selected).toBe(chosen);
 expect(buildingOrderState(world,selected,'inf',true).visible).toBe(false);
 expect(buildingOrderState(world,undefined,'tank',true).visible).toBe(false);
 world.spawn('hq',0,0,0);chosen.underConstruction=true;
 expect(buildingOrderState(world,selected,'tank',true).reason).toContain('ehitamisel');
 chosen.underConstruction=false;chosen.productionQueue=Array(6).fill('tank');
 expect(buildingOrderState(world,selected,'tank',true).reason).toContain('täis');
});
it('a visible order explains operational requirements instead of silently spending money',()=>{
 const world=new World(82,false,[],[],[],false);world.spawn('hq',0,0,0);const factory=world.spawn('factory',0,30,0);
 expect(buildingOrderState(world,factory,'tank',false).reason).toContain('peatatud');
 const result=buildingOrderState(world,factory,'tank',true);expect(result.visible).toBe(true);expect(result.reason.length).toBeGreaterThan(0);
 expect(world.pending).toHaveLength(0);expect(factory.productionQueue).toHaveLength(0);
});

import {afterEach,expect,it} from 'vitest';
import {World} from '../World';
import {resetHeightmap} from '../heightmap';
import {isTacticallySupplied,tacticalSupplyNodes} from './tacticalSupply';
afterEach(()=>resetHeightmap());
it('a refresh-wide supply view preserves stock, team and airborne rules',()=>{
 const w=new World(12,false,[],[],[{x:0,z:0,r:50},{x:200,z:200,r:50}],false);w.networkMode=true;
 const depot=w.spawn('supply',0,0,0),soldier=w.spawn('inf',0,10,0),enemy=w.spawn('inf',1,10,0),heli=w.spawn('heli',0,10,0);
 depot.ammoStock=30;depot.fuelStock=0;heli.motionSpeed=10;const nodes=tacticalSupplyNodes(w,0);
 for(const u of [soldier,heli])expect(isTacticallySupplied(w,u,nodes)).toBe(isTacticallySupplied(w,u));
 expect(isTacticallySupplied(w,soldier,nodes)).toBe(true);expect(isTacticallySupplied(w,enemy,nodes)).toBe(false);expect(isTacticallySupplied(w,heli,nodes)).toBe(false);
 depot.ammoStock=0;expect(isTacticallySupplied(w,soldier,nodes)).toBe(false);
 depot.disabledUntil=w.time+10;expect(tacticalSupplyNodes(w,0)).not.toContain(depot);
});

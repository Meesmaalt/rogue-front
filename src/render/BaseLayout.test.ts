import {afterEach,expect,it} from 'vitest';
import {World} from '../sim/World';
import {resetHeightmap,setMapSize,setBases} from '../sim/heightmap';
import {depotCrewPoint} from '../sim/baseLayout';
import {depotSeats,depotBays,seatWorld,buildingScale} from './lounge';
import {engineerSeats} from './EngineerLounge';
import {groundRectangle} from './GroundSurface';
afterEach(resetHeightmap);
it('parked forklifts clear all seats and the driver returns to the drawn seat',()=>{
 const anchor={x:50,z:-40,heading:.7},seats=depotSeats(8),bays=depotBays(4);
 for(const bay of bays)for(const seat of seats)expect(Math.hypot(bay.x-seat.x,bay.z-seat.z)).toBeGreaterThan(3);
 for(let i=0;i<4;i++){const point=seatWorld(anchor,1,seats[i*2]);expect(depotCrewPoint(anchor,i,'rest')).toEqual({x:point.x,z:point.z});}
});
it('two engineer squads with the same id parity receive different reachable seats',()=>{
 setMapSize(4096);setBases([{x:0,z:0,r:120},{x:700,z:700,r:120}]);const w=new World(93,false,[],[],[{x:0,z:0,r:120},{x:700,z:700,r:120}],false),hq=w.spawn('hq',0,0,0),a=w.spawn('engineer',0,12,12);w.spawn('inf',0,40,40);const b=w.spawn('engineer',0,14,12);
 w.nav.syncBuildings(w.entities);for(const e of [a,b]){e.constructionCrew={homeId:hq.id,slot:e===a?0:1};e.squadMembers=e.squadMaxMembers=3;e.engineerDuty={homeId:hq.id,phase:'rest',idleFor:5};}
 const sa=engineerSeats(w,a,{},.1)!,sb=engineerSeats(w,b,{},.1)!;expect(sa.length).toBeGreaterThan(0);expect(sb.length).toBeGreaterThan(0);
 for(const p of sa)for(const q of sb)expect(Math.hypot(p.x-q.x,p.z-q.z)).toBeGreaterThan(.8);
 for(const p of [...sa,...sb])expect(w.nav.isWalkableWorld(p.x,p.z,.22)).toBe(true);
 expect(buildingScale('hq')).toBeGreaterThan(1);
});
it('weathered work surfaces fade into terrain and retain bounded detailed geometry',()=>{
 const g=groundRectangle({x:0,y:0,z:0,heading:.3},-10,10,-12,12,0x8e8876,.025,2),p=g.getAttribute('position'),c=g.getAttribute('color');
 expect(c.itemSize).toBe(4);let clear=false,solid=false;
 for(let i=0;i<p.count;i++){expect(Number.isFinite(p.getY(i))).toBe(true);if(c.getW(i)<.01)clear=true;if(c.getW(i)>.5)solid=true;}
 expect(clear&&solid).toBe(true);expect(p.count).toBeLessThan(10000);g.dispose();
});

import {afterEach,expect,it} from 'vitest';
import {wrapAngle} from './math';
import {World} from './World';
import {BATTLE_SCALE,metricUnitDefinition,aircraftMobility} from './battleScale';
import {UNITS} from './units';
import {setMapSize,setBases,resetHeightmap} from './heightmap';
import {updateUnits} from './systems/units';
import {stationAircraft,assignAirMission} from './systems/airDoctrine';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {fireProjectile} from './systems/combat';
afterEach(resetHeightmap);
function fixture(){setMapSize(4096);const bases=[{x:0,z:0,r:500},{x:1600,z:1600,r:100}];setBases(bases);const w=new World(42,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;w.metricBattle=true;w.platformRosterOnly=true;return w;}
function step(w:World){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
it('defines metre ranges without changing shared costs, damage, footprints or legacy units',()=>{
 const base=structuredClone(UNITS.tank),tank=metricUnitDefinition(UNITS.tank,'tank');expect(tank.range).toBe(2400);expect(tank.speed).toBe(12);expect(tank.radius).toBe(base.radius);expect(tank.cost).toBe(base.cost);expect(UNITS.tank).toEqual(base);
 const w=fixture(),inf=w.spawn('inf',0,0,0),a=w.spawn('artillery',0,20,0);expect(inf.def.weapons?.[0].range).toBe(500);expect(a.def.minimumRange).toBe(600);expect(a.def.range).toBe(8000);
 const enemy=w.spawn('tank',1,2000,0),u=w.spawn('tank',0,0,0);fireProjectile(w,u,enemy,u.x,u.y+2,u.z);expect(w.projectiles[0].speed).toBe(1500);expect(w.projectiles[0].flightTime).toBeLessThan(2);
});
it('ground acceleration, braking and fuel use preserve bounded motion and reach a distant destination',()=>{
 const w=fixture(),u=w.spawn('tank',0,-300,0);w.issue({type:'move',ids:[u.id],x:300,z:0});w.tick(1/30);expect(u.motionSpeed).toBeLessThan(1);const fuel=u.fuel!;
 for(let i=0;i<3000&&u.mode!=='idle';i++)w.tick(1/30);
 expect(u.mode).toBe('idle');expect(Math.hypot(u.x-300,u.z)).toBeLessThan(5);expect(u.fuel).toBeLessThan(fuel);
});
it.each([0,Math.PI*.75,-Math.PI/4])('a metric aircraft taxis, lifts off and returns with runway heading %s',heading=>{
 const w=fixture();w.spawn('hq',0,0,0);w.spawn('generator',0,20,0);const depot=w.spawn('supply',0,0,25);w.spawn('airCommand',0,-20,0);const pad=w.spawn('airbase',0,30,0);pad.heading=heading;
 const u=w.spawn('fighter',0,pad.x,pad.z);stationAircraft(w,u,pad);assignAirMission(u,'cap',{x:500,z:800});step(w);expect(u.airState).toBe('taxi');
 let maxSpeed=0,maxTurn=0;for(let i=0;i<1800&&u.airState!=='airborne';i++){const heading=u.heading;step(w);maxSpeed=Math.max(maxSpeed,u.motionSpeed??0);maxTurn=Math.max(maxTurn,Math.abs(wrapAngle(u.heading-heading)));}
 expect(u.airState).toBe('airborne');expect(maxSpeed).toBeGreaterThan(40);expect(maxTurn).toBeLessThan(.2);
 for(let i=0;i<450;i++)step(w);u.ammo=0;u.secondaryAmmo?.fill(0);
 let touchdownSpeed=0,touchdownHeading=Infinity;for(let i=0;i<9000&&!['grounded','rearming'].includes(u.airState??'');i++){const previous=u.airState;step(w);if(previous==='returning'&&u.airState==='landing'){touchdownSpeed=u.motionSpeed??0;touchdownHeading=Math.abs(wrapAngle(u.heading-pad.heading));}}
 expect(touchdownSpeed).toBeGreaterThan(40);expect(touchdownHeading).toBeLessThan(BATTLE_SCALE.aircraft.headingTolerance);
 expect(['grounded','rearming']).toContain(u.airState);expect(u.dead).toBe(false);const stock=depot.ammoStock!;step(w);expect(u.ammo).toBeGreaterThan(0);expect(depot.ammoStock).toBeLessThan(stock);expect(aircraftMobility(u).runwayEnd).toBe(BATTLE_SCALE.aircraft.runwayEnd);
},20000);
it('metric definitions and incremental visibility continue identically after save and restore',()=>{
 const w=fixture();for(let i=0;i<12;i++)w.spawn('reconInf',i%2 as 0|1,i*30,0);for(let i=0;i<7;i++)w.tick(1/30);
 const b=fixture();loadWorld(b,JSON.parse(JSON.stringify(saveWorld(w))));expect(b.metricBattle).toBe(true);expect(worldHash(b)).toBe(worldHash(w));for(let i=0;i<5;i++){w.tick(1/30);b.tick(1/30);}expect(worldHash(b)).toBe(worldHash(w));
});
it('large-scale radios connect forward depots without making local servicing global',()=>{
 const w=fixture(),hq=w.spawn('hq',0,0,0),fob=w.spawn('supply',0,1000,0);expect(w.commandNodeRange(hq)).toBeGreaterThan(1000);expect(w.connectedSupplyNodes(0)).toContain(fob);const far=w.spawn('supply',0,3000,0);expect(w.connectedSupplyNodes(0)).not.toContain(far);
});
it('200 units with metre-scale optics and movement fit the 30 Hz CPU tick budget',()=>{
 const w=fixture();const units=Array.from({length:200},(_,i)=>w.spawn('inf',0,-150+(i%20)*4,Math.floor(i/20)*4));w.issue({type:'move',ids:units.map(u=>u.id),x:400,z:200});
 for(let i=0;i<10;i++)w.tick(1/30);const started=performance.now();for(let i=0;i<60;i++)w.tick(1/30);expect((performance.now()-started)/60).toBeLessThan(1000/30);expect(units.some(u=>(u.motionSpeed??0)>1)).toBe(true);
});

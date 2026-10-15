import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {heightAt,resetHeightmap,setBases,setMapSize} from './heightmap';
import {airliftManifest,queueAirliftCargo,updateAirliftLoading,releaseAirliftCargo,updateAirdrop} from './airlift';
import {applyCommands} from './systems/commands';
import {updateUnits} from './systems/units';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {createSkirmish} from './scenario';
import {producerKind} from './systems/production';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:250},{x:300,z:300,r:40}];setBases(bases);const w=new World(81,false,[],[],bases,false);w.networkMode=true;const plane=w.spawn('airTransport',0,0,0);plane.airState='grounded';return {w,plane};}
it('normal skirmish starts with only HQ and engineers; demo is opt-in',()=>{
 const {w}=fixture();w.entities.length=0;w.byId.clear();createSkirmish(w);for(const team of [0,1])expect(w.entities.filter(e=>e.team===team).map(e=>e.kind)).toEqual(['hq','engineer','engineer']);
 const demo=fixture().w;createSkirmish(demo,true);expect(demo.entities.some(e=>e.kind==='tank')).toBe(true);expect(producerKind('airTransport')).toBe('airbase');
});
it('reserves one tank OR two APCs, plus actual squad members, including APC passengers',()=>{
 const {w,plane}=fixture(),tank=w.spawn('tank',0,20,0),apc=w.spawn('apc',0,25,0);
 expect(queueAirliftCargo(w,plane,tank)).toBe(true);expect(queueAirliftCargo(w,plane,apc)).toBe(false);plane.transportQueue=[];
 const b=w.spawn('apc',0,30,0),extra=w.spawn('apc',0,35,0),inside=w.spawn('inf',0,25,0);inside.squadMembers=10;inside.loadedIntoId=apc.id;apc.cargoUnitIds=[inside.id];
 expect(queueAirliftCargo(w,plane,apc)).toBe(true);expect(queueAirliftCargo(w,plane,b)).toBe(true);expect(queueAirliftCargo(w,plane,extra)).toBe(false);
 for(let i=0;i<4;i++){const p=w.spawn('inf',0,40+i*8,0);p.squadMembers=10;expect(queueAirliftCargo(w,plane,p)).toBe(true);}
 expect(airliftManifest(w,plane,true)).toMatchObject({slots:2,apcs:2,troops:50});expect(queueAirliftCargo(w,plane,w.spawn('engineer',0,60,20))).toBe(false);
 expect(queueAirliftCargo(w,plane,w.spawn('inf',1,60,40))).toBe(false);
});
it('cargo drives to the grounded plane, then descends gradually under parachutes with save continuity',()=>{
 const {w,plane}=fixture(),tank=w.spawn('tank',0,60,0);w.issue({type:'load',ids:[tank.id],targetId:plane.id});applyCommands(w);expect(plane.transportQueue).toEqual([tank.id]);
 for(let i=0;i<1200&&tank.loadedIntoId==null;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}expect(tank.loadedIntoId).toBe(plane.id);expect(plane.x).toBe(0);
 plane.airState='airborne';plane.y=heightAt(0,0)+80;expect(releaseAirliftCargo(w,plane)).toBe(true);expect(tank.loadedIntoId).toBeNull();expect(tank.airdrop).toBeDefined();expect(tank.y).toBeGreaterThan(70);
 const start=tank.y;updateAirdrop(w,tank,1/30);expect(start-tank.y).toBeCloseTo(.3);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<400;i++){updateAirdrop(w,tank,1/30);updateAirdrop(copy,copy.byId.get(tank.id)!,1/30);}expect(worldHash(copy)).toBe(worldHash(w));expect(tank.airdrop).toBeUndefined();expect(tank.dead).toBe(false);expect(w.nav.isWalkableWorld(tank.x,tank.z,tank.def.radius)).toBe(true);expect(plane.cargoUnitIds).toEqual([]);
});
it('rejects airborne loading and unsafe drop heights without losing cargo',()=>{
 const {w,plane}=fixture(),p=w.spawn('inf',0,0,0);expect(queueAirliftCargo(w,plane,p)).toBe(true);updateAirliftLoading(w,plane);expect(p.loadedIntoId).toBe(plane.id);
 plane.airState='airborne';expect(queueAirliftCargo(w,plane,w.spawn('tank',0,30,0))).toBe(false);
 for(const height of [0,500]){plane.y=heightAt(0,0)+height;expect(releaseAirliftCargo(w,plane)).toBe(false);expect(p.loadedIntoId).toBe(plane.id);}
});

import {stationAircraft,hasAirMissionAmmo} from './systems/airDoctrine';
import {updateProduction} from './systems/production';
it('airbase produces an unarmed transport which takes off, drops real cargo and returns',()=>{
 const {w,plane}=fixture();plane.dead=true;w.spawn('hq',0,-40,0);w.spawn('generator',0,-40,-30);w.spawn('supply',0,-30,30);w.spawn('airStrategy',0,-60,-30);const airport=w.spawn('airbase',0,0,0);airport.buildingLevel=2;w.teamResources[0]=w.teamCredits[0]=10000;
 w.issue({type:'produce',kind:'airTransport',producerId:airport.id});applyCommands(w);expect(airport.productionQueue).toEqual(['airTransport']);
 updateProduction(w,100);const transport=w.entities.find(e=>e.kind==='airTransport'&&!e.dead)!;expect(transport).toBeDefined();expect(transport.airState).toBe('grounded');expect(hasAirMissionAmmo(transport)).toBe(true);
 stationAircraft(w,transport,airport,0);const p=w.spawn('inf',0,transport.x,transport.z);queueAirliftCargo(w,transport,p);updateAirliftLoading(w,transport);expect(p.loadedIntoId).toBe(transport.id);
 w.issue({type:'unload',ids:[transport.id],x:160,z:160});applyCommands(w);let airborne=false;
 for(let i=0;i<5000&&p.loadedIntoId!=null;i++){for(const e of w.entities){e.pHeading=e.heading;e.px=e.x;e.py=e.y;e.pz=e.z;}w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);airborne ||= transport.airState==='airborne';}
 expect(airborne).toBe(true);expect(p.loadedIntoId).toBeNull();expect(p.airdrop).toBeDefined();expect(transport.airState).toBe('returning');expect(Math.hypot(p.x-160,p.z-160)).toBeLessThan(35);
});

import {aircraftMobility} from './battleScale';
it('both metric scales cruise inside the safe airdrop altitude band',()=>{
 const {w}=fixture();w.metricBattle=true;for(const compact of [false,true]){w.compactBattle=compact;const p=w.spawn('airTransport',0,0,0);expect(aircraftMobility(p).altitude).toBeGreaterThanOrEqual(25);expect(aircraftMobility(p).altitude).toBeLessThanOrEqual(220);}
});

it.each([false,true])('metric transport reaches a nearby drop zone instead of orbiting forever (compact=%s)',compact=>{
 setMapSize(2048);const bases=[{x:0,z:0,r:800},{x:900,z:900,r:30}];setBases(bases);const w=new World(71,false,[],[],bases,false,true);w.compactBattle=compact;w.networkMode=true;
 for(const [kind,x,z] of [['hq',0,0],['generator',-40,0],['supply',-30,30],['airStrategy',-30,-30]] as const)w.spawn(kind,0,x,z);
 const pad=w.spawn('airbase',0,0,0),plane=w.spawn('airTransport',0,0,0);pad.buildingLevel=2;stationAircraft(w,plane,pad);const tank=w.spawn('tank',0,plane.x,plane.z);expect(queueAirliftCargo(w,plane,tank)).toBe(true);updateAirliftLoading(w,plane);expect(tank.loadedIntoId).toBe(plane.id);
 w.issue({type:'unload',ids:[plane.id],x:500,z:400});applyCommands(w);
 for(let i=0;i<3600&&tank.loadedIntoId!=null;i++){for(const e of w.entities){e.pHeading=e.heading;e.px=e.x;e.py=e.y;e.pz=e.z;}w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(tank.loadedIntoId).toBeNull();expect(tank.airdrop).toBeDefined();expect(plane.airState).toBe('returning');expect(Math.hypot(tank.x-500,tank.z-400)).toBeLessThan(35);
 for(let i=0;i<900;i++)updateAirdrop(w,tank,1/30);expect(tank.airdrop).toBeUndefined();expect(tank.dead).toBe(false);
});

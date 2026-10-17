import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {queuePassenger,occupiedSeats} from './transport';
import {queueAirliftCargo,updateAirliftLoading} from './airlift';
import {applyCommands} from './systems/commands';
import {replaceTask,clearPickupQueue} from './unitTasks';

function fixture(){const bases=[{x:0,z:0,r:150},{x:250,z:250,r:20}];setBases(bases);const w=new World(92,false,[],[],bases,false);w.networkMode=true;return w;}
afterEach(resetHeightmap);

it('a new passenger move frees its reserved seat and advances the existing pickup queue',()=>{
 const w=fixture(),van=w.spawn('transportVan',0,-30,0),a=w.spawn('atgm',0,0,0),b=w.spawn('manpad',0,0,15);
 expect(queuePassenger(w,van,a)).toBe(true);expect(queuePassenger(w,van,b)).toBe(true);
 w.issue({type:'move',ids:[a.id],x:50,z:0});applyCommands(w);
 expect(van.transportQueue).toEqual([b.id]);expect(van.transportTargetId).toBe(b.id);
 expect(occupiedSeats(w,van,true)).toBe(b.squadMembers);expect(a.mode).toBe('move');
 expect(queuePassenger(w,w.spawn('apc',0,20,0),a)).toBe(true);
});

it('stopping a helicopter releases a walking passenger but keeps troops already aboard',()=>{
 const w=fixture(),heli=w.spawn('transport',0,0,0),p=w.spawn('inf',0,40,0),aboard=w.spawn('inf',0,0,0);
 aboard.loadedIntoId=heli.id;heli.cargoUnitIds=[aboard.id];queuePassenger(w,heli,p);p.mode='move';p.dest={x:10,z:0};
 w.issue({type:'stop',ids:[heli.id]});applyCommands(w);
 expect(p.dest).toBeNull();expect(p.mode).toBe('hold');expect(heli.transportQueue).toEqual([]);
 expect(aboard.loadedIntoId).toBe(heli.id);expect(heli.cargoUnitIds).toEqual([aboard.id]);
});

it('ground transport pickup cancels a mortar fire mission and an engineer repair reservation',()=>{
 const w=fixture(),van=w.spawn('transportVan',0,-30,0),mortar=w.spawn('mortar',0,0,0),engineer=w.spawn('engineer',0,0,10),tank=w.spawn('tank',0,5,0);
 mortar.fireMission={x:100,z:0};mortar.cooldown=3;engineer.mode='repair';engineer.target=tank;tank.builderIds=[engineer.id];
 expect(queuePassenger(w,van,mortar)).toBe(true);expect(queuePassenger(w,van,engineer)).toBe(true);
 expect(mortar.fireMission).toBeNull();expect(mortar.cooldown).toBe(3);expect(tank.builderIds).not.toContain(engineer.id);
});

it('a new order cancels a cargo-plane reservation before the loading controller can override it',()=>{
 const w=fixture(),plane=w.spawn('airTransport',0,0,0),p=w.spawn('tank',0,35,0);plane.airState='grounded';
 expect(queueAirliftCargo(w,plane,p)).toBe(true);
 w.issue({type:'move',ids:[p.id],x:75,z:10});applyCommands(w);const dest=p.dest;
 updateAirliftLoading(w,plane);expect(p.loadedIntoId).toBeNull();expect(p.dest).toBe(dest);expect(plane.transportQueue).toEqual([]);
});

it('carrier destruction cleanup releases waiting passengers without clearing other carriers',()=>{
 const w=fixture(),a=w.spawn('apc',0,-30,0),b=w.spawn('apc',0,-30,25),p=w.spawn('inf',0,0,0),q=w.spawn('inf',0,0,25);
 queuePassenger(w,a,p);queuePassenger(w,b,q);p.dest={x:-10,z:0};a.dead=true;clearPickupQueue(w,a);
 expect(p.dest).toBeNull();expect(p.holdPosition).toBe(true);expect(b.transportQueue).toEqual([q.id]);
 replaceTask(w,q);expect(b.transportQueue).toEqual([]);
});

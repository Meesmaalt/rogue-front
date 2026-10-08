import {it,expect,afterEach,vi} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import type {MapFeatureDef} from './mapFeatures';
import {effectiveWeaponRange,weaponSpec,weaponRange,weaponFireBlocker} from './systems/combat';
import {updateUnits,nearestEnemy,combatStatus} from './systems/units';
import {applyCommands} from './systems/commands';
import {updateArtillery} from './systems/artillery';
import {updateMorale} from './systems/morale';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
const dt=1/30;
function fixture(features:MapFeatureDef[]=[]){const bases=[{x:0,z:0,r:250},{x:280,z:280,r:20}];setBases(bases);const w=new World(77,false,[],features,bases,false);w.networkMode=true;return w;}
function step(w:World,n:number){for(let i=0;i<n;i++){w.time+=dt;w.spatial.rebuild(w.entities);updateUnits(w,dt);}}
afterEach(()=>{resetHeightmap();vi.restoreAllMocks();});
it('SPAA automatically acquires a helicopter inside its secondary missile range beyond gun range',()=>{
 const w=fixture(),u=w.spawn('spaa',0,-40,0),t=w.spawn('heli',1,40,0);t.spottedUntil[0]=100;t.y=30;t.airState='airborne';
 expect(weaponRange(u,weaponSpec(u,0))).toBeLessThan(80-t.def.radius);expect(effectiveWeaponRange(u)).toBeGreaterThan(80);w.spatial.rebuild(w.entities);
 expect(nearestEnemy(w,u,effectiveWeaponRange(u))).toBe(t);u.mode='hold';u.holdPosition=true;u.heading=Math.PI/2;step(w,1);
 expect(w.projectiles.some(p=>p.sourceId===u.id&&p.weapon==='missile')).toBe(true);
 u.secondaryAmmo![1]=0;expect(effectiveWeaponRange(u)).toBe(weaponRange(u,weaponSpec(u,0)));
});
it('automatic acquisition prefers an open firing lane while explicit attack retains the chosen contact',()=>{
 const w=fixture([{id:'wall',kind:'wall',x:0,z:0,width:3,depth:20,height:9}]),u=w.spawn('tank',0,-25,0),blocked=w.spawn('tank',1,12,0),clear=w.spawn('tank',1,-25,48);
 blocked.spottedUntil[0]=clear.spottedUntil[0]=100;w.spatial.rebuild(w.entities);
 expect(w.vision.hasLineOfSight(u,blocked)).toBe(false);expect(w.vision.hasLineOfSight(u,clear)).toBe(true);expect(nearestEnemy(w,u,effectiveWeaponRange(u))).toBe(clear);
 w.issue({type:'attack',ids:[u.id],targetId:blocked.id});applyCommands(w);step(w,1);expect(u.target).toBe(blocked);
});
it('a hold-fire recon follows its movement order without acquiring or firing at nearby enemies',()=>{
 const w=fixture(),u=w.spawn('reconInf',0,-40,0),t=w.spawn('inf',1,-20,20);t.spottedUntil[0]=100;t.standingOrder='holdfire';u.standingOrder='holdfire';
 w.issue({type:'move',ids:[u.id],x:-10,z:0});applyCommands(w);step(w,90);expect(u.x).toBeGreaterThan(-35);expect(u.target).toBeNull();expect(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id)).toBe(false);
});
it('moving cancels artillery and transport tasks, including after save/load, without resetting reload',()=>{
 const w=fixture(),u=w.spawn('artillery',0,-50,0);u.fireMission={x:100,z:0};u.transportTargetId=999;u.transportQueue=[999];u.artilleryDisplace={x:-70,z:0};u.cooldown=3;
 w.issue({type:'move',ids:[u.id],x:-15,z:-20});applyCommands(w);expect(u.fireMission).toBeNull();expect(u.artilleryDisplace).toBeNull();expect(u.transportTargetId).toBeNull();expect(u.cooldown).toBe(3);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));step(w,90);step(copy,90);expect(worldHash(copy)).toBe(worldHash(w));expect(u.x).toBeGreaterThan(-48);
});
it('a moving battery stops before its observed fire mission, then launches an actual shell',()=>{
 const w=fixture(),u=w.spawn('artillery',0,-40,0);u.heading=Math.PI/2;u.motionSpeed=5;vi.spyOn(w.vision,'isVisible').mockReturnValue(true);
 w.issue({type:'fire-mission',ids:[u.id],x:80,z:0});applyCommands(w);updateArtillery(w,dt);expect(w.projectiles).toHaveLength(0);expect(combatStatus(w,u)).toContain('Peatub');
 for(let i=0;i<90;i++){w.time+=dt;updateArtillery(w,dt);updateUnits(w,dt);}expect(u.motionSpeed).toBe(0);expect(w.projectiles.some(p=>p.sourceId===u.id&&p.flight==='ballistic')).toBe(true);
});
it('an engineer cannot walk through a sealed wall and an out-of-range depot retains its repair stock',()=>{
 const w=fixture([{id:'wall',kind:'wall',x:0,z:0,width:10,depth:1000,height:8}]),u=w.spawn('engineer',0,-30,0),t=w.spawn('tank',0,30,0),depot=w.spawn('supply',0,-150,0);t.hp-=30;depot.repairStock=100;
 vi.spyOn(w,'nearestSupplyDepot').mockReturnValue(depot);w.issue({type:'repair',ids:[u.id],targetId:t.id});applyCommands(w);step(w,90);expect(u.x).toBeLessThan(-5);expect(t.builderIds).toContain(u.id);
 u.x=25;u.z=0;step(w,1);expect(depot.repairStock).toBe(100);expect(combatStatus(w,u)).toContain('Remont ootab');
});
it('a routing battery cancels its fire mission and retreats toward a walkable rally point outside HQ',()=>{
 const w=fixture(),hq=w.spawn('hq',0,-120,-60),u=w.spawn('artillery',0,40,0);w.nav.syncBuildings(w.entities);u.fireMission={x:150,z:0};u.morale=0;u.suppression=95;
 updateMorale(w,dt);expect(u.fireMission).toBeNull();expect(u.dest).not.toEqual({x:hq.x,z:hq.z});expect(w.nav.isWalkableWorld(u.dest!.x,u.dest!.z,u.def.radius)).toBe(true);
 step(w,90);expect(u.x).toBeLessThan(38);expect(u.target).toBeNull();
 const before=worldHash(w);u.standingOrder='holdfire';expect(worldHash(w)).not.toBe(before);
});
it('stop prevents automatic pursuit, and an unsupported attack reports rejection without replacing the current order',()=>{
 const w=fixture(),u=w.spawn('tank',0,-40,0),t=w.spawn('tank',1,100,0);t.spottedUntil[0]=100;t.standingOrder='holdfire';w.issue({type:'stop',ids:[u.id]});applyCommands(w);step(w,30);expect(u.target).toBeNull();expect(u.x).toBe(-40);
 const aa=w.spawn('manpad',0,-40,30);aa.mode='hold';aa.holdPosition=true;w.issue({type:'attack',ids:[aa.id],targetId:t.id});applyCommands(w);expect(aa.mode).toBe('hold');expect(w.events.some(e=>e.type==='order-rejected'&&e.unitId===aa.id)).toBe(true);
});

it('an established firing position tolerates range-edge motion and resumes approach only beyond weapon reach',()=>{
 const w=fixture(),u=w.spawn('tank',0,-100,0),t=w.spawn('tank',1,0,0);t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;t.spottedUntil[0]=100;
 const reach=effectiveWeaponRange(u,t);t.x=u.x+reach*.85+t.def.radius;u.heading=Math.PI/2;
 w.issue({type:'attack',ids:[u.id],targetId:t.id});applyCommands(w);step(w,1);
 expect(u.combatHoldingTarget).toBe(t.id);const start=u.x;
 t.x=u.x+reach*.97+t.def.radius;step(w,15);expect(u.x).toBeCloseTo(start);expect(u.combatHoldingTarget).toBe(t.id);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));step(w,2);step(copy,2);expect(worldHash(copy)).toBe(worldHash(w));
 t.x=u.x+reach*1.1+t.def.radius;step(w,1);expect(u.combatHoldingTarget).toBeUndefined();expect(u.combatPosition).toBeDefined();
 w.issue({type:'move',ids:[u.id],x:-120,z:-20});applyCommands(w);expect(u.combatHoldingTarget).toBeUndefined();expect(u.combatPosition).toBeUndefined();
});
it('shared weapon feedback distinguishes settling, aiming and reload and gates the actual missile shot',()=>{
 const w=fixture(),u=w.spawn('ifv',0,-90,0),t=w.spawn('tank',1,0,0);u.heading=Math.PI/2;u.mode='hold';u.holdPosition=true;u.target=t;t.spottedUntil[0]=100;t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;
 t.x=u.x+weaponRange(u,weaponSpec(u,1))*.8;u.stationaryFireReadyAt=1;
 expect(weaponFireBlocker(w,u,t,1)).toContain('Stabiliseerib');step(w,15);
 expect(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id&&e.weaponIndex===1)).toBe(false);
 w.time=2;u.turretYaw=Math.PI;expect(weaponFireBlocker(w,u,t,1)).toContain('torni');
 u.turretYaw=0;u.weaponCooldowns![1]=2;expect(weaponFireBlocker(w,u,t,1)).toContain('Laadib');
 u.weaponCooldowns![1]=0;expect(weaponFireBlocker(w,u,t,1)).toBeNull();
 step(w,1);expect(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id&&e.weaponIndex===1)).toBe(true);
 u.standingOrder='holdfire';expect(weaponFireBlocker(w,u,t,1)).toBe('Tuli keelatud');
});

it('an attacking group chooses separated firing positions around the same target',()=>{
 const w=fixture(),a=w.spawn('tank',0,-220,-12),b=w.spawn('tank',0,-220,12),t=w.spawn('tank',1,0,0);
 t.standingOrder='holdfire';t.mode='hold';t.holdPosition=true;t.spottedUntil[0]=100;
 w.issue({type:'attack',ids:[a.id,b.id],targetId:t.id});applyCommands(w);step(w,1);
 expect(a.combatPosition).toBeDefined();expect(b.combatPosition).toBeDefined();
 expect(Math.hypot(a.combatPosition!.x-b.combatPosition!.x,a.combatPosition!.z-b.combatPosition!.z)).toBeGreaterThan(a.def.radius+b.def.radius+2);
});

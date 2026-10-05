import {it,expect,afterEach} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {updateGarrisons,garrisonOccupants,garrisonProtection,garrisonCover} from './garrison';
import {applyCommands} from './systems/commands';
import {updateUnits} from './systems/units';
import {damage,fireGroundProjectile} from './systems/combat';
import {updateProjectiles} from './systems/projectiles';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import type {MapFeatureDef} from './mapFeatures';
const bases=[{x:0,z:0,r:180},{x:250,z:250,r:20}];
const house:MapFeatureDef={id:'house',kind:'building',appearance:'farmhouse',x:0,z:0,width:20,depth:16,height:6,garrisonCapacity:2};
function fixture(extra:MapFeatureDef[]=[]){setBases(bases);const w=new World(21,false,[],[house,...extra],bases,false);w.networkMode=true;w.spawn('hq',0,-140,-100);w.spawn('hq',1,140,100);return w;}
function step(w:World,n=1){for(let i=0;i<n;i++){w.time+=1/30;updateGarrisons(w,1/30,(u,a)=>damage(w,u,a,{weapon:'cannon'}));applyCommands(w);w.spatial.rebuild(w.entities);w.vision.update(w.entities);updateUnits(w,1/30);updateProjectiles(w,1/30);}}
afterEach(resetHeightmap);
it('door approach, capacity reservation and contested ownership; save restores active entry and occupied exit',()=>{
 const w=fixture(),a=w.spawn('inf',0,-45,0),b=w.spawn('reconInf',0,0,-40),extra=w.spawn('inf',0,-40,-40),enemy=w.spawn('inf',1,40,0);
 w.issue({type:'enter-building',ids:[a.id,b.id,extra.id],featureId:house.id});w.issue({type:'enter-building',ids:[enemy.id],featureId:house.id});applyCommands(w);
 expect(a.garrisonId).toBeUndefined();expect(a.x).toBe(-45);expect(a.mode).toBe('enter-building');expect(garrisonOccupants(w,house.id,true)).toHaveLength(2);expect(enemy.garrisonOrderId).toBeUndefined();
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));
 for(let i=0;i<420;i++){w.tick(1/30);copy.tick(1/30);}expect(worldHash(w)).toBe(worldHash(copy));
 expect(a.garrisonId).toBe(house.id);expect(b.garrisonId).toBe(house.id);expect(a.loadedIntoId).toBeNull();expect(a.y).toBeGreaterThan(1);
 w.issue({type:'leave-building',ids:[a.id],x:-60,z:-20});applyCommands(w);expect(a.garrisonId).toBeUndefined();expect(w.nav.isWalkableWorld(a.x,a.z,a.def.radius)).toBe(true);expect(a.mode).toBe('move');expect(a.dest).toEqual({x:-60,z:-20});
});
it('AT and roof MANPAD fire their own missiles and consume ammo; another house blocks the shot',()=>{
 const w=fixture(),at=w.spawn('atgm',0,32,0),aa=w.spawn('manpad',0,0,34);
 w.issue({type:'enter-building',ids:[at.id,aa.id],featureId:house.id});step(w,420);
 expect(at.garrisonId).toBe(house.id);expect(aa.garrisonId).toBe(house.id);expect(aa.y).toBeGreaterThan(house.height!);
 const tank=w.spawn('tank',1,55,0),heli=w.spawn('heli',1,0,44);heli.y=35;heli.airState='airborne';tank.spottedUntil[0]=heli.spottedUntil[0]=w.time+100;
 const ammoAt=at.ammo!,ammoAA=aa.ammo!;w.issue({type:'attack',ids:[at.id],targetId:tank.id});w.issue({type:'attack',ids:[aa.id],targetId:heli.id});step(w,100);
 expect(w.events.some(e=>e.type==='fire'&&e.sourceId===at.id&&e.weapon==='missile')).toBe(true);expect(w.events.some(e=>e.type==='fire'&&e.sourceId===aa.id&&e.weapon==='missile')).toBe(true);expect(at.ammo).toBeLessThan(ammoAt);expect(aa.ammo).toBeLessThan(ammoAA);
 const wall:MapFeatureDef={id:'neighbour',kind:'building',x:32,z:0,width:12,depth:28,height:12};
 const blocked=fixture([wall]),blockedAT=blocked.spawn('atgm',0,24,-22),blockedTank=blocked.spawn('tank',1,55,0);
 blocked.issue({type:'enter-building',ids:[blockedAT.id],featureId:house.id});step(blocked,420);expect(blockedAT.garrisonId).toBe(house.id);
 blockedTank.spottedUntil[0]=blocked.time+100;const remaining=blockedAT.ammo;blocked.issue({type:'attack',ids:[blockedAT.id],targetId:blockedTank.id});step(blocked,150);
 expect(blocked.vision.hasLineOfSight(blockedAT,blockedTank)).toBe(false);expect(blockedAT.ammo).toBe(remaining);
});
it('garrison reduces small-arms damage; a real artillery impact damages the house and suppression, collapse evacuates survivors',()=>{
 const w=fixture(),u=w.spawn('inf',0,-35,0);w.issue({type:'enter-building',ids:[u.id],featureId:house.id});step(w,360);expect(u.garrisonId).toBe(house.id);
 const hp=u.hp;damage(w,u,10,{weapon:'bullet'});expect(hp-u.hp).toBeLessThan(5);
 const protection=garrisonProtection(w,u,true),cover=garrisonCover(w,u);w.damageInfrastructure(house.id,.5);expect(garrisonProtection(w,u,true)).toBeGreaterThan(protection);expect(garrisonCover(w,u)).toBeLessThan(cover);
 const gun=w.spawn('artillery',1,-55,-35);fireGroundProjectile(w,gun,0,0);step(w,180);
 expect(w.infrastructureDamage.get(house.id)).toBeGreaterThan(0);expect(u.suppression).toBeGreaterThan(0);expect(u.hp).toBeLessThan(hp);
 expect(u.dead).toBe(false);w.damageInfrastructure(house.id,1);step(w);expect(u.garrisonId).toBeUndefined();expect(w.nav.isWalkableWorld(u.x,u.z,u.def.radius)).toBe(true);
 expect(w.events.some(e=>e.type==='impact')).toBe(true);
 const indoor=fixture(),mortar=indoor.spawn('mortar',0,-35,0);indoor.issue({type:'enter-building',ids:[mortar.id],featureId:house.id});step(indoor,360);expect(mortar.garrisonId).toBe(house.id);const ammo=mortar.ammo;indoor.issue({type:'fire-mission',ids:[mortar.id],x:80,z:0});applyCommands(indoor);fireGroundProjectile(indoor,mortar,80,0);expect(mortar.fireMission).toBeFalsy();expect(mortar.ammo).toBe(ammo);expect(indoor.projectiles).toHaveLength(0);
});

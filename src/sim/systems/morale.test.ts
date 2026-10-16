import {afterEach,expect,it,vi} from 'vitest';
import {World} from '../World';
import {resetHeightmap,setBases} from '../heightmap';
import {updateMorale,moraleState} from './morale';
import {updateUnits,combatStatus} from './units';
import {saveWorld,loadWorld} from '../SaveState';
import {worldHash} from '../Replay';
import type {MapFeatureDef} from '../mapFeatures';

const dt=1/30;
function fixture(features:MapFeatureDef[]=[]){
  const bases=[{x:-140,z:0,r:60},{x:220,z:220,r:40}];setBases(bases);
  const w=new World(91,false,[],features,bases,false);w.networkMode=true;
  const hq=w.spawn('hq',0,-140,0);return {w,hq};
}
function step(w:World,n:number){for(let i=0;i<n;i++){w.time+=dt;w.spatial.rebuild(w.entities);updateMorale(w,dt);updateUnits(w,dt);}}
afterEach(()=>{resetHeightmap();vi.restoreAllMocks();});

it('panic stays latched past the entry threshold, preserves its rally point and ends in a hold after recovery',()=>{
  const {w}=fixture(),u=w.spawn('inf',0,0,0);w.nav.syncBuildings(w.entities);
  u.morale=0;u.suppression=95;u.fireMission={x:100,z:0};u.moveQueue=[{x:100,z:100}];
  updateMorale(w,dt);const point=u.moraleRetreat!.point;expect(point).toBeDefined();
  expect(u.fireMission).toBeNull();expect(u.moveQueue).toHaveLength(0);
  expect(combatStatus(w,u)).toBe('Taandub kogunemiskohta');
  u.morale=30;u.suppression=0;step(w,90);
  expect(moraleState(u)).toBe('routing');expect(u.moraleRetreat!.point).toBe(point);expect(u.x).toBeLessThan(-1);
  u.morale=56;updateMorale(w,dt);expect(u.moraleRetreat).toBeUndefined();expect(u.mode).toBe('hold');expect(u.target).toBeNull();expect(u.dest).toBeNull();
});

it('chooses a reachable rally facility instead of the closer depot across a sealed wall',()=>{
  const {w,hq}=fixture([{id:'wall',kind:'wall',x:30,z:0,width:5,depth:1000,height:8}]);
  w.spawn('supply',0,65,0);const u=w.spawn('inf',0,0,0);u.morale=0;w.nav.syncBuildings(w.entities);
  updateMorale(w,dt);expect(u.moraleRetreat?.nodeId).toBe(hq.id);expect(u.navPath.length).toBeGreaterThan(0);
  expect(w.nav.isWalkableWorld(u.dest!.x,u.dest!.z,u.def.radius)).toBe(true);
});

it('waits without repeated path searches when isolated and retries after a rally facility becomes reachable',()=>{
  const {w,hq}=fixture([{id:'wall',kind:'wall',x:-60,z:0,width:5,depth:1000,height:8}]);
  const u=w.spawn('inf',0,0,0);u.morale=0;w.nav.syncBuildings(w.entities);
  updateMorale(w,dt);expect(u.moraleRetreat?.point).toBeUndefined();expect(u.dest).toBeNull();
  expect(combatStatus(w,u)).toBe('Taandumine ootab · puudub läbitav tee baasi');
  const retry=u.moraleRetreat!.retryAt;const scan=vi.spyOn(w.nav,'isWalkableWorld');
  updateMorale(w,dt);expect(scan).not.toHaveBeenCalled();expect(u.moraleRetreat!.retryAt).toBe(retry);
  const barracks=w.spawn('barracks',0,0,65);w.time=retry;updateMorale(w,dt);
  expect(u.moraleRetreat?.nodeId).toBe(barracks.id);expect(u.moraleRetreat?.nodeId).not.toBe(hq.id);
});

it('does not replace aircraft, automatic builders or resource delivery tasks with ground retreat',()=>{
  const {w,hq}=fixture();
  const air=w.spawn('fighter',0,0,0);air.airState='returning';air.dest={x:40,z:40};
  const crew=w.spawn('engineer',0,0,10);crew.constructionCrew={homeId:hq.id,slot:0};crew.mode='build';crew.dest={x:50,z:50};
  const truck=w.spawn('logiTruck',0,0,20);truck.resourceConvoy={sourceIndex:0,homeId:hq.id,pickup:{x:100,z:100},dock:{x:0,z:0},phase:'to-hq'};truck.dest={x:-100,z:0};
  for(const u of [air,crew,truck]){u.morale=0;u.suppression=100;const dest=u.dest,mode=u.mode;updateMorale(w,dt);expect(u.dest).toBe(dest);expect(u.mode).toBe(mode);expect(u.moraleRetreat).toBeUndefined();}
  expect(air.airState).toBe('returning');
});

it('replans after losing its rally facility and preserves retreat deterministically through save/load',()=>{
  const {w,hq}=fixture(),u=w.spawn('tank',0,0,0),depot=w.spawn('supply',0,100,70);u.morale=0;w.nav.syncBuildings(w.entities);
  updateMorale(w,dt);const first=u.moraleRetreat!.nodeId;const old=w.byId.get(first!)!;old.dead=true;
  w.time=u.moraleRetreat!.retryAt;w.nav.syncBuildings(w.entities);updateMorale(w,dt);
  expect(u.moraleRetreat?.nodeId).toBe(first===hq.id?depot.id:hq.id);
  w.entities.splice(w.entities.indexOf(old),1);
  const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
  step(w,60);step(copy,60);expect(worldHash(copy)).toBe(worldHash(w));
  copy.byId.get(u.id)!.moraleRetreat!.retryAt+=1;expect(worldHash(copy)).not.toBe(worldHash(w));
});

it('releases a purchased engineer from an unfinished repair when panic takes over',()=>{
  const {w}=fixture(),u=w.spawn('engineer',0,0,0),tank=w.spawn('tank',0,5,0);u.mode='repair';u.target=tank;tank.builderIds=[u.id];u.morale=0;
  updateMorale(w,dt);expect(tank.builderIds).not.toContain(u.id);expect(u.target).toBeNull();expect(u.moraleRetreat).toBeDefined();
});

it('spreads a simultaneous retreat over bounded planning steps without leaving the remaining squads behind',()=>{
  const {w}=fixture(),units=Array.from({length:5},(_,i)=>w.spawn('inf',0,0,i*8));
  for(const u of units)u.morale=0;
  updateMorale(w,dt);expect(units.filter(u=>u.moraleRetreat?.point)).toHaveLength(2);
  updateMorale(w,dt);expect(units.filter(u=>u.moraleRetreat?.point)).toHaveLength(4);
  updateMorale(w,dt);expect(units.filter(u=>u.moraleRetreat?.point)).toHaveLength(5);
});

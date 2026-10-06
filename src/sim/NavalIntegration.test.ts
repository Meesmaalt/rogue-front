import {afterEach,describe,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setMapSize,setBases,setTerrainProfile} from './heightmap';
import {updateUnits} from './systems/units';
import {updateProduction} from './systems/production';
import {updateProjectiles} from './systems/projectiles';
import {fireProjectile,weaponCanTarget,weaponMuzzle} from './systems/combat';
import {updateTacticalSupply} from './systems/tacticalSupply';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {SIM_STEP} from './constants';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import type {MissionDef} from './types';
import coast from '../data/missions/operation-tidebreaker.json';
import {MissionController} from './Mission';
const water={id:'sea',kind:'water',x:-180,z:0,width:200,depth:512,surfaceHeight:0} as MapFeatureDef;
afterEach(resetHeightmap);
function navalWorld(){setMapSize(512);const bases=[{x:0,z:130,r:65},{x:150,z:-150,r:50}];setBases(bases);const w=new World(77,false,[],[water],bases,false);w.networkMode=true;
 w.spawn('hq',0,0,130);w.spawn('hq',1,150,-150);w.spawn('generator',0,0,160);w.spawn('supply',0,-50,130);w.spawn('seaCommand',0,-50,100);w.spawn('seaStrategy',0,-20,100);const port=w.spawn('shipyard',0,-68,130);port.buildingLevel=3;return {w,port};}
describe('integrated navy',()=>{
 it('moves on water, rejects land and keeps queued destinations',()=>{
  const {w}=navalWorld(),ship=w.spawn('frigate',0,-150,100);ship.heading=0;ship.pHeading=0;
  w.issue({type:'move',ids:[ship.id],x:100,z:40,team:0});w.tick(SIM_STEP);expect(ship.dest).toBeNull();
  w.issue({type:'move',ids:[ship.id],x:-150,z:145,team:0});w.tick(SIM_STEP);
  for(let i=0;i<600;i++){w.time+=SIM_STEP;updateUnits(w,SIM_STEP);expect(w.waterNav.isWalkableWorld(ship.x,ship.z,ship.def.radius)).toBe(true);}
  expect(ship.z).toBeGreaterThan(140);expect(ship.y).toBeCloseTo(.15);expect(ship.mode).toBe('idle');
 });
 it('produces distinct wet berths from a connected upgraded port',()=>{
  const {w,port}=navalWorld();expect(w.productionOperational(port,'missileBoat').operational).toBe(true);
  port.productionQueue=['missileBoat','missileBoat'];port.productionProgress=100;updateProduction(w,SIM_STEP);port.productionProgress=100;updateProduction(w,SIM_STEP);
  const ships=w.entities.filter(e=>e.kind==='missileBoat');expect(ships).toHaveLength(2);for(const e of ships)expect(w.waterNav.isWalkableWorld(e.x,e.z,e.def.radius)).toBe(true);
  expect(Math.hypot(ships[0].x-ships[1].x,ships[0].z-ships[1].z)).toBeGreaterThan(ships[0].def.radius+ships[1].def.radius);
 });
 it('launches a vertical cruise missile and resolves a real impact with finite ammunition',()=>{
  const {w}=navalWorld(),ship=w.spawn('destroyer',0,-170,-100),target=w.spawn('tank',1,0,-100);const spec=ship.def.weapons![2],ammo=ship.secondaryAmmo![2];
  expect(weaponCanTarget(ship.def.weapons![1],target)).toBe(false);expect(weaponCanTarget(spec,target)).toBe(true);
  const muzzle=weaponMuzzle(ship,spec,2);fireProjectile(w,ship,target,muzzle.x,muzzle.y,muzzle.z,2);const p=w.projectiles[0];expect(p).toBeDefined();expect(p.vy).toBeGreaterThan(0);expect(p.vx).toBe(0);expect(ship.secondaryAmmo![2]).toBe(ammo-1);
  p.hitChance=1;p.hitRoll=0;const hp=target.hp;w.spatial.rebuild(w.entities);let climbed=false;
  for(let i=0;i<1200&&w.projectiles.length;i++){updateProjectiles(w,SIM_STEP);if(p.y>10)climbed=true;}
  expect(climbed).toBe(true);expect(w.projectiles).toHaveLength(0);expect(target.hp).toBeLessThan(hp);
 });
 it('port repairs and rearms from finite depot stock, then stops on port loss',()=>{
  const {w,port}=navalWorld(),ship=w.spawn('frigate',0,-105,130),depot=w.entities.find(e=>e.kind==='supply')!;ship.ammo=0;ship.secondaryAmmo![1]=0;ship.hp-=30;const stock=depot.repairStock!,ammo=depot.ammoStock!,hp=ship.hp;
  updateTacticalSupply(w,1);expect(ship.hp).toBeGreaterThan(hp);expect(depot.repairStock).toBeLessThan(stock);expect(ship.ammo).toBeGreaterThan(0);expect(depot.ammoStock).toBeLessThan(ammo);
  port.dead=true;ship.ammo=0;ship.hp-=20;const damaged=ship.hp;updateTacticalSupply(w,1);expect(ship.hp).toBe(damaged);expect(ship.ammo).toBe(0);
 });
 it('preserves naval flight and navigation through save/load',()=>{
  const {w}=navalWorld(),ship=w.spawn('destroyer',0,-170,0),target=w.spawn('tank',1,0,-100);fireProjectile(w,ship,target,target.x,target.y+1,target.z,2);ship.dest={x:-170,z:80};ship.mode='move';updateUnits(w,SIM_STEP);updateProjectiles(w,SIM_STEP);
  const copy=navalWorld().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));w.tick(SIM_STEP);copy.tick(SIM_STEP);expect(worldHash(copy)).toBe(worldHash(w));
 });
 it('coastal mission contains wet ships and completes its combat objectives',()=>{
  const m=coast as unknown as MissionDef;setMapSize(m.map.size);setBases(m.map.bases);const w=new World(81,true,m.map.resources,m.map.features,m.map.bases,false);w.externalVictoryMode=true;
  for(const o of m.map.objects??[])w.spawn(o.kind,o.team,o.x,o.z);const mission=new MissionController(m,w);
  for(const port of w.entities.filter(e=>e.kind==='shipyard'))expect(w.productionOperational(port,'missileBoat').operational).toBe(true);
  for(const e of w.entities.filter(e=>e.def.domain==='sea'))expect(w.waterNav.isWalkableWorld(e.x,e.z,e.def.radius)).toBe(true);
  for(const kind of ['frigate','aa','hq']){for(const e of w.entities)if(e.team===1&&e.kind===kind)e.dead=true;mission.tick(SIM_STEP);}
  expect(w.status).toBe('won');
 });
});

it('authored coastline keeps ports supplied, ship lanes connected and town buildings off roads',()=>{
 const m=coast as unknown as MissionDef;setMapSize(m.map.size);setBases(m.map.bases);setTerrainProfile(m.map.terrainProfile);
 const w=new World(m.seed,false,m.map.resources,m.map.features,m.map.bases,false);w.networkMode=true;
 for(const o of m.map.objects??[])w.spawn(o.kind,o.team,o.x,o.z);
 for(const port of w.entities.filter(e=>e.kind==='shipyard')){
  expect(w.waterNav.isWalkableWorld(port.x,port.z,0)).toBe(false); // port stays on land
  expect(w.productionOperational(port,'missileBoat').operational).toBe(true);
  expect(w.waterNav.nearestWater(port,5,64)).not.toBeNull();
 }
 for(let z=-460;z<=460;z+=8)expect(w.waterNav.isWalkableWorld(-200,z,8)).toBe(true);
 for(const f of m.map.features??[])if(f.kind==='building'){
  expect((m.map.features??[]).some(o=>(o.kind==='road'||o.kind==='water')&&pointInFeature(f.x,f.z,o,Math.max(f.width,f.depth)/2+1)),f.id).toBe(false);
 }
 for(const r of m.map.resources)expect(w.nav.isWalkableWorld(r.x,r.z,1),r.label).toBe(true);
});

import {afterEach,expect,it} from 'vitest';
import {factionUnitDefinition} from './units';
import {CORE_PLATFORMS} from './platforms';
import {FACTION_LIST} from './factions';
import {metricUnitDefinition} from './battleScale';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import {weaponImpactAgainst,weaponSpec,fireProjectile,selectWeapon,penetrationFactor} from './systems/combat';
import {updateProjectiles} from './systems/projectiles';
import {updateUnits} from './systems/units';
import logistics from '../data/logistics.json';
import {externalHelicopterCapacity,externalHelicopterInterval} from './externalSupply';

afterEach(resetHeightmap);
function fixture(metric=false,compact=false){const bases=[{x:0,z:-170,r:180},{x:200,z:200,r:30}];setBases(bases);const w=new World(712,false,[],[],bases,false,metric);w.networkMode=true;w.platformRosterOnly=true;w.compactBattle=compact;return w;}

it('audits all national core loadouts in legacy, metric and compact scales for finite usable weapons and intentional unarmed roles',()=>{
 const unarmed=new Set(['transportVan','scoutHeli','transport','airTransport','landingcraft','cruiseLauncher']);
 for(const f of FACTION_LIST)for(const kind of CORE_PLATFORMS){
  const base=factionUnitDefinition(kind,f);
  for(const d of [base,metricUnitDefinition(base,kind),metricUnitDefinition(base,kind,true)]){
   expect(d.cost).toBeGreaterThan(0);expect(d.hp).toBeGreaterThan(0);
   if(!unarmed.has(kind))expect(d.weapons?.length,`${f}:${kind}`).toBeGreaterThan(0);
   for(const s of d.weapons??[]){
    for(const value of [s.damage,s.cooldown,s.range,s.minimumRange,s.accuracy,s.ammoCapacity,s.ammoUsePerShot,s.speed])expect(Number.isFinite(value),`${f}:${kind}:${s.profile}`).toBe(true);
    expect(s.damage).toBeGreaterThan(0);expect(s.cooldown).toBeGreaterThan(0);expect(s.range).toBeGreaterThan(s.minimumRange);
    expect(s.accuracy).toBeGreaterThan(0);expect(s.accuracy).toBeLessThanOrEqual(1);expect(s.ammoCapacity).toBeGreaterThanOrEqual(s.ammoUsePerShot);
    if(s.flight==='guided'){expect(s.cooldown).toBeGreaterThanOrEqual(3);expect(s.turnRate).toBeGreaterThan(0);}
   }
  }
 }
});

it('keeps identical base fighter firepower and survival per credit close across doctrines rather than stacking a cheap damage/armor advantage',()=>{
 const efficiency=FACTION_LIST.map(f=>{const d=factionUnitDefinition('fighter',f),s=d.weapons![0];return d.hp*s.damage*s.accuracy/(d.cost*s.cooldown);});
 expect(Math.max(...efficiency)/Math.min(...efficiency)).toBeLessThan(1.12);
});

it.each([false,true])('tank frontal penetration at a displayed two kilometres agrees with real impact in metric combat (compact=%s)',compact=>{
 const w=fixture(true,compact),a=w.spawn('tank',0,-40,-170),t=w.spawn('tank',1,20,-170),distance=2000*(compact?.2:1);
 t.heading=-Math.PI/2;a.heading=Math.PI/2;
 const s=weaponSpec(a),estimate=weaponImpactAgainst(a,s,t,distance);
 expect(estimate).toBeGreaterThan(10);
 expect(penetrationFactor('kinetic',s.penetration,t.def.armorFront!,false,distance,a.def)).toBeGreaterThan(.8);
 fireProjectile(w,a,t,a.x,a.y+2,a.z,0);const p=w.projectiles[0];
 p.x=t.x-3;p.y=t.y+t.def.height*.45;p.z=t.z;p.launchX=t.x-distance;p.launchZ=t.z;
 p.vx=p.speed;p.vy=p.vz=0;p.hitChance=1;p.hitRoll=0;
 w.spatial.rebuild(w.entities);const hp=t.hp;
 for(let i=0;i<30&&w.projectiles.length;i++)updateProjectiles(w,1/30);
 expect(hp-t.hp).toBeCloseTo(estimate,0);
 expect(selectWeapon(a,t)).toBe(0);
});

it('gives purchased engineers finite defensive rifle fire without arming automatic construction behavior',()=>{
 const w=fixture(),hq=w.spawn('hq',0,-80,-170),u=w.spawn('engineer',0,-20,-170),worker=w.spawn('engineer',0,-20,-160),t=w.spawn('inf',1,0,-170);
 worker.constructionCrew={homeId:hq.id,slot:0};worker.engineerDuty={homeId:hq.id,phase:'rest',idleFor:0};
 u.heading=worker.heading=Math.PI/2;t.spottedUntil[0]=100;t.standingOrder='holdfire';u.mode='hold';u.holdPosition=true;
 for(let i=0;i<90;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 const shots=w.events.filter(e=>e.type==='fire'&&e.sourceId===u.id);
 expect(shots.length).toBeGreaterThan(0);expect(shots.length).toBeLessThanOrEqual(4);
 expect(u.ammo).toBeLessThan(u.maxAmmo!);expect(w.events.some(e=>e.type==='fire'&&e.sourceId===worker.id)).toBe(false);
});

it('SPAA has one cannon and one finite missile rack; passive IR and long-range radar AA remain distinct',()=>{
 for(const faction of FACTION_LIST){
  const spaa=factionUnitDefinition('spaa',faction);expect(spaa.weapons).toHaveLength(2);
  expect(spaa.weapons![0].flight).toBe('direct');expect(spaa.weapons![1].flight).toBe('guided');
  expect(factionUnitDefinition('sam',faction).weapons![0].guidance).toBe('radar');
  expect(factionUnitDefinition('irSam',faction).weapons![0].guidance).toBe('infrared');
 }
});

it('larger, less frequent deliveries preserve nominal helicopter and plane throughput at every upgrade level',()=>{
 const w=fixture(),depot=w.spawn('supply',0,-30,-170),oldHeliRates=[3.6,6.5,10.24],cfg=logistics.external;
 for(let level=0;level<3;level++){
  depot.buildingLevel=level+1;
  expect(externalHelicopterCapacity(w,depot)).toBe(360+level*140);
  expect(externalHelicopterCapacity(w,depot)/externalHelicopterInterval(w,depot)).toBeCloseTo(oldHeliRates[level]);
  expect((cfg.planeCapacity+level*cfg.planeCapacityPerLevel)/(cfg.planeInterval/(1+level*cfg.planeFrequencyPerLevel))).toBeCloseTo((480+level*140)/(45/(1+level*.2)));
 }
 expect(cfg.planePoolRate).toBe(12);expect(cfg.planeMinimumLoad).toBe(720);
});

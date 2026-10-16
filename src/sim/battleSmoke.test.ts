import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import {smokeCapacity,smokeCharges,refillSmoke} from './battleSmoke';
import {applyCommands} from './systems/commands';
import {weaponFireBlocker,weaponSpec,hasWeaponLineOfSight,weaponMuzzle,fireProjectile} from './systems/combat';
import {updateProjectiles} from './systems/projectiles';
import {updateTacticalAI} from './ai/TacticalAI';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import rules from '../data/battle-smoke.json';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:240},{x:270,z:270,r:30}];setBases(bases);const w=new World(52,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;const u=w.spawn('tank',0,0,0);u.heading=0;return {w,u};}
function mature(w:World){w.time+=rules.growSeconds;w.smoke.tick(w.time);}
it('orders consume finite charges, preserve movement and reject hostile control, helpers and garrisoned troops',()=>{
 const {w,u}=fixture();u.mode='move';u.dest={x:40,z:70};w.issue({type:'smoke',ids:[u.id],team:1});applyCommands(w);expect(w.smoke.active).toHaveLength(0);
 w.issue({type:'smoke',ids:[u.id]});applyCommands(w);expect(w.smoke.active).toHaveLength(1);expect(smokeCharges(u)).toBe(rules.vehicleCharges-1);expect(u.mode).toBe('move');expect(u.dest).toEqual({x:40,z:70});expect(w.smoke.deploy(w,u)).toBe(false);
 const engineer=w.spawn('engineer',0,10,0);engineer.constructionCrew={homeId:1,slot:0};expect(smokeCapacity(engineer)).toBe(0);
 const inf=w.spawn('inf',0,20,0);inf.garrisonId='house';expect(w.smoke.deploy(w,inf)).toBe(false);
});
it('mature smoke blocks optical sight and aimed fire for both teams, but not aircraft above it or radar tracking',()=>{
 const {w,u}=fixture(),a=w.spawn('tank',0,-30,7),b=w.spawn('tank',1,30,7);a.heading=Math.PI/2;a.cooldown=0;b.spottedUntil[0]=100;
 expect(w.vision.hasLineOfSight(a,b)).toBe(true);w.smoke.deploy(w,u);mature(w);
 expect(w.vision.hasLineOfSight(a,b)).toBe(false);expect(w.vision.hasLineOfSight(b,a)).toBe(false);expect(weaponFireBlocker(w,a,b,0)).toContain('Suits');
 a.y=b.y=30;expect(w.vision.hasLineOfSight(a,b)).toBe(true);a.y=b.y=0;
 const radar=w.spawn('sam',0,-30,7),heli=w.spawn('heli',1,30,7);radar.cooldown=0;radar.heading=Math.PI/2;heli.spottedUntil[0]=100;expect(weaponSpec(radar).guidance).toBe('radar');
 expect(w.vision.hasLineOfSight(radar,heli)).toBe(false);expect(w.vision.hasLineOfSight(radar,heli,true)).toBe(true);expect(hasWeaponLineOfSight(w,radar,heli)).toBe(true);expect(weaponFireBlocker(w,radar,heli,0)).toBeNull();
 w.vision.setFeatures([{id:'wall',kind:'wall',x:0,z:7,width:4,depth:30,height:20,blocksMovement:true}]);expect(w.vision.hasLineOfSight(radar,heli,true)).toBe(false);
});
it('screens develop and disperse in simulation time without stopping existing projectiles',()=>{
 const {w,u}=fixture(),a=w.spawn('tank',0,-30,7),b=w.spawn('tank',1,30,7);a.heading=Math.PI/2;const m=weaponMuzzle(a,weaponSpec(a),0);fireProjectile(w,a,b,m.x,m.y,m.z,0);const round=w.projectiles[0],oldX=round.x;w.smoke.deploy(w,u);
 expect(w.smoke.blocks(a,b)).toBe(false);mature(w);expect(w.smoke.blocks(a,b)).toBe(true);w.spatial.rebuild(w.entities);updateProjectiles(w,1/30);expect(round.x).toBeGreaterThan(oldX);
 w.time=rules.duration;w.smoke.tick(w.time);expect(w.smoke.active).toHaveLength(0);expect(w.vision.hasLineOfSight(a,b)).toBe(true);
});
it('replenishment takes time and real ammunition, with no free charges while moving or out of stock',()=>{
 const {w,u}=fixture(),depot=w.spawn('supply',0,30,0);w.smoke.deploy(w,u);w.time=10;depot.ammoStock=rules.ammoPerCharge;
 u.motionSpeed=5;refillSmoke(w,u,depot,rules.reloadSeconds);expect(smokeCharges(u)).toBe(1);expect(depot.ammoStock).toBe(rules.ammoPerCharge);
 u.motionSpeed=0;refillSmoke(w,u,depot,rules.reloadSeconds/2);expect(smokeCharges(u)).toBe(1);refillSmoke(w,u,depot,rules.reloadSeconds/2);expect(smokeCharges(u)).toBe(2);expect(depot.ammoStock).toBe(0);expect(u.smokeReadyAt).toBe(rules.cooldown);
 u.smokeCharges=0;refillSmoke(w,u,depot,rules.reloadSeconds*2);expect(smokeCharges(u)).toBe(0);
});
it('clouds, charges and cooldowns survive save continuation and affect the deterministic hash',()=>{
 const {w,u}=fixture();w.smoke.deploy(w,u);mature(w);const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<30;i++){w.tick(1/30);copy.tick(1/30);}expect(worldHash(copy)).toBe(worldHash(w));expect(copy.smoke.active).toHaveLength(1);copy.byId.get(u.id)!.smokeCharges=0;expect(worldHash(copy)).not.toBe(worldHash(w));copy.smoke.restore();expect(copy.smoke.active).toHaveLength(0);
});
it('the cloud cap rejects a deployment without spending charges, and AI uses the same command path',()=>{
 const {w}=fixture();for(let i=0;i<rules.maxClouds;i++)expect(w.smoke.deploy(w,w.spawn('tank',0,10,10))).toBe(true);
 const extra=w.spawn('tank',0,20,20);expect(w.smoke.deploy(w,extra)).toBe(false);expect(smokeCharges(extra)).toBe(rules.vehicleCharges);
 const ai=fixture().w,enemy=ai.spawn('tank',1,60,0);enemy.hp*=.4;enemy.suppression=30;ai.time=10;updateTacticalAI(ai,1,.5);expect(ai.pending.some(c=>c.type==='smoke'&&c.team===1&&c.ids.includes(enemy.id))).toBe(true);
});

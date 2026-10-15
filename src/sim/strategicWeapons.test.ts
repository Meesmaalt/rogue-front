import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {heightAt,resetHeightmap,setBases,setMapSize} from './heightmap';
import {beginStrategicBuild,strategicBuildStatus,updateStrategicWeapons,strategicStrike,nuclearResearchAvailable} from './strategicWeapons';
import {applyCommands} from './systems/commands';
import {updateProjectiles} from './systems/projectiles';
import {producerKind} from './systems/production';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import data from '../data/expansion.json';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:0,z:0,r:450},{x:350,z:350,r:50}];setMapSize(1024);setBases(bases);const w=new World(23,false,[],[],bases,false);w.networkMode=true;
 for(const [kind,x,z] of [['hq',-40,0],['generator',-40,-30],['supply',-30,30],['landStrategy',-30,-60],['airStrategy',-60,-60],['radar',-60,30]] as const)w.spawn(kind,0,x,z);
 const command=w.spawn('missileCommand',0,0,0),silo=w.spawn('icbmSilo',0,25,0),launcher=w.spawn('cruiseLauncher',0,0,25);w.teamCredits[0]=w.credits=10000;w.teamResources[0]=w.resources=10000;return {w,command,silo,launcher};}
it('missile branch has explicit prerequisites and producible mobile launchers',()=>{
 const {w,command}=fixture();expect(producerKind('cruiseLauncher')).toBe('missileCommand');expect(w.availableBuilds(0,'missileCommand')).toContain('icbmSilo');expect(w.availableBuilds(0,'landStrategy')).not.toContain('missileCommand'); // existing command reached its limit
 w.issue({type:'produce',kind:'cruiseLauncher',producerId:command.id});applyCommands(w);expect(command.productionQueue).toEqual(['cruiseLauncher']);
});
it('manufacture charges both balances once, pauses on lost logistics and stores real ammunition',()=>{
 const {w,silo}=fixture(),cost=data.strategic.payloads.icbm.cost;expect(beginStrategicBuild(w,silo.id,'icbm',0)).toBe(true);expect(w.credits).toBe(10000-cost);expect(w.resources).toBe(10000-cost);expect(beginStrategicBuild(w,silo.id,'icbm',0)).toBe(false);
 const depot=w.entities.find(e=>e.kind==='supply')!;depot.dead=true;updateStrategicWeapons(w,10);expect(silo.strategicWork?.progress).toBe(0);depot.dead=false;
 updateStrategicWeapons(w,55);expect(silo.strategicAmmo?.icbm).toBe(1);expect(silo.strategicWork).toBeUndefined();expect(w.credits).toBe(10000-cost);
});
it('nuclear payload requires paid research at level three and costs more time and resources',()=>{
 const {w,command,silo}=fixture();expect(strategicBuildStatus(w,silo,'nuclear').reason).toBeTruthy();expect(beginStrategicBuild(w,command.id,'research',0)).toBe(false);command.buildingLevel=3;
 expect(beginStrategicBuild(w,command.id,'research',0)).toBe(true);updateStrategicWeapons(w,119);expect(nuclearResearchAvailable(w,0)).toBe(false);updateStrategicWeapons(w,1);expect(nuclearResearchAvailable(w,0)).toBe(true);
 expect(beginStrategicBuild(w,silo.id,'nuclear',0)).toBe(true);expect(data.strategic.payloads.nuclear.cost).toBeGreaterThan(data.strategic.payloads.icbm.cost);expect(data.strategic.payloads.nuclear.seconds).toBeGreaterThan(data.strategic.payloads.icbm.seconds);
});
it.each(['cruise','icbm','nuclear'] as const)('%s consumes stock once and impacts through physical flight, with nuclear friendly fire',payload=>{
 const {w,launcher,silo}=fixture(),u=payload==='cruise'?launcher:silo,target=w.spawn('tank',1,400,0),friendly=w.spawn('tank',0,405,5);target.y=heightAt(target.x,target.z);friendly.y=heightAt(friendly.x,friendly.z);u.strategicAmmo={[payload]:1};
 strategicStrike(w,[u.id],payload,400,0,0);expect(w.projectiles).toHaveLength(1);expect(u.strategicAmmo[payload]).toBe(0);strategicStrike(w,[u.id],payload,400,0,0);expect(w.projectiles).toHaveLength(1);
 const shot=w.projectiles[0];expect(Math.hypot(shot.tx-400,shot.tz)).toBeGreaterThan(0);expect(shot.flight).toBe(payload==='cruise'?'guided':'ballistic');
 for(let i=0;i<1400&&w.projectiles.length;i++){w.spatial.rebuild(w.entities);updateProjectiles(w,1/30);}expect(w.projectiles).toHaveLength(0);expect(w.events.some(e=>e.type==='impact'&&e.visual===shot.visual)).toBe(true);expect(target.hp,JSON.stringify(w.events.filter(e=>e.type==='impact'))).toBeLessThan(target.def.hp);if(payload==='nuclear')expect(friendly.hp).toBeLessThan(friendly.def.hp);else expect(friendly.hp).toBe(friendly.def.hp);
});
it('in-progress research, ammunition and coordinate-guided missiles survive exact save/restore',()=>{
 const {w,command,launcher}=fixture();command.buildingLevel=3;beginStrategicBuild(w,command.id,'research',0);updateStrategicWeapons(w,10);launcher.strategicAmmo={cruise:1};strategicStrike(w,[launcher.id],'cruise',400,0,0);updateProjectiles(w,1/30);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));for(let i=0;i<50;i++){updateProjectiles(w,1/30);updateProjectiles(copy,1/30);updateStrategicWeapons(w,1/30);updateStrategicWeapons(copy,1/30);}expect(worldHash(copy)).toBe(worldHash(w));
});

import {updateConstruction} from './systems/construction';
import {canEngage,weaponFireBlocker} from './systems/combat';
it('defense towers are paid foundations, require a builder, and respect target classes and command power',()=>{
 const {w}=fixture();w.spawn('barracks',0,-100,-10);w.spawn('factory',0,-100,30);const engineer=w.spawn('engineer',0,65,0);
 expect(w.availableBuilds(0,'landCommand')).toEqual(expect.arrayContaining(['gunTurret','flakTurret','atTurret']));
 w.issue({type:'build',ids:[engineer.id],kind:'gunTurret',x:60,z:0});applyCommands(w);const tower=w.entities.find(e=>e.kind==='gunTurret')!;expect(tower).toBeDefined();expect(tower.underConstruction).toBe(true);expect(w.credits).toBe(10000-data.buildings.gunTurret.cost);
 const enemy=w.spawn('inf',1,60,30);enemy.spottedUntil[0]=100;expect(weaponFireBlocker(w,tower,enemy,0)).toBe('Rajatis pole valmis');updateConstruction(w,data.buildings.gunTurret.buildTime);expect(tower.underConstruction).toBe(false);
 const flak=w.spawn('flakTurret',0,30,60),at=w.spawn('atTurret',0,0,60),heli=w.spawn('heli',1,60,130),tank=w.spawn('tank',1,130,60);heli.airState='airborne';expect(canEngage(flak,heli)).toBe(true);expect(canEngage(flak,tank)).toBe(false);expect(canEngage(at,tank)).toBe(true);expect(canEngage(at,heli)).toBe(false);
 tower.x=300;tower.z=300;expect(weaponFireBlocker(w,tower,enemy,0)).toContain('juhtimisühendust');
});

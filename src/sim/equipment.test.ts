import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import {beginEquipmentRefit,equipmentStatus,updateEquipment} from './equipment';
import {worldHash} from './Replay';
import {saveWorld,loadWorld} from './SaveState';
import {equipmentCards} from '../ui/EquipmentCard';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:-100,z:0,r:120},{x:200,z:0,r:30}];setBases(bases);const w=new World(43,false,[],[],bases,false);w.networkMode=true;w.externalVictoryMode=true;w.platformRosterOnly=true;
 w.spawn('hq',0,-100,0);w.spawn('generator',0,-100,20);const depot=w.spawn('supply',0,-65,0);w.spawn('landStrategy',0,-100,-20);const tank=w.spawn('tank',0,-55,10);w.teamCredits[0]=w.teamResources[0]=10000;w.teamTechs[0].add('advanced-armor');return {w,depot,tank};}
function finish(w:World,seconds=13){for(let i=0;i<seconds*30;i++){w.time+=1/30;updateEquipment(w,1/30);}}
it('refits cost real money and repair stock, take time, and preserve damaged health and ammunition',()=>{
 const {w,depot,tank}=fixture(),speed=tank.def.speed,armor=tank.def.armorFront!;tank.hp*=.5;tank.ammo=7;
 expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(true);expect(w.teamCredits[0]).toBe(9890);expect(depot.repairStock).toBe(167);expect(tank.equipment).toBeUndefined();
 finish(w,4);expect(tank.refit).toBeDefined();finish(w,9);expect(tank.refit).toBeUndefined();expect(tank.equipment?.protection).toBe('reactive');expect(tank.def.speed).toBeCloseTo(speed*.88);expect(tank.def.armorFront).toBeGreaterThan(armor);expect(tank.hp/tank.def.hp).toBeCloseTo(.5);expect(tank.ammo).toBe(7);
 expect(beginEquipmentRefit(w,tank,'protection','standard')).toBe(true);finish(w,6);expect(tank.def.speed).toBeCloseTo(speed);expect(tank.def.armorFront).toBe(armor);expect(tank.ammo).toBe(7);
});
it('weapon swaps change the actual role and never turn rifle rounds into free missiles',()=>{
 const {w,depot}=fixture(),u=w.spawn('inf',0,-55,-10);depot.ammoStock=0;expect(beginEquipmentRefit(w,u,'weapon','anti-tank')).toBe(true);finish(w);
 expect(u.def.weapons?.[0].profile).toBe('atgm');expect(u.ammo).toBe(0);expect(u.def.speed).toBeLessThan(w.unitDefinition('inf',0).speed);
 expect(beginEquipmentRefit(w,u,'weapon','anti-air')).toBe(true);finish(w);expect(u.def.weapons?.[0].targets).toBe('air');expect(u.ammo).toBe(0);
 expect(w.unitDefinition('inf',0).weapons?.[0].profile).toBe('rifle');expect(equipmentCards(w,u,true)).toContain('Õhutõrjerühm');
});
it('service gates prevent moving, airborne, occupied, hostile, unaffordable and remote refits; loss of power pauses work',()=>{
 const {w,depot,tank}=fixture();tank.dest={x:0,z:0};expect(equipmentStatus(w,tank,'protection','aps').allowed).toBe(false);tank.dest=null;
 w.teamTechs[0].delete('advanced-armor');expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(false);expect(beginEquipmentRefit(w,tank,'protection','aps')).toBe(false);w.teamTechs[0].add('advanced-armor');
 tank.cargoUnitIds=[99];expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(false);tank.cargoUnitIds=[];
 tank.x=250;expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(false);tank.x=-55;
 w.teamCredits[0]=1;expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(false);w.teamCredits[0]=10000;
 expect(beginEquipmentRefit(w,tank,'weapon','anti-air')).toBe(false);expect(beginEquipmentRefit(w,tank,'protection','reactive')).toBe(true);
 depot.disabledUntil=100;finish(w,5);expect(tank.refit?.progress).toBe(0);depot.disabledUntil=0;finish(w);expect(tank.equipment?.protection).toBe('reactive');
 const plane=w.spawn('fighter',0,-55,-10);plane.airState='airborne';expect(beginEquipmentRefit(w,plane,'weapon','strike')).toBe(false);
});
it('commands, cancellation, pending work and final configurations survive save/hash without stacked upgrades',()=>{
 const {w,tank}=fixture();w.issue({type:'configure-unit',ids:[tank.id],slot:'mobility',module:'engine',team:1});w.tick(1/30);expect(tank.refit).toBeUndefined();
 w.issue({type:'configure-unit',ids:[tank.id],slot:'mobility',module:'engine'});w.tick(1/30);finish(w,3);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));finish(w);finish(copy);expect(worldHash(copy)).toBe(worldHash(w));
 expect(tank.def.speed).toBeCloseTo(w.unitDefinition('tank',0).speed*1.12);expect(beginEquipmentRefit(w,tank,'mobility','engine')).toBe(false);
 expect(beginEquipmentRefit(w,tank,'weapon','he-ammo')).toBe(true);w.issue({type:'cancel-refit',ids:[tank.id]});w.tick(1/30);expect(tank.refit).toBeUndefined();expect(tank.equipment?.weapon).toBeUndefined();
});
it('active protection reloads finite charges from warehouse ammo rather than regenerating for free',()=>{
 const {w,depot,tank}=fixture();depot.ammoStock=6;expect(beginEquipmentRefit(w,tank,'protection','aps')).toBe(true);finish(w,17);expect(tank.equipmentCharges).toBeCloseTo(4);expect(depot.ammoStock).toBeCloseTo(2);
 tank.equipmentCharges=0;depot.ammoStock=0;finish(w,10);expect(tank.equipmentCharges).toBe(0);
});
it('a mortar-equipped infantry chassis accepts area fire and launches its real ballistic weapon',()=>{
 const {w}=fixture(),u=w.spawn('inf',0,-55,-10);expect(beginEquipmentRefit(w,u,'weapon','mortar-team')).toBe(true);finish(w);
 u.ammo=8;u.heading=Math.PI/2;u.turretYaw=0;w.spawn('reconInf',0,-15,-10);w.vision.update(w.entities);
 w.issue({type:'fire-mission',ids:[u.id],x:-15,z:-10});w.tick(1/30);
 expect(u.fireMission).toEqual({x:-15,z:-10});expect(w.events.some(e=>e.type==='fire'&&e.sourceId===u.id&&e.visual==='mortar')).toBe(true);
});

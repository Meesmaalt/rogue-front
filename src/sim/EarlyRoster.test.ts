import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {applyCommands} from './systems/commands';
import {updateProduction,producerKind} from './systems/production';
import {updateUnits} from './systems/units';
import {queuePassenger} from './transport';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import {FACTION_LIST,factionLandUnits,factionAirUnits} from './factions';
import {CORE_PLATFORMS} from './platforms';
afterEach(resetHeightmap);
function fixture(){const bases=[{x:-60,z:0,r:220},{x:250,z:250,r:20}];setBases(bases);const w=new World(152,false,[],[],bases,false);w.networkMode=true;w.platformRosterOnly=true;w.spawn('hq',0,-60,0);w.spawn('landCommand',0,-50,-35);w.spawn('generator',0,-90,-35);w.teamCredits[0]=w.teamResources[0]=w.credits=w.resources=5000;const barracks=w.spawn('barracks',0,-25,0);w.nav.syncBuildings(w.entities);return {w,barracks};}
it('level-one barracks actually produces infantry and a transport van without a supply depot or consuming HQ stocks',()=>{
 const {w,barracks}=fixture(),hq=w.hq[0]!,stocks=[hq.ammoStock,hq.fuelStock];
 expect(w.productionOperational(barracks,'inf').operational).toBe(true);
 for(const kind of ['inf','transportVan'] as const)w.issue({type:'produce',kind,producerId:barracks.id});
 applyCommands(w);expect(barracks.productionQueue).toEqual(['inf','transportVan']);
 for(let i=0;i<900&&barracks.productionQueue.length;i++){w.time+=1/30;updateProduction(w,1/30);}
 expect(w.entities.some(e=>e.kind==='inf')).toBe(true);expect(w.entities.some(e=>e.kind==='transportVan')).toBe(true);
 expect([hq.ammoStock,hq.fuelStock]).toEqual(stocks);expect(w.entities.some(e=>e.kind==='supply')).toBe(false);
});
it('every nation exposes distinct ATGM, scout vehicle and scout helicopter roles and sensible first-level choices',()=>{
 const {w,barracks}=fixture();
 for(const faction of FACTION_LIST){
  w.playerFaction=faction;
  for(const kind of ['atgm','reconVehicle','transportVan'] as const){expect(factionLandUnits(faction)).toContain(kind);expect(CORE_PLATFORMS.has(kind)).toBe(true);}
  expect(factionAirUnits(faction)).toContain('scoutHeli');
  expect(w.unitDefinition('reconVehicle').opticsRange!).toBeGreaterThan(w.unitDefinition('apc').opticsRange!);
  expect(w.unitDefinition('scoutHeli').opticsRange!).toBeGreaterThan(w.unitDefinition('heli').opticsRange!);
  expect(w.unitDefinition('scoutHeli').weapons).toEqual([]);
 }
 for(const kind of ['inf','engineer','reconInf','mortar','manpad','transportVan','tank','apc','reconVehicle','irSam','howitzer','transport','scoutHeli','fighter'] as const)expect(w.unitRequiredBuildingLevel(kind),kind).toBe(1);
 barracks.buildingLevel=2;expect(w.canProduceAtLevel(barracks,'atgm')).toBe(true);expect(w.productionOperational(barracks,'atgm').operational).toBe(true);
 expect(producerKind('transportVan')).toBe('barracks');expect(producerKind('scoutHeli')).toBe('helipad');
 expect(w.unitRequiredBuildingLevel('ifv')).toBe(2);expect(w.unitRequiredBuildingLevel('sam')).toBe(3);
 w.playerFaction='usa';expect(w.unitDefinition('atgm').weapons![0].name).toContain('TOW');
});
it('the unarmed van boards finite infantry seats, saves loaded squads and unloads through navigable exits',()=>{
 const {w}=fixture(),van=w.spawn('transportVan',0,20,20),a=w.spawn('inf',0,23,20),b=w.spawn('inf',0,17,20),extra=w.spawn('inf',0,20,24);
 a.squadMembers=b.squadMembers=6;expect(queuePassenger(w,van,a)).toBe(true);expect(queuePassenger(w,van,b)).toBe(true);expect(queuePassenger(w,van,extra)).toBe(false);
 for(let i=0;i<15;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(van.cargoUnitIds).toHaveLength(2);expect(a.loadedIntoId).toBe(van.id);expect(van.def.weapons).toEqual([]);
 const copy=fixture().w;loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 w.issue({type:'unload',ids:[van.id],x:50,z:20});applyCommands(w);
 for(let i=0;i<900&&van.cargoUnitIds.length;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(van.cargoUnitIds).toHaveLength(0);for(const e of [a,b]){expect(e.loadedIntoId).toBeNull();expect(w.nav.isWalkableWorld(e.x,e.z,e.def.radius)).toBe(true);}
});
it('power demand grows moderately and upgrades matter while one early generator remains sufficient',()=>{
 const {w,barracks}=fixture(),before=w.powerStatus(0);
 expect(before.ratio).toBe(1);expect(before.use).toBeGreaterThan(18);expect(before.use).toBeLessThan(30);
 w.spawn('factory',0,30,-40);w.spawn('airCommand',0,-30,45);w.spawn('helipad',0,20,45);w.spawn('airbase',0,60,60);w.spawn('radar',0,50,0);w.spawn('supply',0,80,-40);w.time++;
 const expanded=w.powerStatus(0);expect(expanded.use).toBeGreaterThan(before.supply);expect(expanded.ratio).toBeLessThan(1);
 w.spawn('generator',0,-100,60);w.time++;expect(w.powerStatus(0).ratio).toBe(1);
 const use=w.powerStatus(0).use;barracks.buildingLevel=3;w.time++;expect(w.powerStatus(0).use).toBeGreaterThan(use);
});

it('level-one airports can queue a basic fighter without a hidden research or warehouse prerequisite',()=>{
 const {w}=fixture();w.spawn('airCommand',0,-25,40);const pad=w.spawn('airbase',0,-10,55);w.issue({type:'produce',kind:'fighter',producerId:pad.id});applyCommands(w);
 expect(w.teamTechs[0].has('air')).toBe(false);expect(pad.productionQueue).toEqual(['fighter']);
});
it('a level-one scout helicopter can be produced and take off on a normal move order without acquiring weapons',()=>{
 const {w}=fixture();w.spawn('supply',0,30,-35);w.spawn('airCommand',0,-25,35);const pad=w.spawn('helipad',0,20,35);
 w.issue({type:'produce',kind:'scoutHeli',producerId:pad.id});applyCommands(w);expect(pad.productionQueue).toEqual(['scoutHeli']);
 for(let i=0;i<600&&pad.productionQueue.length;i++){w.time+=1/30;updateProduction(w,1/30);}
 const scout=w.entities.find(e=>e.kind==='scoutHeli')!;expect(scout).toBeDefined();const initial={x:scout.x,z:scout.z};
 w.issue({type:'move',ids:[scout.id],x:80,z:75});applyCommands(w);
 for(let i=0;i<900;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}
 expect(scout.airState).toBe('airborne');expect(Math.hypot(scout.x-initial.x,scout.z-initial.z)).toBeGreaterThan(20);expect(scout.def.weapons).toEqual([]);expect(w.events.some(e=>e.type==='fire'&&e.sourceId===scout.id)).toBe(false);
});

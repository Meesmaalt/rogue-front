import {it,expect,afterEach} from 'vitest';
import {World} from './World';
import {setBases,resetHeightmap} from './heightmap';
import {occupiedSeats,transportCapacity} from './transport';
import {applyCommands} from './systems/commands';
import {updateUnits} from './systems/units';
import {saveWorld,loadWorld} from './SaveState';
import {worldHash} from './Replay';
import type {MapFeatureDef} from './mapFeatures';
const bases=[{x:0,z:0,r:200},{x:250,z:250,r:20}];
function world(features:MapFeatureDef[]=[]){setBases(bases);const w=new World(81,false,[],features,bases,false);w.networkMode=true;return w;}
function steps(w:World,n:number){for(let i=0;i<n;i++){w.time+=1/30;w.spatial.rebuild(w.entities);updateUnits(w,1/30);}}
afterEach(resetHeightmap);
it('APC collects ATGM/MANPAD, reserves soldier seats and unloads on free ground',()=>{
 const w=world(),carrier=w.spawn('apc',0,-25,0),at=w.spawn('atgm',0,0,0),aa=w.spawn('manpad',0,0,12),extra=w.spawn('inf',0,0,24);
 w.issue({type:'load',ids:[at.id,aa.id,extra.id],targetId:carrier.id});applyCommands(w);
 expect(carrier.transportQueue).toEqual([at.id,aa.id]);expect(occupiedSeats(w,carrier,true)).toBeLessThanOrEqual(transportCapacity(carrier));
 steps(w,900);expect(at.loadedIntoId).toBe(carrier.id);expect(aa.loadedIntoId).toBe(carrier.id);expect(extra.loadedIntoId).toBeNull();
 expect(at.dest).toBeNull();expect(at.target).toBeNull();
 w.issue({type:'unload',ids:[carrier.id],x:45,z:0});applyCommands(w);steps(w,900);
 expect(carrier.cargoUnitIds).toEqual([]);for(const p of [at,aa]){expect(p.loadedIntoId).toBeNull();expect(w.nav.isWalkableWorld(p.x,p.z,p.def.radius)).toBe(true);expect(Math.hypot(p.x-carrier.x,p.z-carrier.z)).toBeGreaterThan(p.def.radius+carrier.def.radius);}
});
it('airborne helicopter must land before unloading; active orders resume with identical hashes',()=>{
 const w=world(),carrier=w.spawn('transport',0,0,0),p=w.spawn('reconInf',0,0,0);carrier.x=-25;carrier.airState='airborne';carrier.y=30;
 w.issue({type:'load',ids:[carrier.id],targetId:p.id});applyCommands(w);steps(w,450);expect(p.loadedIntoId).toBe(carrier.id);
 w.issue({type:'unload',ids:[carrier.id],x:40,z:0});applyCommands(w);
 steps(w,1);expect(p.loadedIntoId).toBe(carrier.id);
 const copy=world();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<450;i++){steps(w,1);steps(copy,1);}expect(worldHash(copy)).toBe(worldHash(w));expect(p.loadedIntoId).toBeNull();
 w.issue({type:'fast-move',ids:[carrier.id],x:65,z:0});w.issue({type:'amove',ids:[carrier.id],x:85,z:0,append:true});applyCommands(w);steps(w,450);expect(carrier.dest).toBeNull();expect(carrier.mode).toBe('idle');
});

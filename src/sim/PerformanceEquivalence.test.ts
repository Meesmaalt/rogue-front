import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {SpatialHash} from './SpatialHash';
import {TerrainState} from './TerrainState';
import {pointInFeature,type MapFeatureDef} from './mapFeatures';
import {resetHeightmap} from './heightmap';
import {worldHash} from './Replay';
import {coverValueAt} from './systems/sensors';
import {updateTacticalSupply} from './systems/tacticalSupply';
afterEach(resetHeightmap);
it('cover broad phase retains rotated padded corners and matches a full scan',()=>{
 const features:MapFeatureDef[]=Array.from({length:100},(_,i)=>({id:'f'+i,kind:i%3?'cover':'building',appearance:i%4?'hedge':'forest',shape:i%5===0?'ellipse':undefined,x:(i%10)*31-150,z:Math.floor(i/10)*29-150,width:17+i%8,depth:9+i%13,rotation:i*.37,height:1+i%4}));
 const w=new World(19,false,[],features,[{x:-250,z:-250,r:20},{x:250,z:250,r:20}],false);w.networkMode=true;
 const lookup=w.terrain.coverFeaturesAt.bind(w.terrain);
 for(let z=-170;z<170;z+=9)for(let x=-170;x<170;x+=11){
  w.terrain.coverFeaturesAt=()=>w.mapFeatures;const reference=coverValueAt(w,x,z);
  w.terrain.coverFeaturesAt=lookup;expect(coverValueAt(w,x,z)).toBe(reference);
  for(const f of w.mapFeatures)if(pointInFeature(x,z,f,.25)&&['building','wall','chokepoint','cover'].includes(f.kind))expect(lookup(x,z)).toContain(f);
 }
 expect(lookup(500,500)).toHaveLength(0);expect(new TerrainState([]).coverFeaturesAt(0,0)).toHaveLength(0);
});
it('occupied bucket clearing removes old/dead/loaded entries and preserves neighborhood order',()=>{
 const w=new World(23,false,[],[],[],false),a=w.spawn('inf',0,-20,-20),b=w.spawn('tank',0,0,0),grid=new SpatialHash(16);
 const ids=()=>{const result:number[]=[];grid.queryRadius(0,0,100,u=>{result.push(u.id);});return result;};
 grid.rebuild([a,b]);expect(ids()).toEqual([a.id,b.id]);a.x=80;a.z=80;b.dead=true;grid.rebuild([a,b]);expect(ids()).toEqual([a.id]);
 a.loadedIntoId=999;grid.rebuild([a,b]);expect(ids()).toEqual([]);grid.clear();a.loadedIntoId=null;grid.rebuild([a]);expect(grid.nearest(80,80,1,()=>true)).toBe(a);
});
it('fuel convoy subset preserves first donor and finite-stock handover order',()=>{
 const w=new World(29,false,[],[],[],false);w.networkMode=true;
 const vehicle=w.spawn('tank',0,0,0),wrongTeam=w.spawn('logiTruck',1,0,0),first=w.spawn('logiTruck',0,5,0),second=w.spawn('logiTruck',0,1,0);
 for(const u of [wrongTeam,first,second]){u.logisticsPayload={ammo:0,fuel:20,repair:0};u.cargo=20;}
 vehicle.fuel=0;const other=w.spawn('tank',0,2,0);other.fuel=0;
 const reference=w.entities.find(n=>n!==vehicle&&!n.dead&&n.team===vehicle.team&&n.kind==='logiTruck'&&(n.logisticsPayload?.fuel??0)>0&&Math.hypot(n.x-vehicle.x,n.z-vehicle.z)<=18);
 expect(reference).toBe(first);updateTacticalSupply(w,1/30);expect(first.logisticsPayload!.fuel).toBeLessThan(20);expect(second.logisticsPayload!.fuel).toBe(20);expect(wrongTeam.logisticsPayload!.fuel).toBe(20);expect(vehicle.fuel).toBeGreaterThan(0);expect(other.fuel).toBeGreaterThan(0);expect(worldHash(w)).toBeTruthy();
});

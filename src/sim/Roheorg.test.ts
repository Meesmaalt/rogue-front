import {afterEach,expect,it} from "vitest";
import {World} from "./World";
import {FOCUS_MAP} from "./proceduralMap";
import {resetHeightmap,setTerrainProfile,setBases,setProceduralSeed} from "./heightmap";
import {pointInFeature,featureCorners,type MapFeatureDef} from "./mapFeatures";
import {createSkirmish} from "./scenario";
import {SIM_STEP} from "./constants";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
afterEach(resetHeightmap);
const run=(w:World,s:number)=>{for(let i=0;i<s*30;i++)w.tick(SIM_STEP);};
function world(features=FOCUS_MAP.map.features!):World{setBases(FOCUS_MAP.map.bases);setProceduralSeed(FOCUS_MAP.seed);setTerrainProfile("farmland");const w=new World(FOCUS_MAP.seed,false,FOCUS_MAP.map.resources,features,FOCUS_MAP.map.bases,FOCUS_MAP.map.baseDefenses);w.networkMode=true;return w;}
it("rotated visible geometry agrees with navigation and attack-move routes around a house",()=>{
 const f:MapFeatureDef={id:"house",kind:"building",x:0,z:0,width:12,depth:24,rotation:Math.PI/4,height:5};
 for(const p of featureCorners(f))expect(pointInFeature(p.x,p.z,f,.001)).toBe(true);
 const w=world([f]);const u=w.spawn("tank",0,-30,0);w.issue({type:"amove",ids:[u.id],x:30,z:0});
 for(let i=0;i<600;i++){w.tick(SIM_STEP);expect(pointInFeature(u.x,u.z,f)).toBe(false);}
 expect(Math.hypot(u.x-30,u.z)).toBeLessThan(5);
});
it("the ready deployment has powered production, actual combat damage and reproducible save continuation",()=>{
 const w=world();createSkirmish(w,true);run(w,2);
 const factory=w.entities.find(e=>e.kind==="factory"&&e.team===0)!;
 expect(w.productionOperational(factory,"tank").operational).toBe(true);
 const group=w.entities.filter(e=>e.team===0&&["tank","apc","inf","reconVehicle"].includes(e.kind));
 const enemy=w.entities.filter(e=>e.team===1&&e.def.damage>0&&e.def.speed>0);
 w.issue({type:"amove",ids:group.map(e=>e.id),x:32,z:-8});
 w.issue({type:"amove",team:1,ids:enemy.map(e=>e.id),x:-32,z:8});run(w,35);
 expect(w.entities.some(e=>e.def.speed>0&&e.kind!=="engineer"&&e.hp<e.def.hp)||enemy.some(e=>e.dead)).toBe(true);
 expect([...group,...enemy].some(e=>(e.ammo??0)<(e.maxAmmo??0))).toBe(true);
 const saved=JSON.parse(JSON.stringify(saveWorld(w))),copy=world();loadWorld(copy,saved);expect(worldHash(copy)).toBe(worldHash(w));run(w,1);run(copy,1);expect(worldHash(copy)).toBe(worldHash(w));
});

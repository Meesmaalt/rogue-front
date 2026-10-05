import {it,expect,afterEach} from "vitest";
import {World} from "./World";
import {setBases,resetHeightmap} from "./heightmap";
import {maxHitPoints,effectiveArmor,groundTerrainFactor,unitUpgradeStatus,UNIT_UPGRADES} from "./unitStats";
import {applyCommands} from "./systems/commands";
import {fireProjectile,weaponSpec,weaponRange} from "./systems/combat";
import {updateProjectiles} from "./systems/projectiles";
import {updateUnits} from "./systems/units";
import {updateProduction} from "./systems/production";
import {saveWorld,loadWorld} from "./SaveState";
import {worldHash} from "./Replay";
import type {MapFeatureDef} from "./mapFeatures";
import {factionUnitDefinition,UNITS} from "./units";
const bases=[{x:0,z:-200,r:160},{x:180,z:180,r:30}];
function fixture(features:MapFeatureDef[]=[]){
 setBases(bases);const w=new World(77,false,[{x:280,z:280,radius:5,amount:0}],features,bases,false);w.networkMode=true;
 w.spawn("hq",0,-35,-200);w.spawn("generator",0,-35,-170);w.spawn("landCommand",0,-35,-225);
 const depot=w.spawn("supply",0,-10,-170);depot.ammoStock=5000;depot.fuelStock=5000;depot.repairStock=500;
 w.spawn("landStrategy",0,-65,-220);w.teamCredits[0]=w.teamResources[0]=10000;
 return w;
}
afterEach(resetHeightmap);
it("A1: research and retrofit spend once, stop AP, preserve damage and repair/save the upgraded maximum",()=>{
 const w=fixture(),u=w.spawn("tank",0,0,-200),shooter=w.spawn("tank",1,20,-200),depot=w.entities.find(e=>e.kind==="supply")!;
 const credits=w.teamCredits[0],repair=depot.repairStock!;u.hp=u.def.hp*.5;u.mode="hold";u.holdPosition=true;u.standingOrder="holdfire";
 w.issue({type:"upgrade",ids:[u.id],upgrade:"armor"});applyCommands(w);
 expect(u.upgrades.has("armor")).toBe(false);expect(w.teamCredits[0]).toBe(credits);
 w.issue({type:"research",tech:"advanced-armor"});applyCommands(w);expect(w.hasTech(0,"advanced-armor")).toBe(true);
 expect(unitUpgradeStatus(w,u,"armor").allowed).toBe(true);
 const rawArmor=effectiveArmor(u,"front");w.issue({type:"upgrade",ids:[u.id,u.id],upgrade:"armor"});applyCommands(w);
 expect(w.teamCredits[0]).toBe(credits-220-UNIT_UPGRADES.armor.cost);expect(depot.repairStock).toBe(repair-UNIT_UPGRADES.armor.repairCost);
 expect(effectiveArmor(u,"front")).toBeCloseTo(rawArmor*1.2);expect(u.hp/maxHitPoints(u)).toBeCloseTo(.5);
 // Identical launched AP shot: upgraded armor prevents penetration that damaged the original.
 u.heading=Math.PI/2;shooter.heading=-Math.PI/2;
 const spec=weaponSpec(shooter);spec.penetration=rawArmor*.95/(1-20/500);spec.accuracy=1;fireProjectile(w,shooter,u,shooter.x,shooter.y+2,shooter.z,0);const hp=u.hp;
 for(let i=0;i<12;i++)updateProjectiles(w,1/30);expect(u.hp).toBe(hp);
 u.upgrades.delete("armor");fireProjectile(w,shooter,u,shooter.x,shooter.y+2,shooter.z,0);
 for(let i=0;i<12;i++)updateProjectiles(w,1/30);expect(u.hp).toBeLessThan(hp);expect(spec.warhead).toBe("kinetic");
 u.upgrades.add("armor");u.hp=maxHitPoints(u)-1;shooter.dead=true;w.entities.splice(w.entities.indexOf(shooter),1);
 const engineer=w.spawn("engineer",0,3,-200);engineer.mode="repair";engineer.target=u;w.spatial.rebuild(w.entities);
 updateUnits(w,1);expect(u.hp).toBe(maxHitPoints(u));expect(depot.repairStock).toBeLessThan(repair-UNIT_UPGRADES.armor.repairCost);
 const copy=fixture();loadWorld(copy,JSON.parse(JSON.stringify(saveWorld(w))));const restored=copy.byId.get(u.id)!;
 expect(maxHitPoints(restored)).toBe(maxHitPoints(u));expect(effectiveArmor(restored,"front")).toBe(effectiveArmor(u,"front"));expect(worldHash(copy)).toBe(worldHash(w));
 for(let i=0;i<5;i++){w.tick(1/30);copy.tick(1/30);}expect(worldHash(copy)).toBe(worldHash(w));
});
it("A1: faction work duration determines completion and finite materials, without changing the shared roster",()=>{
 const w=fixture(),b=w.spawn("factory",0,0,-220),original=factionUnitDefinition("tank",w.playerFaction);
 const duration=UNITS.tank.buildTime*2,variant={...original,buildTime:duration};
 const realDefinition=w.unitDefinition.bind(w);w.unitDefinition=(kind,team=w.playerTeam)=>kind==="tank"&&team===0?variant:realDefinition(kind,team);
 b.productionQueue=["tank"];b.productionProgress=UNITS.tank.buildTime;const depot=w.nearestSupplyDepot(0,b,true)!,before=depot.ammoStock!;
 updateProduction(w,1/30);expect(w.entities.some(e=>e.kind==="tank")).toBe(false);
 b.productionProgress=duration-.01;const stock=depot.ammoStock!;updateProduction(w,1/30);
 const unit=w.entities.find(e=>e.kind==="tank")!;expect(unit).toBeDefined();expect(unit.def.buildTime).toBe(duration);
 expect(stock-depot.ammoStock!).toBeCloseTo(.01*Math.max(1,variant.cost/duration*.12));expect(depot.ammoStock).toBeLessThan(before);
 expect(original.buildTime).toBe(UNITS.tank.buildTime);
});
it("A1: road/forest class factors and low-supply range share rules; stale attack IDs reveal no live destination",()=>{
 const w=fixture([{id:"road",kind:"road",x:0,z:-200,width:12,depth:90},{id:"forest",kind:"cover",appearance:"forest",x:50,z:-200,width:50,depth:80}]);
 const foot=w.spawn("inf",0,0,-200),wheel=w.spawn("apc",0,0,-200),tank=w.spawn("tank",0,0,-200),target=w.spawn("tank",1,30,-200);
 expect(groundTerrainFactor(w,wheel)).toBe(1.28);expect(groundTerrainFactor(w,foot)).toBe(1.08);expect(groundTerrainFactor(w,tank)).toBe(1.22);
 expect(groundTerrainFactor(w,foot,50,-200)).toBeGreaterThan(groundTerrainFactor(w,tank,50,-200));
 tank.supply=5;tank.upgrades.add("range");expect(weaponRange(tank,weaponSpec(tank))).toBeCloseTo(weaponSpec(tank).range*1.2*.9);
 target.spottedUntil[0]=0;w.issue({type:"attack",ids:[tank.id],targetId:target.id});applyCommands(w);expect(tank.target).toBeNull();expect(tank.dest).toBeNull();
 target.spottedUntil[0]=1;w.issue({type:"attack",ids:[tank.id],targetId:target.id});applyCommands(w);expect(tank.dest?.x).toBe(30);
 target.spottedUntil[0]=0;target.x=160;tank.standingOrder="holdfire";w.spatial.rebuild(w.entities);updateUnits(w,1/30);
 expect(tank.target).toBeNull();expect(tank.dest?.x).toBe(30);
});

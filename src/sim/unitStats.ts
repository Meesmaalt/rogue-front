import {heightAt} from "./heightmap";
import upgrades from "../data/unit-upgrades.json";
import tech from "../data/tech.json";
import mobility from "../data/mobility.json";
import type {Entity,Team,WeaponSpec} from "./types";
import type {World} from "./World";
export type UnitUpgrade="armor"|"weapon"|"range";
export const UNIT_UPGRADES=upgrades;
export function maxHitPoints(u:Entity):number {return u.def.hp*(u.upgrades.has("armor")?upgrades.armor.hpMultiplier:1);}
export function effectiveArmor(u:Entity,face:"front"|"side"|"rear"):number {
  const base=face==="front"?u.def.armorFront??8:face==="side"?u.def.armorSide??6:u.def.armorRear??4;
  return Math.round(base*(u.upgrades.has("armor")?upgrades.armor.armorMultiplier:1)*10)/10;
}
export function weaponPenetration(u:Entity,spec:WeaponSpec):number {return spec.penetration*(u.upgrades.has("weapon")?upgrades.weapon.penetrationMultiplier:1);}
export function weaponDamage(u:Entity,spec:WeaponSpec):number {return spec.damage*(u.upgrades.has("weapon")?upgrades.weapon.damageMultiplier:1);}
export function slotRange(u:Entity,spec:Pick<WeaponSpec,"range">):number {return spec.range*(u.upgrades.has("range")?upgrades.range.rangeMultiplier:1)*((u.supply??100)>10?1:.9);}
export function groundMobilityClass(u:Entity):"infantry"|"tracked"|"wheeled" {
  return u.squadMaxMembers||u.def.category==="infantry"?"infantry":["apc","reconVehicle","logiTruck"].includes(u.kind)?"wheeled":"tracked";
}
export function mobilityProfile(u:Entity){return mobility[groundMobilityClass(u)];}
export function groundTerrainFactor(w:World,u:Entity,x=u.x,z=u.z):number {
  if(w.terrain.roadAt(x,z))return mobilityProfile(u).roadSpeed;
  return w.terrain.densityAt(x,z)>0?w.terrain.movementFactor(u,x,z):w.terrain.slowCoverAt(x,z)?mobilityProfile(u).forestSpeed:1;
}
export interface PurchaseStatus {allowed:boolean;reason:string;cost:number;depotId?:number}
export function researchStatus(w:World,team:Team,key:"air"|"advanced-armor"):PurchaseStatus {
  const spec=tech[key],cost=spec.cost;
  const result=(reason:string):PurchaseStatus=>({allowed:!reason,reason,cost});
  if(w.hasTech(team,key))return result("Juba avatud");
  if(spec.requires.some(t=>!w.hasTech(team,t)))return result("Vajab inseneritehnoloogiat");
  const kind=key==="air"?"airCommand":"landStrategy";
  const facility=w.entities.find(e=>!e.dead&&!e.underConstruction&&(e.disabledUntil??0)<=w.time&&e.team===team&&e.kind===kind&&w.hasCommandLink(e));
  if(!facility)return result(key==="air"?"Vajab töötavat õhujuhtimiskeskust":"Vajab töötavat maastrateegia keskust");
  if(w.powerStatus(team).ratio<.25)return result("Energiapuudus");
  if(w.teamCredits[team]<cost||w.teamResources[team]<cost)return result("Ressursse või krediiti napib");
  return result("");
}
export function unitUpgradeStatus(w:World,u:Entity,key:UnitUpgrade):PurchaseStatus {
  const spec=upgrades[key],result=(reason:string,depotId?:number):PurchaseStatus=>({allowed:!reason,reason,cost:spec.cost,depotId});
  if(u.dead||u.loadedIntoId!=null||u.underConstruction||u.def.speed<=0||u.def.damage<=0)return result("Vajab aktiivset lahinguüksust");
  if(u.upgrades.has(key))return result("Paigaldatud");
  if(key==="armor"&&u.def.category!=="armor")return result("Soomuspakett on maasoomukitele");
  if(key==="armor"&&!w.hasTech(u.team,upgrades.armor.requiresTech))return result("Vajab täiustatud soomuse uuringut");
  const kind=u.def.armor==="air"?"airStrategy":u.def.domain==="sea"?"seaStrategy":"landStrategy";
  if(!w.entities.some(e=>!e.dead&&!e.underConstruction&&(e.disabledUntil??0)<=w.time&&e.team===u.team&&e.kind===kind&&w.hasCommandLink(e)))return result("Vajab töötavat vastava haru strateegiakeskust");
  if((u.motionSpeed??0)>.5||u.dest!=null||u.target!=null)return result("Peata üksus uuendamiseks");
  if(u.def.armor==="air"&&!["grounded","rearming"].includes(u.airState??""))return result("Õhusõiduk peab olema baasis");
  if((u.disabledUntil??0)>w.time)return result("Üksus on häiritud");
  const depot=w.nearestSupplyDepot(u.team,u,true);
  if(!depot||depot.dead||depot.underConstruction||(depot.disabledUntil??0)>w.time||!w.connectedSupplyNodes(u.team).some(n=>n.id===depot.id)||Math.hypot(depot.x-u.x,depot.z-u.z)>80)return result("Vajab ühendatud ladu 80 m raadiuses");
  if((depot.repairStock??0)<spec.repairCost)return result("Laos napib remondivaru",depot.id);
  if(w.powerStatus(u.team).ratio<.25)return result("Energiapuudus",depot.id);
  if(w.teamCredits[u.team]<spec.cost||w.teamResources[u.team]<spec.cost)return result("Ressursse või krediiti napib",depot.id);
  return result("",depot.id);
}

const travelCosts=new WeakMap<World,Map<string,Float32Array>>();
export function travelPathCost(w:World,u:Entity):import("./nav/Pathfinder").PathCost {
  let classes=travelCosts.get(w);if(!classes){classes=new Map();travelCosts.set(w,classes);}
  const key=groundMobilityClass(u);let cells=classes.get(key);if(!cells){cells=new Float32Array(w.nav.width*w.nav.height);classes.set(key,cells);}
  const cache=cells;
  const cell=(x:number,z:number)=>{const id=w.nav.index(x,z);if(!cache[id]){const p=w.nav.cellToWorld(x,z);cache[id]=1/groundTerrainFactor(w,u,p.x,p.z);}return cache[id];};
  return {minimum:1/(mobilityProfile(u).roadSpeed*1.3),cell,edge:(ax,az,bx,bz)=>{const a=w.nav.cellToWorld(ax,az),b=w.nav.cellToWorld(bx,bz),length=Math.hypot(b.x-a.x,b.z-a.z);const slope=length?(heightAt(b.x,b.z)-heightAt(a.x,a.z))/length:0;return (cell(ax,az)+cell(bx,bz))*.5/Math.min(1.3,Math.max(.35,1-slope*1.2));}};
}

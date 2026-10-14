import data from '../data/equipment.json';
import type {World} from './World';
import type {Entity,UnitKind,WeaponSpec} from './types';
import {maxHitPoints} from './unitStats';

export type EquipmentSlot='weapon'|'protection'|'mobility';
export interface EquipmentModule {name:string;slot:EquipmentSlot;kinds:UnitKind[];cost:number;repairCost:number;seconds:number;description:string;weaponSource?:UnitKind;primary?:Partial<WeaponSpec>;speedMultiplier?:number;armorMultiplier?:number;fuelMultiplier?:number;heatProtection?:number;interceptCharges?:number;seatPenalty?:number;accuracyMultiplier?:number;splashMultiplier?:number;cooldownMultiplier?:number;requiresBuilding?:UnitKind;requiresTech?:string}
export const EQUIPMENT=data.modules as unknown as Record<string,EquipmentModule>;
export function isIndirectUnit(u:Entity|undefined):boolean {return !!u&&u.def.armor!=='air'&&u.def.domain!=='sea'&&!!u.def.weapons?.some(s=>s.flight==='ballistic');}
export const EQUIPMENT_SLOTS:EquipmentSlot[]=['weapon','protection','mobility'];
export function equipmentChoices(u:Entity,slot:EquipmentSlot):Array<[string,EquipmentModule]> {return Object.entries(EQUIPMENT).filter(([,m])=>m.slot===slot&&m.kinds.includes(u.kind));}
export function equipmentModule(u:Entity,slot:EquipmentSlot):EquipmentModule|undefined {return EQUIPMENT[u.equipment?.[slot]??''];}
function serviceDepot(w:World,u:Entity):Entity|null {
 const d=w.nearestSupplyDepot(u.team,u,true);return d&&d.kind==='supply'&&!d.dead&&!d.underConstruction&&(d.disabledUntil??0)<=w.time&&w.connectedSupplyNodes(u.team).includes(d)&&Math.hypot(d.x-u.x,d.z-u.z)<=data.serviceRadius&&w.hasCommandLink(u)&&w.powerStatus(u.team).ratio>=.25?d:null;
}
export function equipmentStatus(w:World,u:Entity,slot:EquipmentSlot,id:string):{allowed:boolean;reason:string;cost:number} {
 const m=id==='standard'?data.standard:EQUIPMENT[id],cost=m?.cost??0;
 const result=(reason:string)=>({allowed:!reason,reason,cost});
 if(!m||!EQUIPMENT_SLOTS.includes(slot)||(id!=='standard'&&(EQUIPMENT[id].slot!==slot||!EQUIPMENT[id].kinds.includes(u.kind))))return result('Sobimatu komponent');
 if(u.dead||u.underConstruction||u.loadedIntoId!=null||u.logisticsRoute==='strategic'||u.def.speed<=0)return result('Üksus ei saa hooldusse minna');
 if(u.refit)return result('Paigaldamine on pooleli');
 if((u.equipment?.[slot]??'standard')===id)return result('Paigaldatud');
 if(u.garrisonId||u.garrisonOrderId)return result('Välju hoonest enne hooldust');
 if(u.fireMission||u.target||u.dest||(u.motionSpeed??0)>.5)return result('Peata üksus ja lõpeta lahingukäsk');
 if(u.cargoUnitIds.length)return result('Väljuta dessant enne ümberehitust');
 if(u.def.armor==='air'&&!['grounded','rearming'].includes(u.airState??''))return result('Õhusõiduk peab olema baasis');
 if((u.disabledUntil??0)>w.time)return result('Üksus on häiritud');
 const d=serviceDepot(w,u);if(!d)return result('Vajab töötavat ühendatud ladu 80 m raadiuses');
 const module=EQUIPMENT[id];if(module?.requiresBuilding&&!w.hasBuilding(u.team,module.requiresBuilding))return result('Vajab maastrateegia keskust');
 if(module?.requiresTech&&!w.teamTechs[u.team].has(module.requiresTech))return result('Vajab täiustatud soomuse uurimist');
 if((d.repairStock??0)<m.repairCost)return result('Laos napib remondivaru');
 if(w.teamCredits[u.team]<cost||w.teamResources[u.team]<cost)return result('Raha või ressursse napib');
 return result('');
}
export function beginEquipmentRefit(w:World,u:Entity,slot:EquipmentSlot,id:string):boolean {
 const status=equipmentStatus(w,u,slot,id);if(!status.allowed)return false;
 const m=id==='standard'?data.standard:EQUIPMENT[id],d=serviceDepot(w,u)!;
 w.teamCredits[u.team]-=m.cost;w.teamResources[u.team]-=m.cost;d.repairStock=(d.repairStock??0)-m.repairCost;
 u.refit={slot,module:id,progress:0,seconds:m.seconds};u.mode='hold';u.holdPosition=true;return true;
}
/** Rebuild from the chassis each time; swapping never stacks buffs or refills ammunition. */
function applyEquipment(w:World,u:Entity,slot:EquipmentSlot,id:string):void {
 const oldWeapons=u.def.weapons;
 const hp=u.hp/maxHitPoints(u),oldAmmo=[u.ammo??0,...(u.secondaryAmmo??[]).slice(1)];
 u.equipment={...u.equipment,[slot]:id};
 const base=w.unitDefinition(u.kind,u.team),def={...base,weapons:base.weapons?.map(s=>({...s}))};
 for(const key of EQUIPMENT_SLOTS){const m=equipmentModule(u,key);if(!m)continue;
  if(m.weaponSource)def.weapons=w.unitDefinition(m.weaponSource,u.team).weapons?.map(s=>({...s}));
  if(m.primary&&def.weapons?.[0])Object.assign(def.weapons[0],m.primary);
  def.cost+=m.cost;
  def.speed*=m.speedMultiplier??1;def.fuelUsePerSec=(def.fuelUsePerSec??1)*(m.fuelMultiplier??1);
  for(const face of ['armorFront','armorSide','armorRear'] as const)def[face]=(def[face]??4)*(m.armorMultiplier??1);
  if(def.transportCapacity)def.transportCapacity=Math.max(0,def.transportCapacity-(m.seatPenalty??0));
  def.weapons?.forEach(s=>{s.accuracy=Math.min(.98,s.accuracy*(m.accuracyMultiplier??1));s.splash*=m.splashMultiplier??1;s.cooldown*=m.cooldownMultiplier??1;});
 }
 if(def.weapons?.length){const p=def.weapons[0];def.range=Math.max(...def.weapons.map(s=>s.range));def.weapon=p.weapon;def.damage=p.damage;def.ammoCapacity=p.ammoCapacity;def.cooldown=p.cooldown;def.minimumRange=p.minimumRange;}
 u.def=def;u.hp=hp*maxHitPoints(u);u.maxAmmo=def.weapons?.[0]?.ammoCapacity??def.ammoCapacity??0;
 const retained=(s:WeaponSpec,i:number)=>oldWeapons?.[i]?.profile===s.profile&&oldWeapons[i].warhead===s.warhead?Math.min(oldAmmo[i]??0,s.ammoCapacity):0;
 u.ammo=def.weapons?.[0]?retained(def.weapons[0],0):0;u.secondaryAmmo=def.weapons?.map((s,i)=>i?retained(s,i):0);u.cooldown=0;u.weaponCooldowns=def.weapons?.map(()=>0);u.activeWeapon=0;u.firingRange=def.range;
 if(slot==='protection')u.equipmentCharges=0;
}
export function updateEquipment(w:World,dt:number):void {
 for(const u of w.entities){if(u.dead)continue;
  if((Math.round(w.time*30)+u.id)%data.aiServiceTicks===0&&w.platformRosterOnly&&!w.networkMode&&u.team!==w.playerTeam&&!u.equipment&&!u.refit&&w.teamCredits[u.team]>250&&w.teamResources[u.team]>250&&u.kind==='inf'){
   const module=['support-mg','anti-tank','anti-air'][u.id%3];beginEquipmentRefit(w,u,'weapon',module);
  }
  if(u.refit){if(!serviceDepot(w,u)||(u.disabledUntil??0)>w.time)continue;u.refit.progress+=dt;if(u.refit.progress>=u.refit.seconds){const r=u.refit;applyEquipment(w,u,r.slot,r.module);u.refit=undefined;}}
  const capacity=equipmentModule(u,'protection')?.interceptCharges??0;
  if(capacity&&(u.equipmentCharges??0)<capacity&&(u.motionSpeed??0)<.5&&!u.target){const d=serviceDepot(w,u);if(d&&(d.ammoStock??0)>=dt){const take=Math.min(dt,capacity-(u.equipmentCharges??0));d.ammoStock=(d.ammoStock??0)-take;u.equipmentCharges=(u.equipmentCharges??0)+take;}}
 }
}

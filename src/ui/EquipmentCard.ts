import {icon} from "./icons";
import {EQUIPMENT_SLOTS,equipmentChoices,equipmentStatus,EQUIPMENT,type EquipmentSlot} from '../sim/equipment';
import type {World} from '../sim/World';
import type {Entity} from '../sim/types';
const labels:Record<EquipmentSlot,string>={weapon:'Relvakoorem',protection:'Kaitsevarustus',mobility:'Jõuülekanne'};
export function equipmentCards(w:World,u:Entity,running:boolean):string {
 if(u.def.speed<=0||u.logisticsRoute==='strategic')return '';
 const refit=u.refit?`<div class="garrison-card"><b>Paigaldamine · ${EQUIPMENT[u.refit.module]?.name??'Standardvarustus'}</b><small>${Math.floor(u.refit.progress/u.refit.seconds*100)}% · töötav ladu ja energia on vajalikud</small><button data-cancel-refit ${running?'':'disabled'}>Katkesta · kulutatud varusid ei tagastata</button></div>`:'';
 const slots=EQUIPMENT_SLOTS.map(slot=>{
  const choices=equipmentChoices(u,slot);if(!choices.length)return '';
  const installed=u.equipment?.[slot]??'standard';
  return `<details class="unit-development" data-detail-key="equipment-${slot}"><summary>${labels[slot]} · ${EQUIPMENT[installed]?.name??'Standard'}</summary>${[['standard',null],...choices].map(([id,m])=>{
   const key=id as string,module=m as typeof choices[number][1]|null,status=equipmentStatus(w,u,slot,key);
   return `<div><b>${module?.name??'Standardvarustus'}</b><small>${module?.description??'Taasta platvormi algne varustus. Vahetamine ei täida moona ega paranda üksust.'}</small><button data-equipment="${key}" data-slot="${slot}" ${running&&status.allowed?'':'disabled'}>${icon("upgrade")} ${installed===key?'Paigaldatud':'Paigalda'} · ${status.cost} krediiti + ${status.cost} ressurssi · ${module?.seconds??5} s</button><small>${status.reason||`Remondivaru ${module?.repairCost??5} · peatatud üksus lao juures`}</small></div>`;
  }).join('')}</details>`;
 }).join('');
 const charges=EQUIPMENT[u.equipment?.protection??'']?.interceptCharges;
 return refit+(charges?`<small>Aktiivkaitse ${Math.floor(u.equipmentCharges??0)}/${charges} · taastäitmine kulutab laomoonavaru</small>`:'')+slots;
}

import type {Entity,StrategicPayload} from '../sim/types';
import type {World} from '../sim/World';
import {strategicBuildStatus,strategicKinds} from '../sim/strategicWeapons';
import data from '../data/expansion.json';
import {airliftManifest} from '../sim/airlift';
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function expansionPanel(w:World,u:Entity,running:boolean):string {
 if(u.team!==w.playerTeam)return '';
 if(u.kind==='airTransport'){
  const m=airliftManifest(w,u,true),names=u.cargoUnitIds.map(id=>w.byId.get(id)).filter((e):e is Entity=>!!e&&!e.dead).map(e=>escape(w.unitDisplayName(e.kind,e.team)));
  return `<div class="expansion-card"><b>Dessantlennuki veos</b><p>Sõidukiruum ${m.slots}/2 · tankid ${m.tanks}/1 · APC ${m.apcs}/2 · sõdurid ${m.troops}/50</p><small>Üks tank või kaks APC-d ning kuni 50 sõdurit. Suuna oma üksused maapinnal lennukile. U + paremklõps sihtalal: langevarjudessant; pärast dessanti naaseb lennuk baasi.</small><p>${names.join(' · ')||'Lennuk on tühi'}</p></div>`;
 }
 const payloads:Array<StrategicPayload|'research'>=u.kind==='missileCommand'?['research']:strategicKinds(u);
 if(!payloads.length)return '';
 const progress=u.strategicWork?(()=>{const job=u.strategicWork!,seconds=job.payload==='research'?data.strategic.research.seconds:data.strategic.payloads[job.payload].seconds;return `<p>Valmistamine: ${job.payload==='research'?'tuumatehnoloogia':data.strategic.payloads[job.payload].name} · ${Math.max(0,Math.ceil(seconds-job.progress))} s</p>`;})():'';
 return `<div class="expansion-card"><b>Strateegilised relvad</b>${u.kind==='missileCommand'?'<small>Vali Ehita → ICBM raketišaht. Tiibraketiheitjad telli siitsamast tootmispaneelist. Tuumatehnoloogia vajab 3. taset, radarit ja õhustrateegia keskust.</small>':''}${progress}${payloads.map(payload=>{
  const state=strategicBuildStatus(w,u,payload),label=payload==='research'?'Uuri tuumatehnoloogiat':data.strategic.payloads[payload].name;
  const ammo=payload==='research'?'':`<strong>Valmis ${u.strategicAmmo?.[payload]??0}/${data.strategic.payloads[payload].capacity}</strong>`;
  const fire=payload==='research'?'':`<button data-strategic-fire="${payload}" ${!running||!(u.strategicAmmo?.[payload])||(u.strategicCooldownUntil??0)>w.time?'disabled':''}>Vali sihtpunkt · ${label}</button>`;
  return `<div class="strategic-row"><b>${label}</b>${ammo}<button data-strategic-build="${payload}" data-unit="${u.id}" ${!running||state.reason?'disabled':''}>${payload==='research'?'Uuri':'Valmista'} · ${state.cost} krediiti + ${state.cost} materjali · ${state.seconds} s</button><small>${escape(state.reason)}</small>${fire}${payload==='nuclear'?'<small>Tuumalöök kahjustab ka omi üksusi.</small>':''}</div>`;
 }).join('')}</div>`;
}

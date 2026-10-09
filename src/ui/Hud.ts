import {productionStatus} from "../sim/systems/production";
import {bindFullscreen} from "./Fullscreen";
import logisticsRules from "../data/logistics.json";
import {stockCapacity,stockTotal,logisticsStatus} from "../sim/stockLogistics";
import {isGarrisonBuilding,garrisonCapacity,garrisonOccupants,buildingCondition,garrisonWeaponUsable,GARRISON_RULES} from "../sim/garrison";
import {transportCapacity,occupiedSeats} from "../sim/transport";
import {maxHitPoints,weaponPenetration,mobilityProfile,groundTerrainFactor,unitUpgradeStatus,researchStatus,UNIT_UPGRADES,type UnitUpgrade} from "../sim/unitStats";
import {airUnitsForOrder,supportsAirMission,airOperationStatus} from "../sim/systems/airDoctrine";
import {effectiveWeaponRange,weaponAmmo,weaponCooldown,weaponImpactEstimate,movingFireFactor,weaponRange,shotAccuracy,weaponCanTarget,hitFace,armorValue,weaponFireBlocker,targetCoverValue,type AccuracyStep} from "../sim/systems/combat";
import "./hud.css";
import "./tactical.css";
import {WEAPON_RANGE_COLORS} from "../render/RangeOverlay";
import {icon,unitPicture} from "./icons";
import {combatStatus} from "../sim/systems/units";
import type { World } from "../sim/World";
import { coverValueAt } from "../sim/systems/sensors";
import type { MissionDef } from "../sim/types";
import type { UnitKind,Entity } from "../sim/types";
import { UNITS } from "../sim/units";
import { MAX_QUEUE } from "../sim/constants";
import type { FactionId } from "../sim/factions";
import { FACTIONS, FACTION_LIST, factionLandUnits, factionAirUnits, factionSeaUnits } from "../sim/factions";
import { BUILDINGS } from "../sim/buildings";
import { MODE_RULES, type MatchMode } from "../sim/gameModes";
import { CAMPAIGN, loadCampaign, isUnlocked } from "../sim/campaign";

function logisticsCard(w:World,u:Entity):string {
 if(u.kind==='supply'){
  const cap=stockCapacity(w,u),next=1+(Math.min(2,w.supplyDepotLevel(u)+1))*logisticsRules.depot.capacityPerLevel;
  return `<div class="garrison-card"><b>Füüsiline ladu · ${Math.floor(stockTotal(u))}/${Math.floor(cap.ammo+cap.fuel+cap.repair)}</b><small>Moon ${Math.floor(u.ammoStock??0)}/${Math.floor(cap.ammo)} · Kütus ${Math.floor(u.fuelStock??0)}/${Math.floor(cap.fuel)} · Remont ${Math.floor(u.repairStock??0)}/${Math.floor(cap.repair)}</small><small>${w.supplyDepotLevel(u)<2?`Järgmine tase: mahud ×${next.toFixed(2)} baasist; kogumiskopteri koorem ja veoki maht suurenevad.`:'Laomaht MAX'} FOB-i uuendus suurendab juhtimist, mitte ei tekita tasuta varusid.</small></div>`;
 }
 const depot=w.byId.get(u.supplyDepotId??-1),source=u.logisticsSourceIndex!=null?w.resourcePoints[u.logisticsSourceIndex]:null,p=u.logisticsPayload;
 return `<div class="garrison-card"><b>${logisticsStatus(w,u)}</b><small>Allikas: ${source?`ressursirajatis ${u.logisticsSourceIndex!+1}`:w.primarySupplyDepot(u.team)?'pealadu':'puudub'} → Ladu ${depot?.id??'puudub'}</small><small>Koorem ${Math.floor(u.cargo)}/${Math.floor(u.logisticsCargoCapacity??(u.kind==="transport"?logisticsRules.air.capacity+(depot?w.supplyDepotLevel(depot):0)*logisticsRules.air.capacityPerLevel:0))}${p?` · Moon ${Math.floor(p.ammo)} / kütus ${Math.floor(p.fuel)} / remont ${Math.floor(p.repair)}`:' · toorressurss'} · Marsruudi vahepunkte ${depot?.logisticsWaypoints?.length??0}</small></div>`;
}

function weaponCards(world:World,u:Pick<Entity,"def"|"team"|"activeWeapon"|"ammo"|"secondaryAmmo"|"cooldown"|"weaponCooldowns">,live?:Entity,rangeSlot:number|null=null,showRanges=false):string {
  const team=u.team===0?1:0,tank=world.unitDefinition("tank",team),inf=world.unitDefinition("inf",team),ifv=world.unitDefinition("ifv",team),heli=world.unitDefinition("heli",team);
  const value=(n:number)=>n<.05?"0":n<1?n.toFixed(1):n.toFixed(0);
  return (u.def.weapons??[]).map((s,i)=>{
    const role=s.targets==="naval"?"Laevatõrje":s.targets==="air"?"Õhutõrje":s.targets==="armor"?"Tankitõrje":s.flight==="ballistic"?"Kaudtuli":s.weapon==="bullet"?"Jalaväetuli":"Tuletoetus";
    const symbol=s.targets==="naval"?"naval":s.targets==="air"?"aa":s.targets==="armor"?"tank":s.flight==="ballistic"?"artillery":s.weapon==="bullet"?"infantry":"attack";
    const own=!!live&&live.team===world.playerTeam,range=Math.round(live?weaponRange(live,s):s.range);
    const target=own&&live.target&&!live.target.dead&&world.isSpottedByTeam(live.target,live.team)?live.target:null;
    const block=target?weaponFireBlocker(world,live!,target,i):null;
    const ammo=s.ammoCapacity>0?`${Math.floor(weaponAmmo(u,i))}/${s.ammoCapacity} moon`:"Moonapiiranguta";
    const usable=!live||garrisonWeaponUsable(live,s);
    const state=own?(!usable?"Hoones puudub selle relva laskepositsioon":target?block??"Valmis laskma":weaponCooldown(u,i)>0?`Laadib · ${weaponCooldown(u,i).toFixed(1)} s`:s.ammoCapacity>0&&weaponAmmo(u,i)<s.ammoUsePerShot?"Moon otsas":"Valmis · luuratud sihtmärk puudub"):"Relva põhiandmed";
    return `<div class="weapon-card compact-weapon" style="--weapon-color:${WEAPON_RANGE_COLORS[i%WEAPON_RANGE_COLORS.length]}"><div class="weapon-heading"><span class="weapon-role-icon" title="${role}">${icon(symbol)}</span><b>${i===(u.activeWeapon??0)?"▸ ":""}${s.name}</b><strong>${ammo}</strong></div><div class="weapon-essential"><span>${role}</span><b>${s.minimumRange?`${s.minimumRange}–`:""}${range} m</b>${own?`<button data-range-slot="${i}" ${!usable?"disabled":""} aria-pressed="${usable&&showRanges&&(rangeSlot==null||rangeSlot===i)}">◎ Ulatus</button>`:""}</div><small class="weapon-state${usable&&target&&!block?" ready":""}">${state}</small><details class="weapon-analysis" data-detail-key="weapon-${i}"><summary>AP, kahjustus ja tabamisvõimalus</summary><span>AP baas ${s.penetration} · ${Math.round(s.accuracy*100)}% baas paigal / ${movingFireFactor(u.def,s)===0?"peatub":Math.round(s.accuracy*movingFireFactor(u.def,s)*100)+"% liikudes"} · Laadimise baas ${s.cooldown.toFixed(1)} s</span><div class="damage-strip" title="Ühe õnnestunud tabamuse baaskahjustus terve meeskonnaga ja ilma relvauuendusteta, lähikaugus ja avatud maastik. Tank E/K/T = esi/külg/taga. Sihtmärgid on vastasfraktsiooni põhiüksused; tegelik tabamus sõltub kaugusest, kattest, meeskonnast ja seisundist."><span>Jalavägi <b>${value(weaponImpactEstimate(s,inf))}</b></span><span>IFV <b>${value(weaponImpactEstimate(s,ifv))}</b></span><span>Tank E/K/T <b>${["front","side","rear"].map(f=>value(weaponImpactEstimate(s,tank,f as "front"|"side"|"rear"))).join("/")}</b></span><span>Kopter <b>${value(weaponImpactEstimate(s,heli))}</b></span></div><small>${s.guidance==="none"?s.flight==="ballistic"?"Ballistiline kaudtuli":"Juhitamatu":{command:"Juhtimine vajab laskuri kontakti",infrared:"Infrapuna · iseseisev juhtimine",radar:"Radarjuhtimine"}[s.guidance]} · Kulu ${s.ammoUsePerShot} moon/lasu · Surve ${s.suppressionPower} · ${s.speed} m/s mürsk · ${s.warhead.toUpperCase()}</small>${own?liveWeaponReadout(world,live!,i):""}</details></div>`;
  }).join("");
}

/** Only current spotted targets enter the readout; old intel never reveals live coordinates. */
function liveWeaponReadout(world:World,u:Entity,index:number):string {
  const spec=u.def.weapons![index],range=weaponRange(u,spec);
  const target=u.target&&!u.target.dead&&world.isSpottedByTeam(u.target,u.team)?u.target:null;
  const reach=`<button data-range-slot="${index}" class="range-slot">◎ ${index+1}. relva ulatus</button>`;
  const curve=[.25,.5,.75,1].map(f=>`<span>${Math.round(range*f)} m: <b>×${(1-Math.min(1,range*f/Math.max(1,spec.range))*.32).toFixed(2)}</b></span>`).join("");
  const ap=weaponPenetration(u,spec);
  const apAt=(d:number)=>(ap*(spec.warhead==="kinetic"?Math.max(.65,1-d/500):1)).toFixed(1);
  const reference=`<details class="accuracy-details" data-detail-key="range-${index}"><summary>Kauguse mõju · AP ${apAt(0)} → ${apAt(range)}</summary><small>Täpsuse kaugustegur; teised tegurid lisanduvad lasu ajal.</small><div class="distance-curve">${curve}</div><small>AP lähikaugus → maksimaalne ulatus. Ring mõõdab horisontaalset kaugust laskurist; sihtmärgi raadius võib lubada tabada ka ringi servast väljas.</small></details>`;
  if(!target)return reach+`<small class="shot-preview">${u.target?"Sihtmärk pole praegu luuratud; jooksvaid lahinguandmeid ei näidata.":"Vali ründesihtmärk, et näha tegelikku tabamisvõimalust."}</small>`+reference;
  const distance=Math.hypot(target.x-u.x,target.z-u.z),compatible=weaponCanTarget(spec,target);
  const face=hitFace(u.x,u.z,target);
  const block=weaponFireBlocker(world,u,target,index);
  const steps:AccuracyStep[]=[],chance=shotAccuracy(world,u,target,spec,distance,steps);
  const faceName={front:"esi",side:"külg",rear:"taga"}[face];
  return reach+`<div class="shot-preview"><b>${world.unitDisplayName(target.kind,target.team)} · ${distance.toFixed(1)} m</b><strong>${compatible?Math.round(chance*100)+"% tabamisvõimalus":"—"}</strong><small>${block||"Relv valmis · sihtmärk ulatuses ja sihitud"}</small>${compatible?`<small>AP ${apAt(distance)} vs ${faceName}soomus ${armorValue(target,face)} · Hinnanguline lennuaeg ${(distance/Math.max(1,spec.speed)).toFixed(1)} s</small><details class="accuracy-details" data-detail-key="accuracy-${index}"><summary>Tabamisvõimaluse arvutus</summary><small>Ühe käivitatud lasu tõenäosus; ei taga läbistamist ega lasu luba. Mürsu teekond ja sihtmärgi seisund võivad pärast lasku muutuda.</small><table><tbody>${steps.map(step=>`<tr><td>${step.label}</td><td>${(step.chance*100).toFixed(1)}%</td></tr>`).join("")}</tbody></table><small>Iga rida näitab tõenäosust pärast vastavat tegurit.</small></details>`:""}</div>`+reference;
}

function unitDevelopmentCards(world:World,u:Entity,running:boolean):string {
  if(u.kind==="landStrategy"){
    const status=researchStatus(world,u.team,"advanced-armor");
    return `<div class="unit-development"><b>Täiustatud soomuse uuring</b><small>Avab maasoomukite soomuspaketi; üksuste uuendused ostetakse eraldi.</small><button data-research-armor ${!running||!status.allowed?"disabled":""}>Uuri · ${status.cost} krediiti + ${status.cost} ressurssi</button><small>${status.reason||"Strateegiakeskus töötab"}</small></div>`;
  }
  if(u.def.speed<=0||u.def.damage<=0)return "";
  return `<details class="unit-development" data-detail-key="development"><summary>Üksuse uuendused</summary>${(["armor","weapon","range"] as const).filter(k=>k!=="armor"||u.def.category==="armor").map(k=>{
    const status=unitUpgradeStatus(world,u,k),spec=UNIT_UPGRADES[k];
    return `<div><b>${spec.name}</b><small>${spec.description}</small><button data-unit-upgrade="${k}" ${!running||!status.allowed?"disabled":""}>${u.upgrades.has(k)?"Paigaldatud":"Paigalda"} · ${spec.cost} krediiti + ${spec.cost} ressurssi + ${spec.repairCost} remondivaru</button><small>${status.reason||"Peatatud üksus · ühendatud ladu"}</small></div>`;
  }).join("")}</details>`;
}

function terrainReadout(w:World,u:Entity):string {
  if(u.def.speed<=0||u.def.armor==="air"||u.loadedIntoId!=null)return "";
  if(u.def.domain==="sea")return '<div class="terrain-summary"><b>Merel</b><small>Laevatee ja sadamateenindus</small></div>';
  const fire=w.terrain.fireAt(u.x,u.z),burnt=w.terrain.burntAt(u.x,u.z),density=w.terrain.densityAt(u.x,u.z),road=w.terrain.roadAt(u.x,u.z),cover=targetCoverValue(w,u);
  const name=u.garrisonId?"Garnison":fire?"Metsatulekahju":road?"Maantee":burnt?"Põlenud mets":density>.65?"Sügav mets":density>0?"Metsaserv":cover>0?"Maastikukate":"Avatud maastik";
  const conceal=u.garrisonId?"Hoone varjab; laskesektor on piiratud":fire?"Lahku tulealast":burnt?"Taimkate on vähenenud":density>0?"Taimkate aitab varjuda; lask ja liikumine paljastavad":cover>0?"Kate aitab kaitsta; luurekontakt sõltub vastase optikast":"Vähe katet; eelista varjatud lähenemist";
  return `<div class="terrain-summary${fire?" danger":""}"><b>${name}</b><span>Liikumine ×${(u.garrisonId?0:groundTerrainFactor(w,u)).toFixed(2)} · Kate −${Math.round(cover*100)}% täpsust</span><small>${conceal}</small></div>`;
}

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const unitIcon = (kind:UnitKind):string => unitPicture(kind,"usa");
const rootButton = (hud: Hud, selector: string) => hud.findButton(selector);
const producerFor = (k: UnitKind): string => {
  if (["inf","engineer","special","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm"].includes(k)) return "barracks";
  if (["tank","apc","ifv","artillery","mlrs","reconVehicle","lightTank","tankDestroyer","spaa"].includes(k)) return "factory";
  if (["heli","transport","gunship","casHeli"].includes(k)) return "helipad";
  if (["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(k)) return "airbase";
  return "shipyard";
};

/** HTML/CSS HUD: ressursid, valiku info, tootmispaneel, minikaardi konteiner, alustus-/lõpuekraan. */
const BUILD_LABELS: Record<string, string> = {
  generator: "Generaator", supply: "Varustusladu",
  landCommand: "Maaväe juhtimiskeskus", airCommand: "Õhuväe juhtimiskeskus", seaCommand: "Mereväe juhtimiskeskus",
  barracks: "Kasarmu", factory: "Soomustehas", helipad: "Helikopteribaas", airbase: "Lennubaas",
  refinery: "Kütuseterminal", radar: "Radar", bunker: "Punker", aa: "Õhutõrje", shipyard: "Laevatehas",
  combatEngineer: "Insenerikeskus", landStrategy: "Maastrateegia", airStrategy: "Õhustrateegia", seaStrategy: "Mereistrateegia",
};
const BUILD_COSTS: Record<string, number> = {
  generator:140,barracks:160,factory:220,helipad:200,airbase:320,refinery:180,supply:130,radar:190,bunker:120,aa:160,shipyard:360,
  landCommand:100,airCommand:120,seaCommand:120,combatEngineer:150,landStrategy:240,airStrategy:260,seaStrategy:260,
};
const BUILDINGS_REQ: Record<string, string | undefined> = {
  supply: "generator", barracks: "landCommand", factory: "landCommand",
  helipad: "airCommand", airbase: "airCommand", shipyard: "seaCommand",
  landStrategy: "landCommand", airStrategy: "airCommand", seaStrategy: "seaCommand",
  combatEngineer: "landCommand", bunker: "barracks", aa: "radar", radar: "supply",
};
const SOURCE_LABELS: Record<string, string> = {
  hq: "HQ", landCommand: "Maaväe juhtimiskeskus", airCommand: "Õhuväe juhtimiskeskus", seaCommand: "Mereväe juhtimiskeskus",
  landStrategy: "Maastrateegia", airStrategy: "Õhustrateegia", seaStrategy: "Mereistrateegia",
  combatEngineer: "Insenerikeskus", supply: "Varustusladu",
};

export class Hud {
  showWeaponRanges=true;
  rangeSlot:number|null=null;
  private inspectedKind:UnitKind|null=null;
  private inspectedBuildingId:string|null=null;
  onGarrisonFace:(ids:number[])=>void=()=>{};
  onGarrisonExit:(ids:number[])=>void=()=>{};
  inspectBuilding(id:string):void {this.inspectedBuildingId=id;this.inspectedKind=null;this.selectionSignature="";this.selectedIds=[];}
  private selectionSignature="";
  private selectedMarkupContext="";
  readonly minimapCanvas: HTMLCanvasElement;
  onOrder: (order:"move"|"fast"|"attack"|"unload"|"stop"|"focus")=>void = ()=>{};
  onSelect: (ids:number[])=>void = ()=>{};
  onProduce: (kind: UnitKind, producerId?: number) => void = () => {};
  onPause: () => void = () => {};
  onSettings: () => void = () => {};
  onGuideFocus:(ids:number[])=>void=()=>{};
  onGuideTarget:(point:{x:number;z:number})=>void=()=>{};
  private guidePoint:{x:number;z:number}|null=null;
  private notice="";
  private noticeUntil=0;
  onSave: () => void = () => {};
  onLoad: () => void = () => {};
  onBuild: (kind: "barracks"|"factory"|"helipad"|"airbase"|"refinery"|"supply"|"radar"|"bunker"|"aa"|"generator"|"shipyard"|"landCommand"|"airCommand"|"seaCommand"|"combatEngineer"|"landStrategy"|"airStrategy"|"seaStrategy") => void = () => {};
  onUnitUpgrade:(ids:number[],upgrade:UnitUpgrade)=>void=()=>{};
  onResearch:(tech:"advanced-armor")=>void=()=>{};
  onUpgradeSupply: (ids: number[]) => void = () => {};
  onUpgradeFOB: (ids: number[]) => void = () => {};
  onLogisticsEdit:(ids:number[],action:"source"|"route"|"clear"|"auto"|"pause")=>void=()=>{};
  onDepotPriority: (ids: number[], focus: "ammo" | "fuel" | "repair" | "balanced") => void = () => {};
  onUpgradeProducer: (ids: number[]) => void = () => {};
  onStance: (ids: number[], mode: "attack" | "hold" | "patrol" | "holdfire") => void = () => {};
  onPriority: (ids: number[], focus: "supply" | "generator" | "aa") => void = () => {};
  onPreDeploy: (ids: number[], mode: "move" | "attack" | "hold") => void = () => {};
  onFormation: (kind: "box" | "line" | "wedge" | "column") => void = () => {};
  onNavalReturn:(ids:number[])=>void=()=>{};
  onAirReturn:(ids:number[])=>void=()=>{};
  onAirMission: (ids: number[], mission: "cap" | "strike" | "sead" | "ground") => void = () => {};
  onCancelProduce: (producerId: number) => void = () => {};
  onMultiplayer: (mission: MissionDef, room?: string) => void = () => {};
  onSkirmish: (mission: MissionDef, difficulty: "easy"|"normal"|"hard", mode?: MatchMode) => void = () => {};
  onOpenDeck: () => void = () => {};
  selectedFaction: FactionId = "usa";
  onFaction: (id: FactionId) => void = () => {};
  private el: Record<string, HTMLElement> = {};
  private buttons: HTMLButtonElement[] = [];
  private pauseButton: HTMLButtonElement | null = null;
  private selectedIds: number[] = [];
  private selectedProducerId: number | null = null;
  private activeTab: "land" | "air" | "sea" | "builds" = "land";

  private nodeCache=new Map<string,HTMLElement[]>();
  private nodes<T extends HTMLElement=HTMLElement>(selector:string):T[] {
    let nodes=this.nodeCache.get(selector);if(!nodes){nodes=[...this.root.querySelectorAll<HTMLElement>(selector)];this.nodeCache.set(selector,nodes);}return nodes as T[];
  }
  findButton(selector:string):HTMLButtonElement|null {return this.nodes<HTMLButtonElement>(selector)[0]??null;}
  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <aside class="tutorial-guide" data-r="tutorialGuide" hidden><small data-r="tutorialProgress"></small><b data-r="tutorialTitle"></b><p data-r="tutorialText"></p><button data-guide-focus>Vali sobiv üksus</button><button data-guide-target hidden>Näita sihtpunkti</button></aside>
      <header class="top">
        <div class="panel brand">Rogue Front<small>Taktikaline RTS · <span data-r="fps">-- fps</span> · <span data-r="net">üksikmäng</span></small></div>
        <div class="panel obj"><b data-r="missionName">Missioon</b><div data-r="objectiveList">Vali missioon.</div><div class="mission-msg" data-r="missionMsg"></div><div class="warning" data-r="warning"></div></div>
        <div class="panel controls"><button data-deployment-toggle aria-expanded="false">Tootmine</button><button data-fullscreen></button><button data-map-menu>Kaardid</button><button data-action="pause">Paus</button><button data-action="save">Salvesta</button><button data-action="load">Lae</button><button data-action="settings">Seaded</button></div>
        <div class="panel stat resources">
          <div class="res-row"><span class="res-label">VARUSTUS</span><b data-r="res">0</b></div>
          <div class="res-row"><span class="res-label">ENERGIA</span><b data-r="power">0/0</b>
            <span class="pwr-bar" title="Energia"><i data-r="pwrFill"></i></span>
          </div>
          <div class="res-row logistics-row"><span class="res-label">LOGISTIKA</span><b data-r="logistics">—</b></div><details class="economy-details"><summary title="Majanduse ja varustuse andmed">ⓘ</summary><div><small data-r="commandNet">Juhtimisvõrk —</small>
          <small>Krediit <span data-r="cr">0</span> · Moraal <span data-r="morale">100</span> · <span data-r="airstatus">Õhk 0/0</span></small><small data-r="economy">Majandus —</small><small>Vii insener ressursirajatise juurde: hõivamine → käivitus → automaatsed veod. Uuenda ladu, et suurendada kopteriparki ja koormat.</small>
          </div></details><span data-r="clock">0:00</span>
        </div>
      </header>
      <footer class="bottom">
        <div class="map-panel"><h4 class="section-heading">${icon("reconInf")} TAKTIKALINE KAART</h4><canvas class="mini" width="176" height="176" aria-label="Taktikaline kaart: vasak klõps liigutab kaamerat, parem annab käsu"></canvas><small>Vasak: kaamera · parem: käsk</small></div>
        <div class="panel sel">
          <h4 class="section-heading">${icon("focus")} VALIK JA KÄSUD</h4><h3 data-r="selT"></h3><p data-r="selP"></p>
          <div class="stance-bar" data-r="stanceBar">
            <button data-stance="attack" title="Aggressiivne – ründab vaenlasi nägemisraadiuses">${icon("attack")}<span>Ründa</span></button>
            <button data-stance="hold" title="Hoia positsiooni – ei liigu, tulistab lähedalt">${icon("hold")}<span>Hoia</span></button>
            <button data-stance="holdfire" title="Ära tulista – hoia tuld (Wargame ROE)">${icon("holdfire")}<span>Ära tulista</span></button>
            <button data-stance="patrol" title="Patrull – liigub ja ründab teel">${icon("patrol")}<span>Patrull</span></button>
          </div>
          <details class="advanced-orders"><summary>Formatsioon ja prioriteet</summary><div class="priority-bar" data-r="priorityBar">
            <button data-priority="supply" title="Prioriteet: vaenlase varustuslaod">Ladud</button>
            <button data-priority="generator" title="Prioriteet: generaatorid">Energia</button>
            <button data-priority="aa" title="Prioriteet: õhutõrje">Õhutõrje</button>
          </div>
          <div class="formation-bar" data-r="formationBar">
            <span class="pre-label">Vorm:</span>
            <button data-formation="box" title="Kast">${icon("box")}<span>Kast</span></button>
            <button data-formation="line" title="Joon">${icon("line")}<span>Joon</span></button>
            <button data-formation="wedge" title="Kiil">${icon("wedge")}<span>Kiil</span></button>
            <button data-formation="column" title="Kolonn">${icon("column")}<span>Kolonn</span></button>
          </div>
          </details><div class="air-mission-bar" data-r="airMissionBar" hidden>
            <span class="pre-label">Õhk:</span>
            <button data-air-mission="cap" title="CAP – õhuülekaal / patrull">${icon("air")} Õhukaitse</button>
            <button data-air-mission="strike" title="Strike – infrastruktuur">${icon("attack")} Baasirünnak</button>
            <button data-air-mission="sead" title="SEAD – õhutõrje mahavõtt">${icon("radar")} Õhutõrje</button>
            <button data-air-mission="ground" title="Close support – maaüksused">${icon("tank")} Maatoetus</button>
          <button data-air-return title="EVAC (E): katkesta ülesanne, naase baasi ning maandu tankimiseks, relvastamiseks ja remondiks. Pardal olev jalavägi jääb kopterisse.">${icon("return")} EVAC · Baasi</button></div>
          <div class="naval-bar" data-r="navalBar" hidden><button data-naval-return title="Naase sadama juurde: tegelik ammo, kütus ja remondivaru tuleb ühendatud laost">${icon("naval")} Sadamasse</button><small>Sadam vajab energiat, juhtimist ja ühendatud varustusladu.</small></div>
          <div class="predeploy-bar" data-r="predeployBar" hidden>
            <span class="pre-label">Valmiva üksuse käsk:</span>
            <button data-predeploy="move" title="Valmis üksused liiguvad sihtmärgile (Shift+paremklõps kaardil)">Liigu</button>
            <button data-predeploy="attack" title="Valmis üksused ründavad teed mööda">Ründa teed</button>
            <button data-predeploy="hold" title="Valmis üksused hoiavad tootja juures">Hoia</button>
          </div>
          <div class="order-bar" aria-label="Liikumise ja tegevuse käsud">${(["move","fast","attack","unload","stop","focus"] as const).map(k=>`<button data-order="${k}" title="${k==="attack"?"Ründeliikumine: vali punkt kaardil (A)":k==="move"?"Liigu: parem klõps sihtpunktile":k==="fast"?"Kiirliigu mööda teid (G)":k==="unload"?"Välju: U + paremklõps":k==="stop"?"Peata (X)":"Kaamera valikule"}">${icon(k)}<kbd>${({move:"",fast:"G",attack:"A",unload:"U",stop:"X",focus:""})[k]}</kbd><span>${k==="attack"?"Ründeliiku":k==="move"?"Liigu":k==="fast"?"Kiirliigu":k==="unload"?"Välju":k==="stop"?"Peata":"Fookus"}</span></button>`).join("")}</div><div class="help">Vasak hiir: vali · Parem: liigu/ründa · A+parem: ründeliikumine · G+parem: kiirliigu · U+parem: välju · H: hoia · P: patrull · WASD: kaamera · Rull: suum · X: peata · F+parem: suurtükituli · L: kustuta logistika marsruut · Ctrl+1–9: grupp</div>
        </div>
        <div class="panel build tactical"><h4 class="section-heading" data-r="catalogTitle">${icon("building")} TOOTMINE JA EHITUS</h4>
          <div class="tab-bar">
            <button class="tab active" data-tab="land">${icon("tank")} Maa</button>
            <button class="tab" data-tab="air">${icon("air")} Õhk</button>
            <button class="tab" data-tab="sea">${icon("naval")} Meri</button>
            <button class="tab" data-tab="builds">${icon("building")} Ehita</button>
          </div>
          <div class="tab-panels">
            <div class="tab-panel active" data-panel="land">
              ${factionLandUnits("usa").filter(k => UNITS[k]).map((k) => {
                const producer = producerFor(k);
                return `<button class="unit-btn" title="${UNITS[k].name} · ${UNITS[k].roleLabel ?? ""} · ${UNITS[k].ability ?? ""} · ${UNITS[k].cost} res" data-kind="${k}" data-producer="${producer}" data-tab-unit="land"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span><small class="unit-lock" data-lock></small></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="air">
              ${factionAirUnits("usa").filter(k => UNITS[k]).map((k) => {
                const producer = producerFor(k);
                return `<button class="unit-btn" title="${UNITS[k].name} · ${UNITS[k].roleLabel ?? ""} · ${UNITS[k].ability ?? ""} · ${UNITS[k].cost} res" data-kind="${k}" data-producer="${producer}" data-tab-unit="air"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span><small class="unit-lock" data-lock></small></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="sea">
              ${factionSeaUnits("usa").filter(k => UNITS[k]).map((k) => {
                return `<button class="unit-btn" title="${UNITS[k].name} · ${UNITS[k].roleLabel ?? ""} · ${UNITS[k].ability ?? ""} · ${UNITS[k].cost} res" data-kind="${k}" data-producer="shipyard" data-tab-unit="sea"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span><small class="unit-lock" data-lock></small></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="builds">
              <div class="build-sub">
                <div class="tree-label" data-r="treeLabel">EHITUSPUU: HQ</div>
                <div class="tree-hint" data-r="treeHint">Vali HQ või juhtimiskeskus — avab haru.</div>

                <div class="depot-control-bar" data-r="depotControlBar" hidden>
                  <span class="pre-label">Tarnejuhtimine:</span><button data-logistics-edit="source">Vali rajatis</button><button data-logistics-edit="route">Lisa vahepunkt</button><button data-logistics-edit="clear">Otsetee</button><button data-logistics-edit="auto">Automaatne</button><button data-logistics-edit="pause">Peata / jätka</button><small>Vali rajatis või vahepunkt nupuga, seejärel klõps kaardil. L = otsetee.</small><span class="pre-label">FOB prioriteet:</span>
                  <button data-depot-priority="balanced">Tasakaal</button><button data-depot-priority="ammo">Moon</button><button data-depot-priority="fuel">Kütus</button><button data-depot-priority="repair">Remont</button>
                </div>
                <div class="build-buttons" data-r="buildButtons"></div>
              </div>
            </div>
          </div>
          <div class="facility-actions" data-r="facilityActions" hidden aria-label="Valitud hoone arendamine">                <button data-upgrade-producer hidden>Uuenda tootjat</button>
                <button data-upgrade-supply hidden>Uuenda varustusladu</button>
                <button data-upgrade-fob hidden>Ehita FOB</button>
          </div><div class="queue-heading"><span>TOOTMISJÄRJEKORD</span><button data-cancel-produce hidden title="Tühista viimane tellimus; 75% kulust tagasi">${icon("stop")} Tühista viimane</button></div><div class="qbar"><i data-r="qbar"></i></div>
          <div class="qtxt" data-r="qtxt"></div>
        </div>
      </footer>
      <div class="screen" data-r="screen" hidden><div class="card"><h1 data-r="scrT"></h1><p data-r="scrP"></p><button data-r="scrB"></button></div></div>`;
    root.querySelectorAll<HTMLElement>("[data-r]").forEach((n) => (this.el[n.dataset.r!] = n));
    this.minimapCanvas = root.querySelector(".mini") as HTMLCanvasElement;
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>("button[data-kind]")];
    const production=root.querySelector<HTMLElement>(".build.tactical");if(production)root.appendChild(production);
    root.querySelector<HTMLButtonElement>("[data-deployment-toggle]")!.onclick=()=>{const open=root.classList.toggle("deployment-open");root.querySelector("[data-deployment-toggle]")!.setAttribute("aria-expanded",String(open));};
    root.querySelector<HTMLButtonElement>("[data-map-menu]")!.onclick=()=>{location.href=location.pathname;};
    bindFullscreen(root.querySelector<HTMLButtonElement>("[data-fullscreen]")!,message=>this.setWarning(message));
    this.pauseButton = root.querySelector<HTMLButtonElement>('[data-action="pause"]');
    root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b=>b.onclick=()=>this.onOrder(b.dataset.order as "move"|"fast"|"attack"|"unload"|"stop"|"focus"));
    this.buttons.forEach(b=>b.addEventListener("contextmenu",e=>{e.preventDefault();e.stopPropagation();this.inspectedKind=b.dataset.kind as UnitKind;}));
    this.el.selP.addEventListener("click",e=>{
      const upgrade=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-unit-upgrade]");if(upgrade&&!upgrade.disabled)this.onUnitUpgrade([...this.selectedIds],upgrade.dataset.unitUpgrade as UnitUpgrade);
      const research=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-research-armor]");if(research&&!research.disabled)this.onResearch("advanced-armor");

      const toggle=(e.target as HTMLElement).closest("[data-range-toggle]");if(toggle)this.showWeaponRanges=!this.showWeaponRanges;
      const slot=(e.target as HTMLElement).closest<HTMLElement>("[data-range-slot]");if(slot){const i=Number(slot.dataset.rangeSlot);this.rangeSlot=this.rangeSlot===i?null:i;this.showWeaponRanges=true;}
if((e.target as HTMLElement).closest("[data-close-inspector]")){this.inspectedKind=null;this.inspectedBuildingId=null;}if((e.target as HTMLElement).closest("[data-garrison-face]"))this.onGarrisonFace(this.selectedIds);if((e.target as HTMLElement).closest("[data-garrison-exit]"))this.onGarrisonExit(this.selectedIds);const b=(e.target as HTMLElement).closest<HTMLElement>("[data-select-unit]");if(b)this.onSelect([Number(b.dataset.selectUnit)]);});
    this.buttons.forEach((b) => b.addEventListener("click", () => {
      const pid = b.dataset.producerId ? Number(b.dataset.producerId) : undefined;
      this.onProduce(b.dataset.kind as UnitKind, pid);
    }));
    // build buttons are rebound each frame from availableBuilds()
    root.querySelector<HTMLButtonElement>("button[data-upgrade-producer]")?.addEventListener("click",()=>this.onUpgradeProducer([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-upgrade-supply]")?.addEventListener("click",()=>this.onUpgradeSupply([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-upgrade-fob]")?.addEventListener("click",()=>this.onUpgradeFOB([...this.selectedIds]));
    root.querySelectorAll<HTMLButtonElement>("button[data-logistics-edit]").forEach(b=>b.addEventListener("click",()=>this.onLogisticsEdit([...this.selectedIds],b.dataset.logisticsEdit as "source"|"route"|"clear"|"auto"|"pause")));
    root.querySelectorAll<HTMLButtonElement>("button[data-depot-priority]").forEach((b)=>b.addEventListener("click",()=>{ if(this.selectedIds.length) this.onDepotPriority([...this.selectedIds], b.dataset.depotPriority as "ammo"|"fuel"|"repair"|"balanced"); }));
    root.querySelector<HTMLButtonElement>("button[data-cancel-produce]")?.addEventListener("click", () => {
      if (this.selectedProducerId != null) this.onCancelProduce(this.selectedProducerId);
    });
    root.querySelector('[data-action="pause"]')?.addEventListener("click", () => this.onPause());
    root.querySelector<HTMLButtonElement>("[data-guide-target]")!.onclick=()=>{if(this.guidePoint)this.onGuideTarget(this.guidePoint);};
    root.querySelector<HTMLButtonElement>("[data-guide-focus]")!.onclick=()=>this.onGuideFocus(this.guideIds);
    root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.onSave());
    root.querySelector('[data-action="load"]')?.addEventListener("click", () => this.onLoad());
    root.querySelector('[data-action="settings"]')?.addEventListener("click", () => this.onSettings());
    root.querySelectorAll<HTMLButtonElement>("button[data-stance]").forEach((b) => {
      b.addEventListener("click", () => {
        const mode = b.dataset.stance as "attack" | "hold" | "patrol" | "holdfire";
        if (this.selectedIds.length) this.onStance([...this.selectedIds], mode);
      });
    });
    root.querySelectorAll<HTMLButtonElement>("button[data-priority]").forEach((b) => {
      b.addEventListener("click", () => {
        const focus = b.dataset.priority as "supply" | "generator" | "aa";
        if (this.selectedIds.length) this.onPriority(this.selectedIds, focus);
      });
    });
    root.querySelectorAll<HTMLButtonElement>("button[data-predeploy]").forEach((b) => {
      b.addEventListener("click", () => {
        const mode = b.dataset.predeploy as "move" | "attack" | "hold";
        if (this.selectedProducerId != null) this.onPreDeploy([this.selectedProducerId], mode);
      });
    });
    root.querySelectorAll<HTMLButtonElement>("button[data-formation]").forEach((b) => {
      b.addEventListener("click", () => {
        const kind = b.dataset.formation as "box" | "line" | "wedge" | "column";
        this.onFormation(kind);
        root.querySelectorAll("button[data-formation]").forEach((x) => x.classList.toggle("active", (x as HTMLButtonElement).dataset.formation === kind));
      });
    });
    root.querySelector<HTMLButtonElement>("button[data-naval-return]")?.addEventListener("click",()=>this.onNavalReturn(this.selectedIds));
    root.querySelector<HTMLButtonElement>("button[data-air-return]")?.addEventListener("click",()=>this.onAirReturn(this.selectedIds));
    root.querySelectorAll<HTMLButtonElement>("button[data-air-mission]").forEach((b) => {
      b.addEventListener("click", () => {
        const mission = b.dataset.airMission as "cap" | "strike" | "sead" | "ground";
        if (this.selectedIds.length) this.onAirMission(this.selectedIds, mission);
      });
    });
    root.querySelectorAll<HTMLButtonElement>("button.tab[data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        const tab = b.dataset.tab as "land" | "air" | "sea" | "builds";
        this.activeTab = tab;
        root.querySelectorAll("button.tab").forEach((t) => t.classList.toggle("active", (t as HTMLButtonElement).dataset.tab === tab));
        root.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", (p as HTMLElement).dataset.panel === tab));
      });
    });
  }

  private setSelectedMarkup(markup:string):void {
    if(this.el.selP.dataset.markup===markup)return;
    const context=this.selectedIds.join(",")+"|"+(this.inspectedKind??this.inspectedBuildingId??"");
    const states=new Map(context===this.selectedMarkupContext?[...this.el.selP.querySelectorAll("details")].map((d,i)=>[d.dataset.detailKey??String(i),{open:d.open,scroll:d.scrollTop}] as const):[]);
    const scroll=this.el.selP.scrollTop;
    this.selectedMarkupContext=context;
    this.el.selP.dataset.markup=markup;this.el.selP.innerHTML=markup;
    this.el.selP.querySelectorAll("details").forEach((d,i)=>{const state=states.get(d.dataset.detailKey??String(i));if(state){d.open=state.open;d.scrollTop=state.scroll;}});
    this.el.selP.scrollTop=scroll;
  }

  getBuildButtons(): HTMLButtonElement[] { return [...this.root.querySelectorAll<HTMLButtonElement>("button[data-build]")]; }

  setFps(n: number): void { this.el.fps.textContent = n + " fps"; }
  private guideIds:number[]=[];
  setWarning(text: string): void {this.notice=text;this.noticeUntil=Date.now()+5000;this.el.warning.textContent=text;}
  setSaveAvailability(hasSave:boolean,enabled:boolean):void {this.findButton('[data-action="save"]')!.disabled=!enabled;this.findButton('[data-action="load"]')!.disabled=!hasSave;}
  hideScreen():void {this.el.screen.hidden=true;}
  setNetworkStatus(text: string): void { this.el.net.textContent = text; }
  setPaused(paused: boolean): void { if (this.pauseButton) this.pauseButton.textContent = paused ? "Jätka" : "Paus"; }

  update(world: World, selection: ReadonlySet<number>, running: boolean, objectives: readonly { title: string; description: string; complete: boolean; progress: number }[] = [], missionMessage = ""): void {
    const changed=this.selectedIds.join(",") !== [...selection].join(",");
    this.selectedIds = [...selection];
    this.root.classList.toggle("has-selection",this.selectedIds.length>0);
    const signature=this.selectedIds.join(",");if(signature!==this.selectionSignature){this.inspectedKind=null;this.inspectedBuildingId=null;this.rangeSlot=null;}this.selectionSignature=signature;
    if(changed && this.selectedIds.length){const first=world.byId.get(this.selectedIds[0]);if(first){const tab=["factory","barracks"].includes(first.kind)?"land":["helipad","airbase"].includes(first.kind)?"air":first.kind==="shipyard"?"sea":first.kind==="engineer"||first.def.building?"builds":first.def.armor==="air"?"air":first.def.domain==="sea"?"sea":"land";this.findButton(`button[data-tab="${tab}"]`)?.click();}}
    const hasMobile=this.selectedIds.some(id=>{const u=world.byId.get(id);return !!u&&!u.dead&&u.team===world.playerTeam&&u.def.speed>0;});
    this.root.querySelector<HTMLElement>(".advanced-orders")!.hidden=!hasMobile;
    this.el.navalBar.hidden=!this.selectedIds.some(id=>world.byId.get(id)?.def.domain==="sea");
    this.findButton("[data-naval-return]")!.disabled=!running||this.el.navalBar.hidden;
    this.el.stanceBar.hidden=!hasMobile;
    const mobile=this.selectedIds.map(id=>world.byId.get(id)).filter((u):u is Entity=>!!u&&!u.dead&&u.team===world.playerTeam&&u.def.speed>0);
    this.nodes<HTMLButtonElement>("[data-stance]").forEach(b=>{b.disabled=!running||!hasMobile;const active=mobile.length>0&&mobile.every(u=>u.standingOrder===b.dataset.stance);b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});
    this.nodes<HTMLButtonElement>("[data-formation]").forEach(b=>{b.disabled=!running||!hasMobile;const active=b.dataset.formation===world.teamFormations[world.playerTeam];b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));});

    this.nodes<HTMLButtonElement>("[data-order]").forEach(b=>b.disabled=!running||!(b.dataset.order==="focus"?selection.size:hasMobile)||(b.dataset.order==="unload"&&!this.selectedIds.some(id=>{const u=world.byId.get(id);return !!u&&u.team===world.playerTeam&&(u.garrisonId||u.garrisonOrderId||(transportCapacity(u)>0||u.kind==="landingcraft")&&u.cargoUnitIds.length>0);})));

    if (this.el.airMissionBar) {
      const airSel=airUnitsForOrder(world,this.selectedIds,world.playerTeam);
      const facility=this.selectedIds.some(id=>["airbase","helipad"].includes(world.byId.get(id)?.kind??""));
      this.el.airMissionBar.hidden=!airSel.length&&!facility;
      this.nodes<HTMLButtonElement>("[data-air-mission]").forEach(b=>{b.disabled=!running||!airSel.some(u=>supportsAirMission(u,b.dataset.airMission as "cap"|"strike"|"sead"|"ground"));});
      const back=this.findButton("[data-air-return]");if(back){back.disabled=!running||!airSel.some(u=>!["grounded","rearming","returning","landing"].includes(u.airState??""));back.classList.toggle("active",airSel.some(u=>u.airState==="returning"||u.airState==="landing"));}

    }

    this.el.cr.textContent = String(Math.floor(world.credits));
    this.el.clock.textContent = fmt(world.time);
    this.el.res.textContent = String(Math.floor(world.resources));
    if (this.el.morale) this.el.morale.textContent = String(Math.round(world.teamMorale[world.playerTeam]));
    if (this.el.control) this.el.control.textContent = String(Math.round(world.areaControl[world.playerTeam]));
    if (this.el.airstatus) { const a=world.airbaseStatus(world.playerTeam), s=world.supplyDepotStatus(world.playerTeam), al=world.airliftStatus(world.playerTeam); this.el.airstatus.textContent = `Õhk ${a.aircraft}/${a.capacity} · Helid ${s.active}/${s.depots} · Varu ${al.pool} · ${al.enabled ? `Cargo ${al.inFlight ? "lennul" : "ootel"}` : "lennujaam lvl1"}`; }
    if (this.el.economy) { const e = world.resourceEconomyStatus(world.playerTeam), r = world.roadLogisticsStatus(world.playerTeam); this.el.economy.textContent = `Punktid ${e.controlled} · Töös ${e.active} · laovaru ${e.stock} · tootmine +${e.rate.toFixed(1)}/s (rajatises) · Veokid ${r.trucks} · Teel ${r.cargo}${r.disconnected ? ` · Katkestatud ${r.disconnected}` : ""}`; }
    if (this.el.commandNet) { const cn=world.commandNetworkStatus(world.playerTeam); this.el.commandNet.textContent = `Juhtimisvõrk ${cn.nodes} · FOB ${cn.fobs} · ühendatud ${cn.linked} · katvus ${Math.round(cn.coverage*100)}%`; }
    const ps = world.powerStatus(world.playerTeam);
    if (this.el.power) {
      this.el.power.textContent = `${Math.floor(ps.use)}/${Math.floor(ps.supply)}`;
      this.el.power.classList.toggle("power-low", ps.use > ps.supply);
    }
    if (this.el.pwrFill) {
      const pct = ps.supply > 0 ? Math.min(100, (ps.use / ps.supply) * 100) : (ps.use > 0 ? 100 : 0);
      (this.el.pwrFill as HTMLElement).style.width = pct + "%";
      this.el.pwrFill.classList.toggle("over", ps.use > ps.supply);
    }
    const route = world.supplyRouteStatus(world.playerTeam);
    if (this.el.logistics) {
      if (route.total === 0) this.el.logistics.textContent = "Pole ladu";
      else if (route.connected === route.total) this.el.logistics.textContent = `Ühendatud ${route.connected}/${route.total}`;
      else this.el.logistics.textContent = `Katkenud ${route.connected}/${route.total}`;
      this.el.logistics.classList.toggle("log-ok", route.total > 0 && route.connected === route.total);
      this.el.logistics.classList.toggle("log-bad", route.total > 0 && route.connected < route.total);
    }
    const mobileCount = world.entities.filter(e => !e.dead && e.team === world.playerTeam && e.def.speed > 0).length;
    let warn = "";
    if (ps.use > ps.supply) warn = `⚠ ENERGIA PUUDU — tootmine aeglustub`;
    else if (route.total > 0 && route.connected < route.total) warn = `⚠ LOGISTIKA KATKI — ${route.total - route.connected} ladu ühendamata`;
    else if (mobileCount > 100) warn = `⚠ ÜKSUSTE SURVE (${mobileCount}) — jõudlus võib langeda`;
    this.el.warning.textContent = this.notice&&Date.now()<this.noticeUntil?this.notice:warn;
    if(world.matchController){
      const mode=world.matchController,score=mode.scores;
      this.el.missionName.textContent=mode.mode.toUpperCase();
      this.el.objectiveList.textContent=`Sina ${Math.floor(score[world.playerTeam])} · Vastane ${Math.floor(score[world.playerTeam===0?1:0])}`+(mode.rules.timeLimit?` · Aega ${fmt(Math.max(0,mode.rules.timeLimit-world.time))}`:"");
    }
    if (objectives.length) {
      if(world.missionController?.mission.id==="tutorial-logistics")this.el.objectiveList.textContent=`Õpetus ${world.missionController.completedObjectives}/${objectives.length} · juhis vasakul`;
      else this.el.objectiveList.innerHTML = objectives.map((o) => `<div class="objective ${o.complete ? "done" : ""}"><span>${o.complete ? "✓" : "○"} ${o.title}</span>${o.complete ? "" : `<i style="width:${Math.round(o.progress * 100)}%"></i>`}</div>`).join("");
    }
    this.el.missionMsg.textContent = world.matchController ? "" : missionMessage;
    const tutorial=world.missionController?.mission.id==="tutorial-logistics",step=world.missionController?.activeObjective;
    this.el.tutorialGuide.hidden=!tutorial||!step||world.status!=="running";
    if(tutorial&&step){
      this.el.tutorialProgress.textContent=`ÕPETUS · ${world.missionController!.completedObjectives+1}/${world.missionController!.mission.objectives.length}`;
      this.el.tutorialTitle.textContent=step.title;this.el.tutorialText.textContent=step.description;
      const preferred=["build","capture","deliver"].includes(step.kind)?"engineer":step.kind==="upgrade"?step.target?.kind:step.kind==="produce"?(step.unitKind==="tank"||step.unitKind==="apc"?"factory":"barracks"):step.kind==="reach"?step.unitKind:step.kind==="garrison"||step.kind==="transport"?"inf":"tank";
      const passengers=world.entities.filter(e=>!e.dead&&e.team===world.playerTeam&&e.kind==="inf"),carrier=step.kind==="garrison"?world.byId.get(passengers.find(e=>e.loadedIntoId!=null)?.loadedIntoId??-1):undefined;
      const candidate=carrier??world.entities.find(e=>!e.dead&&!e.underConstruction&&e.team===world.playerTeam&&e.kind===preferred&&e.loadedIntoId==null);this.guideIds=candidate?[candidate.id]:[];
      this.findButton("[data-guide-focus]")!.disabled=!candidate;this.findButton("[data-guide-focus]")!.textContent=carrier?"Vali transport väljumiseks":"Vali sobiv üksus";
      this.guidePoint=step.point??null;
      if(step.kind==="garrison"){const house=world.mapFeatures.filter(isGarrisonBuilding).sort((a,b)=>Math.hypot(a.x-(candidate?.x??0),a.z-(candidate?.z??0))-Math.hypot(b.x-(candidate?.x??0),b.z-(candidate?.z??0)))[0];if(house)this.guidePoint={x:house.x,z:house.z};}
      if(step.kind==="deliver"){const home=world.resourcePoints.filter(r=>r.controlledBy!==1).sort((a,b)=>Math.hypot(a.x-(candidate?.x??0),a.z-(candidate?.z??0))-Math.hypot(b.x-(candidate?.x??0),b.z-(candidate?.z??0)))[0];if(home)this.guidePoint={x:home.x,z:home.z};}
      this.findButton("[data-guide-target]")!.hidden=!this.guidePoint;
    }
    const hq = world.hq[world.playerTeam];
    const selectedProducer = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && ["barracks","factory","helipad","airbase","shipyard"].includes(e.kind));
    this.selectedProducerId = selectedProducer?.id ?? null;
    const q = selectedProducer?.productionQueue ?? [];
    // One pass per HUD refresh instead of filter+sort for every roster card.
    const producers=new Map<string,Entity>();
    for(const u of world.entities){
      if(u.dead||u.underConstruction||u.team!==world.playerTeam||!["barracks","factory","helipad","airbase","shipyard"].includes(u.kind))continue;
      const best=producers.get(u.kind);if(!best||u.productionQueue.length<best.productionQueue.length)producers.set(u.kind,u);
    }
    if(selectedProducer&&!selectedProducer.underConstruction)producers.set(selectedProducer.kind,selectedProducer);
    const findProducer=(kind:string)=>producers.get(kind)??null;
    const cancelBtn = rootButton(this, "button[data-cancel-produce]");
    if (cancelBtn) {
      cancelBtn.hidden = !selectedProducer || q.length === 0;
      cancelBtn.disabled = !running || !selectedProducer || q.length === 0;
    }
    const engineerSelected = [...selection].some(id=>{const e=world.byId.get(id);return !!e&&!e.dead&&e.team===world.playerTeam&&e.kind==="engineer";}) || world.entities.some(e=>!e.dead&&e.team===world.playerTeam&&e.kind==="engineer");
    for (const b of this.buttons) {
      const kind=b.dataset.kind as UnitKind;if(!kind||!UNITS[kind])continue;
      const def=world.unitDefinition(kind),cost=def.cost,prod=findProducer(b.dataset.producer!);
      if(prod)b.dataset.producerId=String(prod.id);else delete b.dataset.producerId;
      const picture=b.querySelector<HTMLElement>(".unit-icon");
      if(picture&&picture.dataset.faction!==world.playerFaction){picture.innerHTML=unitPicture(kind,world.playerFaction)+`<span class="class-badge" title="${def.roleLabel??kind}">${icon(kind)}</span>`;picture.dataset.faction=world.playerFaction;}
      const label=b.querySelector<HTMLElement>("[data-unit-label]");if(label&&label.textContent!==world.unitDisplayName(kind))label.textContent=world.unitDisplayName(kind);
      const price=b.querySelector<HTMLElement>(".unit-cost");if(price&&price.textContent!==String(cost))price.textContent=String(cost);
      const queueFull=(prod?.productionQueue.length??0)>=MAX_QUEUE;
      const levelOK=!!prod&&world.canProduceAtLevel(prod,kind);
      const operation=prod?world.productionOperational(prod,kind):null;
      const reason=!prod?"Vajab tootjat":queueFull?"Järjekord täis":world.resources<cost||world.credits<cost?`Puudu ${Math.ceil(cost-Math.min(world.resources,world.credits))} krediiti`:!levelOK?"Vajab taset "+world.unitRequiredBuildingLevel(kind):!operation?.operational?operation?.reason||"Tarne / energia":"";
      b.disabled=!running||!hq||hq.dead||!!reason;
      const lock=b.querySelector<HTMLElement>("[data-lock]");if(lock&&lock.textContent!==reason)lock.textContent=reason;
      b.title=reason||`Tooda ${world.unitDisplayName(kind)} (${cost}) · ${def.roleLabel??""} · ${(def.weapons??[]).map(w=>w.name+" / "+w.range+" m").join(" · ")} · Parem klõps: koosseisukaart`;
    }
    this.refreshBuildPanel(world, selection, running, engineerSelected);
    (this.el.qbar as HTMLElement).style.width = q.length ? Math.min(100, ((selectedProducer?.productionProgress??0) / world.unitDefinition(q[0],selectedProducer?.team??world.playerTeam).buildTime) * 100) + "%" : "0";
    if (selectedProducer) {
      const pre = selectedProducer.preDeployOrder;
      const preTxt = pre ? ` · Pre-deploy: ${pre.mode}${pre.x != null ? " @ kaardil" : ""}` : "";
      const rallyTxt = selectedProducer.rallyPoint ? " · Rally seatud" : "";
      this.el.qtxt.textContent =
        (q.length ? world.unitDisplayName(q[0])+" · "+productionStatus(world,selectedProducer) + (q.length > 1 ? ` (+${q.length - 1})` : "") : "Järjekord tühi") +
        ` · Tase ${world.producerLevel(selectedProducer)} · ${world.producerLevel(selectedProducer)>=3 ? "KÕRGEIM" : world.producerLevel(selectedProducer)>=2 ? "TÄIENDATUD" : "BAAS"}` + rallyTxt + preTxt +
        " · Shift+parem: pre-deploy siht";
    } else {
      this.el.qtxt.textContent = this.activeTab === "builds"
        ? "Ehita: vali hoone, seejärel koht kaardil"
        : "Tooda üksusi — vajad vastavat tootmishoonet";
    }
    if (this.el.predeployBar) {
      this.el.predeployBar.hidden = !selectedProducer;
    }
    const selectedUpgrade=[...selection].map(id=>world.byId.get(id)).find(e=>e&&!e.dead&&e.team===world.playerTeam&&!!e.def.building);
    this.el.facilityActions.hidden=!selectedUpgrade;
    const producerUpgrade = rootButton(this, "button[data-upgrade-producer]");
    if (producerUpgrade) { producerUpgrade.hidden=!selectedUpgrade; producerUpgrade.textContent=selectedUpgrade?.upgrading ? `Uuendamine… ${Math.ceil((selectedUpgrade.upgradeTime??10)-(selectedUpgrade.upgradeProgress??0))}s` : (selectedUpgrade && world.producerLevel(selectedUpgrade)>=3 ? `${selectedUpgrade.kind === "airbase" ? "Lennujaam" : "Tootja"} MAX · Tase 3` : `${selectedUpgrade?.kind === "airbase" ? "Uuenda lennubaasi" : "Uuenda hoonet"} → tase ${(selectedUpgrade ? world.producerLevel(selectedUpgrade)+1 : 2)} (${selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 260})`); producerUpgrade.disabled=!running||!selectedUpgrade||!!selectedUpgrade.upgrading||!world.canUpgradeProducer(selectedUpgrade)||world.resources<(selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 9999)||world.credits<(selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 9999); }
    const supplyDepot = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && e.kind==="supply");
    const supplyButton = rootButton(this, "button[data-upgrade-supply]");
    if (supplyButton) { const st=world.supplyDepotStatus(world.playerTeam); supplyButton.hidden=!supplyDepot; supplyButton.textContent=st.level>=2 ? "Varustusladu MAX" : `Uuenda varustusladu (${180 + st.level*120}) · tase ${st.level+1}/3`; supplyButton.disabled=!running||!supplyDepot||st.level>=2||world.resources<(180+st.level*120)||world.credits<(180+st.level*120); }
    const fobButton = rootButton(this, "button[data-upgrade-fob]");
    if (fobButton) { const lvl=supplyDepot?.fobLevel ?? 0; const cost=300+lvl*220; fobButton.hidden=!supplyDepot; fobButton.textContent=lvl>=2 ? "FOB MAX · juhtimisvõrk" : `Ehita FOB (${cost}) · tase ${lvl+1}/2`; fobButton.disabled=!running||!supplyDepot||lvl>=2||world.resources<cost||world.credits<cost; }
    const depotControl = this.el.depotControlBar as HTMLElement | undefined; if (depotControl) depotControl.hidden=!supplyDepot;

    const sel = [...selection].map((id) => world.byId.get(id)).filter((e) => e && !e.dead);
    if(this.inspectedBuildingId){
      const f=world.mapFeatures.find(f=>f.id===this.inspectedBuildingId);
      if(f&&isGarrisonBuilding(f)){
        const own=garrisonOccupants(world,f.id,true).filter(u=>u.team===world.playerTeam),visible=world.vision.isVisible(world.playerTeam,f.x,f.z)||own.length>0;
        const contacts=garrisonOccupants(world,f.id).filter(u=>u.team!==world.playerTeam&&world.isSpottedByTeam(u,world.playerTeam));
        this.el.selT.textContent=f.label??"Tsiviilhoone";
        this.setSelectedMarkup(`<button data-close-inspector>↩ Tagasi</button><div class="garrison-card"><b>Garnison · kuni ${garrisonCapacity(f)} rühma</b><small>${visible?`Hoone ${buildingCondition(world,f)>=1?"kasutuskõlbmatu":buildingCondition(world,f)>.35?"kahjustatud":"terve"} · Terviklikkus ${Math.round((1-buildingCondition(world,f))*100)}%`:"Seisund teadmata · luura hoonet"}</small><small>Jalavägi + paremklõps majale: sisene. U + paremklõps: välju. AT vajab ava; MANPAD kasutab katust. Kaudtuld hoonest ei tehta.</small>${own.length?own.map(u=>`<button data-select-unit="${u.id}">${world.unitDisplayName(u.kind,u.team)} · ${u.garrisonId?"sees":"sisenemas"}</button>`).join(""):contacts.length?"<small>Vaenlase luurekontakt · kogu hõive teadmata</small>":"<small>Oma garnison puudub; vaenlase puudumine pole kinnitatud.</small>"}</div>`);return;
      }
    }
    if(this.inspectedKind){
      const kind=this.inspectedKind,def=world.unitDefinition(kind),view={def,team:world.playerTeam,activeWeapon:0,ammo:def.ammoCapacity??0,secondaryAmmo:def.weapons?.map(w=>w.ammoCapacity),cooldown:0,weaponCooldowns:def.weapons?.map(()=>0)};
      this.el.selT.textContent=world.unitDisplayName(kind)+" · Koosseisukaart";
      this.setSelectedMarkup(`<button data-close-inspector>↩ Tagasi valiku juurde</button><div class="role-summary">${def.ability??def.roleLabel??""} · Hind ${def.cost} · Baastootmistöö ${def.buildTime} s · Hoone Lv${world.unitRequiredBuildingLevel(kind)}</div><small>${def.squadSize?`Mehi ${def.squadSize} · `:""}HP ${def.hp} · Soomus ${def.armorFront}/${def.armorSide}/${def.armorRear} · Optika ${def.optics} ${Math.round(def.opticsRange??0)} m · Kiirus ${def.speed.toFixed(1)} m/s · Kütus ${def.fuelCapacity??0} · Kulu ${def.fuelUsePerSec??0}/s</small>${weaponCards(world,view)}`);
    }else if (!sel.length) {
      this.el.selT.textContent = "Üksusi pole valitud";
      this.setSelectedMarkup(`<div class="empty-selection">${icon("focus")}<b>Vali üksus või rühm</b><span>Klõpsa üksusel või tõmba valikukast.</span><span>Parem klõps annab liikumis-, ründe- või sisenemiskäsu.</span><span>Shift lisab järgmise käsu. Esc tühistab sihtkäsu.</span></div>`);
    } else if (sel.length === 1) {
      const u = sel[0]!;
      this.el.selT.textContent = world.unitDisplayName(u.kind, u.team);
      const meter=(label:string,value:number,max:number)=>`<div class="unit-meter"><span>${label}</span><b>${Math.ceil(value)}/${Math.ceil(max)}</b><i><em style="width:${Math.min(100,Math.max(0,value/Math.max(1,max)*100))}%"></em></i></div>`;
    let status=u.team===world.playerTeam&&u.productionQueue.length?productionStatus(world,u):(u.kind==="logiTruck"||u.kind==="transport"&&u.supplyDepotId!=null)?logisticsStatus(world,u):u.def.armor==="air"?airOperationStatus(world,u):(u.def.damage||u.kind==="engineer"&&u.mode==="repair")?combatStatus(world,u):u.underConstruction?"Ehitamisel":u.def.building?"Hoone · tase "+world.producerLevel(u):u.mode==="move"?"Liigub":"Ootab käsku";
      if(u.team===world.playerTeam&&u.def.armor==="air"&&u.target)status+=" · "+combatStatus(world,u);
      const movement=u.def.speed>0&&u.team===world.playerTeam?`<small class="movement-status">Kiirus ${(u.motionSpeed??0).toFixed(1)} m/s${u.dest?` · sihini ${Math.round(Math.hypot(u.dest.x-u.x,u.dest.z-u.z))} m`:""}${u.moveQueue?.length?` · ${u.moveQueue.length} järgnevat käsku`:""}</small>`:"";
      this.setSelectedMarkup(`<div class="selected-summary"><div class="selected-picture">${unitPicture(u.kind,(u.team===world.playerTeam?world.playerFaction:world.enemyFaction))}</div><div class="meters">${meter("Elud",u.hp,maxHitPoints(u))}${(u.maxAmmo??0)>0?meter("Moon",u.ammo??0,u.maxAmmo!):""}${(u.maxFuel??0)>0?meter("Kütus",u.fuel??0,u.maxFuel!):""}${u.def.speed>0?meter("Moraal",u.morale??100,100):""}</div></div><span class="unit-status">${status}</span>${movement}${terrainReadout(world,u)}<small class="role-summary">${u.squadMaxMembers?`Meeskond ${u.squadMembers}/${u.squadMaxMembers} · `:""}${u.def.roleLabel??BUILD_LABELS[u.kind]??u.kind}${u.def.damage?` · Ulatus ${Math.round(effectiveWeaponRange(u))} m${u.def.minimumRange?` (min ${u.def.minimumRange})`:""} · Läbivus ${u.def.weapons?.[0]?weaponPenetration(u,u.def.weapons[0]).toFixed(1):u.def.penetration??0}`:""}${u.kind==="supply"?` · Moon ${Math.floor(u.ammoStock??0)} · Kütus ${Math.floor(u.fuelStock??0)} · Remont ${Math.floor(u.repairStock??0)} · ${u.logisticsPaused?"VEOD PEATATUD":u.preferredResourceIndex!=null?"Rajatis "+(u.preferredResourceIndex+1):"Automaatne kogumine"} · Vahepunkte ${u.logisticsWaypoints?.length??0}`:""}</small><details class="unit-details"><summary>Taktikalised andmed</summary>Kate ${coverValueAt(world,u.x,u.z)} · Soomus ${armorValue(u,"front")}/${armorValue(u,"side")}/${armorValue(u,"rear")} · Surve ${Math.round(u.suppression??0)} · Optika ${u.def.optics??"—"} (${Math.round(u.def.opticsRange??0)} m) · Varjatus ${u.def.stealthLevel??0} · Liikumise baas ${u.def.speed.toFixed(1)} m/s${u.def.armor!=="air"&&u.def.domain!=="sea"?` · Tee ×${mobilityProfile(u).roadSpeed} · Maastik praegu ×${groundTerrainFactor(world,u).toFixed(2)}`:""} · Stabilisaator ${u.def.stabilizer??"none"} · ${world.isInSupply(u)?"Varustusalas":"Väljaspool varustusala"}${u.components?` · Kahjustused ${Math.round(Math.max(...Object.values(u.components)))}%`:""}</details>${u.def.damage?`<div class="range-controls"><button data-range-toggle aria-pressed="${this.showWeaponRanges}">◎ Ulatusringid ${this.showWeaponRanges?"sees":"väljas"}</button><small>${this.rangeSlot==null?"Kõik relvad":"Relv "+(this.rangeSlot+1)+" · sama nupp taastab kõik"} · Katkendjoon = minimaalne kaugus. Ulatus ei taga luuret ega tulejoont.</small></div>`:""}${u.garrisonId?`<div class="garrison-card"><b>Garnison · ${u.kind==="manpad"?"katusepositsioon":"laskeava"}</b><small>${world.mapFeatures.find(f=>f.id===u.garrisonId)?.label??"Tsiviilhoone"} · Sektor ${Math.round(GARRISON_RULES.firingArc*180/Math.PI)}° · HE ja hoone varisemine on ohtlikud</small>${u.team===world.playerTeam?`<button data-garrison-face>◎ Vaatesuund</button><button data-garrison-exit>↪ Välju hoonest</button>`:""}</div>`:""}${u.loadedIntoId!=null&&u.team===world.playerTeam?`<button data-select-unit="${u.loadedIntoId}">Vali transport · väljumine U + paremklõps</button>`:""}${transportCapacity(u)>0?`<div class="transport-status"><b>Transport ${occupiedSeats(world,u)}/${transportCapacity(u)} kohta</b><small> Broneeritud ${occupiedSeats(world,u,true)-occupiedSeats(world,u)} kohta (${u.transportQueue?.length??0} rühma) · Jalavägi → paremklõps transpordile. Väljumine: U + paremklõps kaardil.</small>${u.cargoUnitIds.map(id=>world.byId.get(id)).filter(p=>p&&!p.dead).map(p=>`<span>${world.unitDisplayName(p!.kind,p!.team)} (${p!.squadMembers??1})</span>`).join(" ")}${u.mode==="transport-unload"&&u.cargoUnitIds.length?"<small>Väljub pärast saabumist; takistatud väljapääsu korral jääb pardale.</small>":""}</div>`:""}${u.team===world.playerTeam&&(u.kind==="supply"||u.kind==="logiTruck"||u.kind==="transport"&&u.supplyDepotId!=null)?logisticsCard(world,u):""}${weaponCards(world,u,u,this.rangeSlot,this.showWeaponRanges)}${u.team===world.playerTeam?unitDevelopmentCards(world,u,running):""}${["airbase","helipad"].includes(u.kind)?`<div class="air-roster"><small>${world.productionOperational(u).operational?"Lennurajatis töötab":world.productionOperational(u).reason} · Vali õhuoperatsioon ja paremklõpsa sihtpunktile.</small>${airUnitsForOrder(world,[u.id],u.team).map(a=>`<button data-select-unit="${a.id}"><span>${unitPicture(a.kind,u.team===world.playerTeam?world.playerFaction:world.enemyFaction)}</span><span><b>${world.unitDisplayName(a.kind,a.team)}</b><small>${airOperationStatus(world,a)}</small></span></button>`).join("")}</div>`:""}`);

    } else {
      const c: Record<string, number> = {};
      sel.forEach((u) => { const n = world.unitDisplayName(u!.kind, u!.team); c[n] = (c[n] || 0) + 1; });
      this.el.selT.textContent = sel.length + " üksust";
      const own=sel.filter(u=>u!.team===world.playerTeam),states:string[]=[];
      const moving=own.filter(u=>(u!.motionSpeed??0)>.5).length,waiting=own.filter(u=>u!.navWaiting).length;
      const returning=own.filter(u=>u!.airState==="returning").length,lowFuel=own.filter(u=>(u!.maxFuel??0)>0&&(u!.fuel??0)<u!.maxFuel!*.2).length;
      if(moving)states.push(`${moving} liigub`);if(waiting)states.push(`${waiting} ootab läbipääsu`);if(returning)states.push(`${returning} naaseb baasi`);if(lowFuel)states.push(`${lowFuel} kütus madal`);

      this.setSelectedMarkup(`<div class="selected-units">${sel.map(u=>`<button data-select-unit="${u!.id}" title="${world.unitDisplayName(u!.kind,u!.team)}"><span>${unitPicture(u!.kind,(u!.team===world.playerTeam?world.playerFaction:world.enemyFaction))}</span><i style="width:${u!.hp/maxHitPoints(u!)*100}%"></i></button>`).join("")}</div><small>${Object.entries(c).map(([k,v])=>`${v} × ${k}`).join(", ")}</small>${states.length?`<small class="group-state">${states.join(" · ")}</small>`:""}`);
    }
  }


  /** Real War style: only show buildings unlocked by the selected command branch. */
  private refreshBuildPanel(world: World, selection: ReadonlySet<number>, running: boolean, hasEngineer: boolean): void {
    const host = this.el.buildButtons as HTMLElement | undefined;
    if (!host) return;
    const selected = [...selection].map(id => world.byId.get(id)).filter((e): e is NonNullable<typeof e> => !!e && !e.dead && e.team === world.playerTeam);
    const branchSources = ["hq","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy","combatEngineer","supply"] as const;
    const sourceEnt = selected.find(e => (branchSources as readonly string[]).includes(e.kind));
    const sourceKind = (sourceEnt?.kind ?? "hq") as string;
    const available = world.availableBuilds(world.playerTeam, sourceKind as import("../sim/types").UnitKind);
    const branchAll: Record<string, string[]> = {
      hq: ["generator","supply","landCommand","airCommand","seaCommand"],
      landCommand: ["barracks","factory","combatEngineer","landStrategy","supply","generator"],
      airCommand: ["helipad","airbase","airStrategy","supply","generator"],
      seaCommand: ["shipyard","seaStrategy","supply","generator"],
      landStrategy: ["barracks","factory","combatEngineer","radar","bunker","aa"],
      airStrategy: ["helipad","airbase","radar","aa"],
      seaStrategy: ["shipyard","supply","radar"],
      combatEngineer: ["bunker","aa","radar"],
      supply: ["generator","radar"],
    };
    const list = branchAll[sourceKind] ?? branchAll.hq;
    if (this.el.treeLabel) this.el.treeLabel.textContent = `EHITUSPUU: ${SOURCE_LABELS[sourceKind] ?? sourceKind}`;
    if (this.el.treeHint) {
      this.el.treeHint.textContent = sourceEnt
        ? `Haru: ${SOURCE_LABELS[sourceKind] ?? sourceKind}`
        : "Vali HQ / juhtimiskeskus — või ehitatakse HQ harust.";
    }
    const power = world.powerStatus(world.playerTeam);
    const markup = list.map((kind) => {
      const cost = BUILD_COSTS[kind] ?? 0;
      const label = BUILD_LABELS[kind] ?? kind;
      const unlocked = available.includes(kind as import("../sim/buildings").BuildableKind);
      let reason = "";
      if (!unlocked) {
        if (kind !== "generator" && !world.hasBuilding(world.playerTeam, "generator")) reason = "Vajab generaatorit";
        else if (BUILDINGS_REQ[kind]) {
          const req = BUILDINGS_REQ[kind]!;
          if (!world.hasBuilding(world.playerTeam, req as UnitKind)) reason = `Vajab: ${BUILD_LABELS[req] ?? req}`;
        }
        if (!reason && power.ratio <= 0.01 && kind !== "generator" && kind !== "supply") reason = "Pole energiat";
        if (!reason) reason = "Lukus";
      } else if (world.resources < cost || world.credits < cost) reason = "Puudub ressurss";
      else if (!hasEngineer) reason = "Vajab inseneri";
      const disabled = !running || !unlocked || world.resources < cost || world.credits < cost || !hasEngineer;
      const bs = BUILDINGS[kind as keyof typeof BUILDINGS];
      const functionLabel = bs?.role === "production" ? "TOOTMINE" : bs?.role === "logistics" ? "LOGISTIKA" : bs?.role === "command" ? "JUHTIMINE" : bs?.role === "sensor" ? "SENSOR" : bs?.role === "defense" ? "KAITSE" : bs?.role === "power" ? "ENERGIA" : "ARENDUS";
      return `<button data-build="${kind}" ${disabled ? "disabled" : ""} title="${reason || label}"><span class="build-icon">${icon(kind)}</span><span>${label}</span><span class="unit-cost">${cost}</span><small class="build-role">${functionLabel}</small>${reason && disabled ? `<small class="lock-reason">${reason}</small>` : ""}</button>`;
    }).join("");
    if(host.dataset.markup===markup)return;
    host.dataset.markup=markup;host.innerHTML=markup;
    host.querySelectorAll<HTMLButtonElement>("button[data-build]").forEach((b) => {
      b.onclick = () => {
        if (b.disabled) return;
        this.onBuild(b.dataset.build as Parameters<Hud["onBuild"]>[0]);
      };
    });
  }

  showMissionSelect(missions: readonly MissionDef[], completed: ReadonlySet<string>, onSelect: (mission: MissionDef) => void): void {
    this.el.scrT.textContent = "Rogue Front";
    this.el.scrP.textContent = "Vali mängurežiim.";
    const card=this.el.scrB.parentElement!; this.el.scrB.hidden=true; card.querySelectorAll(".mission-list,.mode-list").forEach(n=>n.remove());
    const modes=document.createElement("div"); modes.className="mode-list mission-list";
    const sk=document.createElement("button"); sk.className="mission-choice"; sk.innerHTML="<span>SKIRMISH vs AI</span><small>BAAS · MAJANDUS · EHITUS · LAHING</small>";
    sk.onclick=()=>this.showSkirmishMaps(missions); modes.appendChild(sk);
    const camp=document.createElement("button"); camp.className="mission-choice"; camp.innerHTML="<span>KAMPAANIA</span><small>MISSIOONID JA EESMÄRGID</small>";
    camp.onclick=()=>{modes.remove(); this.showCampaignList(missions,completed,onSelect);}; modes.appendChild(camp);
    const mp=document.createElement("button"); mp.className="mission-choice"; mp.innerHTML="<span>MITMIKMÄNG 1v1</span><small>LOCKSTEP</small>";
    mp.onclick=()=>{const room=prompt("Lobby nimi:","ALPHA-01")?.trim(); if(room)this.onMultiplayer(missions[0]!,room);}; modes.appendChild(mp);
    card.appendChild(modes); this.el.screen.hidden=false;
  }
  private showCampaignList(missions: readonly MissionDef[], completed: ReadonlySet<string>, onSelect:(m:MissionDef)=>void):void{
    const card=this.el.scrB.parentElement!; const list=document.createElement("div"); list.className="mission-list";
    const state=loadCampaign();
    for(const mission of missions){
      const node=CAMPAIGN.find(n=>n.missionId===mission.id); const unlocked=node ? isUnlocked(node,state) : completed.has(mission.id);
      const done=node ? state.completed.includes(node.id) : completed.has(mission.id);
      const b=document.createElement("button"); b.className="mission-choice"; b.disabled=!unlocked;
      b.innerHTML=`<span>${mission.name}</span><small>${done?"LÕPETATUD · "+(node?.reward.commandXP??0)+" XP":unlocked?mission.map.name:"LUKUS — eelmine operatsioon lõpetamata"}</small>`;
      if(unlocked)b.onclick=()=>{this.el.screen.hidden=true;onSelect(mission)}; list.appendChild(b);
    } card.appendChild(list);
  }
  private showSkirmishMaps(missions: readonly MissionDef[]):void{
    const card=this.el.scrB.parentElement!; card.querySelectorAll(".mission-list,.secondary").forEach(n=>n.remove());
    this.el.scrT.textContent="SKIRMISH";
    this.el.scrP.textContent="1) Vali rahvus  2) Vali kaart  3) AI raskus. Igal rahvusel on oma tehnika nimed (Abrams / T-90M / Type 99A jne).";
    const list=document.createElement("div"); list.className="mission-list";
    // Nation row
    const nationRow=document.createElement("div"); nationRow.className="mission-list"; nationRow.style.marginBottom="10px";
    for(const id of FACTION_LIST){
      const f=FACTIONS[id];
      const b=document.createElement("button"); b.className="mission-choice"+(this.selectedFaction===id?" active-faction":"");
      b.innerHTML=`<span>${f.name}</span><small>${f.short} · ${f.unitNames.tank}</small>`;
      b.onclick=()=>{ this.selectedFaction=id; this.onFaction(id); this.showSkirmishMaps(missions); };
      nationRow.appendChild(b);
    }
    card.appendChild(nationRow);
    const deckBtn=document.createElement("button"); deckBtn.className="mission-choice";
    deckBtn.innerHTML=`<span>Deck planeerija</span><small>Wargame stiilis koosseis · ${FACTIONS[this.selectedFaction].short}</small>`;
    deckBtn.onclick=()=>this.onOpenDeck();
    card.appendChild(deckBtn);
    const modeRow=document.createElement("div"); modeRow.className="mission-list mode-grid";
    const modes: MatchMode[]=["skirmish","conquest","breakthrough","attrition","assault"];
    for(const mode of modes){
      const b=document.createElement("button"); b.className="mission-choice";
      b.innerHTML=`<span>${mode.toUpperCase()}</span><small>${MODE_RULES[mode].description}</small>`;
      b.onclick=()=>{ this.el.screen.hidden=true; this.onFaction(this.selectedFaction); this.chooseSkirmish(missions,mode); };
      modeRow.appendChild(b);
    }
    card.appendChild(modeRow);
    for(const m of missions){
      const b=document.createElement("button"); b.className="mission-choice";
      b.innerHTML=`<span>${m.map.name}</span><small>${m.map.theme.toUpperCase()} · vali esmalt mängurežiim</small>`;
      b.onclick=()=>this.chooseSkirmish([m],"skirmish");
      list.appendChild(b);
    }
    card.appendChild(list);
  }

  private chooseSkirmish(missions: readonly MissionDef[], mode: MatchMode): void {
    const card=this.el.scrB.parentElement!; card.querySelectorAll(".mode-grid,.mission-list").forEach(n=>n.remove());
    this.el.scrT.textContent=`${mode.toUpperCase()} · KAART`;
    this.el.scrP.textContent=`${MODE_RULES[mode].description} Vali kaart ja seejärel AI raskus.`;
    const list=document.createElement("div"); list.className="mission-list";
    for(const m of missions){ const b=document.createElement("button"); b.className="mission-choice"; b.innerHTML=`<span>${m.map.name}</span><small>${m.map.theme.toUpperCase()}</small>`; b.onclick=()=>{ const d=(prompt("AI raskus: easy / normal / hard","normal")||"normal").toLowerCase() as "easy"|"normal"|"hard"; this.el.screen.hidden=true; this.onSkirmish(m,(d==="easy"||d==="hard")?d:"normal",mode); }; list.appendChild(b); }
    card.appendChild(list);
  }

  dismissBriefing(): void { this.el.screen.hidden = true; }

  showBriefing(mission: MissionDef, onStart: () => void, hasSave = false, onLoad: (() => void) | null = null): void {
    this.el.scrB.hidden = false;
    this.el.scrB.textContent = "Alusta missiooni";
    this.screen(mission.name, mission.briefing, "Alusta missiooni", onStart);
    if (hasSave && onLoad) {
      const b = document.createElement("button"); b.textContent = "Jätka salvestust"; b.className = "secondary";
      b.onclick = () => { this.el.screen.hidden = true; onLoad(); };
      this.el.scrB.parentElement?.appendChild(b);
    }
  }

  showResult(status: "won" | "lost", time: number, reason = "Lahing lõppenud", nextMission?: string): void {
    this.screen(status === "won" ? "Võit" : "Kaotus",
      reason + " · Aeg: " + fmt(time) + ".",
      nextMission ? "Järgmine operatsioon" : "Mängi uuesti", () => { if(nextMission) location.href=`${location.pathname}?mission=${encodeURIComponent(nextMission)}&faction=${this.selectedFaction}`; else location.reload(); });
    const menu=document.createElement("button");menu.className="secondary";menu.textContent="Peamenüü";menu.onclick=()=>{location.href=location.pathname;};this.el.scrB.parentElement?.appendChild(menu);
  }

  private screen(title: string, text: string, button: string, onClick: () => void): void {
    this.el.scrB.hidden = false;
    this.el.scrB.parentElement?.querySelectorAll(".mission-list,.secondary").forEach((n) => n.remove());
    this.el.scrT.textContent = title;
    this.el.scrP.textContent = text;
    this.el.scrB.textContent = button;
    (this.el.scrB as HTMLButtonElement).onclick = () => { this.el.screen.hidden = true; onClick(); };
    this.el.screen.hidden = false;
  }
}

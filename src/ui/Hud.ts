import "./hud.css";
import "./tactical.css";
import {icon,unitPicture} from "./icons";
import {combatStatus} from "../sim/systems/units";
import type { World } from "../sim/World";
import { coverValueAt } from "../sim/systems/sensors";
import type { MissionDef } from "../sim/types";
import type { UnitKind } from "../sim/types";
import { UNITS } from "../sim/units";
import { MAX_QUEUE } from "../sim/constants";
import type { FactionId } from "../sim/factions";
import { FACTIONS, FACTION_LIST, factionLandUnits, factionAirUnits, factionSeaUnits } from "../sim/factions";
import { BUILDINGS } from "../sim/buildings";
import { MODE_RULES, type MatchMode } from "../sim/gameModes";
import { CAMPAIGN, loadCampaign, isUnlocked } from "../sim/campaign";

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const unitIcon = (kind:UnitKind):string => unitPicture(kind,"usa");
const rootButton = (_hud: Hud, selector: string) => document.querySelector<HTMLButtonElement>(selector);
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
  readonly minimapCanvas: HTMLCanvasElement;
  onOrder: (order:"move"|"attack"|"stop"|"focus")=>void = ()=>{};
  onSelect: (ids:number[])=>void = ()=>{};
  onProduce: (kind: UnitKind, producerId?: number) => void = () => {};
  onPause: () => void = () => {};
  onSettings: () => void = () => {};
  onSave: () => void = () => {};
  onLoad: () => void = () => {};
  onBuild: (kind: "barracks"|"factory"|"helipad"|"airbase"|"refinery"|"supply"|"radar"|"bunker"|"aa"|"generator"|"shipyard"|"landCommand"|"airCommand"|"seaCommand"|"combatEngineer"|"landStrategy"|"airStrategy"|"seaStrategy") => void = () => {};
  onUpgradeSupply: (ids: number[]) => void = () => {};
  onUpgradeFOB: (ids: number[]) => void = () => {};
  onDepotPriority: (ids: number[], focus: "ammo" | "fuel" | "repair" | "balanced") => void = () => {};
  onUpgradeProducer: (ids: number[]) => void = () => {};
  onStance: (ids: number[], mode: "attack" | "hold" | "patrol" | "holdfire") => void = () => {};
  onPriority: (ids: number[], focus: "supply" | "generator" | "aa") => void = () => {};
  onPreDeploy: (ids: number[], mode: "move" | "attack" | "hold") => void = () => {};
  onFormation: (kind: "box" | "line" | "wedge" | "column") => void = () => {};
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

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <header class="top">
        <div class="panel brand">Rogue Front<small>Taktikaline RTS · <span data-r="fps">-- fps</span> · <span data-r="net">üksikmäng</span></small></div>
        <div class="panel obj"><b data-r="missionName">Missioon</b><div data-r="objectiveList">Vali missioon.</div><div class="mission-msg" data-r="missionMsg"></div><div class="warning" data-r="warning"></div></div>
        <div class="panel controls"><button data-action="pause">Paus</button><button data-action="save">Salvesta</button><button data-action="load">Lae</button><button data-action="settings">Seaded</button></div>
        <div class="panel stat resources">
          <div class="res-row"><span class="res-label">VARUSTUS</span><b data-r="res">0</b></div>
          <div class="res-row"><span class="res-label">ENERGIA</span><b data-r="power">0/0</b>
            <span class="pwr-bar" title="Energia"><i data-r="pwrFill"></i></span>
          </div>
          <div class="res-row logistics-row"><span class="res-label">LOGISTIKA</span><b data-r="logistics">—</b></div><details class="economy-details"><summary title="Majanduse ja varustuse andmed">ⓘ</summary><div><small data-r="commandNet">Juhtimisvõrk —</small>
          <small>Krediit <span data-r="cr">0</span> · Moraal <span data-r="morale">100</span> · <span data-r="airstatus">Õhk 0/0</span></small><small data-r="economy">Majandus —</small>
          </div></details><span data-r="clock">0:00</span>
        </div>
      </header>
      <footer class="bottom">
        <canvas class="mini" width="176" height="176"></canvas>
        <div class="panel sel">
          <h3 data-r="selT"></h3><p data-r="selP"></p>
          <div class="stance-bar" data-r="stanceBar">
            <button data-stance="attack" title="Aggressiivne – ründab vaenlasi nägemisraadiuses">Ründa</button>
            <button data-stance="hold" title="Hoia positsiooni – ei liigu, tulistab lähedalt">Hoia</button>
            <button data-stance="holdfire" title="Ära tulista – hoia tuld (Wargame ROE)">Ära tulista</button>
            <button data-stance="patrol" title="Patrull – liigub ja ründab teel">Patrull</button>
          </div>
          <details class="advanced-orders"><summary>Formatsioon ja prioriteet</summary><div class="priority-bar" data-r="priorityBar">
            <button data-priority="supply" title="Prioriteet: vaenlase varustuslaod">Ladud</button>
            <button data-priority="generator" title="Prioriteet: generaatorid">Energia</button>
            <button data-priority="aa" title="Prioriteet: õhutõrje">Õhutõrje</button>
          </div>
          <div class="formation-bar" data-r="formationBar">
            <span class="pre-label">Vorm:</span>
            <button data-formation="box" title="Kast">Kast</button>
            <button data-formation="line" title="Joon">Joon</button>
            <button data-formation="wedge" title="Kiil">Kiil</button>
            <button data-formation="column" title="Kolonn">Kolonn</button>
          </div>
          </details><div class="air-mission-bar" data-r="airMissionBar" hidden>
            <span class="pre-label">Õhk:</span>
            <button data-air-mission="cap" title="CAP – õhuülekaal / patrull">CAP</button>
            <button data-air-mission="strike" title="Strike – infrastruktuur">Strike</button>
            <button data-air-mission="sead" title="SEAD – õhutõrje mahavõtt">SEAD</button>
            <button data-air-mission="ground" title="Close support – maaüksused">CAS</button>
          </div>
          <div class="predeploy-bar" data-r="predeployBar" hidden>
            <span class="pre-label">Pre-deploy:</span>
            <button data-predeploy="move" title="Valmis üksused liiguvad sihtmärgile (Shift+paremklõps kaardil)">Liigu</button>
            <button data-predeploy="attack" title="Valmis üksused ründavad teed mööda">Ründa teed</button>
            <button data-predeploy="hold" title="Valmis üksused hoiavad tootja juures">Hoia</button>
          </div>
          <div class="order-bar">${(["move","attack","stop","focus"] as const).map(k=>`<button data-order="${k}" title="${k==="attack"?"Ründeliikumine: parem klõps sihtpunktile (A)":k==="move"?"Liigu: parem klõps sihtpunktile":k==="stop"?"Peata (X)":"Kaamera valikule"}">${icon(k)}<span>${k==="attack"?"Ründeliiku":k==="move"?"Liigu":k==="stop"?"Peata":"Fookus"}</span></button>`).join("")}</div><div class="help">Vasak hiir: vali · Parem: liigu/ründa · A+parem: ründeliikumine · H: hoia · P: patrull · WASD: kaamera · Rull: suum · X: peata · F+parem: suurtükituli · L: kustuta logistika marsruut · Ctrl+1–9: grupp</div>
        </div>
        <div class="panel build tactical">
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
                <button data-upgrade-producer hidden>Uuenda tootjat</button>
                <button data-upgrade-supply hidden>Uuenda varustusladu</button>
                <button data-upgrade-fob hidden>Ehita FOB</button>
                <div class="depot-control-bar" data-r="depotControlBar" hidden>
                  <span class="pre-label">FOB prioriteet:</span>
                  <button data-depot-priority="balanced">Tasakaal</button><button data-depot-priority="ammo">Ammo</button><button data-depot-priority="fuel">Kütus</button><button data-depot-priority="repair">Remont</button>
                </div>
                <button data-cancel-produce hidden title="Tühista viimane (75% tagasi)">Tühista viimane</button>
                <div class="build-buttons" data-r="buildButtons"></div>
              </div>
            </div>
          </div>
          <div class="qbar"><i data-r="qbar"></i></div>
          <div class="qtxt" data-r="qtxt"></div>
        </div>
      </footer>
      <div class="screen" data-r="screen" hidden><div class="card"><h1 data-r="scrT"></h1><p data-r="scrP"></p><button data-r="scrB"></button></div></div>`;
    root.querySelectorAll<HTMLElement>("[data-r]").forEach((n) => (this.el[n.dataset.r!] = n));
    this.minimapCanvas = root.querySelector(".mini") as HTMLCanvasElement;
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>("button[data-kind]")];
    this.pauseButton = root.querySelector<HTMLButtonElement>('[data-action="pause"]');
    root.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b=>b.onclick=()=>this.onOrder(b.dataset.order as "move"|"attack"|"stop"|"focus"));
    this.el.selP.addEventListener("click",e=>{const b=(e.target as HTMLElement).closest<HTMLElement>("[data-select-unit]");if(b)this.onSelect([Number(b.dataset.selectUnit)]);});
    this.buttons.forEach((b) => b.addEventListener("click", () => {
      const pid = b.dataset.producerId ? Number(b.dataset.producerId) : undefined;
      this.onProduce(b.dataset.kind as UnitKind, pid);
    }));
    // build buttons are rebound each frame from availableBuilds()
    root.querySelector<HTMLButtonElement>("button[data-upgrade-producer]")?.addEventListener("click",()=>this.onUpgradeProducer([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-upgrade-supply]")?.addEventListener("click",()=>this.onUpgradeSupply([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-upgrade-fob]")?.addEventListener("click",()=>this.onUpgradeFOB([...this.selectedIds]));
    root.querySelectorAll<HTMLButtonElement>("button[data-depot-priority]").forEach((b)=>b.addEventListener("click",()=>{ if(this.selectedIds.length) this.onDepotPriority([...this.selectedIds], b.dataset.depotPriority as "ammo"|"fuel"|"repair"|"balanced"); }));
    root.querySelector<HTMLButtonElement>("button[data-cancel-produce]")?.addEventListener("click", () => {
      if (this.selectedProducerId != null) this.onCancelProduce(this.selectedProducerId);
    });
    root.querySelector('[data-action="pause"]')?.addEventListener("click", () => this.onPause());
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
    this.el.selP.dataset.markup=markup;this.el.selP.innerHTML=markup;
  }

  getBuildButtons(): HTMLButtonElement[] { return [...document.querySelectorAll<HTMLButtonElement>("button[data-build]")]; }

  setFps(n: number): void { this.el.fps.textContent = n + " fps"; }
  setWarning(text: string): void { this.el.warning.textContent = text; }
  setNetworkStatus(text: string): void { this.el.net.textContent = text; }
  setPaused(paused: boolean): void { if (this.pauseButton) this.pauseButton.textContent = paused ? "Jätka" : "Paus"; }

  update(world: World, selection: ReadonlySet<number>, running: boolean, objectives: readonly { title: string; description: string; complete: boolean; progress: number }[] = [], missionMessage = ""): void {
    const changed=this.selectedIds.join(",") !== [...selection].join(",");
    this.selectedIds = [...selection];
    if(changed && this.selectedIds.length){const first=world.byId.get(this.selectedIds[0]);if(first){const tab=["factory","barracks"].includes(first.kind)?"land":["helipad","airbase"].includes(first.kind)?"air":first.kind==="shipyard"?"sea":first.kind==="engineer"||first.def.building?"builds":first.def.armor==="air"?"air":first.def.domain==="sea"?"sea":"land";document.querySelector<HTMLButtonElement>(`button[data-tab="${tab}"]`)?.click();}}
    this.el.stanceBar.hidden=!this.selectedIds.some(id=>(world.byId.get(id)?.def.damage??0)>0);
    document.querySelectorAll<HTMLButtonElement>("[data-order]").forEach(b=>b.disabled=!running||!selection.size);

    if (this.el.airMissionBar) {
      const airSel = [...selection].map(id => world.byId.get(id)).filter(e => e && !e.dead && e.team === world.playerTeam && (e.def.armor === "air" || e.def.category === "heli" || ["heli","gunship","cargoPlane","fighter","interceptor","bomber","transport"].includes(e.kind)));
      this.el.airMissionBar.hidden = airSel.length === 0;
    }

    this.el.cr.textContent = String(Math.floor(world.credits));
    this.el.clock.textContent = fmt(world.time);
    this.el.res.textContent = String(Math.floor(world.resources));
    if (this.el.morale) this.el.morale.textContent = String(Math.round(world.teamMorale[world.playerTeam]));
    if (this.el.control) this.el.control.textContent = String(Math.round(world.areaControl[world.playerTeam]));
    if (this.el.airstatus) { const a=world.airbaseStatus(world.playerTeam), s=world.supplyDepotStatus(world.playerTeam), al=world.airliftStatus(world.playerTeam); this.el.airstatus.textContent = `Õhk ${a.aircraft}/${a.capacity} · Helid ${s.active}/${s.depots} · Varu ${al.pool} · ${al.enabled ? `Cargo ${al.inFlight ? "lennul" : "ootel"}` : "lennujaam lvl1"}`; }
    if (this.el.economy) { const e = world.resourceEconomyStatus(world.playerTeam), r = world.roadLogisticsStatus(world.playerTeam); this.el.economy.textContent = `Punktid ${e.controlled} · Töös ${e.active} · laovaru ${e.stock} · +${e.rate.toFixed(1)}/s · Veokid ${r.trucks} · Teel ${r.cargo}${r.disconnected ? ` · Katkestatud ${r.disconnected}` : ""}`; }
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
    this.el.warning.textContent = warn;
    if(world.matchController){
      const mode=world.matchController,score=mode.scores;
      this.el.missionName.textContent=mode.mode.toUpperCase();
      this.el.objectiveList.textContent=`Sina ${Math.floor(score[world.playerTeam])} · Vastane ${Math.floor(score[world.playerTeam===0?1:0])}`+(mode.rules.timeLimit?` · Aega ${fmt(Math.max(0,mode.rules.timeLimit-world.time))}`:"");
    }
    if (objectives.length) {
      this.el.objectiveList.innerHTML = objectives.map((o) => `<div class="objective ${o.complete ? "done" : ""}"><span>${o.complete ? "✓" : "○"} ${o.title}</span>${o.complete ? "" : `<i style="width:${Math.round(o.progress * 100)}%"></i>`}</div>`).join("");
    }
    this.el.missionMsg.textContent = world.matchController ? "" : missionMessage;
    const hq = world.hq[world.playerTeam];
    const selectedProducer = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && ["barracks","factory","helipad","airbase","shipyard"].includes(e.kind));
    this.selectedProducerId = selectedProducer?.id ?? null;
    const q = selectedProducer?.productionQueue ?? [];
    const has = (k: "barracks"|"factory"|"helipad"|"airbase"|"shipyard") => world.entities.some(e=>!e.dead&&!e.underConstruction&&e.team===world.playerTeam&&e.kind===k);
    const findProducer = (kind: string) => {
      if (selectedProducer && selectedProducer.kind === kind) return selectedProducer;
      return world.entities
        .filter(e => !e.dead && !e.underConstruction && e.team === world.playerTeam && e.kind === kind)
        .sort((a, b) => a.productionQueue.length - b.productionQueue.length)[0] ?? null;
    };
    // Unit buttons always visible inside their tab; wire to best available producer
    // Faction-specific unit names on buttons + selection panel
    document.querySelectorAll<HTMLElement>("[data-unit-label]").forEach((el) => {
      const k = el.dataset.unitLabel as UnitKind;
      if (k && UNITS[k]) el.textContent = world.unitDisplayName(k);
    });
    this.buttons.forEach((b) => {
      const k = b.dataset.kind as UnitKind;
      if (k && UNITS[k]) {
        const nm = world.unitDisplayName(k);
        const picture=b.querySelector<HTMLElement>(".unit-icon");
        if(picture && picture.dataset.faction!==world.playerFaction){picture.innerHTML=unitPicture(k,world.playerFaction);picture.dataset.faction=world.playerFaction;}
        b.title = `Tooda ${nm} (${UNITS[k].cost})`;
      }
      b.style.display = "";
      const pKind = b.dataset.producer!;
      const prod = findProducer(pKind);
      if (prod) b.dataset.producerId = String(prod.id);
      else delete b.dataset.producerId;
    });
    const cancelBtn = rootButton(this, "button[data-cancel-produce]");
    if (cancelBtn) {
      cancelBtn.hidden = !selectedProducer || q.length === 0;
      cancelBtn.disabled = !running || !selectedProducer || q.length === 0;
    }
    const engineerSelected = [...selection].some(id=>{const e=world.byId.get(id);return !!e&&!e.dead&&e.team===world.playerTeam&&e.kind==="engineer";}) || world.entities.some(e=>!e.dead&&e.team===world.playerTeam&&e.kind==="engineer");
    for (const b of this.buttons) {
      const kind = b.dataset.kind as UnitKind;
      if (!kind || !UNITS[kind]) continue;
      const cost = UNITS[kind].cost;
      const pKind = b.dataset.producer as "barracks"|"factory"|"helipad"|"airbase"|"shipyard";
      const prod = findProducer(pKind);
      const queueFull = (prod?.productionQueue.length ?? 0) >= MAX_QUEUE;
      b.disabled = !running || !hq || hq.dead || !prod || queueFull
        || world.resources < cost || world.credits < cost
        || !has(pKind)
        || !world.canProduceAtLevel(prod!, kind) || !world.productionOperational(prod!,kind).operational;
      const lock=b.querySelector<HTMLElement>("[data-lock]");
      if(lock)lock.textContent=!prod?"Vajab tootjat":queueFull?"Järjekord täis":world.resources<cost||world.credits<cost?"Varustus puudub":!world.canProduceAtLevel(prod,kind)?"Vajab taset "+world.unitRequiredBuildingLevel(kind):!world.productionOperational(prod,kind).operational?"Tarne / energia":"";
      const req = world.unitRequiredBuildingLevel(kind);
      b.title = !prod ? `Loo ${pKind} esimesena` : !world.productionOperational(prod,kind).operational ? world.productionOperational(prod,kind).reason : world.producerLevel(prod) < req ? `Vajab ${pKind} taset ${req}` : `Tooda ${world.unitDisplayName(kind)} (${UNITS[kind].cost})`;
    }
    this.refreshBuildPanel(world, selection, running, engineerSelected);
    (this.el.qbar as HTMLElement).style.width = q.length ? Math.min(100, ((selectedProducer?.productionProgress??0) / UNITS[q[0]].buildTime) * 100) + "%" : "0";
    if (selectedProducer) {
      const pre = selectedProducer.preDeployOrder;
      const preTxt = pre ? ` · Pre-deploy: ${pre.mode}${pre.x != null ? " @ kaardil" : ""}` : "";
      const rallyTxt = selectedProducer.rallyPoint ? " · Rally seatud" : "";
      this.el.qtxt.textContent =
        (q.length ? "Ehitamisel: " + world.unitDisplayName(q[0]) + (q.length > 1 ? ` (+${q.length - 1})` : "") : "Järjekord tühi") +
        ` · Tase ${world.producerLevel(selectedProducer)} · ${world.producerLevel(selectedProducer)>=3 ? "KÕRGEIM" : world.producerLevel(selectedProducer)>=2 ? "TÄIENDATUD" : "BAAS"}` + rallyTxt + preTxt +
        " · Shift+parem: pre-deploy siht";
    } else {
      this.el.qtxt.textContent = this.activeTab === "builds"
        ? "Vali insener + ehita (BUILDS)"
        : "Tooda üksusi — vajad vastavat tootmishoonet";
    }
    if (this.el.predeployBar) {
      this.el.predeployBar.hidden = !selectedProducer;
    }
    const selectedUpgrade=[...selection].map(id=>world.byId.get(id)).find(e=>e&&!e.dead&&e.team===world.playerTeam&&!!e.def.building);
    const producerUpgrade = rootButton(this, "button[data-upgrade-producer]");
    if (producerUpgrade) { producerUpgrade.hidden=!selectedUpgrade; producerUpgrade.textContent=selectedUpgrade?.upgrading ? `Uuendamine… ${Math.ceil((selectedUpgrade.upgradeTime??10)-(selectedUpgrade.upgradeProgress??0))}s` : (selectedUpgrade && world.producerLevel(selectedUpgrade)>=3 ? `${selectedUpgrade.kind === "airbase" ? "Lennujaam" : "Tootja"} MAX · Tase 3` : `${selectedUpgrade?.kind === "airbase" ? "Uuenda lennubaasi" : "Uuenda hoonet"} → tase ${(selectedUpgrade ? world.producerLevel(selectedUpgrade)+1 : 2)} (${selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 260})`); producerUpgrade.disabled=!running||!selectedUpgrade||!!selectedUpgrade.upgrading||!world.canUpgradeProducer(selectedUpgrade)||world.resources<(selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 9999)||world.credits<(selectedUpgrade ? world.producerUpgradeCost(world.producerLevel(selectedUpgrade)) : 9999); }
    const supplyDepot = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && e.kind==="supply");
    const supplyButton = rootButton(this, "button[data-upgrade-supply]");
    if (supplyButton) { const st=world.supplyDepotStatus(world.playerTeam); supplyButton.hidden=!supplyDepot; supplyButton.textContent=st.level>=3 ? "Varustusladu MAX" : `Uuenda varustusladu (${180 + st.level*120}) · tase ${st.level+1}/3`; supplyButton.disabled=!running||!supplyDepot||st.level>=3||world.resources<(180+st.level*120)||world.credits<(180+st.level*120); }
    const fobButton = rootButton(this, "button[data-upgrade-fob]");
    if (fobButton) { const lvl=supplyDepot?.fobLevel ?? 0; const cost=300+lvl*220; fobButton.hidden=!supplyDepot; fobButton.textContent=lvl>=2 ? "FOB MAX · juhtimisvõrk" : `Ehita FOB (${cost}) · tase ${lvl+1}/2`; fobButton.disabled=!running||!supplyDepot||lvl>=2||world.resources<cost||world.credits<cost; }
    const depotControl = this.el.depotControlBar as HTMLElement | undefined; if (depotControl) depotControl.hidden=!supplyDepot;

    const sel = [...selection].map((id) => world.byId.get(id)).filter((e) => e && !e.dead);
    if (!sel.length) {
      this.el.selT.textContent = "Üksusi pole valitud";
      this.setSelectedMarkup("Vali üksusi hiire vasaku nupuga või tõmba kast.");
    } else if (sel.length === 1) {
      const u = sel[0]!;
      this.el.selT.textContent = world.unitDisplayName(u.kind, u.team);
      const meter=(label:string,value:number,max:number)=>`<div class="unit-meter"><span>${label}</span><b>${Math.ceil(value)}/${Math.ceil(max)}</b><i><em style="width:${Math.min(100,Math.max(0,value/Math.max(1,max)*100))}%"></em></i></div>`;
      const status=u.def.damage?combatStatus(world,u):u.underConstruction?"Ehitamisel":u.def.building?"Hoone · tase "+world.producerLevel(u):u.mode==="move"?"Liigub":"Ootab käsku";
      this.setSelectedMarkup(`<div class="selected-summary"><div class="selected-picture">${unitPicture(u.kind,(u.team===world.playerTeam?world.playerFaction:world.enemyFaction))}</div><div class="meters">${meter("Elud",u.hp,u.def.hp)}${(u.maxAmmo??0)>0?meter("Moon",u.ammo??0,u.maxAmmo!):""}${(u.maxFuel??0)>0?meter("Kütus",u.fuel??0,u.maxFuel!):""}${u.def.speed>0?meter("Moraal",u.morale??100,100):""}</div></div><span class="unit-status">${status}</span><small class="role-summary">${u.def.roleLabel??BUILD_LABELS[u.kind]??u.kind}${u.def.damage?` · Ulatus ${u.def.range} · Läbivus ${u.def.penetration??0}`:""}${u.kind==="supply"?` · Moon ${Math.floor(u.ammoStock??0)} · Kütus ${Math.floor(u.fuelStock??0)} · Remont ${Math.floor(u.repairStock??0)}`:""}</small><details class="unit-details"><summary>Taktikalised andmed</summary>Kate ${coverValueAt(world,u.x,u.z)} · Soomus ${u.def.armorFront??0}/${u.def.armorSide??0}/${u.def.armorRear??0} · Surve ${Math.round(u.suppression??0)} · Optika ${u.def.optics??"—"} · ${world.isInSupply(u)?"Varustusalas":"Väljaspool varustusala"}${u.components?` · Kahjustused ${Math.round(Math.max(...Object.values(u.components)))}%`:""}</details>`);

    } else {
      const c: Record<string, number> = {};
      sel.forEach((u) => { const n = world.unitDisplayName(u!.kind, u!.team); c[n] = (c[n] || 0) + 1; });
      this.el.selT.textContent = sel.length + " üksust";
      this.setSelectedMarkup(`<div class="selected-units">${sel.map(u=>`<button data-select-unit="${u!.id}" title="${world.unitDisplayName(u!.kind,u!.team)}"><span>${unitPicture(u!.kind,(u!.team===world.playerTeam?world.playerFaction:world.enemyFaction))}</span><i style="width:${u!.hp/u!.def.hp*100}%"></i></button>`).join("")}</div><small>${Object.entries(c).map(([k,v])=>`${v} × ${k}`).join(", ")}</small>`);
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
    const card=this.el.scrB.parentElement!; card.querySelectorAll(".mission-list").forEach(n=>n.remove());
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
    this.el.scrB.parentElement?.querySelectorAll(".mission-list").forEach((n) => n.remove());
    this.el.scrT.textContent = title;
    this.el.scrP.textContent = text;
    this.el.scrB.textContent = button;
    (this.el.scrB as HTMLButtonElement).onclick = () => { this.el.screen.hidden = true; onClick(); };
    this.el.screen.hidden = false;
  }
}

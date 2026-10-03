import "./hud.css";
import type { World } from "../sim/World";
import type { MissionDef } from "../sim/types";
import type { UnitKind } from "../sim/types";
import { UNITS } from "../sim/units";
import { MAX_QUEUE } from "../sim/constants";
import type { FactionId } from "../sim/factions";
import { FACTIONS, FACTION_LIST, factionLandUnits, factionAirUnits, factionSeaUnits } from "../sim/factions";

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const unitIcon = (k: UnitKind): string => {
  const icons: Partial<Record<UnitKind, string>> = {
    inf: "⚔", engineer: "🔧", special: "★", tank: "▣", apc: "▢", ifv: "▣", artillery: "⌖", mlrs: "⇈",
    heli: "✈", transport: "⇪", gunship: "⚡", fighter: "▲", interceptor: "◆", bomber: "⬤",
    destroyer: "⚓", submarine: "◎", landingcraft: "▭",
  };
  return icons[k] ?? "•";
};
const rootButton = (_hud: Hud, selector: string) => document.querySelector<HTMLButtonElement>(selector);

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
  onProduce: (kind: UnitKind, producerId?: number) => void = () => {};
  onPause: () => void = () => {};
  onSettings: () => void = () => {};
  onSave: () => void = () => {};
  onLoad: () => void = () => {};
  onBuild: (kind: "barracks"|"factory"|"helipad"|"airbase"|"refinery"|"supply"|"radar"|"bunker"|"aa"|"generator"|"shipyard"|"landCommand"|"airCommand"|"seaCommand"|"combatEngineer"|"landStrategy"|"airStrategy"|"seaStrategy") => void = () => {};
  onUpgradeSupply: (ids: number[]) => void = () => {};
  onUpgradeProducer: (ids: number[]) => void = () => {};
  onStance: (ids: number[], mode: "attack" | "hold" | "patrol") => void = () => {};
  onPriority: (ids: number[], focus: "supply" | "generator" | "aa") => void = () => {};
  onPreDeploy: (ids: number[], mode: "move" | "attack" | "hold") => void = () => {};
  onFormation: (kind: "box" | "line" | "wedge" | "column") => void = () => {};
  onCancelProduce: (producerId: number) => void = () => {};
  onMultiplayer: (mission: MissionDef, room?: string) => void = () => {};
  onSkirmish: (mission: MissionDef, difficulty: "easy"|"normal"|"hard") => void = () => {};
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
        <div class="panel brand">Rogue Front<small>Kampaania · <span data-r="fps">-- fps</span> · <span data-r="net">üksikmäng</span></small></div>
        <div class="panel obj"><b data-r="missionName">Missioon</b><div data-r="objectiveList">Vali missioon.</div><div class="mission-msg" data-r="missionMsg"></div><div class="warning" data-r="warning"></div></div>
        <div class="panel controls"><button data-action="pause">Paus</button><button data-action="save">Salvesta</button><button data-action="load">Lae</button><button data-action="settings">Seaded</button></div>
        <div class="panel stat resources">
          <div class="res-row"><span class="res-label">VARUSTUS</span><b data-r="res">0</b></div>
          <div class="res-row"><span class="res-label">ENERGIA</span><b data-r="power">0/0</b>
            <span class="pwr-bar" title="Energia"><i data-r="pwrFill"></i></span>
          </div>
          <div class="res-row logistics-row"><span class="res-label">LOGISTIKA</span><b data-r="logistics">—</b></div>
          <small>Krediit <span data-r="cr">0</span> · Moraal <span data-r="morale">100</span> · <span data-r="airstatus">Õhk 0/0</span></small>
          <span data-r="clock">0:00</span>
        </div>
      </header>
      <footer class="bottom">
        <canvas class="mini" width="176" height="176"></canvas>
        <div class="panel sel">
          <h3 data-r="selT"></h3><p data-r="selP"></p>
          <div class="stance-bar" data-r="stanceBar">
            <button data-stance="attack" title="Aggressiivne – ründab vaenlasi nägemisraadiuses">Ründa</button>
            <button data-stance="hold" title="Hoia positsiooni – ei liigu, tulistab lähedalt">Hoia</button>
            <button data-stance="patrol" title="Patrull – liigub ja ründab teel">Patrull</button>
          </div>
          <div class="priority-bar" data-r="priorityBar">
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
          <div class="predeploy-bar" data-r="predeployBar" hidden>
            <span class="pre-label">Pre-deploy:</span>
            <button data-predeploy="move" title="Valmis üksused liiguvad sihtmärgile (Shift+paremklõps kaardil)">Liigu</button>
            <button data-predeploy="attack" title="Valmis üksused ründavad teed mööda">Ründa teed</button>
            <button data-predeploy="hold" title="Valmis üksused hoiavad tootja juures">Hoia</button>
          </div>
          <div class="help">Vasak hiir: vali · Parem: liigu/ründa · A+parem: ründeliikumine · H: hoia · P: patrull · WASD: kaamera · Rull: suum · X: peata · F+parem: suurtükituli · Ctrl+1–9: grupp</div>
        </div>
        <div class="panel build tactical">
          <div class="tab-bar">
            <button class="tab active" data-tab="land">LAND</button>
            <button class="tab" data-tab="air">AIR</button>
            <button class="tab" data-tab="sea">SEA</button>
            <button class="tab" data-tab="builds">BUILDS</button>
          </div>
          <div class="tab-panels">
            <div class="tab-panel active" data-panel="land">
              ${factionLandUnits("usa").filter(k => UNITS[k]).map((k) => {
                const producer = ["inf","engineer","special"].includes(k) ? "barracks" : "factory";
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="${producer}" data-tab-unit="land"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="air">
              ${factionAirUnits("usa").filter(k => UNITS[k]).map((k) => {
                const producer = ["fighter","interceptor","bomber"].includes(k) ? "airbase" : "helipad";
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="${producer}" data-tab-unit="air"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="sea">
              ${factionSeaUnits("usa").filter(k => UNITS[k]).map((k) => {
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="shipyard" data-tab-unit="sea"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name" data-unit-label="${k}">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="builds">
              <div class="build-sub">
                <div class="tree-label" data-r="treeLabel">EHITUSPUU: HQ</div>
                <div class="tree-hint" data-r="treeHint">Vali HQ või juhtimiskeskus — avab haru.</div>
                <button data-upgrade-producer hidden>Uuenda tootjat</button>
                <button data-upgrade-supply hidden>Uuenda varustusladu</button>
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
    this.buttons.forEach((b) => b.addEventListener("click", () => {
      const pid = b.dataset.producerId ? Number(b.dataset.producerId) : undefined;
      this.onProduce(b.dataset.kind as UnitKind, pid);
    }));
    // build buttons are rebound each frame from availableBuilds()
    root.querySelector<HTMLButtonElement>("button[data-upgrade-producer]")?.addEventListener("click",()=>this.onUpgradeProducer([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-upgrade-supply]")?.addEventListener("click",()=>this.onUpgradeSupply([...this.selectedIds]));
    root.querySelector<HTMLButtonElement>("button[data-cancel-produce]")?.addEventListener("click", () => {
      if (this.selectedProducerId != null) this.onCancelProduce(this.selectedProducerId);
    });
    root.querySelector('[data-action="pause"]')?.addEventListener("click", () => this.onPause());
    root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.onSave());
    root.querySelector('[data-action="load"]')?.addEventListener("click", () => this.onLoad());
    root.querySelector('[data-action="settings"]')?.addEventListener("click", () => this.onSettings());
    root.querySelectorAll<HTMLButtonElement>("button[data-stance]").forEach((b) => {
      b.addEventListener("click", () => {
        const mode = b.dataset.stance as "attack" | "hold" | "patrol";
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
    root.querySelectorAll<HTMLButtonElement>("button.tab[data-tab]").forEach((b) => {
      b.addEventListener("click", () => {
        const tab = b.dataset.tab as "land" | "air" | "sea" | "builds";
        this.activeTab = tab;
        root.querySelectorAll("button.tab").forEach((t) => t.classList.toggle("active", (t as HTMLButtonElement).dataset.tab === tab));
        root.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", (p as HTMLElement).dataset.panel === tab));
      });
    });
  }

  getBuildButtons(): HTMLButtonElement[] { return [...document.querySelectorAll<HTMLButtonElement>("button[data-build]")]; }

  setFps(n: number): void { this.el.fps.textContent = n + " fps"; }
  setWarning(text: string): void { this.el.warning.textContent = text; }
  setNetworkStatus(text: string): void { this.el.net.textContent = text; }
  setPaused(paused: boolean): void { if (this.pauseButton) this.pauseButton.textContent = paused ? "Jätka" : "Paus"; }

  update(world: World, selection: ReadonlySet<number>, running: boolean, objectives: readonly { title: string; description: string; complete: boolean; progress: number }[] = [], missionMessage = ""): void {
    this.selectedIds = [...selection];
    this.el.cr.textContent = String(Math.floor(world.credits));
    this.el.clock.textContent = fmt(world.time);
    this.el.res.textContent = String(Math.floor(world.resources));
    if (this.el.morale) this.el.morale.textContent = String(Math.round(world.teamMorale[world.playerTeam]));
    if (this.el.control) this.el.control.textContent = String(Math.round(world.areaControl[world.playerTeam]));
    if (this.el.airstatus) { const a=world.airbaseStatus(world.playerTeam), s=world.supplyDepotStatus(world.playerTeam); this.el.airstatus.textContent = `Õhk ${a.aircraft}/${a.capacity} · Helid ${s.active}/${s.depots} · tase ${s.level}`; }
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
    this.el.warning.textContent = ps.use > ps.supply ? `⚠ ENERGIA PUUDU — tootmine aeglustub` : (route.total > 0 && route.connected < route.total ? `⚠ LOGISTIKA KATKI — ${route.total - route.connected} ladu ühendamata` : "");
    if (objectives.length) {
      this.el.objectiveList.innerHTML = objectives.map((o) => `<div class="objective ${o.complete ? "done" : ""}"><span>${o.complete ? "✓" : "○"} ${o.title}</span>${o.complete ? "" : `<i style="width:${Math.round(o.progress * 100)}%"></i>`}</div>`).join("");
    }
    this.el.missionMsg.textContent = missionMessage;
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
        || !has(pKind);
    }
    this.refreshBuildPanel(world, selection, running, engineerSelected);
    (this.el.qbar as HTMLElement).style.width = q.length ? Math.min(100, (world.queueProgress / UNITS[q[0]].buildTime) * 100) + "%" : "0";
    if (selectedProducer) {
      const pre = selectedProducer.preDeployOrder;
      const preTxt = pre ? ` · Pre-deploy: ${pre.mode}${pre.x != null ? " @ kaardil" : ""}` : "";
      const rallyTxt = selectedProducer.rallyPoint ? " · Rally seatud" : "";
      this.el.qtxt.textContent =
        (q.length ? "Ehitamisel: " + world.unitDisplayName(q[0]) + (q.length > 1 ? ` (+${q.length - 1})` : "") : "Järjekord tühi") +
        ` · Tase ${world.producerLevel(selectedProducer)}` + rallyTxt + preTxt +
        " · Shift+parem: pre-deploy siht";
    } else {
      this.el.qtxt.textContent = this.activeTab === "builds"
        ? "Vali insener + ehita (BUILDS)"
        : "Tooda üksusi — vajad vastavat tootmishoonet";
    }
    if (this.el.predeployBar) {
      this.el.predeployBar.hidden = !selectedProducer;
    }
    const producerUpgrade = rootButton(this, "button[data-upgrade-producer]");
    if (producerUpgrade) { producerUpgrade.hidden=!selectedProducer; producerUpgrade.textContent=selectedProducer?.upgrading ? `Uuendamine… ${Math.ceil((selectedProducer.upgradeTime??10)-(selectedProducer.upgradeProgress??0))}s` : (selectedProducer && world.producerLevel(selectedProducer)>=2 ? "Tootja MAX" : "Uuenda tootjat (260) + ehitusaeg"); producerUpgrade.disabled=!running||!selectedProducer||!!selectedProducer.upgrading||!world.canUpgradeProducer(selectedProducer)||world.resources<260||world.credits<260; }
    const selectedBranch = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && ["hq","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy","combatEngineer","supply"].includes(e.kind));
    const branchKind = selectedBranch?.kind ?? "hq";
    const allowedBuilds = new Set(world.availableBuilds(world.playerTeam, branchKind));
    const treeLabel = rootButton(this, "[data-r=treeLabel]");
    if (treeLabel) treeLabel.textContent = `EHITUSPUU: ${branchKind === "hq" ? "HQ" : (selectedBranch?.def.name ?? branchKind)}`;
    this.getBuildButtons().forEach((b)=>{const kind=b.dataset.build as any;const cost=buildCosts[b.dataset.build||""]??999;const visible=allowedBuilds.has(kind);b.style.display=visible?"":"none";b.disabled=!running||!engineerSelected||world.resources<cost||world.credits<cost||!world.canBuildKind(world.playerTeam,kind);});
    const supplyDepot = [...selection].map(id=>world.byId.get(id)).find(e=>e && !e.dead && e.team===world.playerTeam && e.kind==="supply");
    const supplyButton = rootButton(this, "button[data-upgrade-supply]");
    if (supplyButton) { const st=world.supplyDepotStatus(world.playerTeam); supplyButton.hidden=!supplyDepot; supplyButton.textContent=st.level>=3 ? "Varustusladu MAX" : `Uuenda varustusladu (${180 + st.level*120}) · tase ${st.level+1}/3`; supplyButton.disabled=!running||!supplyDepot||st.level>=3||world.resources<(180+st.level*120)||world.credits<(180+st.level*120); }

    const sel = [...selection].map((id) => world.byId.get(id)).filter((e) => e && !e.dead);
    if (!sel.length) {
      this.el.selT.textContent = "Üksusi pole valitud";
      this.el.selP.textContent = "Vali üksusi hiire vasaku nupuga või tõmba kast.";
    } else if (sel.length === 1) {
      const u = sel[0]!;
      this.el.selT.textContent = world.unitDisplayName(u.kind, u.team);
      const disabled = (u.disabledUntil ?? 0) > world.time ? ` · SABOTEERITUD ${Math.ceil((u.disabledUntil! - world.time))}s` : "";
      const logistics = u.kind === "transport" ? (u.supplyDepotId != null ? ` · VARUSTUSHELIKOPTER · Last ${Math.floor(u.cargo)} · ${u.logisticsPhase}` : ` · TRANSPORT · Reisijad ${u.cargoUnitIds.length}/8`) : (u.loadedIntoId !== null ? " · Transpordis" : "");
      const veterancy = u.veteran > 0 ? ` · Veteran ${u.veteran}★ · XP ${u.xp}` : ` · XP ${u.xp}`;
      const fuel = (u.maxFuel ?? 0) > 0 ? ` · Kütus ${Math.floor(u.fuel ?? 0)}/${u.maxFuel} · laskemoon ${Math.floor(u.ammo ?? 0)}/${u.maxAmmo}` : "";
      const supply = u.def.speed > 0 ? ` · Varustus ${Math.floor(u.supply ?? 100)}/${u.maxSupply ?? 100}` : "";
      const sector = (u.kind === "bunker" || u.kind === "aa") ? ` · Tulesektor ${Math.round(u.firingArc * 180 / Math.PI)}°` : u.kind === "artillery" ? ` · Kaudtuli ${Math.round(u.firingRange)} · laskemoon ${Math.floor(u.ammo ?? 0)}/${u.maxAmmo ?? 0}` : "";
      this.el.selP.innerHTML = `Elud ${Math.ceil(u.hp)} / ${u.def.hp}` + (u.def.damage ? ` · Tugevus ${u.def.damage} · Ulatus ${u.def.range}` : "") + veterancy + supply + fuel + sector + logistics + disabled +
        `<div class="hpbar"><i style="width:${(u.hp / u.def.hp) * 100}%"></i></div>`;
    } else {
      const c: Record<string, number> = {};
      sel.forEach((u) => { const n = world.unitDisplayName(u!.kind, u!.team); c[n] = (c[n] || 0) + 1; });
      this.el.selT.textContent = sel.length + " üksust";
      this.el.selP.textContent = Object.entries(c).map(([k, v]) => `${v} × ${k}`).join(", ");
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
    host.innerHTML = list.map((kind) => {
      const cost = BUILD_COSTS[kind] ?? 0;
      const label = BUILD_LABELS[kind] ?? kind;
      const unlocked = available.includes(kind as import("../sim/buildings").BuildableKind);
      let reason = "";
      if (!unlocked) {
        if (kind !== "generator" && !world.hasBuilding(world.playerTeam, "generator")) reason = "Vajab generaatorit";
        else if (BUILDINGS_REQ[kind]) {
          const req = BUILDINGS_REQ[kind]!;
          if (!world.hasBuilding(world.playerTeam, req)) reason = `Vajab: ${BUILD_LABELS[req] ?? req}`;
        }
        if (!reason && power.ratio <= 0.01 && kind !== "generator" && kind !== "supply") reason = "Pole energiat";
        if (!reason) reason = "Lukus";
      } else if (world.resources < cost || world.credits < cost) reason = "Puudub ressurss";
      else if (!hasEngineer) reason = "Vajab inseneri";
      const disabled = !running || !unlocked || world.resources < cost || world.credits < cost || !hasEngineer;
      return `<button data-build="${kind}" ${disabled ? "disabled" : ""} title="${reason || label}"><span>${label}</span><span class="unit-cost">${cost}</span>${reason && disabled ? `<small class="lock-reason">${reason}</small>` : ""}</button>`;
    }).join("");
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
    for(const mission of missions){const b=document.createElement("button");b.className="mission-choice";b.innerHTML=`<span>${mission.name}</span><small>${completed.has(mission.id)?"LÕPETATUD":mission.map.name}</small>`;b.onclick=()=>{this.el.screen.hidden=true;onSelect(mission)};list.appendChild(b)} card.appendChild(list);
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
    for(const m of missions){
      const b=document.createElement("button"); b.className="mission-choice";
      b.innerHTML=`<span>${m.map.name}</span><small>${m.map.theme.toUpperCase()} · ${FACTIONS[this.selectedFaction].short}</small>`;
      b.onclick=()=>{const d=(prompt("AI raskus: easy / normal / hard","normal")||"normal").toLowerCase() as "easy"|"normal"|"hard";this.el.screen.hidden=true;this.onFaction(this.selectedFaction);this.onSkirmish(m,(d==="easy"||d==="hard")?d:"normal")};
      list.appendChild(b);
    }
    card.appendChild(list);
  }

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

  showResult(status: "won" | "lost", time: number): void {
    this.screen(status === "won" ? "Võit" : "Kaotus",
      (status === "won" ? "Vaenlase komandopunkt on hävitatud." : "Sinu komandopunkt langes.") + " Aeg: " + fmt(time) + ".",
      "Mängi uuesti", () => location.reload());
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

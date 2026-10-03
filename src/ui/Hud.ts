import "./hud.css";
import type { World } from "../sim/World";
import type { MissionDef } from "../sim/types";
import type { UnitKind } from "../sim/types";
import { UNITS } from "../sim/units";
import { MAX_QUEUE } from "../sim/constants";

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const unitIcon = (k: UnitKind): string => {
  const icons: Partial<Record<UnitKind, string>> = {
    inf: "⚔", engineer: "🔧", special: "★", tank: "▣", artillery: "⌖",
    heli: "✈", transport: "⇪", gunship: "⚡", fighter: "▲",
    destroyer: "⚓", submarine: "◎", landingcraft: "▭",
  };
  return icons[k] ?? "•";
};
const rootButton = (_hud: Hud, selector: string) => document.querySelector<HTMLButtonElement>(selector);

/** HTML/CSS HUD: ressursid, valiku info, tootmispaneel, minikaardi konteiner, alustus-/lõpuekraan. */
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
  onCancelProduce: (producerId: number) => void = () => {};
  onMultiplayer: (mission: MissionDef, room?: string) => void = () => {};
  onSkirmish: (mission: MissionDef, difficulty: "easy"|"normal"|"hard") => void = () => {};
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
          <div class="res-row"><span class="res-label">ENERGIA</span><b data-r="power">0/0</b></div>
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
              ${(["inf", "engineer", "special", "tank", "artillery"] as UnitKind[]).map((k) => {
                const producer = ["inf","engineer","special"].includes(k) ? "barracks" : "factory";
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="${producer}" data-tab-unit="land"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="air">
              ${(["heli", "transport", "gunship", "fighter"] as UnitKind[]).map((k) => {
                const producer = k === "fighter" ? "airbase" : "helipad";
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="${producer}" data-tab-unit="air"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="sea">
              ${(["destroyer", "submarine", "landingcraft"] as UnitKind[]).map((k) => {
                return `<button class="unit-btn" title="Tooda ${UNITS[k].name} (${UNITS[k].cost})" data-kind="${k}" data-producer="shipyard" data-tab-unit="sea"><span class="unit-icon">${unitIcon(k)}</span><span class="unit-name">${UNITS[k].name}</span><span class="unit-cost">${UNITS[k].cost}</span></button>`;
              }).join("")}
            </div>
            <div class="tab-panel" data-panel="builds">
              <div class="build-sub">
                <div class="tree-label" data-r="treeLabel">EHITUSPUU: HQ</div>
                <button data-upgrade-producer hidden>Uuenda tootjat</button>
                <button data-upgrade-supply hidden>Uuenda varustusladu</button>
                <button data-cancel-produce hidden title="Tühista viimane (75% tagasi)">Tühista viimane</button>
                <button data-build="generator">Generaator <span>140</span></button>
                <button data-build="barracks">Kasarmu <span>160</span></button>
                <button data-build="factory">Sõidukitehas <span>220</span></button>
                <button data-build="helipad">Helikopteribaas <span>200</span></button>
                <button data-build="airbase">Lennuväli <span>320</span></button>
                <button data-build="refinery">Rafineerimistehas <span>180</span></button>
                <button data-build="supply">Varustusladu <span>130</span></button>
                <button data-build="radar">Radar <span>190</span></button>
                <button data-build="bunker">Punker <span>120</span></button>
                <button data-build="aa">Õhutõrje <span>160</span></button>
                <button data-build="shipyard">Laevatehas <span>360</span></button>
                <button data-build="landCommand">Maa juhtimiskeskus <span>100</span></button>
                <button data-build="airCommand">Õhu juhtimiskeskus <span>120</span></button>
                <button data-build="seaCommand">Mere juhtimiskeskus <span>120</span></button>
                <button data-build="combatEngineer">Insenerikeskus <span>150</span></button>
                <button data-build="landStrategy">Maa strateegiakeskus <span>240</span></button>
                <button data-build="airStrategy">Õhu strateegiakeskus <span>260</span></button>
                <button data-build="seaStrategy">Mere strateegiakeskus <span>260</span></button>
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
    root.querySelectorAll<HTMLButtonElement>("button[data-build]").forEach(b=>b.addEventListener("click",()=>this.onBuild(b.dataset.build as "barracks"|"factory"|"helipad"|"airbase"|"refinery"|"supply"|"radar"|"bunker"|"aa"|"generator"|"shipyard"|"landCommand"|"airCommand"|"seaCommand"|"combatEngineer"|"landStrategy"|"airStrategy"|"seaStrategy")));
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
      this.el.power.textContent = `${Math.floor(ps.supply)}/${Math.floor(ps.use)}`;
      this.el.power.classList.toggle("power-low", ps.use > ps.supply);
    }
    this.el.warning.textContent = ps.use > ps.supply ? `⚠ ENERGIA PUUDU — tootmine aeglustub` : "";
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
    this.buttons.forEach((b) => {
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
    const buildCosts: Record<string,number>={generator:140,barracks:160,factory:220,helipad:200,airbase:320,refinery:180,supply:130,radar:190,bunker:120,aa:160,shipyard:360,landCommand:100,airCommand:120,seaCommand:120,combatEngineer:150,landStrategy:240,airStrategy:260,seaStrategy:260};
    for (const b of this.buttons) {
      const kind = b.dataset.kind as UnitKind;
      const cost = UNITS[kind].cost;
      const pKind = b.dataset.producer as "barracks"|"factory"|"helipad"|"airbase"|"shipyard";
      const prod = findProducer(pKind);
      const queueFull = (prod?.productionQueue.length ?? 0) >= MAX_QUEUE;
      b.disabled = !running || !hq || hq.dead || !prod || queueFull
        || world.resources < cost || world.credits < cost
        || !has(pKind);
    }
    (this.el.qbar as HTMLElement).style.width = q.length ? Math.min(100, (world.queueProgress / UNITS[q[0]].buildTime) * 100) + "%" : "0";
    if (selectedProducer) {
      const pre = selectedProducer.preDeployOrder;
      const preTxt = pre ? ` · Pre-deploy: ${pre.mode}${pre.x != null ? " @ kaardil" : ""}` : "";
      const rallyTxt = selectedProducer.rallyPoint ? " · Rally seatud" : "";
      this.el.qtxt.textContent =
        (q.length ? "Ehitamisel: " + UNITS[q[0]].name + (q.length > 1 ? ` (+${q.length - 1})` : "") : "Järjekord tühi") +
        ` · Tase ${world.producerLevel(selectedProducer)}` + rallyTxt + preTxt +
        " · Shift+parem: pre-deploy";
    } else {
      this.el.qtxt.textContent = this.activeTab === "builds"
        ? "Vali insener + ehita (BUILDS)"
        : "Tooda üksusi — vajad vastavat tootmishoonet";
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
      this.el.selT.textContent = u.def.name;
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
      sel.forEach((u) => (c[u!.def.name] = (c[u!.def.name] || 0) + 1));
      this.el.selT.textContent = sel.length + " üksust";
      this.el.selP.textContent = Object.entries(c).map(([k, v]) => `${v} × ${k}`).join(", ");
    }
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
    this.el.scrT.textContent="SKIRMISH"; this.el.scrP.textContent="Vali kaart ja AI raskus. Alustad HQ + 2 inseneriga. Ehita generaator ja varustusladu — logistikahelikopterid toovad automaatselt varustust. Laienda, tooda armee ja hävita vaenlase HQ.";
    const list=document.createElement("div"); list.className="mission-list";
    for(const m of missions){const b=document.createElement("button");b.className="mission-choice";b.innerHTML=`<span>${m.map.name}</span><small>${m.map.theme.toUpperCase()}</small>`;b.onclick=()=>{const d=(prompt("AI raskus: easy / normal / hard","normal")||"normal").toLowerCase() as "easy"|"normal"|"hard";this.el.screen.hidden=true;this.onSkirmish(m,(d==="easy"||d==="hard")?d:"normal")};list.appendChild(b)} card.appendChild(list);
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

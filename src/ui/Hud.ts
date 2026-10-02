import "./hud.css";
import type { World } from "../sim/World";
import type { MissionDef } from "../sim/types";
import type { UnitKind } from "../sim/types";
import { UNITS } from "../sim/units";
import { MAX_QUEUE } from "../sim/constants";

const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

/** HTML/CSS HUD: ressursid, valiku info, tootmispaneel, minikaardi konteiner, alustus-/lõpuekraan. */
export class Hud {
  readonly minimapCanvas: HTMLCanvasElement;
  onProduce: (kind: UnitKind) => void = () => {};
  onPause: () => void = () => {};
  onSettings: () => void = () => {};
  onSave: () => void = () => {};
  onLoad: () => void = () => {};
  onMultiplayer: (mission: MissionDef, room?: string) => void = () => {};
  private el: Record<string, HTMLElement> = {};
  private buttons: HTMLButtonElement[] = [];
  private pauseButton: HTMLButtonElement | null = null;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <header class="top">
        <div class="panel brand">Rogue Front<small>Kampaania · <span data-r="fps">-- fps</span> · <span data-r="net">üksikmäng</span></small></div>
        <div class="panel obj"><b data-r="missionName">Missioon</b><div data-r="objectiveList">Vali missioon.</div><div class="mission-msg" data-r="missionMsg"></div><div class="warning" data-r="warning"></div></div>
        <div class="panel controls"><button data-action="pause">Paus</button><button data-action="save">Salvesta</button><button data-action="load">Lae</button><button data-action="settings">Seaded</button></div><div class="panel stat">Krediit<b data-r="cr">0</b><small>Ressurss <span data-r="res">0</span></small><span data-r="clock">0:00</span></div>
      </header>
      <footer class="bottom">
        <canvas class="mini" width="176" height="176"></canvas>
        <div class="panel sel">
          <h3 data-r="selT"></h3><p data-r="selP"></p>
          <div class="help">Vasak hiir: vali (topeltklõps: sama tüüp) · Parem hiir: liigu / ründa · A+parem: ründeliikumine · H: hoia · P: patrull · WASD või nooled: kaamera · Q/E: pööra · Rull: suum · X: peata · Ctrl+1…9: grupp</div>
        </div>
        <div class="panel build">
          ${(["tank", "inf", "engineer", "heli", "fighter"] as UnitKind[]).map((k) => `<button title="Tooda ${UNITS[k].name} (${UNITS[k].cost} krediiti)" data-kind="${k}">${UNITS[k].name} <span>${UNITS[k].cost}</span></button>`).join("")}
          <div class="qbar"><i data-r="qbar"></i></div><div class="qtxt" data-r="qtxt"></div>
        </div>
      </footer>
      <div class="screen" data-r="screen" hidden><div class="card"><h1 data-r="scrT"></h1><p data-r="scrP"></p><button data-r="scrB"></button></div></div>`;
    root.querySelectorAll<HTMLElement>("[data-r]").forEach((n) => (this.el[n.dataset.r!] = n));
    this.minimapCanvas = root.querySelector(".mini") as HTMLCanvasElement;
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>("button[data-kind]")];
    this.pauseButton = root.querySelector<HTMLButtonElement>('[data-action="pause"]');
    this.buttons.forEach((b) => b.addEventListener("click", () => this.onProduce(b.dataset.kind as UnitKind)));
    root.querySelector('[data-action="pause"]')?.addEventListener("click", () => this.onPause());
    root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.onSave());
    root.querySelector('[data-action="load"]')?.addEventListener("click", () => this.onLoad());
    root.querySelector('[data-action="settings"]')?.addEventListener("click", () => this.onSettings());
  }

  setFps(n: number): void { this.el.fps.textContent = n + " fps"; }
  setWarning(text: string): void { this.el.warning.textContent = text; }
  setNetworkStatus(text: string): void { this.el.net.textContent = text; }
  setPaused(paused: boolean): void { if (this.pauseButton) this.pauseButton.textContent = paused ? "Jätka" : "Paus"; }

  update(world: World, selection: ReadonlySet<number>, running: boolean, objectives: readonly { title: string; description: string; complete: boolean; progress: number }[] = [], missionMessage = ""): void {
    this.el.cr.textContent = String(Math.floor(world.credits));
    this.el.clock.textContent = fmt(world.time);
    this.el.res.textContent = String(Math.floor(world.resources));
    if (objectives.length) {
      this.el.objectiveList.innerHTML = objectives.map((o) => `<div class="objective ${o.complete ? "done" : ""}"><span>${o.complete ? "✓" : "○"} ${o.title}</span>${o.complete ? "" : `<i style="width:${Math.round(o.progress * 100)}%"></i>`}</div>`).join("");
    }
    this.el.missionMsg.textContent = missionMessage;
    const hq = world.hq[0], q = world.queue;
    for (const b of this.buttons)
      b.disabled = !running || !hq || hq.dead || world.credits < UNITS[b.dataset.kind as UnitKind].cost || q.length >= MAX_QUEUE;
    (this.el.qbar as HTMLElement).style.width = q.length ? Math.min(100, (world.queueProgress / UNITS[q[0]].buildTime) * 100) + "%" : "0";
    this.el.qtxt.textContent = q.length ? "Ehitamisel: " + UNITS[q[0]].name + (q.length > 1 ? ` (+${q.length - 1})` : "") : "Järjekord tühi";

    const sel = [...selection].map((id) => world.byId.get(id)).filter((e) => e && !e.dead);
    if (!sel.length) {
      this.el.selT.textContent = "Üksusi pole valitud";
      this.el.selP.textContent = "Vali üksusi hiire vasaku nupuga või tõmba kast.";
    } else if (sel.length === 1) {
      const u = sel[0]!;
      this.el.selT.textContent = u.def.name;
      this.el.selP.innerHTML = `Elud ${Math.ceil(u.hp)} / ${u.def.hp}` + (u.def.damage ? ` · Tugevus ${u.def.damage} · Ulatus ${u.def.range}` : "") +
        `<div class="hpbar"><i style="width:${(u.hp / u.def.hp) * 100}%"></i></div>`;
    } else {
      const c: Record<string, number> = {};
      sel.forEach((u) => (c[u!.def.name] = (c[u!.def.name] || 0) + 1));
      this.el.selT.textContent = sel.length + " üksust";
      this.el.selP.textContent = Object.entries(c).map(([k, v]) => `${v} × ${k}`).join(", ");
    }
  }

  showMissionSelect(missions: readonly MissionDef[], completed: ReadonlySet<string>, onSelect: (mission: MissionDef) => void): void {
    this.el.scrT.textContent = "Kampaania";
    this.el.scrP.textContent = "Vali operatsioon. Edenemine salvestatakse sellesse brauserisse.";
    const old = this.el.scrB;
    old.hidden = true;
    const card = old.parentElement!;
    card.querySelectorAll(".mission-list").forEach((n) => n.remove());
    const list = document.createElement("div");
    list.className = "mission-list";
    const mp = document.createElement("button");
    mp.className = "mission-choice";
    mp.innerHTML = "<span>Mitmikmäng 1v1</span><small>LAN / internet · WebSocket lockstep</small>";
    mp.onclick = () => { const room = prompt("Lobby nimi (nt ALPHA-01):", "ALPHA-01")?.trim(); if (room) this.el.screen.hidden = true, this.onMultiplayer(missions[0]!, room); };
    card.appendChild(mp);
    for (const mission of missions) {
      const b = document.createElement("button");
      b.className = "mission-choice";
      b.innerHTML = `<span>${mission.name}</span><small>${completed.has(mission.id) ? "LÕPETATUD" : mission.map.name}</small>`;
      b.onclick = () => { this.el.screen.hidden = true; onSelect(mission); };
      list.appendChild(b);
    }
    card.appendChild(list);
    this.el.screen.hidden = false;
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

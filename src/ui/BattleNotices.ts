import type { World } from "../sim/World";
import type { SimEvent } from "../sim/types";
import { maxHitPoints } from "../sim/unitStats";

export interface BattleNotice {
  id: number;
  key: string;
  text: string;
  tone: "danger" | "warn" | "good";
  time: number;
  x?: number;
  z?: number;
  count: number;
  read: boolean;
}
type NoticeInput = Omit<BattleNotice, "id" | "count" | "read">;
type NoticeWorld = Pick<World, "time" | "playerTeam" | "entities" | "byId" | "vision" | "unitDisplayName" | "resourcePoints">;
const priority = { danger: 2, warn: 1, good: 0 };

/** Presentation history only: never consumes commands, changes units or runs on the audio clock. */
export class BattleNoticeLog {
  readonly entries: BattleNotice[] = [];
  revision = 0;
  private nextId = 1;
  private previousHp = new Map<number, number>();
  private previousOwners: Array<number | null | undefined> | null = null;
  private nextScan = 0;
  private lastTime = -1;
  private team = -1;

  reset(): void {
    this.entries.length = 0;
    this.previousHp.clear();
    this.previousOwners = null;
    this.nextScan = 0;
    this.lastTime = -1;
    this.team = -1;
    this.revision++;
  }

  add(input: NoticeInput, countRepeats = false): void {
    const recent = this.entries.find(n => n.key === input.key && n.tone === input.tone &&
      input.time - n.time >= 0 && input.time - n.time < 10 &&
      (n.x === undefined ? input.x === undefined : input.x !== undefined &&
        Math.hypot(n.x - input.x, n.z! - input.z!) < 80));
    if (recent) {
      Object.assign(recent, input, { read: false });
      if (countRepeats) recent.count++;
      this.entries.splice(this.entries.indexOf(recent), 1);
      this.entries.unshift(recent);
    } else {
      this.entries.unshift({ ...input, id: this.nextId++, count: 1, read: false });
      if (this.entries.length > 24) this.entries.pop();
    }
    this.revision++;
  }

  acknowledge(id: number): BattleNotice | undefined {
    const notice = this.entries.find(n => n.id === id);
    if (notice) { notice.read = true; this.revision++; }
    return notice;
  }

  visible(time: number, history = false): BattleNotice[] {
    const entries = this.entries.filter(n => history || time - n.time <= 14);
    return entries.sort((a, b) => history ? b.time - a.time || b.id - a.id :
      Number(a.read) - Number(b.read) || priority[b.tone] - priority[a.tone] || b.time - a.time || b.id - a.id)
      .slice(0, history ? 24 : 4);
  }

  update(world: NoticeWorld, events: readonly SimEvent[]): void {
    if (world.time < this.lastTime || world.playerTeam !== this.team) this.reset();
    this.team = world.playerTeam;
    this.lastTime = world.time;
    const time = world.time;
    const name = (id: number) => { const unit = world.byId.get(id); return unit ? world.unitDisplayName(unit.kind, unit.team) : "Üksus"; };
    for (const event of events) {
      if (event.type === "strategic-launch") {
        const own = event.team === world.playerTeam;
        // The launch warning is public; an unseen enemy launch site is not.
        const located = own || world.vision.isVisible(world.playerTeam, event.x, event.z);
        this.add({ key: `launch:${event.team}:${event.payload}`, tone: own ? "warn" : "danger", time,
          text: `${own ? "Oma" : "Vaenlase"} ${event.payload === "nuclear" ? "tuumaraketi start" : "raketi start"}`,
          ...(located ? { x: event.x, z: event.z } : {}) });
      } else if ("team" in event && event.team === world.playerTeam) {
        const point = { time, x: event.x, z: event.z };
        if (event.type === "air-fuel-warning") this.add({ ...point, key: `fuel:${event.unitId}`,
          tone: event.emergency ? "danger" : "warn", text: `${name(event.unitId)} · ${event.emergency ? "Hädamaandumine: kütus alla 5%" : "Kütus alla 15%: naase baasi"}` });
        else if (event.type === "unit-serviced") this.add({ ...point, key: "service", tone: "good", text: "Teenindatud ja valmis" }, true);
        else if (event.type === "build-complete") this.add({ ...point, key: `built:${event.kind}`, tone: "good", text: `${world.unitDisplayName(event.kind, event.team)} · Valmis` }, true);
        else if (event.type === "death") this.add({ ...point, key: `loss:${event.kind ?? "unit"}`, tone: "danger", text: event.kind === "hq" ? "Peamaja hävinud" : event.kind ? `${world.unitDisplayName(event.kind, event.team)} · Hävinud` : "Oma üksus kaotatud" }, true);
        else if (event.type === "order-rejected") this.add({ ...point, key: `rejected:${event.message}`, tone: "warn", text: event.message });
      }
    }
    // One bounded history, one own-unit scan at 5 Hz; no enemy positions or attack attribution.
    if (time >= this.nextScan) {
      this.nextScan = time + .2;
      const hp = new Map<number, number>();
      for (const unit of world.entities) {
        if (unit.dead || unit.team !== world.playerTeam || unit.underConstruction || unit.loadedIntoId !== null) continue;
        hp.set(unit.id, unit.hp);
        const previous = this.previousHp.get(unit.id);
        if (previous !== undefined && unit.hp < previous) {
          const critical = unit.kind === "hq" && unit.hp < maxHitPoints(unit) * .35;
          this.add({ key: critical ? "hq-critical" : unit.def.building ? "base-attacked" : "under-attack", tone: critical ? "danger" : "warn",
            text: critical ? "Peamaja kriitilises seisus" : unit.def.building ? "Baasi rünnatakse" : "Üksused tule all", time, x: unit.x, z: unit.z });
        }
      }
      this.previousHp = hp;
      const previousOwners = this.previousOwners;
      this.previousOwners = world.resourcePoints.map(point => point.controlledBy);
      if (previousOwners?.length === world.resourcePoints.length) world.resourcePoints.forEach((point, index) => {
        const previous = previousOwners[index], owner = point.controlledBy;
        if (owner === previous || owner !== world.playerTeam && previous !== world.playerTeam) return;
        const won = owner === world.playerTeam;
        this.add({ key: `site:${index}:${won}`, time, x: point.x, z: point.z, tone: won ? "good" : "danger",
          text: `${point.label ?? "Ressursirajatis"} · ${won ? "Hõivatud" : "Kontroll kaotatud"}` });
      });
    }
  }
}

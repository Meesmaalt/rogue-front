import { BattleNoticeLog } from "./BattleNotices";
import "./battle-notices.css";

const symbols = { danger: "!", warn: "△", good: "✓" };
const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;

/** Small actionable feed; keyed buttons preserve keyboard focus during updates. */
export class BattleNoticesView {
  private readonly root = document.createElement("section");
  private readonly toggle = document.createElement("button");
  private readonly list = document.createElement("div");
  private readonly live = document.createElement("span");
  private readonly buttons = new Map<number, HTMLButtonElement>();
  private expanded = false;
  private revision = -1;
  private second = -1;

  constructor(private readonly log: BattleNoticeLog, private readonly onFocus: (x: number, z: number) => void, parent: HTMLElement) {
    this.root.className = "battle-notices";
    this.root.setAttribute("aria-label", "Lahinguteated");
    this.toggle.className = "battle-notices-toggle";
    this.toggle.type = "button";
    this.toggle.setAttribute("aria-expanded", "false");
    this.toggle.onclick = () => { this.expanded = !this.expanded; this.revision = -1; };
    this.list.id = "battle-notices-list";
    this.list.className = "battle-notices-list";
    this.toggle.setAttribute("aria-controls", this.list.id);
    this.live.className = "battle-notices-live";
    this.live.setAttribute("role", "status");
    this.live.setAttribute("aria-live", "polite");
    this.root.append(this.toggle, this.list, this.live);
    parent.appendChild(this.root);
  }

  sync(time: number, shown: boolean): void {
    const hidden = !shown || !this.log.entries.length;
    if (this.root.hidden !== hidden) this.root.hidden = hidden;
    if (this.revision === this.log.revision && this.second === Math.floor(time)) return;
    this.revision = this.log.revision;
    this.second = Math.floor(time);
    const unread = this.log.entries.filter(n => !n.read).length;
    this.toggle.textContent = `Lahinguteated${unread ? ` · ${unread}` : ""} ${this.expanded ? "▴" : "▾"}`;
    this.toggle.title = this.expanded ? "Peida ajalugu" : "Näita ajalugu";
    this.toggle.setAttribute("aria-expanded", String(this.expanded));
    this.root.classList.toggle("expanded", this.expanded);
    const visible = this.log.visible(time, this.expanded);
    const ids = new Set(visible.map(n => n.id));
    for (const [id, button] of this.buttons) if (!ids.has(id)) { button.remove(); this.buttons.delete(id); }
    visible.forEach((notice, index) => {
      let button = this.buttons.get(notice.id);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.onclick = () => {
          const current = this.log.acknowledge(notice.id);
          if (current?.x !== undefined && current.z !== undefined) this.onFocus(current.x, current.z);
        };
        this.buttons.set(notice.id, button);
      }
      button.className = `battle-notice ${notice.tone}${notice.read ? " read" : ""}`;
      const text = `${symbols[notice.tone]} ${clock(notice.time)} · ${notice.text}${notice.count > 1 ? ` ×${notice.count}` : ""}`;
      if (button.dataset.text !== text) { button.textContent = text; button.dataset.text = text; }
      button.title = notice.x === undefined ? "Märgi loetuks" : "Näita sündmuse asukohta";
      if (this.list.children[index] !== button) this.list.insertBefore(button, this.list.children[index] ?? null);
    });
    const latest = this.log.entries.reduce<(typeof this.log.entries)[number] | undefined>((a, b) => !a || b.time > a.time || b.time === a.time && b.id > a.id ? b : a, undefined);
    if (latest && this.live.dataset.notice !== String(latest.id)) {
      this.live.dataset.notice = String(latest.id);
      this.live.textContent = latest.text;
    }
  }
}

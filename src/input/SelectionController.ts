import type { World } from "../sim/World";
import type { Entity } from "../sim/types";
import type { Picker } from "./Picker";

export interface DragRect { x0: number; y0: number; x1: number; y1: number }

/** Valik: klõps, kast, shift, topeltklõps (sama tüüp), grupid Ctrl+1…9. */
export class SelectionController {
  readonly selected = new Set<number>();
  drag: DragRect | null = null;
  enabled = false;
  onFocus:(x:number,z:number)=>void=()=>{};
  private lastGroup={key:"",time:0};
  onInspectBuilding:(id:string)=>void=()=>{};
  private groups: Record<string, number[]> = {};
  private last = { t: 0, e: null as Entity | null };

  constructor(el: HTMLElement, private readonly world: World, private readonly picker: Picker) {
    el.addEventListener("mousedown", (e) => {
      if (this.enabled && e.button === 0) this.drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
    });
    addEventListener("mousemove", (e) => { if (this.drag) { this.drag.x1 = e.clientX; this.drag.y1 = e.clientY; } });
    addEventListener("mouseup", (e) => { if (e.button === 0 && this.drag) { const d = this.drag; this.drag = null; if(this.enabled)this.finish(d, e.shiftKey); } });
    addEventListener("blur",()=>{this.drag=null;});
    addEventListener("keydown", (e) => {
      if (!this.enabled || (e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable=true]")) || !/^[1-9]$/.test(e.key)) return;
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.groups[e.key] = [...this.selected]; }
      else if (this.groups[e.key]) {
        const units=this.groups[e.key].map(id=>this.world.byId.get(id)).filter((x):x is Entity=>!!x&&!x.dead&&x.loadedIntoId==null&&x.team===this.world.playerTeam);
        this.set(units,false);const now=performance.now();
        if(units.length&&this.lastGroup.key===e.key&&now-this.lastGroup.time<350)this.onFocus(units.reduce((v,u)=>v+u.x,0)/units.length,units.reduce((v,u)=>v+u.z,0)/units.length);
        this.lastGroup={key:e.key,time:now};
      }
    });
  }

  /** Eemalda surnud üksused valikust. */
  prune(): void {
    for (const id of this.selected) { const e = this.world.byId.get(id); if (!e || e.dead || e.loadedIntoId!=null || e.team!==this.world.playerTeam) this.selected.delete(id); }
  }

  private set(list: Entity[], add: boolean): void {
    if (!add) this.selected.clear();
    for (const e of list) this.selected.add(e.id);
  }

  private onScreen(e: Entity): boolean {
    const p = this.picker.entityScreen(e,1);
    return p.z < 1 && p.x > 0 && p.x < innerWidth && p.y > 0 && p.y < innerHeight;
  }

  private finish(d: DragRect, add: boolean): void {
    const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    if (w < 6 && h < 6) {
      const u = this.picker.pickEntity(d.x1, d.y1, this.world.playerTeam), now = performance.now();
      if (u) {
        if(add&&this.selected.has(u.id))this.selected.delete(u.id);
        else if (this.last.e && this.last.e.id === u.id && now - this.last.t < 350 && u.def.speed > 0)
          this.set(this.world.entities.filter((o) => !o.dead && o.loadedIntoId==null && o.team === this.world.playerTeam && o.kind === u.kind && this.onScreen(o)), add);
        else this.set([u],add);
        this.last = { t: now, e: u };
      } else if (!add) {this.selected.clear();const f=this.picker.pickGarrisonBuilding(d.x1,d.y1);if(f)this.onInspectBuilding(f.id);}
      return;
    }
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    this.set(this.world.entities.filter((u) => {
      if (u.dead || u.loadedIntoId!=null || u.team !== this.world.playerTeam || u.def.speed === 0) return false;
      const p = this.picker.entityScreen(u,u.def.height*.5);
      return p.z < 1 && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
    }), add);
  }
  selectedIds(): number[] { return [...this.selected]; }

  /** Select all player units of a domain filter. */
  selectFilter(pred: (e: Entity) => boolean, add = false): void {
    const list = this.world.entities.filter(e => !e.dead && e.loadedIntoId==null && e.team === this.world.playerTeam && e.def.speed > 0 && pred(e));
    this.set(list, add);
  }
}


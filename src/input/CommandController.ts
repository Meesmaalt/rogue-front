import type { World } from "../sim/World";
import type { Picker } from "./Picker";
import type { SelectionController } from "./SelectionController";
import type { Fx } from "../render/Fx";
import { loadSettings } from "../ui/Settings";

/** Hiir/klaviatuur → sim-käsud: parem hiir = liigu/ründa, X = peata. */
export class CommandController {
  enabled = false;
  attackMoveMode = false;

  constructor(
    el: HTMLElement,
    private readonly world: World,
    private readonly picker: Picker,
    private readonly selection: SelectionController,
    private readonly fx: Fx,
  ) {
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("mousedown", (e) => {
      if (!this.enabled || e.button !== 2) return;
      const enemy = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam === 0 ? 1 : 0);
      if (this.attackMoveMode && !enemy) { this.world.issue({ type: "amove", ids: this.ids(), x: this.picker.groundAt(e.clientX,e.clientY).x, z: this.picker.groundAt(e.clientX,e.clientY).z }); this.attackMoveMode = false; el.style.cursor = "crosshair"; return; }
      if (enemy) {
        this.world.issue({ type: "attack", ids: this.ids(), targetId: enemy.id });
        this.fx.ping(enemy.x, enemy.z, 0xe0553f);
      } else {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        this.moveTo(p.x, p.z);
      }
    });
    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      const k=e.key.toLowerCase(), keys = loadSettings().keys;
      if (k === keys.stop) this.world.issue({ type: "stop", ids: this.ids() });
      if (k === keys.attackMove) { this.attackMoveMode = true; el.style.cursor = "crosshair"; }
      if (k === keys.hold) this.world.issue({ type: "hold", ids: this.ids() });
      if (k === keys.patrol) { const q=this.picker.groundAt(innerWidth/2, innerHeight/2); this.world.issue({ type:"patrol", ids:this.ids(), x:q.x, z:q.z }); }
    });
  }

  moveTo(x: number, z: number): void {
    if (!this.enabled) return;
    this.world.issue({ type: "move", ids: this.ids(), x, z });
    this.fx.ping(x, z, 0xf2a33a);
  }

  private ids(): number[] {
    return [...this.selection.selected].filter((id) => {
      const e = this.world.byId.get(id);
      return e && e.team === this.world.playerTeam && e.def.speed > 0;
    });
  }
}

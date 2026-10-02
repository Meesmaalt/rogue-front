import type { World } from "../sim/World";
import type { Picker } from "./Picker";
import type { SelectionController } from "./SelectionController";
import type { Fx } from "../render/Fx";
import { BUILDINGS } from "../sim/buildings";
import type { BuildableKind } from "../sim/buildings";
import { loadSettings } from "../ui/Settings";

/** Hiir/klaviatuur → sim-käsud: parem hiir = liigu/ründa, X = peata. */
export class CommandController {
  enabled = false;
  attackMoveMode = false;
  buildMode: BuildableKind | null = null;
  buildRotation = 0;
  buildPoint: { x: number; z: number } | null = null;
  fireMissionMode = false;
  buildValid = false;

  constructor(
    el: HTMLElement,
    private readonly world: World,
    private readonly picker: Picker,
    private readonly selection: SelectionController,
    private readonly fx: Fx,
  ) {
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("mousemove", (e) => {
      if (!this.enabled || !this.buildMode) return;
      this.updateBuildPreview(e.clientX, e.clientY);
    });
    el.addEventListener("mousedown", (e) => {
      if (!this.enabled) return;
      if (this.buildMode && (e.button === 0 || e.button === 2)) {
        if (this.buildValid && this.buildPoint) {
          const selectedEngineer = this.selection.selectedIds().map(id=>this.world.byId.get(id)).find(u=>u && u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead);
          const hq = this.world.hq[this.world.playerTeam];
          const engineer = selectedEngineer ?? this.world.entities.filter(u=>u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead).sort((a,b)=>Math.hypot((a.x-(hq?.x ?? 0)),(a.z-(hq?.z ?? 0)))-Math.hypot((b.x-(hq?.x ?? 0)),(b.z-(hq?.z ?? 0))))[0];
          if (engineer) { this.world.issue({type:"build",ids:[engineer.id],kind:this.buildMode,x:this.buildPoint.x,z:this.buildPoint.z,rotation:this.buildRotation}); this.fx.ping(this.buildPoint.x,this.buildPoint.z,0xf2a33a); }
        }
        this.cancelBuild(el); return;
      }
      if (e.button !== 2) return;
      if (this.fireMissionMode) {
        const p = this.picker.groundAt(e.clientX,e.clientY);
        const ids = this.ids().filter(id => this.world.byId.get(id)?.kind === "artillery");
        if (ids.length) { this.world.issue({type:"fire-mission",ids,x:p.x,z:p.z}); this.fx.ping(p.x,p.z,0xff7a33); }
        this.fireMissionMode=false; el.style.cursor="crosshair"; return;
      }
      const friendly = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam);
      const selectedTransports = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && u.kind==="transport"; });
      if (friendly && selectedTransports.length && ["inf", "engineer"].includes(friendly.kind) && friendly.loadedIntoId === null) {
        this.world.issue({ type: "load", ids: selectedTransports, targetId: friendly.id });
        this.fx.ping(friendly.x, friendly.z, 0x55b7ff);
        return;
      }
      const engineers = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && u.kind==="engineer"; });
      if (friendly && friendly.def.speed === 0 && friendly.hp < friendly.def.hp && engineers.length) {
        this.world.issue({ type: "repair", ids: engineers, targetId: friendly.id });
        this.fx.ping(friendly.x, friendly.z, 0x66d9a0);
        return;
      }
      const enemy = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam === 0 ? 1 : 0);
      const rallyBuildings = this.selection.selectedIds().filter(id => {
        const b = this.world.byId.get(id);
        return !!b && !b.dead && !b.underConstruction && b.team === this.world.playerTeam && ["barracks", "factory", "helipad", "airbase"].includes(b.kind);
      });
      if (!enemy && rallyBuildings.length) {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        this.world.issue({ type: "rally", ids: rallyBuildings, x: p.x, z: p.z });
        this.fx.ping(p.x, p.z, 0x9b7cff);
        return;
      }
      if (this.attackMoveMode && !enemy) { this.world.issue({ type: "amove", ids: this.ids(), x: this.picker.groundAt(e.clientX,e.clientY).x, z: this.picker.groundAt(e.clientX,e.clientY).z }); this.attackMoveMode = false; el.style.cursor = "crosshair"; return; }
      if (enemy) {
        this.world.issue({ type: "attack", ids: this.ids(), targetId: enemy.id });
        this.fx.ping(enemy.x, enemy.z, 0xe0553f);
      } else {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        if (selectedTransports.length && selectedTransports.some(id => (this.world.byId.get(id)?.cargoUnitIds.length ?? 0) > 0)) {
          this.world.issue({ type: "unload", ids: selectedTransports, x: p.x, z: p.z });
          this.fx.ping(p.x, p.z, 0x55b7ff);
        } else this.moveTo(p.x, p.z);
      }
    });
    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      const k=e.key.toLowerCase(), keys = loadSettings().keys;
      if (k === keys.stop) this.world.issue({ type: "stop", ids: this.ids() });
      if (k === keys.attackMove) { this.attackMoveMode = true; el.style.cursor = "crosshair"; }
      if (k === keys.hold) this.world.issue({ type: "hold", ids: this.ids() });
      if (k === keys.patrol) { const q=this.picker.groundAt(innerWidth/2, innerHeight/2); this.world.issue({ type:"patrol", ids:this.ids(), x:q.x, z:q.z }); }
      if (k === "f") { const hasArtillery=this.ids().some(id=>this.world.byId.get(id)?.kind==="artillery"); if(hasArtillery){this.fireMissionMode=true;el.style.cursor="crosshair";} }
      if (this.buildMode && k === "r") { this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2); }
    });
  }

  startBuild(kind: BuildableKind): void { this.buildMode=kind; this.buildRotation=0; this.buildPoint=null; this.buildValid=false; }

  private updateBuildPreview(x: number, y: number): void {
    if (!this.buildMode) return;
    const p = this.picker.groundAt(x,y);
    const selectedEngineer = this.selection.selectedIds().map(id=>this.world.byId.get(id)).find(u=>u && u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead);
          const hq = this.world.hq[this.world.playerTeam];
          const engineer = selectedEngineer ?? this.world.entities.filter(u=>u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead).sort((a,b)=>Math.hypot((a.x-(hq?.x ?? 0)),(a.z-(hq?.z ?? 0)))-Math.hypot((b.x-(hq?.x ?? 0)),(b.z-(hq?.z ?? 0))))[0];
    const spec = BUILDINGS[this.buildMode];
    this.buildPoint = p;
    this.buildValid = !!engineer && this.world.resources >= spec.cost && this.world.credits >= spec.cost && this.world.canPlaceBuilding(this.world.playerTeam, this.buildMode, p.x, p.z);
  }

  private cancelBuild(el: HTMLElement): void { this.fireMissionMode=false; this.buildMode=null; this.buildPoint=null; this.buildValid=false; el.style.cursor="crosshair"; }

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

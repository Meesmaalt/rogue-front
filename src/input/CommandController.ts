import {transportCapacity,isPassenger} from "../sim/transport";
import {maxHitPoints} from "../sim/unitStats";
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
  fastMoveMode = false;
  unloadMode = false;
  garrisonFaceMode = false;
  buildMode: BuildableKind | null = null;
  buildRotation = 0;
  buildPoint: { x: number; z: number } | null = null;
  fireMissionMode = false;
  private logisticsOrder:{ids:number[];action:"source"|"route"}|null=null;
  private airOrder: {ids:number[];mission:"cap"|"strike"|"sead"|"ground"}|null=null;
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
        e.stopImmediatePropagation();e.preventDefault();
        if(e.button===2){this.cancelBuild(el);return;}
        this.updateBuildPreview(e.clientX,e.clientY);
        if (this.buildValid && this.buildPoint) {
          const selectedEngineer = this.selection.selectedIds().map(id=>this.world.byId.get(id)).find(u=>u && u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead);
          const hq = this.world.hq[this.world.playerTeam];
          const engineer = selectedEngineer ?? this.world.entities.filter(u=>u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead).sort((a,b)=>Math.hypot((a.x-(hq?.x ?? 0)),(a.z-(hq?.z ?? 0)))-Math.hypot((b.x-(hq?.x ?? 0)),(b.z-(hq?.z ?? 0))))[0];
          if (engineer) { this.world.issue({type:"build",ids:[engineer.id],kind:this.buildMode,x:this.buildPoint.x,z:this.buildPoint.z,rotation:this.buildRotation}); this.fx.ping(this.buildPoint.x,this.buildPoint.z,0xf2a33a);this.cancelBuild(el); }
        }
        return;
      }
      if (e.button !== 2) return;
      if(this.logisticsOrder){
        const p=this.picker.groundAt(e.clientX,e.clientY),order=this.logisticsOrder;
        if(order.action==="route")this.world.issue({type:"logistics-route",ids:order.ids,x:p.x,z:p.z,append:true});
        else {
          const index=this.world.resourcePoints.findIndex(r=>Math.hypot(r.x-p.x,r.z-p.z)<=r.radius+20&&(r.controlledBy===this.world.playerTeam||this.world.vision.isVisible(this.world.playerTeam,r.x,r.z)));
          if(index<0)return;
          this.world.issue({type:"logistics-source",ids:order.ids,sourceIndex:index});
        }
        this.fx.ping(p.x,p.z,0xa4d57c);this.logisticsOrder=null;return;
      }
      if (this.airOrder) {const p=this.picker.groundAt(e.clientX,e.clientY);this.world.issue({type:"air-mission",...this.airOrder,x:p.x,z:p.z});this.fx.ping(p.x,p.z,0x55b7ff);this.airOrder=null;return;}
      if (this.fireMissionMode) {
        const p = this.picker.groundAt(e.clientX,e.clientY);
        const ids = this.ids().filter(id => ["artillery","mortar","mlrs"].includes(this.world.byId.get(id)?.kind ?? ""));
        if (ids.length) { this.world.issue({type:"fire-mission",ids,x:p.x,z:p.z}); this.fx.ping(p.x,p.z,0xff7a33); }
        this.fireMissionMode=false; el.style.cursor="crosshair"; return;
      }
      if(this.garrisonFaceMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.world.issue({type:"face-building",ids:this.ids(),x:p.x,z:p.z});this.garrisonFaceMode=false;return;}
      if(this.fastMoveMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.moveTo(p.x,p.z,e.shiftKey);return;}
      if(this.unloadMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.exitAt(p.x,p.z);this.unloadMode=false;this.fx.ping(p.x,p.z,0x55b7ff);return;}
      const friendly = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam);
      const selectedTransports = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && (transportCapacity(u)>0||u.kind==="landingcraft"); });
      if (friendly && selectedTransports.length && isPassenger(friendly) && friendly.loadedIntoId === null) {
        this.world.issue({ type: "load", ids: selectedTransports, targetId: friendly.id });
        this.fx.ping(friendly.x, friendly.z, 0x55b7ff);
        return;
      }
      if(friendly&&transportCapacity(friendly)>0&&this.ids().some(id=>{const p=this.world.byId.get(id);return !!p&&isPassenger(p);})){this.world.issue({type:"load",ids:this.ids(),targetId:friendly.id});this.fx.ping(friendly.x,friendly.z,0x55b7ff);return;}
      const engineers = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && u.kind==="engineer"; });
      if (friendly && (friendly.hp < maxHitPoints(friendly) || (friendly.components && Object.values(friendly.components).some(v=>v>0))) && engineers.length) {
        this.world.issue({ type: "repair", ids: engineers, targetId: friendly.id });
        this.fx.ping(friendly.x, friendly.z, 0x66d9a0);
        return;
      }
      const enemy = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam === 0 ? 1 : 0);
      const rallyBuildings = this.selection.selectedIds().filter(id => {
        const b = this.world.byId.get(id);
        return !!b && !b.dead && !b.underConstruction && b.team === this.world.playerTeam &&
          ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(b.kind);
      });
      if (!enemy && rallyBuildings.length) {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        if (e.shiftKey) {
          // Shift+right-click on map with producer selected = pre-deploy (orders for units still in queue)
          this.world.issue({ type: "predeploy", ids: rallyBuildings, mode: "attack", x: p.x, z: p.z });
          this.fx.ping(p.x, p.z, 0xf2a33a);
        } else {
          this.world.issue({ type: "rally", ids: rallyBuildings, x: p.x, z: p.z });
          this.fx.ping(p.x, p.z, 0x9b7cff);
        }
        return;
      }
      if (this.attackMoveMode && !enemy) {const p=this.picker.groundAt(e.clientX,e.clientY);this.moveTo(p.x,p.z,e.shiftKey);return;}
      const house=this.picker.pickGarrisonBuilding(e.clientX,e.clientY);
      if(!enemy&&!this.attackMoveMode&&house&&this.ids().some(id=>{const u=this.world.byId.get(id);return !!u&&isPassenger(u);})){this.world.issue({type:"enter-building",ids:this.ids(),featureId:house.id});this.fx.ping(house.x,house.z,0x9bc98d);return;}
      if (enemy) {
        this.world.issue({ type: "attack", ids: this.ids(), targetId: enemy.id });
        this.fx.ping(enemy.x, enemy.z, 0xe0553f);
      } else {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        this.moveTo(p.x, p.z, e.shiftKey);
      }
    },true);
    addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      if(e.key==="Escape"){this.logisticsOrder=null;this.airOrder=null;this.attackMoveMode=false;this.fastMoveMode=false;this.unloadMode=false;this.garrisonFaceMode=false;this.cancelBuild(el);return;}
      const k=e.key.toLowerCase(), keys = loadSettings().keys;
      if (k === keys.stop) this.world.issue({ type: "stop", ids: this.ids() });
      if (k === keys.attackMove) { this.garrisonFaceMode=false; this.attackMoveMode = true;this.fastMoveMode=false;this.unloadMode=false; el.style.cursor = "crosshair"; }
      if (k === keys.hold) this.world.issue({ type: "hold", ids: this.ids() });
      if (k === keys.patrol) { const q=this.picker.groundAt(innerWidth/2, innerHeight/2); this.world.issue({ type:"patrol", ids:this.ids(), x:q.x, z:q.z }); }
      if (k === "f") { const hasArtillery=this.ids().some(id=>["artillery","mortar","mlrs"].includes(this.world.byId.get(id)?.kind??"")); if(hasArtillery){this.garrisonFaceMode=false;this.fireMissionMode=true;el.style.cursor="crosshair";} }
      if (k === "g") {this.garrisonFaceMode=false;this.fastMoveMode=true;this.attackMoveMode=false;this.unloadMode=false;el.style.cursor="crosshair";}
      if (k === "u") {this.garrisonFaceMode=false;this.unloadMode=true;this.fastMoveMode=false;this.attackMoveMode=false;el.style.cursor="crosshair";}
      if (k === "l") { const depots=this.selection.selectedIds().filter(id=>this.world.byId.get(id)?.kind==="supply"); if(depots.length) this.world.issue({type:"logistics-route",ids:depots,x:0,z:0,clear:true}); }
      if (this.buildMode && k === "r") { this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2); }
    });
  }

  startLogisticsOrder(ids:number[],action:"source"|"route"):void {this.logisticsOrder={ids:[...ids],action};}

  startAirMission(ids:number[],mission:"cap"|"strike"|"sead"|"ground"):void {this.airOrder={ids:[...ids],mission};}

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

  moveTo(x: number, z: number, append = false): void {
    if (!this.enabled) return;
    if(this.garrisonFaceMode){this.garrisonFaceMode=false;this.world.issue({type:"face-building",ids:this.ids(),x,z});return;}
    const cmd: import("../sim/types").Command = { type: this.attackMoveMode ? "amove" : this.fastMoveMode ? "fast-move" : "move", ids: this.ids(), x, z };
    if (append) (cmd as { append?: boolean }).append = true;
    this.attackMoveMode=false;this.fastMoveMode=false;
    if(this.unloadMode){this.unloadMode=false;this.exitAt(x,z);return;}
    this.world.issue(cmd);
    this.fx.ping(x, z, append ? 0x9b7cff : 0xf2a33a);
  }

  private exitAt(x:number,z:number):void {
    const ids=this.ids();
    const housed=ids.filter(id=>{const u=this.world.byId.get(id);return !!u&&(u.garrisonId||u.garrisonOrderId);});
    if(housed.length)this.world.issue({type:"leave-building",ids:housed,x,z});
    this.world.issue({type:"unload",ids:ids.filter(id=>!housed.includes(id)),x,z});
  }

  private ids(): number[] {
    return [...this.selection.selected].filter((id) => {
      const e = this.world.byId.get(id);
      return e && e.team === this.world.playerTeam && e.def.speed > 0;
    });
  }
}

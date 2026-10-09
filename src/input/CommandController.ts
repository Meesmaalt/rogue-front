import {formationPoints} from "../sim/systems/commands";
import type {SimEvent,Entity} from "../sim/types";
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
  private rightDrag:{x:number;y:number;point:{x:number;z:number};end:{x:number;z:number};ids:number[];append:boolean}|null=null;
  private markers:Array<{x:number;z:number;color:string;label:string;until:number}>=[];
  get orderMarkers(){return this.markers.filter(m=>m.until>performance.now());}
  get formationPreview(){const d=this.rightDrag;if(!d||!this.pointer||Math.hypot(this.pointer.x-d.x,this.pointer.y-d.y)<8)return null;const facing=Math.atan2(d.end.x-d.point.x,d.end.z-d.point.z),units=d.ids.map(id=>this.world.byId.get(id)).filter((u):u is Entity=>!!u&&!u.dead);return {point:d.point,end:d.end,facing,points:formationPoints(units,d.point,this.world.teamFormations[this.world.playerTeam],facing)};}
  private ack(x:number,z:number,color:number,caption?:string):void {const attack=color===0xe0553f||color===0xff7a33;const label=caption??(attack?"RÜNDA":color===0x9bc98d?"SISENE":color===0x66d9a0?"REMONDI":color===0x9b7cff?"JÄRJEKORD":color===0x79c9ff?"PATRULL":color===0x55b7ff?"ÕHK / TRANSPORT":color===0xa4d57c?"TARNE":"LIIGU");this.markers=this.orderMarkers.slice(-7);this.markers.push({x,z,color:attack?"#ff6857":"#"+color.toString(16).padStart(6,"0"),label,until:performance.now()+1500});this.fx.ping(x,z,color);}
  moveMode=false;
  patrolMode=false;
  pointer:{x:number;y:number}|null=null;
  hoverHint="";
  private feedback="";
  private feedbackUntil=0;
  get feedbackText():string {return performance.now()<this.feedbackUntil?this.feedback:"";}
  get targeting():boolean {return !!(this.buildMode||this.moveMode||this.attackMoveMode||this.fastMoveMode||this.unloadMode||this.garrisonFaceMode||this.fireMissionMode||this.airOrder||this.logisticsOrder||this.patrolMode);}
  get hint():string {
    if(!this.enabled)return "";
    const action=this.buildMode?"Ehita":this.fireMissionMode?"Tulemissioon":this.airOrder?"Õhuoperatsioon":this.logisticsOrder?.action==="source"?"Vali ressursiallikas":this.logisticsOrder?"Logistika vahepunkt":this.garrisonFaceMode?"Garnisoni vaatesuund":this.unloadMode?"Välju":this.patrolMode?"Patrull":this.attackMoveMode?"Ründeliigu":this.fastMoveMode?"Kiirliigu mööda teid":this.moveMode?"Liigu":"";
    if(this.buildMode)return "Ehita · vasakklõps paigutab · paremklõps tühistab";
    return action?`${action} · paremklõps sihtpunktile · Esc tühistab`:this.hoverHint;
  }
  handleEvents(events:readonly SimEvent[]):void {
    for(const event of events)if(event.type==="order-rejected"&&event.team===this.world.playerTeam)this.notify(event.message);
  }
  private notify(text:string):void {this.feedback=text;this.feedbackUntil=performance.now()+2600;}
  cancelOrders():void {
    this.rightDrag=null;this.logisticsOrder=null;this.airOrder=null;this.attackMoveMode=false;this.fastMoveMode=false;this.unloadMode=false;this.garrisonFaceMode=false;this.fireMissionMode=false;this.patrolMode=false;this.moveMode=false;
    this.buildMode=null;this.buildPoint=null;this.buildValid=false;this.el.style.cursor="default";
  }
  armOrder(mode:"move"|"attack"|"fast"|"unload"|"face"|"fire"|"patrol"):void {
    this.cancelOrders();this.moveMode=mode==="move";this.attackMoveMode=mode==="attack";this.fastMoveMode=mode==="fast";this.unloadMode=mode==="unload";this.garrisonFaceMode=mode==="face";this.fireMissionMode=mode==="fire";this.patrolMode=mode==="patrol";
    this.el.style.cursor=mode==="move"?"default":"crosshair";
  }
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
    private readonly el: HTMLElement,
    private readonly world: World,
    private readonly picker: Picker,
    private readonly selection: SelectionController,
    private readonly fx: Fx,
  ) {
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("mousemove", (e) => {
      this.pointer={x:e.clientX,y:e.clientY};
      if(!this.enabled)return;
      if(this.buildMode)this.updateBuildPreview(e.clientX,e.clientY);
    });
    el.addEventListener("mouseleave",()=>{this.pointer=null;this.hoverHint="";});
    el.addEventListener("mousedown",e=>{
      if(!this.enabled)return;
      if(e.button===0){if(this.buildMode)this.issueAt(e);else if(this.targeting)this.cancelOrders();return;}
      if(e.button!==2)return;
      e.preventDefault();
      if(this.buildMode){this.issueAt(e);return;}
      const ids=this.ids();
      if(ids.length&&!this.airOrder&&!this.logisticsOrder&&!this.fireMissionMode&&!this.unloadMode&&!this.garrisonFaceMode&&!this.patrolMode){
        const point=this.picker.groundAt(e.clientX,e.clientY);this.pointer={x:e.clientX,y:e.clientY};this.rightDrag={x:e.clientX,y:e.clientY,point,end:point,ids,append:e.shiftKey};
      }else this.issueAt(e);
    },true);
    addEventListener("mousemove",e=>{if(!this.rightDrag)return;this.pointer={x:e.clientX,y:e.clientY};this.rightDrag.end=this.picker.groundAt(e.clientX,e.clientY);});
    addEventListener("mouseup",e=>{
      if(e.button!==2||!this.rightDrag)return;
      const d=this.rightDrag;this.pointer={x:e.clientX,y:e.clientY};d.end=this.picker.groundAt(e.clientX,e.clientY);
      const preview=this.formationPreview;this.rightDrag=null;if(!this.enabled)return;
      if(preview){const type=this.attackMoveMode?"amove":this.fastMoveMode?"fast-move":"move";
        this.world.issue({type,ids:d.ids,x:d.point.x,z:d.point.z,facing:preview.facing,append:d.append});this.ack(d.point.x,d.point.z,type==="amove"?0xff7a33:0x66d9a0,"RÜHMA ASETUS");this.notify("Rühma paigutus ja vaatesuund määratud");this.cancelOrders();
      }else this.issueAt(e);
    });
    addEventListener("blur",()=>{this.rightDrag=null;});
    addEventListener("keydown", (e) => {
      if (!this.enabled || e.repeat || (e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable=true]"))) return;
      if(e.key==="Escape"){if(this.targeting)e.preventDefault();this.cancelOrders();return;}
      const k=e.key.toLowerCase(), keys = loadSettings().keys;
      if(k===keys.stop){this.world.issue({type:"stop",ids:this.ids()});this.cancelOrders();this.notify("Valitud üksused peatuvad");}
      if(k===keys.attackMove)this.armOrder("attack");
      if(k===keys.hold){this.cancelOrders();this.world.issue({type:"hold",ids:this.ids()});this.notify("Valitud üksused hoiavad positsiooni");}
      if(k===keys.patrol)this.armOrder("patrol");
      if (k === "f") { const hasArtillery=this.ids().some(id=>["artillery","mortar","mlrs"].includes(this.world.byId.get(id)?.kind??"")); if(hasArtillery){this.armOrder("fire");} }
      if(k==="g")this.armOrder("fast");
      if(k==="u")this.armOrder("unload");
      if(k==="e"&&!e.ctrlKey&&!e.altKey&&!e.metaKey){const ids=this.ids().filter(id=>{const u=this.world.byId.get(id);return u?.def.armor==="air"||u?.kind==="airbase"||u?.kind==="helipad";});if(ids.length){this.cancelOrders();this.world.issue({type:"air-return",ids});this.notify("EVAC: lennuvägi naaseb baasi");}}
      if (k === "l") { const depots=this.selection.selectedIds().filter(id=>this.world.byId.get(id)?.kind==="supply"); if(depots.length) this.world.issue({type:"logistics-route",ids:depots,x:0,z:0,clear:true}); }
      if (this.buildMode && k === "r") { this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2); }
    });
  }

  private issueAt(e:MouseEvent):void {
      if (!this.enabled) return;
      if (this.buildMode && (e.button === 0 || e.button === 2)) {
        e.stopImmediatePropagation();e.preventDefault();
        if(e.button===2){this.cancelBuild(this.el);return;}
        this.updateBuildPreview(e.clientX,e.clientY);
        if (this.buildValid && this.buildPoint) {
          const selectedEngineer = this.selection.selectedIds().map(id=>this.world.byId.get(id)).find(u=>u && u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead);
          const hq = this.world.hq[this.world.playerTeam];
          const engineer = selectedEngineer ?? this.world.entities.filter(u=>u.team===this.world.playerTeam && u.kind==="engineer" && !u.dead).sort((a,b)=>Math.hypot((a.x-(hq?.x ?? 0)),(a.z-(hq?.z ?? 0)))-Math.hypot((b.x-(hq?.x ?? 0)),(b.z-(hq?.z ?? 0))))[0];
          if (engineer) { this.world.issue({type:"build",ids:[engineer.id],kind:this.buildMode,x:this.buildPoint.x,z:this.buildPoint.z,rotation:this.buildRotation}); this.ack(this.buildPoint.x,this.buildPoint.z,0xf2a33a,"EHITA");this.cancelBuild(this.el); }
        }
        return;
      }
      if(e.button!==2)return;
      if(this.moveMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.moveTo(p.x,p.z,e.shiftKey);return;}
      if(this.patrolMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.world.issue({type:"patrol",ids:this.ids(),x:p.x,z:p.z});this.ack(p.x,p.z,0x79c9ff);this.notify("Patrullimäärang antud");this.cancelOrders();return;}
      if(this.logisticsOrder){
        const p=this.picker.groundAt(e.clientX,e.clientY),order=this.logisticsOrder;
        if(order.action==="route")this.world.issue({type:"logistics-route",ids:order.ids,x:p.x,z:p.z,append:true});
        else {
          const index=this.world.resourcePoints.findIndex(r=>Math.hypot(r.x-p.x,r.z-p.z)<=r.radius+20&&(r.controlledBy===this.world.playerTeam||this.world.vision.isVisible(this.world.playerTeam,r.x,r.z)));
          if(index<0)return;
          this.world.issue({type:"logistics-source",ids:order.ids,sourceIndex:index});
        }
        this.ack(p.x,p.z,0xa4d57c);this.notify("Logistikakäsk antud");this.cancelOrders();return;
      }
      if (this.airOrder) {const p=this.picker.groundAt(e.clientX,e.clientY);this.world.issue({type:"air-mission",...this.airOrder,x:p.x,z:p.z});this.ack(p.x,p.z,0x55b7ff);this.notify("Õhuoperatsiooni käsk antud");this.cancelOrders();return;}
      if (this.fireMissionMode) {
        const p = this.picker.groundAt(e.clientX,e.clientY);
        const ids = this.ids().filter(id => ["artillery","mortar","mlrs"].includes(this.world.byId.get(id)?.kind ?? ""));
        if (ids.length) { this.world.issue({type:"fire-mission",ids,x:p.x,z:p.z}); this.ack(p.x,p.z,0xff7a33); }
        this.cancelOrders();return;
      }
      if(this.garrisonFaceMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.world.issue({type:"face-building",ids:this.ids(),x:p.x,z:p.z});this.cancelOrders();return;}
      if(this.fastMoveMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.moveTo(p.x,p.z,e.shiftKey);return;}
      if(this.unloadMode){const p=this.picker.groundAt(e.clientX,e.clientY);this.exitAt(p.x,p.z);this.cancelOrders();this.ack(p.x,p.z,0x55b7ff);this.notify("Väljumiskäsk antud");return;}
      const visibleEnemy=this.picker.pickEntity(e.clientX,e.clientY,this.world.playerTeam===0?1:0);
      if(visibleEnemy){this.world.issue({type:"attack",ids:this.ids(),targetId:visibleEnemy.id});this.ack(visibleEnemy.x,visibleEnemy.z,0xe0553f);this.notify(`Ründa: ${this.world.unitDisplayName(visibleEnemy.kind,visibleEnemy.team)}`);this.cancelOrders();return;}
      const friendly = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam);
      const selectedTransports = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && (transportCapacity(u)>0||u.kind==="landingcraft"); });
      if (friendly && selectedTransports.length && isPassenger(friendly) && friendly.loadedIntoId === null) {
        this.world.issue({ type: "load", ids: selectedTransports, targetId: friendly.id });
        this.ack(friendly.x, friendly.z, 0x55b7ff);
        return;
      }
      if(friendly&&transportCapacity(friendly)>0&&this.ids().some(id=>{const p=this.world.byId.get(id);return !!p&&isPassenger(p);})){this.world.issue({type:"load",ids:this.ids(),targetId:friendly.id});this.ack(friendly.x,friendly.z,0x55b7ff);return;}
      const engineers = this.selection.selectedIds().filter(id => { const u=this.world.byId.get(id); return !!u && !u.dead && u.team===this.world.playerTeam && u.kind==="engineer"; });
      if (friendly && (friendly.hp < maxHitPoints(friendly) || (friendly.components && Object.values(friendly.components).some(v=>v>0))) && engineers.length) {
        this.world.issue({ type: "repair", ids: engineers, targetId: friendly.id });
        this.ack(friendly.x, friendly.z, 0x66d9a0);
        return;
      }
      const enemy = this.picker.pickEntity(e.clientX, e.clientY, this.world.playerTeam === 0 ? 1 : 0);
      const rallyBuildings = this.selection.selectedIds().filter(id => {
        const b = this.world.byId.get(id);
        return !!b && !b.dead && !b.underConstruction && b.team === this.world.playerTeam &&
          ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(b.kind);
      });
      if (!enemy && rallyBuildings.length && !this.ids().length) {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        if (e.shiftKey) {
          // Shift+right-click on map with producer selected = pre-deploy (orders for units still in queue)
          this.world.issue({ type: "predeploy", ids: rallyBuildings, mode: "attack", x: p.x, z: p.z });
          this.ack(p.x, p.z, 0xf2a33a);
        } else {
          this.world.issue({ type: "rally", ids: rallyBuildings, x: p.x, z: p.z });
          this.ack(p.x, p.z, 0x9b7cff);
        }
        return;
      }
      if (this.attackMoveMode && !enemy) {const p=this.picker.groundAt(e.clientX,e.clientY);this.moveTo(p.x,p.z,e.shiftKey);return;}
      const house=this.picker.pickGarrisonBuilding(e.clientX,e.clientY);
      if(!enemy&&!this.attackMoveMode&&house&&this.ids().some(id=>{const u=this.world.byId.get(id);return !!u&&isPassenger(u);})){this.world.issue({type:"enter-building",ids:this.ids(),featureId:house.id});this.ack(house.x,house.z,0x9bc98d);return;}
      if (enemy) {
        this.world.issue({ type: "attack", ids: this.ids(), targetId: enemy.id });
        this.ack(enemy.x, enemy.z, 0xe0553f);
      } else {
        const p = this.picker.groundAt(e.clientX, e.clientY);
        this.moveTo(p.x, p.z, e.shiftKey);
      }
  }

  reset():void {this.markers=[];this.cancelOrders();this.hoverHint="";}

  updateHover():void {
    this.hoverHint="";if(!this.enabled||!this.pointer||this.targeting||!this.selection.selected.size)return;
    const {x,y}=this.pointer,enemy=this.picker.pickEntity(x,y,this.world.playerTeam===0?1:0);
    if(enemy){this.hoverHint=`Parem klõps: ründa ${this.world.unitDisplayName(enemy.kind,enemy.team)}`;return;}
    const own=this.picker.pickEntity(x,y,this.world.playerTeam),ids=this.ids();
    if(own&&transportCapacity(own)>0&&ids.some(id=>isPassenger(this.world.byId.get(id)!))){this.hoverHint="Parem klõps: sisene transporti";return;}
    if(own&&own.hp<maxHitPoints(own)&&ids.some(id=>this.world.byId.get(id)?.kind==="engineer")){this.hoverHint="Parem klõps: remondi";return;}
    const house=this.picker.pickGarrisonBuilding(x,y);
    this.hoverHint=house&&ids.some(id=>isPassenger(this.world.byId.get(id)!))?"Parem klõps: sisene majja":ids.length?"Paremklõps: liigu · lohista: rühma suund · Shift: vahepunkt":"Parem klõps: määra kogunemispunkt";
  }

  startLogisticsOrder(ids:number[],action:"source"|"route"):void {this.cancelOrders();this.logisticsOrder={ids:[...ids],action};this.el.style.cursor="crosshair";}

  startAirMission(ids:number[],mission:"cap"|"strike"|"sead"|"ground"):void {this.cancelOrders();this.airOrder={ids:[...ids],mission};this.el.style.cursor="crosshair";}

  startBuild(kind: BuildableKind): void { this.cancelOrders();this.el.style.cursor="crosshair";this.buildMode=kind; this.buildRotation=0; this.buildPoint=null; this.buildValid=false; }

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

  private cancelBuild(el: HTMLElement): void { this.cancelOrders();el.style.cursor="default"; }

  moveTo(x: number, z: number, append = false): void {
    if (!this.enabled) return;
    if(this.buildMode)return;
    if(this.fireMissionMode){const ids=this.ids().filter(id=>["artillery","mortar","mlrs"].includes(this.world.byId.get(id)?.kind??""));if(ids.length)this.world.issue({type:"fire-mission",ids,x,z});this.cancelOrders();this.ack(x,z,0xff7a33);return;}
    if(this.patrolMode){this.world.issue({type:"patrol",ids:this.ids(),x,z});this.cancelOrders();this.ack(x,z,0x79c9ff);return;}
    if(this.airOrder){this.world.issue({type:"air-mission",...this.airOrder,x,z});this.cancelOrders();this.ack(x,z,0x55b7ff);return;}
    if(this.logisticsOrder){const order=this.logisticsOrder;if(order.action==="route")this.world.issue({type:"logistics-route",ids:order.ids,x,z,append:true});else{const index=this.world.resourcePoints.findIndex(r=>Math.hypot(r.x-x,r.z-z)<=r.radius+20&&(r.controlledBy===this.world.playerTeam||this.world.vision.isVisible(this.world.playerTeam,r.x,r.z)));if(index<0)return;this.world.issue({type:"logistics-source",ids:order.ids,sourceIndex:index});}this.cancelOrders();this.ack(x,z,0xa4d57c);return;}
    if(this.garrisonFaceMode){this.world.issue({type:"face-building",ids:this.ids(),x,z});this.cancelOrders();return;}
    const cmd: import("../sim/types").Command = { type: this.attackMoveMode ? "amove" : this.fastMoveMode ? "fast-move" : "move", ids: this.ids(), x, z };
    if (append) (cmd as { append?: boolean }).append = true;
    if(!append){this.moveMode=false;this.attackMoveMode=false;this.fastMoveMode=false;this.el.style.cursor="default";}
    if(this.unloadMode){this.exitAt(x,z);this.cancelOrders();return;}
    if(!this.ids().length)return;
    this.world.issue(cmd);
    this.notify(append?"Vahepunkt lisatud järjekorda":cmd.type==="amove"?"Ründeliikumise käsk antud":cmd.type==="fast-move"?"Kiirliikumise käsk antud":"Liikumiskäsk antud");
    this.ack(x, z, cmd.type==="amove"?0xff7a33:append?0x9b7cff:0x66d9a0,append?"VAHEPUNKT":cmd.type==="amove"?"RÜNDELIIGU":cmd.type==="fast-move"?"KIIRLIIGU":"LIIGU");
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
      return e && !e.dead && e.loadedIntoId==null && e.team === this.world.playerTeam && e.def.speed > 0;
    });
  }
}

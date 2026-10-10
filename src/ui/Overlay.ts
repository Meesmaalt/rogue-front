import {MarkerLayout} from "./MarkerLayout";
import {supplyRadiusFor,tacticalSupplyNodes,tacticalSupplyDepot} from "../sim/systems/tacticalSupply";
import {logisticsStatus} from "../sim/stockLogistics";
import {isGarrisonBuilding,garrisonCapacity,buildingCondition} from "../sim/garrison";
import {maxHitPoints} from "../sim/unitStats";
import {drawClassIcon,tacticalClass} from "./TacticalClass";
import type {Entity,IntelContact} from "../sim/types";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import type { UnitMarkerRect, Picker } from "../input/Picker";
import type { SelectionController } from "../input/SelectionController";
import type { BuildableKind } from "../sim/buildings";

/** 2D-kiht renderduse peal: elumõõdikud ja valikukast. */
export interface BuildPreview { point: {x:number;z:number} | null; kind: BuildableKind | null; rotation: number; valid: boolean }

export class Overlay {
  private ctx: CanvasRenderingContext2D;
  private readonly layout=new MarkerLayout();
  private readonly hudRegions:HTMLElement[];
  private exclusions:{x:number;y:number;width:number;height:number}[]=[];
  private exclusionStamp=-Infinity;
  private intelStamp=-Infinity;
  private intelTeam=-1;
  private intelContacts:IntelContact[]=[];
  private readonly occupants=new Map<string,{own:number;seen:boolean}>();
  private occupantStamp=-1;
  private readonly selectedUnits:Entity[]=[];
  private readonly markerRects:UnitMarkerRect[]=[];
  private readonly visible:Entity[]=[];
  private readonly ordinary:Entity[]=[];
  private readonly nameWidths=new Map<string,number>();
  private readonly supplyLabels=new Map<number,{stamp:number;text:string}>();
  private readonly targetLines=new Map<number,{stamp:number;target:number;clear:boolean}>();

  constructor(private readonly canvas: HTMLCanvasElement,hudRoot:HTMLElement|null=null) {
    this.hudRegions=hudRoot?[...hudRoot.querySelectorAll<HTMLElement>(".top,.bottom .sel,.map-panel,.build.tactical,.tutorial-guide,.game-menu>div,.economy-details>div")]:[];
    this.ctx = canvas.getContext("2d")!;
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  reset():void {
    this.layout.reset();this.markerRects.length=0;this.selectedUnits.length=0;this.intelContacts=[];this.intelStamp=-Infinity;this.intelTeam=-1;
    this.occupants.clear();this.occupantStamp=-1;this.supplyLabels.clear();this.targetLines.clear();this.exclusionStamp=-Infinity;
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(world: World, picker: Picker, sel: SelectionController, preview: BuildPreview | null = null,orders?:{pointer:{x:number;y:number}|null;hint:string;feedbackText:string;orderMarkers?:readonly {x:number;z:number;color:string;label:string;until:number}[];formationPreview?:{point:{x:number;z:number};end:{x:number;z:number};facing:number;points:{x:number;z:number}[]}|null}): void {
    const c = this.ctx, w = innerWidth, h = innerHeight;
    c.clearRect(0, 0, w, h);
    this.layout.begin(w,h);
    const now=performance.now();
    if(now-this.exclusionStamp>100){
      this.exclusionStamp=now;this.exclusions=[];
      for(const node of this.hudRegions){
        // Closed native disclosures do not render their children.
        const disclosure=node.parentElement;
        if(disclosure instanceof HTMLDetailsElement&&!disclosure.open)continue;
        const rect=node.getBoundingClientRect();if(rect.width&&rect.height)this.exclusions.push({x:rect.x,y:rect.y,width:rect.width,height:rect.height});
      }
    }
    for(const box of this.exclusions)this.layout.reserve(box);
    const line=(points:readonly {x:number;y?:number;z:number}[],color:string,dashed=false)=>{
      c.strokeStyle=color;c.lineWidth=1.4;c.setLineDash(dashed?[5,5]:[]);c.beginPath();let started=false;
      for(const q of points){const p=picker.toScreen(q.x,q.y??heightAt(q.x,q.z)+.3,q.z);if(p.z>1){started=false;continue;}if(!started){c.moveTo(p.x,p.y);started=true;}else c.lineTo(p.x,p.y);}c.stroke();c.setLineDash([]);
    };
    const selected=this.selectedUnits;selected.length=0;
    for(const id of sel.selected){const u=world.byId.get(id);if(u&&!u.dead&&u.loadedIntoId==null&&u.team===world.playerTeam)selected.push(u);}
    const supplyNodes=selected.some(u=>u.kind==="supply")?tacticalSupplyNodes(world,world.playerTeam):[];
    const convoyStatus=(u:Entity)=>{const stamp=Math.floor(world.time*5),cached=this.supplyLabels.get(u.id);if(cached?.stamp===stamp)return cached.text;const text=logisticsStatus(world,u);this.supplyLabels.set(u.id,{stamp,text});return text;};
    const usable=(u:Entity)=>!u.underConstruction&&(u.disabledUntil??0)<=world.time&&((u.ammoStock??0)>0||(u.fuelStock??0)>0);
    const label=(u:Entity,text:string,color:string)=>{const p=picker.entityScreen(u,u.def.height+3);if(p.z>1||p.x<0||p.x>w||p.y<0||p.y>h)return;c.font="600 11px sans-serif";const width=c.measureText(text).width;c.fillStyle="#15252ce8";c.fillRect(p.x+7,p.y-13,width+10,18);c.fillStyle=color;c.fillText(text,p.x+12,p.y);};
    for(const u of selected){

      if(u.kind==="logiTruck"||u.kind==="transport"&&u.supplyDepotId!=null){const depot=world.byId.get(u.supplyDepotId??-1);if(depot&&!depot.dead)line([u,depot],u.cargo>0?"#b6d985":"#a9b7c1",true);label(u,convoyStatus(u),"#d5e7b5");}
      if(u.def.damage>0&&selected.indexOf(u)<4){
        if(u.target&&!u.target.dead&&world.isSpottedByTeam(u.target,u.team)){
          const stamp=Math.floor(world.time*10),cached=this.targetLines.get(u.id);
          const clear=cached?.stamp===stamp&&cached.target===u.target.id?cached.clear:["artillery","mortar","mlrs"].includes(u.kind)||world.vision.hasLineOfSight(u,u.target);
          this.targetLines.set(u.id,{stamp,target:u.target.id,clear});

          if(!clear){const p=picker.entityScreen(u,u.def.height+4);c.fillStyle="#ffad94";c.font="bold 11px sans-serif";c.fillText("Tulejoon blokeeritud",p.x+10,p.y);}
        }
      }

      if(u.kind==="supply"&&selected.indexOf(u)<4){
        const radius=supplyRadiusFor(u,world),circle=[];
        for(let i=0;i<=64;i++){const a=i*Math.PI*2/64;circle.push({x:u.x+Math.sin(a)*radius,z:u.z+Math.cos(a)*radius});}
        line(circle,usable(u)?"rgba(143,202,160,.65)":"#eaa475");
        let clients=0;
        for(const e of world.entities){if(e.dead||e.loadedIntoId!=null||e.team!==u.team||e.def.speed===0||e.def.armor==="air"||e.def.domain==="sea"||Math.hypot(e.x-u.x,e.z-u.z)>radius)continue;if(tacticalSupplyDepot(world,e,supplyNodes)!==u)continue;line([u,e],usable(u)?"rgba(143,202,160,.5)":"#eaa475");if(++clients>=12)break;}

        const fleet=world.entities.filter(t=>!t.dead&&t.supplyDepotId===u.id&&t.team===world.playerTeam);
        const sources=u.preferredResourceIndex!=null?[world.resourcePoints[u.preferredResourceIndex]]:fleet.map(t=>t.logisticsSourceIndex==null?null:world.resourcePoints[t.logisticsSourceIndex]);
        for(const rp of new Set(sources))if(rp&&rp.controlledBy===world.playerTeam)line([u,...u.logisticsWaypoints??[],rp],u.logisticsPaused?"#d07961":"rgba(177,215,121,.75)",true);
        const main=world.primarySupplyDepot(u.team);
        if(main&&main!==u&&fleet.some(t=>t.logisticsSourceIndex==null))line([main,...u.logisticsWaypoints??[],u],world.connectedSupplyNodes(u.team).some(n=>n.id===u.id)?"#b6d985":"#ee9479",true);
        for(const t of fleet.slice(0,12)){if(t.dest)line([t,...t.kind==="logiTruck"?t.navPath.slice(t.navPathIndex,t.navPathIndex+10):[],t.dest],t.cargo>0?"#b6d985":"rgba(195,203,186,.5)",true);const p=picker.entityScreen(t,t.def.height+2);c.font="bold 11px sans-serif";c.fillStyle="#d5e7b5";if(p.z<=1)c.fillText(convoyStatus(t),p.x+8,p.y);}
      }
    }
    for(const marker of orders?.orderMarkers??[]){
      const p=picker.toScreen(marker.x,heightAt(marker.x,marker.z)+.5,marker.z);if(p.z>1)continue;
      const remaining=Math.max(0,Math.min(1,(marker.until-performance.now())/850));
      c.save();c.globalAlpha=Math.min(1,remaining*3);c.strokeStyle=marker.color;c.lineWidth=2;
      c.beginPath();
      if(marker.color==="#ff6857"){
        // Compact corner brackets, fixed size: an order target, not an expanding explosion.
        for(const [dx,dy] of [[-1,-1],[1,1],[-1,1],[1,-1]]){c.moveTo(p.x+dx*5,p.y+dy*11);c.lineTo(p.x+dx*11,p.y+dy*11);c.lineTo(p.x+dx*11,p.y+dy*5);}
      }else {
        // Two destination chevrons are distinct from selection and weapon range rings.
        for(const offset of [-4,4]){c.moveTo(p.x-7,p.y+offset-3);c.lineTo(p.x,p.y+offset+2);c.lineTo(p.x+7,p.y+offset-3);}
      }
      c.stroke();c.restore();
    }
    const placement=orders?.formationPreview;
    if(placement){
      line([placement.point,placement.end],"#80e3b3");
      const start=picker.toScreen(placement.point.x,heightAt(placement.point.x,placement.point.z)+.4,placement.point.z),end=picker.toScreen(placement.end.x,heightAt(placement.end.x,placement.end.z)+.4,placement.end.z);
      const angle=Math.atan2(end.y-start.y,end.x-start.x);c.strokeStyle="#80e3b3";c.lineWidth=3;c.beginPath();c.moveTo(end.x-Math.cos(angle-.5)*12,end.y-Math.sin(angle-.5)*12);c.lineTo(end.x,end.y);c.lineTo(end.x-Math.cos(angle+.5)*12,end.y-Math.sin(angle+.5)*12);c.stroke();
      for(const q of placement.points.slice(0,64)){const p=picker.toScreen(q.x,heightAt(q.x,q.z)+.4,q.z);if(p.z>1)continue;c.beginPath();c.arc(p.x,p.y,6,0,Math.PI*2);c.stroke();}
      c.font="bold 12px Segoe UI,sans-serif";c.fillStyle="#baf0d6";c.fillText("Vabasta paremklahv · rühma asetus ja suund",start.x+12,start.y-20);
    }
    const occupants=this.occupants,occupantStamp=Math.floor(world.time*5);
    if(occupantStamp!==this.occupantStamp){
    this.occupantStamp=occupantStamp;occupants.clear();
    for(const u of world.entities){
      if(u.dead||u.loadedIntoId!=null||!u.garrisonId)continue;
      let count=occupants.get(u.garrisonId);if(!count){count={own:0,seen:false};occupants.set(u.garrisonId,count);}
      if(u.team===world.playerTeam)count.own++;else if(world.isSpottedByTeam(u,world.playerTeam))count.seen=true;
    }
    }
    for(const f of world.mapFeatures){
      if(!isGarrisonBuilding(f))continue;
      const own=occupants.get(f.id)?.own??0,known=world.vision.isVisible(world.playerTeam,f.x,f.z)||own>0;
      const seen=occupants.get(f.id)?.seen??false;
      if(!own&&!seen&&!(known&&buildingCondition(world,f)>.35))continue;
      const p=picker.toScreen(f.x,heightAt(f.x,f.z)+(f.height??3)+3,f.z);if(p.z>1||p.x<0||p.x>w||p.y<0||p.y>h)continue;
      const text=own?`⌂ ${own}/${garrisonCapacity(f)} · garnison`:seen?"⌂ Vaenlase kontakt":buildingCondition(world,f)>=1?"⌂ Varemed":"⌂ Kahjustatud";
      c.font="600 11px Segoe UI,sans-serif";c.textAlign="center";const width=c.measureText(text).width+12;c.fillStyle="#172824dd";c.fillRect(p.x-width/2,p.y-13,width,18);c.fillStyle=own?"#b9dda4":seen?"#eda591":"#d7bf95";c.fillText(text,p.x,p.y);c.textAlign="left";
    }
    const markers=this.markerRects;markers.length=0;
    // Selected labels get first choice of screen space; stable entity order breaks ties.
    const visible=this.visible,ordinary=this.ordinary;visible.length=0;ordinary.length=0;
    for(const u of world.entities){
      if(u.dead||u.loadedIntoId!=null||u.team!==world.playerTeam&&!world.isSpottedByTeam(u,world.playerTeam))continue;
      (sel.selected.has(u.id)?visible:ordinary).push(u);
    }
    for(const u of ordinary)visible.push(u);
    for (const u of visible) {
      const selectedUnit=sel.selected.has(u.id);
      const p = picker.entityScreen(u,u.def.height+1);
      if (p.z > 1 || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
      const pose=picker.entityPosition(u),scale=picker.pxPerUnit(pose.x,pose.y,pose.z),distant=u.def.speed>0&&scale<4.2;
      if (!distant && u.hp >= maxHitPoints(u) && !selectedUnit && u.team===world.playerTeam && (u.def.speed===0 || world.time-u.lastCombatTime>6)) continue;
      const bw = Math.max(26, u.def.radius * scale * 1.6);
      c.fillStyle = "rgba(8,10,11,.85)";
      c.fillRect(p.x - bw / 2 - 1, p.y - 1, bw + 2, 6);
      c.fillStyle = u.team !== world.playerTeam ? "#e0553f" : "#73bfe3";
      c.fillRect(p.x - bw / 2, p.y, bw * Math.min(1,Math.max(0, u.hp / maxHitPoints(u))), 4);
      if(distant||selectedUnit||u.team!==world.playerTeam){
        const name=world.unitDisplayName(u.kind,u.team);
        c.font="600 11px Segoe UI, sans-serif";
        let tw=this.nameWidths.get(name);if(tw==null){tw=c.measureText(name).width;if(this.nameWidths.size>256)this.nameWidths.clear();this.nameWidths.set(name,tw);}
        const lowAmmo=u.team===world.playerTeam&&(u.maxAmmo??0)>0&&(u.ammo??0)/(u.maxAmmo??1)<.2;
        const lowFuel=u.team===world.playerTeam&&(u.maxFuel??0)>0&&(u.fuel??0)/(u.maxFuel??1)<.2;
        const box=this.layout.place(u.id,p.x,p.y,tw+35,lowAmmo||lowFuel?15:0,selectedUnit);
        if(!box)continue;
        const {x:left,y,width,full}=box;
        if(y!==p.y-23){c.strokeStyle=u.team===world.playerTeam?"#8acbe580":"#f5a18b80";c.lineWidth=1;c.beginPath();c.moveTo(p.x,p.y-3);c.lineTo(left+width/2,y+9);c.stroke();}
        c.fillStyle=u.team===world.playerTeam?"#142c3aee":"#3c211dee";c.fillRect(left,y,width,18);
        c.strokeStyle=selectedUnit?"#ffd18a":u.team===world.playerTeam?"#8acbe5":"#f5a18b";
        if(selectedUnit)c.strokeRect(left+.5,y+.5,width-1,17);
        c.fillStyle=c.strokeStyle;drawClassIcon(c,tacticalClass(u.kind),left+12,y+9);
        if(full)c.fillText(name,left+25,y+13);
        if(u.team===world.playerTeam&&(selectedUnit||distant)){
          if(lowAmmo||lowFuel){c.fillStyle="#e8ae67";c.fillRect(left,y+18,width,2);if(full){c.font="600 10px Segoe UI,sans-serif";c.fillStyle="#17242bee";c.fillRect(left,y+20,width,13);c.fillStyle="#e8ae67";c.fillText(lowAmmo&&lowFuel?"MOON / KÜTUS":lowAmmo?"MOON MADAL":"KÜTUS MADAL",left+3,y+30);}}
        }
        markers.push({id:u.id,x:left,y,width,height:box.height});
      }
      if(sel.selected.has(u.id)||world.time-u.lastCombatTime<5){
        const suppression=u.suppression??0;
        if(suppression>25){c.fillStyle="#4a3026";c.fillRect(p.x-bw/2,p.y+6,bw,3);c.fillStyle=suppression>60?"#e87552":"#e8bd72";c.fillRect(p.x-bw/2,p.y+6,bw*Math.min(1,suppression/100),3);}
        if(u.components&&Math.max(...Object.values(u.components))>35){c.font="bold 10px sans-serif";c.fillStyle="#eaa583";c.fillText(u.components.engine>65||u.components.tracks>65?"Liikuvus kahjustatud":"Kahjustatud",p.x-bw/2,p.y+20);}
      }


    }
    // Last-known contacts are lower-priority, dashed and deliberately not clickable.
    // Read only saved intel coordinates/type: no live hidden position, HP or ammo.
    const intelStamp=Math.floor(world.time*5);
    if(intelStamp!==this.intelStamp||world.playerTeam!==this.intelTeam){
      this.intelStamp=intelStamp;this.intelTeam=world.playerTeam;this.intelContacts=world.getIntel(world.playerTeam,true);
    }
    let contactLabels=0;
    for(const contact of this.intelContacts){
      const age=world.time-contact.lastSeen,live=world.byId.get(contact.entityId);
      if(age<0||age>60||live&&!live.dead&&world.isSpottedByTeam(live,world.playerTeam))continue;
      const p=picker.toScreen(contact.x,heightAt(contact.x,contact.z)+2,contact.z);
      if(p.z>1||p.x<0||p.x>w||p.y<0||p.y>h)continue;
      const text=`Kontakt · ${Math.floor(age)} s`;c.font="600 11px Segoe UI,sans-serif";
      let textWidth=this.nameWidths.get(text);if(textWidth==null){textWidth=c.measureText(text).width;this.nameWidths.set(text,textWidth);}
      const box=this.layout.place(-contact.entityId-1,p.x,p.y,textWidth+35);if(!box)continue;
      c.save();c.globalAlpha=Math.max(.35,.8-age/100);c.fillStyle="#302922e8";c.fillRect(box.x,box.y,box.width,18);
      c.strokeStyle="#d0ae7d";c.fillStyle="#d0ae7d";c.lineWidth=1;c.setLineDash([3,3]);c.strokeRect(box.x+.5,box.y+.5,box.width-1,17);c.setLineDash([]);
      drawClassIcon(c,tacticalClass(contact.kind),box.x+12,box.y+9);
      if(box.full)c.fillText(text,box.x+25,box.y+13);c.restore();
      if(++contactLabels>=64)break;
    }
    picker.setUnitMarkers(markers);
    if(this.supplyLabels.size>256)this.supplyLabels.clear();
    if(this.targetLines.size>256)this.targetLines.clear();
    if (preview?.point && preview.kind) {
      const p = picker.toScreen(preview.point.x, heightAt(preview.point.x, preview.point.z) + 0.4, preview.point.z);
      const size = ({barracks:7,factory:9,helipad:9,airbase:13,refinery:8,supply:6,radar:6,bunker:6,aa:6,generator:6,shipyard:12,landCommand:8,airCommand:8,seaCommand:9,combatEngineer:7,landStrategy:8,airStrategy:8,seaStrategy:9} as Record<BuildableKind,number>)[preview.kind] * picker.pxPerUnit(preview.point.x, heightAt(preview.point.x, preview.point.z) + 0.4, preview.point.z);
      c.save(); c.translate(p.x,p.y); c.rotate(preview.rotation);
      c.fillStyle = preview.valid ? "rgba(90,210,145,.20)" : "rgba(220,70,60,.22)";
      c.strokeStyle = preview.valid ? "#66d9a0" : "#e0553f"; c.lineWidth = 2;
      c.fillRect(-size/2,-size/2,size,size); c.strokeRect(-size/2,-size/2,size,size);
      c.restore();
      c.fillStyle = preview.valid ? "#66d9a0" : "#e0553f"; c.font = "12px sans-serif";
      c.fillText(preview.valid ? "EHITADA · R = pööra" : "EHITADA EI SAA", p.x + 10, p.y - 10);
    }

    if(orders?.pointer&&orders.hint){
      c.font="600 12px Segoe UI,sans-serif";const tw=c.measureText(orders.hint).width;
      const x=Math.max(6,Math.min(w-tw-18,orders.pointer.x+18)),y=Math.max(28,Math.min(h-210,orders.pointer.y-20));
      c.fillStyle="#15252ce8";c.fillRect(x-6,y-15,tw+12,23);c.fillStyle="#d6e6e8";c.fillText(orders.hint,x,y);
    }
    if(orders?.feedbackText){
      c.font="600 13px Segoe UI,sans-serif";c.textAlign="center";
      const tw=c.measureText(orders.feedbackText).width;c.fillStyle="#13232df2";c.fillRect((w-tw)/2-14,82,tw+28,30);c.fillStyle="#dce7eb";c.fillText(orders.feedbackText,w/2,102);c.textAlign="left";
    }

    const d = sel.drag;
    if (d && (Math.abs(d.x1 - d.x0) > 5 || Math.abs(d.y1 - d.y0) > 5)) {
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), bw = Math.abs(d.x1 - d.x0), bh = Math.abs(d.y1 - d.y0);
      c.fillStyle = "rgba(242,163,58,.1)"; c.fillRect(x, y, bw, bh);
      c.strokeStyle = "#f2a33a"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }
}

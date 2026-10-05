import {isGarrisonBuilding,garrisonOccupants,garrisonCapacity,buildingCondition} from "../sim/garrison";
import {maxHitPoints} from "../sim/unitStats";
import {effectiveWeaponRange} from "../sim/systems/combat";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import type { Picker } from "../input/Picker";
import type { SelectionController } from "../input/SelectionController";
import type { BuildableKind } from "../sim/buildings";

/** 2D-kiht renderduse peal: elumõõdikud ja valikukast. */
export interface BuildPreview { point: {x:number;z:number} | null; kind: BuildableKind | null; rotation: number; valid: boolean }

export class Overlay {
  private ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(world: World, picker: Picker, sel: SelectionController, preview: BuildPreview | null = null): void {
    const c = this.ctx, w = innerWidth, h = innerHeight;
    c.clearRect(0, 0, w, h);
    const line=(points:readonly {x:number;y?:number;z:number}[],color:string,dashed=false)=>{
      c.strokeStyle=color;c.lineWidth=1.4;c.setLineDash(dashed?[5,5]:[]);c.beginPath();let started=false;
      for(const q of points){const p=picker.toScreen(q.x,q.y??heightAt(q.x,q.z)+.3,q.z);if(p.z>1){started=false;continue;}if(!started){c.moveTo(p.x,p.y);started=true;}else c.lineTo(p.x,p.y);}c.stroke();c.setLineDash([]);
    };
    const selected=world.entities.filter(u=>!u.dead&&sel.selected.has(u.id)&&u.team===world.playerTeam);
    for(const u of selected){
      if(u.def.damage>0&&selected.indexOf(u)<4){
        const radius=effectiveWeaponRange(u),points=[];
        for(let i=0;i<=64;i++){const a=i*Math.PI/32;points.push({x:u.x+Math.sin(a)*radius,z:u.z+Math.cos(a)*radius});}
        line(points,"rgba(108,183,193,.45)");
        if(u.target&&!u.target.dead&&world.isSpottedByTeam(u.target,u.team)){
          const clear=["artillery","mortar","mlrs"].includes(u.kind)||world.vision.hasLineOfSight(u,u.target);
          line([{x:u.x,y:u.y+u.def.height*.6,z:u.z},{x:u.target.x,y:u.target.y+u.target.def.height*.5,z:u.target.z}],clear?"#efb56b":"#ee735d",!clear);
          if(!clear){const p=picker.toScreen(u.x,u.y+u.def.height+4,u.z);c.fillStyle="#ffad94";c.font="bold 11px sans-serif";c.fillText("Tulejoon blokeeritud",p.x+10,p.y);}
        }
      }
      if(u.dest)line([u,...u.navPath.slice(u.navPathIndex,u.navPathIndex+12),u.dest,...u.moveQueue??[]],u.mode==="amove"?"rgba(242,181,91,.8)":"rgba(143,203,224,.7)",true);
      if(u.kind==="supply"){
        const fleet=world.entities.filter(t=>!t.dead&&t.supplyDepotId===u.id&&t.team===world.playerTeam);
        const sources=u.preferredResourceIndex!=null?[world.resourcePoints[u.preferredResourceIndex]]:fleet.map(t=>t.logisticsSourceIndex==null?null:world.resourcePoints[t.logisticsSourceIndex]);
        for(const rp of sources)if(rp&&rp.controlledBy===world.playerTeam)line([u,...u.logisticsWaypoints??[],rp],u.logisticsPaused?"#d07961":"rgba(177,215,121,.75)",true);
        for(const t of fleet){if(t.dest)line([t,...t.kind==="logiTruck"?t.navPath.slice(t.navPathIndex,t.navPathIndex+10):[],t.dest],t.cargo>0?"#b6d985":"rgba(195,203,186,.5)",true);const p=picker.toScreen(t.x,t.y+t.def.height+2,t.z);c.font="bold 11px sans-serif";c.fillStyle="#d5e7b5";if(p.z<=1)c.fillText(t.cargo>0?`Koorem ${Math.floor(t.cargo)}`:"Kogumisele",p.x+8,p.y);}
      }
    }
    for(const f of world.mapFeatures){
      if(!isGarrisonBuilding(f))continue;
      const own=garrisonOccupants(world,f.id).filter(u=>u.team===world.playerTeam),known=world.vision.isVisible(world.playerTeam,f.x,f.z)||own.length>0;
      const seen=garrisonOccupants(world,f.id).some(u=>u.team!==world.playerTeam&&world.isSpottedByTeam(u,world.playerTeam));
      if(!own.length&&!seen&&!(known&&buildingCondition(world,f)>.35))continue;
      const p=picker.toScreen(f.x,heightAt(f.x,f.z)+(f.height??3)+3,f.z);if(p.z>1||p.x<0||p.x>w||p.y<0||p.y>h)continue;
      const text=own.length?`⌂ ${own.length}/${garrisonCapacity(f)} · garnison`:seen?"⌂ Vaenlase kontakt":buildingCondition(world,f)>=1?"⌂ Varemed":"⌂ Kahjustatud";
      c.font="600 11px Segoe UI,sans-serif";c.textAlign="center";const width=c.measureText(text).width+12;c.fillStyle="#172824dd";c.fillRect(p.x-width/2,p.y-13,width,18);c.fillStyle=own.length?"#b9dda4":seen?"#eda591":"#d7bf95";c.fillText(text,p.x,p.y);c.textAlign="left";
    }
    for (const u of world.entities) {
      if (u.dead || (u.team !== world.playerTeam && !world.isSpottedByTeam(u,world.playerTeam)) || (u.hp >= maxHitPoints(u) && !sel.selected.has(u.id) && u.team===world.playerTeam && (u.def.speed===0 || world.time-u.lastCombatTime>6))) continue;
      const p = picker.toScreen(u.x, u.y + u.def.height + 1, u.z);
      if (p.z > 1 || p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
      const bw = Math.max(26, u.def.radius * picker.pxPerUnit(u.x, u.y, u.z) * 1.6);
      c.fillStyle = "rgba(8,10,11,.85)";
      c.fillRect(p.x - bw / 2 - 1, p.y - 1, bw + 2, 6);
      c.fillStyle = u.team !== world.playerTeam ? "#e0553f" : "#73bfe3";
      c.fillRect(p.x - bw / 2, p.y, bw * Math.min(1,Math.max(0, u.hp / maxHitPoints(u))), 4);
      if(sel.selected.has(u.id)||u.team!==world.playerTeam){c.font="600 11px Segoe UI, sans-serif";const name=world.unitDisplayName(u.kind,u.team),tw=c.measureText(name).width;c.fillStyle="rgba(15,25,28,.9)";c.fillRect(p.x-tw/2-5,p.y-19,tw+10,16);c.fillStyle=u.team===world.playerTeam?"#c6e8f4":"#ffb5a3";c.textAlign="center";c.fillText(name,p.x,p.y-7);c.textAlign="left";}
      if(sel.selected.has(u.id)||world.time-u.lastCombatTime<5){
        const suppression=u.suppression??0;
        if(suppression>25){c.fillStyle="#4a3026";c.fillRect(p.x-bw/2,p.y+6,bw,3);c.fillStyle=suppression>60?"#e87552":"#e8bd72";c.fillRect(p.x-bw/2,p.y+6,bw*Math.min(1,suppression/100),3);}
        if(u.components&&Math.max(...Object.values(u.components))>35){c.font="bold 10px sans-serif";c.fillStyle="#eaa583";c.fillText(u.components.engine>65||u.components.tracks>65?"Liikuvus kahjustatud":"Kahjustatud",p.x-bw/2,p.y+20);}
      }


    }
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

    const d = sel.drag;
    if (d && (Math.abs(d.x1 - d.x0) > 5 || Math.abs(d.y1 - d.y0) > 5)) {
      const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), bw = Math.abs(d.x1 - d.x0), bh = Math.abs(d.y1 - d.y0);
      c.fillStyle = "rgba(242,163,58,.1)"; c.fillRect(x, y, bw, bh);
      c.strokeStyle = "#f2a33a"; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, bw, bh);
    }
  }
}

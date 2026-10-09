import * as THREE from "three";
import type {Entity} from "../sim/types";
import {GARRISON_RULES,garrisonWeaponUsable} from "../sim/garrison";
import type {World} from "../sim/World";
import {heightAt} from "../sim/heightmap";
import {weaponRange} from "../sim/systems/combat";

/** Colors match the weapon cards. UI-only; never changes simulation or targeting. */
export const WEAPON_RANGE_COLORS=["#f2cc69","#79c9ff","#f09dbd","#a9df91","#bdabff","#ffad79"];
const SEGMENTS=160;
/** Read the same sector used by the garrison and firing gates. */
export function weaponSector(u:Entity):{facing:number;arc:number} {
  return u.garrisonId?{facing:u.garrisonFacing??u.heading,arc:GARRISON_RULES.firingArc}:
    {facing:u.firingArc<Math.PI*2-.01?u.heading:0,arc:u.firingArc};
}
export function writeRangeVertices(points:Float32Array,x:number,z:number,max:number,min:number,facing:number,arc:number):number {
  let n=0;const limited=arc<Math.PI*2-.01,start=facing-arc/2;
  const vertex=(angle:number,r:number)=>{const px=x+Math.sin(angle)*r,pz=z+Math.cos(angle)*r;points[n++]=px;points[n++]=heightAt(px,pz)+.55;points[n++]=pz;};
  for(let j=0;j<SEGMENTS;j++){vertex(start+j/SEGMENTS*arc,max);vertex(start+(j+1)/SEGMENTS*arc,max);}
  if(min>0)for(let j=0;j<SEGMENTS;j+=2){vertex(start+j/SEGMENTS*arc,min);vertex(start+(j+1)/SEGMENTS*arc,min);}
  if(limited)for(const a of [start,start+arc]){vertex(a,min);vertex(a,max);}
  return n/3;
}

export class RangeOverlay {
  private group=new THREE.Group();
  private slots=WEAPON_RANGE_COLORS.map(color=>{
    const geometry=new THREE.BufferGeometry();
    const points=new Float32Array(SEGMENTS*2*2*3);
    geometry.setAttribute("position",new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));
    const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));
    line.frustumCulled=false;
    const canvas=document.createElement("canvas");canvas.width=384;canvas.height=64;
    const texture=new THREE.CanvasTexture(canvas);
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));
    label.scale.set(30,5,1);label.renderOrder=10;
    this.group.add(line,label);
    return {geometry,points,line,label,canvas,texture,key:"",drawKey:""};
  });
  constructor(scene:THREE.Scene){scene.add(this.group);}
  reset():void {for(const view of this.slots)view.drawKey="";this.group.visible=false;}
  sync(world:World,selected:ReadonlySet<number>,enabled:boolean,slot:number|null):void {
    const id=selected.size===1?selected.values().next().value:undefined;
    const u=id==null?undefined:world.byId.get(id);
    this.group.visible=!!(enabled&&u&&!u.dead&&u.loadedIntoId==null&&u.team===world.playerTeam&&u.def.damage>0);
    if(!this.group.visible||!u)return;
    this.slots.forEach((view,i)=>{
      const spec=u.def.weapons?.[i];
      view.line.visible=view.label.visible=!!spec&&garrisonWeaponUsable(u,spec)&&(slot==null||slot===i);
      if(!spec||!view.line.visible)return;
      const max=weaponRange(u,spec),min=spec.minimumRange,{facing,arc}=weaponSector(u);
      const drawKey=`${u.id}|${u.x}|${u.z}|${max}|${min}|${spec.name}|${facing}|${arc}`;
      if(view.drawKey===drawKey)return;view.drawKey=drawKey;
      const count=writeRangeVertices(view.points,u.x,u.z,max,min,facing,arc);
      view.geometry.setDrawRange(0,count);view.geometry.attributes.position.needsUpdate=true;
      const key=`${spec.name}|${Math.round(min)}|${Math.round(max)}`;
      if(view.key!==key){
        view.key=key;const ctx=view.canvas.getContext("2d")!;
        ctx.clearRect(0,0,384,64);ctx.fillStyle="rgba(12,20,26,.88)";ctx.fillRect(0,0,384,64);
        ctx.fillStyle=WEAPON_RANGE_COLORS[i];ctx.font="bold 22px sans-serif";ctx.textAlign="center";
        ctx.fillText(`${i+1}. ${Math.round(min)}–${Math.round(max)} m`,192,26);
        ctx.font="18px sans-serif";ctx.fillText(spec.name.slice(0,32),192,51);view.texture.needsUpdate=true;
      }
      const a=arc<Math.PI*2-.01?facing+(i-1)*Math.min(.25,arc/6):i*.42,x=u.x+Math.sin(a)*max,z=u.z+Math.cos(a)*max;
      view.label.position.set(x,heightAt(x,z)+3,z);
    });
  }
}

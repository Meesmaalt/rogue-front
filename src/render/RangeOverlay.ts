import * as THREE from "three";
import type {World} from "../sim/World";
import {heightAt} from "../sim/heightmap";
import {weaponRange} from "../sim/systems/combat";

/** Colors match the weapon cards. UI-only; never changes simulation or targeting. */
export const WEAPON_RANGE_COLORS=["#f2cc69","#79c9ff","#f09dbd","#a9df91","#bdabff","#ffad79"];
const SEGMENTS=160;
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
      view.line.visible=view.label.visible=!!spec&&(slot==null||slot===i);
      if(!spec||!view.line.visible)return;
      const max=weaponRange(u,spec),min=spec.minimumRange;
      const drawKey=`${u.id}|${u.x}|${u.z}|${max}|${min}|${spec.name}`;
      if(view.drawKey===drawKey)return;view.drawKey=drawKey;
      let n=0;
      const vertex=(angle:number,r:number)=>{
        const x=u.x+Math.sin(angle)*r,z=u.z+Math.cos(angle)*r;
        view.points[n++]=x;view.points[n++]=heightAt(x,z)+.55;view.points[n++]=z;
      };
      for(let j=0;j<SEGMENTS;j++){
        vertex(j/SEGMENTS*Math.PI*2,max);vertex((j+1)/SEGMENTS*Math.PI*2,max);
      }
      // Dashed minimum-range circle: the inner area is a firing dead zone.
      if(min>0)for(let j=0;j<SEGMENTS;j+=2){vertex(j/SEGMENTS*Math.PI*2,min);vertex((j+1)/SEGMENTS*Math.PI*2,min);}
      view.geometry.setDrawRange(0,n/3);view.geometry.attributes.position.needsUpdate=true;
      const key=`${spec.name}|${Math.round(min)}|${Math.round(max)}`;
      if(view.key!==key){
        view.key=key;const ctx=view.canvas.getContext("2d")!;
        ctx.clearRect(0,0,384,64);ctx.fillStyle="rgba(12,20,26,.88)";ctx.fillRect(0,0,384,64);
        ctx.fillStyle=WEAPON_RANGE_COLORS[i];ctx.font="bold 22px sans-serif";ctx.textAlign="center";
        ctx.fillText(`${i+1}. ${Math.round(min)}–${Math.round(max)} m`,192,26);
        ctx.font="18px sans-serif";ctx.fillText(spec.name.slice(0,32),192,51);view.texture.needsUpdate=true;
      }
      const a=i*.42,x=u.x+Math.sin(a)*max,z=u.z+Math.cos(a)*max;
      view.label.position.set(x,heightAt(x,z)+3,z);
    });
  }
}

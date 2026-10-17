import {getLanguage,englishText} from "../ui/Language";
import {resourceGroundTexture} from "./ResourceGround";
import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";

/** Pickup aprons and ownership/production labels; industrial footprints live in Terrain/NavGrid. */
export class ResourceSites {
  private sites: Array<{root:THREE.Group;ring:THREE.Mesh;label:THREE.Sprite;texture:THREE.CanvasTexture;canvas:HTMLCanvasElement;key:string;signal?:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>}> = [];
  private nextUpdate=0;
  constructor(scene:THREE.Scene,world:World){
    for(const rp of world.resourcePoints){
      const root=new THREE.Group();root.position.set(rp.x,heightAt(rp.x,rp.z)+.12,rp.z);
      const pad=new THREE.Mesh(new THREE.CircleGeometry(7,32).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0xffffff,map:resourceGroundTexture(rp.facility),roughness:1}));root.add(pad);
      const ring=new THREE.Mesh(new THREE.RingGeometry(7,7.3,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xc6b27b}));ring.position.y=.04;root.add(ring);
      const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));label.position.set(12,9,0);label.scale.set(30,7.5,1);root.add(label);
      scene.add(root);this.sites.push({root,ring,label,texture,canvas,key:'',signal:scene.getObjectByName(`Industry:resource-facility-${this.sites.length}`)?.getObjectByName('IndustrySignal') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>|undefined});
    }
  }
  sync(world:World,camera?:THREE.Camera):void {
    if(world.time<this.nextUpdate&&world.time>this.nextUpdate-.3)return;this.nextUpdate=world.time+.25;
    const names={mine:"Rikastustehas",oilfield:"Naftatöötlemistehas",factory:"Masinatehas",depot:"Varustustehas"};
    this.sites.forEach((s,i)=>{
      const rp=world.resourcePoints[i];if(!rp)return;
      const known=rp.controlledBy===world.playerTeam||world.vision.isVisible(world.playerTeam,rp.x,rp.z);
      s.root.visible=known||world.vision.isExplored(world.playerTeam,rp.x,rp.z);
      s.label.visible=!camera||camera.position.distanceTo(s.root.position)<260;
      if(s.signal){s.signal.visible=known;if(known)s.signal.material.color.setHex((rp.disabledUntil??0)>world.time?0xc46b52:rp.active?0x83b5a1:rp.controlledBy!=null?0xd8af62:0x78847b);}
      const color=!known||rp.controlledBy==null?0xc6b27b:rp.controlledBy===world.playerTeam?0x75b7bc:0xce8270;
      (s.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
      const truck=world.entities.find(e=>!e.dead&&e.team===rp.controlledBy&&e.resourceConvoy?.sourceIndex===i);
      const route=truck?(truck.resourceConvoy!.phase==='loading'?"Veok laeb":truck.resourceConvoy!.phase==='unloading'?"HQ juures":"Veok teel"):world.entities.some(e=>!e.dead&&!e.underConstruction&&e.kind==='hq'&&e.team===rp.controlledBy)?"Ootab veokit":"Vajab peamaja";
      const status=!known?"Luura rajatist":rp.controlledBy==null?"Kasarm → Lahinguinsenerid siia":(rp.disabledUntil??0)>world.time?"Seisatud":!rp.active?`Käivitus · lahinguinsenerid ${Math.min(100,Math.round((rp.startupProgress??0)/8*100))}%`:`Laos ${Math.floor(rp.amount/10)*10} · +${(rp.productionRate??0).toFixed(1)}/s`;
      const detail=known&&rp.controlledBy!=null&&rp.active?route:"";
      const title=names[rp.facility??"depot"],text=`${title} · ${status}`,key=text+detail+color;if(key===s.key)return;s.key=key;
      const c=s.canvas.getContext("2d")!;c.clearRect(0,0,512,128);c.fillStyle="rgba(17,30,32,.88)";c.fillRect(0,0,512,128);c.fillStyle="#"+color.toString(16).padStart(6,"0");c.fillRect(0,0,5,128);c.fillStyle="#e3e4d6";c.font="bold 23px sans-serif";c.textAlign="center";c.fillText(getLanguage()==='en'?englishText(title):title,256,34,490);c.font="21px sans-serif";c.fillText(getLanguage()==='en'?englishText(status):status,256,70,490);c.fillStyle="#b3c4ba";c.font="19px sans-serif";c.fillText(getLanguage()==='en'?englishText(detail):detail,256,108,490);s.texture.needsUpdate=true;
    });
  }
}

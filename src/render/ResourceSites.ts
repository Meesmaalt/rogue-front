import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";

/** Pickup aprons and ownership/production labels; industrial footprints live in Terrain/NavGrid. */
export class ResourceSites {
  private sites: Array<{root:THREE.Group;ring:THREE.Mesh;label:THREE.Sprite;texture:THREE.CanvasTexture;canvas:HTMLCanvasElement;key:string}> = [];
  private nextUpdate=0;
  constructor(scene:THREE.Scene,world:World){
    for(const rp of world.resourcePoints){
      const root=new THREE.Group();root.position.set(rp.x,heightAt(rp.x,rp.z)+.12,rp.z);
      const pad=new THREE.Mesh(new THREE.CircleGeometry(4.5,24).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x73756b,roughness:1}));root.add(pad);
      const ring=new THREE.Mesh(new THREE.RingGeometry(4.5,4.8,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xc6b27b}));ring.position.y=.04;root.add(ring);
      const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));label.position.set(12,9,0);label.scale.set(30,5.6,1);root.add(label);
      scene.add(root);this.sites.push({root,ring,label,texture,canvas,key:""});
    }
  }
  sync(world:World):void {
    if(world.time<this.nextUpdate&&world.time>this.nextUpdate-.3)return;this.nextUpdate=world.time+.25;
    const names={mine:"Kaevandus",oilfield:"Naftaväli",factory:"Tööstus",depot:"Ressursiladu"};
    this.sites.forEach((s,i)=>{
      const rp=world.resourcePoints[i];if(!rp)return;
      const known=rp.controlledBy===world.playerTeam||world.vision.isVisible(world.playerTeam,rp.x,rp.z);
      s.root.visible=known||world.vision.isExplored(world.playerTeam,rp.x,rp.z);
      const color=!known||rp.controlledBy==null?0xc6b27b:rp.controlledBy===world.playerTeam?0x75b7bc:0xce8270;
      (s.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
      const status=!known?"Luura rajatist":rp.controlledBy==null?"Vii insener siia":(rp.disabledUntil??0)>world.time?"Seisatud":!rp.active?`Käivitus · insener ${Math.min(100,Math.round((rp.startupProgress??0)/8*100))}%`:`Laos ${Math.floor(rp.amount/10)*10} · +${(rp.productionRate??0).toFixed(1)}/s`;
      const text=`${names[rp.facility??"mine"]} · ${status}`,key=text+color;if(key===s.key)return;s.key=key;
      const c=s.canvas.getContext("2d")!;c.clearRect(0,0,512,96);c.fillStyle="rgba(17,30,32,.88)";c.fillRect(0,0,512,96);c.fillStyle="#"+color.toString(16).padStart(6,"0");c.fillRect(0,0,5,96);c.fillStyle="#e3e4d6";c.font="bold 23px sans-serif";c.textAlign="center";c.fillText(names[rp.facility??"mine"],256,34);c.font="21px sans-serif";c.fillText(status,256,70);s.texture.needsUpdate=true;
    });
  }
}

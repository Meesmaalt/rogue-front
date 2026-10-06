import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import type {World} from "../sim/World";
import type {SimEvent,Projectile} from "../sim/types";
import {heightAt} from "../sim/heightmap";

type ParticleKind="smoke"|"dust"|"glow"|"spark";
interface Particle{x:number;y:number;z:number;vx:number;vy:number;vz:number;t:number;life:number;size:number;color:number;stretch:number}
interface Pool{mesh:THREE.InstancedMesh;fade:THREE.InstancedBufferAttribute;particles:Particle[];capacity:number}
interface Shell{group:THREE.Group;lastX:number;lastY:number;lastZ:number}
interface Ring{mesh:THREE.Mesh;t:number;life:number;size:number}
function particleTexture():THREE.CanvasTexture {
  const cv=document.createElement("canvas");cv.width=cv.height=64;const c=cv.getContext("2d")!;
  const g=c.createRadialGradient(32,32,1,32,32,31);g.addColorStop(0,"rgba(255,255,255,.9)");g.addColorStop(.35,"rgba(255,255,255,.65)");g.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/** Bounded billboard batches; trails follow actual simulated 3D flight. */
export class Fx {
  private forestTimer=0;
  private pools:Record<ParticleKind,Pool>;
  private shells=new Map<number,Shell>();
  private models=new Map<string,THREE.Group>();
  private seen=new Set<number>();
  private rings:Ring[]=[];
  private dummy=new THREE.Object3D();
  private direction=new THREE.Vector3();
  private color=new THREE.Color();
  private ringGeometry=new THREE.RingGeometry(.86,1,40).rotateX(-Math.PI/2);
  constructor(private readonly scene:THREE.Scene,private readonly camera:THREE.Camera){
    const texture=particleTexture();
    const make=(kind:ParticleKind,capacity:number):Pool=>{
      const geometry=new THREE.PlaneGeometry(1,1),fade=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);geometry.setAttribute("particleOpacity",fade);
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,blending:kind==="glow"||kind==="spark"?THREE.AdditiveBlending:THREE.NormalBlending});
      material.onBeforeCompile=shader=>{
        shader.vertexShader="attribute float particleOpacity; varying float vParticleOpacity;\n"+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvParticleOpacity=particleOpacity;");
        shader.fragmentShader="varying float vParticleOpacity;\n"+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.a*=vParticleOpacity;");
      };
      const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      return {mesh,fade,particles:[],capacity};
    };
    this.pools={smoke:make("smoke",640),dust:make("dust",320),glow:make("glow",192),spark:make("spark",256)};
  }
  reset():void {
    for(const s of this.shells.values())this.scene.remove(s.group);this.shells.clear();
    for(const pool of Object.values(this.pools)){pool.particles.length=0;pool.mesh.count=0;}
    for(const r of this.rings){this.scene.remove(r.mesh);(r.mesh.material as THREE.Material).dispose();}this.rings.length=0;
  }
  private emit(kind:ParticleKind,x:number,y:number,z:number,size:number,life:number,color:number,vx=0,vy=0,vz=0,stretch=1):void {
    const pool=this.pools[kind];if(pool.particles.length>=pool.capacity)return;
    pool.particles.push({x,y,z,vx,vy,vz,t:0,life,size,color,stretch});
  }
  private wakeTimer=0;
  syncNavalWakes(world:World,dt:number):void {
    this.wakeTimer+=dt;if(this.wakeTimer<.15)return;this.wakeTimer=0;
    for(const u of world.entities){if(u.dead||u.def.domain!=="sea"||(u.motionSpeed??0)<.8||u.team!==world.playerTeam&&!world.isSpottedByTeam(u,world.playerTeam))continue;
      const x=u.x-Math.sin(u.heading)*u.def.radius*.8,z=u.z-Math.cos(u.heading)*u.def.radius*.8,y=world.waterNav.surfaceAt(u.x,u.z)+.12;
      this.emit("dust",x,y,z,.5,1.2,0xc1d9d8,-Math.sin(u.heading),.02,-Math.cos(u.heading),2);
    }
  }
  syncForestFires(world:World,dt:number):void {
    this.forestTimer+=dt;if(this.forestTimer<.18)return;this.forestTimer=0;
    for(const c of world.terrain.fires()){
      if(!world.vision.isVisible(world.playerTeam,c.x,c.z))continue;
      const x=c.x+this.r(10),z=c.z+this.r(10),y=heightAt(x,z);
      this.emit("smoke",x,y+4,z,3.2,4,0x595b50,.8,2.8,.3);
      if(!c.burnt){this.emit("glow",x,y+1,z,2.5,.65,0xff942d,0,2.5,0,2);this.emit("spark",x,y+1,z,.16,1.2,0xffd56a,this.r(2),4,this.r(2));}
    }
  }
  handleEvents(events:SimEvent[],world:World):void {
    for(const e of events){
      if((e.type==="fire"&&e.team!==world.playerTeam||e.type!=="fire")&&!world.vision.isVisible(world.playerTeam,e.x,e.z))continue;
      if(e.type==="fire"){
        const visual=e.visual??"rifle",rocket=["atgm","sam","aam","manpad","rpg","rocket","mlrs","cruise","anti-ship","naval-sam"].includes(visual),small=["rifle","mg","sniper"].includes(visual);
        const size=small?.3:rocket?.55:visual==="sabot"?1.25:.7;
        if(visual!=="bomb"){
          this.emit("glow",e.x,e.y,e.z,size,.09,0xffdda0,0,0,0,2.4);
          const count=rocket?5:small?1:5;
          for(let i=0;i<count;i++)this.emit("smoke",e.x-(e.dx??0)*.3,e.y,e.z-(e.dz??0)*.3,rocket?.35:.5,rocket?.85:.55,0xbcb8aa,this.r(1)+(e.dx??0)*1.2,.5+Math.random(),this.r(1)+(e.dz??0)*1.2);
          if(!small)for(let i=0;i<5;i++)this.emit("dust",e.x,heightAt(e.x,e.z)+.2,e.z,.6,.55,0xab9c7c,this.r(4),Math.random(),this.r(4));
        }
      }else if(e.type==="impact"){
        if(world.waterNav.isWalkableWorld(e.x,e.z)&&e.y-world.waterNav.surfaceAt(e.x,e.z)<6){
          const surface=world.waterNav.surfaceAt(e.x,e.z)+.2;
          for(let i=0;i<18;i++)this.emit("dust",e.x,surface,e.z,.5,.7,0xb8dce3,this.r(8),2+Math.random()*9,this.r(8),7);
        }
        if(e.result==="ricochet"){
          for(let i=0;i<12;i++)this.emit("spark",e.x,e.y,e.z,.1,.3,0xffda94,this.r(10),Math.random()*6,this.r(10),3);
          this.emit("smoke",e.x,e.y,e.z,.7,.6,0x9a988e);continue;
        }
        if(e.weapon==="bullet"||e.visual==="sniper"){
          for(let i=0;i<3;i++)this.emit("dust",e.x,e.y,e.z,.25,.25,0xab9c7c,this.r(2),Math.random()*2,this.r(2));continue;
        }
        const heavy=["bomb","howitzer","mlrs","cruise","anti-ship","torpedo"].includes(e.visual??""),size=heavy?2.2:e.visual==="mortar"?1.35:e.result==="penetration"?.75:1.1;
        this.explode(e.x,e.y,e.z,size,e.result==="airburst");
      }else if(e.type==="death")this.explode(e.x,e.y,e.z,e.big?3:1.8,e.y-heightAt(e.x,e.z)>6,true);
      else if(e.type==="build-complete"||e.type==="repair-complete")this.ping(e.x,e.z,0x77ba9e);
      else if(e.type==="supply-delivered")this.ping(e.x,e.z,0xd1b566);
    }
  }
  private projectileModel(p:Projectile):THREE.Group {
    const key=p.visual??p.weapon??"rifle",cached=this.models.get(key);if(cached)return cached.clone(true);
    const group=new THREE.Group(),rocket=p.weapon==="missile",bomb=key==="bomb";
    if(rocket||bomb){
      const length=bomb?1.25:key==="cruise"?2.8:key==="anti-ship"?2.3:key==="torpedo"?2.2:key==="naval-sam"?2.1:key==="aam"?1.9:key==="sam"?1.75:key==="mlrs"?1.3:key==="rpg"?.8:key==="rocket"?.7:1.1;
      const radius=bomb?.18:key==="torpedo"?.16:key==="cruise"?.14:key==="sam"?.105:key==="aam"?.095:.075,parts:THREE.BufferGeometry[]=[];
      parts.push(new THREE.CylinderGeometry(radius,radius,length,8).rotateX(Math.PI/2));
      parts.push(new THREE.ConeGeometry(radius,.3,8).rotateX(Math.PI/2).translate(0,0,length/2+.13));
      for(let i=0;i<2;i++)parts.push(new THREE.BoxGeometry(radius*5,.025,.22).rotateZ(i*Math.PI/2).translate(0,0,-length*.33));
      const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
      group.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:bomb?0x777e63:key==="sam"?0xd0d0bf:0xb9beb6,roughness:.8,metalness:.12})));
      if(!bomb&&key!=="torpedo"){const flame=new THREE.Mesh(new THREE.ConeGeometry(radius*1.2,.45,6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffc16b,toneMapped:false}));flame.position.z=-length*.5-.22;group.add(flame);}
    }else {
      const tracer=p.weapon==="bullet"||["autocannon","flak","sabot"].includes(key),length=key==="sabot"?3.2:key==="sniper"?2.2:tracer?1.5:.7;
      group.add(new THREE.Mesh(new THREE.BoxGeometry(key==="sabot"?.045:.035,.035,length),new THREE.MeshBasicMaterial({color:tracer?0xffd4a0:0xbbb5a0,toneMapped:false})));
    }
    this.models.set(key,group);return group.clone(true);
  }
  syncProjectiles(world:World,alpha:number):void {
    this.seen.clear();
    for(const p of world.projectiles){
      this.seen.add(p.id);const visible=p.team===world.playerTeam||world.vision.isVisible(world.playerTeam,p.x,p.z);
      let shell=this.shells.get(p.id);if(!visible){if(shell)shell.group.visible=false;continue;}
      if(!shell){shell={group:this.projectileModel(p),lastX:p.px??p.x,lastY:p.py??p.y,lastZ:p.pz??p.z};this.scene.add(shell.group);this.shells.set(p.id,shell);}
      const m=shell.group;m.visible=true;
      const x=(p.px??p.x)+(p.x-(p.px??p.x))*alpha,y=(p.py??p.y)+(p.y-(p.py??p.y))*alpha,z=(p.pz??p.z)+(p.z-(p.pz??p.z))*alpha;
      m.position.set(x,y,z);this.direction.set(p.vx,p.vy,p.vz).normalize();m.lookAt(x+this.direction.x,y+this.direction.y,z+this.direction.z);
      if(p.visual==="torpedo"){this.emit("dust",x,y+.12,z,.15,.4,0xc2e2df,0,.1,0);}
      else if(p.weapon==="missile"){
        const distance=Math.hypot(x-shell.lastX,y-shell.lastY,z-shell.lastZ),spacing=p.visual==="sam"?.7:.5;
        if(distance>=spacing){const count=Math.min(12,Math.floor(distance/spacing));
          for(let i=1;i<=count;i++){const t=i/count;this.emit("smoke",shell.lastX+(x-shell.lastX)*t,shell.lastY+(y-shell.lastY)*t,shell.lastZ+(z-shell.lastZ)*t,p.visual==="sam"?.55:p.visual==="mlrs"?.4:.22,p.visual==="aam"?1.3:2,0xc6c6b8,.25,.35,0);}
          shell.lastX=x;shell.lastY=y;shell.lastZ=z;
        }
      }
    }
    for(const [id,s]of this.shells)if(!this.seen.has(id)){this.scene.remove(s.group);this.shells.delete(id);}
  }
  ping(x:number,z:number,color:number):void {this.ring(x,heightAt(x,z)+.15,z,3,.7,color);}
  private ring(x:number,y:number,z:number,size:number,life:number,color:number):void {
    if(this.rings.length>=24)return;
    const mesh=new THREE.Mesh(this.ringGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false}));mesh.position.set(x,y,z);this.scene.add(mesh);this.rings.push({mesh,size,life,t:0});
  }
  update(dt:number):void {
    for(const [kind,pool]of Object.entries(this.pools)){
      for(let i=pool.particles.length-1;i>=0;i--){const p=pool.particles[i];p.t+=dt;if(p.t>=p.life){pool.particles[i]=pool.particles[pool.particles.length-1];pool.particles.pop();continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy+=(kind==="smoke"?.4:-3)*dt;
      }
      pool.mesh.count=pool.particles.length;
      pool.particles.forEach((p,i)=>{const k=p.t/p.life,size=p.size*(kind==="smoke"||kind==="dust"?.6+k*2.5:1-k*.6);
        this.dummy.position.set(p.x,p.y,p.z);this.dummy.quaternion.copy(this.camera.quaternion);this.dummy.scale.set(size*p.stretch,size,1);this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);
        this.color.setHex(p.color);pool.mesh.setColorAt(i,this.color);pool.fade.setX(i,Math.sin(Math.min(1,k*5)*Math.PI/2)*(1-k)*(kind==="smoke"?.5:1));
      });
      pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;pool.fade.needsUpdate=true;
    }
    for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.t+=dt;const k=r.t/r.life;if(k>=1){this.scene.remove(r.mesh);(r.mesh.material as THREE.Material).dispose();this.rings.splice(i,1);continue;}r.mesh.scale.setScalar(.3+r.size*k);(r.mesh.material as THREE.MeshBasicMaterial).opacity=(1-k)*.45;}
  }
  private explode(x:number,y:number,z:number,size:number,air:boolean,death=false):void {
    this.emit("glow",x,y,z,size*1.8,.18,0xffd8a0);
    for(let i=0;i<10;i++)this.emit("glow",x,y,z,.35+Math.random()*size*.5,.3+Math.random()*.3,0xfbaa61,this.r(size*4),Math.random()*size*3,this.r(size*4));
    for(let i=0;i<14;i++)this.emit(air?"smoke":"dust",x,y,z,size*(.5+Math.random()),1+Math.random(),air?0x92938e:0xac9d7e,this.r(size*6),Math.random()*size*3,this.r(size*6));
    for(let i=0;i<10;i++)this.emit("smoke",x,y,z,size*(.45+Math.random()*.6),death?3.5:2,death?0x4a4b46:0x7e7d71,this.r(size),1+Math.random()*2,this.r(size));
    for(let i=0;i<8;i++)this.emit("spark",x,y,z,.11,.4,0xffce8e,this.r(size*10),Math.random()*size*5,this.r(size*10),2.5);
    if(!air&&y-heightAt(x,z)<5)this.ring(x,heightAt(x,z)+.18,z,size*3,.45,0xbaad8b);
  }
  private r(size:number):number{return(Math.random()-.5)*size;}
}

import effects from "../data/effects.json";
import {sampleProjectileTrail} from "./ProjectileTrail";
import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
import type {World} from "../sim/World";
import type {SimEvent,Projectile} from "../sim/types";
import {SIM_STEP} from "../sim/constants";
import {maxHitPoints} from "../sim/unitStats";
import {heightAt} from "../sim/heightmap";

type ParticleKind="smoke"|"vapor"|"dust"|"glow"|"spark";
interface Particle{x:number;y:number;z:number;vx:number;vy:number;vz:number;t:number;life:number;size:number;color:number;stretch:number}
interface Pool{mesh:THREE.InstancedMesh;fade:THREE.InstancedBufferAttribute;particles:Particle[];capacity:number}
interface Shell{group:THREE.Group;flame?:THREE.Object3D;lastX:number;lastY:number;lastZ:number}
interface Ring{mesh:THREE.Mesh;t:number;life:number;size:number;hold?:boolean}
interface Burst{t:number;delay:number;run:()=>void}
const ROCKETS=["icbm","nuclear","atgm","sam","aam","manpad","rpg","rocket","mlrs","cruise","anti-ship","naval-sam"];
const HEAVY=["icbm","bomb","howitzer","mlrs","cruise","anti-ship","torpedo"];
/** White radial sprites. Alpha stops only — instance color tints them. Test stub supports this canvas API. */
function blob(stops:[number,number][]):THREE.CanvasTexture{
  const cv=document.createElement("canvas");cv.width=cv.height=64;const c=cv.getContext("2d")!;
  const g=c.createRadialGradient(32,32,1,32,32,31);
  for(const [at,a] of stops)g.addColorStop(at,`rgba(255,255,255,${a})`);
  g.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=g;c.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/** Bounded billboard batches; trails follow actual simulated 3D flight. */
export class Fx {
  private forestTimer=0;
  private ambientTimer=0;
  private ambientCursor=0;
  private pools:Record<ParticleKind,Pool>;
  private shells=new Map<number,Shell>();
  private models=new Map<string,THREE.Group>();
  private seen=new Set<number>();
  private rings:Ring[]=[];
  private bursts:Burst[]=[];
  private dummy=new THREE.Object3D();
  private direction=new THREE.Vector3();
  private frustum=new THREE.Frustum();
  private projection=new THREE.Matrix4();
  private point=new THREE.Vector3();
  private color=new THREE.Color();
  private ringGeometry=new THREE.RingGeometry(.82,1,48).rotateX(-Math.PI/2);
  private scorchGeometry=new THREE.CircleGeometry(1,20).rotateX(-Math.PI/2);
  constructor(private readonly scene:THREE.Scene,private readonly camera:THREE.Camera){
    const maps:Record<ParticleKind,THREE.Texture>={
      smoke:blob([[0,.55],[.22,.4],[.55,.08]]),
      vapor:blob([[0,.4],[.2,.28],[.5,.05]]),
      dust:blob([[0,.6],[.25,.32],[.6,.06]]),
      glow:blob([[0,1],[.12,.9],[.34,.18]]),
      spark:blob([[0,1],[.08,.85],[.2,0]]),
    };
    const make=(kind:ParticleKind,capacity:number):Pool=>{
      const geometry=new THREE.PlaneGeometry(1,1),fade=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);geometry.setAttribute("particleOpacity",fade);
      const material=new THREE.MeshBasicMaterial({map:maps[kind],transparent:true,depthWrite:false,toneMapped:false,blending:kind==="glow"||kind==="spark"?THREE.AdditiveBlending:THREE.NormalBlending});
      material.onBeforeCompile=shader=>{
        shader.vertexShader="attribute float particleOpacity; varying float vParticleOpacity;\n"+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nvParticleOpacity=particleOpacity;");
        shader.fragmentShader="varying float vParticleOpacity;\n"+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>","#include <color_fragment>\ndiffuseColor.a*=vParticleOpacity;");
      };
      const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);fade.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
      return {mesh,fade,particles:[],capacity};
    };
    this.pools={smoke:make("smoke",effects.pools.smoke),vapor:make("vapor",effects.pools.vapor),dust:make("dust",effects.pools.dust),glow:make("glow",effects.pools.glow),spark:make("spark",effects.pools.spark)};
  }
  reset():void {
    this.forestTimer=this.wakeTimer=this.ambientTimer=this.ambientCursor=0;this.bursts.length=0;
    for(const s of this.shells.values())this.scene.remove(s.group);this.shells.clear();
    for(const pool of Object.values(this.pools)){pool.particles.length=0;pool.mesh.count=0;}
    for(const r of this.rings){this.scene.remove(r.mesh);(r.mesh.material as THREE.Material).dispose();}this.rings.length=0;
  }
  private emit(kind:ParticleKind,x:number,y:number,z:number,size:number,life:number,color:number,vx=0,vy=0,vz=0,stretch=1):void {
    const pool=this.pools[kind];if(pool.particles.length>=pool.capacity)return;
    pool.particles.push({x,y,z,vx,vy,vz,t:0,life,size,color,stretch});
  }
  private later(delay:number,run:()=>void):void{if(this.bursts.length>80)this.bursts.shift();this.bursts.push({t:0,delay,run});}
  private wakeTimer=0;
  syncNavalWakes(world:World,dt:number):void {
    this.wakeTimer+=dt;if(this.wakeTimer<.15)return;this.wakeTimer=0;
    for(const u of world.entities){if(u.dead||u.def.domain!=="sea"||(u.motionSpeed??0)<.8||u.team!==world.playerTeam&&!world.isSpottedByTeam(u,world.playerTeam))continue;
      const x=u.x-Math.sin(u.heading)*u.def.radius*.8,z=u.z-Math.cos(u.heading)*u.def.radius*.8,y=world.waterNav.surfaceAt(u.x,u.z)+.12;
      this.emit("dust",x,y,z,.7,1.4,0xd5eeef,-Math.sin(u.heading),.04,-Math.cos(u.heading),2.4);
      this.emit("vapor",x,y+.15,z,.45,1.1,0xe7f6f7,-Math.sin(u.heading)*.4,.15,-Math.cos(u.heading)*.4);
    }
  }
  syncForestFires(world:World,dt:number):void {
    this.forestTimer+=dt;if(this.forestTimer<.18)return;this.forestTimer=0;
    for(const c of world.terrain.fires()){
      if(!world.vision.isVisible(world.playerTeam,c.x,c.z))continue;
      const x=c.x+this.r(10),z=c.z+this.r(10),y=heightAt(x,z);
      this.emit("smoke",x,y+5,z,4.4,5.2,0x3c3e38,this.r(1.4),3.4,this.r(1.4));
      if(!c.burnt){
        this.emit("glow",x,y+.5,z,3.6,.55,0xff4e0c,0,2.4,0,1.15);
        this.emit("glow",x,y+2.6,z,1.7,.32,0xffc56a,this.r(.8),4.2,this.r(.8));
        this.emit("spark",x,y+1.1,z,.15,1.35,0xffe29a,this.r(2.4),5+Math.random()*4,this.r(2.4),1.8);
      }
    }
  }
  /** Cosmetic only: bounded, staggered emitters; hidden enemies never expose their state. */
  syncUnitEffects(world:World,dt:number):void {
    this.ambientTimer+=dt;const cfg=effects.ambient;if(this.ambientTimer<cfg.interval)return;this.ambientTimer%=cfg.interval;
    this.camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
    const count=world.entities.length;if(!count)return;let emitted=0;
    for(let n=0;n<count;n++){
      const u=world.entities[(this.ambientCursor+n)%count];
      if(u.dead||u.loadedIntoId!=null||u.underConstruction||u.def.category==="infantry"||u.team!==world.playerTeam&&!world.isSpottedByTeam(u,world.playerTeam))continue;
      this.point.set(u.x,u.y+u.def.height*.5,u.z);
      if(this.camera.position.distanceToSquared(this.point)>cfg.distance**2||!this.frustum.containsPoint(this.point))continue;
      const ground=heightAt(u.x,u.z),water=world.waterNav.isWalkableWorld(u.x,u.z),surface=water?world.waterNav.surfaceAt(u.x,u.z):ground,altitude=u.y-surface;
      const travelX=u.x-u.px,travelZ=u.z-u.pz,speed=Math.hypot(travelX,travelZ)/SIM_STEP,radius=u.def.radius;
      const damaged=u.hp/maxHitPoints(u)<cfg.damageThreshold||(u.components?.engine??0)>cfg.engineThreshold;
      const rotor=u.def.category==="heli"&&altitude>1&&altitude<cfg.rotorHeight&&speed<cfg.rotorMaxSpeed;
      const moving=u.def.speed>0&&u.def.armor!=="air"&&u.def.domain!=="sea"&&speed>cfg.groundSpeed&&altitude<cfg.maxGroundAltitude&&!water;
      if(!damaged&&!rotor&&!moving)continue;
      if(damaged)this.emit("smoke",u.x-Math.sin(u.heading)*radius*.4,u.y+u.def.height*.8,u.z-Math.cos(u.heading)*radius*.4,Math.max(.5,radius*.28),cfg.smokeLife,0x51544f,.45,1.6,.2);
      if(moving){
        const length=Math.hypot(travelX,travelZ),dx=travelX/length,dz=travelZ/length;
        const road=!!world.terrain.roadAt(u.x,u.z),size=Math.max(.4,radius*.25)*(road?.55:1);
        for(const side of [-1,1])this.emit("dust",u.x-dx*radius+dz*radius*.5*side,ground+.3,u.z-dz*radius-dx*radius*.5*side,size,cfg.dustLife,road?0x92958b:0xa99d82,-dx*1.8,.4,-dz*1.8);
      }
      if(rotor){
        const strength=1-altitude/cfg.rotorHeight;
        for(let i=0;i<3;i++){const angle=Math.random()*Math.PI*2,dx=Math.sin(angle),dz=Math.cos(angle);this.emit("dust",u.x+dx*radius*1.5,surface+.2,u.z+dz*radius*1.5,radius*.4*strength,cfg.dustLife,water?0xc5dfe1:0xb0a489,dx*5,.4,dz*5);}
      }
      if(++emitted>=cfg.maxUnits){this.ambientCursor=(this.ambientCursor+n+1)%count;return;}
    }
    this.ambientCursor=(this.ambientCursor+1)%count;
  }
  handleEvents(events:SimEvent[],world:World):void {
    for(const e of events){
      if((e.type==="fire"&&e.team!==world.playerTeam||e.type!=="fire")&&!world.vision.isVisible(world.playerTeam,e.x,e.z))continue;
      if(e.type==="fire")this.muzzle(e);
      else if(e.type==="impact")this.impact(e,world);
      else if(e.type==="death")this.explode(e.x,e.y,e.z,e.big?3.4:2,e.y-heightAt(e.x,e.z)>6,true);
      else if(e.type==="build-complete"||e.type==="repair-complete")this.ping(e.x,e.z,0x77ba9e);
      else if(e.type==="supply-delivered")this.ping(e.x,e.z,0xd1b566);
    }
  }
  /** Same bursts the battle uses, with fog-of-war ignored. `wet` forces a water splash. */
  preview(event:SimEvent,wet=false):void{
    const world={playerTeam:0,vision:{isVisible:()=>true},waterNav:{isWalkableWorld:()=>wet,surfaceAt:()=>event.type==="impact"||event.type==="death"||event.type==="fire"?event.y:0}} as unknown as World;
    this.handleEvents([event],world);
  }
  private muzzle(e:Extract<SimEvent,{type:"fire"}>):void{
    const visual=e.visual??"rifle",rocket=ROCKETS.includes(visual),small=["rifle","mg","sniper"].includes(visual),heavy=visual==="howitzer"||visual==="mlrs"||visual==="sabot";
    const dx=e.dx??0,dy=e.dy??0,dz=e.dz??0;
    if(visual==="bomb")return;
    const size=small?.48:rocket?1.25:visual==="sabot"?2.15:visual==="howitzer"?2.55:.95;
    this.emit("glow",e.x,e.y,e.z,size,.08,0xfff7e2,0,0,0,1.25);
    this.emit("glow",e.x+dx*size*.45,e.y+dy*size*.45,e.z+dz*size*.45,size*(small?1.35:1.7),.12,small?0xffc56a:0xff7424,dx*3,dy*3,dz*3,rocket?1.1:1.7);
    this.emit("spark",e.x+dx*size,e.y+dy*size,e.z+dz*size,small?.11:.24,.08,0xfff3c8,dx*(small?8:16),dy*(small?8:16),dz*(small?8:16),small?2.4:5);
    const count=rocket?7:small?1:heavy?8:5;
    for(let i=0;i<count;i++)this.emit("smoke",e.x-dx*.45,e.y,e.z-dz*.45,rocket?.6:small?.26:.58,rocket?1.15:.65,0xd0c9b8,-dx*(1.1+Math.random())+this.r(.5),.55+Math.random()*1.2,-dz*(1.1+Math.random())+this.r(.5));
    if(!small&&e.y-heightAt(e.x,e.z)<4)for(let i=0;i<(heavy?12:6);i++)this.emit("dust",e.x-dx*1.2,heightAt(e.x,e.z)+.25,e.z-dz*1.2,heavy?1.05:.7,.65,0xb19c78,this.r(heavy?8:4.5),Math.random()*2,this.r(heavy?8:4.5));
    if(rocket){
      this.emit("glow",e.x-dx,e.y-dy,e.z-dz,.7,.18,0xffa03a,-dx*4,.3,-dz*4,1.3);
      this.later(.05,()=>{for(let i=0;i<4;i++)this.emit("spark",e.x-dx*.6,e.y,e.z-dz*.6,.08,.22,0xffd59a,-dx*6+this.r(2),Math.random()*2,-dz*6+this.r(2),2.5);});
    }
  }
  private impact(e:Extract<SimEvent,{type:"impact"}>,world:World):void{
    if(e.visual==='nuclear'){
      this.emit('glow',e.x,e.y+8,e.z,55,1.2,0xfff7ce);this.emit('glow',e.x,e.y+15,e.z,32,3,0xffa132);
      for(let i=0;i<42;i++){const a=i*Math.PI*2/42;this.emit('dust',e.x,e.y+.5,e.z,7,7,0xc1b497,Math.cos(a)*26,1,Math.sin(a)*26);}
      for(let i=0;i<28;i++)this.emit('smoke',e.x+this.r(6),e.y+i*1.8,e.z+this.r(6),7,11,0x5e5c50,this.r(1),4,this.r(1));
      for(let i=0;i<36;i++){const a=i*Math.PI*2/36;this.emit('smoke',e.x+Math.cos(a)*18,e.y+48+this.r(4),e.z+Math.sin(a)*18,13,13,0x69675b,Math.cos(a)*2,3,Math.sin(a)*2);}return;
    }
    if(e.visual==='icbm'){this.explode(e.x,e.y,e.z,8,false);return;}
    if(e.result!=="intercept"&&e.result!=="ricochet"&&["bomb","howitzer","mlrs"].includes(e.visual??"")){const gy=heightAt(e.x,e.z)+.3;for(let i=0;i<18;i++){const a=i/18*Math.PI*2;this.emit("dust",e.x,gy,e.z,1.15,1.05,0xc4b592,Math.cos(a)*16,.8,Math.sin(a)*16,1.2);}}
    if(e.result==="intercept"){
      this.emit("glow",e.x,e.y,e.z,2.1,.1,0xfff6df);
      this.emit("glow",e.x,e.y,e.z,1.15,.2,0xff9a3c);
      this.emit("smoke",e.x,e.y,e.z,1.25,.95,0xc4c2b6);
      for(let i=0;i<16;i++)this.emit("spark",e.x,e.y,e.z,.11,.32,0xffe4b4,this.r(18),this.r(12),this.r(18),3.4);
      return;
    }
    if(world.waterNav.isWalkableWorld(e.x,e.z)&&e.y-world.waterNav.surfaceAt(e.x,e.z)<6){
      this.splash(e.x,world.waterNav.surfaceAt(e.x,e.z)+.2,e.z,HEAVY.includes(e.visual??"")?1.6:1);
      if(HEAVY.includes(e.visual??"")||e.visual==="mortar")this.explode(e.x,world.waterNav.surfaceAt(e.x,e.z)+.4,e.z,e.visual==="mortar"?1.15:1.7,false);
      return;
    }
    if(e.result==="ricochet"){
      this.emit("glow",e.x,e.y,e.z,.55,.07,0xfff6d2);
      for(let i=0;i<16;i++)this.emit("spark",e.x,e.y,e.z,.09,.38,i%2?0xffe7aa:0xfff8e0,this.r(14),1+Math.random()*8,this.r(14),3.6);
      this.emit("smoke",e.x,e.y,e.z,.75,.55,0xa8a698);
      return;
    }
    if(e.visual==="sabot"||e.visual==="autocannon"||e.weapon==="bullet"||e.visual==="sniper"){
      if(e.result==="penetration"){
        const big=e.visual==="sabot";
        this.emit("glow",e.x,e.y,e.z,big?1.15:.4,.09,0xfff0c8);
        this.emit("glow",e.x,e.y,e.z,big?.7:.22,.16,0xff8a32);
        for(let i=0;i<(big?12:7);i++)this.emit("spark",e.x,e.y,e.z,big?.11:.08,.28,0xffd7a0,this.r(big?12:8),Math.random()*(big?6:4),this.r(big?12:8),big?3:2.2);
        this.emit("smoke",e.x,e.y,e.z,big?.8:.45,.6,0x7d7c74);
        if(big)this.later(.08,()=>{for(let i=0;i<4;i++)this.emit("smoke",e.x,e.y,e.z,.55,.9,0x4a4b46,this.r(1),1.2,this.r(1));});
      }else for(let i=0;i<5;i++)this.emit("dust",e.x,e.y,e.z,e.visual==="sabot"?.75:.28,.4,0xb5a688,this.r(4),Math.random()*2.5,this.r(4));
      return;
    }
    const heavy=HEAVY.includes(e.visual??""),missile=["sam","atgm","aam","manpad","rpg","rocket","naval-sam"].includes(e.visual??"");
    const size=heavy?3.15:e.visual==="mortar"?1.75:missile?2.15:e.result==="penetration"?.85:1.35;
    this.explode(e.x,e.y,e.z,size,e.result==="airburst");
  }
  private splash(x:number,y:number,z:number,scale:number):void{
    this.emit("glow",x,y,z,1.4*scale,.1,0xe9fbff);
    for(let i=0;i<20;i++)this.emit("dust",x,y,z,.4*scale,.9,0xd7f3f7,this.r(7*scale),3+Math.random()*13*scale,this.r(7*scale),6);
    for(let i=0;i<8;i++)this.emit("vapor",x,y+.3,z,.9*scale,1.25,0xeef8f8,this.r(2),1.4,this.r(2));
    this.ring(x,y,z,2.2*scale,.5,0xd2f0f4);
    this.later(.1,()=>this.ring(x,y,z,5.4*scale,.85,0x9ecfd8));
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
      if(!bomb&&key!=="torpedo"){
        const flame=new THREE.Group();flame.name="MotorFlame";flame.position.z=-length*.5-.28;
        const outer=new THREE.Mesh(new THREE.ConeGeometry(radius*2.4,.95,8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff6a1a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
        const mid=new THREE.Mesh(new THREE.ConeGeometry(radius*1.35,.62,7).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffb03a,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
        const core=new THREE.Mesh(new THREE.ConeGeometry(radius*.7,.4,6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xfff6df,toneMapped:false}));
        core.position.z=.16;mid.position.z=.05;flame.add(outer,mid,core);group.add(flame);
      }
    }else {
      const tracer=p.weapon==="bullet"||["autocannon","flak","sabot"].includes(key),length=key==="sabot"?4.6:key==="howitzer"?3.2:key==="sniper"?2.6:tracer?2.05:.8;
      group.add(new THREE.Mesh(new THREE.BoxGeometry(key==="sabot"?.055:.038,.038,length),new THREE.MeshBasicMaterial({color:tracer?0xfff0c2:0xe4dcc8,toneMapped:false})));
      if(tracer||key==="howitzer"||key==="mortar")group.add(new THREE.Mesh(new THREE.BoxGeometry(key==="sabot"?.16:.1,key==="sabot"?.16:.1,length*1.25),new THREE.MeshBasicMaterial({color:key==="sabot"?0xff7a24:0xffc15a,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));
    }
    if(p.weapon==="cannon"&&["sabot","autocannon","flak"].includes(key)){
      group.add(new THREE.Mesh(new THREE.BoxGeometry(.14,.14,key==="sabot"?4.8:2.2),new THREE.MeshBasicMaterial({color:0xff9a3c,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));
    }
    this.models.set(key,group);return group.clone(true);
  }
  syncProjectiles(world:World,alpha:number):void {
    this.seen.clear();
    this.camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
    for(const p of world.projectiles){
      this.seen.add(p.id);const visible=p.team===world.playerTeam||world.vision.isVisible(world.playerTeam,p.x,p.z);
      let shell=this.shells.get(p.id);if(!visible){if(shell){shell.group.visible=false;shell.lastX=p.x;shell.lastY=p.y;shell.lastZ=p.z;}continue;}
      if(!shell){shell={group:this.projectileModel(p),lastX:p.px??p.x,lastY:p.py??p.y,lastZ:p.pz??p.z};shell.flame=shell.group.getObjectByName("MotorFlame");this.scene.add(shell.group);this.shells.set(p.id,shell);}
      const m=shell.group;m.visible=true;
      const x=(p.px??p.x)+(p.x-(p.px??p.x))*alpha,y=(p.py??p.y)+(p.y-(p.py??p.y))*alpha,z=(p.pz??p.z)+(p.z-(p.pz??p.z))*alpha;
      if(!this.frustum.containsPoint(this.point.set(x,y,z))){m.visible=false;shell.lastX=x;shell.lastY=y;shell.lastZ=z;continue;}
      if(shell.flame){const throttle=(p.age??0)<(p.boostTime??0)?1.85:(p.speed<(p.maxSpeed??p.speed)*.9?1.05:.5);const flick=.78+Math.random()*.44;shell.flame.scale.set(flick,flick,throttle*flick);}
      const distanceScale=Math.min(effects.missileVisual.maximumDistanceScale,Math.max(1,this.camera.position.distanceTo(this.point.set(x,y,z))/effects.missileVisual.distanceReference));
      m.scale.setScalar(p.weapon==="missile"?effects.missileVisual.bodyScale*distanceScale:1);
      m.position.set(x,y,z);this.direction.set(p.vx,p.vy,p.vz).normalize();m.lookAt(x+this.direction.x,y+this.direction.y,z+this.direction.z);
      if(p.visual==="torpedo"){this.emit("vapor",x,y+.15,z,.28,.55,0xd5efef,0,.15,0);this.emit("dust",x,y+.05,z,.18,.35,0xc5e4e2,0,.05,0);}
      else if(p.weapon==="missile"||p.weapon==="cannon"||["howitzer","mortar","sabot","autocannon"].includes(p.visual??"")){
        const rocket=p.weapon==="missile",trail=rocket?effects.trails.missile:effects.trails.shell;
        const points=sampleProjectileTrail({x:shell.lastX,y:shell.lastY,z:shell.lastZ},{x,y,z},trail.spacing,trail.maxSamples);
        const heavy=["sam","naval-sam","mlrs","cruise","anti-ship"].includes(p.visual??"");
        for(const point of points)this.emit(rocket?"vapor":"smoke",point.x,point.y,point.z,trail.size*(heavy?1.45:1),trail.life,trail.color,this.r(.35),rocket?.7:.16,this.r(.25));
        if(points.length){
          const last=points.at(-1)!;shell.lastX=last.x;shell.lastY=last.y;shell.lastZ=last.z;
          if(rocket){
            this.emit("glow",x-this.direction.x*.8,y-this.direction.y*.8,z-this.direction.z*.8,.42,.09,0xffb03a);
            if(Math.random()<.65)this.emit("spark",last.x,last.y,last.z,.07,.2,0xffe2aa,this.r(1.4),this.r(.5),this.r(1.4),2.4);
          }else if(p.visual==="sabot"||p.visual==="howitzer")this.emit("glow",last.x,last.y,last.z,p.visual==="sabot"?.26:.16,.05,0xffd9a6);
        }
        if(rocket&&(p.age??0)<Math.max(2.4,p.boostTime??0))this.emit("glow",x-this.direction.x*.55,y-this.direction.y*.55,z-this.direction.z*.55,.22,.08,0xfff0c0);
      }
    }
    for(const [id,s]of this.shells)if(!this.seen.has(id)){this.scene.remove(s.group);this.shells.delete(id);}
  }
  ping(x:number,z:number,color:number):void {this.ring(x,heightAt(x,z)+.15,z,3.4,.75,color);this.emit("glow",x,heightAt(x,z)+.4,z,.8,.25,color);}
  private ring(x:number,y:number,z:number,size:number,life:number,color:number):void {
    if(this.rings.length>=48)return;
    const mesh=new THREE.Mesh(this.ringGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));mesh.position.set(x,y,z);this.scene.add(mesh);this.rings.push({mesh,size,life,t:0});
  }
  private scorch(x:number,z:number,size:number):void{
    if(this.rings.length>=48)return;
    const mesh=new THREE.Mesh(this.scorchGeometry,new THREE.MeshBasicMaterial({color:0x1a140e,transparent:true,opacity:.5,depthWrite:false}));
    mesh.position.set(x,heightAt(x,z)+.08,z);this.scene.add(mesh);this.rings.push({mesh,size,life:7,t:0,hold:true});
  }
  update(dt:number):void {
    for(let i=this.bursts.length-1;i>=0;i--){const b=this.bursts[i];b.t+=dt;if(b.t<b.delay)continue;this.bursts.splice(i,1);b.run();}
    for(const [kind,pool]of Object.entries(this.pools)){
      for(let i=pool.particles.length-1;i>=0;i--){const p=pool.particles[i];p.t+=dt;if(p.t>=p.life){pool.particles[i]=pool.particles[pool.particles.length-1];pool.particles.pop();continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy+=(kind==="smoke"||kind==="vapor"?.25:-3)*dt;p.vx*=kind==="spark"?.985:1;p.vz*=kind==="spark"?.985:1;
      }
      pool.mesh.count=pool.particles.length;
      pool.particles.forEach((p,i)=>{const k=p.t/p.life,size=p.size*(kind==="smoke"||kind==="vapor"||kind==="dust"?.6+k*2.5:1-k*.55);
        this.dummy.position.set(p.x,p.y,p.z);this.dummy.quaternion.copy(this.camera.quaternion);this.dummy.scale.set(size*p.stretch,size,1);this.dummy.updateMatrix();pool.mesh.setMatrixAt(i,this.dummy.matrix);
        this.color.setHex(p.color);pool.mesh.setColorAt(i,this.color);pool.fade.setX(i,Math.sin(Math.min(1,k*5)*Math.PI/2)*(1-k)*(kind==="smoke"?.5:kind==="vapor"?.64:1));
      });
      pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;pool.fade.needsUpdate=true;
    }
    for(let i=this.rings.length-1;i>=0;i--){
      const r=this.rings[i];r.t+=dt;const k=r.t/r.life;if(k>=1){this.scene.remove(r.mesh);(r.mesh.material as THREE.Material).dispose();this.rings.splice(i,1);continue;}
      const mat=r.mesh.material as THREE.MeshBasicMaterial;
      if(r.hold){r.mesh.scale.setScalar(r.size*(.85+.15*Math.min(1,k*4)));mat.opacity=(k<.15?k/.15:1-(k-.15)/.85)*.42;}
      else{r.mesh.scale.setScalar(.2+r.size*Math.pow(k,.72));mat.opacity=(1-k)*.8;}
    }
  }
  private explode(x:number,y:number,z:number,size:number,air:boolean,death=false):void {
    const ground=heightAt(x,z),near=!air&&y-ground<6;
    this.emit("glow",x,y,z,size*2.8,.09,0xfff8ea,0,0,0,1.1);
    this.emit("glow",x,y,z,size*1.7,.18,0xffc15a,0,0,0,1);
    this.emit("glow",x,y+.15,z,size*.85,.28,0xff5c16,0,size*.5,0);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,sp=size*(2.2+Math.random()*4);this.emit("spark",x,y,z,.07+Math.random()*.06,.4+Math.random()*.28,i%3?0xffe2a4:0xfff7d8,Math.cos(a)*sp,(Math.random()-.15)*size*6,Math.sin(a)*sp,3.4);}
    for(let i=0;i<9;i++)this.emit("glow",x,y,z,.3+Math.random()*size*.45,.32+Math.random()*.22,0xff7a28,this.r(size*3.2),1.2+Math.random()*size*2.4,this.r(size*3.2));
    if(near){
      this.ring(x,ground+.22,z,size*2.4,.36,0xffe6b8);
      this.later(.06,()=>this.ring(x,ground+.16,z,size*6.2,.75,0xd7c39a));
      this.scorch(x,z,size*1.85);
      for(let i=0;i<16;i++){const a=i/16*Math.PI*2;this.emit("dust",x,ground+.3,z,.75+Math.random()*size*.4,.95,0xc2b08a,Math.cos(a)*size*8,.35+Math.random()*1.4,Math.sin(a)*size*8);}
    }
    this.later(.07,()=>{
      for(let i=0;i<10;i++)this.emit("glow",x,y,z,size*(.32+Math.random()*.45),.4,0xff4c12,this.r(size*2.2),1.4+Math.random()*size*2.2,this.r(size*2.2));
      for(let i=0;i<9;i++)this.emit(air?"smoke":"vapor",x,y,z,size*(.6+Math.random()*.55),1.2+Math.random()*.7,air?0x9a9b94:0xddd6c8,this.r(size*2.4),1.5+Math.random()*2.2,this.r(size*2.4));
    });
    this.later(.18,()=>{
      for(let i=0;i<12;i++)this.emit("smoke",x+this.r(size*.8),y,z+this.r(size*.8),size*(.75+Math.random()*.85),death?4.6:2.6,death?0x343632:0x6a6960,this.r(size*.7),1.6+Math.random()*2.4,this.r(size*.7));
      for(let i=0;i<6;i++)this.emit("spark",x,y+size*.25,z,.07,.6,0xffb15e,this.r(size*5),2+Math.random()*size*3,this.r(size*5),2.5);
    });
    if(death||size>1.55)this.later(.42,()=>{
      for(let i=0;i<7;i++)this.emit("smoke",x+this.r(size*.6),y+1,z+this.r(size*.6),size*(1.05+Math.random()*.6),death?5.5:3.4,0x2a2c28,this.r(.45),1.8+Math.random()*1.2,this.r(.45));
      this.emit("glow",x,y+1.4,z,size*.5,.45,0xff3c0c,0,1.6,0);
    });
  }
  private r(size:number):number{return(Math.random()-.5)*size;}
}

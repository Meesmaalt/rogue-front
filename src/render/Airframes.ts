import * as THREE from 'three';
import {airframeFor,type Airframe} from '../sim/airframes';
import type {FactionId} from '../sim/factions';
import type {Entity,UnitKind} from '../sim/types';
import {heightAt} from '../sim/heightmap';
import ops from '../data/aircraft-operations.json';
const templates=new Map<string,THREE.Group>();
function build(p:Airframe,faction:FactionId):THREE.Group {
 const g=new THREE.Group();g.userData.airframe=p.name;
 const skin=new THREE.MeshStandardMaterial({color:faction==='usa'?0x929e9d:faction==='russia'?0x8c9eaa:0x9aabb0,roughness:.7,metalness:.28,side:THREE.DoubleSide});
 const panel=new THREE.MeshStandardMaterial({color:faction==='russia'?0x6e8891:0x708486,roughness:.8,metalness:.2}),marking=new THREE.MeshStandardMaterial({color:faction==='usa'?0xd6dbd5:0xa54b43,roughness:.8});
 const dark=new THREE.MeshStandardMaterial({color:0x202b30,roughness:.6,metalness:.45}),glass=new THREE.MeshStandardMaterial({color:0x233e50,roughness:.17,metalness:.65}),steel=new THREE.MeshStandardMaterial({color:0x7f8581,metalness:.75,roughness:.4});
 marking.name='marking';skin.name='armor';
 const hot=new THREE.MeshBasicMaterial({color:0xffb569}),flame=new THREE.MeshBasicMaterial({color:0x82bfff,transparent:true,opacity:.55,depthWrite:false});
 const add=(geometry:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=g)=>{const o=new THREE.Mesh(geometry,m);o.position.set(x,y,z);parent.add(o);return o;};
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=skin,parent:THREE.Object3D=g)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ellipsoid=(w:number,h:number,d:number,x:number,y:number,z:number,m=skin)=>{const o=add(new THREE.SphereGeometry(1,16,10),m,x,y,z);o.scale.set(w,h,d);return o;};
 const plate=(points:number[][],y:number,m=skin,parent:THREE.Object3D=g)=>{const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:false});geo.rotateX(Math.PI/2);return add(geo,m,0,y,0,parent);};
 const L=p.length,W=p.width,S=p.span,cargo=p.style==='cargo',bodyY=cargo?3:1.45;
 if(cargo){
  // Open rear hold: side walls and crown surround a real floor, with no solid plug behind the ramp.
  ellipsoid(W*.5,1.8,L*.27,0,bodyY,L*.22); // forward fuselage only
  box(W, .18,L*.31,0,p.floor,-L*.22,steel);
  for(const side of [-1,1])box(.15,bodyY-p.floor,L*.3,side*(W/2-.08),(bodyY+p.floor)/2,-L*.22);
  const crown=add(new THREE.CylinderGeometry(W/2,W/2,L*.3,20,1,true,Math.PI/2,Math.PI),skin,0,bodyY,-L*.22);crown.rotation.x=Math.PI/2;
  const ramp=new THREE.Group();ramp.name='CargoRamp';ramp.userData.integrated=true;ramp.userData.airframeRamp=true;ramp.position.set(0,p.floor,-L*ops.cargo.rearFraction);g.add(ramp);
  const run=L*ops.cargo.rampFraction;
  box(W-.25,.16,run*.6,0,0,-run*.3,steel,ramp);
  const tip=new THREE.Group();tip.name='CargoRampTip';tip.position.z=-run*.6;ramp.add(tip);box(W-.25,.16,run*.4,0,0,-run*.2,steel,tip);tip.rotation.x=Math.PI;
  ramp.rotation.x=Math.PI/2;
  for(const side of [-1,1]){box(.08,.08,run*.6,side*(W/2-.25),.12,-run*.3,dark,ramp);box(.08,.08,run*.4,side*(W/2-.25),.12,-run*.2,dark,tip);}
  const upper=new THREE.Group();upper.name='CargoUpperDoor';upper.position.set(0,bodyY+W/2,-L*ops.cargo.rearFraction);g.add(upper);box(W-.2,.8,.15,0,-.4,0,skin,upper);
  ellipsoid(W*.4,1.1,L*.1,0,bodyY+.25,L*.38);
  for(const side of [-1,1]){const window=box(W*.22,.55,1.45,side*W*.31,bodyY+.7,L*.38,glass);window.rotation.y=side*.4;}
  if(faction==='russia')ellipsoid(W*.25,.6,L*.065,0,bodyY-.85,L*.44,glass);
 }else{
  ellipsoid(W*.5,.58,L*.44,0,bodyY,0);
  const nose=add(new THREE.ConeGeometry(W*.44,L*.23,12),skin,0,bodyY,L*.42);nose.rotation.x=Math.PI/2;
  const canopy=new THREE.Group();canopy.name='Canopy';canopy.position.set(0,bodyY+.35,L*.2);g.add(canopy);const c=add(new THREE.SphereGeometry(1,12,8),glass,0,.28,0,canopy);c.scale.set(W*.36,.47,L*.105);
  for(const side of [-1,1]){box(W*.3,.48,L*.17,side*W*.58,bodyY-.25,L*.03,dark);}
 }
 const wingY=cargo?4.15:bodyY,wingZ=cargo?L*.04:L*.03;
 for(const side of [-1,1]){
  plate([[side*W*.3,wingZ+L*.15],[side*S*.5,wingZ+L*.12-S*p.sweep*ops.visual.wingSweepFactor],[side*S*.48,wingZ-L*.01-S*p.sweep*ops.visual.wingSweepFactor],[side*W*.3,wingZ-L*.16]],wingY);
  plate([[side*W*.5,wingZ],[side*S*.42,wingZ-S*p.sweep*ops.visual.wingSweepFactor],[side*S*.42,wingZ-L*.035-S*p.sweep*ops.visual.wingSweepFactor],[side*W*.5,wingZ-L*.11]],wingY+.015,panel);
  const insignia=add(new THREE.CircleGeometry(cargo?.65:.2,12),marking,side*S*.34,wingY+.15,wingZ-S*p.sweep*.28);insignia.rotation.x=-Math.PI/2;
  const tailY=cargo?6.1:bodyY+.12,tailZ=-L*.38;
  plate([[0,tailZ+L*.08],[side*S*.22,tailZ],[side*S*.2,tailZ-L*.07],[0,tailZ-L*.09]],tailY);
  if(p.style==='flanker'||p.style==='stealth')plate([[side*W*.25,L*.27],[side*W*1.3,L*.04],[side*W*.5,-L*.1]],bodyY+.17);
  if(p.style==='canard')plate([[side*W*.4,L*.27],[side*S*.19,L*.18],[side*W*.4,L*.13]],bodyY+.1);
  if(cargo&&faction==='usa'){const tip=box(.1,1.25,.85,side*S*.49,wingY+.55,wingZ+L*.05-S*p.sweep*ops.visual.wingSweepFactor);tip.rotation.z=-side*.24;}
 }
 for(let i=0;i<p.tails;i++){
  const fin=new THREE.Group();fin.position.set(p.tails===2?(i?1:-1)*W*.62:0,cargo?3.7:bodyY,-L*.34);fin.rotation.z=p.style==='stealth'||p.style==='canard'?(i?-.27:.27):0;g.add(fin);
  const shape=new THREE.Shape();shape.moveTo(0,L*.06);shape.lineTo(cargo?3.3:1.65,-L*.035);shape.lineTo(cargo?3.1:1.5,-L*.12);shape.lineTo(0,-L*.1);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false});geo.applyMatrix4(new THREE.Matrix4().set(0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1));add(geo,skin,0,0,0,fin);
 }
 for(let i=0;i<p.engines;i++){
  const side=i%2?1:-1,rank=Math.floor(i/2),rear=p.style==='attack'&&faction==='usa';
  const underwing=p.engines===4&&!cargo,wingroot=p.name==='H-6K';
  const x=cargo?side*S*(.21+rank*.14):underwing?side*W*(1+rank*.5):wingroot?side*W*.8:rear?side*W*.95:p.engines===1?0:side*W*.38;
  const y=cargo?wingY-1.2:underwing?bodyY-.65:rear?bodyY+.45:bodyY,z=cargo?wingZ-L*.025:underwing?-L*.09:wingroot?0:rear?-L*.23:-L*.34;
  const radius=cargo?.88:p.engines===1?W*.34:W*.24,length=cargo?L*.13:L*.18;
  if(cargo)box(.22,1,.6,x,wingY-.4,z);
  const nacelle=add(new THREE.CylinderGeometry(radius,radius*.84,length,16,1,true),skin,x,y,z);nacelle.rotation.x=Math.PI/2;
  const intake=add(new THREE.CylinderGeometry(radius*.82,radius*.82,.08,16),dark,x,y,z+length*.5);intake.rotation.x=Math.PI/2;
  const fan=new THREE.Group();fan.name='EngineFan';fan.position.set(x,y,z+length*.51);g.add(fan);
  for(let blade=0;blade<8;blade++){const b=box(radius*.13,radius*1.4,.06,0,0,0,steel,fan);b.rotation.z=blade*Math.PI/4;}
  const core=add(new THREE.CircleGeometry(radius*.67,14),hot,x,y,z-length*.51);core.rotation.y=Math.PI;core.name='EngineGlow';
  const plume=add(new THREE.ConeGeometry(radius*.65,ops.visual.flameLength,12,1,true),flame,x,y,z-length*.52);plume.rotation.x=-Math.PI/2;plume.name='JetExhaust';plume.userData.heavy=cargo;
 }
 const gear=new THREE.Group();gear.name='LandingGear';g.add(gear);
 const wheels=cargo?4:2;
 for(const side of [-1,1])for(let i=0;i<wheels;i++){const x=side*(cargo?W*.65:W*.67),z=-L*.12-i*.5;box(.13,.85,.13,x,.8,z,steel,gear);const tyre=add(new THREE.CylinderGeometry(cargo?.45:.25,cargo?.45:.25,.22,10),dark,x,.4,z,gear);tyre.rotation.z=Math.PI/2;}
 box(.12,.9,.12,0,.85,L*.25,steel,gear);const tyre=add(new THREE.CylinderGeometry(cargo?.4:.24,cargo?.4:.24,.25,10),dark,0,.4,L*.25,gear);tyre.rotation.z=Math.PI/2;
 if(p.style==='attack'&&faction==='usa'){const gun=add(new THREE.CylinderGeometry(.1,.1,.65,8),dark,-.15,bodyY-.25,L*.51);gun.rotation.x=Math.PI/2;}
 const pilot=new THREE.Group();pilot.name='Aircrew';pilot.visible=false;g.add(pilot);
 for(let i=0;i<(cargo?ops.cargo.crewCount:1);i++){
  const man=new THREE.Group();man.position.x=i*.8;pilot.add(man);box(.45,.62,.26,0,1.08,0,dark,man);add(new THREE.SphereGeometry(.18,8,6),skin,0,1.6,0,man);
  for(const side of [-1,1]){const leg=box(.15,.65,.17,side*.13,.43,0,dark,man);leg.name=side===1?'PilotLegR':'PilotLegL';box(.12,.58,.15,side*.3,1.04,0,skin,man);}
 }
 g.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.userData.sharedArt=true;for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData.sharedArt=true;}});
 return g;
}
export function createAirframe(kind:UnitKind,faction:FactionId):THREE.Group|null {
 const p=airframeFor(faction,kind);if(!p)return null;const key=`${faction}/${kind}`;let template=templates.get(key);if(!template){template=build(p,faction);templates.set(key,template);}return template.clone(true);
}
export function updateAirframe(g:THREE.Object3D,e:Entity,time:number,faction:FactionId):void {
 if(!airframeFor(faction,e.kind))return;const start=e.airStart;
 const power=start&&start.phase!=='ready'?(start.phase==='ignition'?Math.min(1,start.progress/ops.startup.ignitionSeconds):0):e.airState==='grounded'||e.airState==='rearming'?0:e.airTaxiPhase==='runway'||e.airState==='airborne'?1:.25;
 g.traverse(o=>{
  if(o.name==='CargoRamp'&&o.userData.airframeRamp)o.rotation.x=Math.PI/2-(Math.PI/2+.28)*(e.cargoDoor??0);
  if(o.name==='CargoRampTip')o.rotation.x=Math.PI*(1-(e.cargoDoor??0));
  if(o.name==='CargoUpperDoor')o.rotation.x=(e.cargoDoor??0)*1.1;
  if(o.name==='Canopy')o.rotation.z=start&&(start.phase==='crew'||start.phase==='boarding')?-.65:0;
  if(o.name==='EngineGlow')o.visible=power>.05;
  if(o.name==='EngineFan')o.rotation.z=time*power*12;
  if(o.name==='JetExhaust'){o.visible=power>.1;o.scale.y=(o.userData.heavy?ops.visual.heavyFlameFraction:1)*power*(.85+.15*Math.sin(time*43+e.id));}
  if(o.name==='Aircrew'){
   o.visible=!!start&&(start.phase==='crew'||start.phase==='boarding');if(!start||!o.visible)return;
   const t=start.phase==='crew'?Math.min(1,start.progress/start.runSeconds):1,x=start.from.x+(start.target.x-start.from.x)*t,z=start.from.z+(start.target.z-start.from.z)*t,dx=x-e.x,dz=z-e.z,scale=e.def.modelScale??1;
   o.position.set((Math.cos(e.heading)*dx-Math.sin(e.heading)*dz)/scale,(heightAt(x,z)-e.y+(start.phase==='boarding'?start.progress/ops.startup.boardingSeconds*1.7:0))/scale,(Math.sin(e.heading)*dx+Math.cos(e.heading)*dz)/scale);o.rotation.y=Math.atan2(start.target.x-start.from.x,start.target.z-start.from.z)-e.heading;
  }
  if(o.name==='PilotLegL'||o.name==='PilotLegR')o.rotation.x=Math.sin(time*13)*(o.name==='PilotLegR'?-1:1)*.55;
 });
}

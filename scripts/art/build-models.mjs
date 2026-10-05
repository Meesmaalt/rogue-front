/** Original Rogue Front art. Rebuild with npm run art:build. +Z is forward.
 * Each platform has authored dimensions, silhouettes and equipment. Export
 * batches static surfaces by material, preserving weapon/rotor pivots. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const loadouts=JSON.parse(await readFile(new URL('../../src/data/faction-loadouts.json',import.meta.url),'utf8'));

// GLTFExporter only needs FileReader for binary geometry (no browser canvas).
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result=buffer; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }); }
};
const out = new URL('../../public/models/art/', import.meta.url);
const palettes = {usa:[0xb3a17a,0x665f4b],russia:[0x78845a,0x384436],china:[0x778574,0x45554e]};
let mats;
let detail = true;
function mesh(parent,geo,material,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
  if(!detail && (geo.parameters?.radius < .08 || (geo.parameters?.width < .11 && geo.parameters?.height < .11))) { geo.dispose(); return new T.Object3D(); }
  const m=new T.Mesh(geo,mats[material]);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);parent.add(m);return m;
}
function box(p,w,h,d,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
function cyl(p,r,h,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,n=12){return mesh(p,new T.CylinderGeometry(r,r,h,n),m,x,y,z,rx,ry,rz);}
function sphere(p,r,m,x,y,z,sx=1,sy=1,sz=1){const q=mesh(p,new T.SphereGeometry(r,detail?16:8,detail?10:5),m,x,y,z);q.scale.set(sx,sy,sz);return q;}
// Eight sided cross-sections: beveled, sloped upper armour, not box primitives.
function loft(p,rings,m) {
  const vertices=[],indices=[];
  for(const [z,w,b,t,k=.72] of rings){ const points=[[-w*.42,b],[-w*.5,b+.12],[-w*.5,t-.18],[-w*k*.5,t],[w*k*.5,t],[w*.5,t-.18],[w*.5,b+.12],[w*.42,b]];for(const [x,y]of points)vertices.push(x,y,z); }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<8;i++){const a=r*8+i,b=r*8+(i+1)%8,c=b+8,d=a+8;indices.push(a,b,d,b,c,d);}
  for(let i=1;i<7;i++){indices.push(0,i+1,i);const end=(rings.length-1)*8;indices.push(end,end+i,end+i+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];g.setIndex(indices);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return mesh(p,flat,m);
}
function group(p,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);p.add(g);return g;}
function optic(p,x,y,z,w=.22){box(p,w,.18,.2,'glass',x,y,z);box(p,w+.08,.07,.27,'dark',x,y-.1,z);}
function antenna(p,x,y,z,h=1.1){cyl(p,.024,h,'dark',x,y+h/2,z,0,0,0,5);}
function hatch(p,x,y,z,r=.34){cyl(p,r,.085,'trim',x,y,z);box(p,.14,.045,.2,'steel',x,y+.06,z);}
function gun(p,len,r=.095,y=.12,z=.8,x=0,elev=0){const g=group(p,'Gun',x,y,z);g.rotation.x=-elev;cyl(g,r,len,'steel',0,0,len/2,Math.PI/2);cyl(g,r*1.5,.18,'trim',0,0,len*.38,Math.PI/2);cyl(g,r*1.25,.24,'dark',0,0,len,Math.PI/2);return g;}
function tires(p,width,length,count=4,r=.5){for(const side of [-1,1])for(let i=0;i<count;i++){const z=-length*.36+i*(length*.72/(count-1));const x=side*width/2;cyl(p,r,.34,'rubber',x,r,z,0,0,Math.PI/2,16);cyl(p,r*.58,.37,'trim',x,r,z,0,0,Math.PI/2);cyl(p,r*.18,.39,'steel',x,r,z,0,0,Math.PI/2);}}
function tracks(p,width,length,r=.43){
  for(const s of [-1,1]){
    // Continuous rounded track belt, with individual running wheels and shoes.
    const shape=new T.Shape();const l=length/2-r;shape.moveTo(-l,r*.04);shape.lineTo(l,r*.04);shape.absarc(l,r,r*.96,-Math.PI/2,Math.PI/2,false);shape.lineTo(-l,r*1.96);shape.absarc(-l,r,r*.96,Math.PI/2,Math.PI*1.5,false);
    const hole=new T.Path();hole.moveTo(-l,r*.29);hole.absarc(-l,r,r*.71,-Math.PI/2,Math.PI/2,true);hole.lineTo(l,r*1.71);hole.absarc(l,r,r*.71,Math.PI/2,-Math.PI/2,true);hole.lineTo(-l,r*.29);shape.holes.push(hole);
    const geo=new T.ExtrudeGeometry(shape,{depth:.39,bevelEnabled:false,curveSegments:detail?8:4});mesh(p,geo,'rubber',s*width/2-.2,0,0,0,Math.PI/2);
    const count=detail?7:5;for(let i=0;i<count;i++){const z=-l+i*l*2/(count-1);cyl(p,r*.74,.46,'trim',s*width/2,r,z,0,0,Math.PI/2);cyl(p,r*.28,.49,'steel',s*width/2,r,z,0,0,Math.PI/2);for(let b=0;b<(detail?5:0);b++){const a=b*Math.PI*2/5;cyl(p,.026,.51,'dark',s*width/2,r+Math.sin(a)*r*.48,z+Math.cos(a)*r*.48,0,0,Math.PI/2,5);}}
    for(let i=0;i<(detail?22:0);i++){const z=-l+i*l*2/21;box(p,.49,.065,.12,'steel',s*width/2,r*.05,z);box(p,.49,.065,.12,'steel',s*width/2,r*1.95,z);}
  }
}
function fittings(p,w,l,y){
  // Engine grilles, towing eyes, lamps, smoke launchers, spare equipment.
  for(let i=0;i<9;i++)box(p,w*.55,.035,.065,'dark',0,y,-l*.32+i*.085);
  for(const s of [-1,1]){box(p,.2,.13,.12,'lamp',s*w*.36,y-.24,l*.43);box(p,.22,.12,.14,'dark',s*w*.29,.42,l*.46);box(p,.18,.1,.11,'red',s*w*.38,y-.2,-l*.46);}
  box(p,.72,.36,.6,'stowage',w*.26,y+.16,-l*.28);box(p,.06,.39,.63,'dark',w*.26,y+.16,-l*.28);antenna(p,-w*.35,y,-l*.2);
}
function armorPanels(p,w,l,y,f){for(const s of [-1,1])for(let i=0;i<6;i++)box(p,.16,.49,l*.12,'armor',s*w/2,y,-l*.37+i*l*.145,0,0,s*.12);if(f!=='usa')for(const s of [-1,1])for(let i=0;i<4;i++)box(p,.44,.16,.36,'trim',s*(.3+i*.25),y+.4,l*.37,-.3);}
function tank(f,kind){const root=new T.Group();const light=kind==='lightTank';const w=light?2.5:3.25,l=light?4.6:f==='usa'?5.4:5.05;tracks(root,w,l,light?.38:.45);loft(root,[[-l/2,w*.84,.62,1.38],[0,w,.58,1.55],[l*.29,w,.57,1.48],[l/2,w*.78,.78,.98]],'armor');armorPanels(root,w+.25,l,1.16,f);fittings(root,w,l,1.55);
  const turret=group(root,'Turret',0,1.5,-.15);if(f==='russia') {loft(turret,[[-1.25,1.8,0,.62],[-.7,2.5,0,.74],[.35,2.65,0,.64],[1.05,1.3,.12,.48]],'armor');for(const s of [-1,1])for(let i=0;i<4;i++)box(turret,.48,.28,.4,'trim',s*(.5+i*.2),.27,.8-i*.16,0,s*.45);}
  else if(f==='china'){loft(turret,[[-1.4,2.5,0,.65],[-.5,2.75,0,.85],[.7,2.8,.08,.65],[1.3,1.15,.12,.4]],'armor');for(const s of[-1,1])for(let i=0;i<5;i++)box(turret,.48,.22,.48,'trim',s*(.4+i*.2),.51,1-i*.16,-.24,s*.35);}
  else loft(turret,[[-1.55,2.6,0,.76],[-.4,2.85,0,.91],[.8,2.45,0,.62],[1.28,1.3,.16,.48]],'armor');
  box(turret,2.4,.14,.9,'dark',0,.48,-1.25);for(const s of [-1,1]){box(turret,.07,.55,.85,'steel',s*1.23,.54,-1.25);for(let i=0;i<4;i++)cyl(turret,.06,.22,'dark',s*1.05,.42,.1+i*.16,.9,0,s*.45,6);}
  hatch(turret,-.52,.85,-.35);hatch(turret,.58,.83,-.5,.24);cyl(turret,.2,.25,'dark',.64,1,-.48);optic(turret,.64,1.1,-.3);optic(turret,-.25,.67,.75,.28);gun(turret,light?2.65:3.6,light?.07:.1,.35,1.04);gun(turret,.72,.025,1,-.18,-.62);
  armoredDetail(root,turret,w,l,f);if(light)turret.scale.set(.82,.85,.82);return root;}
function armored(f,kind){const p=new T.Group();const recon=kind==='reconVehicle',td=kind==='tankDestroyer',ifv=kind==='ifv';const wheeled=!ifv&&(f!=='russia'||kind!=='tankDestroyer');const small=f==='russia'&&recon;const w=small?2.25:2.8,l=small?4.15:5.2;
  if(wheeled)tires(p,w,l,small?2:4,.46);else tracks(p,w,l,.38);
  const h=f==='russia'?1.6:1.95;loft(p,[[-l/2,w*.8,.62,h-.1],[-l*.25,w,.53,h],[l*.2,w,.54,h],[l/2,w*.72,.82,h-.48]],'armor');fittings(p,w,l,h);hatch(p,-.65,h+.06,.75,.26);
  box(p,1.3,.65,.06,'trim',0,1.15,-l/2-.015);for(let i=0;i<3;i++)optic(p,-.55+i*.5,h-.17,l*.3,.2);
  const t=group(p,'Turret',0,h,-.05);if(recon){cyl(t,.05,1.25,'steel',-.4,.65,-.35);box(t,.55,.35,.4,'trim',-.4,1.35,-.35);optic(t,-.4,1.35,-.12,.4);antenna(p,.9,h,-1.2,1.7);gun(t,f==='china'?1.45:.9,f==='china'?.055:.035,.3,.4,.25);box(t,.5,.28,.4,'armor',.25,.3,.05);}
  else if(td){box(t,1.4,.36,1.1,'dark',0,.3,0);for(const s of[-1,1])for(const y of[.16,.43])cyl(t,.13,1.25,'trim',s*.4,y,.2,Math.PI/2);}
  else{loft(t,[[-.65,1.05,0,.55],[.3,1.15,0,.5],[.65,.7,.1,.3]],'armor');gun(t,ifv||f!=='usa'?1.65:.95,ifv||f!=='usa'?.055:.035,.3,.45);hatch(t,-.2,.57,-.15,.2);
    if(ifv&&f==='russia')gun(t,1.75,.085,.3,.45,-.16);
    else if(ifv){const rack=group(t,'WeaponRack',-.82,.3,0);box(rack,.4,.48,.95,'trim');for(const y of[-.13,.13]){cyl(rack,.095,1.05,'steel',0,y,0,Math.PI/2);cyl(rack,.076,.045,'dark',0,y,.54,Math.PI/2);}}}
  armoredDetail(p,t,w,l,f);return p;}
function truck(f,kind){const p=new T.Group(),l=kind==='mlrs'?6.7:6.1,w=2.45;tires(p,w,l,kind==='mlrs'?4:3,.48);box(p,w*.76,.32,l,'dark',0,.73,0);
  loft(p,[[l*.07,w,.7,2.4],[l*.3,w,.7,2.4],[l*.46,w*.9,.85,1.85]],'armor');box(p,1.9,.64,.045,'glass',0,1.94,l*.385,-.36);for(const s of[-1,1])box(p,.035,.54,.8,'glass',s*w*.48,1.9,l*.23);fittings(p,w,l,1.1);
  if(kind==='logiTruck'){box(p,w*.92,1.15,l*.55,'stowage',0,1.6,-l*.21);for(const z of[-2,-1,0])box(p,w*.95,.055,.055,'dark',0,2.19,z);box(p,w*.95,.75,.12,'trim',0,1.26,-l*.49);}
  return p;}
function artillery(f,kind){if(kind==='mlrs'&&f!=='usa'){const p=truck(f,kind),t=group(p,'Turret',0,1.47,-1.25),rack=group(t,'Launcher',0,.55,0);rack.rotation.x=-.35;box(rack,2.2,.22,2.6,'steel');for(let i=0;i<3;i++)for(let j=0;j<4;j++)cyl(rack,.21,2.8,'trim',-.77+j*.51,.25+i*.46,0,Math.PI/2);return p;}
  const p=new T.Group(),l=f==='russia'?5.8:5.4,w=2.95;tracks(p,w,l,.42);loft(p,[[-l/2,w*.9,.65,1.42],[l*.27,w,.6,1.46],[l/2,w*.7,.85,1.1]],'armor');armorPanels(p,w+.1,l,1.08,f);fittings(p,w,l,1.44);const t=group(p,'Turret',0,1.44,-.25);
  if(kind==='mlrs'){const rack=group(t,'Launcher',0,.6,-.25);rack.rotation.x=-.25;for(const s of[-1,1]){box(rack,1.15,1.22,2.9,'armor',s*.64,.3,0);for(let i=0;i<2;i++)for(let j=0;j<3;j++)cyl(rack,.13,.06,'dark',s*.64-.32+j*.32,.02+i*.52,1.49,Math.PI/2);} }
  else{loft(t,[[-1.65,2.55,0,1.25],[.65,2.65,0,1.3],[1.12,1.72,.15,1.1]],'armor');hatch(t,-.55,1.33,-.4);optic(t,.5,1.24,.92);gun(t,f==='russia'?4.6:3.8,.12,.5,1,-0,-.16);for(const s of[-1,1])box(t,.4,.7,.65,'stowage',s*1.36,.57,-1);}
  return p;}
function spaa(f){const p=f==='usa'?armored(f,'apc'):f==='russia'?truck(f,'spaa'):armored(f,'ifv');const old=p.getObjectByName('Turret');old?.removeFromParent();const t=group(p,'Turret',0,f==='russia'?1.6:1.9,-.4);box(t,1.45,.75,1.4,'armor',0,.36,0);for(const s of[-1,1]){gun(t,1.55,.047,.42,.48,s*.83);const rack=group(t,'WeaponRack',s*.95,.92,.15);for(let i=0;i<(f==='russia'?4:2);i++){const y=f==='russia'?Math.floor(i/2)*.25:0,x=s*(i%2)*.23;cyl(rack,.11,1.25,'trim',x,y,0,Math.PI/2);cyl(rack,.086,.04,'dark',x,y,.65,Math.PI/2);}}
  cyl(t,.08,.75,'steel',0,1.1,-.25);const radar=mesh(t,new T.SphereGeometry(.53,14,8,0,Math.PI*2,0,Math.PI/2),'dark',0,1.55,-.25,Math.PI/2);radar.scale.z=.24;return p;}
function wing(p,points,y,m='armor',th=.085){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:th,bevelEnabled:false});g.rotateX(-Math.PI/2);return mesh(p,g,m,0,y,0);}
function jet(f,kind){const p=new T.Group();const twin=f==='russia'||kind==='interceptor'||kind==='ecm',attack=kind==='attackAircraft',cargo=kind==='cargoPlane',bomb=kind==='bomber';const length=cargo?10:bomb?10.5:7.5,w=cargo?1.75:bomb?1.3:1.05;const y=1.08;
  loft(p,[[-length*.48,w*.7,y-.3,y+.4],[-length*.3,w*1.2,y-.35,y+.65],[length*.13,w,y-.35,y+.6],[length*.36,w*.6,y-.1,y+.27],[length*.53,.08,y+.03,y+.14]],'armor');
  sphere(p,.52,'glass',0,y+.58,length*.17,.69,.68,1.68);box(p,.04,.075,1.4,'trim',0,y+.86,length*.18);
  const span=cargo?6:attack?4.25:bomb?4.1:f==='china'?3.6:3.25;const forward=f==='china'&&!twin;
  for(const s of[-1,1]){wing(p,[[s*.38,length*.17],[s*span,forward?-1.35:-1.8],[s*span,-2.4],[s*.55,-2.5]],y);wing(p,[[s*.24,-length*.32],[s*1.5,-length*.43],[s*1.45,-length*.52],[s*.2,-length*.48]],y+.3);if(forward)wing(p,[[s*.38,2.2],[s*1.1,1.35],[s*.3,1.35]],y+.1);
    if(!cargo){for(const k of[.5,.8]){const x=s*span*k;cyl(p,.055,.95,'steel',x,y-.18,-1.1,Math.PI/2);cyl(p,.055,.14,'lamp',x,y-.18,-.55,Math.PI/2);wing(p,[[x-.12,-1.4],[x+.12,-1.4],[x,-1.65]],y-.13);}}
  }
  for(const s of twin?[-1,1]:[0]){sphere(p,.34,'trim',s*.53,y-.22,.35,.92,.73,1.8);cyl(p,.21,.04,'dark',s*.53,y-.24,.96,Math.PI/2);}
  const tail=twin?[-.55,.55]:[0];for(const x of tail){const fin=wing(p,[[0,-length*.35],[1.25,-length*.46],[1.35,-length*.56],[0,-length*.49]],0);fin.rotation.z=Math.PI/2;fin.position.set(x,y+.3,0);cyl(p,.28,.52,'dark',x,y+.03,-length*.48,Math.PI/2);mesh(p,new T.TorusGeometry(.215,.065,5,14),'steel',x,y+.03,-length*.515);cyl(p,.14,.035,'dark',x,y+.03,-length*.518,Math.PI/2);}
  if(cargo)for(const s of[-1,1])for(const x of[2.1,3.9]){loft(p,[[-1.3,.6,.66,1.3],[.7,.65,.66,1.3],[1.15,.44,.75,1.2]],'trim').position.x=s*x;cyl(p,.25,.04,'dark',s*x,1,1.17,Math.PI/2);}
  const gear=group(p,'LandingGear');for(const [x,z]of[[0,2],[-.7,-1.4],[.7,-1.4]]){cyl(gear,.045,.7,'steel',x,.64,z);cyl(gear,.18,.12,'rubber',x,.27,z,0,0,Math.PI/2);}
  return p;}
function helicopter(f,kind){const p=new T.Group(),transport=kind==='transport',coax=f==='russia'&&kind==='heli',tandem=transport&&f==='usa';const w=transport?1.9:coax?1.55:.85,l=transport?6.8:4.6;
  loft(p,[[-l*.45,w*.65,.8,1.9],[-l*.2,w, .6,transport?2.5:2.15],[l*.18,w,.65,2.1],[l*.45,w*.6,.9,1.55],[l*.53,.2,1,1.32]],'armor');sphere(p,.5,'glass',0,1.75,l*.23,w*.84,.69,1.5);box(p,.045,.4,1.25,'trim',0,1.91,l*.23);
  loft(p,[[-5.4,.2,1.8,2.1],[-l*.35,.65,1.2,1.83]],'armor');wing(p,[[0,-4.6],[.9,-5.1],[0,-5.45],[-.9,-5.1]],1.9);
  for(const s of[-1,1]){sphere(p,.4,'trim',s*w*.58,2,-.55,.75,.65,1.6);cyl(p,.19,.4,'dark',s*w*.6,2.04,-1.22,Math.PI/2);if(!transport){
    wing(p,[[s*.3,.2],[s*1.95,-.35],[s*1.9,-.7],[s*.3,-.6]],1.1);
    const rack=group(p,'WeaponRack',0,0,0);
    cyl(rack,.25,1.05,'trim',s*1.25,.9,-.1,Math.PI/2);cyl(rack,.23,.055,'dark',s*1.25,.9,.45,Math.PI/2);
    if(detail)for(let i=0;i<7;i++){const a=i*Math.PI*2/6,r=i===6?0:.14;cyl(rack,.045,.025,'steel',s*1.25+Math.cos(a)*r,.9+Math.sin(a)*r,.49,Math.PI/2,0,0,6);}
    if(loadouts[f][kind].weapons.some(w=>w.guidance==='command')){box(rack,.46,.13,.9,'dark',s*1.68,.94,-.1);for(const y of[.76,1.06])for(const x of[1.55,1.8]){
      cyl(rack,.065,1.15,'steel',s*x,y,-.1,Math.PI/2);sphere(rack,.07,'dark',s*x,y,.5,1,1,1.6);box(rack,.22,.025,.12,'trim',s*x,y,-.5);box(rack,.025,.22,.12,'trim',s*x,y,-.5);
    }}
  }}
  const positions=tandem?[-2.25,2.05]:[0];for(const z of positions){cyl(p,.07,.58,'steel',0,2.48,z);const r=group(p,'RotorMain'+(z||''),0,2.78,z);for(let i=0;i<(coax?3:4);i++){const blade=group(r,'Blade');blade.rotation.y=i*Math.PI*2/(coax?3:4);box(blade,.13,.055,transport?2.8:2.35,'dark',0,0,transport?1.4:1.175);}cyl(r,.2,.12,'steel',0,.04,0);}
  if(coax){const r=group(p,'RotorCounter',0,3.13,0);for(let i=0;i<3;i++){const blade=group(r,'Blade');blade.rotation.y=i*Math.PI*2/3;box(blade,.13,.045,2.35,'dark',0,0,1.175);}}
  else if(!tandem){const r=group(p,'TailRotor',.14,2.15,-5);for(let i=0;i<2;i++)box(r,.04,.12,1.25,'dark').rotation.x=i*Math.PI/2;}
  const gear=group(p,'LandingGear');for(const s of[-1,1]){cyl(gear,.04,.85,'steel',s*w*.65,.57,-.8,0,0,s*.2);cyl(gear,.18,.16,'rubber',s*w*.73,.2,-.8,0,0,Math.PI/2);}cyl(gear,.15,.18,'rubber',0,.22,l*.27,0,0,Math.PI/2);
  if(!transport){sphere(p,.26,'glass',0,1,l*.51);gun(p,.75,.04,.66,l*.4);}
  return p;}
/** Hull seams, protected optics, exhausts and faction equipment share existing batches. */
function armoredDetail(p,t,w,l,f){
  for(const side of [-1,1]){
    box(p,.18,.18,l*.88,'trim',side*w*.47,1.08,0);
    box(p,.12,.48,.28,'dark',side*w*.34,.85,-l*.48);
    cyl(p,.13,.14,'steel',side*w*.34,.85,-l*.49,Math.PI/2,0,0,detail?12:6);
    if(detail){
      // Towing cable and bolted access panel, drawn as real surface detail.
      cyl(p,.032,l*.55,'steel',side*w*.4,1.48,-l*.12,Math.PI/2);
      for(let z=-l*.25;z<l*.25;z+=.7)box(p,.19,.085,.4,'dark',side*w*.5,1.17,z);
      box(t,.055,.26,.5,'dark',side*.7,.66,.45);
    }
  }
  if(detail&&f==='usa'){
    for(const x of [-1,-.5,0,.5,1])box(t,.045,.38,.045,'steel',x,.4,-1.62);
    box(t,2.1,.05,.04,'steel',0,.6,-1.62);
    box(t,.75,.3,.45,'stowage',.56,.7,-1.1);
  }
  if(detail&&f!=='usa')for(const side of [-1,1])for(let i=0;i<3;i++)box(t,.3,.16,.38,'trim',side*(.35+i*.25),.71,.26-i*.25);
}
function materialSet(f){const [base,trim]=palettes[f];mats={armor:new T.MeshStandardMaterial({color:base,roughness:.86,metalness:.08,vertexColors:true}),trim:new T.MeshStandardMaterial({color:trim,roughness:.78,metalness:.16}),steel:new T.MeshStandardMaterial({color:0x59605d,roughness:.64,metalness:.55}),dark:new T.MeshStandardMaterial({color:0x202725,roughness:.9,metalness:.06}),rubber:new T.MeshStandardMaterial({color:0x242721,roughness:1}),glass:new T.MeshStandardMaterial({color:0x27414a,roughness:.26,metalness:.38}),lamp:new T.MeshStandardMaterial({color:0xc3b996}),red:new T.MeshStandardMaterial({color:0x743c32}),stowage:new T.MeshStandardMaterial({color:trim,roughness:.98}),marking:new T.MeshStandardMaterial({color:0x76c9ef,roughness:.8}),equipment:new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.87,metalness:.12})};for(const [name,mat]of Object.entries(mats))mat.name=name;}
function batch(node){
  for(const child of [...node.children])if(child.isGroup){batch(child);if(child.name==='Blade'){child.updateMatrix();for(const part of [...child.children]){part.applyMatrix4(child.matrix);node.add(part);}node.remove(child);}}
  const buckets=new Map();
  for(const child of [...node.children]){
    if(!child.isMesh)continue;child.updateMatrix();
    const g=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();g.applyMatrix4(child.matrix);g.normalizeNormals();
    const pos=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=[],colors=[];
    // Far models retain silhouette/pivots but use one vertex-colored material per node.
    const armor=child.material===mats.armor,marking=child.material===mats.marking;
    const material=marking?mats.marking:!detail?mats.equipment:armor?mats.armor:child.material===mats.glass?mats.glass:mats.equipment;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
      uv.push((ny>nx&&ny>nz?x:nz>nx?x:z)*.19,(ny>nx&&ny>nz?z:y)*.19);
      const color=material===mats.equipment?child.material.color.clone():new T.Color(1,1,1);
      // Baked underbody darkening and dust breakup, zero runtime AO pass.
      const ao=.76+.24*Math.max(0,normal.getY(i));
      const dust=armor?Math.max(0,.14-y*.055):0;
      color.multiplyScalar(ao).lerp(new T.Color(.34,.3,.22),dust);
      colors.push(color.r,color.g,color.b);
    }
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    if(!buckets.has(material))buckets.set(material,[]);buckets.get(material).push(g);node.remove(child);child.geometry.dispose();
  }
  for(const [material,geometries]of buckets){const joined=mergeGeometries(geometries);const g=mergeVertices(joined,1e-5);joined.dispose();g.computeBoundingSphere();const m=new T.Mesh(g,material);m.name=material.name;node.add(m);for(const geo of geometries)geo.dispose();}
}
const kinds=['tank','lightTank','ifv','apc','reconVehicle','tankDestroyer','artillery','mlrs','spaa','fighter','interceptor','multirole','attackAircraft','ecm','bomber','heli','gunship','casHeli','transport','cargoPlane','logiTruck'];
const manifest={version:2,author:'Rogue Front original art',models:[]};
for(const f of Object.keys(palettes)){await mkdir(new URL(f+'/',out),{recursive:true});for(const kind of kinds)for(const lod of ['detail','tactical']){detail=lod==='detail';materialSet(f);let p;
  if(kind==='tank'||kind==='lightTank')p=tank(f,kind);else if(['ifv','apc','reconVehicle','tankDestroyer'].includes(kind))p=armored(f,kind);else if(kind==='artillery'||kind==='mlrs')p=artillery(f,kind);else if(kind==='spaa')p=spaa(f);else if(kind==='logiTruck')p=truck(f,kind);else if(['heli','gunship','casHeli','transport'].includes(kind))p=helicopter(f,kind);else p=jet(f,kind);
  p.name=`${f}_${kind}`;p.userData={faction:f,kind,author:manifest.author};box(p,.07,.22,.5,'marking',kind==='tank'?1.82:1.28,1.25,.4);batch(p);p.updateMatrixWorld(true);let triangles=0,drawCalls=0;p.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;drawCalls++;}});
  const binary=await new GLTFExporter().parseAsync(p,{binary:true,onlyVisible:false});const path=`${f}/${kind}${detail?'':'-lod'}.glb`;await writeFile(new URL(path,out),Buffer.from(binary));manifest.models.push({faction:f,kind,lod,path,triangles,drawCalls});
}}
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));console.log(`Exported ${manifest.models.length} GLBs; max ${Math.max(...manifest.models.map(m=>m.triangles))} triangles, ${Math.max(...manifest.models.map(m=>m.drawCalls))} material batches.`);

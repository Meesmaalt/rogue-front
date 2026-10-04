import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ART_KINDS, loadArtModels, createArtModel, disposeUnitMesh } from "./ArtModels";
import { FACTIONS, FACTION_LIST, factionUnitName, type FactionId } from "../sim/factions";
import type { UnitKind } from "../sim/types";
import "./arsenal.css";

const roles: Partial<Record<UnitKind,string>> = {tank:"Põhilahingtank",lightTank:"Kergtank",ifv:"Jalaväe lahingumasin",apc:"Soomustransportöör",reconVehicle:"Luuresoomuk",tankDestroyer:"Tankitõrje",artillery:"Liikursuurtükk",mlrs:"Raketiheitja",spaa:"Liikuv õhutõrje",fighter:"Hävitaja",interceptor:"Püüdurhävitaja",multirole:"Mitmeotstarbeline hävitaja",attackAircraft:"Ründelennuk",ecm:"Elektroonilise sõja lennuk",bomber:"Pommitaja",heli:"Ründekopter",gunship:"Tuletoetuskopter",casHeli:"Lähiõhutoetus",transport:"Transpordikopter",cargoPlane:"Varustuslennuk",logiTruck:"Varustusveok"};
document.body.innerHTML=`<header><a href="./">← PEAMENÜÜ</a><strong>ROGUE FRONT <span>ARSENAL</span></strong><div>Hiir: pööra · ratas: suumi</div></header><main><aside><p class="eyebrow">FRAKTSIOON</p><nav>${FACTION_LIST.map(f=>`<button data-faction="${f}">${FACTIONS[f].short}</button>`).join("")}</nav><p class="eyebrow">TEHNIKA</p><div class="roster">${ART_KINDS.map(k=>`<button data-kind="${k}">${roles[k]}</button>`).join("")}</div></aside><section><div id="stage"></div><div class="caption"><p class="eyebrow" id="role"></p><h1 id="platform">Laadin mudeleid…</h1><p id="description"></p><small id="details"></small><button id="rotate">PEATAN PÖÖRAMISE</button></div></section></main>`;
const stage=document.getElementById("stage")!;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x111b20);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.append(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x111b20,28,70);
const camera=new THREE.PerspectiveCamera(35,1,.1,120);camera.position.set(11,7,13);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.autoRotate=true;controls.autoRotateSpeed=.55;controls.minDistance=5;controls.maxDistance=35;controls.maxPolarAngle=Math.PI*.48;
scene.add(new THREE.HemisphereLight(0xc7e5ee,0x3b3e35,2));
const sun=new THREE.DirectionalLight(0xffe7bd,3.2);sun.position.set(8,13,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.bias=-.0005;scene.add(sun);
const rim=new THREE.DirectionalLight(0x7ab8e0,2.5);rim.position.set(-6,5,-9);scene.add(rim);
const floor=new THREE.Mesh(new THREE.CircleGeometry(22,96),new THREE.MeshStandardMaterial({color:0x283330,roughness:.94}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(40,40,0x52605a,0x303e3a);grid.position.y=.005;scene.add(grid);
let faction: FactionId="usa",kind:UnitKind="tank",model:THREE.Group|null=null;let generation=0;
async function show():Promise<void>{
  const token=++generation;document.body.dataset.ready="false";
  document.querySelectorAll<HTMLButtonElement>("[data-faction]").forEach(b=>b.classList.toggle("active",b.dataset.faction===faction));document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach(b=>b.classList.toggle("active",b.dataset.kind===kind));
  try {await loadArtModels([faction],[kind]);}catch{document.getElementById("platform")!.textContent="Mudeli laadimine ebaõnnestus";return;}if(token!==generation)return;
  if(model){scene.remove(model);model.traverse(o=>{if(o instanceof THREE.Mesh)disposeUnitMesh(o);});}
  model=createArtModel(kind,0,faction)!.group;model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());controls.target.copy(bounds.getCenter(new THREE.Vector3()));const extent=Math.max(size.x,size.z,size.y*2);camera.position.copy(controls.target).add(new THREE.Vector3(extent*1.12,extent*.63,extent*1.15));controls.update();
  document.getElementById("role")!.textContent=`${FACTIONS[faction].short} / ${roles[kind]}`;document.getElementById("platform")!.textContent=factionUnitName(faction,kind,roles[kind]??kind);
  document.getElementById("description")!.textContent=FACTIONS[faction].doctrineBlurb;
  let triangles=0,batches=0;model.traverse(o=>{if(o instanceof THREE.Mesh){batches++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute("position").count)/3;}});
  document.getElementById("details")!.textContent=`${triangles.toLocaleString("et-EE")} kolmnurka · ${batches} materjaligruppi · sama mudel kasutusel lahingus`;document.body.dataset.ready="true";document.body.dataset.model=`${faction}/${kind}`;
}
document.querySelectorAll<HTMLButtonElement>("[data-faction]").forEach(b=>b.onclick=()=>{faction=b.dataset.faction as FactionId;void show();});document.querySelectorAll<HTMLButtonElement>("[data-kind]").forEach(b=>b.onclick=()=>{kind=b.dataset.kind as UnitKind;void show();});document.getElementById("rotate")!.onclick=()=>{controls.autoRotate=!controls.autoRotate;document.getElementById("rotate")!.textContent=controls.autoRotate?"PEATAN PÖÖRAMISE":"PÖÖRA MUDELIT";};
function resize():void{renderer.setSize(stage.clientWidth,stage.clientHeight);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();}addEventListener("resize",resize);resize();void show();
let previous=performance.now();function frame(now:number):void{const dt=Math.min(.1,(now-previous)/1000);previous=now;model?.traverse(o=>{if(o.name.startsWith("RotorMain"))o.rotation.y+=dt*12;else if(o.name==="RotorCounter")o.rotation.y-=dt*12;else if(o.name==="TailRotor")o.rotation.x+=dt*18;});controls.update();renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);

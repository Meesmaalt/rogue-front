import {renderedGroundHeightAt} from './GroundSurface';
import logisticsRules from '../data/logistics.json';
import {applyUnitCamouflage,selectedCamouflage} from './UnitCamouflage';
import baseVisuals from '../data/base-life.json';
import {createToolVan} from './EngineerVisual';
import {createDepotHandler} from "./CargoHandlingVisual";
import {engineerSeats,animateEngineerTools,animateBarrow,type LoungeState} from "./EngineerLounge";
import {createCargoRamp} from "./CargoHandlingVisual";
import {stepSoldierNavigated,soldierOffset,type SoldierPose} from "./SquadMotion";
import {createParachute} from "./ExpansionModels";
import {aircraftEngineProfile} from "./AircraftAudio";
import {createMetricAirfieldStructures} from "./Architecture";
import {createMetricRunway} from "./MetricRunway";
import {syncEquipmentVisual} from "./EquipmentVisual";
import * as THREE from "three";
import mobility from "../data/mobility.json";
import {sampleMotion,smoothMotion,springSuspension,usesFlightHeight,type SuspensionState,type MotionPose} from "./MotionPresentation";
import {isTacticallySupplied,tacticalSupplyNodes} from "../sim/systems/tacticalSupply";
import type {Entity} from "../sim/types";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import { wrapAngle } from "../sim/math";
import {createModel as createVisualModel} from "./models";
import {createBuildingUpgradeStages,updateBuildingUpgradeStages} from './BuildingUpgrades';
import { createArtModel, disposeUnitMesh } from "./ArtModels";

// One soft contact texture and quad shared by all vehicles (two triangles).
const contactCanvas = document.createElement("canvas"); contactCanvas.width = contactCanvas.height = 64;
const contactContext = contactCanvas.getContext("2d")!;
const contactGradient = contactContext.createRadialGradient(32,32,4,32,32,31);
contactGradient.addColorStop(0,"rgba(0,0,0,0.38)"); contactGradient.addColorStop(1,"rgba(0,0,0,0)");
contactContext.fillStyle = contactGradient; contactContext.fillRect(0,0,64,64);
const contactGeometry = new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2); contactGeometry.userData.sharedArt = true;
const contactMaterial = new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}); contactMaterial.userData.sharedArt = true;

interface View extends LoungeState { soldiers:Map<number,SoldierPose>;cargoRamp?:THREE.Group;parachute?:THREE.Group;rotorRpm:number;surface?:THREE.Mesh; resetPose:boolean;pose:MotionPose;visualSpeed:number;walkPhase:number;spread:number;suspensionPitch:SuspensionState;suspensionRoll:SuspensionState; near:THREE.Group; far?:THREE.Group; shadow?:THREE.Object3D; guns:THREE.Object3D[]; gears:THREE.Object3D[]; turrets:THREE.Group[]; legs:THREE.Object3D[]; members:THREE.Object3D[]; status:Map<string,THREE.Mesh>; constructBar?:THREE.Mesh; staticBuilding:boolean; group: THREE.LOD; turret: THREE.Group | null; ring: THREE.Mesh; tactical: THREE.Mesh | null; kind: string; phase: number; recoil: number; upgradeKit?: THREE.Group;upgradeRevealAt?:number;upgradeRevealLevel?:number; lastBuildingLevel?: number; lastAirState?: string }
const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;


/** Sünkroonib sim-entiteedid three.js objektidega (interpoleeritud positsioon, kalle maastikule, valikurõngad). */
export class UnitRenderer {
  private intelGhosts = new Map<number, THREE.Mesh>();
  private views = new Map<number, View>();
  private rotorParts = new Map<number, THREE.Object3D[]>();
  private recoilById = new Map<number, number>();
  private frustum=new THREE.Frustum();
  private projection=new THREE.Matrix4();
  private bounds=new THREE.Sphere();
  private inverse=new THREE.Quaternion();
  private seen=new Set<number>();
  shadowDirty=true;
  /** Expose only a rendered, visible model pose; no new sampling or allocation. */
  positionFor(id:number):Readonly<{x:number;y:number;z:number}>|null {
    const view=this.views.get(id);return view?.group.visible?view.group.position:null;
  }
  private lastConstructionShadow=0;

  reset():void {
    for(const v of this.views.values()){
      this.scene.remove(v.group);v.group.traverse(o=>{const m=o as THREE.Mesh;if(o instanceof THREE.LineSegments){o.geometry.dispose();(o.material as THREE.Material).dispose();return;}if(!m.isMesh)return;disposeUnitMesh(m,this.ringMat);});
    }
    for(const m of this.intelGhosts.values()){this.scene.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();}
    this.views.clear();this.intelGhosts.clear();this.rotorParts.clear();this.recoilById.clear();this.shadowDirty=true;
  }
  handleEvents(events: import("../sim/types").SimEvent[]): void {
    for (const e of events) {
      if (e.type === "fire" && e.sourceId && (e.weaponIndex??0)===0 && e.weapon!=="missile") this.recoilById.set(e.sourceId, 1);
    }
  }
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });

  constructor(private readonly scene: THREE.Scene,private readonly camera:THREE.PerspectiveCamera) {}

  sync(world: World, alpha: number, selected: ReadonlySet<number>,frameDt:number,quality:"low"|"medium"|"high"): void {
    let supplyNodes:Entity[]|null=null;
    const seen=this.seen;seen.clear();
    this.camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
    const now=performance.now()*.001;
    const lodDistance=quality==="high"?205:quality==="medium"?160:100;
    for (const e of world.entities) {
      const flightCarrier=e.loadedIntoId!=null?world.byId.get(e.loadedIntoId):undefined,unloading=flightCarrier?.constructionFlight?.phase==='unloading'&&world.time>=flightCarrier.constructionFlight.readyAt-baseVisuals.construction.rampExitSeconds;
      if (e.dead || e.loadedIntoId !== null&&!unloading) continue;
      seen.add(e.id);
      const spotted=e.team===world.playerTeam||world.isSpottedByTeam(e,world.playerTeam);
      let v = this.views.get(e.id);
      if(!spotted){if(v){v.group.visible=false;v.resetPose=true;}continue;}
      this.bounds.center.set(e.x,e.y+e.def.height*.5,e.z);this.bounds.radius=Math.max(e.kind==="airbase"&&e.def.metricScale?240:10,e.def.radius*2,e.def.height);
      const onScreen=this.frustum.intersectsSphere(this.bounds);
      if(!v&&!onScreen&&e.def.speed>0)continue;
      if (!v) {
        const faction = e.constructionFlight?"usa":e.team === world.playerTeam ? world.playerFaction : world.enemyFaction;
        const metricAirfield=e.kind==="airbase"&&!!e.def.metricScale;
        const visualKind=e.kind==='engineer'&&!e.constructionCrew?'inf':e.kind;
        const visual = e.groundService?.onFoot?{group:createDepotHandler(),turret:null}:metricAirfield?{group:createMetricAirfieldStructures(e),turret:null}:createArtModel(visualKind, e.team, faction) ?? createVisualModel(visualKind, e.team, faction);
        visual.group.scale.multiplyScalar(e.def.modelScale??1);
        // Authored GLBs retain the silhouette at tactical camera distance.
        const lod = new THREE.LOD();
        lod.autoUpdate=false;lod.addLevel(visual.group,0);
        const far=metricAirfield?undefined:createArtModel(visualKind,e.team,faction,true)?.group??(e.squadMaxMembers?createVisualModel(visualKind,e.team,faction,true).group:undefined);
        if(far){far.scale.multiplyScalar(e.def.modelScale??1);lod.addLevel(far,lodDistance,.15);}
        const m = { group: lod, turret: visual.turret };
        if(e.constructionCrew)lod.add(createToolVan());
        if(e.constructionFlight){const van=createToolVan();van.name='CarriedWorkVan';van.position.set(0,baseVisuals.chinook.rampFloor*baseVisuals.chinook.modelScale*(e.def.modelScale??1),-baseVisuals.construction.cabinOffset);van.visible=false;lod.add(van);}
        const rotors: THREE.Object3D[] = [];
        lod.traverse(o => { if (o.name.startsWith("RotorMain") || o.name === "RotorCounter" || o.name === "TailRotor") rotors.push(o); });
        if (rotors.length) this.rotorParts.set(e.id, rotors);
        if (e.def.speed > 0 && !(e.squadMaxMembers ?? 0)) {
          const shadow = new THREE.Mesh(e.kind==='groundHandler'?contactGeometry.clone():contactGeometry,contactMaterial); shadow.name = "ContactShadow";
          const radius = e.kind==='groundHandler'? .68:Math.max(1.5,e.def.radius); shadow.scale.set(radius*2.3,1,radius*3.4); shadow.position.y=.045;
          m.group.add(shadow);
        }
        const r = Math.max(e.def.radius, 1.2);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.22, 16).rotateX(-Math.PI / 2), this.ringMat);
        const tactical:THREE.Mesh|null=null;
        ring.position.y = 0.3;
        ring.visible = false;
        m.group.add(ring);

        // Enamik üksusi ei vaja dünaamilist shadow-map kirjutamist.
        // Hooneid võib varjutada, liikuvad üksused kasutavad odavamat valgustust.
        const staticBuilding = ["gunTurret","flakTurret","atTurret","missileCommand","icbmSilo","hq", "barracks", "factory", "helipad", "airbase", "refinery", "supply", "radar", "bunker", "aa", "generator", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"].includes(e.kind);
        lod.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = staticBuilding;
          mesh.receiveShadow = e.kind!=='groundHandler';
        });
        const surface=metricAirfield?createMetricRunway(e):undefined;if(surface)m.group.add(surface);
        if(e.team===world.playerTeam)applyUnitCamouflage(m.group,selectedCamouflage());
        this.scene.add(m.group);
        const guns:THREE.Object3D[]=[],gears:THREE.Object3D[]=[],turrets:THREE.Group[]=[],legs:THREE.Object3D[]=[],members:THREE.Object3D[]=[];
        lod.traverse(o=>{if(o.name==="Gun"){o.userData.restZ=o.position.z;o.userData.restX=o.rotation.x;guns.push(o);}if(o.name==="LandingGear")gears.push(o);if(o.name==="Turret")turrets.push(o as THREE.Group);if(o.name==="LeftLeg"||o.name==="RightLeg"){o.userData.restLegX=o.rotation.x;o.userData.walkPhase=Math.floor(legs.length/2)*.8;legs.push(o);}if(o.name.startsWith("SquadMember")){o.userData.squadPosition=o.position.clone();members.push(o);}});
        if(staticBuilding)this.shadowDirty=true;
        v = { cargoRamp:lod.getObjectByName('CargoRamp') as THREE.Group|undefined,soldiers:new Map(),rotorRpm:0,surface,resetPose:true,pose:{x:e.x,y:e.y,z:e.z,heading:e.heading,bank:e.flightBank??0,pitch:e.flightPitch??0,speed:0},visualSpeed:0,walkPhase:(e.id*.731)%6.28,spread:1,suspensionPitch:{value:0,velocity:0},suspensionRoll:{value:0,velocity:0},near:visual.group,far,shadow:lod.getObjectByName("ContactShadow"),guns,gears,turrets,legs,members,status:new Map(),staticBuilding,group: m.group, turret: m.turret, ring, tactical, kind: e.kind, phase: (e.id * 0.731) % 6.28, recoil: 0 };
        this.views.set(e.id, v);
      }
      v.group.visible=onScreen||v.staticBuilding;
      if(!onScreen&&!v.staticBuilding){v.resetPose=true;continue;}
      sampleMotion(e,alpha,v.pose);
      const {x,z,heading:h}=v.pose;
      const previousSpeed=v.visualSpeed;
      v.visualSpeed=v.resetPose?v.pose.speed:smoothMotion(v.visualSpeed,v.pose.speed,mobility.presentation.speedResponse,frameDt);
      const acceleration=frameDt>0&&!v.resetPose?(v.visualSpeed-previousSpeed)/frameDt:0;
      const chassisPitch=Math.max(-mobility.presentation.vehiclePitchLimit,Math.min(mobility.presentation.vehiclePitchLimit,-acceleration*(e.motionReverse?-1:1)*mobility.presentation.vehiclePitchResponse));
      const chassisRoll=Math.max(-mobility.presentation.vehicleRollLimit,Math.min(mobility.presentation.vehicleRollLimit,-wrapAngle(e.heading-e.pHeading)*30*v.visualSpeed*mobility.presentation.vehicleTurnLean));
      v.walkPhase=(v.walkPhase+v.visualSpeed*frameDt*Math.PI*2/mobility.presentation.infantryStride)%(Math.PI*2);
      const distance=this.camera.position.distanceTo(this.bounds.center);
      if(v.far){const unitLimit=e.squadMaxMembers?(quality==="high"?90:quality==="medium"?70:50):lodDistance;const limit=unitLimit*(v.far.visible?.85:1.1);const detailed=(quality!=="low"&&selected.size<=12&&selected.has(e.id))||distance<limit;v.near.visible=detailed;v.far.visible=!detailed;}
      const ground=heightAt(x,z);
      const flying=!!e.airdrop||usesFlightHeight(e);
      if(e.airdrop&&!v.parachute){v.parachute=createParachute(e.def.radius);v.group.add(v.parachute);}if(v.parachute)v.parachute.visible=!!e.airdrop;
      v.group.position.set(x,flying||e.def.domain==="sea"?v.pose.y:e.garrisonId?e.y:ground,z);
      const shadow=v.shadow;
      if(shadow){shadow.position.y=ground-v.group.position.y+.075;
       if(e.kind==='groundHandler'&&shadow instanceof THREE.Mesh){const p=shadow.geometry.getAttribute('position'),c=Math.cos(h),s=Math.sin(h);for(let i=0;i<p.count;i++){const lx=p.getX(i)*shadow.scale.x,lz=p.getZ(i)*shadow.scale.z;p.setY(i,renderedGroundHeightAt(x+c*lx+s*lz,z-s*lx+c*lz)-ground);}p.needsUpdate=true;}
      }
      if(e.kind==='groundHandler'){
       const state=e.groundService?.crewState,walking=state==='walking'||state==='returning'||state==='boarding',forklift=v.group.getObjectByName('ServiceForklift'),walker=v.group.getObjectByName('ServiceWalker');
       if(forklift)forklift.visible=!walking;if(walker)walker.visible=walking;if(state==='rest')v.group.visible=false;
       if(walker)walker.traverse(o=>{if(o.name==='PorterLeftLeg')o.rotation.x=Math.sin(world.time*(e.motionSpeed??0)*4)*.4;if(o.name==='PorterRightLeg')o.rotation.x=-Math.sin(world.time*(e.motionSpeed??0)*4)*.4;});
       const crates=v.group.getObjectByName('HandlingCargo');if(crates)crates.visible=e.cargo>0;if(e.groundService?.onFoot){const lift=v.group.getObjectByName('ForkCarriage');if(lift)lift.position.y+=((e.cargo>0?.45:0)-lift.position.y)*Math.min(1,frameDt*4);v.group.traverse(o=>{if(o.name==='ForkWheel')o.rotation.x=world.time*(e.motionSpeed??0)*3;});}}
      if(['transport','cargoPlane','airTransport'].includes(e.kind)&&((e.cargoDoor??0)>0||v.cargoRamp)){
        if(!v.cargoRamp){v.cargoRamp=createCargoRamp(e.def.radius,e.def.height);v.group.add(v.cargoRamp);}
        v.cargoRamp.rotation.x=smoothMotion(v.cargoRamp.rotation.x,-Math.PI*.58*(e.cargoDoor??0),5,frameDt);
        v.cargoRamp.visible=!!v.cargoRamp.userData.integrated||(e.cargoDoor??0)>.001||Math.abs(v.cargoRamp.rotation.x)>.02;
        if(v.cargoRamp.userData.integrated)v.group.traverse(o=>{if(o.name==='CargoRamp'){o.rotation.x=v.cargoRamp!.rotation.x;o.visible=true;}});
      }
      if(e.constructionFlight){const van=v.group.getObjectByName('CarriedWorkVan'),f=e.constructionFlight;if(van)van.visible=e.cargoUnitIds.length>0&&!(f.phase==='unloading'&&world.time>=f.readyAt-baseVisuals.construction.rampExitSeconds);}
      if(e.kind==='engineer'){
       const van=v.group.getObjectByName('EngineerToolVan'),duty=e.engineerDuty;if(van){van.visible=!!duty?.vanPoint;if(duty?.vanPoint){const dx=duty.vanPoint.x-e.x,dz=duty.vanPoint.z-e.z;van.rotation.y=wrapAngle((duty.vanHeading??e.heading)-e.heading);van.position.set(Math.cos(e.heading)*dx-Math.sin(e.heading)*dz,heightAt(duty.vanPoint.x,duty.vanPoint.z)-e.y,Math.sin(e.heading)*dx+Math.cos(e.heading)*dz);}}
      }
      if(e.constructionCrew){
       const carrier=world.byId.get(e.constructionCrew.transportId??e.loadedIntoId??-1),f=carrier?.constructionFlight,van=v.group.getObjectByName('EngineerToolVan');
       if(carrier&&f&&van&&(f.phase==='loading'&&f.boardingAt!=null||f.phase==='unloading')){
        const exiting=f.phase==='unloading',t=exiting?Math.max(0,Math.min(1,1-(f.readyAt-world.time)/baseVisuals.construction.rampExitSeconds)):Math.max(0,Math.min(1,(world.time-f.boardingAt!)/baseVisuals.construction.rampDriveSeconds));
        const smooth=t*t*(3-2*t),outside=carrier.def.radius+logisticsRules.handling.pickupGap,along=exiting?baseVisuals.construction.cabinOffset+(outside-baseVisuals.construction.cabinOffset)*smooth:outside+(baseVisuals.construction.cabinOffset-outside)*smooth;
        const wx=carrier.x-Math.sin(carrier.heading)*along,wz=carrier.z-Math.cos(carrier.heading)*along,dx=wx-e.x,dz=wz-e.z,floor=baseVisuals.chinook.rampFloor*baseVisuals.chinook.modelScale*(carrier.def.modelScale??1),rampRun=Math.max(.5,outside-Math.abs(baseVisuals.chinook.rampRear)*baseVisuals.chinook.modelScale*(carrier.def.modelScale??1));
        van.visible=!exiting||t>0;van.position.set(Math.cos(e.heading)*dx-Math.sin(e.heading)*dz,(carrier.y-e.y)+floor*Math.max(0,Math.min(1,(outside-along)/rampRun)),Math.sin(e.heading)*dx+Math.cos(e.heading)*dz);van.rotation.y=wrapAngle(carrier.heading-e.heading);
       }
      }
      if(v.members.length){
        const seats=e.kind==="engineer"?engineerSeats(world,e,v,frameDt):null;
        const alive=Math.max(1,e.squadMembers??e.squadMaxMembers!),spread=v.spread=smoothMotion(v.spread,1-Math.min(.45,(e.suppression??0)/220),mobility.presentation.squadSpreadResponse,frameDt),scale=e.def.modelScale??1,updated=new Set<number>(),pace=Math.min(1,v.visualSpeed/Math.max(.1,e.def.speed));
        for(const o of v.members){const index=Number(o.name.slice('SquadMember'.length));o.visible=index<Math.min(alive,e.garrisonId?2:alive)&&!(e.engineerDuty?.phase==='boarding'&&world.time>(e.engineerDuty.readyAt??world.time)-baseVisuals.engineer.boardingSeconds*(1-(index+1)/(alive+1)))&&!(e.kind==='engineer'&&['travel','return'].includes(e.engineerDuty?.phase??''));const origin=o.userData.squadPosition as THREE.Vector3;
          const offset=soldierOffset(origin.x*spread,origin.z*spread,index,world.time,pace),localX=offset.x*(e.garrisonId?.2:1)*scale,localZ=offset.z*(e.garrisonId?.2:1)*scale;
          let target={x:x+Math.cos(h)*localX+Math.sin(h)*localZ,z:z-Math.sin(h)*localX+Math.cos(h)*localZ};
          const seat=seats?seats[index]:undefined;if(seat)target={x:seat.x,z:seat.z};
          if(e.constructionCrew&&['to-van','boarding'].includes(e.engineerDuty?.phase??'')&&e.engineerDuty?.vanPoint){const van=e.engineerDuty.vanPoint,angle=e.engineerDuty.vanHeading??h,side=1.4;target={x:van.x+Math.cos(angle)*side+Math.sin(angle)*(index-1)*.45,z:van.z-Math.sin(angle)*side+Math.cos(angle)*(index-1)*.45};}
          let p=v.soldiers.get(index);if(!p){p={...target,heading:h,stride:index*2.4,speed:0};v.soldiers.set(index,p);}
          if(!updated.has(index)){const before={x:p.x,z:p.z};stepSoldierNavigated(p,target,seat?seat.heading:h,v.visualSpeed,index,frameDt,world.nav,v.resetPose||!!e.garrisonId||!!e.airdrop||e.kind==='engineer'&&['travel','return'].includes(e.engineerDuty?.phase??''));
            if(!e.garrisonId&&!e.airdrop&&!world.nav.isWalkableWorld(p.x,p.z,.2)){p.x=before.x;p.z=before.z;p.speed=0;}updated.add(index);}
          const dx=p.x-x,dz=p.z-z;o.position.x=(Math.cos(h)*dx-Math.sin(h)*dz)/scale;o.position.z=(Math.sin(h)*dx+Math.cos(h)*dz)/scale;
          o.position.y=e.garrisonId||e.airdrop?0:(heightAt(p.x,p.z)-v.group.position.y)/scale+Math.abs(Math.sin(p.stride))*.04*Math.min(1,p.speed/Math.max(.1,e.def.speed));o.rotation.y=wrapAngle(p.heading-h);o.userData.soldierStride=p.stride;o.userData.soldierSpeed=p.speed;
          if(e.kind==="engineer"){const sat=!!seat&&!v.gearPhase&&Math.hypot(p.x-seat.x,p.z-seat.z)<.25&&p.speed<.3;o.userData.seated=sat;if(sat){o.position.y-=.32;o.rotation.y=wrapAngle(seat.heading-h);}else if((e.mode==="build"||e.mode==="repair")&&e.target)o.rotation.y=wrapAngle(Math.atan2(e.target.x-p.x,e.target.z-p.z)-h);animateEngineerTools(o,e,index,world.time,sat||!!v.toolsAway);}
        }
      }
      if(syncEquipmentVisual(v.group,e))this.shadowDirty=true;
      const buildingLevel = e.buildingLevel ?? (e.upgrades.has("producer-3") ? 3 : e.upgrades.has("producer-2") ? 2 : 1);
      const targetLevel=e.upgrading?Math.min(3,buildingLevel+1):buildingLevel;
      if (v.staticBuilding && v.lastBuildingLevel !== targetLevel) {
        if(v.lastBuildingLevel!=null&&targetLevel>v.lastBuildingLevel&&!e.upgrading){v.upgradeRevealAt=now;v.upgradeRevealLevel=buildingLevel-1;}
        this.shadowDirty=true;
        if (v.upgradeKit) {
          v.upgradeKit.parent?.remove(v.upgradeKit);
          v.upgradeKit.traverse((o) => {
            const mesh = o as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) mesh.material.forEach(m=>m.dispose());
            else (mesh.material as THREE.Material | undefined)?.dispose();
          });
        }
        const kit=createBuildingUpgradeStages(e.kind,buildingLevel,targetLevel);
        v.group.add(kit); v.upgradeKit=kit;v.lastBuildingLevel=targetLevel;
      }
      if(v.upgradeKit){const revealing=v.upgradeRevealAt!=null&&!e.upgrading&&(now-v.upgradeRevealAt)<baseVisuals.buildingVisuals.instantRevealSeconds;updateBuildingUpgradeStages(v.upgradeKit,revealing?v.upgradeRevealLevel??buildingLevel:buildingLevel,e.upgrading?(e.upgradeProgress??0)/Math.max(.01,e.upgradeTime??1):revealing?(now-v.upgradeRevealAt!)/baseVisuals.buildingVisuals.instantRevealSeconds:1);}
      if (e.upgrading) {
        v.group.scale.set(1,1,1);
      } else if (e.underConstruction) {
        // Keep full silhouette – only slight growth; no flat green slab
        const k = Math.max(0.25, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        v.group.scale.set(0.88 + 0.12 * k, 0.75 + 0.25 * k, 0.88 + 0.12 * k);
      } else {
        v.group.scale.set(1, 1, 1);
      }
      // Construction scales the buildings, not the ground-clipped runway and its markings.
      if(v.surface)v.surface.scale.set(1/v.group.scale.x,1/v.group.scale.y,1/v.group.scale.z);
      const animT = world.time-(1-alpha)/30 + v.phase;
      if(v.staticBuilding&&(e.underConstruction||e.upgrading)&&now-this.lastConstructionShadow>.2){this.shadowDirty=true;this.lastConstructionShadow=now;}
      const recoil = this.recoilById.get(e.id) ?? 0;
      v.recoil = Math.max(0, recoil - frameDt);
      if (v.recoil <= 0) this.recoilById.delete(e.id); else this.recoilById.set(e.id, v.recoil);

      // Liikumine, rootor, vedrustus ja õhuoperatsioonid. Kõik on odav transform-animatsioon.
      if (["heli", "gunship", "casHeli", "transport"].includes(e.kind)) {
        const airborne = e.airState !== "grounded" && e.airState !== "rearming";
        v.group.position.y += airborne ? Math.sin(animT * 7) * 0.08 : Math.sin(animT * 2) * 0.015;
        v.rotorRpm=smoothMotion(v.rotorRpm,aircraftEngineProfile(e).rpm,2,frameDt);if(v.rotorRpm<.003)v.rotorRpm=0;
        for (const rotor of this.rotorParts.get(e.id) ?? []) {
          const speed=v.rotorRpm;
          if (rotor.name === "TailRotor") rotor.rotation.x += speed * frameDt * 90;
          else rotor.rotation.y += (rotor.name === "RotorCounter" ? -speed : speed)*frameDt*60;
        }
      }
      if (e.def.category === "infantry" || e.kind === "reconInf" || e.kind === "sniper") {
        if(e.kind==="engineer")animateBarrow(v.group,v,e,v.walkPhase,v.members[1]??v.members[0],e.kind==="engineer"&&!!v.toolsAway);
        for(const o of v.legs){let member=o.parent;while(member&&!member.name.startsWith('SquadMember'))member=member.parent;const stride=Number(member?.userData.soldierStride??v.walkPhase),pace=Math.min(1,Number(member?.userData.soldierSpeed??v.visualSpeed)/Math.max(.1,e.def.speed));o.rotation.x=Number(o.userData.restLegX)+Math.sin(stride+(o.name==='RightLeg'?Math.PI:0))*mobility.presentation.legSwing*pace;if(member?.userData.seated)o.rotation.x=-1.3;}
      }
      if(!e.airdrop&&e.def.domain==="land"&&e.def.speed>0&&e.def.category!=="infantry"){
        const pace=Math.min(1,v.visualSpeed/Math.max(.1,e.def.speed));
        v.group.position.y+=Math.sin(v.walkPhase*2)*mobility.presentation.vehicleBounce*pace;
      }
      for(const gun of v.guns){gun.position.z=Number(gun.userData.restZ)-Math.sin(v.recoil*Math.PI)*.24;gun.rotation.x=Number(gun.userData.restX)-(e.gunElevation??0);}
      for(const gear of v.gears)gear.visible=v.pose.y-ground<12;

      // Construction progress bar – always strip when finished (search all children)
      if (e.underConstruction) {
        const k = Math.max(0.05, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        let bar = v.constructBar;
        if (!bar) {
          const geo = new THREE.BoxGeometry(1, 0.18, 0.18);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf2c14b });
          bar = new THREE.Mesh(geo, mat);
          bar.name = "ConstructBar";v.constructBar=bar;
          v.group.add(bar);
        }
        bar.visible = true;
        bar.scale.set(Math.max(0.15, k) * (e.def.radius * 1.6), 1, 1);
        bar.position.set(0, e.def.height + 1.2, 0);
      } else {
        if(v.constructBar){const bar=v.constructBar;bar.parent?.remove(bar);bar.geometry.dispose();(bar.material as THREE.Material).dispose();v.constructBar=undefined;}
        if (e.productionQueue.length > 0) {
          const pulse = 1 + Math.sin(animT * 6) * 0.012;
          v.group.scale.x *= pulse; v.group.scale.z *= pulse;
        }
      }

      // Status icons (player units only): out of supply / routing / low ammo
      if (e.team === world.playerTeam && e.def.speed > 0) {
        const icons: { name: string; color: number; on: boolean }[] = [
          { name: "StOutSupply", color: 0xe05030, on: (((e.maxAmmo??0)>0 && (e.ammo??0)<(e.maxAmmo??1)*.35) || ((e.maxFuel??0)>0 && (e.fuel??0)<(e.maxFuel??1)*.35) || (e.supply??100)<20) && !isTacticallySupplied(world,e,supplyNodes??=tacticalSupplyNodes(world,world.playerTeam)) },
          { name: "StService", color: e.vehicleService?.phase==="ready"?0x8ee5ae:e.vehicleService?.phase==="stock"||e.vehicleService?.phase==="blocked"?0xffc45c:0x65c9be, on: !!e.vehicleService },
          { name: "StRouting", color: 0xffcc33, on: (e.morale ?? 100) < 22 || (e.suppression ?? 0) > 80 },
          { name: "StNoAmmo", color: 0xaaaaaa, on: (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) <= 0 },
        ];
        let slot = 0;
        for (const ic of icons) {
          let mesh = v.status.get(ic.name);
          if (ic.on) {
            if (!mesh) {
              mesh = new THREE.Mesh(
                ic.name==="StService"?new THREE.OctahedronGeometry(.4):new THREE.SphereGeometry(0.28, 6, 6),
                new THREE.MeshBasicMaterial({ color: ic.color, depthTest: false }),
              );
              mesh.name = ic.name;v.status.set(ic.name,mesh);
              mesh.renderOrder = 10;
              v.group.add(mesh);
            }
            (mesh.material as THREE.MeshBasicMaterial).color.setHex(ic.color);
            mesh.visible = true;
            mesh.position.set(-0.7 + slot * 0.55, e.def.height + 1.6, 0);
            slot++;
          } else if (mesh) {
            mesh.visible = false;
          }
        }
      }
      if(e.airdrop)v.group.rotation.set(0,h,0,"YXZ");
      else if (e.kind === "tank") {
        const f = 2, sa = Math.sin(h), ca = Math.cos(h);
        const hf = heightAt(x + sa * f, z + ca * f), hb = heightAt(x - sa * f, z - ca * f);
        const hr = heightAt(x + ca * 1.5, z - sa * 1.5), hl = heightAt(x - ca * 1.5, z + sa * 1.5);
        // Heading first, then bounded local suspension tilt. Raw terrain seams
        // must not flip a vehicle onto its side.
        const tilt = (angle: number) => Math.max(-0.35,Math.min(0.35,angle));
        springSuspension(v.suspensionPitch,tilt(-Math.atan2(hf-hb,2*f)+chassisPitch*.5),frameDt,v.resetPose);
        springSuspension(v.suspensionRoll,tilt(Math.atan2(hr-hl,3)+chassisRoll*.5),frameDt,v.resetPose);
        v.group.rotation.set(v.suspensionPitch.value,h,v.suspensionRoll.value,"YXZ");
      } else if(e.def.domain==="sea")v.group.rotation.set(Math.sin(animT*.8)*.015,h,Math.sin(animT*.6)*.025,"YXZ");
      else if(e.def.armor === "air")v.group.rotation.set(v.pose.pitch,h,v.pose.bank,"YXZ");
      else if(e.def.speed>0&&e.def.category!=="infantry"){
        const sa=Math.sin(h),ca=Math.cos(h),length=2;
        const pitch=-Math.atan2(heightAt(x+sa*length,z+ca*length)-heightAt(x-sa*length,z-ca*length),length*2)+chassisPitch;
        const roll=Math.atan2(heightAt(x+ca,z-sa)-heightAt(x-ca,z+sa),2)+chassisRoll;
        springSuspension(v.suspensionPitch,Math.max(-.3,Math.min(.3,pitch)),frameDt,v.resetPose);
        springSuspension(v.suspensionRoll,Math.max(-.3,Math.min(.3,roll)),frameDt,v.resetPose);
        v.group.rotation.set(v.suspensionPitch.value,h,v.suspensionRoll.value,"YXZ");
      } else v.group.rotation.y = h;
      if(shadow&&e.def.armor==="air"){
        const inverse=this.inverse.copy(v.group.quaternion).invert();shadow.position.set(0,ground-v.group.position.y+.045,0).applyQuaternion(inverse);shadow.quaternion.copy(inverse);
      }
      for(const turret of v.turrets)turret.rotation.y=lerpAngle(e.pTurretYaw,e.turretYaw,alpha);
      v.resetPose=false;
      v.ring.visible = selected.has(e.id);
      if (v.tactical) v.tactical.visible = selected.has(e.id);
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.scene.remove(v.group);
      v.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if(o instanceof THREE.LineSegments){o.geometry.dispose();(o.material as THREE.Material).dispose();return;}
        if (!m.isMesh) return;
        disposeUnitMesh(m, this.ringMat);
      });
      if(v.staticBuilding)this.shadowDirty=true;
      this.views.delete(id);
      this.rotorParts.delete(id);
      this.recoilById.delete(id);
    }
  }

  /** Last-known enemy positions (Wargame contact ghosts). */
  syncIntelGhosts(world: World): void {
    const team = world.playerTeam;
    const contacts = world.getIntel(team, true);
    const seen = new Set<number>();
    for (const c of contacts) {
      const age = world.time - c.lastSeen;
      if (age > 60) continue;
      const live = world.byId.get(c.entityId);
      // If currently spotted, real model is shown – skip ghost
      if (live && !live.dead && world.isSpottedByTeam(live, team)) continue;
      seen.add(c.entityId);
      let m = this.intelGhosts.get(c.entityId);
      if (!m) {
        const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.35, 10);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xc05050,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        m = new THREE.Mesh(geo, mat);
        this.scene.add(m);
        this.intelGhosts.set(c.entityId, m);
      }
      const fade = Math.max(0.15, 1 - age / 60);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.2 + fade * 0.35;
      const y = heightAt(c.x,c.z);
      m.position.set(c.x, y + 0.5, c.z);
      m.visible = true;
      m.scale.setScalar(c.kind === "tank" || c.kind === "ifv" ? 1.4 : c.kind === "inf" ? 0.7 : 1);
    }
    for (const [id, m] of this.intelGhosts) {
      if (!seen.has(id)) {
        this.scene.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        this.intelGhosts.delete(id);
      }
    }
  }

}

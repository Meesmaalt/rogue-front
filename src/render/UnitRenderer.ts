import * as THREE from "three";
import type { World } from "../sim/World";
import { heightAt } from "../sim/heightmap";
import { wrapAngle } from "../sim/math";
import {createModel as createVisualModel} from "./models";
import { createArtModel, disposeUnitMesh } from "./ArtModels";

// One soft contact texture and quad shared by all vehicles (two triangles).
const contactCanvas = document.createElement("canvas"); contactCanvas.width = contactCanvas.height = 64;
const contactContext = contactCanvas.getContext("2d")!;
const contactGradient = contactContext.createRadialGradient(32,32,4,32,32,31);
contactGradient.addColorStop(0,"rgba(0,0,0,0.38)"); contactGradient.addColorStop(1,"rgba(0,0,0,0)");
contactContext.fillStyle = contactGradient; contactContext.fillRect(0,0,64,64);
const contactGeometry = new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2); contactGeometry.userData.sharedArt = true;
const contactMaterial = new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}); contactMaterial.userData.sharedArt = true;

interface View { group: THREE.LOD; turret: THREE.Group | null; ring: THREE.Mesh; tactical: THREE.Mesh | null; kind: string; phase: number; recoil: number; upgradeKit?: THREE.Group; lastBuildingLevel?: number; lastAirState?: string }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t;
const frameDtSafe = () => 1 / 60;

/** Phase 73: architectural upgrade silhouettes. Each level adds a real module,
 * not just a marker, so a developed base is visibly larger/more capable. */
function addBuildingLevelArchitecture(kit: THREE.Group, kind: string, level: number): void {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5b615d, roughness: 0.88, metalness: 0.08 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3d4545, roughness: 0.68, metalness: 0.28 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xb98b38, roughness: 0.62, metalness: 0.2 });
  const module = (x:number,y:number,z:number,w:number,d:number,h:number,mat=concrete) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y+h/2,z); kit.add(m);
  };
  const silo = (x:number,z:number,r:number,h:number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),steel); m.position.set(x,h/2,z); kit.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r*0.82,r*0.82,0.12,12),accent); cap.position.set(x,h+0.06,z); kit.add(cap);
  };
  const mast = (x:number,z:number,h:number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,h,7),steel); m.position.set(x,h/2,z); kit.add(m);
    for (const yy of [h*0.35,h*0.65]) { const arm=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.06,0.06),accent); arm.position.set(x,yy,z); kit.add(arm); }
  };
  if (level >= 2) {
    if (["hq","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy"].includes(kind)) {
      module(-3.4,0,1.8,1.8,2.4,1.4,concrete); module(3.4,0,1.8,1.8,2.4,1.4,concrete); mast(0,-3.0,3.1);
    } else if (kind === "factory") {
      module(-3.9,0,1.0,2.4,3.6,1.8,steel); module(3.9,0,-1.2,2.2,2.8,1.3,steel); silo(-2.8,-3.1,0.65,1.9);
    } else if (kind === "barracks") {
      module(-3.6,0,0,2.4,4.2,1.5,concrete); module(3.6,0,0,2.4,4.2,1.5,concrete);
    } else if (kind === "supply") {
      module(-3.2,0,2.4,2.3,2.4,1.4,steel); module(3.2,0,2.4,2.3,2.4,1.4,steel); for (const x of [-1.8,0,1.8]) silo(x,-3.0,0.5,1.5);
    } else if (kind === "airbase") {
      module(-4.5,0,1.8,2.2,3.0,1.1,steel); module(4.5,0,1.8,2.2,3.0,1.1,steel); mast(-5.8,-3.8,2.4); mast(5.8,-3.8,2.4);
    } else if (kind === "helipad") {
      module(-3.2,0,1.8,2.0,2.4,1.0,steel); module(3.2,0,1.8,2.0,2.4,1.0,steel);
    } else if (kind === "refinery") {
      for (const x of [-3.2,-1.1,1.1,3.2]) silo(x,0.2,0.72,2.1); module(0,0,-3.1,5.5,1.1,1.5,steel);
    } else if (kind === "radar") {
      mast(0,0,4.0); module(-3.0,0,2.0,1.2,1.6,1.0,steel); module(3.0,0,2.0,1.2,1.6,1.0,steel);
    } else if (kind === "generator") {
      module(-2.5,0,0,2.0,2.6,1.1,steel); module(2.5,0,0,2.0,2.6,1.1,steel); silo(0,2.4,0.7,1.8);
    } else if (kind === "shipyard") {
      module(-4.0,0,1.2,2.8,4.2,1.4,steel); module(4.0,0,-1.2,2.8,4.2,1.4,steel); mast(0,-4.2,3.0);
    } else if (kind === "bunker" || kind === "aa") {
      module(-2.4,0,0,1.5,2.6,0.9,concrete); module(2.4,0,0,1.5,2.6,0.9,concrete);
    }
  }
  if (level >= 3) {
    if (["hq","landCommand","airCommand","seaCommand","landStrategy","airStrategy","seaStrategy"].includes(kind)) {
      module(0,0,-1.8,4.0,2.6,3.2,steel); mast(0,1.0,6.0);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.0,0.32,0.16,16),accent); dish.rotation.x=Math.PI/2; dish.position.set(0,6.1,1.0); kit.add(dish);
    } else if (kind === "factory") {
      module(0,0,0,4.8,3.4,2.7,steel); for (const x of [-2.0,0,2.0]) silo(x,-2.8,0.72,3.0); mast(3.8,2.5,4.2);
    } else if (kind === "barracks") {
      module(0,0,0,4.8,4.2,2.6,concrete); mast(0,-2.8,4.0);
    } else if (kind === "supply") {
      module(0,0,0,5.0,4.2,2.3,steel); for (const x of [-2.0,0,2.0]) silo(x,-3.0,0.65,2.7);
    } else if (kind === "airbase") {
      module(0,0,0,5.5,4.0,2.0,steel); mast(-4.8,-3.0,5.0); mast(4.8,-3.0,5.0);
    } else if (kind === "helipad") {
      module(0,0,0,4.4,3.2,1.7,steel); mast(0,-2.0,3.8);
    } else if (kind === "refinery") {
      for (const x of [-2.4,0,2.4]) silo(x,0,0.85,3.8); mast(0,-3.2,4.8);
    } else if (kind === "radar") {
      mast(0,0,6.5); const dish=new THREE.Mesh(new THREE.CylinderGeometry(1.4,0.38,0.18,16),accent); dish.rotation.x=Math.PI/2; dish.position.set(0,6.55,0); kit.add(dish);
    } else if (kind === "generator") {
      module(0,0,0,5.0,3.4,2.0,steel); silo(0,-2.5,0.9,3.0);
    } else if (kind === "shipyard") {
      module(0,0,0,5.8,4.6,2.0,steel); mast(0,-3.0,5.0);
    } else if (kind === "bunker" || kind === "aa") {
      module(0,0,0,4.8,3.2,1.8,concrete); mast(0,-2.0,2.8);
    }
  }
}

/** Sünkroonib sim-entiteedid three.js objektidega (interpoleeritud positsioon, kalle maastikule, valikurõngad). */
export class UnitRenderer {
  private intelGhosts = new Map<number, THREE.Mesh>();
  private views = new Map<number, View>();
  private rotorParts = new Map<number, THREE.Object3D[]>();
  private recoilById = new Map<number, number>();

  reset():void {
    for(const v of this.views.values()){
      this.scene.remove(v.group);v.group.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;disposeUnitMesh(m,this.ringMat);});
    }
    for(const m of this.intelGhosts.values()){this.scene.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();}
    this.views.clear();this.intelGhosts.clear();this.rotorParts.clear();this.recoilById.clear();
  }
  handleEvents(events: import("../sim/types").SimEvent[]): void {
    for (const e of events) {
      if (e.type === "fire" && e.sourceId) this.recoilById.set(e.sourceId, 1);
    }
  }
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xf2a33a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });

  constructor(private readonly scene: THREE.Scene) {}

  sync(world: World, alpha: number, selected: ReadonlySet<number>): void {
    const seen = new Set<number>();
    for (const e of world.entities) {
      if (e.dead || e.loadedIntoId !== null) continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) {
        const faction = e.team === world.playerTeam ? world.playerFaction : world.enemyFaction;
        const visual = createArtModel(e.kind, e.team, faction) ?? createVisualModel(e.kind, e.team, faction);
        // Authored GLBs retain the silhouette at tactical camera distance.
        const lod = new THREE.LOD();
        lod.addLevel(visual.group, 5000);
        const m = { group: lod, turret: visual.turret };
        const rotors: THREE.Object3D[] = [];
        visual.group.traverse(o => { if (o.name.startsWith("RotorMain") || o.name === "RotorCounter" || o.name === "TailRotor") rotors.push(o); });
        if (rotors.length) this.rotorParts.set(e.id, rotors);
        if (e.def.speed > 0 && !(e.squadMaxMembers ?? 0)) {
          const shadow = new THREE.Mesh(contactGeometry,contactMaterial); shadow.name = "ContactShadow";
          const radius = Math.max(1.5,e.def.radius); shadow.scale.set(radius*2.3,1,radius*3.4); shadow.position.y=.045;
          m.group.add(shadow);
        }
        const r = Math.max(e.def.radius, 1.2);
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.05, r * 1.22, 16).rotateX(-Math.PI / 2), this.ringMat);
        const tacticalKinds = ["aa", "bunker", "artillery"];
        const tactical = tacticalKinds.includes(e.kind) ? new THREE.Mesh(new THREE.RingGeometry(Math.max(2, e.firingRange * 0.96), Math.max(2.25, e.firingRange), 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x56a8d8, transparent: true, opacity: 0.10, depthWrite: false })) : null;
        ring.position.y = 0.3;
        ring.visible = false;
        m.group.add(ring);
        if (tactical) { tactical.position.y = 0.18; m.group.add(tactical); }
        // Enamik üksusi ei vaja dünaamilist shadow-map kirjutamist.
        // Hooneid võib varjutada, liikuvad üksused kasutavad odavamat valgustust.
        const staticBuilding = ["hq", "barracks", "factory", "helipad", "airbase", "refinery", "supply", "radar", "bunker", "aa", "generator", "shipyard", "landCommand", "airCommand", "seaCommand", "combatEngineer", "landStrategy", "airStrategy", "seaStrategy"].includes(e.kind);
        visual.group.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = staticBuilding;
          mesh.receiveShadow = true;
        });
        this.scene.add(m.group);
        v = { group: m.group, turret: m.turret, ring, tactical, kind: e.kind, phase: (e.id * 0.731) % 6.28, recoil: 0 };
        this.views.set(e.id, v);
      }
      const visible = e.team === world.playerTeam || world.isSpottedByTeam(e, world.playerTeam);
      v.group.visible = visible;
      if (!visible) continue;
      const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha), h = lerpAngle(e.pHeading, e.heading, alpha);
      const ground = heightAt(x,z);
      const flying = e.def.armor === "air" && e.airState !== "grounded" && e.airState !== "rearming" && e.airState !== "taxi";
      v.group.position.set(x, flying ? e.y : ground, z);
      const shadow = v.group.getObjectByName("ContactShadow");
      if(shadow) shadow.position.y = ground-v.group.position.y+.045;
      if ((e.squadMaxMembers ?? 0) > 0) {
        const alive = Math.max(1, e.squadMembers ?? e.squadMaxMembers!);
        let idx = 0;
        v.group.traverse((o) => {
          if (!o.name.startsWith("SquadMember")) return;
          const memberIndex = Number(o.name.slice("SquadMember".length));
          o.visible = memberIndex < alive;
          // Suppressed squads bunch up; healthy squads keep their tactical spacing.
          if (o.parent === v.group) {
            const spread = 1 - Math.min(0.45, (e.suppression ?? 0) / 220);
            if(!o.userData.squadPosition)o.userData.squadPosition=o.position.clone();
            const origin=o.userData.squadPosition as THREE.Vector3;
            o.position.x=origin.x*spread;o.position.z=origin.z*spread;
          }
          idx++;
        });
      }
      const buildingLevel = e.buildingLevel ?? (e.upgrades.has("producer-3") ? 3 : e.upgrades.has("producer-2") ? 2 : 1);
      if (v.lastBuildingLevel !== buildingLevel) {
        if (v.upgradeKit) {
          v.upgradeKit.parent?.remove(v.upgradeKit);
          v.upgradeKit.traverse((o) => {
            const mesh = o as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) mesh.material.forEach(m=>m.dispose());
            else (mesh.material as THREE.Material | undefined)?.dispose();
          });
        }
        const kit = new THREE.Group(); kit.name = "BuildingLevelDetails";
        addBuildingLevelArchitecture(kit, e.kind, buildingLevel);
        v.group.add(kit); v.upgradeKit = kit; v.lastBuildingLevel = buildingLevel;
      }
      if (e.upgrading) {
        const k = Math.max(0.2, Math.min(1, (e.upgradeProgress ?? 0) / Math.max(0.01, e.upgradeTime ?? 1)));
        v.group.scale.set(0.9 + 0.1 * k, 0.85 + 0.15 * k, 0.9 + 0.1 * k);
      } else if (e.underConstruction) {
        // Keep full silhouette – only slight growth; no flat green slab
        const k = Math.max(0.25, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        v.group.scale.set(0.88 + 0.12 * k, 0.75 + 0.25 * k, 0.88 + 0.12 * k);
      } else {
        v.group.scale.set(1, 1, 1);
      }
      const animT = performance.now() * 0.001 + v.phase;
      const recoil = this.recoilById.get(e.id) ?? 0;
      v.recoil = Math.max(0, recoil - frameDtSafe());
      if (v.recoil <= 0) this.recoilById.delete(e.id); else this.recoilById.set(e.id, v.recoil);

      // Liikumine, rootor, vedrustus ja õhuoperatsioonid. Kõik on odav transform-animatsioon.
      if (["heli", "gunship", "casHeli", "transport"].includes(e.kind)) {
        const airborne = e.airState !== "grounded" && e.airState !== "rearming";
        v.group.position.y += airborne ? Math.sin(animT * 7) * 0.08 : Math.sin(animT * 2) * 0.015;
        for (const rotor of this.rotorParts.get(e.id) ?? []) {
          const speed = airborne ? 1.0 : 0.15;
          if (rotor.name === "TailRotor") rotor.rotation.x += speed * 1.5;
          else rotor.rotation.y += rotor.name === "RotorCounter" ? -speed : speed;
        }
      }
      if (e.def.category === "infantry" || e.kind === "reconInf" || e.kind === "sniper") {
        const moving = Math.hypot(e.x-e.px,e.z-e.pz)>.003;
        v.group.traverse(o=>{if(o.name==="LeftLeg"||o.name==="RightLeg")o.rotation.x=moving?Math.sin(animT*10+(o.name==="RightLeg"?Math.PI:0))*.45:0;});
        const step = moving ? Math.abs(Math.sin(animT * 10)) * 0.045 : Math.sin(animT * 2) * 0.012;
        v.group.position.y += step;
        v.group.rotation.z = moving ? Math.sin(animT * 10) * 0.025 : 0;
      }
      if (e.kind === "tank" || e.kind === "artillery" || e.kind === "aa") {
        const moving = e.mode === "move" || e.mode === "amove" || e.mode === "patrol";
        v.group.position.y += moving ? Math.sin(animT * 14) * 0.025 : Math.sin(animT * 2) * 0.008;
      }
      if (["fighter", "interceptor", "multirole", "attackAircraft", "ecm", "bomber", "cargoPlane"].includes(e.kind)) {
        if (e.airState === "taxi") {
          const lift = Math.max(0, Math.sin(animT * 3)) * 0.22;
          v.group.position.y += lift;
          v.group.rotation.x = -0.035;
        } else if (e.airState === "airborne" || e.airState === "returning") {
          v.group.position.y += 1.2 + Math.sin(animT * 5) * 0.035;
          v.group.rotation.x = -0.055;
        } else {
          v.group.rotation.x = 0;
        }
      }
      const gun = v.turret?.getObjectByName("Gun");
      if (gun) {
        if (gun.userData.restZ === undefined) gun.userData.restZ = gun.position.z;
        gun.position.z = Number(gun.userData.restZ) - Math.sin(v.recoil * Math.PI) * 0.24;
      }
      const gear = v.group.getObjectByName("LandingGear");
      if (gear) gear.visible = e.y-ground<12;

      // Construction progress bar – always strip when finished (search all children)
      const barName = "ConstructBar";
      if (e.underConstruction) {
        const k = Math.max(0.05, Math.min(1, e.constructionProgress / Math.max(0.01, e.constructionTime)));
        let bar = v.group.getObjectByName(barName) as THREE.Mesh | undefined;
        if (!bar) {
          const geo = new THREE.BoxGeometry(1, 0.18, 0.18);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf2c14b });
          bar = new THREE.Mesh(geo, mat);
          bar.name = barName;
          v.group.add(bar);
        }
        bar.visible = true;
        bar.scale.set(Math.max(0.15, k) * (e.def.radius * 1.6), 1, 1);
        bar.position.set(0, e.def.height + 1.2, 0);
      } else {
        // Remove any leftover bars (construction complete)
        const leftovers: THREE.Object3D[] = [];
        v.group.traverse((o) => { if (o.name === barName) leftovers.push(o); });
        for (const o of leftovers) {
          o.parent?.remove(o);
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose();
          (mesh.material as THREE.Material | undefined)?.dispose();
        }
        if (e.productionQueue.length > 0) {
          const pulse = 1 + Math.sin(animT * 6) * 0.012;
          v.group.scale.x *= pulse; v.group.scale.z *= pulse;
        }
      }

      // Status icons (player units only): out of supply / routing / low ammo
      if (e.team === world.playerTeam && e.def.speed > 0) {
        const icons: { name: string; color: number; on: boolean }[] = [
          { name: "StOutSupply", color: 0xe05030, on: !world.isInSupply(e) && (((e.maxAmmo??0)>0 && (e.ammo??0)<(e.maxAmmo??1)*.35) || ((e.maxFuel??0)>0 && (e.fuel??0)<(e.maxFuel??1)*.35) || (e.supply??100)<20) },
          { name: "StRouting", color: 0xffcc33, on: (e.morale ?? 100) < 22 || (e.suppression ?? 0) > 80 },
          { name: "StNoAmmo", color: 0xaaaaaa, on: (e.maxAmmo ?? 0) > 0 && (e.ammo ?? 0) <= 0 },
        ];
        let slot = 0;
        for (const ic of icons) {
          let mesh = v.group.getObjectByName(ic.name) as THREE.Mesh | undefined;
          if (ic.on) {
            if (!mesh) {
              mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.28, 6, 6),
                new THREE.MeshBasicMaterial({ color: ic.color, depthTest: false }),
              );
              mesh.name = ic.name;
              mesh.renderOrder = 10;
              v.group.add(mesh);
            }
            mesh.visible = true;
            mesh.position.set(-0.7 + slot * 0.55, e.def.height + 1.6, 0);
            slot++;
          } else if (mesh) {
            mesh.visible = false;
          }
        }
      }
      if (e.kind === "tank") {
        const f = 2, sa = Math.sin(h), ca = Math.cos(h);
        const hf = heightAt(x + sa * f, z + ca * f), hb = heightAt(x - sa * f, z - ca * f);
        const hr = heightAt(x + ca * 1.5, z - sa * 1.5), hl = heightAt(x - ca * 1.5, z + sa * 1.5);
        // Heading first, then bounded local suspension tilt. Raw terrain seams
        // must not flip a vehicle onto its side.
        const tilt = (angle: number) => Math.max(-0.35,Math.min(0.35,angle));
        v.group.rotation.set(tilt(-Math.atan2(hf - hb, 2 * f)), h, tilt(Math.atan2(hr - hl, 3)), "YXZ");
      } else if(e.def.armor === "air")v.group.rotation.set(e.flightPitch??0,h,e.flightBank??0,"YXZ");
      else if(e.def.speed>0&&e.def.category!=="infantry"){
        const sa=Math.sin(h),ca=Math.cos(h),length=2;
        const pitch=-Math.atan2(heightAt(x+sa*length,z+ca*length)-heightAt(x-sa*length,z-ca*length),length*2);
        const roll=Math.atan2(heightAt(x+ca,z-sa)-heightAt(x-ca,z+sa),2);
        v.group.rotation.set(Math.max(-.3,Math.min(.3,pitch)),h,Math.max(-.3,Math.min(.3,roll)),"YXZ");
      } else v.group.rotation.y = h;
      if(shadow&&e.def.armor==="air"){
        const inverse=v.group.quaternion.clone().invert();shadow.position.set(0,ground-v.group.position.y+.045,0).applyQuaternion(inverse);shadow.quaternion.copy(inverse);
      }
      if (v.turret) v.turret.rotation.y = lerpAngle(e.pTurretYaw, e.turretYaw, alpha);
      v.ring.visible = selected.has(e.id);
      if (v.tactical) v.tactical.visible = selected.has(e.id);
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.scene.remove(v.group);
      v.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        disposeUnitMesh(m, this.ringMat);
      });
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
      const y = live && !live.dead ? live.y : 0;
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

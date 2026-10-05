import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FactionId } from "../sim/factions";
import type { Team, UnitKind } from "../sim/types";
import type { Model } from "./models";

export const ART_KINDS: UnitKind[] = ["tank", "lightTank", "ifv", "apc", "reconVehicle", "tankDestroyer", "artillery", "mlrs", "spaa", "fighter", "interceptor", "multirole", "attackAircraft", "ecm", "bomber", "heli", "gunship", "casHeli", "transport", "cargoPlane", "logiTruck"];
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<void>>();
const textures = new Map<FactionId, Promise<{camo:THREE.Texture;roughness:THREE.Texture;normal:THREE.Texture}>>();
const loader = new GLTFLoader();
const teamMarkings=new Map<string,THREE.MeshStandardMaterial>();
const root = `${import.meta.env.BASE_URL}models/art/`;

/** Preload before creating views. Bounded concurrent requests, reused by games
 * and arsenal. No geometry/material allocation for individual unit instances. */
export async function loadArtModels(factions: readonly FactionId[], kinds = ART_KINDS): Promise<void> {
  const jobs = factions.flatMap(faction => kinds.flatMap(kind => [false,true].map(tactical=>({ faction, kind, tactical }))));
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]!;
      await loadModel(job.faction, job.kind, job.tactical);
    }
  }));
}
async function loadModel(faction: FactionId, kind: UnitKind, tactical=false): Promise<void> {
  const key = `${faction}/${kind}${tactical?"-lod":""}`;
  if (cache.has(key)) return;
  let job = inflight.get(key);
  if (!job) {
    job = (async () => {
      let texture = textures.get(faction);
      if (!texture) {
        const textureLoader=new THREE.TextureLoader();
        texture=Promise.all(["camouflage","roughness","normal"].map(name=>textureLoader.loadAsync(`${root}${faction}/${name}.png`).then(t=>{
          if(name==="camouflage")t.colorSpace=THREE.SRGBColorSpace;
          t.wrapS=t.wrapT=THREE.RepeatWrapping;t.flipY=false;t.anisotropy=4;return t;
        }))).then(([camo,roughness,normal])=>({camo,roughness,normal}));
        textures.set(faction, texture);
      }
      const [gltf, surface] = await Promise.all([loader.loadAsync(`${root}${key}.glb`), texture]);
      const model = new THREE.Group(); model.add(gltf.scene);
      model.userData.artModel = key;
      model.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.userData.sharedArt = true;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const material of materials) {
          material.userData.sharedArt = true;
          if (material instanceof THREE.MeshStandardMaterial && material.name === "armor") {
            material.color.set(0xffffff); material.map = surface.camo;material.roughnessMap=surface.roughness;material.roughness=1;material.normalMap=surface.normal;material.normalScale.set(.28,.28); material.needsUpdate = true;
          }
        }
      });
      cache.set(key, model);
    })();
    inflight.set(key, job);
  }
  try { await job; } finally { inflight.delete(key); }
}

export function createArtModel(kind: UnitKind, team: Team, faction: FactionId, tactical=false): Model | null {
  const source = cache.get(`${faction}/${kind}${tactical?"-lod":""}`);
  if (!source) return null;
  const group = source.clone(true);
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const material = o.material;
    if (material instanceof THREE.MeshStandardMaterial && material.name === "marking") {
      const key=`${material.uuid}/${team}`;let marking=teamMarkings.get(key);
      if(!marking){marking=material.clone();marking.userData.sharedArt=true;marking.color.set(team===0?0x70caff:0xf36c48);teamMarkings.set(key,marking);}
      o.material=marking;
    }
  });
  return { group, turret: group.getObjectByName("Turret") as THREE.Group | undefined ?? null };
}

/** Cache resources survive casualties, load/reset and arsenal changes. */
export function disposeUnitMesh(mesh: THREE.Mesh, retainedMaterial?: THREE.Material): void {
  if (!mesh.geometry.userData.sharedArt) mesh.geometry.dispose();
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    if (material !== retainedMaterial && !material.userData.sharedArt) material.dispose();
  }
}

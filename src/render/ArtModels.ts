import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FactionId } from "../sim/factions";
import type { Team, UnitKind } from "../sim/types";
import type { Model } from "./models";

export const ART_KINDS: UnitKind[] = ["tank", "lightTank", "ifv", "apc", "reconVehicle", "tankDestroyer", "artillery", "mlrs", "spaa", "fighter", "interceptor", "multirole", "attackAircraft", "ecm", "bomber", "heli", "gunship", "casHeli", "transport", "cargoPlane", "logiTruck"];
const cache = new Map<string, THREE.Group>();
const inflight = new Map<string, Promise<void>>();
const textures = new Map<FactionId, Promise<THREE.Texture>>();
const loader = new GLTFLoader();
const root = `${import.meta.env.BASE_URL}models/art/`;

/** Preload before creating views. Bounded concurrent requests, reused by games
 * and arsenal. No geometry/material allocation for individual unit instances. */
export async function loadArtModels(factions: readonly FactionId[], kinds = ART_KINDS): Promise<void> {
  const jobs = factions.flatMap(faction => kinds.map(kind => ({ faction, kind })));
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]!;
      await loadModel(job.faction, job.kind);
    }
  }));
}
async function loadModel(faction: FactionId, kind: UnitKind): Promise<void> {
  const key = `${faction}/${kind}`;
  if (cache.has(key)) return;
  let job = inflight.get(key);
  if (!job) {
    job = (async () => {
      let texture = textures.get(faction);
      if (!texture) {
        texture = new THREE.TextureLoader().loadAsync(`${root}${faction}/camouflage.png`).then(t => {
          t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.flipY = false; t.anisotropy = 4; return t;
        });
        textures.set(faction, texture);
      }
      const [gltf, camo] = await Promise.all([loader.loadAsync(`${root}${key}.glb`), texture]);
      const model = new THREE.Group(); model.add(gltf.scene);
      model.userData.artModel = key;
      model.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.userData.sharedArt = true;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const material of materials) {
          material.userData.sharedArt = true;
          if (material instanceof THREE.MeshStandardMaterial && material.name === "armor") {
            material.color.set(0xffffff); material.map = camo; material.needsUpdate = true;
          }
        }
      });
      cache.set(key, model);
    })();
    inflight.set(key, job);
  }
  try { await job; } finally { inflight.delete(key); }
}

export function createArtModel(kind: UnitKind, team: Team, faction: FactionId): Model | null {
  const source = cache.get(`${faction}/${kind}`);
  if (!source) return null;
  const group = source.clone(true);
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const material = o.material;
    if (material instanceof THREE.MeshStandardMaterial && material.name === "marking") {
      o.material = material.clone(); o.material.userData.sharedArt = false;
      o.material.color.set(team === 0 ? 0x70caff : 0xf36c48);
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

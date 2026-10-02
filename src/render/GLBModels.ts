import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Team, UnitKind } from "../sim/types";
import { createModel } from "./models";

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/** GLB pipeline with a deterministic local primitive fallback. Local assets can be dropped in public/models/<kind>.glb. */
export async function preloadModels(): Promise<void> {
  const kinds: UnitKind[] = ["tank", "inf", "hq", "bunker", "heli", "transport", "gunship", "fighter", "artillery", "aa", "barracks", "factory", "helipad", "airbase", "supply", "radar", "refinery", "generator", "destroyer", "submarine", "landingcraft", "special", "shipyard"];
  await Promise.all(kinds.map(async (kind) => {
    try {
      const gltf = await loader.loadAsync(`/models/${kind}.glb`);
      cache.set(kind, gltf.scene);
    } catch {
      // Optional assets: the procedural model remains the offline-safe fallback.
    }
  }));
}

export function createVisualModel(kind: UnitKind, team: Team): { group: THREE.Group; turret: THREE.Group | null } {
  const buildingKinds: UnitKind[] = ["hq","bunker","barracks","factory","helipad","airbase","supply","radar","refinery","generator","shipyard","landCommand","airCommand","seaCommand","combatEngineer","landStrategy","airStrategy","seaStrategy"];
  // Combat units use the optimized procedural military models; building GLBs remain available for richer silhouettes.
  if (!buildingKinds.includes(kind)) return createModel(kind, team);
  const source = cache.get(kind);
  if (!source) return createModel(kind, team);
  const group = source.clone(true);
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    const materials = Array.isArray(m.material) ? m.material : [m.material];
    m.material = materials.map((base) => {
      const clone = base.clone() as THREE.MeshStandardMaterial;
      if (clone.color) clone.color.multiply(new THREE.Color(team === 0 ? 0.95 : 0.72, team === 0 ? 1 : 0.76, team === 0 ? 0.95 : 0.72));
      return clone;
    });
  });
  group.userData.unitKind = kind;
  // Kui GLB-s on rotor/propeller nimega Rotor, saab UnitRenderer seda pöörata.
  return { group, turret: null };
}

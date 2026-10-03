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
  // Prefer detailed procedural military silhouettes for consistent Real-War-like readability.
  // GLB assets remain loaded for future use but procedural wins until art pass is complete.
  return createModel(kind, team);
}

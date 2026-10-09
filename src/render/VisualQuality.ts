import * as THREE from "three";

export interface VisualProfile {
  pixelRatio: number;
  shadows: boolean;
  post: boolean;
  bloom: boolean;
  ssao: boolean;
  lod: boolean;
  shadowSize: number;
}

export function chooseVisualProfile(quality: "low" | "medium" | "high" = "high"): VisualProfile {
  const coarse = matchMedia("(max-width: 1100px)").matches;
  const lowMemory = typeof navigator !== "undefined" && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
    && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  // RTS-is on GPU mõistlikum hoida renderdusresolutsioon 1.0–1.5x juures;
  // 2x annab suure kaardi ja paljude üksuste puhul väga kiiresti liiga palju pikslitööd.
  const autoRatio = Math.min(window.devicePixelRatio || 1, coarse || lowMemory ? 1.0 : 1.25);
  if (quality === "low") return { pixelRatio: .75, shadows: false, post: false, bloom: false, ssao: false, lod: true, shadowSize:0 };
  if (quality === "medium") return { pixelRatio: 1, shadows: false, post: false, bloom: false, ssao: false, lod: true, shadowSize:0 };
  return { pixelRatio: Math.min(1.25, autoRatio), shadows: true, post: false, bloom: false, ssao: false, lod: true, shadowSize:coarse||lowMemory?1024:2048 };
}

export function configureColorManagement(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
}

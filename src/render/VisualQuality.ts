import * as THREE from "three";

export interface VisualProfile {
  pixelRatio: number;
  shadows: boolean;
  post: boolean;
  bloom: boolean;
  ssao: boolean;
  lod: boolean;
}

export function chooseVisualProfile(quality: "low" | "medium" | "high" = "high"): VisualProfile {
  const coarse = matchMedia("(max-width: 1100px)").matches;
  const lowMemory = typeof navigator !== "undefined" && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
    && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const autoRatio = Math.min(window.devicePixelRatio || 1, coarse || lowMemory ? 1.5 : 2);
  if (quality === "low") return { pixelRatio: 1, shadows: false, post: false, bloom: false, ssao: false, lod: true };
  if (quality === "medium") return { pixelRatio: Math.min(1.5, autoRatio), shadows: true, post: true, bloom: true, ssao: false, lod: true };
  return { pixelRatio: autoRatio, shadows: true, post: true, bloom: true, ssao: !coarse && !lowMemory, lod: true };
}

export function configureColorManagement(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

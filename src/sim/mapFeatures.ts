import type { Point } from "./types";

export type MapFeatureKind = "road" | "bridge" | "building" | "wall" | "chokepoint" | "cover" | "gate";

export interface MapFeatureDef {
  id: string;
  kind: MapFeatureKind;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
  height?: number;
  blocksMovement?: boolean;
  /** Optional tactical metadata used by UI/rendering. */
  label?: string;
}

export function featureBlocksMovement(feature: MapFeatureDef): boolean {
  return feature.blocksMovement ?? ["building", "wall", "chokepoint"].includes(feature.kind);
}

export function featureCorners(f: MapFeatureDef): Point[] {
  const a = (f.rotation ?? 0);
  const c = Math.cos(a), s = Math.sin(a);
  const hw = f.width / 2, hd = f.depth / 2;
  return [
    { x: f.x + (-hw * c + -hd * s), z: f.z + (-hw * s + hd * c) },
    { x: f.x + ( hw * c + -hd * s), z: f.z + ( hw * s + hd * c) },
    { x: f.x + ( hw * c +  hd * s), z: f.z + ( hw * s - hd * c) },
    { x: f.x + (-hw * c +  hd * s), z: f.z + (-hw * s - hd * c) },
  ];
}

export function pointInFeature(x: number, z: number, f: MapFeatureDef, padding = 0): boolean {
  const a = -(f.rotation ?? 0);
  const c = Math.cos(a), s = Math.sin(a);
  const dx = x - f.x, dz = z - f.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) <= f.width / 2 + padding && Math.abs(lz) <= f.depth / 2 + padding;
}

import type { Point } from "./types";

export type MapFeatureKind = "road" | "bridge" | "building" | "wall" | "chokepoint" | "cover" | "gate" | "water";

export interface MapFeatureDef {
  garrisonable?:boolean; garrisonCapacity?:number;
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
  appearance?: "forest" | "field" | "farmhouse" | "hedge" | "resource-industrial" | "resource-oil" | "yard";
  color?: number;
  shape?:"ellipse";density?:number;
}

export function featureBlocksMovement(feature: MapFeatureDef): boolean {
  return feature.blocksMovement ?? ["building", "wall", "chokepoint", "water"].includes(feature.kind);
}

export function featureCorners(f: MapFeatureDef): Point[] {
  const a = (f.rotation ?? 0);
  const c = Math.cos(a), s = Math.sin(a);
  const hw = f.width / 2, hd = f.depth / 2;
  return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([x,z]) => ({x:f.x+x*c+z*s,z:f.z-x*s+z*c}));
}

export function pointInFeature(x: number, z: number, f: MapFeatureDef, padding = 0): boolean {
  const a = f.rotation ?? 0;
  const c = Math.cos(a), s = Math.sin(a);
  const dx = x - f.x, dz = z - f.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return f.shape==="ellipse"?(lx/(f.width/2+padding))**2+(lz/(f.depth/2+padding))**2<=1:Math.abs(lx) <= f.width / 2 + padding && Math.abs(lz) <= f.depth / 2 + padding;
}

/** Feathered forest edge shared by movement, cover, sensors and tree placement. */
export function forestDensityAt(x:number,z:number,features:readonly MapFeatureDef[]):number {
  let density=0;
  for(const f of features){
    if(f.appearance!=="forest"||!pointInFeature(x,z,f))continue;
    const a=f.rotation??0,dx=x-f.x,dz=z-f.z,lx=dx*Math.cos(a)-dz*Math.sin(a),lz=dx*Math.sin(a)+dz*Math.cos(a);
    const edge=f.shape==="ellipse"?1-Math.sqrt((lx/(f.width/2))**2+(lz/(f.depth/2))**2):Math.min(1-Math.abs(lx)/(f.width/2),1-Math.abs(lz)/(f.depth/2));
    density=Math.max(density,(f.density??1)*Math.min(1,.35+edge*3));
  }
  if(density&&features.some(f=>(f.kind==="road"||f.kind==="bridge"||f.appearance==="yard")&&pointInFeature(x,z,f,1)))return 0;
  return Math.min(1,density);
}

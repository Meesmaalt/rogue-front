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
  /** Absolute water surface / bridge deck elevation, shared by sim and render. */
  surfaceHeight?:number;
  roadClass?:"arterial"|"secondary"|"street"|"track";
  blocksMovement?: boolean;
  /** Optional tactical metadata used by UI/rendering. */
  label?: string;
  appearance?: "forest" | "field" | "farmhouse" | "hedge" | "resource-industrial" | "resource-oil" | "yard";
  color?: number;
  /** Crop-row direction only; polygon bounds remain axis aligned for spatial queries. */
  cropRotation?:number;
  facadeColor?:number;
  district?:"center"|"residential"|"rural"|"industrial";
  buildingStyle?:"residential"|"rowhouse"|"industrial"|"rural"|"apartment"|"shop"|"barn"|"warehouse"|"civic";
  shape?:"ellipse";density?:number;
  polygon?:Point[];
  waterBody?:"river"|"lake"|"sea";
}

export function featureBlocksMovement(feature: MapFeatureDef): boolean {
  return feature.blocksMovement ?? ["building", "wall", "chokepoint", "water"].includes(feature.kind);
}

export function featureCorners(f: MapFeatureDef): Point[] {
  if(f.polygon)return f.polygon.map(p=>({...p}));
  if(f.shape==="ellipse"){const a=f.rotation??0,c=Math.cos(a),s=Math.sin(a);return Array.from({length:64},(_,i)=>{const t=i*Math.PI/32,x=Math.cos(t)*f.width/2,z=Math.sin(t)*f.depth/2;return {x:f.x+x*c+z*s,z:f.z-x*s+z*c};});}
  const a = (f.rotation ?? 0);
  const c = Math.cos(a), s = Math.sin(a);
  const hw = f.width / 2, hd = f.depth / 2;
  return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([x,z]) => ({x:f.x+x*c+z*s,z:f.z-x*s+z*c}));
}

export function isSeaFeature(f:MapFeatureDef):boolean {return f.kind==="water"&&(f.waterBody==="sea"||f.waterBody!=="lake"&&f.width>=128);}
export function polygonEdgeDistance(x:number,z:number,points:readonly Point[]):number {
  let best=Infinity;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,(x-a.x-dx*t)**2+(z-a.z-dz*t)**2);}
  return Math.sqrt(best);
}
export function pointInFeature(x: number, z: number, f: MapFeatureDef, padding = 0): boolean {
  if(f.polygon){
    let inside=false;const points=f.polygon;
    for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}
    return inside||polygonEdgeDistance(x,z,points)<=Math.max(0,padding);
  }
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
    const edge=f.polygon?polygonEdgeDistance(x,z,f.polygon)/Math.max(1,Math.min(f.width,f.depth)/2):f.shape==="ellipse"?1-Math.sqrt((lx/(f.width/2))**2+(lz/(f.depth/2))**2):Math.min(1-Math.abs(lx)/(f.width/2),1-Math.abs(lz)/(f.depth/2));
    density=Math.max(density,(f.density??1)*Math.min(1,.35+edge*3));
  }
  if(density&&features.some(f=>(f.kind==="road"||f.kind==="bridge"||f.kind==="water"||f.appearance==="yard")&&pointInFeature(x,z,f,1)))return 0;
  return Math.min(1,density);
}

/** Conservative rotated footprint bins; exact predicates remain at each consumer.
 * Source order is preserved, so overlapping roads keep deterministic precedence. */
export class MapFeatureIndex {
  private readonly bins=new Map<string,MapFeatureDef[]>();
  private readonly empty:readonly MapFeatureDef[]=[];
  constructor(features:readonly MapFeatureDef[],private readonly cellSize=64,padding=3){
    for(const f of features){
      const c=Math.abs(Math.cos(f.rotation??0)),s=Math.abs(Math.sin(f.rotation??0));
      const hx=c*(f.width/2+padding)+s*(f.depth/2+padding);
      const hz=s*(f.width/2+padding)+c*(f.depth/2+padding);
      for(let x=Math.floor((f.x-hx)/cellSize);x<=Math.floor((f.x+hx)/cellSize);x++)
        for(let z=Math.floor((f.z-hz)/cellSize);z<=Math.floor((f.z+hz)/cellSize);z++){
          const key=`${x}/${z}`,bin=this.bins.get(key);
          if(bin)bin.push(f);else this.bins.set(key,[f]);
        }
    }
  }
  at(x:number,z:number):readonly MapFeatureDef[]{
    return this.bins.get(`${Math.floor(x/this.cellSize)}/${Math.floor(z/this.cellSize)}`)??this.empty;
  }
}

import battleScale from "../data/battle-scale.json";
import {pointInFeature,polygonEdgeDistance,type MapFeatureDef} from "./mapFeatures";
import terrain from "../data/terrain.json";
/** Kaardi kõrgusväli. Puhas matemaatika, EI impordi three.js-i. */
export let MAP_SIZE = 640;
export function setMapSize(size=640):void {
  const next=Math.max(320,Math.min(6144,Math.round(size/16)*16));
  if(next===MAP_SIZE)return;MAP_SIZE=next;CACHE_CELL=Math.max(2,next/battleScale.heightCells);CACHE_HALF=next/2;CACHE_CELLS=Math.round(next/CACHE_CELL);cacheValid=false;heightCache=null;
}
export interface BaseDef { x: number; z: number; r: number }
export interface HeightmapSource { width: number; height: number; data: Uint8Array; maxHeight: number }

const DEFAULT_BASES: readonly BaseDef[] = [
  { x: -130, z: 130, r: 34 },
  { x: 130, z: -130, r: 34 },
];
let activeBases: readonly BaseDef[] = DEFAULT_BASES;
let activeHeightmap: HeightmapSource | null = null;
let proceduralSeed = 1;
export interface TerrainLandform {x:number;z:number;width:number;depth:number;height:number;shape?:"ridge";rotation?:number}
let activeLandforms:readonly TerrainLandform[]=terrain.farmland.landforms;
const compileRelief=(forms:readonly TerrainLandform[])=>forms.map(f=>({f,c:Math.cos(f.rotation??0),s:Math.sin(f.rotation??0),extent:Math.hypot(f.width,f.depth)}));
let reliefTransforms=compileRelief(activeLandforms);
let terrainProfile: "farmland" | "farmland-natural" | undefined;
export function setTerrainProfile(profile?: "farmland" | "farmland-natural",landforms?:readonly TerrainLandform[]): void { terrainProfile=profile; activeLandforms=landforms??terrain.farmland.landforms;reliefTransforms=compileRelief(activeLandforms);activeHeightmap=null; cacheValid=false; heightCache=null; }

/** Cached height grid (2 m cells) — built once after bases/heightmap are set. */
let CACHE_CELL = 2;
let CACHE_HALF = MAP_SIZE / 2;
let CACHE_CELLS = Math.round(MAP_SIZE / CACHE_CELL);
let heightCache: Float32Array | null = null;
let cacheValid = false;

let hydrology: {f:MapFeatureDef;c:number;s:number}[]=[];
let hydrologyKey="";
const hydrologyBins=new Map<string,typeof hydrology>(),emptyHydrology:typeof hydrology=[];
const hydrologyAt=(x:number,z:number)=>hydrologyBins.get(`${Math.floor(x/128)}/${Math.floor(z/128)}`)??emptyHydrology;

/** Static map geometry, baked into the same height cache used by every consumer. */
export function setTerrainFeatures(features:readonly MapFeatureDef[]):void {
  const water=features.filter(f=>(f.kind==="water"||f.kind==="bridge")&&f.surfaceHeight!=null);
  const key=JSON.stringify(water);if(key===hydrologyKey)return;
  hydrologyKey=key;hydrology=water.map(f=>({f,c:Math.cos(f.rotation??0),s:Math.sin(f.rotation??0),extent:Math.hypot(f.width,f.depth)}));
  hydrologyBins.clear();
  for(const item of hydrology){
    const {f,c,s}=item,padding=14;
    const factor=f.shape==='ellipse'?1+padding/Math.max(.01,Math.min(f.width,f.depth)/2):1;
    const hx=f.shape==='ellipse'?f.width/2*factor:f.width/2+padding,hz=f.shape==='ellipse'?f.depth/2*factor:f.depth/2+padding;
    const ex=Math.abs(c)*hx+Math.abs(s)*hz,ez=Math.abs(s)*hx+Math.abs(c)*hz;
    for(let z=Math.floor((f.z-ez)/128);z<=Math.floor((f.z+ez)/128);z++)for(let x=Math.floor((f.x-ex)/128);x<=Math.floor((f.x+ex)/128);x++){
      const key=`${x}/${z}`,list=hydrologyBins.get(key);if(list)list.push(item);else hydrologyBins.set(key,[item]);
    }
  }
  cacheValid=false;heightCache=null;
}
export const BASES = DEFAULT_BASES;
export function getBases(): readonly BaseDef[] { return activeBases; }
export function setBases(bases: readonly BaseDef[]): void {
  activeBases = bases.length ? bases : DEFAULT_BASES;
  cacheValid = false;
}
export function setProceduralSeed(seed: number): void { proceduralSeed = seed | 0; cacheValid = false; heightCache = null; }

export function resetHeightmap(): void {
  hydrology=[];hydrologyKey="";hydrologyBins.clear();
  setMapSize(640);
  activeHeightmap = null;
  terrainProfile = undefined;activeLandforms=terrain.farmland.landforms;reliefTransforms=compileRelief(activeLandforms);
  activeBases = DEFAULT_BASES;
  cacheValid = false;
  heightCache = null;
}

export async function loadHeightmap(url: string, maxHeight = 80): Promise<void> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const size = Math.max(image.naturalWidth, image.naturalHeight);
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Heightmap canvas unavailable");
  ctx.drawImage(image, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const gray = new Uint8Array(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = data[i * 4];
  activeHeightmap = { width: size, height: size, data: gray, maxHeight };
  cacheValid = false;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash2(x:number,z:number): number {
  let n = Math.imul((Math.floor(x)+proceduralSeed)|0, 374761393) ^ Math.imul((Math.floor(z)+proceduralSeed*31)|0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}
function valueNoise(x:number,z:number,scale:number): number {
  const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=fx-x0,tz=fz-z0;
  const h=(ix:number,iz:number)=>hash2(ix*scale,iz*scale);
  const sx=tx*tx*(3-2*tx),sz=tz*tz*(3-2*tz);
  const a=h(x0,z0)*(1-sx)+h(x0+1,z0)*sx,b=h(x0,z0+1)*(1-sx)+h(x0+1,z0+1)*sx;
  return a*(1-sz)+b*sz;
}
function rawH(x: number, z: number): number {
  if (terrainProfile === "farmland" || terrainProfile === "farmland-natural") {
    let h=1.8+valueNoise(x,z,100)*2.6+valueNoise(x+13,z-17,45)*.7;
    if(terrainProfile==="farmland-natural")h+=valueNoise(x-31,z+29,terrain.natural.detailScale)*terrain.natural.detailHeight+valueNoise(x+91,z-53,terrain.natural.microScale)*terrain.natural.microHeight;
    for(const {f,c,s,extent} of reliefTransforms){
      if(f.shape==="ridge"){
        if(Math.abs(x-f.x)>extent||Math.abs(z-f.z)>extent)continue;
        const dx=x-f.x,dz=z-f.z,u=dx*c-dz*s,v=dx*s+dz*c,d=(u/f.width)**2+(v/f.depth)**2;
        if(d<1)h+=f.height*(1-d)**2;
      }else {const d=((x-f.x)/f.width)**2+((z-f.z)/f.depth)**2;h+=f.height*Math.exp(-d*2);}
    }
    return h;
  }
  const broad=(valueNoise(x,z,90)-0.5)*22;
  const medium=(valueNoise(x+17,z-11,38)-0.5)*9;
  const fine=(valueNoise(x-9,z+23,15)-0.5)*3;
  return broad+medium+fine;
}

function proceduralHeight(x: number, z: number): number {
  let h = rawH(x, z);
  // Flatten bases more smoothly (wider blend, less abrupt bowl rim)
  for (const b of activeBases) {
    const d = Math.hypot(x - b.x, z - b.z);
    h *= smooth(b.r * 0.85, b.r * 2.1, d);
  }
  // Softer map-edge rise
  h += smooth(MAP_SIZE*.44, MAP_SIZE*.525, Math.max(Math.abs(x), Math.abs(z))) * (terrainProfile ? 2 : 14);
  return h;
}

function sampleHeightmap(x: number, z: number): number {
  const hm = activeHeightmap!;
  const fx = Math.max(0, Math.min(1, (x + MAP_SIZE / 2) / MAP_SIZE)) * (hm.width - 1);
  const fz = Math.max(0, Math.min(1, (z + MAP_SIZE / 2) / MAP_SIZE)) * (hm.height - 1);
  const x0 = Math.floor(fx), z0 = Math.floor(fz), x1 = Math.min(hm.width - 1, x0 + 1), z1 = Math.min(hm.height - 1, z0 + 1);
  const tx = fx - x0, tz = fz - z0;
  const at = (ix: number, iz: number) => hm.data[iz * hm.width + ix] / 255 * hm.maxHeight;
  const a = at(x0, z0) * (1 - tx) + at(x1, z0) * tx;
  const b = at(x0, z1) * (1 - tx) + at(x1, z1) * tx;
  return a * (1 - tz) + b * tz;
}

function computeRaw(x: number, z: number, decks=true): number {
  let h=activeHeightmap?sampleHeightmap(x,z):proceduralHeight(x,z);
  const candidates=hydrologyAt(x,z);
  for(const {f,c,s} of candidates){
    if(f.kind!=="water")continue;
    const dx=x-f.x,dz=z-f.z,lx=Math.abs(dx*c-dz*s),lz=Math.abs(dx*s+dz*c);
    if(f.polygon&&(lx>f.width/2+14||lz>f.depth/2+14))continue;
    const outside=f.polygon?(pointInFeature(x,z,f)?0:polygonEdgeDistance(x,z,f.polygon)):f.shape==="ellipse"?Math.max(0,Math.sqrt((lx/(f.width/2))**2+(lz/(f.depth/2))**2)-1)*Math.min(f.width,f.depth)/2:Math.max(lx-f.width/2,lz-f.depth/2,0);
    if(outside<14){const blend=1-smooth(0,14,outside);h=Math.min(h,h+(f.surfaceHeight!-2.4-h)*blend);}
  }
  for(const {f,c,s} of candidates){
    if(!decks||f.kind!=="bridge")continue;
    const dx=x-f.x,dz=z-f.z,lx=Math.abs(dx*c-dz*s),lz=Math.abs(dx*s+dz*c);
    const outside=Math.max(lx-f.width/2,lz-f.depth/2,0);
    if(outside<12){const blend=1-smooth(0,12,outside);h+=(f.surfaceHeight!-h)*blend;}
  }
  return h;
}

/** Render the riverbed below bridges; units use heightAt's elevated deck. */
export function groundHeightAt(x:number,z:number):number {
  for(const {f,c,s} of hydrology){
    if(f.kind!=="bridge")continue;
    const dx=x-f.x,dz=z-f.z;
    if(Math.abs(dx*c-dz*s)<f.width/2+14&&Math.abs(dx*s+dz*c)<f.depth/2+14){
      const wet=hydrology.some(({f:water})=>water.kind==="water"&&pointInFeature(x,z,water));
      // Keep the wet channel below the deck; dry approaches follow the same
      // flattened bank/ramp as units, so long decks cannot disappear in soil.
      return wet?computeRaw(x,z,false):heightAt(x,z);
    }
  }
  return heightAt(x,z);
}

/** Build / rebuild the 2 m height cache. Call once after bases or heightmap change. */
export function ensureHeightCache(): void {
  if (cacheValid && heightCache) return;
  if (!heightCache) heightCache = new Float32Array(CACHE_CELLS * CACHE_CELLS);
  for (let iz = 0; iz < CACHE_CELLS; iz++) {
    for (let ix = 0; ix < CACHE_CELLS; ix++) {
      const x = -CACHE_HALF + (ix + 0.5) * CACHE_CELL;
      const z = -CACHE_HALF + (iz + 0.5) * CACHE_CELL;
      heightCache[iz * CACHE_CELLS + ix] = computeRaw(x, z);
    }
  }
  cacheValid = true;
}

/**
 * Fast height lookup. Uses bilinear interpolation on the cached grid when available.
 * Falls back to exact procedural / heightmap sample if cache not ready.
 */
export function heightAt(x: number, z: number): number {
  if (!cacheValid || !heightCache) {
    return computeRaw(x, z);
  }
  // bilinear sample of cache
  const fx = (x + CACHE_HALF) / CACHE_CELL - 0.5;
  const fz = (z + CACHE_HALF) / CACHE_CELL - 0.5;
  const x0 = Math.max(0, Math.min(CACHE_CELLS - 1, Math.floor(fx)));
  const z0 = Math.max(0, Math.min(CACHE_CELLS - 1, Math.floor(fz)));
  const x1 = Math.min(CACHE_CELLS - 1, x0 + 1);
  const z1 = Math.min(CACHE_CELLS - 1, z0 + 1);
  const tx = fx - x0;
  const tz = fz - z0;
  const a = heightCache[z0 * CACHE_CELLS + x0] * (1 - tx) + heightCache[z0 * CACHE_CELLS + x1] * tx;
  const b = heightCache[z1 * CACHE_CELLS + x0] * (1 - tx) + heightCache[z1 * CACHE_CELLS + x1] * tx;
  return a * (1 - tz) + b * tz;
}

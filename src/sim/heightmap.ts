import terrain from "../data/terrain.json";
/** Kaardi kõrgusväli. Puhas matemaatika, EI impordi three.js-i. */
export let MAP_SIZE = 640;
export function setMapSize(size=640):void {
  const next=Math.max(320,Math.min(1600,Math.round(size/16)*16));
  if(next===MAP_SIZE)return;MAP_SIZE=next;CACHE_HALF=next/2;CACHE_CELLS=Math.round(next/CACHE_CELL);cacheValid=false;heightCache=null;
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
let terrainProfile: "farmland" | undefined;
export function setTerrainProfile(profile?: "farmland"): void { terrainProfile=profile; activeHeightmap=null; cacheValid=false; heightCache=null; }

/** Cached height grid (2 m cells) — built once after bases/heightmap are set. */
const CACHE_CELL = 2;
let CACHE_HALF = MAP_SIZE / 2;
let CACHE_CELLS = Math.round(MAP_SIZE / CACHE_CELL);
let heightCache: Float32Array | null = null;
let cacheValid = false;

export const BASES = DEFAULT_BASES;
export function getBases(): readonly BaseDef[] { return activeBases; }
export function setBases(bases: readonly BaseDef[]): void {
  activeBases = bases.length ? bases : DEFAULT_BASES;
  cacheValid = false;
}
export function setProceduralSeed(seed: number): void { proceduralSeed = seed | 0; cacheValid = false; heightCache = null; }

export function resetHeightmap(): void {
  setMapSize(640);
  activeHeightmap = null;
  terrainProfile = undefined;
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
  if (terrainProfile === "farmland") {
    let h=1.8+valueNoise(x,z,100)*2.6+valueNoise(x+13,z-17,45)*.7;
    for(const f of terrain.farmland.landforms){const d=((x-f.x)/f.width)**2+((z-f.z)/f.depth)**2;h+=f.height*Math.exp(-d*2);}
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

function computeRaw(x: number, z: number): number {
  return activeHeightmap ? sampleHeightmap(x, z) : proceduralHeight(x, z);
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

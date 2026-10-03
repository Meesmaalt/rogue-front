/** Kaardi kõrgusväli. Puhas matemaatika, EI impordi three.js-i. */
export const MAP_SIZE = 400;
export interface BaseDef { x: number; z: number; r: number }
export interface HeightmapSource { width: number; height: number; data: Uint8Array; maxHeight: number }

const DEFAULT_BASES: readonly BaseDef[] = [
  { x: -130, z: 130, r: 34 },
  { x: 130, z: -130, r: 34 },
];
let activeBases: readonly BaseDef[] = DEFAULT_BASES;
let activeHeightmap: HeightmapSource | null = null;

/** Cached height grid (2 m cells) — built once after bases/heightmap are set. */
const CACHE_CELL = 2;
const CACHE_HALF = MAP_SIZE / 2;
const CACHE_CELLS = Math.round(MAP_SIZE / CACHE_CELL);
let heightCache: Float32Array | null = null;
let cacheValid = false;

export const BASES = DEFAULT_BASES;
export function getBases(): readonly BaseDef[] { return activeBases; }
export function setBases(bases: readonly BaseDef[]): void {
  activeBases = bases.length ? bases : DEFAULT_BASES;
  cacheValid = false;
}
export function resetHeightmap(): void {
  activeHeightmap = null;
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

function rawH(x: number, z: number): number {
  return (
    Math.sin(x * 0.021 + 1.7) * Math.cos(z * 0.017) * 9 +
    Math.sin(x * 0.047 + z * 0.039) * 3.2 +
    Math.sin(x * 0.11) * Math.sin(z * 0.093 + 2) * 1.1 +
    Math.cos((x + z) * 0.008) * 6
  );
}

function proceduralHeight(x: number, z: number): number {
  let h = rawH(x, z);
  for (const b of activeBases) h *= smooth(b.r * 0.6, b.r * 1.5, Math.hypot(x - b.x, z - b.z));
  h += smooth(165, 200, Math.max(Math.abs(x), Math.abs(z))) * 26;
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

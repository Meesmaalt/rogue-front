import type { Entity } from "./types";
import { MAP_SIZE } from "./heightmap";

/** Uniform grid for O(1) neighborhood queries. Rebuild once per sim tick. */
export class SpatialHash {
  readonly cellSize: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly half: number;
  private buckets: Entity[][] = [];
  private version = 0;
  private readonly occupied:number[]=[];

  constructor(cellSize = 16) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(MAP_SIZE / cellSize);
    this.rows = Math.ceil(MAP_SIZE / cellSize);
    this.half = MAP_SIZE / 2;
    this.buckets = Array.from({ length: this.cols * this.rows }, () => []);
  }

  private key(ix: number, iz: number): number {
    return iz * this.cols + ix;
  }

  private cellOf(x: number, z: number): { ix: number; iz: number } {
    const ix = Math.max(0, Math.min(this.cols - 1, Math.floor((x + this.half) / this.cellSize)));
    const iz = Math.max(0, Math.min(this.rows - 1, Math.floor((z + this.half) / this.cellSize)));
    return { ix, iz };
  }

  clear(): void {
    for (const index of this.occupied) this.buckets[index].length = 0;
    this.occupied.length=0;
    this.version++;
  }

  /** Insert all living entities. Call once per tick before queries. */
  rebuild(entities: readonly Entity[]): void {
    this.clear();
    for (const e of entities) {
      if (e.dead || e.loadedIntoId !== null) continue;
      const { ix, iz } = this.cellOf(e.x, e.z);
      const index=this.key(ix,iz),bucket=this.buckets[index];
      if(bucket.length===0)this.occupied.push(index);
      bucket.push(e);
    }
  }

  /**
   * Visit entities in cells overlapping a circle. Callback may return true to stop early.
   */
  queryRadius(x: number, z: number, radius: number, fn: (e: Entity) => boolean | void): void {
    const r = radius;
    const minX = x - r, maxX = x + r, minZ = z - r, maxZ = z + r;
    const a = this.cellOf(minX, minZ);
    const b = this.cellOf(maxX, maxZ);
    for (let iz = a.iz; iz <= b.iz; iz++) {
      for (let ix = a.ix; ix <= b.ix; ix++) {
        const bucket = this.buckets[this.key(ix, iz)];
        for (let i = 0; i < bucket.length; i++) {
          if (fn(bucket[i])) return;
        }
      }
    }
  }

  /** Nearest entity matching predicate within range. Returns null if none. */
  nearest(
    x: number,
    z: number,
    range: number,
    pred: (e: Entity) => boolean,
  ): Entity | null {
    let best: Entity | null = null;
    let bestD = range;
    this.queryRadius(x, z, range, (e) => {
      if (!pred(e)) return;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }
}

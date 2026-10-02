import { heightAt, MAP_SIZE } from "../heightmap";
import type { Entity, Point } from "../types";
import type { MapFeatureDef } from "../mapFeatures";
import { featureBlocksMovement, pointInFeature } from "../mapFeatures";

export const NAV_CELL_SIZE = 2;
export const NAV_SLOPE_LIMIT_DEG = 35;
export const NAV_SLOPE_LIMIT = NAV_SLOPE_LIMIT_DEG * Math.PI / 180;
const HALF = MAP_SIZE / 2;
const CELLS = Math.round(MAP_SIZE / NAV_CELL_SIZE);

export interface NavCell { x: number; z: number }

export class NavGrid {
  readonly cellSize = NAV_CELL_SIZE;
  readonly width = CELLS;
  readonly height = CELLS;
  readonly blocked = new Uint8Array(CELLS * CELLS);

  constructor(entities: readonly Entity[] = [], features: readonly MapFeatureDef[] = []) {
    this.buildTerrain();
    this.syncFeatures(features);
    this.syncBuildings(entities);
  }

  index(ix: number, iz: number): number { return iz * this.width + ix; }
  inBounds(ix: number, iz: number): boolean { return ix >= 0 && iz >= 0 && ix < this.width && iz < this.height; }

  worldToCell(x: number, z: number): NavCell {
    return {
      x: Math.max(0, Math.min(this.width - 1, Math.floor((x + HALF) / this.cellSize))),
      z: Math.max(0, Math.min(this.height - 1, Math.floor((z + HALF) / this.cellSize))),
    };
  }

  cellToWorld(ix: number, iz: number): Point {
    return { x: -HALF + (ix + 0.5) * this.cellSize, z: -HALF + (iz + 0.5) * this.cellSize };
  }

  isBlocked(ix: number, iz: number, radius = 0): boolean {
    if (!this.inBounds(ix, iz) || this.blocked[this.index(ix, iz)] !== 0) return true;
    const r = Math.ceil(radius / this.cellSize);
    if (!r) return false;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > r * r) continue;
      const x = ix + dx, z = iz + dz;
      if (!this.inBounds(x, z) || this.blocked[this.index(x, z)] !== 0) return true;
    }
    return false;
  }

  isWalkableWorld(x: number, z: number, radius = 0): boolean {
    const c = this.worldToCell(x, z);
    return !this.isBlocked(c.x, c.z, radius);
  }


  syncFeatures(features: readonly MapFeatureDef[]): void {
    // Static map geometry occupies state 1; dynamic buildings use state 2.
    for (let i = 0; i < this.blocked.length; i++) if (this.blocked[i] === 1) {
      // Preserve terrain slope cells by rebuilding them before applying features.
      const ix = i % this.width, iz = Math.floor(i / this.width);
      const p = this.cellToWorld(ix, iz);
      const dx = heightAt(p.x + this.cellSize, p.z) - heightAt(p.x - this.cellSize, p.z);
      const dz = heightAt(p.x, p.z + this.cellSize) - heightAt(p.x, p.z - this.cellSize);
      const slope = Math.atan(Math.hypot(dx, dz) / (2 * this.cellSize));
      this.blocked[i] = slope > NAV_SLOPE_LIMIT ? 1 : 0;
    }
    for (const f of features) {
      if (!featureBlocksMovement(f)) continue;
      const minX = Math.max(0, Math.floor((f.x - Math.hypot(f.width, f.depth) / 2) / this.cellSize + this.width / 2) - 1);
      const maxX = Math.min(this.width - 1, Math.ceil((f.x + Math.hypot(f.width, f.depth) / 2) / this.cellSize + this.width / 2) + 1);
      const minZ = Math.max(0, Math.floor((f.z - Math.hypot(f.width, f.depth) / 2) / this.cellSize + this.height / 2) - 1);
      const maxZ = Math.min(this.height - 1, Math.ceil((f.z + Math.hypot(f.width, f.depth) / 2) / this.cellSize + this.height / 2) + 1);
      for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
        const p = this.cellToWorld(ix, iz);
        if (pointInFeature(p.x, p.z, f, this.cellSize * 0.45) && this.blocked[this.index(ix, iz)] === 0) this.blocked[this.index(ix, iz)] = 1;
      }
    }
  }

  syncBuildings(entities: readonly Entity[]): void {
    for (let i = 0; i < this.blocked.length; i++) if (this.blocked[i] === 2) this.blocked[i] = 0;
    for (const e of entities) {
      if (e.dead || e.def.speed > 0) continue;
      const c = this.worldToCell(e.x, e.z);
      const r = Math.ceil((e.def.radius + 1) / this.cellSize);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r) continue;
        const x = c.x + dx, z = c.z + dz;
        if (this.inBounds(x, z) && this.blocked[this.index(x, z)] === 0) this.blocked[this.index(x, z)] = 2;
      }
    }
  }

  private buildTerrain(): void {
    for (let z = 0; z < this.height; z++) for (let x = 0; x < this.width; x++) {
      const p = this.cellToWorld(x, z);
      const dx = heightAt(p.x + this.cellSize, p.z) - heightAt(p.x - this.cellSize, p.z);
      const dz = heightAt(p.x, p.z + this.cellSize) - heightAt(p.x, p.z - this.cellSize);
      const slope = Math.atan(Math.hypot(dx, dz) / (2 * this.cellSize));
      this.blocked[this.index(x, z)] = slope > NAV_SLOPE_LIMIT ? 1 : 0;
    }
  }

  nearestWalkable(p: Point, radius = 0): Point | null {
    const c = this.worldToCell(p.x, p.z);
    if (!this.isBlocked(c.x, c.z, radius)) return this.cellToWorld(c.x, c.z);
    for (let r = 1; r < Math.max(this.width, this.height); r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const x = c.x + dx, z = c.z + dz;
        if (!this.isBlocked(x, z, radius)) return this.cellToWorld(x, z);
      }
    }
    return null;
  }
}

import type { Entity, Team } from "./types";
import { MAP_SIZE, heightAt } from "./heightmap";
import type { MapFeatureDef } from "./mapFeatures";
import { featureBlocksMovement, pointInFeature } from "./mapFeatures";

export const VISION_CELL_SIZE = 4;
export const VISION_CELLS = Math.ceil(MAP_SIZE / VISION_CELL_SIZE);
export type VisibilityState = 0 | 1 | 2;

/** Fog of war with terrain/structure line-of-sight. Heavily optimised for 30 Hz. */
export class Vision {
  readonly cellSize = VISION_CELL_SIZE;
  readonly width = VISION_CELLS;
  readonly height = VISION_CELLS;
  private readonly states: [Uint8Array, Uint8Array] = [
    new Uint8Array(VISION_CELLS * VISION_CELLS),
    new Uint8Array(VISION_CELLS * VISION_CELLS),
  ];
  /** Only static blocking features (pre-filtered). */
  private blockingFeatures: MapFeatureDef[] = [];
  /** Buildings that block LOS (speed === 0). Updated each vision tick. */
  private buildings: Entity[] = [];
  private tickCounter = 0;

  setFeatures(features: readonly MapFeatureDef[]): void {
    this.blockingFeatures = features.filter((f) => featureBlocksMovement(f) && f.kind!=="water");
  }
  snapshot(): { states: [number[],number[]]; tickCounter: number } {
    return {states:[Array.from(this.states[0]),Array.from(this.states[1])],tickCounter:this.tickCounter};
  }
  restore(s: ReturnType<Vision["snapshot"]>, entities: readonly Entity[]): void {
    this.states[0].set(s.states[0]); this.states[1].set(s.states[1]); this.tickCounter=s.tickCounter;
    this.buildings=entities.filter(e=>!e.dead&&e.def.speed===0);
  }
  reset(): void {
    this.states[0].fill(0);
    this.states[1].fill(0);
  }
  index(ix: number, iz: number): number {
    return iz * this.width + ix;
  }
  inBounds(ix: number, iz: number): boolean {
    return ix >= 0 && iz >= 0 && ix < this.width && iz < this.height;
  }
  worldToCell(x: number, z: number) {
    const half = MAP_SIZE / 2;
    return {
      x: Math.max(0, Math.min(this.width - 1, Math.floor((x + half) / this.cellSize))),
      z: Math.max(0, Math.min(this.height - 1, Math.floor((z + half) / this.cellSize))),
    };
  }
  cellToWorld(ix: number, iz: number) {
    const half = MAP_SIZE / 2;
    return {
      x: -half + (ix + 0.5) * this.cellSize,
      z: -half + (iz + 0.5) * this.cellSize,
    };
  }
  stateAt(team: Team, x: number, z: number): VisibilityState {
    const c = this.worldToCell(x, z);
    return this.states[team][this.index(c.x, c.z)] as VisibilityState;
  }
  isVisible(team: Team, x: number, z: number): boolean {
    return this.stateAt(team, x, z) === 2;
  }
  isExplored(team: Team, x: number, z: number): boolean {
    return this.stateAt(team, x, z) !== 0;
  }

  /**
   * Cheap LOS for combat: height samples + optional feature block.
   * Building occlusion only on long rays (rare for short-range fire).
   */
  hasLineOfSight(a: Entity, b: Entity): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 4) return true;

    const ay = a.y + Math.max(1.2, a.def.height * 0.7);
    const by = b.y + Math.max(1.2, b.def.height * 0.65);
    // ~6 m steps – enough for gameplay, half the cost of fine sampling
    const steps = Math.max(2, Math.ceil(d / 2));
    const inv = 1 / steps;
    const checkFeatures = d > 4 && this.blockingFeatures.length > 0;
    const nFeat = this.blockingFeatures.length;

    for (let i = 1; i < steps; i++) {
      const t = i * inv;
      const x = a.x + dx * t;
      const z = a.z + dz * t;
      if (heightAt(x, z) + 0.8 > ay + (by - ay) * t) return false;
      if (checkFeatures) {
        for (let fi = 0; fi < nFeat; fi++) {
          const feature=this.blockingFeatures[fi];
          if (pointInFeature(x, z, feature, 0.15) && heightAt(x,z)+(feature.height??3)>ay+(by-ay)*t) return false;
        }
      }
    }

    // Buildings only for long-range shots
    if (d > 4 && this.buildings.length) {
      const nB = this.buildings.length;
      for (let i = 1; i < steps; i++) {
        const t = i * inv;
        const x = a.x + dx * t;
        const z = a.z + dz * t;
        for (let bi = 0; bi < nB; bi++) {
          const e = this.buildings[bi];
          if (e === a || e === b || e.dead) continue;
          const bx = e.x - x, bz = e.z - z;
          const r = e.def.radius + 0.5;
          if (bx * bx + bz * bz < r * r && e.y+e.def.height > ay+(by-ay)*t) return false;
        }
      }
    }
    return true;
  }

  /**
   * Vision reveal throttled to every 3 ticks (~10 Hz). Fog decay still runs each tick.
   */
  update(entities: readonly Entity[]): void {
    this.tickCounter++;
    if (this.tickCounter > 1 && this.tickCounter % 3 !== 0) return;
    for (const team of [0, 1] as const) {
      const c = this.states[team];
      for (let i = 0; i < c.length; i++) if (c[i] === 2) c[i] = 1;
    }

    this.buildings = [];
    for (const e of entities) {
      if (!e.dead && e.def.speed === 0) this.buildings.push(e);
    }

    // Stagger unit reveals by id across frames when many units
    for (const u of entities) {
      if (u.dead || u.loadedIntoId!=null || u.underConstruction) continue;
      const radius = this.getVisionRadius(u);
      this.reveal(u.team, u.x, u.z, radius, u);
    }
  }

  getVisionRadius(u: Entity): number {
    // Schema v2 optics drive fog reveal (Wargame-style recon value)
    if (u.def.opticsRange) {
      const base = u.def.opticsRange;
      if (u.kind === "hq") return Math.max(base, 48);
      if (u.kind === "radar") return Math.max(base, 90)*(1+((u.buildingLevel??1)-1)*.175);
      return base;
    }
    if (u.kind === "hq") return 48;
    if (u.kind === "bunker") return 38;
    if (u.kind === "artillery") return 34;
    if (u.kind === "tank") return 30;
    if (u.kind === "fighter") return 46;
    if (u.kind === "gunship") return 34;
    if (u.kind === "inf" || u.kind === "engineer") return 25;
    return 24;
  }

  /** Returns the friendly observer that can currently see a point. */
  observerFor(team: Team, x: number, z: number, entities: readonly Entity[]): Entity | null {
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const u of entities) {
      if (u.dead || u.team !== team) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d > this.getVisionRadius(u) + this.cellSize) continue;
      if (d < bestD) {
        const dummy = { ...u, x, z, y: heightAt(x, z) } as Entity;
        if (this.hasLineOfSight(u, dummy)) {
          best = u;
          bestD = d;
        }
      }
    }
    return best;
  }

  private reveal(team: Team, x: number, z: number, radius: number, source: Entity): void {
    const c = this.worldToCell(x, z);
    const r = Math.ceil(radius / this.cellSize);
    const cells = this.states[team];
    const r2 = radius * radius;
    const nearR2 = (this.cellSize * 2.2) * (this.cellSize * 2.2);
    const ay = source.y + Math.max(1.2, source.def.height * 0.7);

    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const ix = c.x + dx;
        const iz = c.z + dz;
        if (!this.inBounds(ix, iz)) continue;
        const p = this.cellToWorld(ix, iz);
        const dist2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (dist2 > r2 || cells[this.index(ix,iz)]===2) continue;

        // Close: free
        if (dist2 < nearR2) {
          cells[this.index(ix, iz)] = 2;
          continue;
        }

        // All ranges: height-only LOS (2–3 samples). Features handled in combat LOS only.
        const by = heightAt(p.x, p.z) + 1.5;
        const steps = dist2 < 400 ? 2 : 3;
        let blocked = false;
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const sx = x + (p.x - x) * t;
          const sz = z + (p.z - z) * t;
          if (heightAt(sx, sz) + 0.8 > ay + (by - ay) * t) {
            blocked = true;
            break;
          }
          if (this.blockingFeatures.some(f => pointInFeature(sx, sz, f, 0.25))) {
            blocked = true;
            break;
          }
        }
        if (!blocked) cells[this.index(ix, iz)] = 2;
      }
    }
  }
}

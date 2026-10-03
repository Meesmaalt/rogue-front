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
  private features: readonly MapFeatureDef[] = [];
  /** Only static blocking features (pre-filtered). */
  private blockingFeatures: MapFeatureDef[] = [];
  /** Buildings that block LOS (speed === 0). Updated each vision tick. */
  private buildings: Entity[] = [];
  private tickCounter = 0;

  setFeatures(features: readonly MapFeatureDef[]): void {
    this.features = features;
    this.blockingFeatures = features.filter((f) => featureBlocksMovement(f));
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
   * Cheap LOS: terrain height samples + pre-filtered blocking features.
   * Dynamic buildings are checked only when the ray is long enough to matter.
   */
  hasLineOfSight(a: Entity, b: Entity): boolean {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const d = Math.hypot(dx, dz);
    if (d < 3) return true;

    const ay = a.y + Math.max(1.2, a.def.height * 0.7);
    const by = b.y + Math.max(1.2, b.def.height * 0.65);
    // Coarser sampling: ~every 4–5 m instead of every 3 m
    const steps = Math.max(3, Math.ceil(d / 4.5));
    const inv = 1 / steps;

    for (let i = 1; i < steps; i++) {
      const t = i * inv;
      const x = a.x + dx * t;
      const z = a.z + dz * t;
      const terrain = heightAt(x, z) + 0.8;
      const ray = ay + (by - ay) * t;
      if (terrain > ray) return false;

      // Features only when ray is reasonably long
      if (d > 12) {
        for (let fi = 0; fi < this.blockingFeatures.length; fi++) {
          if (pointInFeature(x, z, this.blockingFeatures[fi], 0.35)) return false;
        }
      }
    }

    // Dynamic buildings: only check if ray > 18 m (most short combat LOS ignore them)
    if (d > 18 && this.buildings.length) {
      for (let i = 1; i < steps; i++) {
        const t = i * inv;
        const x = a.x + dx * t;
        const z = a.z + dz * t;
        for (const e of this.buildings) {
          if (e === a || e === b || e.dead) continue;
          if (Math.hypot(e.x - x, e.z - z) < e.def.radius + 0.5) return false;
        }
      }
    }
    return true;
  }

  /**
   * Vision update is throttled to every 2 ticks (~15 Hz) for the full reveal
   * after the first frame. Visible cells still decay every tick so fog feels responsive.
   */
  update(entities: readonly Entity[]): void {
    this.tickCounter++;
    // Always decay current-visible → explored
    for (const team of [0, 1] as const) {
      const c = this.states[team];
      for (let i = 0; i < c.length; i++) if (c[i] === 2) c[i] = 1;
    }

    // Full reveal on first call and every 2nd tick thereafter
    if (this.tickCounter > 1 && this.tickCounter % 2 !== 0) return;

    // Collect buildings once
    this.buildings = [];
    for (const e of entities) {
      if (!e.dead && e.def.speed === 0) this.buildings.push(e);
    }

    for (const u of entities) {
      if (u.dead) continue;
      const radius = this.getVisionRadius(u);
      this.reveal(u.team, u.x, u.z, radius, u);
    }
  }

  getVisionRadius(u: Entity): number {
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
    const nearR2 = (this.cellSize * 1.8) * (this.cellSize * 1.8);

    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const ix = c.x + dx;
        const iz = c.z + dz;
        if (!this.inBounds(ix, iz)) continue;
        const p = this.cellToWorld(ix, iz);
        const dist2 = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (dist2 > r2) continue;

        // Very close cells: always visible (no LOS cost)
        if (dist2 < nearR2) {
          cells[this.index(ix, iz)] = 2;
          continue;
        }

        // Medium range: cheap height-only LOS (skip feature/building checks)
        if (dist2 < 22 * 22) {
          const dummyY = heightAt(p.x, p.z);
          const ay = source.y + Math.max(1.2, source.def.height * 0.7);
          const by = dummyY + 1.5;
          const steps = 3;
          let blocked = false;
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const sx = x + (p.x - x) * t;
            const sz = z + (p.z - z) * t;
            if (heightAt(sx, sz) + 0.8 > ay + (by - ay) * t) {
              blocked = true;
              break;
            }
          }
          if (!blocked) cells[this.index(ix, iz)] = 2;
          continue;
        }

        // Far cells: full LOS
        const dummy = { ...source, x: p.x, z: p.z, y: heightAt(p.x, p.z) } as Entity;
        if (this.hasLineOfSight(source, dummy)) {
          cells[this.index(ix, iz)] = 2;
        }
      }
    }
  }
}

import type { Entity, Team } from "./types";
import { MAP_SIZE } from "./heightmap";

export const VISION_CELL_SIZE = 4;
export const VISION_CELLS = Math.ceil(MAP_SIZE / VISION_CELL_SIZE);

export type VisibilityState = 0 | 1 | 2;

/**
 * Meeskonnapõhine fog of war.
 * 0 = uurimata, 1 = uuritud kuid hetkel nähtamatu, 2 = nähtav.
 * Nähtavus on simulatsiooni osa, seega AI, combat ja renderdus saavad sama tõeallikat kasutada.
 */
export class Vision {
  readonly cellSize = VISION_CELL_SIZE;
  readonly width = VISION_CELLS;
  readonly height = VISION_CELLS;
  private readonly states: [Uint8Array, Uint8Array] = [
    new Uint8Array(VISION_CELLS * VISION_CELLS),
    new Uint8Array(VISION_CELLS * VISION_CELLS),
  ];

  reset(): void {
    this.states[0].fill(0);
    this.states[1].fill(0);
  }

  index(ix: number, iz: number): number { return iz * this.width + ix; }

  inBounds(ix: number, iz: number): boolean {
    return ix >= 0 && iz >= 0 && ix < this.width && iz < this.height;
  }

  worldToCell(x: number, z: number): { x: number; z: number } {
    const half = MAP_SIZE / 2;
    return {
      x: Math.max(0, Math.min(this.width - 1, Math.floor((x + half) / this.cellSize))),
      z: Math.max(0, Math.min(this.height - 1, Math.floor((z + half) / this.cellSize))),
    };
  }

  cellToWorld(ix: number, iz: number): { x: number; z: number } {
    const half = MAP_SIZE / 2;
    return { x: -half + (ix + 0.5) * this.cellSize, z: -half + (iz + 0.5) * this.cellSize };
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

  update(entities: readonly Entity[]): void {
    // Varem nähtav jääb uurituks, kuid nähtav olek taastatakse igal tickil.
    for (const team of [0, 1] as const) {
      const cells = this.states[team];
      for (let i = 0; i < cells.length; i++) if (cells[i] === 2) cells[i] = 1;
    }

    for (const u of entities) {
      if (u.dead || u.def.speed === 0) continue;
      const radius = this.visionRadius(u);
      this.reveal(u.team, u.x, u.z, radius);
    }

    // Staatilised hooned annavad väiksema, kuid siiski kasutatava nägemisraadiuse.
    for (const u of entities) {
      if (u.dead || u.def.speed !== 0) continue;
      this.reveal(u.team, u.x, u.z, this.visionRadius(u));
    }
  }

  private visionRadius(u: Entity): number {
    if (u.kind === "hq") return 42;
    if (u.kind === "bunker") return 34;
    if (u.kind === "tank") return 30;
    return 24;
  }

  private reveal(team: Team, x: number, z: number, radius: number): void {
    const c = this.worldToCell(x, z);
    const r = Math.ceil(radius / this.cellSize);
    const r2 = radius * radius;
    const cells = this.states[team];
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const ix = c.x + dx, iz = c.z + dz;
      if (!this.inBounds(ix, iz)) continue;
      const p = this.cellToWorld(ix, iz);
      if ((p.x - x) ** 2 + (p.z - z) ** 2 <= r2) cells[this.index(ix, iz)] = 2;
    }
  }
}

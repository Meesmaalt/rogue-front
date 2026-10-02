import type { Point } from "./types";
import type { MapFeatureDef } from "./mapFeatures";

/** Generates a light RTS base shell: perimeter walls, a forward gate and internal roads. */
export function generateBaseFeatures(bases: readonly (Point & { r: number })[]): MapFeatureDef[] {
  const out: MapFeatureDef[] = [];
  if (bases.length < 2) return out;
  for (let team = 0; team < Math.min(2, bases.length); team++) {
    const b = bases[team];
    const enemy = bases[team === 0 ? 1 : 0];
    const sideX = enemy.x >= b.x ? 1 : -1;
    const sideZ = enemy.z >= b.z ? 1 : -1;
    const half = Math.max(22, Math.min(28, b.r * 0.82));
    const gap = 10;
    const seg = Math.max(7, (half * 2 - gap) / 2);
    const wall = (id: string, x: number, z: number, width: number, depth: number, rotation = 0) =>
      out.push({ id: `base-${team}-${id}`, kind: "wall", x, z, width, depth, rotation, height: 4.5, label: `Baasi ${team + 1} kaitsemüür` });

    // North/south walls. The forward corner-side gate is left open on the side facing the enemy.
    const gateOnX = Math.abs(enemy.x - b.x) >= Math.abs(enemy.z - b.z);
    if (gateOnX) {
      wall("north-a", b.x - seg / 2 - gap / 2, b.z - half, seg, 2);
      wall("north-b", b.x + seg / 2 + gap / 2, b.z - half, seg, 2);
      wall("south-a", b.x - half + seg / 2, b.z + half, half - gap / 2, 2);
      wall("south-b", b.x + gap / 2 + (half - gap / 2) / 2, b.z + half, half - gap / 2, 2);
    } else {
      wall("north", b.x, b.z - half, half * 2, 2);
      wall("south", b.x, b.z + half, half * 2, 2);
    }
    // Left/right walls; split the enemy-facing side to form a gate.
    if (!gateOnX) {
      wall("west-a", b.x - half, b.z - seg / 2 - gap / 2, 2, seg);
      wall("west-b", b.x - half, b.z + seg / 2 + gap / 2, 2, seg);
      wall("east-a", b.x + half, b.z - half + seg / 2, 2, half - gap / 2);
      wall("east-b", b.x + half, b.z + gap / 2 + (half - gap / 2) / 2, 2, half - gap / 2);
    } else {
      wall("west", b.x - half, b.z, 2, half * 2);
      wall("east", b.x + half, b.z, 2, half * 2);
    }

    // Main access road is deliberately inside the perimeter and terminates at the HQ.
    const roadLength = half * 1.55;
    const roadAngle = Math.atan2(enemy.x - b.x, enemy.z - b.z);
    out.push({ id: `base-${team}-main-road`, kind: "road", x: b.x + sideX * roadLength * 0.35, z: b.z + sideZ * roadLength * 0.35, width: 7, depth: roadLength, rotation: roadAngle, blocksMovement: false, label: "Baasi peatee" });
    // Gate pad visually marks the actual entrance without blocking it.
    out.push({ id: `base-${team}-gate`, kind: "gate", x: b.x + sideX * half, z: b.z + sideZ * Math.min(6, half * 0.2), width: 8, depth: 4, rotation: roadAngle, blocksMovement: false, label: "Peavärav" });
  }
  return out;
}

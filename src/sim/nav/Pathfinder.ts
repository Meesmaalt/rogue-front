import type { Point } from "../types";
import { NavGrid } from "./NavGrid";

interface Node { id: number; f: number; g: number }

class MinHeap {
  private a: Node[] = [];
  get length(): number { return this.a.length; }
  push(n: Node): void {
    let i = this.a.length; this.a.push(n);
    while (i) { const p = (i - 1) >> 1; if (this.a[p].f <= n.f) break; this.a[i] = this.a[p]; i = p; }
    this.a[i] = n;
  }
  pop(): Node | undefined {
    const root = this.a[0]; if (!root) return undefined;
    const last = this.a.pop()!; if (this.a.length) {
      let i = 0;
      while (true) { const l = i * 2 + 1; if (l >= this.a.length) break; const r = l + 1, c = r < this.a.length && this.a[r].f < this.a[l].f ? r : l; if (this.a[c].f >= last.f) break; this.a[i] = this.a[c]; i = c; }
      this.a[i] = last;
    }
    return root;
  }
}

const heuristic = (x: number, z: number, tx: number, tz: number): number => Math.hypot(tx - x, tz - z);

export function findPath(grid: NavGrid, from: Point, to: Point, radius = 0): Point[] {
  const s = grid.nearestWalkable(from, radius), g = grid.nearestWalkable(to, radius);
  if (!s || !g) return [];
  const sc = grid.worldToCell(s.x, s.z), gc = grid.worldToCell(g.x, g.z);
  const n = grid.width * grid.height;
  const gs = new Float64Array(n); gs.fill(Infinity);
  const parent = new Int32Array(n); parent.fill(-1);
  const closed = new Uint8Array(n);
  const heap = new MinHeap();
  const sid = grid.index(sc.x, sc.z), gid = grid.index(gc.x, gc.z);
  gs[sid] = 0; heap.push({ id: sid, g: 0, f: heuristic(sc.x, sc.z, gc.x, gc.z) });
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
  while (heap.length) {
    const cur = heap.pop()!;
    if (closed[cur.id]) continue;
    closed[cur.id] = 1;
    if (cur.id === gid) break;
    const cx = cur.id % grid.width, cz = Math.floor(cur.id / grid.width);
    for (const [dx,dz] of dirs) {
      const nx = cx + dx, nz = cz + dz;
      if (!grid.inBounds(nx,nz) || grid.isBlocked(nx,nz,radius)) continue;
      if (dx && dz && (grid.isBlocked(cx + dx, cz, radius) || grid.isBlocked(cx, cz + dz, radius))) continue;
      const id = grid.index(nx,nz), step = dx && dz ? 1.41421356237 : 1, ng = gs[cur.id] + step;
      if (ng >= gs[id]) continue;
      gs[id] = ng; parent[id] = cur.id;
      heap.push({ id, g: ng, f: ng + heuristic(nx,nz,gc.x,gc.z) });
    }
  }
  if (sid !== gid && parent[gid] < 0) return [];
  const cells: NavCell[] = [];
  for (let id = gid; id >= 0; id = parent[id]) { cells.push({ x: id % grid.width, z: Math.floor(id / grid.width) }); if (id === sid) break; }
  cells.reverse();
  return smoothPath(grid, cells, radius);
}

interface NavCell { x: number; z: number }
function clearLine(grid: NavGrid, a: NavCell, b: NavCell, radius: number): boolean {
  const steps = Math.max(Math.abs(b.x-a.x), Math.abs(b.z-a.z)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0, x = Math.round(a.x + (b.x-a.x)*t), z = Math.round(a.z + (b.z-a.z)*t);
    if (grid.isBlocked(x,z,radius)) return false;
  }
  return true;
}
function smoothPath(grid: NavGrid, cells: NavCell[], radius: number): Point[] {
  if (cells.length < 2) return cells.map(c => grid.cellToWorld(c.x,c.z));
  const out: Point[] = [grid.cellToWorld(cells[0].x,cells[0].z)];
  let anchor = 0;
  while (anchor < cells.length - 1) {
    let far = anchor + 1;
    for (let i = far + 1; i < cells.length; i++) if (clearLine(grid,cells[anchor],cells[i],radius)) far = i; else break;
    out.push(grid.cellToWorld(cells[far].x,cells[far].z)); anchor = far;
  }
  return out;
}

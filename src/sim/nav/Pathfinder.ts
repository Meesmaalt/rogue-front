import type { Point } from "../types";
import { NavGrid } from "./NavGrid";
import mobility from "../../data/mobility.json";

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

const heuristic = (x: number, z: number, tx: number, tz: number): number => Math.max(Math.abs(tx-x),Math.abs(tz-z))+(Math.SQRT2-1)*Math.min(Math.abs(tx-x),Math.abs(tz-z));

export interface PathCost { cell(x:number,z:number):number; edge?(ax:number,az:number,bx:number,bz:number):number; minimum:number }
// Sequential searches share scratch arrays. Generation stamps replace full-map
// clears, preserving A* ordering while avoiding allocations on every group order.
interface SearchWorkspace {gs:Float64Array;parent:Int32Array;closed:Uint32Array;seen:Uint32Array;generation:number}
const searchWorkspaces=new WeakMap<NavGrid,SearchWorkspace>();
function workspaceFor(grid:NavGrid):SearchWorkspace {
  let cache=searchWorkspaces.get(grid);
  if(!cache){const n=grid.width*grid.height;cache={gs:new Float64Array(n),parent:new Int32Array(n),closed:new Uint32Array(n),seen:new Uint32Array(n),generation:0};searchWorkspaces.set(grid,cache);}
  cache.generation=(cache.generation+1)>>>0;
  if(!cache.generation){cache.seen.fill(0);cache.closed.fill(0);cache.generation=1;}
  return cache;
}
export function findPath(grid: NavGrid, from: Point, to: Point, radius = 0, cost?:PathCost,avoid:readonly (Point&{radius:number})[]=[]): Point[] {
  const blocked=(x:number,z:number)=>{if(grid.isBlocked(x,z,radius))return true;if(!avoid.length)return false;const p=grid.cellToWorld(x,z);return avoid.some(o=>{const distance=Math.hypot(p.x-o.x,p.z-o.z);return distance<(o.radius+radius)*mobility.navigation.bodyRadiusFactor+mobility.navigation.bodyClearance&&distance<Math.hypot(from.x-o.x,from.z-o.z)-.01;});};
  const s = grid.nearestWalkable(from, radius), g = grid.nearestWalkable(to, radius);
  if (!s || !g) return [];
  const sc = grid.worldToCell(s.x, s.z);let gc = grid.worldToCell(g.x, g.z);
  // A valid exact destination can round into a parked unit's cell. Choose a
  // nearby clear cell with a safe final segment, rather than rejecting the order.
  if(avoid.length&&blocked(gc.x,gc.z)){
    const candidates:Array<{x:number;z:number;distance:number}>=[],extent=mobility.navigation.pathEndpointSearchCells;
    for(let dz=-extent;dz<=extent;dz++)for(let dx=-extent;dx<=extent;dx++){
      const x=gc.x+dx,z=gc.z+dz;if(!grid.inBounds(x,z)||blocked(x,z))continue;
      const p=grid.cellToWorld(x,z),distance=Math.hypot(p.x-to.x,p.z-to.z),steps=Math.max(1,Math.ceil(distance));let clear=true;
      for(let i=1;i<=steps;i++){
        const px=p.x+(to.x-p.x)*i/steps,pz=p.z+(to.z-p.z)*i/steps;
        if(!grid.isWalkableWorld(px,pz,radius)||avoid.some(o=>Math.hypot(px-o.x,pz-o.z)<(o.radius+radius)*mobility.navigation.bodyRadiusFactor+mobility.navigation.bodyClearance&&Math.hypot(px-o.x,pz-o.z)<Math.hypot(from.x-o.x,from.z-o.z)-.01)){clear=false;break;}
      }
      if(clear)candidates.push({x,z,distance});
    }
    candidates.sort((a,b)=>a.distance-b.distance||grid.index(a.x,a.z)-grid.index(b.x,b.z));
    if(!candidates.length)return [];gc=candidates[0];
  }
  const {gs,parent,closed,seen,generation}=workspaceFor(grid);
  const sid=grid.index(sc.x,sc.z),gid=grid.index(gc.x,gc.z),heap=new MinHeap();
  gs[sid]=0;parent[sid]=-1;seen[sid]=generation;
  heap.push({id:sid,g:0,f:heuristic(sc.x,sc.z,gc.x,gc.z)*(cost?.minimum??1)});
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]] as const;
  while (heap.length) {
    const cur = heap.pop()!;
    if (closed[cur.id]===generation) continue;
    closed[cur.id] = generation;
    if (cur.id === gid) break;
    const cx = cur.id % grid.width, cz = Math.floor(cur.id / grid.width);
    for (const [dx,dz] of dirs) {
      const nx = cx + dx, nz = cz + dz;
      if (!grid.inBounds(nx,nz) || blocked(nx,nz)) continue;
      if (dx && dz && (blocked(cx + dx, cz) || blocked(cx, cz + dz))) continue;
      const id = grid.index(nx,nz), step = dx && dz ? 1.41421356237 : 1, ng = gs[cur.id] + step*(cost?(cost.edge?.(cx,cz,nx,nz)??(cost.cell(cx,cz)+cost.cell(nx,nz))*.5):1);
      if (seen[id]===generation && ng >= gs[id]) continue;
      seen[id]=generation;gs[id] = ng; parent[id] = cur.id;
      heap.push({ id, g: ng, f: ng + heuristic(nx,nz,gc.x,gc.z)*(cost?.minimum??1) });
    }
  }
  if (sid !== gid && seen[gid]!==generation) return [];
  const cells: NavCell[] = [];
  for (let id = gid; id >= 0; id = parent[id]) { cells.push({ x: id % grid.width, z: Math.floor(id / grid.width) }); if (id === sid) break; }
  cells.reverse();
  return smoothPath(grid, cells, radius,cost,blocked);
}

interface NavCell { x: number; z: number }
function clearLine(grid: NavGrid, a: NavCell, b: NavCell, radius: number,blocked?:(x:number,z:number)=>boolean): boolean {
  const steps = Math.max(Math.abs(b.x-a.x), Math.abs(b.z-a.z)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0, x = Math.round(a.x + (b.x-a.x)*t), z = Math.round(a.z + (b.z-a.z)*t);
    if (blocked?blocked(x,z):grid.isBlocked(x,z,radius)) return false;
  }
  return true;
}
function smoothPath(grid: NavGrid, cells: NavCell[], radius: number,cost?:PathCost,blocked?:(x:number,z:number)=>boolean): Point[] {
  const cumulative=[0];
  for(let i=1;i<cells.length;i++){const a=cells[i-1],b=cells[i];cumulative.push(cumulative[i-1]+Math.hypot(b.x-a.x,b.z-a.z)*(cost?(cost.edge?.(a.x,a.z,b.x,b.z)??(cost.cell(a.x,a.z)+cost.cell(b.x,b.z))*.5):1));}
  const noSlower=(a:NavCell,b:NavCell,budget:number)=>{if(!cost)return true;const length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(length*2));let sum=0;for(let j=0;j<n;j++){const t=j/n,t2=(j+1)/n,ax=Math.round(a.x+(b.x-a.x)*t),az=Math.round(a.z+(b.z-a.z)*t),bx=Math.round(a.x+(b.x-a.x)*t2),bz=Math.round(a.z+(b.z-a.z)*t2);sum+=cost.edge?.(ax,az,bx,bz)??cost.cell(bx,bz);}return length*sum/n<=budget*1.015;};
  if (cells.length < 2) return cells.map(c => grid.cellToWorld(c.x,c.z));
  const out: Point[] = [grid.cellToWorld(cells[0].x,cells[0].z)];
  let anchor = 0;
  while (anchor < cells.length - 1) {
    let far = anchor + 1;
    for (let i = far + 1; i < Math.min(cells.length,anchor+65); i++) if (!clearLine(grid,cells[anchor],cells[i],radius,blocked)) break; else if(noSlower(cells[anchor],cells[i],cumulative[i]-cumulative[anchor])) far = i;
    out.push(grid.cellToWorld(cells[far].x,cells[far].z)); anchor = far;
  }
  return out;
}

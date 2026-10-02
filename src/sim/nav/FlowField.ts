import type { Point } from "../types";
import { NavGrid } from "./NavGrid";

export class FlowField {
  readonly costs: Float32Array;
  readonly target: Point;
  constructor(readonly grid: NavGrid, target: Point, radius = 0) {
    this.target = grid.nearestWalkable(target, radius) ?? target;
    this.costs = new Float32Array(grid.width * grid.height); this.costs.fill(Infinity);
    const c = grid.worldToCell(this.target.x,this.target.z), q: number[] = [];
    const start = grid.index(c.x,c.z); this.costs[start] = 0; q.push(start);
    for (let head=0; head<q.length; head++) {
      const id=q[head], x=id%grid.width,z=Math.floor(id/grid.width);
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const nx=x+dx,nz=z+dz; if(!grid.inBounds(nx,nz)||grid.isBlocked(nx,nz,radius)) continue;
        const ni=grid.index(nx,nz), nc=this.costs[id]+1; if(nc<this.costs[ni]) {this.costs[ni]=nc;q.push(ni);}
      }
    }
  }
  directionAt(p: Point, radius = 0): Point | null {
    const c=this.grid.worldToCell(p.x,p.z); let best=this.costs[this.grid.index(c.x,c.z)], bx=c.x,bz=c.z;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=c.x+dx,z=c.z+dz;if(!this.grid.inBounds(x,z)||this.grid.isBlocked(x,z,radius))continue;const v=this.costs[this.grid.index(x,z)];if(v<best){best=v;bx=x;bz=z;}}
    if(!Number.isFinite(best)|| (bx===c.x&&bz===c.z)) return null;
    const p2=this.grid.cellToWorld(bx,bz), m=Math.hypot(p2.x-p.x,p2.z-p.z)||1; return {x:(p2.x-p.x)/m,z:(p2.z-p.z)/m};
  }
}

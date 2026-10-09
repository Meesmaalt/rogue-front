import * as THREE from "three";
import type { World } from "../sim/World";
import type { Entity, Point, Team } from "../sim/types";
import {isGarrisonBuilding} from "../sim/garrison";
import {pointInFeature,type MapFeatureDef} from "../sim/mapFeatures";
import { heightAt,MAP_SIZE } from "../sim/heightmap";

export interface UnitMarkerRect {id:number;x:number;y:number;width:number;height:number}

/** Ekraani ↔ maailma teisendused: üksuse valik hiirega ja maapinna leidmine. */
export class Picker {
  private readonly lastView=new Float64Array(32).fill(NaN);
  private version=0;
  /** Cheap change detection without per-frame strings or matrix allocations. */
  get viewVersion():number {
    this.camera.updateMatrixWorld();let changed=false;
    for(let i=0;i<32;i++){const value=i<16?this.camera.matrixWorld.elements[i]:this.camera.projectionMatrix.elements[i-16];if(value!==this.lastView[i]){this.lastView[i]=value;changed=true;}}
    if(changed)this.version++;return this.version;
  }
  private markers:readonly UnitMarkerRect[]=[];
  setUnitMarkers(markers:readonly UnitMarkerRect[]):void {this.markers=markers;}
  private ray = new THREE.Raycaster();
  private tmp = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly world: World) {}

  toScreen(x: number, y: number, z: number): { x: number; y: number; z: number } {
    this.tmp.set(x, y, z).project(this.camera);
    return { x: ((this.tmp.x + 1) / 2) * innerWidth, y: ((1 - this.tmp.y) / 2) * innerHeight, z: this.tmp.z };
  }

  pxPerUnit(x: number, y: number, z: number): number {
    const d = this.camera.position.distanceTo(this.tmp.set(x, y, z));
    return innerHeight / (2 * d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
  }

  pickEntity(mx: number, my: number, team: Team): Entity | null {
    for(let i=this.markers.length-1;i>=0;i--){
      const r=this.markers[i];
      if(mx<r.x||mx>r.x+r.width||my<r.y||my>r.y+r.height)continue;
      const e=this.world.byId.get(r.id);
      if(e&&!e.dead&&e.loadedIntoId==null&&e.team===team&&(team===this.world.playerTeam||this.world.isSpottedByTeam(e,this.world.playerTeam)))return e;
    }
    let best: Entity | null = null, bs = 0;
    for (const e of this.world.entities) {
      if (e.dead || e.loadedIntoId!=null || e.team !== team) continue;
      if (team !== this.world.playerTeam && !this.world.isSpottedByTeam(e, this.world.playerTeam)) continue;
      const cy = e.y + e.def.height * 0.5, p = this.toScreen(e.x, cy, e.z);
      if (p.z > 1) continue;
      const lim = 12 + e.def.radius * this.pxPerUnit(e.x, cy, e.z), d = Math.hypot(p.x - mx, p.y - my);
      if (d < lim && (best === null || d - lim < bs)) { best = e; bs = d - lim; }
    }
    return best;
  }

  pickGarrisonBuilding(mx:number,my:number):MapFeatureDef|null {
    this.ray.setFromCamera(new THREE.Vector2(mx/innerWidth*2-1,-my/innerHeight*2+1),this.camera);
    const {origin:o,direction:d}=this.ray.ray;if(Math.abs(d.y)<.001)return null;
    let best:MapFeatureDef|null=null,nearest=Infinity;
    for(const f of this.world.mapFeatures){
      if(!isGarrisonBuilding(f))continue;
      const own=this.world.entities.some(u=>!u.dead&&u.team===this.world.playerTeam&&u.garrisonId===f.id);
      if(!own&&!this.world.vision.isExplored(this.world.playerTeam,f.x,f.z))continue;
      const y=heightAt(f.x,f.z)+(f.height??3),t=(y-o.y)/d.y;
      if(t>=0&&t<nearest&&pointInFeature(o.x+d.x*t,o.z+d.z*t,f,1)){best=f;nearest=t;}
    }
    return best;
  }

  /** Kiir vs. kõrgusväli (sammuga + poolitus). */
  groundAtNDC(nx: number, ny: number): Point {
    this.ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const o = this.ray.ray.origin, d = this.ray.ray.direction;
    const below = (t: number) => o.y + d.y * t <= heightAt(o.x + d.x * t, o.z + d.z * t);
    for (let t = 2; t < this.camera.far + MAP_SIZE; t += 2) {
      if (!below(t)) continue;
      let a = t - 2, b = t;
      for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
      return this.clampGround(o.x+d.x*b,o.z+d.z*b);
    }
    return this.clampGround(o.x+d.x*this.camera.far,o.z+d.z*this.camera.far);
  }

  private clampGround(x:number,z:number):Point {const limit=MAP_SIZE/2-10;return {x:Math.max(-limit,Math.min(limit,x)),z:Math.max(-limit,Math.min(limit,z))};}

  groundAt(mx: number, my: number): Point {
    return this.groundAtNDC((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1);
  }
}

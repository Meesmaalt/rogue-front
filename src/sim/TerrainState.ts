import {mobilityProfile} from "./unitStats";
import config from "../data/terrain.json";
import {forestDensityAt,pointInFeature,MapFeatureIndex,type MapFeatureDef} from "./mapFeatures";
import {heightAt} from "./heightmap";
import type {Entity} from "./types";
import type {World} from "./World";
import {damage} from "./systems/combat";

interface ForestCell {x:number;z:number;age:number;burnt:boolean}
const rules=config.forest;
/** Bounded, deterministic terrain changes; all teams are exposed to wildfire. */
export class TerrainState {
  private cells=new Map<string,ForestCell>();
  private accumulator=0;
  revision=0;
  private readonly vegetation:MapFeatureIndex;
  private readonly coverBins=new Map<string,MapFeatureDef[]>();
  private readonly emptyCover:readonly MapFeatureDef[]=[];
  /** Static broad phase only: consumers keep their exact footprint and damage rules. */
  coverFeaturesAt(x:number,z:number):readonly MapFeatureDef[] {
    return this.coverBins.get(`${Math.floor(x/32)}/${Math.floor(z/32)}`)??this.emptyCover;
  }
  constructor(features:readonly MapFeatureDef[]){
    for(const f of features){
      if(f.appearance!=="forest"&&f.kind!=="cover"&&f.kind!=="building"&&f.kind!=="wall"&&f.kind!=="chokepoint")continue;
      const c=Math.abs(Math.cos(f.rotation??0)),s=Math.abs(Math.sin(f.rotation??0));
      // Expand local half extents before rotating: preserves padded corner queries.
      const hx=c*(f.width/2+.25)+s*(f.depth/2+.25),hz=s*(f.width/2+.25)+c*(f.depth/2+.25);
      for(let ix=Math.floor((f.x-hx)/32);ix<=Math.floor((f.x+hx)/32);ix++)for(let iz=Math.floor((f.z-hz)/32);iz<=Math.floor((f.z+hz)/32);iz++){
        const key=`${ix}/${iz}`,bin=this.coverBins.get(key);if(bin)bin.push(f);else this.coverBins.set(key,[f]);
      }
    }
    this.vegetation=new MapFeatureIndex(features.filter(f=>f.kind==="cover"||f.kind==="road"||f.kind==="bridge"||f.kind==="water"||f.appearance==="yard"));
  }
  private key(x:number,z:number):string{return `${Math.floor(x/rules.cellSize)}/${Math.floor(z/rules.cellSize)}`;}
  roadFeatureAt(x:number,z:number,padding=0):MapFeatureDef|undefined {
    return this.vegetation.at(x,z).find(f=>(f.kind==="road"||f.kind==="bridge")&&pointInFeature(x,z,f,padding));
  }
  roadAt(x:number,z:number):boolean {return this.vegetation.at(x,z).some(f=>(f.kind==="road"||f.kind==="bridge")&&pointInFeature(x,z,f));}
  slowCoverAt(x:number,z:number):boolean {return this.vegetation.at(x,z).some(f=>f.kind==="cover"&&f.appearance!=="forest"&&f.appearance!=="field"&&f.appearance!=="yard"&&pointInFeature(x,z,f));}
  densityAt(x:number,z:number):number{return forestDensityAt(x,z,this.vegetation.at(x,z));}
  burntAt(x:number,z:number):boolean{return this.cells.get(this.key(x,z))?.burnt??false;}
  foliageAt(x:number,z:number):number{return this.densityAt(x,z)*(this.burntAt(x,z)?rules.burntCover:1);}
  fireAt(x:number,z:number):boolean {const c=this.cells.get(this.key(x,z));return !!c&&!c.burnt&&c.age<rules.burnDuration;}
  fires():readonly ForestCell[]{return [...this.cells.values()].filter(c=>c.age<rules.burnDuration+rules.smokeLifetime);}
  burntCells():readonly ForestCell[]{return [...this.cells.values()].filter(c=>c.burnt);}
  ignite(x:number,z:number,y:number,damage:number,radius:number):void {
    if(damage<rules.ignitionDamage||radius<2||y>heightAt(x,z)+6||this.densityAt(x,z)<.25)return;
    this.startCell(x,z);
  }
  private startCell(x:number,z:number):void {
    const key=this.key(x,z);if(this.cells.has(key)||this.fires().filter(c=>!c.burnt).length>=rules.maxActiveFires)return;
    const size=rules.cellSize,cx=(Math.floor(x/size)+.5)*size,cz=(Math.floor(z/size)+.5)*size;
    if(this.densityAt(cx,cz)<.25)return;
    this.cells.set(key,{x:cx,z:cz,age:0,burnt:false});
  }
  movementFactor(e:Entity,x=e.x,z=e.z):number {
    const density=this.densityAt(x,z);
    return 1-density*(1-mobilityProfile(e).forestSpeed);
  }
  obscuration(a:Entity,b:Entity):number {
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(d/5));let amount=0;
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps,x=a.x+dx*t,z=a.z+dz*t,y=a.y+a.def.height*.7+(b.y+b.def.height*.65-a.y-a.def.height*.7)*t,ground=heightAt(x,z);
      if(y<ground+9)amount+=this.foliageAt(x,z)*d/steps;
      const cell=this.cells.get(this.key(x,z));if(cell&&cell.age<rules.burnDuration+rules.smokeLifetime&&y<ground+18)amount+=d/steps*1.6;
    }return amount;
  }
  tick(w:World,dt:number):void {
    this.accumulator+=dt;if(this.accumulator<1)return;this.accumulator-=1;
    const spread:ForestCell[]=[];
    for(const c of this.cells.values()){
      if(c.age>=rules.burnDuration+rules.smokeLifetime)continue;
      c.age++;if(!c.burnt&&c.age>=rules.burnDuration){c.burnt=true;this.revision++;}
      else if(!c.burnt&&c.age%rules.spreadInterval===0)spread.push(c);
    }
    for(const e of w.entities){
      if(e.dead||e.loadedIntoId!=null||e.def.speed===0||e.y>heightAt(e.x,e.z)+3||!this.fireAt(e.x,e.z))continue;
      damage(w,e,e.squadMaxMembers?rules.infantryDamage:rules.vehicleDamage,{weapon:"cannon",fromX:e.x,fromZ:e.z,sourceId:0});
      e.suppression=Math.min(100,(e.suppression??0)+rules.suppression);e.morale=Math.max(0,(e.morale??100)-2);
    }
    // Roads and forest gaps interrupt contiguous spread; limited to one neighbor per pulse.
    for(const c of spread){
      const phase=Math.floor(c.age/rules.spreadInterval);
      const offsets=[[1,0],[0,1],[-1,0],[0,-1]];
      for(let i=0;i<4;i++){const [dx,dz]=offsets[(phase+i)%4],x=c.x+dx*rules.cellSize,z=c.z+dz*rules.cellSize;
        if(!this.cells.has(this.key(x,z))&&this.densityAt(x,z)>.35&&this.densityAt((c.x+x)/2,(c.z+z)/2)>.25){this.startCell(x,z);break;}
      }
    }

  }
  snapshot(){return {cells:[...this.cells.values()].map(c=>({...c})),accumulator:this.accumulator};}
  restore(s?:ReturnType<TerrainState["snapshot"]>):void {this.cells.clear();s?.cells.forEach(c=>this.cells.set(this.key(c.x,c.z),{...c}));this.accumulator=s?.accumulator??0;this.revision++;}
}

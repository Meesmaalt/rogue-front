import type {Entity,Point} from './types';
import type {World} from './World';
import {heightAt} from './heightmap';
import data from '../data/expansion.json';
const cfg=data.airlift;
export function airliftInfantry(p:Entity):boolean {return p.def.speed>0&&p.def.domain==='land'&&(p.def.category==='infantry'||!!p.squadMaxMembers||p.kind==='engineer');}
export function airliftCargo(p:Entity):boolean {return p.kind==='tank'||p.kind==='apc'||airliftInfantry(p);}
export function airliftManifest(w:World,plane:Entity,reserved=false):{tanks:number;apcs:number;troops:number;slots:number} {
 const out={tanks:0,apcs:0,troops:0,slots:0},seen=new Set<number>();
 const count=(id:number)=>{if(seen.has(id))return;seen.add(id);const p=w.byId.get(id);if(!p||p.dead)return;
  if(p.kind==='tank'){out.tanks++;out.slots+=2;}else if(p.kind==='apc'){out.apcs++;out.slots++;}else if(airliftInfantry(p))out.troops+=Math.max(1,p.squadMembers??p.def.squadSize??1);
  for(const child of p.cargoUnitIds)count(child);
 };
 for(const id of [...plane.cargoUnitIds,...(reserved?plane.transportQueue??[]:[])])count(id);return out;
}
export function airliftLoadReason(w:World,plane:Entity,p:Entity):string {
 if(!airliftCargo(p))return 'Lennuk võtab tanke, APC-sid ja jalaväge';
 if(!['grounded','rearming'].includes(plane.airState??''))return 'Laadimiseks peab lennuk olema maapinnal';
 if(p.dead||p.team!==plane.team||p.loadedIntoId!=null||p.garrisonId||p.airdrop)return 'Üksust ei saa laadida';
 if(w.entities.some(e=>!e.dead&&e.transportQueue?.includes(p.id)))return 'Üksusel on juba laadimiskäsk';
 const manifest=airliftManifest(w,plane,true),probe={...plane,cargoUnitIds:[p.id],transportQueue:[]} as Entity,addition=airliftManifest(w,probe);
 if(manifest.tanks+addition.tanks>cfg.tankLimit||manifest.apcs+addition.apcs>cfg.apcLimit||manifest.slots+addition.slots>cfg.vehicleSlots)return 'Sõidukiruum täis: üks tank või kaks APC-d';
 if(manifest.troops+addition.troops>cfg.troops)return 'Lennuk mahutab kuni 50 sõdurit';return '';
}
export function queueAirliftCargo(w:World,plane:Entity,p:Entity):boolean {
 const reason=airliftLoadReason(w,plane,p);if(reason){w.events.push({type:'order-rejected',team:plane.team,unitId:plane.id,x:plane.x,z:plane.z,message:reason});return false;}
 plane.transportQueue??=[];plane.transportQueue.push(p.id);plane.transportPickupDeadline=w.time+cfg.loadTimeout;plane.mode='transport-load';plane.dest=null;plane.target=null;
 p.dest=null;p.mode='hold';p.target=null;p.navPath=[];p.moveQueue=[];p.holdPosition=false;return true;
}
/** Vehicle/squad approaches the parked aircraft; the aircraft never chases its cargo. */
export function updateAirliftLoading(w:World,plane:Entity):void {
 if(!['grounded','rearming'].includes(plane.airState??'')){plane.mode='idle';plane.transportQueue=[];return;}
 plane.motionSpeed=0;plane.dest=null;
 if(w.time>(plane.transportPickupDeadline??Infinity)){plane.transportQueue=[];plane.mode='idle';return;}
 while(plane.transportQueue?.length){
  const p=w.byId.get(plane.transportQueue[0]);if(!p||p.dead||p.loadedIntoId!=null){plane.transportQueue.shift();continue;}
  const goal=w.nav.nearestWalkable(plane,p.def.radius);if(!goal){plane.transportQueue.shift();continue;}
  if(Math.hypot(p.x-plane.x,p.z-plane.z)<=cfg.loadRange+p.def.radius&&p.y-heightAt(p.x,p.z)<2){
   p.loadedIntoId=plane.id;p.mode='idle';p.dest=null;p.target=null;p.navPath=[];p.moveQueue=[];p.motionSpeed=0;p.holdPosition=false;plane.cargoUnitIds.push(p.id);plane.transportQueue.shift();
  }else {p.mode='move';p.holdPosition=false;p.dest={...goal};break;}
 }
 if(!plane.transportQueue?.length)plane.mode='idle';
}
function landingPoint(w:World,origin:Point,radius:number,reserved:Array<Point&{radius:number}>):Point|null {
 for(let ring=0;ring<=cfg.landingSearch;ring+=10)for(let i=0;i<(ring===0?1:16);i++){
  const a=i*Math.PI/8,p={x:origin.x+Math.sin(a)*ring,z:origin.z+Math.cos(a)*ring};
  if(w.nav.isWalkableWorld(p.x,p.z,radius)&&!reserved.some(e=>Math.hypot(e.x-p.x,e.z-p.z)<e.radius+radius+2)&&!w.entities.some(e=>!e.dead&&e.loadedIntoId==null&&e.def.armor!=='air'&&!e.airdrop&&Math.hypot(e.x-p.x,e.z-p.z)<e.def.radius+radius+1))return p;
 }
 return null;
}
/** Returns false rather than dropping into water, buildings or a sealed landing zone. */
export function releaseAirliftCargo(w:World,plane:Entity,ground=false):boolean {
 const reserved:Array<Point&{radius:number}>=[],drops:Array<{p:Entity;site:Point}>=[];
 for(const id of plane.cargoUnitIds){const p=w.byId.get(id);if(!p||p.dead)continue;
  const side=(drops.length%2?1:-1)*(cfg.dropSpread+Math.floor(drops.length/2)*6),a=plane.heading;
  const origin={x:plane.x+Math.cos(a)*side,z:plane.z-Math.sin(a)*side},site=landingPoint(w,origin,p.def.radius,reserved);
  if(!site)return false;reserved.push({...site,radius:p.def.radius});drops.push({p,site});
 }
 const altitude=plane.y-heightAt(plane.x,plane.z);if(!ground&&(altitude<cfg.minimumAltitude||altitude>cfg.maximumAltitude))return false;
 for(const {p,site} of drops){p.loadedIntoId=null;p.mode='idle';p.dest=null;p.target=null;p.navPath=[];p.moveQueue=[];p.motionSpeed=0;
  if(ground){p.x=p.px=site.x;p.z=p.pz=site.z;p.y=p.py=heightAt(site.x,site.z);}
  else {p.x=p.px=plane.x;p.z=p.pz=plane.z;p.y=p.py=plane.y-3;p.airdrop={...site,descent:airliftInfantry(p)?cfg.descentSpeed:cfg.vehicleDescentSpeed};}
 }
 plane.cargoUnitIds=[];plane.unloadPoint=null;plane.transportQueue=[];return true;
}
export function updateAirdrop(w:World,u:Entity,dt:number):boolean {
 const drop=u.airdrop;if(!drop)return false;
 const ground=heightAt(u.x,u.z),remaining=Math.max(dt,(u.y-ground)/drop.descent),dx=drop.x-u.x,dz=drop.z-u.z,d=Math.hypot(dx,dz),step=Math.min(d,cfg.driftSpeed*dt,d/remaining*dt);
 if(d>.001){u.x+=dx/d*step;u.z+=dz/d*step;}
 u.y=Math.max(heightAt(u.x,u.z),u.y-drop.descent*dt);u.motionSpeed=0;u.target=null;u.dest=null;
 if(u.y-heightAt(u.x,u.z)<.05){const site=landingPoint(w,u,u.def.radius,[]);if(site&&Math.hypot(site.x-u.x,site.z-u.z)<10){u.x=site.x;u.z=site.z;u.y=heightAt(u.x,u.z);}u.airdrop=undefined;
  if(!w.nav.isWalkableWorld(u.x,u.z,u.def.radius)){u.hp=0;u.dead=true;w.lossValue[u.team]+=u.def.cost;w.events.push({type:'death',x:u.x,y:u.y,z:u.z,big:false,kind:u.kind,team:u.team});}
 }
 return true;
}

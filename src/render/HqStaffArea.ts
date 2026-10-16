import * as THREE from 'three';
import {hqStaffPoint} from '../sim/baseLayout';
import {buildingScale} from './lounge';
/** One attached terrace section and its adjacent vehicle bay per HQ team/level. */
export function addHqStaffStation(parent:THREE.Group,slot:number,wood:THREE.Material,steel:THREE.Material,marking:THREE.Material):void {
 const g=new THREE.Group();g.name='HQTeamStation'+(slot+1);parent.add(g);
 const scale=buildingScale('hq'),seat=hqStaffPoint(slot,'rest'),bay=hqStaffPoint(slot,'van');
 const sx=seat.x/scale,sz=seat.z/scale,bx=bay.x/scale,bz=bay.z/scale;
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);};
 // Low timber deck meets the HQ facade; no roof obscures the people.
 box(4/scale,.09,sz-2.35,sx,.065,(sz+2.35)/2,wood);
 box(2.9,.14,.55,sx,.55,sz,wood);box(2.9,.4,.08,sx,.92,sz+.3,wood);
 for(const side of [-1,1])box(.12,.5,.45,sx+side,.25,sz,steel);
 // Open-ended marked bay, wheel stop and narrow worn wheel tracks.
 for(const side of [-1,1]){box(.07,.025,6/scale,bx+side*1.7/scale,.04,bz,marking);box(.32,.018,5.6/scale,bx+side*.85/scale,.025,bz,steel);}
 box(3.4/scale,.025,.07,bx,.04,bz-3/scale,marking);
 box(1.9/scale,.12,.2,bx,.09,bz-2.7/scale,steel);
}

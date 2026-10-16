import layout from '../data/base-life.json';
import type {Entity} from './types';
import type {LocalBox} from './baseLayout';
export function depotLayoutLevel(e:Pick<Entity,'buildingLevel'|'supplyLevel'|'upgrades'>):number{return Math.min(3,Math.max(1,e.buildingLevel??1,(e.supplyLevel??0)+1,e.upgrades.has('producer-3')?3:e.upgrades.has('producer-2')?2:1));}
/** Existing landing positions stay fixed as a compact L-shaped compound grows around them. */
export function depotCompound(level:number){return layout.depot.layouts[Math.max(0,Math.min(2,level-1))];}
export function depotFences(level:number):LocalBox[]{
 const b=depotCompound(level),boxes:LocalBox[]=[];
 const horizontal=(l:number,r:number,z:number)=>boxes.push({x:(l+r)/2,z,width:r-l,depth:.15});
 const vertical=(x:number,back:number,front:number)=>boxes.push({x,z:(back+front)/2,width:.15,depth:front-back});
 horizontal(b.left,b.right,b.back);horizontal(b.left,-5,b.front);horizontal(7,b.right,b.front);
 for(const x of [b.left,b.right]){vertical(x,b.back,-6);vertical(x,7,b.front);}
 return boxes;
}

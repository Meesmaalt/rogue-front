import type {UnitKind} from '../sim/types';
import {FACTIONS,type FactionId} from '../sim/factions';
const kinds=new Set<string>(['fighter','interceptor','bomber','ecm','multirole','attackAircraft','cargoPlane','airTransport','transport','heli','gunship','casHeli']);
/** Recognisable top silhouettes by aircraft family, with separate engines, tails, EW pods and tandem rotors. */
export function aircraftIcon(kind:UnitKind,faction:string):string|null {
 if(!kinds.has(kind))return null;
 const country=(['usa','russia','china'].includes(faction)?faction:'usa') as FactionId,name=FACTIONS[country].unitNames[kind]??kind;
 const body=country==='usa'?'#a9b8b9':country==='russia'?'#9dab94':'#b6b29b',dark='#31464b',glass='#547e91',accent='#dec78a';
 const path=(d:string,fill=body)=>`<path d="${d}" fill="${fill}" stroke="#253a40" stroke-width=".6"/>`;
 const line=(x1:number,y1:number,x2:number,y2:number,color=dark,width=1)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
 let silhouette='';
 if(['transport','heli','gunship','casHeli'].includes(kind)){
  if(kind==='transport'&&country==='usa'){
   silhouette=path('M26 18Q32 12 38 18L39 52 36 57H28L25 52Z')+path('M25 44H22V52H25M39 44H42V52H39',dark);
   for(const y of [20,49]){silhouette+=`<circle cx="32" cy="${y}" r="2.1" fill="${dark}"/>`;for(const angle of [0,120,240])silhouette+=`<path d="M31 ${y}L32 ${y-18}L34 ${y-18}L33 ${y}Z" fill="${dark}" transform="rotate(${angle} 32 ${y})"/>`;}
   silhouette+=path('M28 18Q32 14 36 18L36 23H28Z',glass);
  }else{
   silhouette=path('M28 22Q32 16 36 22L38 39 34 45 34 57 32 62 30 57 30 45 26 39Z')+path('M27 29L17 34 18 37 28 35M37 29L47 34 46 37 36 35',dark)+line(7,31,57,31,dark,2)+line(32,8,32,54,dark,1.5)+line(26,57,38,57,dark,2)+path('M29 23Q32 19 35 23L35 28H29Z',glass);
  }
 }else{
  const heavy=kind==='bomber'||kind==='cargoPlane'||kind==='airTransport',attack=kind==='attackAircraft',stealth=kind==='interceptor'||kind==='multirole'&&country!=='russia',twin=country==='russia'||kind==='ecm'||kind==='interceptor'||kind==='multirole'&&country==='china';
  if(heavy){
   silhouette+=path(kind==='bomber'?'M30 4H34L36 23 59 40 58 44 36 35 35 51 44 58V61L32 57 20 61V58L29 51 28 35 6 44 5 40 28 23Z':'M30 5Q32 1 34 5L36 24 60 32V38L36 32 35 53 44 57V61L32 58 20 61V57L29 53 28 32 4 38V32L28 24Z');
   for(const side of [-1,1])for(const offset of (kind==='bomber'?[8,13]:[9,17]))silhouette+=`<rect x="${32+side*offset-1.8}" y="${kind==='bomber'?35:30}" width="3.6" height="8" rx="1.6" fill="${dark}"/>`;
  }else if(attack&&country==='usa'){
   silhouette+=path('M30 6H34L35 24 58 25V31L35 30 35 49 46 51V57L32 54 18 57V51L29 49 29 30 6 31V25L29 24Z');
   for(const x of [25,39])silhouette+=`<rect x="${x-3}" y="36" width="6" height="12" rx="2.5" fill="${dark}"/>`;
   silhouette+=line(32,3,32,9,dark,1.8);
  }else{
   const wing=stealth?'M29 18L8 39V45L28 36 27 48 19 55V59L32 55 45 59V55L37 48 36 36 56 45V39L35 18Z':country==='china'&&kind==='fighter'?'M29 17L24 22 24 25 29 23 28 28 8 47 28 43 27 53 21 58 32 55 43 58 37 53 36 43 56 47 36 28 35 23 40 25 40 22 35 17Z':'M29 21L10 38 7 43 27 36 27 49 19 55V58L32 54 45 58V55L37 49 37 36 57 43 54 38 35 21Z';
   silhouette+=path(wing)+path('M32 3L35 17 35 40 34 56H30L29 40 29 17Z');
   if(twin){silhouette+=path('M26 37H30V56H25ZM34 37H38L39 56H34Z',dark)+path('M25 43L21 55 27 52M39 43L43 55 37 52',body);}else silhouette+=path('M30 48H34L35 57H29Z',dark);
   if(kind==='ecm')for(const x of [10,54])silhouette+=`<rect x="${x-1.5}" y="37" width="3" height="11" rx="1.4" fill="${accent}"/>`;
  }
  silhouette+=path('M31 12Q32 8 33 12L34 21Q32 24 30 21Z',glass);
 }
 return `<svg class="aircraft-portrait" viewBox="0 0 64 64" role="img" aria-label="${name}"><title>${name}</title>${silhouette}</svg>`;
}

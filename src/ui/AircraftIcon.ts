import profiles from '../data/aircraft-silhouettes.json';
import type {UnitKind} from '../sim/types';
import {FACTIONS,type FactionId} from '../sim/factions';
const kinds=new Set<string>(['fighter','interceptor','bomber','ecm','multirole','attackAircraft','cargoPlane','airTransport','transport','heli','gunship','casHeli']);
/** Recognisable top silhouettes by aircraft family, with separate engines, tails, EW pods and tandem rotors. */
export function aircraftIcon(kind:UnitKind,faction:string,portrait=false):string|null {
 if(!kinds.has(kind))return null;
 const country=(['usa','russia','china'].includes(faction)?faction:'usa') as FactionId,name=FACTIONS[country].unitNames[kind]??kind;
 const profile=(profiles[country] as Record<string,AircraftProfile>)[kind];if(profile)return fixedWingPortrait(profile,name,portrait);
 const body=country==='usa'?'#a9b8b9':country==='russia'?'#9dab94':'#b6b29b',dark='#31464b',glass='#547e91';
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
 }
 return `<svg class="aircraft-portrait" viewBox="0 0 64 64" role="img" aria-label="${name}"><title>${name}</title>${silhouette}</svg>`;
}

interface AircraftProfile{outline:string;engines:number[][];tails:number[][];label:string;angle:number;pods?:boolean}
/** Type-specific planforms, engine count and tail geometry; no generic jet mesh thumbnail. */
function fixedWingPortrait(p:AircraftProfile,name:string,portrait:boolean):string {
 const id='air-'+p.label.replace(/[^a-z0-9]/gi,'');
 const engine=p.engines.map(([x,y,w,h])=>`<rect x="${x-w/2}" y="${y}" width="${w}" height="${h}" rx="${w*.28}" fill="#283942" stroke="#78888c" stroke-width=".45"/><path d="M${x-w*.32} ${y+h-1.8}h${w*.64}" stroke="#c0b6a3" stroke-width="1.1"/>`).join('');
 const tails=p.tails.map(([x,y,tx,ty])=>`<path d="M${x-1} ${y}L${tx-1.5} ${ty}L${tx+1.2} ${ty-1}L${x+1} ${y-2}Z" fill="#607580" stroke="#cad4d4" stroke-width=".45"/>`).join('');
 const pods=p.pods?[10,54].map(x=>`<rect x="${x-1.2}" y="33" width="2.4" height="13" rx="1.1" fill="#d1d5cc" stroke="#43565d" stroke-width=".5"/>`).join(''):'';
 const body=`<path d="${p.outline}" fill="url(#${id})" stroke="#263c47" stroke-width=".7" stroke-linejoin="round"/>${engine}<path d="M32 4L34 21 34 39 32 48 30 39 30 21Z" fill="#b8c5c8" opacity=".85"/><path d="M32 10Q35 13 34 21L32 25 30 21Q29 13 32 10Z" fill="#203b50" stroke="#d7ded7" stroke-width=".5"/><path d="M31 12L31 19" stroke="#94bac9" stroke-width=".8"/>${tails}${pods}<path d="M15 39L27 33M49 39L37 33M28 29H36M29 42H35" stroke="#596e78" stroke-width=".45" fill="none"/><path d="M28 33H30V37H28ZM34 33H36V37H34Z" fill="#4d6168"/>`;
 const defs=`<defs><linearGradient id="${id}" x1="0" x2="1" y1=".1" y2=".85"><stop stop-color="#e1e6e4"/><stop offset=".42" stop-color="#aabcc3"/><stop offset=".65" stop-color="#80949f"/><stop offset="1" stop-color="#c1cdce"/></linearGradient></defs>`;
 if(!portrait)return `<svg class="aircraft-portrait" viewBox="0 0 64 64" role="img" aria-label="${name}"><title>${name}</title>${defs}${body}</svg>`;
 return `<svg class="aircraft-portrait" viewBox="0 0 160 112" role="img" aria-label="${name}"><title>${name}</title>${defs}<rect width="160" height="112" rx="7" fill="#1a2b34"/><path d="M0 28H160M0 56H160M0 84H160M40 0V96M80 0V96M120 0V96" stroke="#a5bcc1" stroke-opacity=".07"/><g transform="translate(80 46) rotate(${p.angle}) scale(1.28) translate(-32 -32)">${body}</g><rect y="94" width="160" height="18" fill="#10202a"/><text x="80" y="107" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1.2" fill="#e0e8e7">${p.label}</text></svg>`;
}

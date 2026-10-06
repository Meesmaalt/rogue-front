import type { UnitKind } from "../sim/types";
/** Original SVG silhouettes remain legible at command-card size. */
const paths:Record<string,string>={
    infantry:'<circle cx="16" cy="6" r="3"/><path d="M12 11h8l2 9h-4v9h-3v-9h-3zM9 13l-3 8 3 1 4-8m7-1 6 7-2 2-6-7"/>',
    atInf:'<circle cx="11" cy="7" r="3"/><path d="M7 12h8v10h-3v8H8V21H5zM12 11l16-5 2 4-16 5z"/>',
    manpad:'<circle cx="10" cy="9" r="3"/><path d="M7 14h8v9h-3v7H8v-9H5zM12 12L27 3l3 4-16 9z"/><path d="M20 21l5-5m-1 9 6-6" fill="none" stroke="currentColor" stroke-width="2"/>',
    atgm:'<path d="M5 9h24v7H5zM15 16h3v5l8 9h-4l-6-7-6 7H6l9-10z"/><circle cx="23" cy="12" r="2" fill="#152027"/>',
    mgInf:'<path d="M3 12h22v4H3zM23 13h8v2h-8zM9 16h5v8H9zM18 16l5 13h-3l-4-11zM18 16l-5 13h-3l6-13z"/>',
    sniper:'<path d="M2 16h26v3H2zM25 16h7v2h-7zM7 19v7H4v-7zM10 11h12v3H10zM13 14h3v2h-3z"/>',
    reconInf:'<path d="M5 10h7v7h-7zM20 10h7v7h-7zM12 13h8v3h-8z"/><circle cx="8" cy="21" r="6"/><circle cx="24" cy="21" r="6"/><circle cx="8" cy="21" r="3" fill="#152027"/><circle cx="24" cy="21" r="3" fill="#152027"/>',
    mortar:'<path d="M10 8l4-2 9 18-4 2zM5 28h24v3H5zM17 20L9 28h4l6-6z"/>',
    tank:'<path d="M4 20h24v7H4zM7 18v-6h14l3 6zm11-6V8h11v3H18z"/><circle cx="9" cy="24" r="2" fill="#152027"/><circle cx="16" cy="24" r="2" fill="#152027"/><circle cx="23" cy="24" r="2" fill="#152027"/>',
    recon:'<path d="M4 18h24v8H4zM8 18l3-7h10l4 7zM15 11V4h2v7"/><circle cx="9" cy="26" r="3"/><circle cx="23" cy="26" r="3"/>',
    artillery:'<path d="M5 21h22v7H5zM10 20v-7h10v7zm6-7L28 3l2 3-12 11z"/>',
    air:'<path d="M15 2h2l2 11 11 7v3l-11-3-1 6 4 3v2l-6-2-6 2v-2l4-3-1-6-11 3v-3l11-7z"/>',
    heli:'<path d="M2 5h28v2H2zM15 7h2v6h7l4 7h-15l-5-3H2v-3h11v-1h2zM12 23h16v2H12z"/>',
    building:'<path d="M3 14l9-6v6l9-6v6h8v15H3zM5 4h5v9L5 16z"/><path d="M7 19h4v5H7zm8 0h4v5h-4zm8 0h4v5h-4z" fill="#152027"/>',
    supply:'<path d="M3 9l13-6 13 6v18H3z"/><path d="M5 11h22v3H5zm10 3h3v11h-3z" fill="#152027"/>',
    power:'<path d="M17 2L6 18h9l-1 12 12-18h-9z"/>',
    move:'<path d="M4 14h16V7l10 9-10 9v-7H4z"/>',
    fast:'<path d="M2 14h9V7l10 9-10 9v-7H2zM21 7l10 9-10 9v-6l4-3-4-3z"/>',
    unload:'<path d="M3 5h15v4H7v18h11v4H3zM14 16h8v-6l9 8-9 8v-6h-8z"/>',
    attack:'<path d="M15 2h2v6h-2zm0 22h2v6h-2zM2 15h6v2H2zm22 0h6v2h-6z"/><circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="3"/>',
    stop:'<path d="M7 7h18v18H7z"/>',
    focus:'<path d="M3 3h10v3H6v7H3zm16 0h10v10h-3V6h-7zM3 19h3v7h7v3H3zm23 0h3v10H19v-3h7z"/>',
    hold:'<path d="M7 4h5v24H7zm13 0h5v24h-5z"/>',
    naval:'<path d="M3 20h26l-6 9H9zm8-2V9h10v9zm4-9V2h2v7z"/>',
    holdfire:'<path d="M6 4l24 24-3 3L3 7z"/><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2"/>',
    patrol:'<path d="M5 13a11 11 0 0 1 19-5l4-3v11H17l4-4a7 7 0 0 0-12 3zm22 6a11 11 0 0 1-19 5l-4 3V16h11l-4 4a7 7 0 0 0 12-3z"/>',
    repair:'<path d="M27 3l-7 7-4-4 7-7a9 9 0 0 0-11 12L2 23l7 7 12-11A9 9 0 0 0 27 3z"/>',
    radar:'<path d="M14 17h4v13h-4zM5 28h22v3H5z"/><path d="M6 4a14 14 0 0 0 22 15L17 8z"/><path d="M20 3a9 9 0 0 1 9 9M21 7a4 4 0 0 1 4 4" fill="none" stroke="currentColor" stroke-width="2"/>',
    truck:'<path d="M2 9h18v15H2zM21 14h5l5 7v3H21z"/><circle cx="8" cy="26" r="4"/><circle cx="25" cy="26" r="4"/>',
    ifv:'<path d="M3 19h27v8H3zM6 17l3-6h13l5 6zM17 10V7h12v3z"/><path d="M7 23h19" stroke="#152027" stroke-width="2"/>',
    apc:'<path d="M3 12h23l4 11H3z"/><circle cx="8" cy="26" r="4"/><circle cx="17" cy="26" r="4"/><circle cx="26" cy="26" r="4"/>',
    aa:'<path d="M3 22h26v7H3zM12 21V11h8v10zM12 12l6-9 3 2-6 9zm6 0 6-9 3 2-6 9z"/>',
    command:'<path d="M4 19h24v11H4zM15 3h2v14h-2zM18 3h11l-4 5 4 5H18z"/><path d="M8 23h4v4H8zm12 0h4v4h-4z" fill="#152027"/>',
    box:'<path d="M4 4h9v9H4zm15 0h9v9h-9zM4 19h9v9H4zm15 0h9v9h-9z"/>',
    line:'<path d="M2 12h7v8H2zm10 0h7v8h-7zm11 0h7v8h-7z"/>',
    wedge:'<path d="M12 3h8v8h-8zM3 19h8v8H3zm18 0h8v8h-8z"/>',
    column:'<path d="M12 2h8v7h-8zm0 10h8v7h-8zm0 10h8v8h-8z"/>',
    return:'<path d="M14 3L3 13l11 10v-7h7a5 5 0 0 1 0 10h-6v4h6a9 9 0 0 0 0-18h-7z"/>',
  };
const iconCache=new Map<string,string>();
export function icon(kind:string):string {
  const cached=iconCache.get(kind);if(cached)return cached;
  let role=kind;
  if(["inf","special"].includes(kind))role="infantry";
  else if(["tank","lightTank","tankDestroyer"].includes(kind))role="tank";
  else if(["reconVehicle"].includes(kind))role="recon";
  else if(["artillery","mlrs"].includes(kind))role="artillery";
  else if(["fighter","interceptor","bomber","multirole","attackAircraft","ecm","cargoPlane"].includes(kind))role="air";
  else if(["heli","transport","gunship","casHeli"].includes(kind))role="heli";
  else if(["destroyer","frigate","missileBoat","submarine","landingcraft"].includes(kind))role="naval";
  else if(kind==="generator")role="power";
  else if(kind==="engineer"||kind==="combatEngineer")role="repair";
  else if(kind==="logiTruck")role="truck";
  else if(kind==="spaa")role="aa";
  else if(kind.endsWith("Command")||kind==="hq")role="command";
  else if(kind==="barracks")role="infantry";
  else if(kind==="helipad")role="heli";
  else if(kind==="airbase")role="air";
  else if(kind==="shipyard")role="naval";
  const svg=`<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">${paths[role]??paths.building}</svg>`;iconCache.set(kind,svg);return svg;
}
export function unitPicture(kind:UnitKind,faction:string):string {
  const pictures=["tank","lightTank","tankDestroyer","ifv","apc","spaa","reconVehicle","artillery","mlrs","fighter","interceptor","bomber","multirole","attackAircraft","ecm","cargoPlane","heli","transport","gunship","casHeli","logiTruck"];
  return pictures.includes(kind)?`<img alt="" loading="lazy" src="${import.meta.env.BASE_URL}ui/units/${faction}/${kind}.webp">`:icon(kind);
}

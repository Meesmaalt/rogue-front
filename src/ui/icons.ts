import type { UnitKind } from "../sim/types";
/** Original SVG silhouettes remain legible at command-card size. */
export function icon(kind: string): string {
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
  };
  let role=kind;
  if(["inf","engineer","special"].includes(kind))role="infantry";
  else if(["tank","lightTank","tankDestroyer","ifv","apc","spaa"].includes(kind))role="tank";
  else if(["reconVehicle","logiTruck"].includes(kind))role="recon";
  else if(["artillery","mlrs"].includes(kind))role="artillery";
  else if(["fighter","interceptor","bomber","multirole","attackAircraft","ecm","cargoPlane"].includes(kind))role="air";
  else if(["heli","transport","gunship","casHeli"].includes(kind))role="heli";
  else if(["destroyer","frigate","missileBoat","submarine","landingcraft"].includes(kind))role="naval";
  else if(kind==="generator")role="power";
  return `<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">${paths[role]??paths.building}</svg>`;
}
export function unitPicture(kind:UnitKind,faction:string):string {
  const pictures=["tank","lightTank","tankDestroyer","ifv","apc","spaa","reconVehicle","artillery","mlrs","fighter","interceptor","bomber","multirole","attackAircraft","ecm","cargoPlane","heli","transport","gunship","casHeli","logiTruck"];
  return pictures.includes(kind)?`<img alt="" loading="lazy" src="${import.meta.env.BASE_URL}ui/units/${faction}/${kind}.webp">`:icon(kind);
}

import type { FactionId } from "../sim/factions";
import type { UnitKind } from "../sim/types";

/** Phase 72: platform-level roster identity. Gameplay stats remain in units.json;
 * this layer gives every major platform a stable real-world identity and a visual family
 * that can later be replaced by a bespoke GLB without changing simulation code.
 */
export interface VehiclePlatform {
  faction: FactionId;
  kind: UnitKind;
  platform: string;
  family: "mbt" | "ifv" | "apc" | "recon" | "artillery" | "mlrs" | "aa" | "heli" | "jet" | "naval" | "logistics";
  silhouette: "angular" | "low" | "boxy" | "wheeled" | "rotary" | "fast-jet" | "ship";
  turret?: "manned" | "remote" | "missile" | "none";
  visualNotes: string[];
}

const roster: VehiclePlatform[] = [
  // USA
  { faction:"usa", kind:"tank", platform:"M1A2 SEP v3 Abrams", family:"mbt", silhouette:"angular", turret:"manned", visualNotes:["large angular turret","rear bustle","side skirts","CITV optic"] },
  { faction:"usa", kind:"ifv", platform:"M2A4 Bradley", family:"ifv", silhouette:"boxy", turret:"manned", visualNotes:["two-person turret","TOW box","rear troop ramp"] },
  { faction:"usa", kind:"apc", platform:"Stryker ICV", family:"apc", silhouette:"wheeled", turret:"remote", visualNotes:["8x8 wheels","sloped glacis","remote weapon station"] },
  { faction:"usa", kind:"reconVehicle", platform:"M1127 Stryker RV", family:"recon", silhouette:"wheeled", turret:"remote", visualNotes:["tall sensor mast","8x8 wheels","recon optics"] },
  { faction:"usa", kind:"artillery", platform:"M109A7 Paladin", family:"artillery", silhouette:"boxy", turret:"manned", visualNotes:["large casemate","elevated howitzer","rear ammunition bustle"] },
  { faction:"usa", kind:"mlrs", platform:"M270A2 MLRS", family:"mlrs", silhouette:"boxy", turret:"missile", visualNotes:["tracked hull","twin launch pod","rear reload equipment"] },
  { faction:"usa", kind:"spaa", platform:"M-SHORAD Stryker", family:"aa", silhouette:"wheeled", turret:"remote", visualNotes:["8x8 chassis","missile pods","30mm cannon"] },
  { faction:"usa", kind:"heli", platform:"AH-64E Apache Guardian", family:"heli", silhouette:"rotary", turret:"manned", visualNotes:["tandem cockpit","stub wings","TADS sensor","tail rotor"] },
  { faction:"usa", kind:"fighter", platform:"F-16C Block 50", family:"jet", silhouette:"fast-jet", turret:"none", visualNotes:["single engine","single tail","underwing stores"] },
  { faction:"usa", kind:"destroyer", platform:"Arleigh Burke Flight III", family:"naval", silhouette:"ship", turret:"remote", visualNotes:["stealth superstructure","VLS blocks","Phalanx mount"] },

  // Russia
  { faction:"russia", kind:"tank", platform:"T-90M Proryv", family:"mbt", silhouette:"low", turret:"manned", visualNotes:["low turret","ERA blocks","slat bustle","commander optic"] },
  { faction:"russia", kind:"ifv", platform:"BMP-3M", family:"ifv", silhouette:"low", turret:"manned", visualNotes:["low amphibious hull","compact turret","rear troop doors"] },
  { faction:"russia", kind:"apc", platform:"BTR-82A", family:"apc", silhouette:"wheeled", turret:"remote", visualNotes:["8x8 wheels","round hull","30mm turret"] },
  { faction:"russia", kind:"reconVehicle", platform:"BRDM-2M", family:"recon", silhouette:"wheeled", turret:"remote", visualNotes:["rounded hull","small turret","roof optics"] },
  { faction:"russia", kind:"artillery", platform:"2S19M2 Msta-S", family:"artillery", silhouette:"boxy", turret:"manned", visualNotes:["large turret","long howitzer","rear bustle"] },
  { faction:"russia", kind:"mlrs", platform:"9A52-2 Smerch", family:"mlrs", silhouette:"boxy", turret:"missile", visualNotes:["8x8 chassis","large tube rack","rear stabilizers"] },
  { faction:"russia", kind:"spaa", platform:"Pantsir-S1", family:"aa", silhouette:"wheeled", turret:"missile", visualNotes:["radar dish","paired guns","side missile racks"] },
  { faction:"russia", kind:"heli", platform:"Ka-52M Alligator", family:"heli", silhouette:"rotary", turret:"manned", visualNotes:["coaxial rotors","side-by-side cockpit","stub wings"] },
  { faction:"russia", kind:"fighter", platform:"Su-35S", family:"jet", silhouette:"fast-jet", turret:"none", visualNotes:["twin engine","twin tail","large control surfaces"] },
  { faction:"russia", kind:"destroyer", platform:"Project 22350 Frigate", family:"naval", silhouette:"ship", turret:"remote", visualNotes:["low superstructure","VLS cells","stealth hull"] },

  // China
  { faction:"china", kind:"tank", platform:"Type 99A", family:"mbt", silhouette:"angular", turret:"manned", visualNotes:["wedge turret","ERA panels","laser warning mast"] },
  { faction:"china", kind:"ifv", platform:"ZBD-04A", family:"ifv", silhouette:"boxy", turret:"manned", visualNotes:["boxy amphibious hull","compact turret","rear ramp"] },
  { faction:"china", kind:"apc", platform:"ZBL-08", family:"apc", silhouette:"wheeled", turret:"remote", visualNotes:["8x8 wheels","sloped nose","remote turret"] },
  { faction:"china", kind:"reconVehicle", platform:"ZBL-08 Recon", family:"recon", silhouette:"wheeled", turret:"remote", visualNotes:["sensor mast","8x8 wheels","remote optic"] },
  { faction:"china", kind:"artillery", platform:"PLZ-05", family:"artillery", silhouette:"boxy", turret:"manned", visualNotes:["high turret","long howitzer","rear bustle"] },
  { faction:"china", kind:"mlrs", platform:"PHL-03", family:"mlrs", silhouette:"boxy", turret:"missile", visualNotes:["8x8 launcher","large tube rack","rear support legs"] },
  { faction:"china", kind:"spaa", platform:"PGZ-09", family:"aa", silhouette:"boxy", turret:"remote", visualNotes:["twin 35mm guns","sensor housing","tracked chassis"] },
  { faction:"china", kind:"heli", platform:"Z-10", family:"heli", silhouette:"rotary", turret:"manned", visualNotes:["tandem cockpit","narrow fuselage","stub wings"] },
  { faction:"china", kind:"fighter", platform:"J-10C", family:"jet", silhouette:"fast-jet", turret:"none", visualNotes:["delta wing","canards","single engine"] },
  { faction:"china", kind:"destroyer", platform:"Type 055", family:"naval", silhouette:"ship", turret:"remote", visualNotes:["large stealth superstructure","VLS blocks","helicopter deck"] },
];

const key = (f: FactionId, k: UnitKind) => `${f}:${k}`;
const byKey = new Map(roster.map(v => [key(v.faction, v.kind), v]));

export function vehiclePlatform(faction: FactionId, kind: UnitKind): VehiclePlatform | null {
  return byKey.get(key(faction, kind)) ?? null;
}

export function vehiclePlatformName(faction: FactionId, kind: UnitKind, fallback: string): string {
  return vehiclePlatform(faction, kind)?.platform ?? fallback;
}

export function vehicleRosterFor(faction: FactionId): VehiclePlatform[] {
  return roster.filter(v => v.faction === faction);
}

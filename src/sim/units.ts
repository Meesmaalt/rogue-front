import raw from "../data/units.json";
import type { UnitDef, UnitKind, OpticsRating, UnitSize, Stabilizer, Discipline, UnitCategory } from "./types";

const NUM: (keyof UnitDef)[] = ["hp", "speed", "turnRate", "range", "damage", "cooldown", "radius", "height", "cost", "buildTime", "projectileSpeed"];
const BOOL: (keyof UnitDef)[] = ["producible", "turret"];
const STR: (keyof UnitDef)[] = ["armor", "weapon"];
const KINDS: UnitKind[] = ["tank","apc","ifv","inf","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm","reconVehicle","lightTank","tankDestroyer","spaa","bunker","hq","engineer","heli","transport","cargoPlane","gunship","casHeli","fighter","interceptor","bomber","ecm","multirole","attackAircraft","artillery","mlrs","logiTruck","aa","refinery","barracks","factory","helipad","airbase","supply","radar","generator","destroyer","submarine","landingcraft","frigate","missileBoat","special","shipyard","landCommand","airCommand","seaCommand","combatEngineer","landStrategy","airStrategy","seaStrategy"]

/** Kind → schema v2 defaults (Wargame-oriented). */
function defaultsFor(kind: UnitKind, d: Record<string, unknown>): Partial<UnitDef> {
  const building = !!d.building || ["hq","bunker","aa","refinery","barracks","factory","helipad","airbase","supply","radar","generator","shipyard","landCommand","airCommand","seaCommand","combatEngineer","landStrategy","airStrategy","seaStrategy"].includes(kind);
  const armor = String(d.armor ?? "light");
  const category: UnitCategory =
    building ? "building" :
    kind === "special" || kind === "engineer" || kind === "reconInf" || kind === "reconVehicle" || kind === "sniper" ? "recon" :
    kind === "inf" || kind === "atInf" || kind === "mgInf" || kind === "mortar" || kind === "manpad" || kind === "atgm" ? "infantry" :
    ["tank","apc","ifv","lightTank","tankDestroyer","spaa"].includes(kind) ? "armor" :
    ["artillery","mlrs","logiTruck","aa","mortar","manpad"].includes(kind) ? "support" :
    ["heli","gunship","transport","casHeli"].includes(kind) ? "heli" :
    ["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(kind) ? "air" :
    ["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(kind) ? "naval" :
    "logistics";

  const size: UnitSize =
    kind === "inf" || kind === "special" || kind === "engineer" || kind === "atInf" || kind === "mgInf" || kind === "reconInf" || kind === "sniper" || kind === "manpad" || kind === "atgm" ? "small" :
    kind === "tank" || kind === "artillery" || kind === "mlrs" || kind === "tankDestroyer" || kind === "frigate" || kind === "missileBoat" ? "large" :
    building || kind === "hq" ? "very_large" :
    kind === "destroyer" || kind === "submarine" ? "large" :
    "medium";

  const optics: OpticsRating =
    kind === "radar" ? "exceptional" :
    kind === "special" || kind === "fighter" || kind === "interceptor" || kind === "reconInf" || kind === "sniper" || kind === "reconVehicle" || kind === "ecm" ? "very_good" :
    kind === "tank" || kind === "ifv" || kind === "heli" || kind === "gunship" || kind === "atgm" || kind === "manpad" || kind === "spaa" || kind === "lightTank" ? "good" :
    kind === "aa" || kind === "destroyer" ? "good" :
    kind === "inf" || kind === "apc" ? "normal" :
    "poor";

  const opticsBase: Record<OpticsRating, number> = {
    poor: 28, normal: 38, good: 52, very_good: 68, exceptional: 95,
  };

  const stealthLevel =
    kind === "special" || kind === "submarine" || kind === "reconInf" || kind === "sniper" || kind === "atgm" || kind === "reconVehicle" ? 2 :
    kind === "inf" || kind === "engineer" || kind === "atInf" || kind === "mgInf" ? 1 :
    kind === "fighter" || kind === "interceptor" ? 1 :
    0;

  const armorClass = armor === "heavy" ? 12 : armor === "medium" ? 8 : armor === "air" ? 3 : 4;
  const armorFront = building ? armorClass + 6 : kind === "tank" ? 14 : kind === "ifv" ? 9 : kind === "apc" ? 6 : armorClass;
  const armorSide = Math.round(armorFront * 0.7);
  const armorRear = Math.round(armorFront * 0.45);

  const stabilizer: Stabilizer =
    kind === "tank" || kind === "ifv" || kind === "aa" || kind === "gunship" || kind === "heli" || kind === "lightTank" || kind === "spaa" || kind === "casHeli" ? "full" :
    kind === "apc" || kind === "fighter" || kind === "reconVehicle" || kind === "multirole" ? "partial" :
    "none";

  const discipline: Discipline =
    kind === "special" || kind === "tank" || kind === "fighter" ? "high" :
    kind === "inf" || kind === "apc" ? "medium" :
    "medium";

  const roleLabel: Record<string,string> = {
    tank:"Peamine lahingutank", inf:"Liinijalavägi", engineer:"Lahinguinsener", artillery:"Iseliikuv suurtükivägi", mlrs:"Mitmikraketiheitja",
    apc:"Soomustransportöör", ifv:"Jalaväe lahingumasin", heli:"Ründekopter", transport:"Logistikakopter", fighter:"Õhuülekaal",
    interceptor:"Püüdurhävitaja", bomber:"Taktikaline pommitaja", destroyer:"Õhutõrje- ja raketihävitaja", submarine:"Ründeallveelaev",
    special:"Eriüksus", gunship:"Raskekopteri tuletoetus", cargoPlane:"Strateegiline varustuslend", logiTruck:"Füüsiline varustusvedu", landingcraft:"Dessanttransport",
    atInf:"Jalaväe tankitõrje", mgInf:"Tuletoetus", reconInf:"Luure", sniper:"Snaiper/luure", mortar:"Kaudtuli", manpad:"Lähiõhutõrje", atgm:"Pika maa tankitõrje", reconVehicle:"Kiire luure", lightTank:"Kerge soomus", tankDestroyer:"Tankitõrje soomus", spaa:"Mobiilne õhutõrje", casHeli:"Lähiõhutoetus", ecm:"Elektrooniline sõda", multirole:"Mitmeotstarbeline õhk", attackAircraft:"Ründelennuk", frigate:"Mitmeotstarbeline fregatt", missileBoat:"Rakettkaater"
  };
  const ability: Record<string,string> = {
    tank:"Kõrge frontaalne soomus ja liikuvus; kallis logistika", inf:"Odav liiniüksus; vajab soomuse ja tuletoetuse tuge", engineer:"Ehitab ja remondib; nõrk otsevõitluses", artillery:"Kaudtuli; pikk ulatus; suur laskemoonakulu", mlrs:"Salvotuli; väga suur laskemoonakulu; lühike valmisolek",
    apc:"Kiire vägede transport ja tuletoetus", ifv:"Jalaväe transport + automaatkahur; kombineeritud relv", heli:"Tankitõrje ja tuletoetus; vajab AA katet", transport:"Vägede/logistika vedu; relvastamata", logiTruck:"Maanteelogistika; veab ressursse mööda teid ja vajab kaitset",
    fighter:"Õhuülekaal; vajab kütust ja laskemoona", interceptor:"Pikk õhutõrje ulatus; kallis", bomber:"Suur löögijõud; väga suur logistiline koormus",
    destroyer:"Laevastiku õhutõrje ja löögivõime", submarine:"Varjatud torpeedo/raketiplatvorm", special:"Stealth ja kõrge kvaliteet; väike arv",
    atInf:"Odav AT; tugev külje- ja tagarünnak", mgInf:"Väga kõrge suppression; nõrk soomuse vastu", reconInf:"Erakordselt hea nägemine ja varjatus", sniper:"Pikk laskekaugus; hea ohvitseride ja luure vastu", mortar:"Kaudtuli nähtud sihtmärgi pihta", manpad:"Ainult õhusihtmärgid; varitsuslik AA", atgm:"Väga tugev AT; aeglane ja habras", reconVehicle:"Kiire sensorplatvorm; hea teede kasutus", lightTank:"Kiire tuletoetus; ei sobi MBT vastu frontaalselt", tankDestroyer:"Pikk AT laskekaugus; nõrk lähivõitluses", spaa:"Kiire kahurituli õhu vastu; piiratud maaefekt", casHeli:"Lühikese lennuulatusega tugev maapealne rünnak", ecm:"Vähendab lähedal asuvate õhutõrjete tabamistäpsust", multirole:"Võitleb nii õhu- kui maasihtmärkidega", attackAircraft:"Suur splash ja damage maapealsetele sihtmärkidele", frigate:"Mobiilne merekaitse ja maa-/õhusihtmärgid", missileBoat:"Kiire raketiplatvorm; madal HP"
  };
  // Phase 59: weapon-system profiles. These are intentionally platform-based rather than
  // generic damage values: two units with the same nominal damage can behave very
  // differently because of accuracy, penetration and suppression characteristics.
  const weaponProfile = (() => {
    const profile: Record<string, { accuracy: number; penetration: number; suppressionPower: number; reloadSkill: number }> = {
      inf: { accuracy: 0.55, penetration: 4, suppressionPower: 1.15, reloadSkill: 1.0 },
      mgInf: { accuracy: 0.62, penetration: 5, suppressionPower: 1.65, reloadSkill: 1.05 },
      reconInf: { accuracy: 0.62, penetration: 4, suppressionPower: 0.9, reloadSkill: 1.0 },
      sniper: { accuracy: 0.86, penetration: 9, suppressionPower: 1.0, reloadSkill: 1.1 },
      atInf: { accuracy: 0.72, penetration: 18, suppressionPower: 1.15, reloadSkill: 0.9 },
      atgm: { accuracy: 0.82, penetration: 24, suppressionPower: 1.2, reloadSkill: 0.82 },
      tank: { accuracy: 0.78, penetration: 26, suppressionPower: 1.0, reloadSkill: 1.05 },
      lightTank: { accuracy: 0.70, penetration: 17, suppressionPower: 1.0, reloadSkill: 1.0 },
      tankDestroyer: { accuracy: 0.84, penetration: 29, suppressionPower: 1.0, reloadSkill: 0.92 },
      ifv: { accuracy: 0.70, penetration: 14, suppressionPower: 1.25, reloadSkill: 1.05 },
      apc: { accuracy: 0.58, penetration: 7, suppressionPower: 1.05, reloadSkill: 1.0 },
      spaa: { accuracy: 0.76, penetration: 10, suppressionPower: 1.5, reloadSkill: 1.12 },
      aa: { accuracy: 0.72, penetration: 12, suppressionPower: 1.45, reloadSkill: 1.08 },
      artillery: { accuracy: 0.68, penetration: 10, suppressionPower: 2.1, reloadSkill: 0.92 },
      mortar: { accuracy: 0.62, penetration: 7, suppressionPower: 1.9, reloadSkill: 0.96 },
      mlrs: { accuracy: 0.55, penetration: 12, suppressionPower: 2.6, reloadSkill: 0.75 },
      heli: { accuracy: 0.72, penetration: 20, suppressionPower: 1.2, reloadSkill: 1.0 },
      gunship: { accuracy: 0.74, penetration: 22, suppressionPower: 1.35, reloadSkill: 1.0 },
      casHeli: { accuracy: 0.76, penetration: 21, suppressionPower: 1.4, reloadSkill: 1.0 },
      fighter: { accuracy: 0.72, penetration: 16, suppressionPower: 1.0, reloadSkill: 1.05 },
      interceptor: { accuracy: 0.80, penetration: 18, suppressionPower: 1.0, reloadSkill: 1.08 },
      bomber: { accuracy: 0.68, penetration: 15, suppressionPower: 2.2, reloadSkill: 0.85 },
      ecm: { accuracy: 0.45, penetration: 8, suppressionPower: 0.5, reloadSkill: 1.0 },
      multirole: { accuracy: 0.74, penetration: 18, suppressionPower: 1.2, reloadSkill: 1.0 },
      attackAircraft: { accuracy: 0.70, penetration: 20, suppressionPower: 1.6, reloadSkill: 0.92 },
      destroyer: { accuracy: 0.80, penetration: 24, suppressionPower: 1.4, reloadSkill: 1.0 },
      submarine: { accuracy: 0.82, penetration: 30, suppressionPower: 1.5, reloadSkill: 0.8 },
      frigate: { accuracy: 0.76, penetration: 20, suppressionPower: 1.3, reloadSkill: 1.0 },
      missileBoat: { accuracy: 0.72, penetration: 22, suppressionPower: 1.25, reloadSkill: 0.9 },
    };
    return profile[kind] ?? { accuracy: 0.6, penetration: 5, suppressionPower: 1, reloadSkill: 1 };
  })();

  const logistics = (() => {
    const ammoCapacity: Record<string, number> = {
      reconVehicle: 180, special: 180, aa: 100, bunker: 500, tank: 40, lightTank: 30, tankDestroyer: 12, ifv: 500, apc: 400, spaa: 500,
      artillery: 60, mlrs: 12, mortar: 48,
      inf: 180, atInf: 8, mgInf: 900, reconInf: 180, sniper: 20, manpad: 6, atgm: 8,
      heli: 38, gunship: 40, casHeli: 36, fighter: 8, interceptor: 8, bomber: 16,
      ecm: 6, multirole: 10, attackAircraft: 12,
      destroyer: 72, submarine: 24, frigate: 48, missileBoat: 8,
    };
    const fuelCapacity: Record<string, number> = {
      tank: 900, lightTank: 700, tankDestroyer: 700, ifv: 600, apc: 650, spaa: 550,
      artillery: 650, mlrs: 600, reconVehicle: 650, logiTruck: 520,
      heli: 1000, gunship: 950, casHeli: 900, transport: 1200,
      fighter: 2200, interceptor: 2400, bomber: 4800, ecm: 2500, multirole: 2300, attackAircraft: 2600,
      landingcraft: 2500, destroyer: 5000, submarine: 8000, frigate: 4000, missileBoat: 1800,
    };
    const ammo = ammoCapacity[kind] ?? 0;
    const fuel = fuelCapacity[kind] ?? 0;
    const airOrSea = category === "air" || category === "heli" || category === "naval";
    return {
      ammoCapacity: ammo,
      fuelCapacity: fuel,
      ammoUsePerShot: kind === "mlrs" ? 1 : kind === "artillery" || kind === "mortar" ? 1 : 1,
      fuelUsePerSec: airOrSea ? 3.2 : fuel > 0 ? 0.55 + (Number(d.speed) > 9 ? 0.35 : 0) : 0,
      supplyUsePerSec: kind === "bomber" || kind === "destroyer" || kind === "submarine" ? 0.22 : kind === "logiTruck" ? 0.08 :
        kind === "tank" || kind === "artillery" || kind === "mlrs" ? 0.12 : 0.07,
      resupplyRate: kind === "artillery" || kind === "mlrs" || kind === "destroyer" || kind === "submarine" ? 0.75 : 1,
      crew: kind === "inf" || kind === "special" || kind === "atInf" || kind === "mgInf" || kind === "reconInf" || kind === "sniper" || kind === "manpad" || kind === "atgm" ? 8 :
        kind === "tank" || kind === "lightTank" || kind === "tankDestroyer" ? 4 : 2,
      repairable: true,
      ...weaponProfile,
    };
  })();

  return {
    category,
    size,
    optics, 

    roleLabel: roleLabel[kind],
    ability: ability[kind],
    targetClass: ["manpad","spaa"].includes(kind) ? "air" : ["atInf","atgm","tankDestroyer"].includes(kind) ? "armor" : ["destroyer","submarine","frigate","missileBoat"].includes(kind) ? "naval" : "all",
    stealthLevel,
    armorFront,
    armorSide,
    armorRear,
    stabilizer,
    discipline,
    opticsRange: opticsBase[optics],
    domain: d.domain as UnitDef["domain"] ?? (
      category === "air" || category === "heli" ? "air" :
      category === "naval" ? "sea" : "land"
    ),
    ...logistics,
  };
}

export function parseUnits(data: unknown): Record<UnitKind, UnitDef> {
  const obj = data as Record<string, Record<string, unknown>>;
  const out = {} as Record<UnitKind, UnitDef>;
  for (const k of KINDS) {
    const d = obj?.[k];
    if (!d || typeof d.name !== "string") throw new Error(`units.json: puudub '${k}' või selle nimi`);
    for (const f of NUM) if (typeof d[f] !== "number" || !Number.isFinite(d[f] as number)) throw new Error(`units.json: ${k}.${f} peab olema number`);
    for (const f of BOOL) if (typeof d[f] !== "boolean") throw new Error(`units.json: ${k}.${f} peab olema boolean`);
    for (const f of STR) if (typeof d[f] !== "string") throw new Error(`units.json: ${k}.${f} peab olema string`);
    const def = { ...defaultsFor(k, d), ...d } as UnitDef;
    // Optional overrides from JSON
    if (typeof d.optics === "string") def.optics = d.optics as OpticsRating;
    if (typeof d.stealthLevel === "number") def.stealthLevel = d.stealthLevel;
    if (typeof d.size === "string") def.size = d.size as UnitSize;
    if (typeof d.stabilizer === "string") def.stabilizer = d.stabilizer as Stabilizer;
    if (typeof d.armorFront === "number") def.armorFront = d.armorFront;
    if (typeof d.armorSide === "number") def.armorSide = d.armorSide;
    if (typeof d.armorRear === "number") def.armorRear = d.armorRear;
    if (typeof d.opticsRange === "number") def.opticsRange = d.opticsRange;
    if (typeof d.ammoCapacity === "number") def.ammoCapacity = d.ammoCapacity;
    if (typeof d.fuelCapacity === "number") def.fuelCapacity = d.fuelCapacity;
    if (typeof d.ammoUsePerShot === "number") def.ammoUsePerShot = d.ammoUsePerShot;
    if (typeof d.fuelUsePerSec === "number") def.fuelUsePerSec = d.fuelUsePerSec;
    if (typeof d.supplyUsePerSec === "number") def.supplyUsePerSec = d.supplyUsePerSec;
    if (typeof d.resupplyRate === "number") def.resupplyRate = d.resupplyRate;
    if (typeof d.crew === "number") def.crew = d.crew;
    if (typeof d.repairable === "boolean") def.repairable = d.repairable;
    // Legacy stealth boolean
    if (d.stealth === true && (def.stealthLevel ?? 0) < 1) def.stealthLevel = 2;
    out[k] = def;
  }
  return out;
}

export const UNITS = parseUnits(raw);

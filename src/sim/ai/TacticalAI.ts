import type { World } from "../World";
import type { Entity, Team } from "../types";

function enemy(team: Team, e: Entity): boolean { return !e.dead && e.team !== team; }
function batteries(w: World, team: Team): Entity[] { return w.entities.filter(e=>!e.dead&&e.team===team&&["artillery","mlrs","mortar"].includes(e.kind)); }
function supply(w: World, team: Team): Entity[] { return w.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="supply"); }

/** Phase 79: lightweight tactical AI that reasons about recon, artillery, AA and logistics before attacking. */
export function updateTacticalAI(w: World, team: Team, dt: number): void {
  const own = w.entities.filter(e=>!e.dead&&e.team===team);
  const enemies = w.entities.filter(e=>enemy(team,e)&&w.isSpottedByTeam(e,team));
  const arts = batteries(w,team);
  const depots = supply(w,team);
  const fresh = w.getFreshIntel(team, 18);
  const enemyAA = enemies.filter(e=>["aa","spaa","bunker"].includes(e.kind));
  const lowSupply = own.filter(e=>e.def.speed>0&&((e.supply??100)<22||((e.maxAmmo??0)>0&&(e.ammo??0)<(e.maxAmmo??1)*0.18)));

  // Keep a fraction of recon units forward, rather than throwing the entire army into contact.
  const recon = own.filter(e=>["reconInf","reconVehicle","sniper"].includes(e.kind));
  for (const r of recon) {
    if (r.aiIntent === "recon" && r.mode !== "move") continue;
    const target = enemies.sort((a,b)=>Math.hypot(a.x-r.x,a.z-r.z)-Math.hypot(b.x-r.x,b.z-r.z))[0];
    if (target && Math.hypot(target.x-r.x,target.z-r.z)>40) {
      r.aiIntent="recon"; r.mode="move"; r.dest={x:target.x+(r.x-target.x)*0.35,z:target.z+(r.z-target.z)*0.35};
    }
  }

  // Artillery prefers fresh intel and enemy support/AA instead of shooting random front-line units.
  for (const a of arts) {
    if (a.fireMission || (a.artilleryDisplace ?? null)) continue;
    const contact = fresh.find(c=>["artillery","mlrs","aa","supply","factory","hq"].includes(c.kind) && Math.hypot(c.x-a.x,c.z-a.z)<a.def.range);
    if (contact && (a.ammo??0)>0) {
      a.fireMission={x:contact.x,z:contact.z};
      a.aiIntent=contact.kind==="artillery"||contact.kind==="mlrs"?"counterbattery":"attack";
    }
  }

  // If logistics are weak, pull damaged/support units toward the nearest depot rather than attack.
  for (const u of lowSupply) {
    if (!depots.length || u.aiIntent==="counterbattery") continue;
    const d=depots.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
    if (d && Math.hypot(d.x-u.x,d.z-u.z)>12) { u.aiIntent="resupply"; u.mode="move"; u.dest={x:d.x,z:d.z}; }
  }

  // Do not send air-ground aircraft blindly through dense AA.
  for (const a of own.filter(e=>e.def.category==="air"||e.def.category==="heli")) {
    if (enemyAA.length && a.airMission!=="sead") {
      const threat=enemyAA.reduce((m,e)=>Math.max(m,1-Math.min(1,Math.hypot(e.x-a.x,e.z-a.z)/Math.max(1,e.def.range))),0);
      a.airThreat=threat;
      if (threat>0.82) { a.aiIntent="retreat"; a.airState="returning"; const h=w.hq[team]; if(h){a.dest={x:h.x,z:h.z};a.mode="move";} }
    }
  }

  // If the front has no fresh contacts, prefer a cautious move instead of an unsupported rush.
  const combat = own.filter(e=>e.def.speed>0&&!(["logiTruck","transport","cargoPlane"].includes(e.kind)));
  const contactNearFront = fresh.some(c=>Math.hypot(c.x-(w.hq[team]?.x??0),c.z-(w.hq[team]?.z??0))>25);
  if (!contactNearFront && combat.length && dt>0) {
    for (const u of combat.filter(e=>["tank","ifv","apc"].includes(e.kind)).slice(0,2)) {
      if (u.mode==="idle") { u.aiIntent="defend"; u.mode="hold"; u.holdPosition=true; }
    }
  }
}

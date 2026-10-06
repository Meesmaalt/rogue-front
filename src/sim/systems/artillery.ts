import type { World } from "../World";
import type { Entity, Point } from "../types";
import {turnToward,wrapAngle} from "../math";
import { fireGroundProjectile,weaponRange,weaponSpec } from "./combat";
import {moraleState} from "./morale";

const BATTERIES = ["artillery", "mortar", "mlrs"] as const;
const SALVO_SIZE: Record<string, number> = { artillery: 3, mortar: 4, mlrs: 6 };
const SALVO_INTERVAL: Record<string, number> = { artillery: 1.1, mortar: 0.75, mlrs: 0.38 };
const RELOAD_AFTER: Record<string, number> = { artillery: 13, mortar: 9, mlrs: 25 };

function isBattery(e: Entity): boolean { return (BATTERIES as readonly string[]).includes(e.kind); }
function dist(a: Entity, p: Point): number { return Math.hypot(a.x - p.x, a.z - p.z); }

/** Phase 77: area fire with realistic time-of-flight, salvoes, firing signatures and displacement. */
export function updateArtillery(w: World, _dt: number): void {
  for (const u of w.entities) {
    if (u.dead || u.garrisonId || u.loadedIntoId!=null || !isBattery(u) || u.underConstruction) continue;
    u.artilleryReadyAt = Math.max(0, u.artilleryReadyAt ?? 0);
    u.artilleryLastFire = u.artilleryLastFire ?? -999;
    u.artilleryShotsInSalvo = u.artilleryShotsInSalvo ?? 0;
    u.artillerySignatureUntil = u.artillerySignatureUntil ?? 0;
    u.artilleryMissionRound = u.artilleryMissionRound ?? 0;

    // Counter-battery warning: a battery that has fired recently becomes a detectable signature.
    if (w.time < (u.artillerySignatureUntil ?? 0)) {
      const enemyBattery = w.entities.some(e => !e.dead && e.team !== u.team && isBattery(e) &&
        Math.hypot(e.x-u.x,e.z-u.z) <= weaponRange(e,weaponSpec(e)) * 1.15 &&
        ((u.artilleryLastFire ?? -999) > w.time - 18));
      if (enemyBattery && u.artilleryDisplace == null && (u.artilleryShotsInSalvo ?? 0) >= SALVO_SIZE[u.kind]) {
        const angle = u.heading + Math.PI;
        u.artilleryDisplace = { x: u.x + Math.sin(angle + 0.8) * 24, z: u.z + Math.cos(angle + 0.8) * 24 };
      }
    }

    // Auto-displace after a completed salvo once counter-battery risk is high.
    if (u.artilleryDisplace) {
      u.mode = "move";
      u.dest = u.artilleryDisplace;
      if (dist(u, u.artilleryDisplace) < 3.5) {
        u.artilleryDisplace = null;
        u.fireMission = null;
        u.mode = "idle";
        u.artilleryShotsInSalvo = 0;
        u.artilleryReadyAt = w.time + 2.5;
      }
      continue;
    }

    const mission = u.fireMission;
    if (!mission || (u.motionSpeed??0)>.5 || moraleState(u)==="routing" || (u.disabledUntil??0)>w.time || u.standingOrder==="holdfire" || u.loadedIntoId!=null || u.cooldown > 0 || (u.ammo ?? 0) <= 0 || w.time < (u.artilleryReadyAt ?? 0)) continue;
    const d = dist(u, mission);
    const spec=weaponSpec(u);
    const maxRange=weaponRange(u,spec);
    if(d>maxRange||d<spec.minimumRange)continue;

    // Fire only with a real observer/command network or a fresh shared intel contact.
    const spotted = w.vision.isVisible(u.team, mission.x, mission.z) ||
      w.getFreshIntel(u.team, 20).some(c => Math.hypot(c.x-mission.x,c.z-mission.z) < 22);
    if (!spotted) continue;

    const aim=wrapAngle(Math.atan2(mission.x-u.x,mission.z-u.z)-u.heading);
    u.turretYaw=turnToward(u.turretYaw,aim,u.def.turnRate*_dt);
    if(Math.abs(wrapAngle(aim-u.turretYaw))>.2)continue;
    const shots = u.artilleryShotsInSalvo ?? 0;
    fireGroundProjectile(w, u, mission.x + (w.rng()-0.5)*3.8, mission.z + (w.rng()-0.5)*3.8);
    u.cooldown = SALVO_INTERVAL[u.kind] ?? 1;
    u.lastCombatTime = w.time;
    u.artilleryLastFire = w.time;
    const enemy=u.team===0?1:0;
    if(w.entities.some(e=>!e.dead&&e.team===enemy&&isBattery(e)&&Math.hypot(e.x-u.x,e.z-u.z)<=weaponRange(e,weaponSpec(e))))w.intel[enemy].set(u.id,{entityId:u.id,team:u.team,kind:u.kind,x:u.x,z:u.z,lastSeen:w.time,shared:true});
    u.artillerySignatureUntil = w.time + (u.kind === "mlrs" ? 22 : 16);
    u.artilleryShotsInSalvo = shots + 1;
    u.artilleryMissionRound = (u.artilleryMissionRound ?? 0) + 1;

    if (u.artilleryShotsInSalvo >= (SALVO_SIZE[u.kind] ?? 3)) {
      u.artilleryShotsInSalvo = 0;
      u.artilleryReadyAt = w.time + (RELOAD_AFTER[u.kind] ?? 12);
      // MLRS and high-level artillery are especially vulnerable after a salvo.
      const counterBatteryChance = u.kind === "mlrs" ? 0.72 : u.kind === "artillery" ? 0.48 : 0.30;
      if (w.rng() < counterBatteryChance) {
        const enemyHasCounterBattery = w.entities.some(e => !e.dead && e.team !== u.team &&
          isBattery(e) && Math.hypot(e.x-u.x,e.z-u.z) < weaponRange(e,weaponSpec(e)) * 1.25);
        if (enemyHasCounterBattery) {
          const ang = w.rng() * Math.PI * 2;
          u.artilleryDisplace = { x: u.x + Math.sin(ang)*22, z: u.z + Math.cos(ang)*22 };
        }
      }
    }
  }

  // Enemy batteries can fire at the last known signature without direct LOS.
  for (const shooter of w.entities) {
    if (w.networkMode || shooter.team === w.playerTeam || shooter.dead || shooter.garrisonId || shooter.loadedIntoId!=null || !isBattery(shooter)) continue;
    const spec=weaponSpec(shooter),range=weaponRange(shooter,spec);
    const target=w.getFreshIntel(shooter.team,14)
      .filter(c=>(BATTERIES as readonly string[]).includes(c.kind)&&Math.hypot(c.x-shooter.x,c.z-shooter.z)<=range&&Math.hypot(c.x-shooter.x,c.z-shooter.z)>=spec.minimumRange)
      .sort((a,b)=>b.lastSeen-a.lastSeen||a.entityId-b.entityId)[0];
    if(target&&!shooter.fireMission&&(shooter.ammo??0)>=spec.ammoUsePerShot&&w.time>=(shooter.artilleryReadyAt??0)){
      shooter.fireMission={x:target.x,z:target.z};
      shooter.aiIntent = "counterbattery";
    }
  }
}

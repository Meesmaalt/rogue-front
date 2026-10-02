import type { World } from "../World";
import type { Entity, Point } from "../types";
import { heightAt } from "../heightmap";
import { dist2d, turnToward, wrapAngle } from "../math";
import { fireGroundProjectile, fireProjectile } from "./combat";
import { pointInFeature } from "../mapFeatures";
import { findPath } from "../nav/Pathfinder";

function inFiringArc(u: Entity, target: Entity): boolean {
  if (u.firingArc >= Math.PI * 2 - 0.01) return true;
  const angle = Math.atan2(target.x - u.x, target.z - u.z);
  const facing = u.heading;
  const delta = Math.abs(wrapAngle(angle - facing));
  return delta <= u.firingArc * 0.5;
}

function hasSpotter(w: World, u: Entity, target: Entity): boolean {
  if (w.vision.isVisible(u.team, target.x, target.z) && w.entities.some(s => !s.dead && s.team === u.team && (s === u || w.vision.isVisible(u.team,s.x,s.z)))) return true;
  if (u.kind !== "artillery") return false;
  return w.entities.some(s => !s.dead && s.team === u.team && s !== u && s.def.speed > 0 && w.vision.isVisible(u.team, s.x, s.z) && Math.hypot(s.x-target.x, s.z-target.z) < 105);
}

export function nearestEnemy(w: World, u: Entity, range: number): Entity | null {
  let best: Entity | null = null, bestScore = Number.POSITIVE_INFINITY;
  for (const e of w.entities) {
    if (e.dead || e.team === u.team || e.underConstruction) continue;
    if (e.def.stealth && u.kind !== "radar" && Math.hypot(e.x-u.x,e.z-u.z) > 12) continue;
    const d = dist2d(u, e) - e.def.radius;
    if (d > range) continue;
    if (!hasSpotter(w, u, e)) continue;
    if (u.def.weapon !== "missile" && e.def.armor === "air") continue;
    if ((u.kind === "bunker" || u.kind === "aa") && !inFiringArc(u, e)) continue;
    let priority = d;
    if (u.def.weapon === "missile" && e.def.armor === "air") priority -= 22;
    if (u.kind === "artillery" && e.def.speed === 0) priority -= 16;
    if (u.kind === "tank" && e.def.speed === 0) priority -= 8;
    if (e.kind === "refinery" || e.kind === "helipad" || e.kind === "airbase" || e.kind === "supply" || e.kind === "factory" || e.kind === "barracks") priority -= 18;
    if (e.kind === "hq") priority -= 12;
    if (priority < bestScore) { bestScore = priority; best = e; }
  }
  return best;
}

function moveSeaTo(u: Entity, target: Point, dt: number): boolean {
  const d = Math.hypot(u.x-target.x,u.z-target.z);
  if (d <= 3.5) return true;
  const dx=target.x-u.x,dz=target.z-u.z;
  u.heading=turnToward(u.heading,Math.atan2(dx,dz),u.def.turnRate*dt);
  u.x += Math.sin(u.heading)*u.def.speed*dt; u.z += Math.cos(u.heading)*u.def.speed*dt;
  u.y = Math.max(0.4, heightAt(u.x,u.z)-0.8);
  return false;
}

function moveAirTo(u: Entity, target: Point, dt: number, w: World): boolean {
  const d = Math.hypot(u.x - target.x, u.z - target.z);
  if (d <= 3.5) return true;
  const dx = target.x - u.x, dz = target.z - u.z;
  u.heading = turnToward(u.heading, Math.atan2(dx, dz), u.def.turnRate * dt);
  u.x += Math.sin(u.heading) * u.def.speed * dt;
  u.z += Math.cos(u.heading) * u.def.speed * dt;
  u.y = 10 + Math.sin(w.time * 1.7 + u.id) * 1.5;
  return false;
}

function updateLandingCraft(w: World, u: Entity, dt: number): void {
  if (u.mode === "transport-load") {
    const target = u.transportTargetId ? w.byId.get(u.transportTargetId) : null;
    if (!target || target.dead || target.loadedIntoId !== null) { u.mode = "idle"; u.transportTargetId = null; return; }
    if (!moveSeaTo(u, {x:target.x,z:target.z}, dt)) return;
    if (u.cargoUnitIds.length < 8) { target.loadedIntoId=u.id; target.mode="idle"; target.dest=null; target.target=null; u.cargoUnitIds.push(target.id); }
    u.transportTargetId=null; u.mode="idle"; u.dest=null; return;
  }
  if (u.mode === "transport-unload") {
    if (!u.unloadPoint) { u.mode="idle"; return; }
    if (!moveSeaTo(u,u.unloadPoint,dt)) return;
    const ids=[...u.cargoUnitIds]; ids.forEach((id,i)=>{ const passenger=w.byId.get(id); if(!passenger||passenger.dead)return; passenger.loadedIntoId=null; passenger.x=u.unloadPoint!.x+(i%3-1)*3; passenger.z=u.unloadPoint!.z+(Math.floor(i/3))*3; passenger.y=heightAt(passenger.x,passenger.z); passenger.px=passenger.x; passenger.pz=passenger.z; passenger.mode="idle"; });
    u.cargoUnitIds=[]; u.unloadPoint=null; u.mode="idle"; u.dest=null; return;
  }
  const goal=u.target&&!u.target.dead?{x:u.target.x,z:u.target.z}:u.dest; if(goal) moveSeaTo(u,goal,dt);
}

function updateTransport(w: World, u: Entity, dt: number): void {
  if (u.mode === "transport-load") {
    const target = u.transportTargetId ? w.byId.get(u.transportTargetId) : null;
    if (!target || target.dead || target.loadedIntoId !== null) { u.mode = "idle"; u.transportTargetId = null; return; }
    if (!moveAirTo(u, target, dt, w)) { u.dest = { x: target.x, z: target.z }; return; }
    if (u.cargoUnitIds.length < 8) {
      target.loadedIntoId = u.id; target.mode = "idle"; target.dest = null; target.target = null;
      u.cargoUnitIds.push(target.id);
    }
    u.transportTargetId = null; u.mode = "idle"; u.dest = null;
    return;
  }
  if (u.mode === "transport-unload") {
    const point = u.unloadPoint;
    if (!point) { u.mode = "idle"; return; }
    if (!moveAirTo(u, point, dt, w)) return;
    const ids = [...u.cargoUnitIds];
    ids.forEach((id, i) => {
      const passenger = w.byId.get(id);
      if (!passenger || passenger.dead) return;
      const angle = (i / Math.max(1, ids.length)) * Math.PI * 2;
      passenger.loadedIntoId = null; passenger.x = point.x + Math.cos(angle) * 3; passenger.z = point.z + Math.sin(angle) * 3;
      passenger.y = heightAt(passenger.x, passenger.z); passenger.px = passenger.x; passenger.pz = passenger.z; passenger.mode = "idle";
    });
    u.cargoUnitIds = []; u.unloadPoint = null; u.mode = "idle"; u.dest = null;
    return;
  }
  if (!u.logisticsTarget || !u.logisticsHome) return;
  const target = u.logisticsPhase === "loading" ? u.logisticsHome : u.logisticsTarget;
  u.dest = target; u.mode = "patrol";
  if (!moveAirTo(u, target, dt, w)) return;
  const depot = u.supplyDepotId != null ? w.byId.get(u.supplyDepotId) : null;
  const level = depot?.supplyLevel ?? 0;
  const capacity = 100 + level * 50;
  const loadTime = Math.max(2.5, 7.5 - level * 1.25);
  const unloadTime = Math.max(1.5, 4 - level * 0.5);
  if (u.logisticsPhase === "idle" || u.logisticsPhase === "unloading") {
    const rp = w.resourcePoints.find(r => Math.hypot(r.x - u.x, r.z - u.z) <= r.radius + 4 && r.amount > 0 && (r.controlledBy == null || r.controlledBy === u.team));
    if (rp) {
      u.logisticsLoadProgress = (u.logisticsLoadProgress ?? 0) + dt;
      if (u.logisticsLoadProgress >= loadTime) {
        u.cargo = capacity; u.logisticsPhase = "loading"; u.logisticsLoadProgress = 0;
      }
    }
  } else if (u.logisticsPhase === "loading") {
    if (depot && Math.hypot(depot.x-u.x,depot.z-u.z) < 18) {
      u.logisticsLoadProgress = (u.logisticsLoadProgress ?? 0) + dt;
      if (u.logisticsLoadProgress >= unloadTime) {
        w.teamResources[u.team] += u.cargo; if (u.team === w.playerTeam) w.resources = w.teamResources[u.team];
        u.cargo = 0; u.logisticsPhase = "unloading"; u.logisticsLoadProgress = 0;
        const next = w.resourcePoints.find(r => r.amount > 0 && (r.controlledBy == null || r.controlledBy === u.team));
        if (next) u.logisticsTarget = { x: next.x, z: next.z };
      }
    }
  }
}

export function updateUnits(w: World, dt: number): void {
  for (const u of w.entities) if (!u.dead && u.loadedIntoId === null) stepUnit(w, u, dt);
}

function stepUnit(w: World, u: Entity, dt: number): void {
  const d = u.def;
  if (u.kind === "transport") { updateTransport(w, u, dt); return; }
  if (u.kind === "landingcraft") { updateLandingCraft(w, u, dt); return; }
  if (["destroyer","submarine","landingcraft"].includes(u.kind)) {
    if (u.mode === "attack" && u.target && !u.target.dead && Math.hypot(u.x-u.target.x,u.z-u.target.z) <= u.def.range*0.9 && u.cooldown <= 0) { fireProjectile(w,u,u.target,u.x,u.y+u.def.height*0.5,u.z); u.cooldown=u.def.cooldown; u.lastCombatTime=w.time; }
    const goal = u.target && !u.target.dead ? {x:u.target.x,z:u.target.z} : u.dest;
    if (goal && (u.kind !== "submarine" || u.mode !== "hold")) moveSeaTo(u,goal,dt);
    return;
  }
  if (u.kind === "special" && u.mode !== "attack") {
    const target = w.entities.find(e=>!e.dead && e.team!==u.team && e.def.building && Math.hypot(e.x-u.x,e.z-u.z)<7);
    if (target) { target.hp = Math.max(0,target.hp-18*dt); w.sabotageBuilding(target, 25); u.mode="sabotage"; u.target=target; if(target.hp<=0) target.dead=true; return; }
  }
  if (u.kind === "engineer" && (u.mode === "build" || u.mode === "repair")) {
    const target = u.target;
    if (!target || target.dead) { u.mode = "idle"; u.target = null; u.dest = null; return; }
    if (Math.hypot(u.x - target.x, u.z - target.z) > 11) {
      const path = findPath(w.nav, u, target, u.def.radius);
      u.navPath = path; u.navPathIndex = 1;
      const p = path[1] ?? target;
      const dx = p.x - u.x, dz = p.z - u.z, len = Math.hypot(dx,dz) || 1;
      u.heading = turnToward(u.heading, Math.atan2(dx,dz), d.turnRate * dt);
      u.x += Math.sin(u.heading) * d.speed * dt * Math.min(1, len / 3);
      u.z += Math.cos(u.heading) * d.speed * dt * Math.min(1, len / 3);
      u.y = heightAt(u.x,u.z);
    }
    return;
  }
  const supplyFactor = u.def.speed === 0 || (u.supply ?? 100) > 20 ? 1 : 0.65;
  const effectiveRange = d.range * (u.upgrades.has("range") ? 1.2 : 1) * ((u.supply ?? 100) > 10 ? 1 : 0.9);
  u.cooldown = Math.max(0, u.cooldown - dt);

  // Kaudtuli: patarei saab tulistada kindlasse ruutu, kui sõbralik üksus seda piirkonda vaatleb.
  if (u.kind === "artillery" && u.fireMission && u.cooldown === 0 && (u.ammo ?? 0) > 0) {
    const p = u.fireMission, d2 = Math.hypot(u.x-p.x,u.z-p.z);
    const spotter = w.entities.some(s => !s.dead && s.team===u.team && s.def.speed>0 && Math.hypot(s.x-p.x,s.z-p.z)<105 && w.vision.isVisible(u.team,p.x,p.z));
    if (d2 <= effectiveRange && spotter) { fireGroundProjectile(w,u,p.x,p.z); u.cooldown=d.cooldown*1.4; u.lastCombatTime=w.time; }
  }
  if (!d.damage && d.speed === 0) return;

  const isAir = d.armor === "air";
  if (isAir) {
    const home = u.airMissionHomeId ? w.byId.get(u.airMissionHomeId) : null;
    const pad = home && !home.dead ? home : w.entities.find(e => !e.dead && e.team===u.team && (e.kind==="helipad" || e.kind==="airbase") && Math.hypot(e.x-u.x,e.z-u.z)<14);
    const atPad = !!pad && Math.hypot(pad.x-u.x,pad.z-u.z)<14;
    if (atPad) {
      u.fuel=Math.min(u.maxFuel ?? 100,(u.fuel ?? 0)+34*dt); u.ammo=Math.min(u.maxAmmo ?? 6,(u.ammo ?? 0)+2.2*dt); u.hp=Math.min(u.def.hp,u.hp+u.def.hp*0.08*dt);
      if (u.airState !== "grounded" && (u.ammo ?? 0) >= (u.maxAmmo ?? 6)*0.95 && (u.fuel ?? 0) >= (u.maxFuel ?? 100)*0.95) u.airState = "grounded";
      if (u.airState === "grounded" && (u.mode === "attack" || u.mode === "amove" || u.mode === "move" || u.target)) u.airState = "taxi";
    }
    if (u.airState === "grounded" || u.airState === "rearming") return;
    if (u.airState === "taxi") { u.airState = "airborne"; }
    if (!atPad) {
      u.fuel=Math.max(0,(u.fuel ?? 0)-dt*(0.65 + (u.kind==="fighter"?0.2:0)));
      if ((u.fuel ?? 0) < (u.maxFuel ?? 100)*0.22 && u.airState !== "returning") {
        u.airState = "returning"; u.mode="move"; u.target=null; u.dest=pad ? {x:pad.x,z:pad.z} : null;
      }
      if ((u.ammo ?? 0) <= 0 && u.airState !== "returning") {
        u.airState = "returning"; u.mode="move"; u.target=null; u.dest=pad ? {x:pad.x,z:pad.z} : null;
      }
    }
  } else if (u.kind === "artillery") {
    const factory = w.entities.find(e=>!e.dead&&e.team===u.team&&e.kind==="factory"&&Math.hypot(e.x-u.x,e.z-u.z)<13);
    if (factory) { u.ammo=Math.min(u.maxAmmo ?? 10,(u.ammo ?? 0)+1.8*dt); u.hp=Math.min(u.def.hp,u.hp+u.def.hp*0.03*dt); }
  }

  // sihtmärgi valik
  if (u.mode === "attack" && (!u.target || u.target.dead)) { u.target = null; u.mode = "idle"; }
  if (u.mode !== "attack") {
    const lim = u.mode === "move" ? effectiveRange : Math.max(effectiveRange, u.aggro);
    if (!u.target || u.target.dead || dist2d(u, u.target) - u.target.def.radius > lim * 1.15) u.target = nearestEnemy(w, u, lim);
  }
  const t = u.target;
  if (t && !w.vision.isVisible(u.team, t.x, t.z)) {
    u.target = null;
    if (u.mode === "attack") u.mode = "idle";
  }
  if (u.mode === "patrol" && u.dest && Math.hypot(u.x-u.dest.x,u.z-u.dest.z) < 3) {
    u.patrolIndex = (u.patrolIndex + 1) % u.patrolPoints.length; u.dest = u.patrolPoints[u.patrolIndex]; u.navPath = []; u.navPathIndex = 0;
  }
  const target = u.target;
  const inRange = !!target && dist2d(u, target) - target.def.radius <= effectiveRange * 0.92;
  let goal: Point | null = null;
  if (target && u.mode !== "move") {
    if (!inRange) {
      goal = target;
      if (u.navPath.length === 0) { u.navPath = findPath(w.nav, u, target, u.def.radius); u.navPathIndex = 1; }
    }
  } else if (u.mode === "move" || u.mode === "amove") goal = u.dest;

  // liikumine
  if (d.speed > 0) {
    const isAir = d.armor === "air";
    if (isAir && u.airState === "grounded") return;
    let sx = 0, sz = 0;
    for (const o of w.entities) {
      if (o === u || o.dead) continue;
      const ox = u.x - o.x, oz = u.z - o.z, m = d.radius + o.def.radius + 0.6, d2 = ox * ox + oz * oz;
      if (d2 < m * m && d2 > 1e-4) {
        const dd = Math.sqrt(d2), k = ((m - dd) / m) * (o.def.speed === 0 ? 3 : 1);
        sx += (ox / dd) * k; sz += (oz / dd) * k;
      }
    }
    let dx = 0, dz = 0, moving = false;
    if (goal) {
      const gx = goal.x - u.x, gz = goal.z - u.z, gd = Math.hypot(gx, gz);
      if (goal === u.dest && gd < 2.5) { u.mode = "idle"; u.dest = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; }
      else { dx = gx / gd; dz = gz / gd; moving = true; }
    }
    if (moving) {
      let navDx = dx, navDz = dz;
      if (u.navPath.length && u.mode !== "amove") {
        while (u.navPathIndex < u.navPath.length && Math.hypot(u.x - u.navPath[u.navPathIndex].x, u.z - u.navPath[u.navPathIndex].z) < 2.2) u.navPathIndex++;
        if (u.navPathIndex < u.navPath.length) { const p = u.navPath[u.navPathIndex], m = Math.hypot(p.x-u.x,p.z-u.z)||1; navDx=(p.x-u.x)/m; navDz=(p.z-u.z)/m; }
      } else if (u.flowField) {
        const f = u.flowField.directionAt(u, u.def.radius);
        if (f) { navDx=f.x; navDz=f.z; }
      }
      let ex = navDx + sx * 1.2, ez = navDz + sz * 1.2;
      const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l;
      const want = Math.atan2(ex, ez);
      u.heading = turnToward(u.heading, want, d.turnRate * dt);
      const diff = Math.abs(wrapAngle(want - u.heading));
      const slope = (heightAt(u.x + ex * 2, u.z + ez * 2) - u.y) / 2;
      const road = w.mapFeatures.some(f => (f.kind === "road" || f.kind === "bridge") && pointInFeature(u.x,u.z,f,1.5));
      const cover = w.mapFeatures.some(f => f.kind === "cover" && pointInFeature(u.x,u.z,f,1.5));
      const terrainMod = road ? 1.22 : cover && u.kind === "inf" ? 0.92 : 1;
      const supplyMove = (u.supply ?? 100) > 10 ? 1 : 0.78;
      const roleMove = u.role === "siege" ? 0.92 : 1;
      const sp = d.speed * terrainMod * supplyMove * roleMove * Math.min(1.3, Math.max(0.35, 1 - slope * 1.2)) * Math.max(0.15, Math.cos(Math.min(diff, 1.5)));
      u.x += Math.sin(u.heading) * sp * dt; u.z += Math.cos(u.heading) * sp * dt;
    } else if (sx || sz) {
      u.x += sx * d.speed * 0.4 * dt; u.z += sz * d.speed * 0.4 * dt;
    }
    u.x = Math.max(-190, Math.min(190, u.x)); u.z = Math.max(-190, Math.min(190, u.z));
    u.y = isAir ? 10 + Math.sin(w.time * 1.7 + u.id) * 1.5 : heightAt(u.x, u.z);
    const moved = Math.hypot(u.x - u.stuckX, u.z - u.stuckZ);
    if (moving && moved < 0.15 * dt) u.stuckTime += dt;
    else if (moved > 0.5) { u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z; }
    if (u.stuckTime > 0.8 && goal && !isAir) {
      u.navPath = findPath(w.nav, u, goal, u.def.radius); u.navPathIndex = 1;
      u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
    }
  }

  // torn ja tuli
  let aligned = true;
  if (d.turret) {
    const want = target ? Math.atan2(target.x - u.x, target.z - u.z) - u.heading : 0;
    u.turretYaw = turnToward(u.turretYaw, wrapAngle(want), 3 * dt);
    aligned = !target || Math.abs(wrapAngle(want - u.turretYaw)) < 0.12;
  }
  if (target && (u.firingArc >= Math.PI * 2 - 0.01 || inFiringArc(u, target)) && aligned && u.cooldown === 0 && d.damage && ((u.maxAmmo ?? 0)===0 || (u.ammo ?? 0)>0) && dist2d(u, target) - target.def.radius <= effectiveRange && hasSpotter(w, u, target) && w.vision.hasLineOfSight(u,target)) {
    const a = u.heading + (d.turret ? u.turretYaw : 0), m = u.kind === "tank" ? 3.6 : 1;
    const veteranFactor = 1 + u.veteran * 0.06;
    const moraleFactor = 0.65 + (w.teamMorale[u.team] / 100) * 0.35;
    fireProjectile(w, u, target, u.x + Math.sin(a) * m, u.y + (u.kind === "inf" ? 1 : 2.4), u.z + Math.cos(a) * m);
    if (w.projectiles.length) w.projectiles[w.projectiles.length - 1].damage *= veteranFactor * supplyFactor * moraleFactor;
    u.cooldown = d.cooldown * (0.9 + w.rng() * 0.2);
    u.lastCombatTime = w.time;
  }
}

import type { World } from "../World";
import { assignAirMission } from "./airDoctrine";
import { deckRemaining } from "../deck";
import type { Command, Entity, Point } from "../types";
import { UNITS } from "../units";
import { MAX_QUEUE } from "../constants";
import { findPath } from "../nav/Pathfinder";
import { FlowField } from "../nav/FlowField";
import { BUILDINGS, isBuildable } from "../buildings";

function mobile(w: World, ids: number[], team?: Entity["team"]): Entity[] {
  const out: Entity[] = [];
  for (const id of ids) {
    const e = w.byId.get(id);
    if (e && !e.dead && e.def.speed > 0 && (team === undefined || e.team === team)) out.push(e);
  }
  return out;
}

/** Formation layouts: box (default), line, wedge, column. */
export type FormationKind = "box" | "line" | "wedge" | "column";

function formation(n: number, x: number, z: number, kind: FormationKind = "box"): Point[] {
  if (n <= 1) return [{ x, z }];
  const sp = n <= 4 ? 5.5 : n <= 9 ? 6.2 : 7;
  const out: Point[] = [];
  if (kind === "line") {
    for (let i = 0; i < n; i++) out.push({ x: x + (i - (n - 1) / 2) * sp, z });
  } else if (kind === "column") {
    for (let i = 0; i < n; i++) out.push({ x, z: z + (i - (n - 1) / 2) * sp * 0.85 });
  } else if (kind === "wedge") {
    let row = 0, placed = 0;
    while (placed < n) {
      const inRow = row + 1;
      for (let c = 0; c < inRow && placed < n; c++, placed++) {
        out.push({ x: x + (c - (inRow - 1) / 2) * sp, z: z + row * sp * 0.8 });
      }
      row++;
    }
  } else {
    const cols = Math.ceil(Math.sqrt(n * 1.15));
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const stagger = (row % 2) * (sp * 0.35);
      out.push({ x: x + (col - (cols - 1) / 2) * sp + stagger, z: z + (row - (rowsSafe(cols, n) - 1) / 2) * sp * 0.9 });
    }
  }
  return out;
}
function rowsSafe(cols: number, n: number): number { return Math.ceil(n / cols); }

export function applyCommands(w: World): void {
  const cmds = w.pending;
  w.pending = [];
  for (const c of cmds) apply(w, c);
}

function apply(w: World, c: Command): void {
  switch (c.type) {
    case "formation": {w.teamFormations[c.team??w.playerTeam]=c.kind;break;}
    case "move":
    case "amove": {
      const us = mobile(w, c.ids, c.team), pts = formation(us.length, c.x, c.z,w.teamFormations[c.team??w.playerTeam]);
      const field = new FlowField(w.nav, { x: c.x, z: c.z });
      const append = !!(c as { append?: boolean }).append;
      us.forEach((u, i) => {
        if (append && (u.mode === "move" || u.mode === "amove" || u.mode === "patrol") && u.dest) {
          // Shift-click: queue waypoint
          if (!u.patrolPoints.length && u.dest) u.patrolPoints = [{ x: u.dest.x, z: u.dest.z }];
          u.patrolPoints.push({ x: pts[i].x, z: pts[i].z });
          u.mode = "patrol";
          u.patrolIndex = 0;
          if (!u.dest) u.dest = pts[i];
        } else {
          u.mode = c.type === "move" ? "move" : "amove";
          u.dest = pts[i];
          u.patrolPoints = [];
          u.patrolIndex = 0;
          u.navPath = c.type === "move" ? findPath(w.nav, u, pts[i], u.def.radius) : [];
          u.navPathIndex = 1;
          u.flowField = field;
          u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
          if (c.type === "move") u.target = null;
        }
      });
      break;
    }
    case "attack": {
      const t = w.byId.get(c.targetId);
      if (!t || t.dead) break;
      for (const u of mobile(w, c.ids, c.team)) if (u.team !== t.team) { u.mode = "attack"; u.target = t; u.dest = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; }
      break;
    }
    case "stop":
      for (const u of mobile(w, c.ids, c.team)) {
        for (const b of w.entities) if (!b.dead && b.builderIds.includes(u.id)) b.builderIds = b.builderIds.filter(id => id !== u.id);
        u.fireMission=null;u.artilleryDisplace=null;u.mode = "idle"; u.dest = null; u.target = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; u.holdPosition = false; u.patrolPoints = []; }
      break;
    case "rally": {
      for (const b of w.entities) {
        if (b.dead || b.underConstruction || b.team !== (c.team ?? w.playerTeam)) continue;
        if (!b.productionQueue.length && !["barracks", "factory", "helipad", "airbase"].includes(b.kind)) continue;
        if (!c.ids.includes(b.id)) continue;
        b.rallyPoint = { x: c.x, z: c.z };
      }
      break;
    }
    case "repair": {
      const target = w.byId.get(c.targetId);
      if (!target || target.dead || target.team !== (c.team ?? w.playerTeam) || (target.hp >= target.def.hp && !Object.values(target.components ?? {}).some(v => v > 0))) break;
      const engineers = mobile(w, c.ids, c.team).filter(u => u.kind === "engineer");
      if (!engineers.length) break;
      target.builderIds = engineers.slice(0, 2).map(u => u.id);
      for (const u of engineers.slice(0, 2)) { u.mode = "repair"; u.target = target; u.dest = { x: target.x, z: target.z }; }
      break;
    }
    case "hold":
      for (const u of mobile(w, c.ids, c.team)) { u.mode = "hold"; u.dest = null; u.target = null; u.holdPosition = true; u.navPath = []; u.flowField = null; }
      break;
    case "patrol": {
      const us = mobile(w, c.ids, c.team);
      for (const u of us) { u.mode = "patrol"; u.patrolPoints = [{x:c.x,z:c.z},{x:u.x,z:u.z}]; u.patrolIndex = 0; u.dest = u.patrolPoints[0]; u.target = null; }
      break;
    }
    case "build": {
      const team = c.team ?? w.playerTeam;
      // Prefer selected engineers; fall back to nearest friendly engineer
      let builders = mobile(w, c.ids, team).filter(u => u.kind === "engineer");
      if (!builders.length) {
        const nearest = w.entities
          .filter(e => !e.dead && e.team === team && e.kind === "engineer" && e.loadedIntoId === null)
          .sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
        if (nearest) builders = [nearest];
      }
      const builder = builders[0];
      if (!builder || !isBuildable(c.kind)) break;
      const spec = BUILDINGS[c.kind];
      const walletCredits = w.teamCredits[team], walletResources = w.teamResources[team];
      if (walletResources < spec.cost || walletCredits < spec.cost) break;
      if (!w.canBuildKind(team, c.kind)) break;
      // No range gate – foundation is placed and engineer walks to it (Real War style)
      if (!w.canPlaceBuilding(team, c.kind, c.x, c.z)) break;
      w.teamCredits[team] -= spec.cost; w.teamResources[team] -= spec.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      const b = w.spawn(c.kind, team, c.x, c.z);
      b.underConstruction = true;
      b.constructionProgress = 0;
      b.hp = Math.max(1, b.def.hp * 0.15);
      b.constructionTime = spec.buildTime;
      b.builderIds = builders.slice(0, spec.maxBuilders).map(u => u.id);
      b.heading = c.rotation ?? b.heading;
      b.pHeading = b.heading;
      for (const eng of builders.slice(0, spec.maxBuilders)) {
        eng.mode = "build";
        eng.target = b;
        eng.dest = { x: c.x, z: c.z };
        eng.navPath = [];
        eng.navPathIndex = 0;
      }
      break;
    }
    case "research": {
      const cost = c.tech === "air" ? 240 : 220;
      const team = c.team ?? w.playerTeam;
      if (w.hasTech(team, c.tech) || w.teamCredits[team] < cost || w.teamResources[team] < cost) break;
      const requires = c.tech === "air" ? "engineering" : "engineering";
      if (!w.hasTech(team, requires)) break;
      w.teamCredits[team] -= cost; w.teamResources[team] -= cost; if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; } w.teamTechs[team].add(c.tech);
      break;
    }
    case "upgrade": {
      const team = c.team ?? w.playerTeam;
      if (c.upgrade === "producer") {
        // Phase 70: the same upgrade command now applies to every strategic building.
        const target = c.ids.map(id => w.byId.get(id)).find((e): e is Entity =>
          !!e && !e.dead && e.team === team && w.canUpgradeProducer(e));
        const currentLevel = target ? w.producerLevel(target) : 3;
        const nextLevel = currentLevel + 1;
        const cost = target ? w.producerUpgradeCost(currentLevel) : 9999;
        if (!target || nextLevel > 3 || w.teamResources[team] < cost || w.teamCredits[team] < cost) break;
        if (target.upgrading) break;
        w.teamResources[team] -= cost; w.teamCredits[team] -= cost;
        target.upgrading = true;
        target.upgradeProgress = 0;
        target.upgradeTime = w.buildingUpgradeTime(currentLevel);
        target.upgradeKind = "producer";
        target.underConstruction = true;
        target.constructionProgress = 0;
        target.constructionTime = target.upgradeTime;
        if (team === w.playerTeam) { w.resources = w.teamResources[team]; w.credits = w.teamCredits[team]; }
        break;
      }
      if (c.upgrade === "supply-depot") {
        for (const u of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) w.upgradeSupplyDepot(team, u.id);
        break;
      }
      if (c.upgrade === "fob") {
        for (const u of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) w.upgradeFOB(team, u.id);
        break;
      }
      const cost = 140;
      if (w.teamResources[team] < cost || w.teamCredits[team] < cost) break;
      const us = mobile(w, c.ids, team);
      for (const u of us) if (!u.upgrades.has(c.upgrade) && w.teamResources[team] >= cost && w.teamCredits[team] >= cost) { w.teamCredits[team] -= cost; w.teamResources[team] -= cost; u.upgrades.add(c.upgrade); if (c.upgrade === "armor") u.hp += u.def.hp * 0.15; }
      w.credits = w.teamCredits[w.playerTeam]; w.resources = w.teamResources[w.playerTeam];
      break;
    }
    case "load": {
      const transport = mobile(w, c.ids, c.team).find(u => u.kind === "transport" || u.kind === "landingcraft");
      const target = w.byId.get(c.targetId);
      if (!transport || !target || target.dead || target.team !== transport.team || target === transport || target.loadedIntoId !== null) break;
      if (!["inf", "engineer"].includes(target.kind)) break;
      const capacity = 8;
      if (transport.cargoUnitIds.length >= capacity) break;
      transport.transportTargetId = target.id;
      transport.mode = "transport-load";
      transport.dest = { x: target.x, z: target.z };
      break;
    }
    case "fire-mission": {
      const artillery = mobile(w, c.ids, c.team).filter(u => ["artillery","mortar","mlrs"].includes(u.kind));
      for (const u of artillery) { u.fireMission = {x:c.x,z:c.z}; u.mode = "attack"; u.target = null; u.dest = null; }
      break;
    }
    case "standing": {
      for (const u of mobile(w, c.ids, c.team)) {
        u.standingOrder = c.mode;
        if (c.mode === "hold") { u.mode = "hold"; u.holdPosition = true; u.dest = null; u.target = null; }
        else if (c.mode === "holdfire") { u.mode = "hold"; u.holdPosition = true; u.dest = null; u.target = null; }
        else if (c.mode === "patrol" && c.x !== undefined && c.z !== undefined) { u.mode = "patrol"; u.patrolPoints = [{x:c.x,z:c.z},{x:u.x,z:u.z}]; u.patrolIndex = 0; u.dest = u.patrolPoints[0]; }
        else if (c.mode === "attack") { u.mode = "amove"; u.dest = c.x !== undefined && c.z !== undefined ? {x:c.x,z:c.z} : null; }
      }
      break;
    }
    case "predeploy": {
      for (const b of w.entities.filter(e => !e.dead && e.team === (c.team ?? w.playerTeam) && ["barracks","factory","helipad","airbase","shipyard"].includes(e.kind))) {
        if (!c.ids.includes(b.id)) continue;
        b.preDeployOrder = { mode:c.mode, x:c.x, z:c.z };
      }
      break;
    }
    case "priority": {
      const us = mobile(w, c.ids, c.team);
      for (const u of us) {
        u.priorityFocus = c.focus;
        u.mode = "amove";
        const targets = w.entities.filter(e => !e.dead && e.team !== u.team && e.kind === c.focus);
        if (targets.length) {
          targets.sort((a,b) => Math.hypot(a.x-u.x,a.z-u.z) - Math.hypot(b.x-u.x,b.z-u.z));
          u.target = targets[0];
          u.dest = { x: targets[0].x, z: targets[0].z };
        }
      }
      break;
    }
    case "depot-priority": {
      const team = c.team ?? w.playerTeam;
      const depots = c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply");
      for (const d of depots) d.logisticsPriority = c.focus;
      if (depots.length) w.setDepotPriority(team, c.focus);
      break;
    }
    case "logistics-route": {
      const team = c.team ?? w.playerTeam;
      for (const d of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) {
        if (c.clear) { w.clearLogisticsRoute(d); continue; }
        w.addLogisticsWaypoint(d, {x:c.x,z:c.z}, c.append !== false);
      }
      break;
    }
    case "air-mission": {
      for (const u of mobile(w, c.ids, c.team)) {
        if (u.def.armor !== "air" && u.def.category !== "heli") continue;
        assignAirMission(u, c.mission, c.x != null && c.z != null ? { x: c.x, z: c.z } : null);
      }
      break;
    }
    case "unload": {
      for (const transport of mobile(w, c.ids, c.team).filter(u => u.kind === "transport" || u.kind === "landingcraft")) {
        if (!transport.cargoUnitIds.length) continue;
        transport.unloadPoint = { x: c.x, z: c.z };
        transport.mode = "transport-unload";
        transport.dest = { x: c.x, z: c.z };
      }
      break;
    }
    case "produce": {
      const def = UNITS[c.kind], team = c.team ?? w.playerTeam, hq = w.hq[team];
      const deck = w.deckForTeam(team), battlegroup = w.battlegroupForTeam(team);
      if (deck) {
        const left = deckRemaining(deck, c.kind, w.producedForTeam(team)[c.kind] ?? 0);
        // Also count queued
        let queued = 0;
        for (const e of w.entities) {
          if (e.dead || e.team !== team) continue;
          queued += e.productionQueue.filter(k => k === c.kind).length;
        }
        if (c.kind !== "engineer" && (left - queued <= 0 || (battlegroup && !battlegroup.canDeploy(c.kind, queued + 1)))) break;
      }
      if (!def.producible || !hq || hq.dead || hq.underConstruction || w.teamResources[team] < def.cost || w.teamCredits[team] < def.cost) break;
      const producerKind =
        ["inf","engineer","special","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm"].includes(c.kind) ? "barracks" :
        ["tank","apc","ifv","artillery","mlrs","reconVehicle","lightTank","tankDestroyer","spaa"].includes(c.kind) ? "factory" :
        ["heli","transport","gunship","casHeli"].includes(c.kind) ? "helipad" :
        ["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(c.kind) ? "airbase" :
        ["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(c.kind) ? "shipyard" : null;
      if (!producerKind) break;
      const producer = c.producerId !== undefined
        ? w.byId.get(c.producerId)
        : w.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === producerKind && e.productionQueue.length < MAX_QUEUE).sort((a,b)=>a.productionQueue.length-b.productionQueue.length)[0];
      if (producer && (producer.dead || producer.underConstruction || producer.team !== team || producer.kind !== producerKind || producer.productionQueue.length >= MAX_QUEUE)) break;
      if (!producer) break;
      if (!w.canProduceAtLevel(producer, c.kind)) break;
      // Do not spend the player's resources on a unit that cannot enter the
      // production pipeline at all. Temporary outages still stall an existing queue.
      const operational = w.productionOperational(producer, c.kind);
      if (!operational.operational) break;
      const unitLimits: Partial<Record<string, number>> = {
        inf: 40, engineer: 8, special: 4, atInf: 12, mgInf: 10, reconInf: 10, sniper: 6, mortar: 8, manpad: 8, atgm: 8,
        tank: 18, apc: 16, ifv: 14, artillery: 8, mlrs: 6, reconVehicle: 8, lightTank: 8, tankDestroyer: 8, spaa: 8,
        heli: 6, gunship: 6, transport: 6, casHeli: 6, fighter: 8, interceptor: 6, bomber: 4, ecm: 4, multirole: 6, attackAircraft: 6,
        destroyer: 4, submarine: 4, landingcraft: 6, frigate: 6, missileBoat: 8,
      };
      const limit = unitLimits[c.kind];
      if (limit !== undefined && w.entities.filter(e => !e.dead && e.team === team && e.kind === c.kind).length + producer.productionQueue.filter(k => k === c.kind).length >= limit) break;
      if (def.category === "air" && producer.kind === "airbase") {
        const air = w.airbaseStatus(team);
        if (air.aircraft + w.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="airbase").reduce((n,e)=>n+e.productionQueue.length,0) >= air.capacity) break;
      }
      if (w.powerStatus(team).ratio < 0.25 && c.kind !== "inf" && c.kind !== "engineer") break;
      if (["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(c.kind) && !w.hasTech(team, "air")) break;
      if ((c.kind === "gunship") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "special") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "artillery" || c.kind === "mlrs") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "interceptor" || c.kind === "bomber") && w.producerLevel(producer) < 2) break;
      if (["destroyer","submarine"].includes(c.kind) && w.producerLevel(producer) < 2) break;
      w.teamCredits[team] -= def.cost; w.teamResources[team] -= def.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      producer.productionQueue.push(c.kind);
      w.queue = [...producer.productionQueue];
      break;
    }
    case "cancel-produce": {
      const producer = w.byId.get(c.producerId);
      if (!producer || producer.dead || producer.team !== (c.team ?? w.playerTeam)) break;
      if (!producer.productionQueue.length) break;
      const cancelled = producer.productionQueue.pop()!;
      const def = UNITS[cancelled];
      // Refund 75% – better than original Real War (often 0 refund)
      const refund = Math.floor(def.cost * 0.75);
      const team = producer.team;
      w.teamCredits[team] += refund;
      w.teamResources[team] += refund;
      if (team === w.playerTeam) {
        w.credits = w.teamCredits[team];
        w.resources = w.teamResources[team];
      }
      if (producer.productionQueue.length === 0) producer.productionProgress = 0;
      w.queue = [...producer.productionQueue];
      break;
    }
  }
}

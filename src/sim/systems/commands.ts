import type { World } from "../World";
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

function formation(n: number, x: number, z: number): Point[] {
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), sp = 5, out: Point[] = [];
  for (let i = 0; i < n; i++) out.push({ x: x + ((i % cols) - (cols - 1) / 2) * sp, z: z + (Math.floor(i / cols) - (rows - 1) / 2) * sp });
  return out;
}

export function applyCommands(w: World): void {
  const cmds = w.pending;
  w.pending = [];
  for (const c of cmds) apply(w, c);
}

function apply(w: World, c: Command): void {
  switch (c.type) {
    case "move":
    case "amove": {
      const us = mobile(w, c.ids, c.team), pts = formation(us.length, c.x, c.z);
      const field = new FlowField(w.nav, { x: c.x, z: c.z });
      us.forEach((u, i) => {
        u.mode = c.type === "move" ? "move" : "amove"; u.dest = pts[i];
        u.navPath = c.type === "move" ? findPath(w.nav, u, pts[i], u.def.radius) : [];
        u.navPathIndex = 1;
        u.flowField = field;
        u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
        if (c.type === "move") u.target = null;
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
        u.mode = "idle"; u.dest = null; u.target = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; u.holdPosition = false; u.patrolPoints = []; }
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
      if (!target || target.dead || target.team !== (c.team ?? w.playerTeam) || target.def.speed > 0 || target.hp >= target.def.hp) break;
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
      const builder = mobile(w, c.ids, team).find(u => u.kind === "engineer");
      if (!builder || !isBuildable(c.kind)) break;
      const spec = BUILDINGS[c.kind];
      const walletCredits = w.teamCredits[team], walletResources = w.teamResources[team];
      if (walletResources < spec.cost || walletCredits < spec.cost) break;
      if (!w.canBuildKind(team, c.kind)) break;
      if (Math.hypot(builder.x - c.x, builder.z - c.z) > 18) break;
      if (!w.canPlaceBuilding(team, c.kind, c.x, c.z)) break;
      w.teamCredits[team] -= spec.cost; w.teamResources[team] -= spec.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      const b = w.spawn(c.kind, team, c.x, c.z);
      b.underConstruction = true; b.constructionProgress = 0; b.hp = Math.max(1, b.def.hp * 0.15); b.constructionTime = spec.buildTime; b.builderIds = [builder.id]; b.heading = c.rotation ?? b.heading; b.pHeading = b.heading;
      builder.mode = "build"; builder.target = b; builder.dest = { x: c.x, z: c.z };
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
      const cost = 140, team = c.team ?? w.playerTeam;
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
      const artillery = mobile(w, c.ids, c.team).filter(u => u.kind === "artillery");
      for (const u of artillery) { u.fireMission = {x:c.x,z:c.z}; u.mode = "attack"; u.target = null; u.dest = null; }
      break;
    }
    case "standing": {
      for (const u of mobile(w, c.ids, c.team)) {
        u.standingOrder = c.mode;
        if (c.mode === "hold") { u.mode = "hold"; u.holdPosition = true; u.dest = null; u.target = null; }
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
      if (!def.producible || !hq || hq.dead || hq.underConstruction || w.teamResources[team] < def.cost || w.teamCredits[team] < def.cost) break;
      const producerKind = (c.kind === "inf" || c.kind === "engineer" || c.kind === "special") ? "barracks" : (c.kind === "tank" || c.kind === "artillery") ? "factory" : (c.kind === "heli" || c.kind === "transport" || c.kind === "gunship") ? "helipad" : (c.kind === "fighter" ? "airbase" : (["destroyer","submarine","landingcraft"].includes(c.kind) ? "shipyard" : null));
      if (!producerKind) break;
      const producer = c.producerId !== undefined
        ? w.byId.get(c.producerId)
        : w.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === producerKind && e.productionQueue.length < MAX_QUEUE).sort((a,b)=>a.productionQueue.length-b.productionQueue.length)[0];
      if (producer && (producer.dead || producer.underConstruction || producer.team !== team || producer.kind !== producerKind || producer.productionQueue.length >= MAX_QUEUE)) break;
      if (!producer) break;
      const unitLimits: Partial<Record<string, number>> = { tank: 20, artillery: 8, fighter: 8, gunship: 6, transport: 6, heli: 6, inf: 40, engineer: 8, special: 8, destroyer: 5, submarine: 4, landingcraft: 6 };
      const limit = unitLimits[c.kind];
      if (limit !== undefined && w.entities.filter(e => !e.dead && e.team === team && e.kind === c.kind).length + producer.productionQueue.filter(k => k === c.kind).length >= limit) break;
      if ((c.kind === "fighter" || c.kind === "gunship") && producer.kind === "airbase") {
        const air = w.airbaseStatus(team);
        if (air.aircraft + producer.productionQueue.filter(k => k === c.kind).length >= air.capacity) break;
      }
      if (w.powerStatus(team).ratio < 0.25 && c.kind !== "inf" && c.kind !== "engineer") break;
      if ((c.kind === "fighter" || c.kind === "gunship") && !w.hasTech(team, "air")) break;
      if (["destroyer","submarine","landingcraft"].includes(c.kind) && !w.hasTech(team, "sea-command")) break;
      w.teamCredits[team] -= def.cost; w.teamResources[team] -= def.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      producer.productionQueue.push(c.kind);
      w.queue = [...producer.productionQueue];
      break;
    }
  }
}

import type { World } from "../World";
import type { Command, Entity, Point } from "../types";
import { UNITS } from "../units";
import { MAX_QUEUE } from "../constants";
import { findPath } from "../nav/Pathfinder";
import { FlowField } from "../nav/FlowField";

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
      for (const u of mobile(w, c.ids, c.team)) { u.mode = "idle"; u.dest = null; u.target = null; u.navPath = []; u.navPathIndex = 0; u.flowField = null; u.holdPosition = false; u.patrolPoints = []; }
      break;
    case "hold":
      for (const u of mobile(w, c.ids, c.team)) { u.mode = "hold"; u.dest = null; u.target = null; u.holdPosition = true; u.navPath = []; u.flowField = null; }
      break;
    case "patrol": {
      const us = mobile(w, c.ids, c.team);
      for (const u of us) { u.mode = "patrol"; u.patrolPoints = [{x:c.x,z:c.z},{x:u.x,z:u.z}]; u.patrolIndex = 0; u.dest = u.patrolPoints[0]; u.target = null; }
      break;
    }
    case "build": {
      const builder = mobile(w, c.ids, c.team).find(u => u.kind === "engineer");
      const cost = c.kind === "refinery" ? 180 : c.kind === "aa" ? 160 : 120;
      if (!builder || w.credits < cost || Math.hypot(builder.x-c.x,builder.z-c.z) > 12) break;
      w.credits -= cost; w.spawn(c.kind, builder.team, c.x, c.z);
      break;
    }
    case "research": {
      const cost = c.tech === "air" ? 240 : 220;
      if (w.techs.has(c.tech) || w.credits < cost) break;
      const requires = c.tech === "air" ? "engineering" : "engineering";
      if (!w.techs.has(requires)) break;
      w.credits -= cost; w.techs.add(c.tech);
      break;
    }
    case "upgrade": {
      const cost = 140;
      if (w.credits < cost) break;
      const us = mobile(w, c.ids, c.team);
      for (const u of us) if (!u.upgrades.has(c.upgrade)) { w.credits -= cost; u.upgrades.add(c.upgrade); if (c.upgrade === "armor") u.hp += u.def.hp * 0.15; }
      break;
    }
    case "produce": {
      const def = UNITS[c.kind], team = c.team ?? w.playerTeam, hq = w.hq[team];
      if (!def.producible || !hq || hq.dead || w.credits < def.cost || w.queue.length >= MAX_QUEUE) break;
      if ((c.kind === "heli" || c.kind === "fighter") && !w.techs.has("air")) break;
      w.credits -= def.cost;
      w.queue.push(c.kind);
      break;
    }
  }
}

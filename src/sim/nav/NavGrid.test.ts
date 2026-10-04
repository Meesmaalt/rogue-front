import { describe, expect, it } from "vitest";
import { NavGrid } from "./NavGrid";
import { findPath } from "./Pathfinder";
import { FlowField } from "./FlowField";
import { World } from "../World";

const walkable = (p: { x: number; z: number }) => new NavGrid().isWalkableWorld(p.x, p.z);

describe("NavGrid", () => {
  it("base gates pass a tank and cannot be sealed by building a warehouse over the entrance",()=>{
    const w=new World(17);const p=w.bases[0];w.spawn("hq",0,p.x,p.z);w.spawn("generator",0,p.x,p.z+18);w.nav.syncBuildings(w.entities);
    const gate=w.mapFeatures.find(f=>f.id==="base-0-gate")!;
    expect(w.canPlaceBuilding(0,"supply",gate.x,gate.z)).toBe(false);
    expect(findPath(w.nav,{x:p.x+12,z:p.z-10},{x:p.x+60,z:p.z-60},2.7).length).toBeGreaterThan(1);
  });
  it("uses a 2m grid over the 400m map", () => {
    const n = new NavGrid();
    expect(n.width).toBe(200); expect(n.height).toBe(200); expect(n.cellSize).toBe(2);
  });

  it("marks static buildings as blocked", () => {
    const w = new World(1); const b = w.spawn("bunker", 0, 0, 0); w.nav.syncBuildings(w.entities);
    expect(w.nav.isWalkableWorld(b.x, b.z, 0)).toBe(false);
    expect(w.nav.isWalkableWorld(20, 20)).toBe(true);
  });

  it("finds a route and smooths it", () => {
    const n = new NavGrid(); const path = findPath(n, { x: -120, z: 120 }, { x: -60, z: 120 }, 1);
    expect(path.length).toBeGreaterThan(1);
    expect(path.every(walkable)).toBe(true);
  });

  it("builds a flow field toward the target", () => {
    const n = new NavGrid(); const f = new FlowField(n, { x: -60, z: 120 });
    const d = f.directionAt({ x: -100, z: 120 });
    expect(d).not.toBeNull();
    expect(Math.hypot(d!.x, d!.z)).toBeCloseTo(1, 5);
  });

  it("200 moving units stay under the 4ms/tick navigation budget", () => {
    const w = new World(1);
    const units = Array.from({ length: 200 }, (_, i) => w.spawn("inf", 0, -150 + (i % 20) * 3, 80 + Math.floor(i / 20) * 3));
    for (const u of units) { u.mode = "move"; u.dest = { x: -20, z: 0 }; u.navPath = findPath(w.nav, u, u.dest, u.def.radius); u.navPathIndex = 1; }
    const dt = 1 / 30;
    for (let i = 0; i < 10; i++) { for (const u of units) { u.px = u.x; u.pz = u.z; } w.tick(dt); }
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) w.tick(dt);
    const avg = (performance.now() - t0) / 60;
    expect(avg).toBeLessThan(4);
  });
});

describe("Map features", () => {
  it("blocks static tactical geometry while leaving roads open", () => {
    const n = new NavGrid([], [
      { id: "wall", kind: "wall", x: 0, z: 0, width: 20, depth: 4 },
      { id: "road", kind: "road", x: 30, z: 0, width: 20, depth: 6 },
    ]);
    expect(n.isWalkableWorld(0, 0)).toBe(false);
    expect(n.isWalkableWorld(30, 0)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { World } from "./World";
import { createSkirmish } from "./scenario";
import { BASES } from "./heightmap";
import { parseUnits, UNITS } from "./units";
import { damage } from "./systems/combat";
import { SIM_STEP } from "./constants";

const run = (w: World, seconds: number) => { for (let i = 0; i < seconds / SIM_STEP; i++) w.tick(SIM_STEP); };

describe("units.json", () => {
  it("on korrektne", () => expect(UNITS.tank.hp).toBeGreaterThan(0));
  it("viskab vea puuduva välja korral", () => {
    expect(() => parseUnits({ tank: { name: "x" } })).toThrow();
  });
});

describe("World", () => {
  it("on deterministlik sama seemnega", () => {
    const mk = () => { const w = new World(5); createSkirmish(w); w.issue({ type: "move", ids: [2, 3], x: 0, z: 0 }); run(w, 20); return w; };
    const a = mk(), b = mk();
    expect(a.entities.map((e) => [e.id, e.x, e.z, e.hp])).toEqual(b.entities.map((e) => [e.id, e.x, e.z, e.hp]));
  });

  it("liigub sihtpunkti", () => {
    const w = new World(1), P = BASES[0];
    const t = w.spawn("tank", 0, P.x + 40, P.z);
    w.issue({ type: "move", ids: [t.id], x: P.x + 70, z: P.z });
    run(w, 8);
    expect(Math.hypot(t.x - (P.x + 70), t.z - P.z)).toBeLessThan(3);
    expect(t.mode).toBe("idle");
  });

  it("tank hävitab jalaväelase", () => {
    const w = new World(1);
    const t = w.spawn("tank", 0, 0, 0), e = w.spawn("inf", 1, 25, 0);
    run(w, 10);
    expect(e.dead).toBe(true);
    expect(t.dead).toBe(false);
  });

  it("tootmine kulutab krediiti ja loob üksuse", () => {
    const w = new World(1);
    w.spawn("hq", 0, BASES[0].x, BASES[0].z);
    w.spawn("factory", 0, BASES[0].x + 14, BASES[0].z);
    const before = w.entities.length;
    w.issue({ type: "produce", kind: "tank" });
    w.tick(SIM_STEP);
    expect(w.queue).toEqual(["tank"]);
    run(w, UNITS.tank.buildTime + 0.5);
    expect(w.entities.length).toBe(before + 1);
  });

  it("ei luba toota ilma krediidita", () => {
    const w = new World(1);
    w.spawn("hq", 0, BASES[0].x, BASES[0].z);
    w.spawn("factory", 0, BASES[0].x + 14, BASES[0].z);
    w.credits = 10;
    w.issue({ type: "produce", kind: "tank" });
    w.tick(SIM_STEP);
    expect(w.queue.length).toBe(0);
  });

  it("võit ja kaotus", () => {
    const w = new World(1);
    const h0 = w.spawn("hq", 0, BASES[0].x, BASES[0].z), h1 = w.spawn("hq", 1, BASES[1].x, BASES[1].z);
    damage(w, h1, 1e6);
    w.tick(SIM_STEP);
    expect(w.status).toBe("won");
    const w2 = new World(1);
    const a = w2.spawn("hq", 0, BASES[0].x, BASES[0].z);
    w2.spawn("hq", 1, BASES[1].x, BASES[1].z);
    damage(w2, a, 1e6);
    w2.tick(SIM_STEP);
    expect(w2.status).toBe("lost");
    expect(h0.dead).toBe(false);
  });

  it("vaenlane saadab laine", () => {
    const w = new World(1);
    w.spawn("hq", 1, BASES[1].x, BASES[1].z);
    w.spawn("engineer", 1, BASES[1].x - 10, BASES[1].z);
    run(w, 23);
    expect(w.entities.length).toBeGreaterThan(1);
  });
});

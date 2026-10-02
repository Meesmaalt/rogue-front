import { describe, expect, it } from "vitest";
import { BASES } from "./heightmap";
import { SIM_STEP } from "./constants";
import { World } from "./World";
import { UNITS } from "./units";

describe("production", () => {
  it("tootab järjekorra lõpus ühiku", () => {
    const w = new World(2); w.spawn("hq", 0, BASES[0].x, BASES[0].z); w.spawn("factory", 0, BASES[0].x + 14, BASES[0].z); w.issue({ type: "produce", kind: "tank" });
    for (let i = 0; i < Math.ceil(UNITS.tank.buildTime / SIM_STEP) + 2; i++) w.tick(SIM_STEP);
    expect(w.entities.some((e) => e.kind === "tank" && e.team === 0)).toBe(true);
  });
});

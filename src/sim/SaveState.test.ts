import { describe, expect, it } from "vitest";
import { SIM_STEP } from "./constants";
import { loadWorld, saveWorld } from "./SaveState";
import { createSkirmish } from "./scenario";
import { worldHash } from "./Replay";
import { World } from "./World";

describe("save state", () => {
  it("taastab simulatsiooni oleku", () => {
    const a = new World(7); createSkirmish(a); a.issue({ type: "move", ids: [2], x: 0, z: 0 });
    for (let i = 0; i < 60; i++) a.tick(SIM_STEP);
    const state = saveWorld(a), b = new World(7); loadWorld(b, state);
    expect(worldHash(b)).toBe(worldHash(a));
  });
});

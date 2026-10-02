import { describe, expect, it } from "vitest";
import { SIM_STEP } from "./constants";
import { World } from "./World";

describe("combat", () => {
  it("tekitab tule ja tabamuse sündmused", () => {
    const w = new World(3); w.spawn("tank", 0, 0, 0); w.spawn("inf", 1, 20, 0);
    for (let i = 0; i < 120; i++) w.tick(SIM_STEP);
    const events = w.drainEvents();
    expect(events.some((e) => e.type === "fire")).toBe(true);
    expect(events.some((e) => e.type === "hit" || e.type === "death")).toBe(true);
  });
});

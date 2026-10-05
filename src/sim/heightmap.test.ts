import { describe, expect, it, beforeEach } from "vitest";
import { BASES, MAP_SIZE, heightAt, resetHeightmap } from "./heightmap";

describe("heightAt", () => {
  beforeEach(resetHeightmap);
  it("on baaside keskel tasane", () => {
    for (const b of BASES) expect(Math.abs(heightAt(b.x, b.z))).toBeLessThan(0.01);
  });
  it("on deterministlik", () => {
    expect(heightAt(12.5, -40.2)).toBe(heightAt(12.5, -40.2));
  });
  it("kaardi serv on mägine", () => {
    expect(heightAt(MAP_SIZE*.51, 0)).toBeGreaterThan(10);
  });
});

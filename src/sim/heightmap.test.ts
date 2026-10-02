import { describe, expect, it } from "vitest";
import { BASES, heightAt } from "./heightmap";

describe("heightAt", () => {
  it("on baaside keskel tasane", () => {
    for (const b of BASES) expect(Math.abs(heightAt(b.x, b.z))).toBeLessThan(0.01);
  });
  it("on deterministlik", () => {
    expect(heightAt(12.5, -40.2)).toBe(heightAt(12.5, -40.2));
  });
  it("kaardi serv on mägine", () => {
    expect(heightAt(199, 0)).toBeGreaterThan(10);
  });
});

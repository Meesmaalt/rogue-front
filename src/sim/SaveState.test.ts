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

it('rejects changed geometry and malformed entities before changing the running match',()=>{
 const w=new World(31);createSkirmish(w);const saved=saveWorld(w),before=worldHash(w);
 const incompatible=structuredClone(saved);incompatible.mapSignature='different-map';expect(()=>loadWorld(w,incompatible)).toThrow(/kaardi/);expect(worldHash(w)).toBe(before);
 const corrupt=structuredClone(saved);corrupt.fullEntities![0].x=NaN;expect(()=>loadWorld(w,corrupt)).toThrow(/üksuse/);expect(worldHash(w)).toBe(before);
});
it('rolls back a failure in runtime restore, including entity references and RNG',()=>{
 const w=new World(32);createSkirmish(w);const before=worldHash(w),bad=saveWorld(w);bad.fullEntities![0].hp=1;
 bad.runtime!.vision=null as unknown as ReturnType<World["captureRuntime"]>["vision"];
 expect(()=>loadWorld(w,bad)).toThrow(/eelmine lahing/);expect(worldHash(w)).toBe(before);w.tick(SIM_STEP);expect(w.time).toBe(SIM_STEP);
});

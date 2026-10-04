import { SIM_STEP } from "./constants";
import { describe, expect, it } from "vitest";
import { ReplayRecorder, replay, worldHash } from "./Replay";
import { createSkirmish } from "./scenario";
import { World } from "./World";


describe("replay", () => {
  it("sama seeme + samad käsud annab sama lõppseisu", () => {
    const a = new World(42); createSkirmish(a);
    const recorder = new ReplayRecorder(42);
    const issue = (command: Parameters<World["issue"]>[0]) => { recorder.record(command); a.issue(command); };
    issue({ type: "move", ids: [2, 3], x: 0, z: 0 });
    for (let i = 0; i < 300; i++) { a.tick(SIM_STEP); recorder.step(); }
    const b = new World(42); createSkirmish(b); replay(b, recorder.file(), 300);
    expect(worldHash(b)).toBe(worldHash(a));
  });
});

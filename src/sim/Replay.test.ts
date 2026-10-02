import { describe, expect, it } from "vitest";
import { SIM_STEP } from "./constants";
import { ReplayRecorder, replay, worldHash } from "./Replay";
import { createSkirmish } from "./scenario";
import { World } from "./World";

function run(w: World, seconds: number): void { for (let i = 0; i < seconds / SIM_STEP; i++) w.tick(SIM_STEP); }

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

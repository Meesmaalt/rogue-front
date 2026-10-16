import { afterEach, expect, it, vi } from "vitest";
import { World } from "../sim/World";
import { resetHeightmap, setBases } from "../sim/heightmap";
import { BattleNoticeLog } from "./BattleNotices";
import { englishText } from "./Language";

afterEach(() => { resetHeightmap(); vi.restoreAllMocks(); });
function fixture() {
  const bases = [{ x: 0, z: 0, r: 180 }, { x: 270, z: 270, r: 20 }];
  setBases(bases);
  const world = new World(53, false, [], [], bases, false);
  const own = world.spawn("tank", 0, 0, 0), enemy = world.spawn("tank", 1, 60, 0);
  const log = new BattleNoticeLog();
  log.update(world, []);
  return { world, own, enemy, log };
}

it("reports actual own damage without knowing the attacker or requiring the victim to have fired", () => {
  const { world, own, enemy, log } = fixture();
  world.time = 1; enemy.hp -= 20; log.update(world, []); expect(log.entries).toHaveLength(0);
  world.time = 2; own.hp -= 20; log.update(world, []);
  expect(log.entries).toMatchObject([{ key: "under-attack", x: own.x, z: own.z }]);
  const notice = log.entries[0];
  log.acknowledge(notice.id); expect(notice.read).toBe(true);
  world.time = 3; own.hp -= 10; log.update(world, []);
  expect(log.entries).toHaveLength(1); expect(notice.read).toBe(false); expect(notice.count).toBe(1);
  world.time = 4; own.hp += 10; log.update(world, []); expect(notice.time).toBe(3);
});

it("keeps critical alerts ahead of completions, groups nearby losses and leaves separate fronts distinct", () => {
  const { world, log } = fixture();
  world.time = 10;
  log.update(world, [
    { type: "death", team: 0, kind: "tank", big: true, x: 0, y: 0, z: 0 },
    { type: "death", team: 0, kind: "tank", big: true, x: 10, y: 0, z: 0 },
    { type: "death", team: 0, kind: "tank", big: true, x: 150, y: 0, z: 0 },
    ...Array.from({ length: 5 }, (_, i) => ({ type: "build-complete" as const, team: 0 as const, kind: "barracks" as const, x: i * 100, y: 0, z: 0 }))
  ]);
  const visible = log.visible(world.time);
  expect(visible).toHaveLength(4); expect(visible.slice(0, 2).every(n => n.tone === "danger")).toBe(true);
  expect(log.entries.find(n => n.key === "loss:tank" && n.x === 10)?.count).toBe(2);
  expect(log.entries.filter(n => n.key === "loss:tank")).toHaveLength(2);
  expect(log.visible(25)).toHaveLength(0); expect(log.visible(25, true)).toHaveLength(7);
});

it("keeps hidden launch sites private while preserving global warnings and own fuel locations", () => {
  const { world, log } = fixture();
  vi.spyOn(world.vision, "isVisible").mockReturnValue(false);
  log.update(world, [
    { type: "strategic-launch", team: 1, payload: "nuclear", x: 220, z: 220 },
    { type: "air-fuel-warning", team: 1, unitId: 42, emergency: true, x: 180, z: 180 },
    { type: "air-fuel-warning", team: 0, unitId: 43, emergency: true, x: 30, z: 40 },
    { type: "build-complete", team: 1, kind: "airbase", x: 180, y: 0, z: 180 }
  ]);
  expect(log.entries).toHaveLength(2);
  const launch = log.entries.find(n => n.key.startsWith("launch"))!;
  expect(launch.tone).toBe("danger"); expect(launch.x).toBeUndefined(); expect(launch.z).toBeUndefined();
  expect(log.entries.find(n => n.key === "fuel:43")).toMatchObject({ x: 30, z: 40, tone: "danger" });
  vi.mocked(world.vision.isVisible).mockReturnValue(true);
  world.time = 11; log.update(world, [{ type: "strategic-launch", team: 1, payload: "icbm", x: 220, z: 220 }]);
  expect(log.entries[0]).toMatchObject({ x: 220, z: 220 });
});

it("warns about HQ damage only when it takes damage, and clears history and baselines on restore or team change", () => {
  const { world, log } = fixture();
  const hq = world.spawn("hq", 0, 10, 10); hq.hp *= .3;
  world.time = 1; log.update(world, []); expect(log.entries).toHaveLength(0);
  world.time = 2; hq.hp--; log.update(world, []); expect(log.entries[0].key).toBe("hq-critical");
  world.time = 3; log.update(world, []); expect(log.entries[0].time).toBe(2);
  world.time = .5; log.update(world, []); expect(log.entries).toHaveLength(0);
  world.time = 1; hq.hp--; log.update(world, []); expect(log.entries).toHaveLength(1);
  world.playerTeam = 1; log.update(world, []); expect(log.entries).toHaveLength(0);
});

it("bounds history during prolonged battles and preserves a refreshed alert in the recent history", () => {
  const log = new BattleNoticeLog();
  const add = (key: string, time: number) => log.add({ key, time, text: key, tone: "warn" });
  add("attack", 0);
  for (let i = 0; i < 23; i++) add(String(i), 1);
  add("attack", 2); add("new", 3);
  expect(log.entries).toHaveLength(24); expect(log.entries.some(n => n.key === "attack")).toBe(true);
  for (let i = 0; i < 200; i++) add(`later${i}`, 20 + i);
  expect(log.entries).toHaveLength(24);
  expect(log.acknowledge(-1)).toBeUndefined();
});

it("translates the actionable alerts in English without changing unit identifiers", () => {
  expect(englishText("F-16 #41 · Kütus alla 15%: naase baasi")).toBe("F-16 #41 · Fuel below 15%: return to base");
  expect(englishText("Vaenlase tuumaraketi start")).toBe("Enemy nuclear missile launched");
  expect(englishText("Lahinguteated · 3")).toBe("Battle notifications · 3");
});

it("reports captured or lost friendly resources without announcing enemy-to-neutral ownership changes", () => {
  const { world, log } = fixture();
  world.resourcePoints[0].controlledBy = 1;
  world.time = 1; log.update(world, []); expect(log.entries).toHaveLength(0);
  world.resourcePoints[0].controlledBy = null;
  world.time = 2; log.update(world, []); expect(log.entries).toHaveLength(0);
  world.resourcePoints[0].controlledBy = 0;
  world.time = 3; log.update(world, []); expect(log.entries[0]).toMatchObject({ tone: "good", x: world.resourcePoints[0].x });
  world.resourcePoints[0].controlledBy = null;
  world.time = 4; log.update(world, []); expect(log.entries[0].text).toContain("Kontroll kaotatud"); expect(log.entries[0].tone).toBe("danger");
  world.time = 1; log.update(world, []); expect(log.entries).toHaveLength(0);
});

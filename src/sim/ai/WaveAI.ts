import type { World } from "../World";
import type { Entity, UnitKind } from "../types";
import type { BuildableKind } from "../buildings";

export type AIPersonality = "aggressive" | "defensive" | "economic";

/**
 * Stronger-than-Real-War AI:
 * - Proper economy-first build order
 * - Protects own logistics helicopters
 * - Prioritises enemy supply depots / generators / production
 * - Mixed arms attacks with artillery support
 * - Reactive defence of threatened resource points
 */
export class WaveAI {
  buildTimer = 3.5;
  attackTimer = 22;
  scoutTimer = 5;
  counterAttackTimer = 11;
  expansionTimer = 16;
  defendTimer = 0;
  personality: AIPersonality = "aggressive";
  difficulty: "easy" | "normal" | "hard" = "normal";

  setProfile(personality: AIPersonality, difficulty: "easy" | "normal" | "hard" = "normal"): void {
    this.personality = personality;
    this.difficulty = difficulty;
    this.attackTimer = difficulty === "hard" ? 15 : difficulty === "easy" ? 28 : 20;
  }

  update(w: World, dt: number): void {
    const hq = w.hq[1];
    if (!hq || hq.dead) return;
    this.buildTimer -= dt;
    this.attackTimer -= dt;
    this.scoutTimer -= dt;
    this.counterAttackTimer -= dt;
    this.expansionTimer -= dt;
    this.defendTimer -= dt;

    if (this.scoutTimer <= 0) {
      this.scoutTimer = this.difficulty === "hard" ? 5.5 : 8;
      this.scout(w);
    }
    if (this.buildTimer <= 0) {
      this.buildTimer = this.personality === "economic" ? 5.5 : 4.2;
      this.developBase(w);
      if (!w.hasTech(1, "air") && w.teamResources[1] >= 240 && w.teamCredits[1] >= 240 &&
          (w.hasBuilding(1, "helipad") || w.hasBuilding(1, "airbase"))) {
        w.teamResources[1] -= 240;
        w.teamCredits[1] -= Math.min(w.teamCredits[1], 240);
        w.teamTechs[1].add("air");
      }
    }

    this.protectLogistics(w);
    this.expandForward(w);
    this.upgradeProducers(w);
    this.produceArmy(w);

    if (this.defendTimer <= 0) {
      this.defendTimer = 6;
      this.defendBase(w);
    }

    if (this.counterAttackTimer <= 0) {
      this.counterAttackTimer = this.personality === "aggressive" ? 12 : 18;
      this.counterAttack(w);
    }
    if (this.attackTimer <= 0) {
      this.attackTimer = this.personality === "aggressive" ? 18 : this.personality === "defensive" ? 30 : 24;
      this.launchAttack(w);
    }
  }

  private scout(w: World): void {
    const scouts = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.speed > 0 &&
      ["inf", "tank", "gunship", "fighter", "special"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    if (!scouts.length) return;
    const zones = w.resourcePoints.filter(r => !w.vision.isExplored(1, r.x, r.z));
    const target = zones.length
      ? zones[Math.floor(w.rng() * zones.length)]
      : { x: (w.rng() * 2 - 1) * 90, z: (w.rng() * 2 - 1) * 90 };
    const scout = scouts.sort((a, b) =>
      Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(b.x - target.x, b.z - target.z)
    )[0];
    scout.mode = "move";
    scout.target = null;
    scout.dest = { x: target.x, z: target.z };
  }

  private developBase(w: World): void {
    const base = w.bases[1];
    const eng = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build");
    if (!eng) return;
    const gate = w.baseGate(1);
    const backX = base.x - (w.bases[0].x - base.x) * 0.08;
    const backZ = base.z - (w.bases[0].z - base.z) * 0.08;

    const plans: Array<[BuildableKind, number, number, number]> = [
      ["generator", base.x - 12, base.z - 10, 140],
      ["supply", base.x - 22, base.z - 10, 130],
      ["landCommand", base.x - 28, base.z - 2, 100],
      ["barracks", base.x - 16, base.z + 8, 160],
      ["combatEngineer", base.x - 18, base.z + 18, 150],
      ["factory", base.x + 16, base.z + 8, 220],
      ["airCommand", base.x + 26, base.z - 2, 120],
      ["helipad", base.x + 16, base.z - 12, 200],
      ["bunker", gate.x - (gate.x - base.x) * 0.2, gate.z - (gate.z - base.z) * 0.2, 120],
      ["radar", base.x + 8, base.z + 20, 190],
      ["aa", backX + 12, backZ + 10, 160],
      ["airbase", base.x + 22, base.z + 10, 320],
      ["landStrategy", base.x - 4, base.z + 22, 240],
      ["airStrategy", base.x + 20, base.z + 22, 260],
      ["seaCommand", base.x - 30, base.z + 18, 120],
      ["shipyard", base.x - 28, base.z + 26, 360],
      ["seaStrategy", base.x - 40, base.z + 22, 260],
      ["refinery",
        w.resourcePoints.find(r => r.controlledBy === 1 || r.controlledBy == null)?.x ?? base.x - 24,
        w.resourcePoints.find(r => r.controlledBy === 1 || r.controlledBy == null)?.z ?? base.z - 24,
        180],
      ["aa", backX + 18, backZ - 6, 160],
      ["bunker", gate.x + 10, gate.z + 8, 120],
    ];

    for (const [kind, x, z, cost] of plans) {
      if (this.has(w, 1, kind) && kind !== "bunker" && kind !== "aa" && kind !== "supply" && kind !== "generator") continue;
      if (["bunker", "aa", "supply", "generator"].includes(kind)) {
        const count = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === kind).length;
        const limits: Record<string, number> = { bunker: 4, aa: 3, supply: 3, generator: 3 };
        if (count >= (limits[kind] ?? 1)) continue;
      }
      if (w.teamResources[1] < cost || w.teamCredits[1] < cost) continue;
      if (kind === "refinery" && !w.resourcePoints.some(r => Math.hypot(r.x - x, r.z - z) <= r.radius + 12)) continue;
      if (!w.canBuildKind(1, kind)) continue;
      w.issue({ type: "build", ids: [eng.id], kind, x, z, team: 1 });
      return;
    }
  }

  private protectLogistics(w: World): void {
    const helis = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.kind === "transport" && e.supplyDepotId != null && e.cargo > 0
    );
    for (const h of helis) {
      const threat = w.entities.find(e =>
        !e.dead && e.team === 0 && e.def.speed > 0 && Math.hypot(e.x - h.x, e.z - h.z) < 38
      );
      if (!threat) continue;
      const defenders = w.entities.filter(e =>
        !e.dead && e.team === 1 && ["tank", "inf", "gunship", "aa"].includes(e.kind) &&
        e.loadedIntoId === null && Math.hypot(e.x - h.x, e.z - h.z) < 70
      ).slice(0, 4);
      for (const d of defenders) {
        d.mode = "amove";
        d.target = threat;
        d.dest = { x: threat.x, z: threat.z };
      }
    }
  }

  private expandForward(w: World): void {
    if (this.expansionTimer > 0) return;
    this.expansionTimer = this.personality === "economic" ? 13 : 20;
    const engineer = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build");
    if (!engineer) return;
    const target = w.resourcePoints
      .map(r => ({
        r,
        d: Math.hypot(r.x - engineer.x, r.z - engineer.z),
        enemy: r.controlledBy === 0,
        neutral: r.controlledBy == null,
      }))
      .filter(v => v.r.amount > 0 && (v.enemy || v.neutral))
      .sort((a, b) => (Number(b.enemy) - Number(a.enemy)) || (a.d - b.d))[0];
    if (!target) return;
    const existing = w.nearestSupplyDepot(1, { x: target.r.x, z: target.r.z }, false);
    if (existing && Math.hypot(existing.x - target.r.x, existing.z - target.r.z) < 36) return;
    const d = Math.hypot(engineer.x - target.r.x, engineer.z - target.r.z);
    if (d > 18) {
      w.issue({ type: "move", ids: [engineer.id], x: target.r.x, z: target.r.z, team: 1 });
      return;
    }
    if (w.teamCredits[1] >= 130 && w.teamResources[1] >= 130 &&
        w.canBuildKind(1, "supply") && w.canPlaceBuilding(1, "supply", target.r.x, target.r.z)) {
      w.issue({ type: "build", ids: [engineer.id], kind: "supply", x: target.r.x, z: target.r.z, team: 1 });
    }
  }

  private defendBase(w: World): void {
    const ownDepots = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "supply");
    const threats: Entity[] = [];
    for (const depot of ownDepots) {
      for (const e of w.entities) {
        if (e.dead || e.team !== 0 || e.def.speed === 0) continue;
        if (Math.hypot(e.x - depot.x, e.z - depot.z) < 45) threats.push(e);
      }
    }
    const hq = w.hq[1];
    if (hq) {
      for (const e of w.entities) {
        if (e.dead || e.team !== 0 || e.def.speed === 0) continue;
        if (Math.hypot(e.x - hq.x, e.z - hq.z) < 50) threats.push(e);
      }
    }
    if (!threats.length) return;
    const threat = threats[0];
    const defenders = w.entities.filter(e =>
      !e.dead && e.team === 1 && ["tank", "inf", "artillery", "gunship", "aa", "special"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    for (const u of defenders.slice(0, 8)) {
      u.mode = "amove";
      u.target = threat;
      u.dest = { x: threat.x, z: threat.z };
    }
  }

  private counterAttack(w: World): void {
    const threatened = w.resourcePoints
      .filter(r => r.controlledBy === 0 && r.amount > 0)
      .map(r => ({ r, d: Math.hypot(r.x - w.bases[1].x, r.z - w.bases[1].z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!threatened) return;
    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 &&
      ["tank", "inf", "artillery", "special", "gunship"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    if (army.length < 4) return;
    const frontline = army.filter(e => e.kind !== "artillery");
    frontline.forEach((u, i) => {
      u.mode = "amove";
      u.dest = { x: threatened.r.x + (i % 3 - 1) * 8, z: threatened.r.z + (i % 2) * 6 };
      u.target = null;
    });
    army.filter(e => e.kind === "artillery").forEach(u => {
      u.fireMission = { x: threatened.r.x, z: threatened.r.z };
      u.mode = "attack";
      u.target = null;
    });
  }

  private upgradeProducers(w: World): void {
    const candidates = w.entities.filter(e =>
      !e.dead && !e.underConstruction && e.team === 1 &&
      ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(e.kind) &&
      w.canUpgradeProducer(e)
    );
    const target = candidates.find(e => e.kind === "factory") ??
                   candidates.find(e => e.kind === "barracks") ??
                   candidates[0];
    if (!target || w.teamResources[1] < 260 || w.teamCredits[1] < 260) return;
    w.issue({ type: "upgrade", ids: [target.id], upgrade: "producer", team: 1 });
  }

  private produceArmy(w: World): void {
    const resources = w.teamResources[1];
    const credits = w.teamCredits[1];
    if (resources < 40 || credits < 40) return;

    const counts = {
      inf: this.count(w, "inf"),
      tank: this.count(w, "tank"),
      artillery: this.count(w, "artillery"),
      heli: this.count(w, "heli") + this.count(w, "gunship"),
      fighter: this.count(w, "fighter"),
      special: this.count(w, "special"),
      engineer: this.count(w, "engineer"),
    };

    if (counts.engineer < 2) { this.buy(w, "engineer", "barracks"); return; }
    if (counts.inf < 6) { this.buy(w, "inf", "barracks"); return; }
    if (counts.tank < 4) { this.buy(w, "tank", "factory"); return; }
    if (counts.artillery < 2 && this.has(w, 1, "factory")) { this.buy(w, "artillery", "factory"); return; }
    if (counts.special < 2) { this.buy(w, "special", "barracks"); return; }
    if (counts.heli < 2 && this.has(w, 1, "helipad")) { this.buy(w, "gunship", "helipad"); return; }
    if (counts.fighter < 2 && this.has(w, 1, "airbase")) { this.buy(w, "fighter", "airbase"); return; }

    if (counts.tank < 8) this.buy(w, "tank", "factory");
    else if (counts.inf < 12) this.buy(w, "inf", "barracks");
    else if (counts.artillery < 3) this.buy(w, "artillery", "factory");
  }

  private launchAttack(w: World): void {
    const priorityKinds = ["supply", "generator", "refinery", "factory", "barracks", "helipad", "airbase", "hq"];
    let target: Entity | null = null;
    for (const kind of priorityKinds) {
      target = w.entities.find(e =>
        !e.dead && e.team === 0 && e.kind === kind && w.vision.isVisible(1, e.x, e.z)
      ) ?? null;
      if (target) break;
    }
    if (!target) {
      const intel = w.getFreshIntel?.(1, this.difficulty === "hard" ? 35 : 25)
        ?.filter(c => c.kind !== "inf" && c.kind !== "engineer")
        ?.sort((a, b) => this.attackValue(b.kind) - this.attackValue(a.kind))[0];
      if (intel) target = { x: intel.x, z: intel.z, kind: intel.kind, dead: false } as Entity;
    }
    if (!target) target = w.hq[0] ?? null;
    if (!target || ("dead" in target && target.dead)) return;

    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 &&
      ["tank", "inf", "artillery", "gunship", "fighter", "special", "destroyer"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    const minimum = this.personality === "aggressive" ? 5 : 7;
    if (army.length < minimum) return;

    const frontline = army.filter(e => e.kind !== "artillery" && e.kind !== "fighter");
    for (const [i, u] of frontline.entries()) {
      const side = (i % 2 === 0 ? -1 : 1) * (14 + (i % 3) * 5);
      u.mode = "amove";
      u.dest = { x: target.x + side, z: target.z + ((i % 3) - 1) * 10 };
      u.target = "team" in target && (target as Entity).team === 0 ? target as Entity : null;
    }
    for (const u of army.filter(e => e.kind === "artillery")) {
      u.fireMission = { x: target.x, z: target.z };
      u.mode = "attack";
      u.dest = null;
      u.target = "team" in target && (target as Entity).team === 0 ? target as Entity : null;
    }
    for (const u of army.filter(e => e.kind === "fighter" || e.kind === "gunship")) {
      u.mode = "amove";
      u.dest = { x: target.x, z: target.z };
      u.target = "team" in target && (target as Entity).team === 0 ? target as Entity : null;
    }
    this.useTacticalTransport(w, { x: target.x, z: target.z });
  }

  private attackValue(kind: UnitKind | string): number {
    const values: Record<string, number> = {
      supply: 140, generator: 130, refinery: 125, factory: 110,
      helipad: 100, airbase: 105, barracks: 90, aa: 75, bunker: 65, hq: 55,
    };
    return values[kind] ?? 20;
  }

  private useTacticalTransport(w: World, target: { x: number; z: number }): void {
    const transport = w.entities.find(e =>
      !e.dead && e.team === 1 && e.kind === "transport" &&
      e.cargoUnitIds.length === 0 && e.supplyDepotId == null
    );
    if (!transport) return;
    const infantry = w.entities.filter(e =>
      !e.dead && e.team === 1 && ["inf", "special", "engineer"].includes(e.kind) &&
      e.loadedIntoId === null && Math.hypot(e.x - transport.x, e.z - transport.z) < 40
    );
    const passenger = infantry[0];
    if (passenger) {
      transport.transportTargetId = passenger.id;
      transport.mode = "transport-load";
      transport.dest = { x: passenger.x, z: passenger.z };
    } else if (transport.cargoUnitIds.length) {
      transport.unloadPoint = { x: target.x - 14, z: target.z - 10 };
      transport.mode = "transport-unload";
      transport.dest = transport.unloadPoint;
    }
  }

  private buy(w: World, kind: UnitKind, producer: UnitKind): void {
    const def = w.entities.find(e =>
      !e.dead && !e.underConstruction && e.team === 1 && e.kind === producer
    );
    if (!def) return;
    w.issue({ type: "produce", kind, producerId: def.id, team: 1 });
  }

  private count(w: World, kind: UnitKind): number {
    return w.entities.filter(e => !e.dead && e.team === 1 && e.kind === kind).length;
  }

  private has(w: World, team: 1, kind: UnitKind): boolean {
    return w.entities.some(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind);
  }
}

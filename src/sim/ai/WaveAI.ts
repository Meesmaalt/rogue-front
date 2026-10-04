import type { World } from "../World";
import type { Entity, UnitKind } from "../types";
import type { BuildableKind } from "../buildings";
import { assignAirMission } from "../systems/airDoctrine";
import { isTacticallySupplied } from "../systems/tacticalSupply";
import { FACTIONS } from "../factions";

export type AIPersonality = "aggressive" | "defensive" | "economic";

/** Operatiivne doktriin (Wargame-inspired, mitte wave-timer). */
export type DoctrinePhase =
  | "bootstrap"
  | "secureLogistics"
  | "probe"
  | "establishFront"
  | "pressure"
  | "decisive";

/**
 * AI mängib operatsiooni:
 * Bootstrap → SecureLogistics → Probe → EstablishFront → Pressure → Decisive
 * Reageerib: heli-mass → AA; ladude rünnak → QRF; puhas tank → ATGM/flank/õhk.
 */
export class WaveAI {
  buildTimer = 3.5;
  attackTimer = 22;
  scoutTimer = 5;
  counterAttackTimer = 11;
  expansionTimer = 16;
  defendTimer = 0;
  doctrineTimer = 4;
  airTimer = 9;
  personality: AIPersonality = "aggressive";
  difficulty: "easy" | "normal" | "hard" = "normal";
  phase: DoctrinePhase = "bootstrap";

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
    this.doctrineTimer -= dt;
    this.airTimer -= dt;

    if (this.doctrineTimer <= 0) {
      this.doctrineTimer = this.difficulty === "hard" ? 3.5 : 5.5;
      this.updateDoctrinePhase(w);
      this.reactToPlayer(w);
    }

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

    if (this.airTimer <= 0) {
      this.airTimer = this.difficulty === "hard" ? 7 : 11;
      this.taskAir(w);
    }

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
      if (this.phase === "pressure" || this.phase === "decisive" || this.phase === "establishFront") {
        this.launchAttack(w);
      }
    }
  }

  private updateDoctrinePhase(w: World): void {
    const gens = this.count(w, "generator");
    const supplies = this.count(w, "supply");
    const aa = this.count(w, "aa");
    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.speed > 0 && e.kind !== "engineer" && e.kind !== "transport"
    ).length;
    const hasLandCmd = this.has(w, 1, "landCommand");
    const hasFactory = this.has(w, 1, "factory");

    // Logistics under threat → fall back to secure
    const logiThreat = this.logisticsThreatened(w);
    if (logiThreat && this.phase !== "bootstrap") {
      this.phase = "secureLogistics";
      return;
    }

    if (gens < 1 || supplies < 1) {
      this.phase = "bootstrap";
    } else if (!hasLandCmd || aa < 1 || supplies < 2) {
      this.phase = "secureLogistics";
    } else if (army < 6 || !hasFactory) {
      this.phase = "probe";
    } else if (army < 14) {
      this.phase = "establishFront";
    } else if (army < 22 || this.personality === "defensive") {
      this.phase = "pressure";
    } else {
      this.phase = "decisive";
    }

    // Easy AI stays earlier
    if (this.difficulty === "easy" && this.phase === "decisive") this.phase = "pressure";
  }

  private logisticsThreatened(w: World): boolean {
    for (const e of w.entities) {
      if (e.dead || e.team !== 1) continue;
      if (e.kind !== "supply" && e.kind !== "generator" && !(e.kind === "transport" && e.supplyDepotId != null)) continue;
      for (const enemy of w.entities) {
        if (enemy.dead || enemy.team !== 0 || enemy.def.speed === 0) continue;
        if (Math.hypot(enemy.x - e.x, enemy.z - e.z) < 45) return true;
      }
    }
    return false;
  }

  /** Event-driven reactions (Wargame combined-arms answers). */
  private reactToPlayer(w: World): void {
    const playerAir = w.entities.filter(e =>
      !e.dead && e.team === 0 &&
      (e.def.armor === "air" || ["heli", "gunship", "fighter", "bomber"].includes(e.kind))
    ).length;
    const playerTanks = w.entities.filter(e => !e.dead && e.team === 0 && e.kind === "tank").length;
    const myAA = this.count(w, "aa");

    // Player massing helis/air → build AA + CAP
    if (playerAir >= 3 && myAA < (this.difficulty === "hard" ? 4 : 2)) {
      this.queueDefense(w, "aa");
    }
    if (playerAir >= 2) {
      for (const f of w.entities.filter(e => !e.dead && e.team === 1 && (e.kind === "fighter" || e.kind === "interceptor"))) {
        if (f.airMission !== "cap") assignAirMission(f, "cap", w.bases[1]);
      }
    }

    // Player pure tanks → produce ATGM-ish (special/ifv) + gunships + side priority
    if (playerTanks >= 5 && this.difficulty !== "easy") {
      if (this.count(w, "ifv") < 3 && this.has(w, 1, "factory")) this.buy(w, "ifv", "factory");
      if (this.count(w, "gunship") < 2 && this.has(w, 1, "helipad")) this.buy(w, "gunship", "helipad");
      if (this.count(w, "special") < 2 && this.has(w, 1, "barracks")) this.buy(w, "special", "barracks");
    }

    // Lost generator → emergency rebuild priority is in developBase order
  }

  private queueDefense(w: World, kind: BuildableKind): void {
    const eng = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build");
    if (!eng) return;
    const base = w.bases[1];
    const gate = w.baseGate(1);
    const x = gate.x + (this.rngPick(w) - 0.5) * 20;
    const z = gate.z + (this.rngPick(w) - 0.5) * 20;
    if (!w.canBuildKind(1, kind)) return;
    if (w.teamResources[1] < 160 || w.teamCredits[1] < 160) return;
    w.issue({ type: "build", ids: [eng.id], kind, x, z, team: 1 });
  }

  private taskAir(w: World): void {
    const fighters = w.entities.filter(e =>
      !e.dead && e.team === 1 && (e.kind === "fighter" || e.kind === "interceptor") &&
      (e.airState === "grounded" || e.airState === "airborne" || !e.airState)
    );
    const gunships = w.entities.filter(e =>
      !e.dead && e.team === 1 && (e.kind === "gunship" || e.kind === "heli") &&
      (e.airState === "grounded" || e.airState === "airborne" || !e.airState)
    );
    const playerAA = w.entities.filter(e => !e.dead && e.team === 0 && e.kind === "aa");

    // CAP over own base
    for (const f of fighters.slice(0, 2)) {
      assignAirMission(f, "cap", w.bases[1]);
    }

    // SEAD if player has AA and we have gunships
    if (playerAA.length && gunships.length && this.difficulty !== "easy") {
      const aa = playerAA[0];
      assignAirMission(gunships[0], "sead", { x: aa.x, z: aa.z });
    }

    // Strike logistics in pressure/decisive
    if ((this.phase === "pressure" || this.phase === "decisive") && gunships.length > 1) {
      const supply = w.entities.find(e => !e.dead && e.team === 0 && e.kind === "supply");
      const gen = w.entities.find(e => !e.dead && e.team === 0 && e.kind === "generator");
      const t = supply ?? gen ?? w.hq[0];
      if (t) assignAirMission(gunships[gunships.length > 1 ? 1 : 0], "strike", { x: t.x, z: t.z });
    }
  }

  private scout(w: World): void {
    const scouts = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.speed > 0 &&
      ["inf", "tank", "gunship", "fighter", "special"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    if (!scouts.length) return;
    const u = scouts[Math.floor(this.rngPick(w) * scouts.length)];
    const midX = (w.bases[0].x + w.bases[1].x) / 2;
    const midZ = (w.bases[0].z + w.bases[1].z) / 2;
    u.mode = "amove";
    u.dest = { x: midX + (this.rngPick(w) - 0.5) * 40, z: midZ + (this.rngPick(w) - 0.5) * 40 };
  }

  private developBase(w: World): void {
    const base = w.bases[1];
    const eng = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build");
    if (!eng) return;
    const gate = w.baseGate(1);
    const backX = base.x - (w.bases[0].x - base.x) * 0.08;
    const backZ = base.z - (w.bases[0].z - base.z) * 0.08;

    // Phase-aware build priority
    const plans: Array<[BuildableKind, number, number, number]> = [];
    if (this.phase === "bootstrap" || this.count(w, "generator") < 1) {
      plans.push(["generator", base.x - 12, base.z - 10, 140]);
      plans.push(["supply", base.x - 22, base.z - 10, 130]);
    }
    plans.push(
      ["generator", base.x - 12, base.z - 10, 140],
      ["supply", base.x - 22, base.z - 10, 130],
      ["landCommand", base.x - 28, base.z - 2, 100],
      ["barracks", base.x - 16, base.z + 8, 160],
      ["aa", backX + 12, backZ + 10, 160],
      ["combatEngineer", base.x - 18, base.z + 18, 150],
      ["factory", base.x + 16, base.z + 8, 220],
      ["supply", base.x - 30, base.z + 8, 130], // second / forward-ish
      ["airCommand", base.x + 26, base.z - 2, 120],
      ["helipad", base.x + 16, base.z - 12, 200],
      ["bunker", gate.x - (gate.x - base.x) * 0.2, gate.z - (gate.z - base.z) * 0.2, 120],
      ["radar", base.x + 8, base.z + 20, 190],
      ["aa", backX + 18, backZ - 6, 160],
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
      ["bunker", gate.x + 10, gate.z + 8, 120],
    );

    for (const [kind, x, z, cost] of plans) {
      if (this.has(w, 1, kind) && kind !== "bunker" && kind !== "aa" && kind !== "supply" && kind !== "generator") continue;
      if (["bunker", "aa", "supply", "generator"].includes(kind)) {
        const count = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === kind).length;
        const limits: Record<string, number> = {
          bunker: 4,
          aa: this.difficulty === "hard" ? 4 : 3,
          supply: this.phase === "secureLogistics" ? 3 : 2,
          generator: 3,
        };
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
        !e.dead && e.team === 0 && e.def.speed > 0 && Math.hypot(e.x - h.x, e.z - h.z) < 35
      );
      if (!threat) continue;
      // QRF
      const qrf = w.entities.filter(e =>
        !e.dead && e.team === 1 && ["tank", "ifv", "inf", "gunship"].includes(e.kind) && e.loadedIntoId === null
      ).slice(0, 5);
      for (const u of qrf) {
        u.mode = "amove";
        u.dest = { x: h.x, z: h.z };
        u.target = threat;
      }
    }
    // Guard depots that are forward / under-supplied
    for (const depot of w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "supply")) {
      const near = w.entities.filter(e =>
        !e.dead && e.team === 1 && e.def.speed > 0 && Math.hypot(e.x - depot.x, e.z - depot.z) < 30
      ).length;
      if (near >= 2) continue;
      const guard = w.entities.find(e =>
        !e.dead && e.team === 1 && ["inf", "apc", "ifv"].includes(e.kind) && e.mode === "idle"
      );
      if (guard) {
        guard.mode = "move";
        guard.dest = { x: depot.x + 6, z: depot.z + 4 };
        guard.holdPosition = true;
      }
    }
  }

  private expandForward(w: World): void {
    if (this.expansionTimer > 0) return;
    this.expansionTimer = this.difficulty === "hard" ? 14 : 20;
    if (this.phase === "bootstrap") return;
    const engineer = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build");
    if (!engineer) return;
    // Forward depot toward map center / player
    const target = {
      x: (w.bases[0].x + w.bases[1].x) / 2 + (w.bases[1].x - w.bases[0].x) * 0.1,
      z: (w.bases[0].z + w.bases[1].z) / 2 + (w.bases[1].z - w.bases[0].z) * 0.1,
    };
    if (this.count(w, "supply") >= 3) return;
    if (w.teamResources[1] < 130 || !w.canBuildKind(1, "supply")) return;
    w.issue({ type: "build", ids: [engineer.id], kind: "supply", x: target.x, z: target.z, team: 1 });
  }

  private upgradeProducers(w: World): void {
    const candidates = w.entities.filter(e =>
      !e.dead && !e.underConstruction && e.team === 1 &&
      ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(e.kind) &&
      !e.upgrades.has("producer-2") && !e.upgrading
    );
    if (!candidates.length || w.teamResources[1] < 260) return;
    if (!w.canUpgradeProducer(candidates[0])) return;
    w.issue({ type: "upgrade", ids: [candidates[0].id], upgrade: "producer", team: 1 });
  }

  private produceArmy(w: World): void {
    if (!this.has(w, 1, "barracks") && !this.has(w, 1, "factory")) return;

    // Doctrine-shaped composition
    const need: Array<[UnitKind, UnitKind, number]> = [];
    if (this.phase === "bootstrap" || this.phase === "secureLogistics") {
      need.push(["engineer", "barracks", 2], ["inf", "barracks", 4]);
    } else if (this.phase === "probe") {
      need.push(["special", "barracks", 2], ["inf", "barracks", 6], ["tank", "factory", 2]);
    } else {
      need.push(
        ["tank", "factory", this.phase === "decisive" ? 8 : 5],
        ["ifv", "factory", 4],
        ["artillery", "factory", this.difficulty === "hard" ? 3 : 2],
        ["inf", "barracks", 8],
        ["special", "barracks", 3],
        ["gunship", "helipad", 3],
        ["heli", "helipad", 2],
        ["fighter", "airbase", 2],
        ["aa", "factory", 0], // AA is building
      );
    }

    const fac = FACTIONS[w.enemyFaction];
    // Sort need by faction preference so doctrine shapes the army
    const ranked = [...need].sort((a, b) => (fac.bonuses.prefer[b[0]] ?? 1) - (fac.bonuses.prefer[a[0]] ?? 1));
    for (const [kind, producer, limit] of ranked) {
      if (!this.has(w, 1, producer)) continue;
      const pref = fac.bonuses.prefer[kind] ?? 1;
      const adjLimit = Math.round(limit * (this.difficulty === "hard" ? pref : 1));
      if (this.count(w, kind) >= adjLimit) continue;
      this.buy(w, kind, producer);
      if (this.difficulty === "easy") break;
    }

    // Standing doctrine: interdict logistics
    for (const u of w.entities.filter(e => !e.dead && e.team === 1 && e.def.speed > 0 && e.kind !== "engineer")) {
      if (!u.priorityFocus) {
        u.priorityFocus = this.personality === "economic" ? "supply" : (this.rngPick(w) < 0.5 ? "supply" : "generator");
      }
    }
  }

  private defendBase(w: World): void {
    const hq = w.hq[1];
    if (!hq) return;
    const threat = w.entities.find(e =>
      !e.dead && e.team === 0 && e.def.speed > 0 && Math.hypot(e.x - hq.x, e.z - hq.z) < 70
    );
    if (!threat) return;
    const defenders = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.speed > 0 &&
      ["tank", "ifv", "inf", "gunship", "aa"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    for (const u of defenders.slice(0, 10)) {
      u.mode = "amove";
      u.target = threat;
      u.dest = { x: threat.x, z: threat.z };
    }
  }

  private counterAttack(w: World): void {
    if (this.phase === "bootstrap") return;
    const threatened = w.resourcePoints
      .filter(r => r.controlledBy === 0 && r.amount > 0)
      .map(r => ({ r, d: Math.hypot(r.x - w.bases[1].x, r.z - w.bases[1].z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!threatened) return;
    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 &&
      ["tank", "inf", "artillery", "special", "gunship", "ifv"].includes(e.kind) &&
      e.loadedIntoId === null
    );
    if (army.length < 4) return;
    army.filter(e => e.kind !== "artillery").forEach((u, i) => {
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

  private launchAttack(w: World): void {
    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.speed > 0 &&
      !["engineer", "transport"].includes(e.kind) && e.loadedIntoId === null
    );
    const minArmy = this.phase === "decisive" ? 8 : this.phase === "pressure" ? 6 : 5;
    if (army.length < minArmy) return;

    // Prefer logistics targets (Wargame)
    const targets = w.entities
      .filter(e => !e.dead && e.team === 0 && ["supply", "generator", "refinery", "factory", "barracks", "helipad", "airbase", "hq"].includes(e.kind))
      .map(e => ({ e, v: this.attackValue(e.kind) - Math.hypot(e.x - w.bases[1].x, e.z - w.bases[1].z) * 0.05 }))
      .sort((a, b) => b.v - a.v);

    const target = targets[0]?.e ?? w.hq[0];
    if (!target) return;

    // Only commit units that are in supply (don't overextend dry)
    const committed = army.filter(u => isTacticallySupplied(w, u) || this.phase === "decisive");
    const force = committed.length >= minArmy ? committed : army;

    for (const u of force.filter(e => e.kind !== "artillery" && e.def.armor !== "air")) {
      u.mode = "amove";
      u.dest = { x: target.x + (this.rngPick(w) - 0.5) * 16, z: target.z + (this.rngPick(w) - 0.5) * 16 };
      u.target = target.def.speed === 0 ? target : null;
      u.priorityFocus = target.kind === "supply" || target.kind === "generator" ? target.kind as "supply" | "generator" : u.priorityFocus;
    }
    for (const u of force.filter(e => e.kind === "artillery")) {
      u.fireMission = { x: target.x, z: target.z };
      u.mode = "attack";
      u.dest = null;
      u.target = null;
    }
    for (const u of force.filter(e => e.kind === "fighter" || e.kind === "gunship")) {
      assignAirMission(u, u.kind === "fighter" ? "cap" : "strike", { x: target.x, z: target.z });
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

  private rngPick(w: World): number { return w.rng(); }

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

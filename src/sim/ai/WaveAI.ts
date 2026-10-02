import type { World } from "../World";
import type { UnitKind } from "../types";
import type { BuildableKind } from "../buildings";

export type AIPersonality = "aggressive" | "defensive" | "economic";

/** RTS AI: economy -> base tech -> army -> attack. It deliberately uses the same resource economy as the player. */
export class WaveAI {
  buildTimer = 4;
  attackTimer = 22;
  scoutTimer = 5;
  counterAttackTimer = 12;
  expansionTimer = 18;
  personality: AIPersonality = "aggressive";
  difficulty: "easy" | "normal" | "hard" = "normal";

  setProfile(personality: AIPersonality, difficulty: "easy" | "normal" | "hard" = "normal"): void {
    this.personality = personality;
    this.difficulty = difficulty;
    this.attackTimer = difficulty === "hard" ? 16 : difficulty === "easy" ? 30 : 22;
  }

  update(w: World, dt: number): void {
    const hq = w.hq[1];
    if (!hq || hq.dead) return;
    this.buildTimer -= dt;
    this.attackTimer -= dt;
    this.scoutTimer -= dt;
    this.counterAttackTimer -= dt;
    this.expansionTimer -= dt;
    if (this.scoutTimer <= 0) { this.scoutTimer = this.difficulty === "hard" ? 6 : 9; this.scout(w); }
    if (this.buildTimer <= 0) {
      this.buildTimer = this.personality === "economic" ? 7 : 5;
      this.developBase(w);
      if (!w.hasTech(1, "air") && w.teamResources[1] >= 240 && w.teamCredits[1] >= 240 && (w.hasBuilding(1, "helipad") || w.hasBuilding(1, "airbase"))) {
        w.teamResources[1] -= 240;
        w.teamCredits[1] -= Math.min(w.teamCredits[1], 240);
        w.teamTechs[1].add("air");
      }
    }
    this.manageLogistics(w);
    this.expandForward(w);
    this.upgradeProducers(w);
    this.produceArmy(w);
    if (this.counterAttackTimer <= 0) {
      this.counterAttackTimer = this.personality === "aggressive" ? 14 : 22;
      this.counterAttack(w);
    }
    if (this.attackTimer <= 0) {
      this.attackTimer = this.personality === "aggressive" ? 20 : this.personality === "defensive" ? 34 : 26;
      this.launchAttack(w);
    }
  }


  private scout(w: World): void {
    const scouts = w.entities.filter(e => !e.dead && e.team===1 && e.def.speed>0 && ["inf","tank","gunship","fighter"].includes(e.kind));
    if (!scouts.length) return;
    const zones = w.resourcePoints.filter(r => !w.vision.isExplored(1,r.x,r.z));
    const target = zones.length ? zones[Math.floor(w.rng()*zones.length)] : {x:(w.rng()*2-1)*90,z:(w.rng()*2-1)*90};
    const scout = scouts.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z))[0];
    scout.mode = "move"; scout.target=null; scout.dest={x:target.x,z:target.z};
  }

  private developBase(w: World): void {
    const base = w.bases[1];
    const eng = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer");
    if (!eng) return;
    const gate = w.baseGate(1);
    const backX = base.x - (w.bases[0].x - base.x) * 0.08;
    const backZ = base.z - (w.bases[0].z - base.z) * 0.08;
    const plans: Array<[BuildableKind, number, number, number]> = [
      ["generator", base.x - 12, base.z - 10, 140],
      ["supply", base.x - 22, base.z - 10, 130],
      ["landCommand", base.x - 30, base.z - 2, 100],
      ["airCommand", base.x + 28, base.z - 2, 120],
      ["seaCommand", base.x - 30, base.z + 20, 120],
      ["combatEngineer", base.x - 18, base.z + 20, 150],
      ["barracks", base.x - 16, base.z + 8, 160],
      ["factory", base.x + 16, base.z + 8, 220],
      ["helipad", base.x + 16, base.z - 10, 200],
      ["airbase", base.x + 22, base.z + 10, 320],
      ["radar", base.x + 10, base.z + 22, 190],
      ["shipyard", base.x - 28, base.z + 24, 360],
      ["landStrategy", base.x - 2, base.z + 24, 240],
      ["airStrategy", base.x + 22, base.z + 24, 260],
      ["seaStrategy", base.x - 42, base.z + 24, 260],
      ["refinery", w.resourcePoints[w.resourcePoints.length - 1]?.x ?? base.x - 24, w.resourcePoints[w.resourcePoints.length - 1]?.z ?? base.z - 24, 180],
      ["aa", backX + 14, backZ + 12, 160],
      ["bunker", gate.x - (gate.x - base.x) * 0.18, gate.z - (gate.z - base.z) * 0.18, 120],
    ];
    for (const [kind, x, z, cost] of plans) {
      if (this.has(w, 1, kind) || w.teamResources[1] < cost || w.teamCredits[1] < cost) continue;
      if (kind === "refinery" && !w.resourcePoints.some(r => Math.hypot(r.x - x, r.z - z) <= r.radius + 10)) continue;
      w.issue({ type: "build", ids: [eng.id], kind, x, z, team: 1 });
      return;
    }
  }

  private manageLogistics(_w: World): void {
    // Varustushelikopterid on Supply Depotide automaatne logistikasüsteem.
  }

  private expandForward(w: World): void {
    if (this.expansionTimer > 0) return;
    this.expansionTimer = this.personality === "economic" ? 15 : 24;
    const engineer = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer");
    if (!engineer) return;
    const target = w.resourcePoints
      .map(r => ({ r, d: Math.hypot(r.x - engineer.x, r.z - engineer.z), enemy: r.controlledBy === 0 }))
      .filter(v => v.r.amount > 0 && (v.enemy || v.r.controlledBy == null))
      .sort((a,b) => (Number(b.enemy) - Number(a.enemy)) || (a.d-b.d))[0];
    if (!target) return;
    const existing = w.nearestSupplyDepot(1, {x: target.r.x, z: target.r.z}, false);
    if (existing && Math.hypot(existing.x-target.r.x, existing.z-target.r.z) < 34) return;
    const d = Math.hypot(engineer.x-target.r.x, engineer.z-target.r.z);
    if (d > 18) { w.issue({type:"move", ids:[engineer.id], x:target.r.x, z:target.r.z, team:1}); return; }
    if (w.teamCredits[1] >= 130 && w.teamResources[1] >= 130 && w.canBuildKind(1,"supply") && w.canPlaceBuilding(1,"supply",target.r.x,target.r.z)) {
      w.issue({type:"build", ids:[engineer.id], kind:"supply", x:target.r.x, z:target.r.z, team:1});
    }
  }

  private counterAttack(w: World): void {
    const threatened = w.resourcePoints.filter(r => r.controlledBy === 0 && r.amount > 0)
      .map(r => ({r, d: Math.hypot(r.x-w.bases[1].x,r.z-w.bases[1].z)}))
      .sort((a,b)=>a.d-b.d)[0];
    if (!threatened) return;
    const army = w.entities.filter(e => !e.dead && e.team===1 && ["tank","inf","artillery","special","gunship"].includes(e.kind) && e.loadedIntoId===null);
    if (army.length < 4) return;
    const frontline = army.filter(e=>e.kind!=="artillery");
    frontline.forEach((u,i)=>{u.mode="amove";u.dest={x:threatened.r.x+(i%3-1)*8,z:threatened.r.z+(i%2)*6};u.target=null;});
    army.filter(e=>e.kind==="artillery").forEach(u=>{u.fireMission={x:threatened.r.x,z:threatened.r.z};u.mode="attack";u.target=null;});
  }

  private upgradeProducers(w: World): void {
    const candidates = w.entities.filter(e => !e.dead && !e.underConstruction && e.team === 1 && ["barracks","factory","helipad","airbase","shipyard"].includes(e.kind) && w.canUpgradeProducer(e));
    const target = candidates.find(e => e.kind === "barracks" || e.kind === "factory") ?? candidates[0];
    if (!target || w.teamResources[1] < 260 || w.teamCredits[1] < 260) return;
    w.issue({ type: "upgrade", ids: [target.id], upgrade: "producer", team: 1 });
  }

  private produceArmy(w: World): void {
    const factory = this.has(w, 1, "factory");
    const barracks = this.has(w, 1, "barracks");
    const helipad = this.has(w, 1, "helipad");
    const shipyard = this.has(w, 1, "shipyard");
    if (factory) {
      const tanks = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "tank").length;
      const artillery = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "artillery").length;
      if (tanks < (this.difficulty === "hard" ? 7 : 5)) this.buy(w, "tank", "factory");
      else if (artillery < (this.difficulty === "hard" ? 3 : 2)) this.buy(w, "artillery", "factory");
    }
    if (barracks) {
      const inf = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "inf").length;
      if (inf < (this.difficulty === "hard" ? 14 : 9)) this.buy(w, "inf", "barracks");
      else if (!w.entities.some(e => !e.dead && e.team === 1 && e.kind === "engineer")) this.buy(w, "engineer", "barracks");
    }
    if (barracks) {
      const special = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "special").length;
      if (special < 3) this.buy(w, "special", "barracks");
    }
    if (shipyard && w.hasTech(1, "sea-command")) {
      const destroyers = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "destroyer").length;
      const subs = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "submarine").length;
      if (destroyers < (this.difficulty === "hard" ? 2 : 1)) this.buy(w, "destroyer", "shipyard");
      else if (subs < 1) this.buy(w, "submarine", "shipyard");
    }
    if (helipad && w.hasTech(1, "air")) {
      const gunships = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "gunship").length;
      if (gunships < (this.difficulty === "hard" ? 3 : 1)) this.buy(w, "gunship", "helipad");
      const fighters = w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "fighter").length;
      if (fighters < (this.difficulty === "hard" ? 2 : 1)) this.buy(w, "fighter", "airbase");
    }
  }

  private buy(w: World, kind: UnitKind, producer: UnitKind): void {
    const def = w.entities.find(e => !e.dead && !e.underConstruction && e.team === 1 && e.kind === producer);
    if (!def || def.productionQueue.length >= 8) return;
    const costs: Record<string, number> = { tank: 120, artillery: 190, inf: 40, engineer: 90, special: 130, gunship: 240, fighter: 260, destroyer: 320, submarine: 360, landingcraft: 190 };
    const price = costs[kind];
    if (!price || w.teamResources[1] < price || w.teamCredits[1] < price) return;
    if ((kind === "gunship" || kind === "fighter") && !w.hasTech(1, "air")) return;
    if (["destroyer","submarine","landingcraft"].includes(kind) && !w.hasTech(1, "sea-command")) return;
    w.issue({ type: "produce", kind, team: 1 });
  }

  private launchAttack(w: World): void {
    const candidates = w.entities.filter(e => !e.dead && e.team === 0 && !e.underConstruction && e.def.speed === 0 && w.vision.isVisible(1,e.x,e.z));
    const threatenedResource = w.resourcePoints
      .filter(r => r.controlledBy === 0 || (r.controlledBy == null && r.amount > 0))
      .map(r => ({ x:r.x, z:r.z, value: 70 + (r.controlledBy === 0 ? 55 : 0) }))
      .sort((a,b)=>b.value-a.value)[0];
    const visibleTarget = candidates.sort((a, b) => this.attackValue(b.kind) - this.attackValue(a.kind))[0];
    const intel = w.getFreshIntel(1, this.difficulty === "hard" ? 32 : 22)
      .filter(c => c.kind !== "inf" && c.kind !== "engineer")
      .sort((a, b) => this.attackValue(b.kind) - this.attackValue(a.kind))[0];
    const target = visibleTarget ?? threatenedResource ?? (intel ? { x: intel.x, z: intel.z, kind: intel.kind, dead: false } : null) ?? w.hq[0];
    if (!target || ("dead" in target && target.dead)) return;
    const army = w.entities.filter(e => !e.dead && e.team === 1 && ["tank", "inf", "artillery", "gunship", "fighter", "special", "destroyer", "submarine"].includes(e.kind));
    const minimum = this.personality === "aggressive" ? 5 : 8;
    if (army.length < minimum) return;
    const frontline = army.filter(e => e.kind !== "artillery");
    for (const [i,u] of frontline.entries()) {
      const side = (i % 2 === 0 ? -1 : 1) * 18;
      u.mode = "amove"; u.dest = { x: target.x + side, z: target.z + (i % 3 - 1) * 12 }; u.target = visibleTarget ?? null;
    }
    for (const u of army.filter(e => e.kind === "artillery")) {
      u.fireMission = {x:target.x,z:target.z}; u.mode = "attack"; u.dest = null; u.target = visibleTarget ?? null;
    }
    this.useTacticalTransport(w, {x: target.x, z: target.z});
  }

  private attackValue(kind: UnitKind): number {
    const values: Partial<Record<UnitKind, number>> = { refinery: 120, factory: 105, helipad: 95, barracks: 85, aa: 70, bunker: 65, hq: 50 };
    return values[kind] ?? 20;
  }

  private useTacticalTransport(w: World, target: { x: number; z: number }): void {
    const transport = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "transport" && e.cargoUnitIds.length === 0);
    if (!transport) return;
    const infantry = w.entities.filter(e => !e.dead && e.team === 1 && ["inf", "engineer"].includes(e.kind) && e.loadedIntoId === null && Math.hypot(e.x - transport.x, e.z - transport.z) < 35);
    const passenger = infantry[0];
    if (passenger) { transport.transportTargetId = passenger.id; transport.mode = "transport-load"; transport.dest = { x: passenger.x, z: passenger.z }; }
    else if (transport.cargoUnitIds.length) { transport.unloadPoint = { x: target.x - 12, z: target.z - 12 }; transport.mode = "transport-unload"; transport.dest = transport.unloadPoint; }
  }

  private has(w: World, team: 1, kind: UnitKind): boolean {
    return w.entities.some(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind);
  }
}

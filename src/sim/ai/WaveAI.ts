import {knownContacts,availableCombat,fieldCombat,needsRecovery,componentDamage,AI_RULES} from "./knowledge";
import {researchStatus,unitUpgradeStatus} from "../unitStats";
import {MAP_SIZE} from "../heightmap";
import type { World } from "../World";
import type { UnitKind } from "../types";
import { BUILDINGS } from "../buildings";
import type { BuildableKind } from "../buildings";
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
  private pendingBudgetUsed=0;
  private pendingProduction=new Map<number,number>();
  private pendingUnits:Partial<Record<UnitKind,number>>={};
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
    this.pendingBudgetUsed=0;this.pendingProduction.clear();this.pendingUnits={};
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
      this.developUnits(w);
      const airResearch=researchStatus(w,1,"air");
      if (airResearch.allowed&&this.canSpend(w,airResearch.cost)&&
          (w.hasBuilding(1, "helipad") || w.hasBuilding(1, "airbase"))) {
        w.issue({type:"research",tech:"air",team:1});this.pendingBudgetUsed+=airResearch.cost;
      }
    }

    this.protectLogistics(w);
    this.expandForward(w);
    this.produceArmy(w);
    this.upgradeProducers(w);

    if (this.airTimer <= 0) {
      this.airTimer = this.difficulty === "hard" ? 7 : 11;
      this.taskAir(w);this.taskNavy(w);
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
      e.team===1&&fieldCombat(e)
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
        if (enemy.dead || enemy.team !== 0 || !w.isSpottedByTeam(enemy,1) || enemy.loadedIntoId!=null || enemy.def.speed === 0) continue;
        if (Math.hypot(enemy.x - e.x, enemy.z - e.z) < 45) return true;
      }
    }
    return false;
  }

  /** Event-driven reactions (Wargame combined-arms answers). */
  private reactToPlayer(w: World): void {
    const playerAir = w.entities.filter(e =>
      !e.dead && e.team === 0 && w.isSpottedByTeam(e,1) && e.loadedIntoId==null &&
      (e.def.armor === "air" || ["heli", "gunship", "fighter", "bomber"].includes(e.kind))
    ).length;
    const playerTanks = w.entities.filter(e => !e.dead && e.team === 0 && w.isSpottedByTeam(e,1) && e.loadedIntoId==null && e.kind === "tank").length;
    const myAA = this.count(w, "aa");

    // Player massing helis/air → build AA + CAP
    if (playerAir >= 3 && myAA < (this.difficulty === "hard" ? 4 : 2)) {
      this.queueDefense(w, "aa");
    }
    if (playerAir >= 2) {
      for (const f of w.entities.filter(e => !e.dead && e.team === 1 && (e.kind === "fighter" || e.kind === "interceptor"))) {
        if (f.airMission !== "cap"&&availableCombat(f))w.issue({type:"air-mission",ids:[f.id],mission:"cap",...w.bases[1],team:1});
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
    const eng = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build" && e.mode!=="repair" && e.aiIntent!=="recon" && e.loadedIntoId==null);
    if (!eng) return;
    const gate = w.baseGate(1);
    const x = gate.x + (this.rngPick(w) - 0.5) * 20;
    const z = gate.z + (this.rngPick(w) - 0.5) * 20;
    if (!w.canBuildKind(1, kind)||!w.canPlaceBuilding(1,kind,x,z)) return;
    if (!this.canSpend(w,BUILDINGS[kind].cost)) return;
    w.issue({ type: "build", ids: [eng.id], kind, x, z, team: 1 });this.pendingBudgetUsed+=BUILDINGS[kind].cost;
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
    const playerAA = w.entities.filter(e => !e.dead && e.team === 0 && w.isSpottedByTeam(e,1) && e.loadedIntoId==null && e.kind === "aa");

    // CAP over own base
    for (const f of fighters.slice(0, 2)) {
      if(availableCombat(f))w.issue({type:"air-mission",ids:[f.id],mission:"cap",...w.bases[1],team:1});
    }

    // SEAD if player has AA and we have gunships
    if (playerAA.length && gunships.length && this.difficulty !== "easy") {
      const aa = playerAA[0];
      if(availableCombat(gunships[0]))w.issue({type:"air-mission",ids:[gunships[0].id],mission:"sead",x:aa.x,z:aa.z,team:1});
    }

    // Strike logistics in pressure/decisive
    if ((this.phase === "pressure" || this.phase === "decisive") && gunships.length > 1) {
      const contacts=knownContacts(w,1);const t=contacts.find(c=>c.kind==="supply")??contacts.find(c=>c.kind==="generator");
      if(t&&availableCombat(gunships[1]))w.issue({type:"air-mission",ids:[gunships[1].id],mission:"strike",x:t.x,z:t.z,team:1});
    }
  }

  private scout(w: World): void {
    if(w.entities.some(e=>e.team===1&&!e.dead&&e.loadedIntoId==null&&(e.aiIntent==="recon"||["reconInf","reconVehicle","sniper"].includes(e.kind))))return;
    const scouts = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.domain!=="sea" && e.def.speed > 0 &&
      ["reconInf", "reconVehicle", "sniper", "inf"].includes(e.kind) &&
      e.loadedIntoId === null && availableCombat(e)
    );
    if (!scouts.length) return;
    const u = scouts[Math.floor(this.rngPick(w) * scouts.length)];
    const midX = (w.bases[0].x + w.bases[1].x) / 2;
    const midZ = (w.bases[0].z + w.bases[1].z) / 2;
    u.aiIntent="recon";w.issue({type:"amove",ids:[u.id],x:midX+(this.rngPick(w)-.5)*40,z:midZ+(this.rngPick(w)-.5)*40,team:1});
  }

  private developBase(w: World): void {
    const base=w.bases[1];
    const engineers=w.entities.filter(e=>!e.dead&&e.team===1&&e.kind==="engineer"&&e.loadedIntoId==null&&!e.garrisonId);
    for(const e of engineers)if(e.aiIntent==="recon"&&w.resourcePoints.some(r=>r.active&&r.controlledBy===1&&(Math.hypot(r.x-e.x,r.z-e.z)<=r.radius+3||e.dest&&Math.hypot(r.x-e.dest.x,r.z-e.dest.z)<=r.radius)))e.aiIntent=null;
    const point=[...w.resourcePoints].sort((a,b)=>Math.hypot(a.x-base.x,a.z-base.z)-Math.hypot(b.x-base.x,b.z-base.z))[0];
    // One engineer is assigned to restart industry, the other builds the base.
    if(point && (!point.active||point.controlledBy!==1) && (engineers.length>1||this.has(w,1,"supply"))){
      const scout=engineers.find(e=>e.aiIntent==="recon")??engineers[1]??engineers[0];if(scout&&scout.mode!=="build"&&scout.mode!=="repair"){
        w.issue({type:"move",ids:[scout.id],x:point.x,z:point.z,team:1});scout.aiIntent="recon";
      }
    }
    const eng=engineers.find(e=>e.aiIntent!=="recon"&&e.mode!=="build"&&e.mode!=="repair");
    if(!eng)return;
    const count=(kind:UnitKind)=>w.entities.filter(e=>!e.dead&&e.team===1&&e.kind===kind).length;
    const plans:BuildableKind[]=["generator","supply","landCommand","barracks","factory","landStrategy","radar","aa","airCommand","helipad","airStrategy","airbase","combatEngineer","bunker"];
    if(engineers.length<AI_RULES.engineerReserve&&!this.has(w,1,"landStrategy"))plans.unshift("landStrategy");
    if(w.powerStatus(1).ratio<.9&&count("generator")<4)plans.unshift("generator");
    for(const kind of plans){
      const max=kind==="generator"?(w.powerStatus(1).ratio<.9?4:1):kind==="bunker"?2:kind==="aa"?2:1;
      if(kind!=="generator"&&this.has(w,1,"factory")&&this.count(w,"tank")<2&&!["supply","landCommand","barracks","factory"].includes(kind)&&!(kind==="landStrategy"&&engineers.length<AI_RULES.engineerReserve))continue;
      const reserve=["generator","supply","landCommand","barracks"].includes(kind)||kind==="landStrategy"&&engineers.length<AI_RULES.engineerReserve?0:AI_RULES.economyReserve;
      if(count(kind)>=max||!w.canBuildKind(1,kind)||!this.canSpend(w,BUILDINGS[kind].cost,reserve))continue;
      for(const radius of [22,38,54,70])for(let i=0;i<16;i++){
        const angle=i*Math.PI/8;const x=base.x+Math.cos(angle)*radius,z=base.z+Math.sin(angle)*radius;
        if(Math.abs(x)>MAP_SIZE/2-22||Math.abs(z)>MAP_SIZE/2-22||!w.canPlaceBuilding(1,kind,x,z))continue;
        w.issue({type:"build",ids:[eng.id],kind,x,z,team:1});this.pendingBudgetUsed+=BUILDINGS[kind].cost;return;
      }
    }
  }

  private protectLogistics(w: World): void {
    const helis = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.kind === "transport" && e.supplyDepotId != null && e.cargo > 0
    );
    for (const h of helis) {
      const threat = w.entities.find(e =>
        !e.dead && e.team === 0 && w.isSpottedByTeam(e,1) && e.loadedIntoId==null && e.def.speed > 0 && Math.hypot(e.x - h.x, e.z - h.z) < 35
      );
      if (!threat) continue;
      // QRF
      const qrf = w.entities.filter(e =>
        !e.dead && e.team === 1 && ["tank", "ifv", "inf", "gunship"].includes(e.kind) && availableCombat(e)
      ).slice(0, 5);
      for (const u of qrf) {
        if(w.time<(u.aiDecisionAt??0))continue;u.aiDecisionAt=w.time+AI_RULES.decisionInterval;
        u.aiIntent="defend";w.issue(u.def.armor==="air"?{type:"air-mission",ids:[u.id],mission:"ground",x:threat.x,z:threat.z,team:1}:{type:"amove",ids:[u.id],x:threat.x,z:threat.z,team:1});
      }
    }
    // Guard depots that are forward / under-supplied
    for (const depot of w.entities.filter(e => !e.dead && e.team === 1 && e.kind === "supply")) {
      const near = w.entities.filter(e =>
        !e.dead && e.team === 1 && e.def.domain!=="sea" && e.def.speed > 0 && Math.hypot(e.x - depot.x, e.z - depot.z) < 30
      ).length;
      if (near >= 2) continue;
      const guard = w.entities.find(e =>
        !e.dead && e.team === 1 && ["inf", "apc", "ifv"].includes(e.kind) && e.mode === "idle" && availableCombat(e)
      );
      if (guard) {
        guard.aiIntent="defend";const a=Math.atan2(guard.x-depot.x,guard.z-depot.z),r=depot.def.radius+guard.def.radius+6;w.issue({type:"move",ids:[guard.id],x:depot.x+Math.sin(a)*r,z:depot.z+Math.cos(a)*r,team:1});
      }
    }
  }

  private expandForward(w: World): void {
    if(!this.has(w,1,"factory")||this.count(w,"tank")<2)return;
    if (this.expansionTimer > 0) return;
    this.expansionTimer = this.difficulty === "hard" ? 14 : 20;
    if (this.phase === "bootstrap") return;
    const engineer = w.entities.find(e => !e.dead && e.team === 1 && e.kind === "engineer" && e.mode !== "build" && e.mode!=="repair" && e.aiIntent!=="recon" && e.loadedIntoId==null);
    if (!engineer) return;
    // Forward depot toward map center / player
    const objective = {
      x: (w.bases[0].x + w.bases[1].x) / 2 + (w.bases[1].x - w.bases[0].x) * 0.1,
      z: (w.bases[0].z + w.bases[1].z) / 2 + (w.bases[1].z - w.bases[0].z) * 0.1,
    };
    const anchor=w.connectedSupplyNodes(1).filter(e=>!e.dead&&!e.underConstruction&&w.productionOperational(e).operational).sort((a,b)=>Math.hypot(a.x-objective.x,a.z-objective.z)-Math.hypot(b.x-objective.x,b.z-objective.z)||a.id-b.id)[0];
    if(!anchor)return;
    const distance=Math.hypot(objective.x-anchor.x,objective.z-anchor.z)||1,step=Math.min(distance,AI_RULES.forwardDepotStep);
    const target={x:anchor.x+(objective.x-anchor.x)/distance*step,z:anchor.z+(objective.z-anchor.z)/distance*step};
    if (this.count(w, "supply") >= 3) return;
    if (!this.canSpend(w,BUILDINGS.supply.cost) || !w.canBuildKind(1, "supply")) return;
    for(const radius of [0,16,32,48])for(let i=0;i<(radius?16:1);i++){
      const a=i*Math.PI/8,x=target.x+Math.sin(a)*radius,z=target.z+Math.cos(a)*radius;
      if(!w.canPlaceBuilding(1,"supply",x,z)||!w.hasCommandLinkToPoint(1,{x,z})||!w.logisticsConnectionOpen(anchor,{...anchor,x,z}))continue;
      w.issue({type:"build",ids:[engineer.id],kind:"supply",x,z,team:1});this.pendingBudgetUsed+=BUILDINGS.supply.cost;return;
    }
  }

  private developUnits(w:World):void {
    // Small reserve-only retrofit budget; purchases use the player's command rules.
    if(w.teamResources[1]<1000||w.teamCredits[1]<1000)return;
    const research=researchStatus(w,1,"advanced-armor");
    if(research.allowed&&this.canSpend(w,research.cost)){w.issue({type:"research",tech:"advanced-armor",team:1});this.pendingBudgetUsed+=research.cost;return;}
    for(const u of w.entities.filter(e=>!e.dead&&e.team===1&&e.def.category==="armor")){
      for(const upgrade of ["armor","weapon","range"] as const){const status=unitUpgradeStatus(w,u,upgrade);if(status.allowed&&this.canSpend(w,status.cost)){w.issue({type:"upgrade",ids:[u.id],upgrade,team:1});this.pendingBudgetUsed+=status.cost;return;}}
    }
  }

  private upgradeProducers(w: World): void {
    const recovery=this.count(w,"engineer")<AI_RULES.engineerReserve;
    const candidates = w.entities.filter(e =>
      !e.dead && !e.underConstruction && e.team === 1 &&
      ["barracks", "factory", "helipad", "airbase", "shipyard"].includes(e.kind) &&
      w.producerLevel(e)<3 && !e.upgrading
    );
    const emergency=recovery&&this.has(w,1,"landStrategy")?candidates.find(e=>e.kind==="barracks"&&w.producerLevel(e)<w.unitRequiredBuildingLevel("engineer")):undefined;
    if(!emergency&&this.has(w,1,"factory")&&this.count(w,"tank")<2)return;
    const target=emergency??candidates[0];if(!target)return;
    const cost=w.producerUpgradeCost(w.producerLevel(target));
    if(!this.canSpend(w,cost,emergency?0:AI_RULES.economyReserve)||!w.canUpgradeProducer(target))return;
    w.issue({type:"upgrade",ids:[target.id],upgrade:"producer",team:1});this.pendingBudgetUsed+=cost;
  }

  private taskNavy(w:World):void {
    const ports=w.entities.filter(e=>!e.dead&&!e.underConstruction&&e.team===1&&e.kind==="shipyard"),ships=w.entities.filter(e=>!e.dead&&e.team===1&&e.def.domain==="sea"&&e.kind!=="landingcraft");
    const port=ports[0];if(!port)return;
    if(ships.length<4&&port.productionQueue.length<2)this.buy(w,"missileBoat","shipyard");
    for(const ship of ships){
      const recovering=componentDamage(ship)>AI_RULES.retreatComponentDamage||ship.hp<ship.def.hp*.5||(ship.fuel??0)<(ship.maxFuel??1)*.2||(ship.def.weapons??[]).every((spec,i)=>(i===0?(ship.ammo??0):(ship.secondaryAmmo?.[i]??0))<spec.ammoUsePerShot);
      if(recovering){const p=w.waterNav.nearestWater(port,ship.def.radius,64);if(p)w.issue({type:"move",ids:[ship.id],x:p.x,z:p.z,team:1});continue;}
      const target=w.entities.find(e=>!e.dead&&e.team===0&&e.def.domain==="sea"&&w.isSpottedByTeam(e,1));
      if(target){w.issue({type:"attack",ids:[ship.id],targetId:target.id,team:1});continue;}
      if(ship.mode==="idle"){const p=w.waterNav.nearestWater({x:ship.x,z:0},ship.def.radius,120);if(p)w.issue({type:"amove",ids:[ship.id],x:p.x,z:p.z,team:1});}
    }
  }
  private produceArmy(w: World): void {
    if (!this.has(w, 1, "barracks") && !this.has(w, 1, "factory")) return;
    if(this.count(w,"engineer")<AI_RULES.engineerReserve&&this.buy(w,"engineer","barracks",0))return;

    // Doctrine-shaped composition
    const need: Array<[UnitKind, UnitKind, number]> = [];
    if (this.phase === "bootstrap" || this.phase === "secureLogistics") {
      need.push(["engineer", "barracks", 2], ["inf", "barracks", 4]);
    } else if (this.phase === "probe") {
      need.push(["reconInf", "barracks", 2], ["inf", "barracks", 6], ["tank", "factory", 2]);
    } else {
      need.push(
        ["tank", "factory", this.phase === "decisive" ? 8 : 5],
        ["lightTank", "factory", 2],
        ["tankDestroyer", "factory", 3],
        ["reconVehicle", "factory", 2],
        ["spaa", "factory", 2],
        ["ifv", "factory", 4],
        ["artillery", "factory", this.difficulty === "hard" ? 3 : 2],
        ["inf", "barracks", 8],
        ["atInf", "barracks", 4],
        ["mgInf", "barracks", 3],
        ["reconInf", "barracks", 2],
        ["mortar", "barracks", 2],
        ["manpad", "barracks", 2],
        ["atgm", "barracks", 2],
        ["special", "barracks", 3],
        ["gunship", "helipad", 3],
        ["casHeli", "helipad", 2],
        ["heli", "helipad", 2],
        ["fighter", "airbase", 2],
        ["multirole", "airbase", 2],
        ["ecm", "airbase", 1],
        ["aa", "factory", 0], // AA is building
      );
    }

    if(this.has(w,1,"factory")&&this.count(w,"tank")<2){this.buy(w,"tank","factory");return;}
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
    for (const u of w.entities.filter(e => !e.dead && e.team === 1 && e.def.domain!=="sea" && e.def.speed > 0 && e.kind !== "engineer")) {
      if (!u.priorityFocus) {
        u.priorityFocus = this.personality === "economic" ? "supply" : (this.rngPick(w) < 0.5 ? "supply" : "generator");
      }
    }
  }

  private defendBase(w: World): void {
    const hq = w.hq[1];
    if (!hq) return;
    const threat = w.entities.find(e =>
      !e.dead && e.team === 0 && w.isSpottedByTeam(e,1) && e.loadedIntoId==null && e.def.speed > 0 && Math.hypot(e.x - hq.x, e.z - hq.z) < 70
    );
    if (!threat) return;
    const defenders = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.domain!=="sea" && e.def.speed > 0 &&
      ["tank", "lightTank", "tankDestroyer", "ifv", "inf", "atInf", "atgm", "gunship", "casHeli", "spaa"].includes(e.kind) &&
      e.loadedIntoId === null && availableCombat(e)
    );
    for (const u of defenders.slice(0, 10)) {
      u.aiIntent="defend";w.issue(u.def.armor==="air"?{type:"air-mission",ids:[u.id],mission:"ground",x:threat.x,z:threat.z,team:1}:{type:"amove",ids:[u.id],x:threat.x,z:threat.z,team:1});
    }
  }

  private counterAttack(w: World): void {
    if (this.phase === "bootstrap") return;
    const threatened = w.resourcePoints
      .filter(r => w.vision.isVisible(1,r.x,r.z) && r.controlledBy === 0 && r.amount > 0)
      .map(r => ({ r, d: Math.hypot(r.x - w.bases[1].x, r.z - w.bases[1].z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!threatened) return;
    const candidates=w.entities.filter(e=>e.team===1&&availableCombat(e)&&!needsRecovery(e)&&["tank","inf","artillery","special","ifv"].includes(e.kind));
    const army=candidates.slice(Math.max(1,Math.floor(candidates.length*AI_RULES.reserveRatio)));
    if (army.length < 4) return;
    army.filter(e => e.kind !== "artillery").forEach((u, i) => {
      u.aiIntent='attack';w.issue({type:'amove',ids:[u.id],x:threatened.r.x+(i%3-1)*8,z:threatened.r.z+(i%2)*6,team:1});
    });
    army.filter(e=>e.kind==='artillery').forEach(u=>w.issue({type:'fire-mission',ids:[u.id],x:threatened.r.x,z:threatened.r.z,team:1}));
  }

  private launchAttack(w: World): void {
    const army = w.entities.filter(e =>
      !e.dead && e.team === 1 && e.def.domain!=="sea" && e.def.speed > 0 &&
      !["engineer", "transport"].includes(e.kind) && e.loadedIntoId === null && availableCombat(e) && !needsRecovery(e)
    );
    const minArmy = this.phase === "decisive" ? 8 : this.phase === "pressure" ? 6 : 5;
    if (army.length < minArmy) return;

    // Prefer logistics targets (Wargame)
    const targets=knownContacts(w,1).filter(c=>['supply','generator','refinery','factory','barracks','helipad','airbase','hq'].includes(c.kind)).sort((a,b)=>this.attackValue(b.kind)-this.attackValue(a.kind));
    const target=targets[0]??{...w.bases[0],kind:'hq' as const};
    // Only commit units that are in supply (don't overextend dry)
    const committed=army.filter(u=>(u.supply??100)>=AI_RULES.recoveredSupply);
    const reserve=Math.max(1,Math.floor(committed.length*AI_RULES.reserveRatio));
    const force=committed.slice(reserve);if(force.length<minArmy)return;

    for (const u of force.filter(e => !["artillery","mortar","mlrs"].includes(e.kind) && e.def.armor !== "air")) {
      u.aiIntent='attack';w.issue({type:'amove',ids:[u.id],x:target.x+(this.rngPick(w)-.5)*16,z:target.z+(this.rngPick(w)-.5)*16,team:1});
    }
    const fresh=knownContacts(w,1).some(c=>c.x===target.x&&c.z===target.z);
    for(const u of force.filter(e=>['artillery','mortar','mlrs'].includes(e.kind)))if(fresh)w.issue({type:'fire-mission',ids:[u.id],x:target.x,z:target.z,team:1});
    for(const u of force.filter(e=>e.kind==='fighter'||e.kind==='gunship'))w.issue({type:'air-mission',ids:[u.id],mission:u.kind==='fighter'?'cap':'strike',x:target.x,z:target.z,team:1});
    this.useTacticalTransport(w, { x: target.x, z: target.z });
  }

  private attackValue(kind: UnitKind | string): number {
    return (AI_RULES.raidValues as Record<string,number>)[kind]??20;
  }

  private useTacticalTransport(w:World,target:{x:number;z:number}):void {
    const transport=w.entities.find(e=>!e.dead&&e.team===1&&e.kind==='transport'&&e.supplyDepotId==null&&e.mode!=='transport-load'&&e.mode!=='transport-unload');
    if(!transport)return;
    if(transport.cargoUnitIds.length){w.issue({type:'unload',ids:[transport.id],x:target.x-14,z:target.z-10,team:1});return;}
    const passenger=w.entities.find(e=>e.team===1&&availableCombat(e)&&['inf','special'].includes(e.kind)&&Math.hypot(e.x-transport.x,e.z-transport.z)<40);
    if(passenger)w.issue({type:'load',ids:[transport.id],targetId:passenger.id,team:1});
  }

  private rngPick(w: World): number { return w.rng(); }

  /** Pending commands share one budget until the next simulation command pass. */
  private canSpend(w:World,cost:number,reserve=AI_RULES.economyReserve):boolean {
    return Math.min(w.teamCredits[1],w.teamResources[1])-this.pendingBudgetUsed-cost>=reserve;
  }
  private buy(w: World, kind: UnitKind, producer: UnitKind, reserve=AI_RULES.economyReserve): boolean {
    const def = w.entities.filter(e =>
      !e.dead && !e.underConstruction && e.team === 1 && e.kind === producer &&
      e.productionQueue.length+(this.pendingProduction.get(e.id)??0)<AI_RULES.productionQueueTarget&&w.canProduceAtLevel(e,kind)&&w.productionOperational(e,kind).operational
    ).sort((a,b)=>a.productionQueue.length-b.productionQueue.length||a.id-b.id)[0];
    const cost=w.unitDefinition(kind,1).cost;
    if (!def||!this.canSpend(w,cost,reserve))return false;
    w.issue({type:"produce",kind,producerId:def.id,team:1});this.pendingBudgetUsed+=cost;
    this.pendingProduction.set(def.id,(this.pendingProduction.get(def.id)??0)+1);this.pendingUnits[kind]=(this.pendingUnits[kind]??0)+1;return true;
  }

  private count(w: World, kind: UnitKind): number {
    return (this.pendingUnits[kind]??0)+w.entities.filter(e => !e.dead && e.team === 1 && e.kind === kind).length + w.entities.filter(e=>!e.dead&&e.team===1).reduce((n,e)=>n+e.productionQueue.filter(k=>k===kind).length,0);
  }

  private has(w: World, team: 1, kind: UnitKind): boolean {
    return w.entities.some(e => !e.dead && !e.underConstruction && e.team === team && e.kind === kind);
  }
}

import {orderGarrison,leaveGarrison,requestGarrisonExit} from "../garrison";
import {queuePassenger,transportCapacity,isPassenger} from "../transport";
import {travelPathCost} from "../unitStats";
import {UNIT_UPGRADES,maxHitPoints,researchStatus,unitUpgradeStatus} from "../unitStats";
import type { World } from "../World";
import { assignAirMission,airUnitsForOrder,requestAirReturn } from "./airDoctrine";
import { deckRemaining } from "../deck";
import type { Command, Entity, Point } from "../types";
import { MAX_QUEUE } from "../constants";
import { findPath } from "../nav/Pathfinder";
import mobility from "../../data/mobility.json";
import { BUILDINGS, isBuildable } from "../buildings";
import {canEngage} from "./combat";

function mobile(w: World, ids: number[], team?: Entity["team"]): Entity[] {
  const out: Entity[] = [];
  for (const id of ids) {
    const e = w.byId.get(id);
    if (e && !e.dead && e.def.speed > 0 && e.loadedIntoId==null && (team === undefined || e.team === team)) out.push(e);
  }
  return out;
}

/** Replace a task without cancelling rounds already in flight or weapon reloads. */
function replaceTask(w:World,u:Entity):void {
  for(const b of w.entities)if(b.builderIds.includes(u.id))b.builderIds=b.builderIds.filter(id=>id!==u.id);
  u.combatWithdrawing=false;
  u.flightAttackExit=undefined;u.flightAttackExitUntil=undefined;
  u.fireMission=null;u.artilleryDisplace=null;u.artilleryShotsInSalvo=0;
  u.transportQueue=[];u.transportTargetId=null;u.transportPickupPoint=undefined;u.unloadPoint=null;
  u.garrisonOrderId=undefined;u.garrisonEntryPoint=undefined;
  u.combatPosition=undefined;u.combatPositionTarget=undefined;u.combatPositionAnchor=undefined;u.combatPositionRetryAt=undefined;
  u.moveQueue=[];u.moveQueueStyles=[];u.moveGroup=undefined;u.fastMove=false;u.patrolPoints=[];
  u.navPath=[];u.navPathIndex=0;u.roadPathGoal=undefined;u.roadPathRetryAt=undefined;u.taskApproachIndex=0;u.flowField=null;u.avoidanceSide=undefined;u.avoidanceUntil=undefined;u.navWaiting=false;
}

/** Formation layouts: box (default), line, wedge, column. */
export type FormationKind = "box" | "line" | "wedge" | "column";

function formation(n: number, x: number, z: number, kind: FormationKind = "box", spacing=6): Point[] {
  if (n <= 1) return [{ x, z }];
  const sp = spacing;
  const out: Point[] = [];
  if (kind === "line") {
    for (let i = 0; i < n; i++) out.push({ x: x + (i - (n - 1) / 2) * sp, z });
  } else if (kind === "column") {
    for (let i = 0; i < n; i++) out.push({ x, z: z + (i - (n - 1) / 2) * sp * 0.85 });
  } else if (kind === "wedge") {
    let row = 0, placed = 0;
    while (placed < n) {
      const inRow = row + 1;
      for (let c = 0; c < inRow && placed < n; c++, placed++) {
        out.push({ x: x + (c - (inRow - 1) / 2) * sp, z: z + row * sp * 0.8 });
      }
      row++;
    }
  } else {
    const cols = Math.ceil(Math.sqrt(n * 1.15));
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const stagger = (row % 2) * (sp * 0.35);
      out.push({ x: x + (col - (cols - 1) / 2) * sp + stagger, z: z + (row - (rowsSafe(cols, n) - 1) / 2) * sp * 0.9 });
    }
  }
  return out;
}
function rowsSafe(cols: number, n: number): number { return Math.ceil(n / cols); }

export function applyCommands(w: World): void {
  const cmds = w.pending;
  w.pending = [];
  for (const c of cmds) apply(w, c);
}

function apply(w: World, c: Command): void {
  switch (c.type) {
    case "face-building": {for(const u of mobile(w,c.ids,c.team))if(u.garrisonId){u.garrisonLookPoint={x:c.x,z:c.z};u.garrisonShiftAt=w.time;u.target=null;}break;}
    case "enter-building": {
      const f=w.mapFeatures.find(f=>f.id===c.featureId);if(f)for(const u of mobile(w,c.ids,c.team))if(isPassenger(u)&&!orderGarrison(w,u,f))w.events.push({type:"order-rejected",team:u.team,unitId:u.id,x:f.x,z:f.z,message:"Majja ei saa siseneda: koht puudub, hoone on vaenlase käes või tee on suletud"});break;
    }
    case "leave-building": {
      for(const u of mobile(w,c.ids,c.team))requestGarrisonExit(w,u,c.x!=null&&c.z!=null?{x:c.x,z:c.z}:undefined);break;
    }
    case "formation": {w.teamFormations[c.team??w.playerTeam]=c.kind;break;}
    case "fast-move":
    case "move":
    case "amove": {
      const us = mobile(w,c.ids,c.team);
      const center=us.reduce((p,u)=>({x:p.x+u.x/Math.max(1,us.length),z:p.z+u.z/Math.max(1,us.length)}),{x:0,z:0});
      const angle=Math.atan2(c.x-center.x,c.z-center.z),cos=Math.cos(angle),sin=Math.sin(angle);
      const pts=formation(us.length,c.x,c.z,w.teamFormations[c.team??w.playerTeam],Math.max(6.5,...us.map(u=>u.def.radius*2+2))).map(p=>({x:c.x+(p.x-c.x)*cos+(p.z-c.z)*sin,z:c.z-(p.x-c.x)*sin+(p.z-c.z)*cos}));
      const lateral=(p:Point)=>p.x*cos-p.z*sin;
      us.sort((a,b)=>lateral(a)-lateral(b)||a.id-b.id);pts.sort((a,b)=>lateral(a)-lateral(b));
      const assigned: Array<Point & {radius:number}>=[];
      const append = !!c.append;
      const marchGroup=us.filter(e=>e.def.domain!=="air"&&e.def.domain!=="sea").sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z)||a.id-b.id).map(e=>e.id);
      us.forEach((u, i) => {
        let point=pts[i];
        if(u.def.domain!=="air"&&u.def.domain!=="sea"){
          const acceptable=(p:Point)=>w.nav.isWalkableWorld(p.x,p.z,u.def.radius)&&assigned.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>=q.radius+u.def.radius+.5);
          if(!acceptable(point)){
            let found=false;
            for(let radius=2;radius<=mobility.navigation.destinationSearch&&!found;radius+=2)for(let j=0;j<16;j++){
              const a=j*Math.PI/8,p={x:point.x+Math.sin(a)*radius,z:point.z+Math.cos(a)*radius};
              if(acceptable(p)){point=p;found=true;break;}
            }
            if(!found){w.events.push({type:"order-rejected",team:u.team,unitId:u.id,x:point.x,z:point.z,message:"Sihtpunktis pole üksusele läbitavat ruumi"});return;}
          }
          assigned.push({...point,radius:u.def.radius});
        }
        const pathFrom=append?(u.moveQueue?.[u.moveQueue.length-1]??u.dest??u):u;
        if(u.def.domain==="sea"){
          const wet=w.waterNav.nearestWater(point,u.def.radius,18);
          if(!wet){w.events.push({type:"order-rejected",team:u.team,unitId:u.id,x:point.x,z:point.z,message:"Laev saab liikuda ainult läbitaval veel"});return;}point=wet;
        }
        const path=u.def.domain==="air"?[]:findPath(u.def.domain==="sea"?w.waterNav:w.nav,pathFrom,point,u.def.radius,c.type==="fast-move"&&u.def.domain!=="sea"?travelPathCost(w,u):undefined);
        if(u.def.domain!=="air"&&!path.length){w.events.push({type:"order-rejected",team:u.team,unitId:u.id,x:point.x,z:point.z,message:"Sihtpunktini pole läbitavat teed; kontrolli silda või vali teine kaldapool"});return;}
        if(u.garrisonId&&!leaveGarrison(w,u)){requestGarrisonExit(w,u,point);return;}u.garrisonOrderId=undefined;
        if (append && u.dest && ["move","amove","patrol"].includes(u.mode)) {
          u.moveQueue??=[];u.moveQueue.push({...point});u.moveQueueStyles??=[];u.moveQueueStyles.push(c.type);
        } else {
          replaceTask(w,u);
          u.mode = c.type === "amove" ? "amove" : "move";
          u.fastMove=c.type==="fast-move";u.moveAxis={x:sin,z:cos};u.moveGroup=marchGroup;
          u.dest = point;u.moveQueue=[];u.moveQueueStyles=[];u.queuedMoveType=u.mode;u.transportQueue=[];
          u.patrolPoints = [];
          u.patrolIndex = 0;
          u.holdPosition = false;
          u.navPath = path;
          u.roadPathGoal = {...point};
          u.navPathIndex = 0;
          u.flowField = null;
          u.stuckTime = 0; u.stuckX = u.x; u.stuckZ = u.z;
          if (c.type !== "amove") u.target = null;
        }
      });
      break;
    }
    case "attack": {
      const t = w.byId.get(c.targetId);
      if (!t || t.dead || !w.isSpottedByTeam(t,c.team??w.playerTeam)) break;
      for (const u of mobile(w, c.ids, c.team)) if (u.team !== t.team) {
        if(!canEngage(u,t)){w.events.push({type:"order-rejected",team:u.team,unitId:u.id,x:t.x,z:t.z,message:`${w.unitDisplayName(u.kind,u.team)}: sihtmärgi jaoks puudub sobiv relv või laskemoon`});continue;}
        replaceTask(w,u);u.garrisonLookPoint=undefined;u.mode = "attack"; u.holdPosition=!!u.garrisonId; u.target = t; u.dest = {x:t.x,z:t.z};
      }
      break;
    }
    case "stop":
      for (const u of mobile(w, c.ids, c.team)) {
        replaceTask(w,u);
        u.mode = "idle"; u.dest = null; u.target = null; u.holdPosition = true;
      }
      break;
    case "rally": {
      for (const b of w.entities) {
        if (b.dead || b.underConstruction || b.team !== (c.team ?? w.playerTeam)) continue;
        if (!b.productionQueue.length && !["barracks", "factory", "helipad", "airbase"].includes(b.kind)) continue;
        if (!c.ids.includes(b.id)) continue;
        b.rallyPoint = { x: c.x, z: c.z };
      }
      break;
    }
    case "repair": {
      const target = w.byId.get(c.targetId);
      if (!target || target.dead || target.team !== (c.team ?? w.playerTeam) || (target.hp >= maxHitPoints(target) && !Object.values(target.components ?? {}).some(v => v > 0))) break;
      const engineers = mobile(w, c.ids, c.team).filter(u => u.kind === "engineer" && (!u.garrisonId || leaveGarrison(w,u)));
      if (!engineers.length) break;
      for (const u of engineers.slice(0, 2)) { replaceTask(w,u);u.mode = "repair"; u.target = target; u.dest = { x: target.x, z: target.z }; }
      target.builderIds = engineers.slice(0, 2).map(u => u.id);
      break;
    }
    case "hold":
      for (const u of mobile(w, c.ids, c.team)) { replaceTask(w,u);u.mode = "hold"; u.dest = null; u.target = null; u.holdPosition = true; }
      break;
    case "patrol": {
      const us = mobile(w, c.ids, c.team);
      for (const u of us) { if(u.garrisonId&&!leaveGarrison(w,u)){requestGarrisonExit(w,u,{x:c.x,z:c.z});continue;}replaceTask(w,u);u.holdPosition=false;u.mode = "patrol"; u.patrolPoints = [{x:c.x,z:c.z},{x:u.x,z:u.z}]; u.patrolIndex = 0; u.dest = u.patrolPoints[0]; u.target = null; }
      break;
    }
    case "build": {
      const team = c.team ?? w.playerTeam;
      // Prefer selected engineers; fall back to nearest friendly engineer
      let builders = mobile(w, c.ids, team).filter(u => u.kind === "engineer" && (!u.garrisonId || leaveGarrison(w,u)));
      if (!builders.length) {
        const nearest = w.entities
          .filter(e => !e.dead && e.team === team && e.kind === "engineer" && e.loadedIntoId === null && !e.garrisonId)
          .sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
        if (nearest) builders = [nearest];
      }
      const builder = builders[0];
      if (!builder || !isBuildable(c.kind)) break;
      const spec = BUILDINGS[c.kind];
      const walletCredits = w.teamCredits[team], walletResources = w.teamResources[team];
      if (walletResources < spec.cost || walletCredits < spec.cost) break;
      if (!w.canBuildKind(team, c.kind)) break;
      // No range gate – foundation is placed and engineer walks to it (Real War style)
      if (!w.canPlaceBuilding(team, c.kind, c.x, c.z)) break;
      w.teamCredits[team] -= spec.cost; w.teamResources[team] -= spec.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      const b = w.spawn(c.kind, team, c.x, c.z);
      b.underConstruction = true;
      b.constructionProgress = 0;
      b.hp = Math.max(1, maxHitPoints(b) * 0.15);
      b.constructionTime = spec.buildTime;
      b.heading = c.rotation ?? b.heading;
      b.pHeading = b.heading;
      for (const eng of builders.slice(0, spec.maxBuilders)) {
        replaceTask(w,eng);
        eng.mode = "build";
        eng.target = b;
        eng.dest = { x: c.x, z: c.z };
        eng.navPath = [];
        eng.navPathIndex = 0;
      }
      b.builderIds = builders.slice(0, spec.maxBuilders).map(u => u.id);
      break;
    }
    case "research": {
      const team=c.team??w.playerTeam,status=researchStatus(w,team,c.tech);
      if(!status.allowed)break;
      w.teamCredits[team]-=status.cost;w.teamResources[team]-=status.cost;w.teamTechs[team].add(c.tech);
      if(team===w.playerTeam){w.credits=w.teamCredits[team];w.resources=w.teamResources[team];}
      break;
    }
    case "upgrade": {
      const team = c.team ?? w.playerTeam;
      if (c.upgrade === "producer") {
        // Phase 70: the same upgrade command now applies to every strategic building.
        const target = c.ids.map(id => w.byId.get(id)).find((e): e is Entity =>
          !!e && !e.dead && e.team === team && w.canUpgradeProducer(e));
        const currentLevel = target ? w.producerLevel(target) : 3;
        const nextLevel = currentLevel + 1;
        const cost = target ? w.producerUpgradeCost(currentLevel) : 9999;
        if (!target || nextLevel > 3 || w.teamResources[team] < cost || w.teamCredits[team] < cost) break;
        if (target.upgrading) break;
        w.teamResources[team] -= cost; w.teamCredits[team] -= cost;
        target.upgrading = true;
        target.upgradeProgress = 0;
        target.upgradeTime = w.buildingUpgradeTime(currentLevel);
        target.upgradeKind = "producer";
        target.underConstruction = true;
        target.constructionProgress = 0;
        target.constructionTime = target.upgradeTime;
        if (team === w.playerTeam) { w.resources = w.teamResources[team]; w.credits = w.teamCredits[team]; }
        break;
      }
      if (c.upgrade === "supply-depot") {
        for (const u of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) w.upgradeSupplyDepot(team, u.id);
        break;
      }
      if (c.upgrade === "fob") {
        for (const u of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) w.upgradeFOB(team, u.id);
        break;
      }
      for(const u of mobile(w,c.ids,team)){
        const status=unitUpgradeStatus(w,u,c.upgrade);if(!status.allowed)continue;
        const before=maxHitPoints(u);u.upgrades.add(c.upgrade);
        // Preserve health fraction: retrofitting is not a free repair.
        if(c.upgrade==="armor")u.hp=u.hp/before*maxHitPoints(u);
        w.teamCredits[team]-=status.cost;w.teamResources[team]-=status.cost;
        const depot=w.byId.get(status.depotId!);if(depot)depot.repairStock=Math.max(0,(depot.repairStock??0)-UNIT_UPGRADES[c.upgrade].repairCost);
      }
      w.credits = w.teamCredits[w.playerTeam]; w.resources = w.teamResources[w.playerTeam];
      break;
    }
    case "load": {
      const selected=mobile(w,c.ids,c.team),target=w.byId.get(c.targetId);
      if(!target)break;
      if(target.garrisonId&&!leaveGarrison(w,target))break;
      for(const u of selected)if(u.garrisonId)leaveGarrison(w,u);
      // Preserve the existing landing-craft orders until water navigation is completed in B1.
      const boat=selected.find(u=>u.kind==="landingcraft");
      if(boat&&target.team===boat.team&&!target.dead&&target.loadedIntoId==null&&["inf","engineer"].includes(target.kind)&&boat.cargoUnitIds.length<8){boat.transportTargetId=target.id;boat.mode="transport-load";boat.dest={x:target.x,z:target.z};break;}
      if(transportCapacity(target)&&target.team===(c.team??w.playerTeam)){
        for(const p of selected)queuePassenger(w,target,p);
      }else for(const u of selected)if(queuePassenger(w,u,target))break;
      break;
    }
    case "fire-mission": {
      const artillery = mobile(w, c.ids, c.team).filter(u => ["artillery","mortar","mlrs"].includes(u.kind)&&!u.garrisonId);
      for (const u of artillery) { replaceTask(w,u);u.fireMission = {x:c.x,z:c.z}; u.mode = "attack"; u.target = null; u.dest = null; }
      break;
    }
    case "standing": {
      if(c.mode==="patrol"&&(c.x===undefined||c.z===undefined))break;
      for (const u of mobile(w, c.ids, c.team)) {
        replaceTask(w,u);
        u.standingOrder = c.mode;
        if (c.mode === "hold") { u.mode = "hold"; u.holdPosition = true; u.dest = null; u.target = null; }
        else if (c.mode === "holdfire") { u.mode = "hold"; u.holdPosition = true; u.dest = null; u.target = null; }
        else if (c.mode === "patrol" && c.x !== undefined && c.z !== undefined) { if(u.garrisonId&&!leaveGarrison(w,u)){requestGarrisonExit(w,u,{x:c.x,z:c.z});continue;}u.holdPosition=false;u.mode = "patrol"; u.patrolPoints = [{x:c.x,z:c.z},{x:u.x,z:u.z}]; u.patrolIndex = 0; u.dest = u.patrolPoints[0]; }
        else if (c.mode === "attack") { u.holdPosition=false; u.mode = "amove"; u.dest = c.x !== undefined && c.z !== undefined ? {x:c.x,z:c.z} : null; }
      }
      break;
    }
    case "predeploy": {
      for (const b of w.entities.filter(e => !e.dead && e.team === (c.team ?? w.playerTeam) && ["barracks","factory","helipad","airbase","shipyard"].includes(e.kind))) {
        if (!c.ids.includes(b.id)) continue;
        b.preDeployOrder = { mode:c.mode, x:c.x, z:c.z };
      }
      break;
    }
    case "priority": {
      const us = mobile(w, c.ids, c.team);
      for (const u of us) {
        u.priorityFocus = c.focus;
        u.mode = "amove";
        const targets = w.entities.filter(e => !e.dead && e.team !== u.team && e.kind === c.focus);
        if (targets.length) {
          targets.sort((a,b) => Math.hypot(a.x-u.x,a.z-u.z) - Math.hypot(b.x-u.x,b.z-u.z));
          u.target = targets[0];
          u.dest = { x: targets[0].x, z: targets[0].z };
        }
      }
      break;
    }
    case "depot-priority": {
      const team = c.team ?? w.playerTeam;
      const depots = c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply");
      for (const d of depots) d.logisticsPriority = c.focus;
      if (depots.length) w.setDepotPriority(team, c.focus);
      break;
    }
    case "logistics-source": {
      const team=c.team??w.playerTeam;
      for(const id of c.ids){const depot=w.byId.get(id);if(!depot||depot.dead||depot.team!==team||depot.kind!=="supply")continue;
        if(c.sourceIndex!=null&&(c.sourceIndex<0||c.sourceIndex>=w.resourcePoints.length))continue;
        depot.preferredResourceIndex=c.sourceIndex;depot.logisticsPaused=c.paused??false;
        for(const t of w.entities)if(!t.dead&&t.supplyDepotId===depot.id){t.logisticsLoadProgress=0;t.routeLeg=undefined;if(t.cargo<=0&&(t.logisticsSourceIndex!=null||t.kind==="transport")){if(c.sourceIndex!=null){t.logisticsSourceIndex=c.sourceIndex;t.logisticsTarget={x:w.resourcePoints[c.sourceIndex].x,z:w.resourcePoints[c.sourceIndex].z};}}}
      }break;
    }
    case "logistics-route": {
      const team = c.team ?? w.playerTeam;
      for (const d of c.ids.map(id => w.byId.get(id)).filter((e): e is Entity => !!e && !e.dead && e.team === team && e.kind === "supply")) {
        if (c.clear) { w.clearLogisticsRoute(d); continue; }
        w.addLogisticsWaypoint(d, {x:c.x,z:c.z}, c.append !== false);
      }
      break;
    }
    case "air-return": {
      for(const u of airUnitsForOrder(w,c.ids,c.team??w.playerTeam)){replaceTask(w,u);requestAirReturn(u);}
      break;
    }
    case "air-mission": {
      for (const u of airUnitsForOrder(w,c.ids,c.team??w.playerTeam)) {
        if (u.def.armor !== "air" && u.def.category !== "heli") continue;
        assignAirMission(u, c.mission, c.x != null && c.z != null ? { x: c.x, z: c.z } : null);
      }
      break;
    }
    case "unload": {
      for (const transport of mobile(w, c.ids, c.team).filter(u => transportCapacity(u)>0||u.kind==="landingcraft")) {
        if (!transport.cargoUnitIds.length) continue;
        if(transport.kind==="landingcraft"){transport.unloadPoint={x:c.x,z:c.z};transport.mode="transport-unload";transport.dest=transport.unloadPoint;continue;}
        const point=w.nav.nearestWalkable({x:c.x,z:c.z},transport.def.radius+(transport.def.domain==="air"?mobility.transport.landingMargin:0));
        if(!point||Math.hypot(point.x-c.x,point.z-c.z)>20)continue;
        transport.transportQueue=[];transport.transportPickupPoint=undefined;transport.transportExitRetryAt=0;transport.target=null;transport.navPath=[];transport.moveGroup=undefined;
        transport.unloadPoint = point;
        transport.mode = "transport-unload";
        transport.dest = point;
      }
      break;
    }
    case "produce": {
      const team=c.team??w.playerTeam,def=w.unitDefinition(c.kind,team),hq=w.hq[team];
      const deck = w.deckForTeam(team), battlegroup = w.battlegroupForTeam(team);
      if (deck) {
        const left = deckRemaining(deck, c.kind, w.producedForTeam(team)[c.kind] ?? 0);
        // Also count queued
        let queued = 0;
        for (const e of w.entities) {
          if (e.dead || e.team !== team) continue;
          queued += e.productionQueue.filter(k => k === c.kind).length;
        }
        if (c.kind !== "engineer" && (left - queued <= 0 || (battlegroup && !battlegroup.canDeploy(c.kind, queued + 1)))) break;
      }
      if (!def.producible || !hq || hq.dead || hq.underConstruction || w.teamResources[team] < def.cost || w.teamCredits[team] < def.cost) break;
      const producerKind =
        ["inf","engineer","special","atInf","mgInf","reconInf","sniper","mortar","manpad","atgm"].includes(c.kind) ? "barracks" :
        ["tank","apc","ifv","artillery","mlrs","reconVehicle","lightTank","tankDestroyer","spaa"].includes(c.kind) ? "factory" :
        ["heli","transport","gunship","casHeli"].includes(c.kind) ? "helipad" :
        ["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(c.kind) ? "airbase" :
        ["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(c.kind) ? "shipyard" : null;
      if (!producerKind) break;
      const producer = c.producerId !== undefined
        ? w.byId.get(c.producerId)
        : w.entities.filter(e => !e.dead && !e.underConstruction && e.team === team && e.kind === producerKind && e.productionQueue.length < MAX_QUEUE).sort((a,b)=>a.productionQueue.length-b.productionQueue.length)[0];
      if (producer && (producer.dead || producer.underConstruction || producer.team !== team || producer.kind !== producerKind || producer.productionQueue.length >= MAX_QUEUE)) break;
      if (!producer) break;
      if (!w.canProduceAtLevel(producer, c.kind)) break;
      // Do not spend the player's resources on a unit that cannot enter the
      // production pipeline at all. Temporary outages still stall an existing queue.
      const operational = w.productionOperational(producer, c.kind);
      if (!operational.operational) break;
      const unitLimits: Partial<Record<string, number>> = {
        inf: 40, engineer: 8, special: 4, atInf: 12, mgInf: 10, reconInf: 10, sniper: 6, mortar: 8, manpad: 8, atgm: 8,
        tank: 18, apc: 16, ifv: 14, artillery: 8, mlrs: 6, reconVehicle: 8, lightTank: 8, tankDestroyer: 8, spaa: 8,
        heli: 6, gunship: 6, transport: 6, casHeli: 6, fighter: 8, interceptor: 6, bomber: 4, ecm: 4, multirole: 6, attackAircraft: 6,
        destroyer: 4, submarine: 4, landingcraft: 6, frigate: 6, missileBoat: 8,
      };
      const limit = unitLimits[c.kind];
      if (limit !== undefined && w.entities.filter(e => !e.dead && e.team === team && e.kind === c.kind).length + producer.productionQueue.filter(k => k === c.kind).length >= limit) break;
      if (def.category === "air" && producer.kind === "airbase") {
        const air = w.airbaseStatus(team);
        if (air.aircraft + w.entities.filter(e=>!e.dead&&e.team===team&&e.kind==="airbase").reduce((n,e)=>n+e.productionQueue.length,0) >= air.capacity) break;
      }
      if (w.powerStatus(team).ratio < 0.25 && c.kind !== "inf" && c.kind !== "engineer") break;
      if (["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(c.kind) && !w.hasTech(team, "air")) break;
      if ((c.kind === "gunship") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "special") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "artillery" || c.kind === "mlrs") && w.producerLevel(producer) < 2) break;
      if ((c.kind === "interceptor" || c.kind === "bomber") && w.producerLevel(producer) < 2) break;
      if (["destroyer","submarine"].includes(c.kind) && w.producerLevel(producer) < 2) break;
      w.teamCredits[team] -= def.cost; w.teamResources[team] -= def.cost;
      if (team === w.playerTeam) { w.credits = w.teamCredits[team]; w.resources = w.teamResources[team]; }
      producer.productionQueue.push(c.kind);
      w.queue = [...producer.productionQueue];
      break;
    }
    case "cancel-produce": {
      const producer = w.byId.get(c.producerId);
      if (!producer || producer.dead || producer.team !== (c.team ?? w.playerTeam)) break;
      if (!producer.productionQueue.length) break;
      const cancelled = producer.productionQueue.pop()!;
      const def = w.unitDefinition(cancelled,c.team??w.playerTeam);
      // Refund 75% – better than original Real War (often 0 refund)
      const refund = Math.floor(def.cost * 0.75);
      const team = producer.team;
      w.teamCredits[team] += refund;
      w.teamResources[team] += refund;
      if (team === w.playerTeam) {
        w.credits = w.teamCredits[team];
        w.resources = w.teamResources[team];
      }
      if (producer.productionQueue.length === 0) producer.productionProgress = 0;
      w.queue = [...producer.productionQueue];
      break;
    }
  }
}

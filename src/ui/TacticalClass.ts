import type { UnitKind } from "../sim/types";

export type TacticalClass = "armor"|"infantry"|"recon"|"antiTank"|"airDefense"|"artillery"|"transport"|"logistics"|"helicopter"|"aircraft"|"naval"|"engineer"|"building";
/** Stable class symbols independent of faction-specific display names. */
export function tacticalClass(kind:UnitKind):TacticalClass {
  if(["reconInf","reconVehicle","sniper","special"].includes(kind))return "recon";
  if(["atInf","atgm","tankDestroyer"].includes(kind))return "antiTank";
  if(["manpad","spaa","aa"].includes(kind))return "airDefense";
  if(["artillery","mortar","mlrs"].includes(kind))return "artillery";
  if(["tank","lightTank","ifv"].includes(kind))return "armor";
  if(["inf","mgInf"].includes(kind))return "infantry";
  if(["engineer","combatEngineer"].includes(kind))return "engineer";
  if(["logiTruck","transport","cargoPlane"].includes(kind))return "logistics";
  if(["heli","gunship","casHeli"].includes(kind))return "helicopter";
  if(["fighter","interceptor","bomber","ecm","multirole","attackAircraft"].includes(kind))return "aircraft";
  if(["destroyer","submarine","landingcraft","frigate","missileBoat"].includes(kind))return "naval";
  return kind==="apc"?"transport":"building";
}

export function drawClassIcon(c:CanvasRenderingContext2D,role:TacticalClass,x:number,y:number):void {
  c.save();c.translate(x,y);c.lineWidth=1.3;c.beginPath();c.rect(-8,-5,16,10);c.stroke();c.beginPath();
  switch(role){
    case "armor":c.ellipse(0,0,5,3,0,0,Math.PI*2);break;
    case "infantry":c.moveTo(-7,-4);c.lineTo(7,4);c.moveTo(-7,4);c.lineTo(7,-4);break;
    case "recon":c.moveTo(-7,4);c.lineTo(7,-4);c.moveTo(2,0);c.arc(0,0,2,0,Math.PI*2);break;
    case "antiTank":c.moveTo(-6,4);c.lineTo(0,-4);c.lineTo(6,4);c.closePath();break;
    case "airDefense":c.arc(0,4,6,Math.PI,Math.PI*2);break;
    case "artillery":c.arc(0,0,2,0,Math.PI*2);c.fill();break;
    case "transport":c.moveTo(-5,1);c.lineTo(5,1);c.moveTo(-4,3);c.lineTo(-4,4);c.moveTo(4,3);c.lineTo(4,4);break;
    case "logistics":c.rect(-4,-3,8,6);c.moveTo(0,-3);c.lineTo(0,3);c.moveTo(-4,0);c.lineTo(4,0);break;
    case "helicopter":c.moveTo(-6,-2);c.lineTo(6,-2);c.moveTo(0,-4);c.lineTo(0,4);c.moveTo(-3,3);c.lineTo(3,3);break;
    case "aircraft":c.moveTo(0,4);c.lineTo(0,-4);c.moveTo(-6,2);c.lineTo(0,-2);c.lineTo(6,2);break;
    case "naval":c.moveTo(-6,0);c.lineTo(-3,3);c.lineTo(3,3);c.lineTo(6,0);c.closePath();break;
    case "engineer":c.moveTo(-5,3);c.lineTo(-5,-2);c.lineTo(5,-2);c.lineTo(5,3);c.moveTo(0,-2);c.lineTo(0,3);break;
    case "building":c.rect(-4,-3,8,6);break;
  }
  c.stroke();c.restore();
}

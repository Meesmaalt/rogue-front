import type { Point } from "./types";
import type { MapFeatureDef } from "./mapFeatures";

/** Generates a light RTS base shell: perimeter walls, a forward gate and internal roads. */
export function generateBaseFeatures(bases: readonly (Point & { r: number })[]): MapFeatureDef[] {
  const out: MapFeatureDef[] = [];
  if (bases.length < 2) return out;
  for (let team = 0; team < Math.min(2, bases.length); team++) {
    const b = bases[team];
    const enemy = bases[team === 0 ? 1 : 0];
    const sideX = enemy.x >= b.x ? 1 : -1;
    const sideZ = enemy.z >= b.z ? 1 : -1;
    const half = Math.max(22, Math.min(28, b.r * 0.82));
    const gap = 18;
    const gateOnX = Math.abs(enemy.x-b.x)>=Math.abs(enemy.z-b.z);
    const gateX=b.x+(gateOnX?sideX*half:0),gateZ=b.z+(gateOnX?0:sideZ*half);
    const wall=(id:string,x:number,z:number,width:number,depth:number)=>out.push({id:`base-${team}-${id}`,kind:"wall",x,z,width,depth,height:4.5,label:`Baasi ${team+1} kaitsemüür`} as MapFeatureDef);
    for(const side of [-1,1]){
      const horizontalGate=!gateOnX&&side===sideZ,verticalGate=gateOnX&&side===sideX;
      const segment=half-gap/2,offset=gap/2+segment/2;
      if(horizontalGate){for(const part of [-1,1])wall(`horizontal-${side}-${part}`,b.x+part*offset,b.z+side*half,segment,2);}
      else wall(`horizontal-${side}`,b.x,b.z+side*half,half*2,2);
      if(verticalGate){for(const part of [-1,1])wall(`vertical-${side}-${part}`,b.x+side*half,b.z+part*offset,2,segment);}
      else wall(`vertical-${side}`,b.x+side*half,b.z,2,half*2);
    }
    const roadAngle=Math.atan2(gateX-b.x,gateZ-b.z);
    out.push({id:`base-${team}-main-road`,kind:"road",x:(b.x+gateX)/2,z:(b.z+gateZ)/2,width:8,depth:half+8,rotation:roadAngle,blocksMovement:false,label:"Baasi peatee"});
    out.push({id:`base-${team}-gate`,kind:"gate",x:gateX,z:gateZ,width:gap,depth:8,rotation:roadAngle,blocksMovement:false,label:"Peavärav — hoia läbitav"});

    // Visual density props (tents, crates, sandbag nests) – do not block movement
    const perpX = -sideZ, perpZ = sideX;
    const tentSpots = [
      { ox: -10, oz: 8 }, { ox: -14, oz: 4 }, { ox: 11, oz: 7 },
      { ox: 8, oz: -9 }, { ox: -8, oz: -10 }, { ox: 13, oz: -5 },
    ];
    tentSpots.forEach((s, i) => {
      out.push({
        id: `base-${team}-tent-${i}`,
        kind: "cover",
        x: b.x + s.ox * perpX * 0.15 + s.ox * 0.85,
        z: b.z + s.oz * perpZ * 0.15 + s.oz * 0.85,
        width: 4.5 + (i % 2),
        depth: 3.5,
        height: 2.4,
        rotation: (i * 0.7) % Math.PI,
        blocksMovement: false,
        label: "Telk",
      });
    });
    // Crate stacks near HQ
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      out.push({
        id: `base-${team}-crate-${i}`,
        kind: "cover",
        x: b.x + Math.cos(a) * 9,
        z: b.z + Math.sin(a) * 9,
        width: 2.2,
        depth: 2.2,
        height: 1.6,
        blocksMovement: false,
        label: "Kastid",
      });
    }
  }
  return out;
}

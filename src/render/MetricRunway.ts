import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BATTLE_SCALE} from '../sim/battleScale';
import {groundRectangle} from './GroundSurface';
import config from '../data/terrain.json';
import type {Entity} from '../sim/types';
const materials=Array.from({length:3},(_,layer)=>{const m=new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:layer!==0,roughness:1,polygonOffset:true,polygonOffsetFactor:-(layer+1),polygonOffsetUnits:-(layer+1)*2});m.userData.sharedArt=true;return m;});
/** Three depth-biased batches, clipped to the rendered ground triangles, including markings. */
export function createMetricRunway(pad:Pick<Entity,"x"|"y"|"z"|"heading">):THREE.Mesh {
 const layers:THREE.BufferGeometry[][]=[[],[],[]],cfg=config.render.airfield;
 const start=BATTLE_SCALE.aircraft.runwayStart,end=BATTLE_SCALE.aircraft.runwayEnd,half=BATTLE_SCALE.aircraft.runwayWidth/2;
 const rect=(left:number,right:number,a:number,b:number,color:number,layer=0,feather=0)=>layers[layer].push(groundRectangle(pad,left,right,a,b,color,cfg.surfaceOffset+layer*.015,feather));
 rect(-half-4,half+4,start,end,0x8b8776,0,3);
 rect(cfg.apronLeft,cfg.apronRight,cfg.apronStart,cfg.apronEnd,0x878475,0,4);
 rect(half,BATTLE_SCALE.airfieldLayout.taxiLane+3,start,54,0x555e5b,1);
 rect(-half,half,start,end,0x3b4142,1);
 rect(-half+1,-half+1.3,start+3,end-3,0xcbceba,2);rect(half-1.3,half-1,start+3,end-3,0xcbceba,2);
 for(let z=start+22;z<end-18;z+=24)rect(-.35,.35,z-5,z+5,0xe0dfcb,2);
 for(const edge of [start+9,end-15])for(const side of [-1,1])for(let n=0;n<4;n++){const x=side*(3+n*2);rect(x-.55,x+.55,edge-4,edge+4,0xe0dfcb,2);}
 const layout=BATTLE_SCALE.airfieldLayout,lane=layout.taxiLane;
 rect(lane-.15,lane+.15,start+4,54,0xcbb858,2);
 rect(.5,lane,start+4,start+4.3,0xcbb858,2);
 for(let row=0;row<layout.parkingRows;row++)for(let column=0;column<layout.parkingColumns;column++){
  const x=BATTLE_SCALE.aircraft.parkingOffset+column*BATTLE_SCALE.aircraft.parkingSpacing,z=layout.parkingStart+row*layout.parkingRowSpacing;
  rect(x-7,x+7,z-10,z-9.7,0xd1c795,2);rect(x-7,x-6.7,z-10,z+10,0xd1c795,2);rect(x+6.7,x+7,z-10,z+10,0xd1c795,2);
 }
 // Separate heavy-cargo stand remains beyond the fighter bays.
 const cargo=BATTLE_SCALE.cargo;rect(cargo.parkingLateral-11,cargo.parkingLateral+11,cargo.parkingForward-14,cargo.parkingForward-13.7,0xd1c795,2);
 // Service lane stays behind the hangars.
 rect(79,81,-74,61,0x626b66,1);
 const batches=layers.map(pieces=>mergeGeometries(pieces,false)!);const geometry=mergeGeometries(batches,true)!;layers.flat().forEach(g=>g.dispose());batches.forEach(g=>g.dispose());geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,materials);mesh.name='MetricRunway';mesh.receiveShadow=true;return mesh;
}

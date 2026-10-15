import {generateProceduralMap,type MapArchetype} from './proceduralMap';
import type {MissionDef,Point} from './types';
import {resetHeightmap,setMapSize,setBases,setProceduralSeed,setTerrainProfile,setTerrainFeatures} from './heightmap';
import {NavGrid} from './nav/NavGrid';
import {pointInFeature} from './mapFeatures';
import {Rng} from './rng';
import config from '../data/map-generation.json';
import battleScale from '../data/battle-scale.json';

/** Validate the actual movement grid, not a visual preview. Called only before a match. */
export function validateFreshMap(mission:MissionDef):boolean {
 const map=mission.map,size=map.size!,half=size/2,features=map.features??[];
 try {
  setMapSize(size);setBases(map.bases);setProceduralSeed(mission.seed);setTerrainProfile(map.terrainProfile,map.landforms);setTerrainFeatures(features);
  // Aircraft parking and the entire runway must fit on dry, unobstructed land.
  for(const [team,b] of map.bases.entries()){
   const sign=team===0?1:-1,angle=team===0?Math.PI*.75:-Math.PI/4;
   for(let along=battleScale.aircraft.runwayStart;along<=battleScale.aircraft.runwayEnd;along+=10)for(const across of [-25,0,25]){
    const x=b.x+battleScale.readyAirfield.x*sign+Math.sin(angle)*along+Math.cos(angle)*across;
    const z=b.z+battleScale.readyAirfield.z*sign+Math.cos(angle)*along-Math.sin(angle)*across;
    if(Math.abs(x)>half-10||Math.abs(z)>half-10||features.some(f=>(f.kind==='water'||f.kind==='building')&&pointInFeature(x,z,f,3)))return false;
   }
  }
  const grid=new NavGrid([],[],false);grid.syncFeatures(features);
  const start=grid.worldToCell(map.bases[0].x,map.bases[0].z);
  if(grid.isBlocked(start.x,start.z,2))return false;
  const visited=new Uint8Array(grid.width*grid.height),queue=new Int32Array(visited.length);
  let head=0,tail=1;queue[0]=grid.index(start.x,start.z);visited[queue[0]]=1;
  while(head<tail){const i=queue[head++],x=i%grid.width,z=Math.floor(i/grid.width);
   for(const next of [x>0?i-1:-1,x<grid.width-1?i+1:-1,z>0?i-grid.width:-1,z<grid.height-1?i+grid.width:-1]){
    if(next>=0&&!visited[next]&&!grid.blocked[next]){visited[next]=1;queue[tail++]=next;}
   }
  }
  const reachable=(p:Point,radius:number)=>{
   const c=grid.worldToCell(p.x,p.z),r=Math.ceil(radius/grid.cellSize);
   for(let z=c.z-r;z<=c.z+r;z++)for(let x=c.x-r;x<=c.x+r;x++)if(grid.inBounds(x,z)&&visited[grid.index(x,z)]&&Math.hypot(x-c.x,z-c.z)*grid.cellSize<=radius)return true;
   return false;
  };
  return reachable(map.bases[1],2)&&map.resources.length===9&&map.resources.every(p=>reachable(p,p.radius));
 }finally{resetHeightmap();}
}
/** Versioned deterministic retries preserve the exact successful seed for saves/replays. */
export function generateFreshMap(seed:number,archetype:MapArchetype='balanced',size=battleScale.defaultSize):MissionDef {
 if(!battleScale.mapSizes.includes(size))throw new Error('Kaardi suurus pole toetatud');
 const rng=new Rng(seed>>>0);
 for(let attempt=0;attempt<config.freshGeneration.attempts;attempt++){
  const candidate=attempt===0?seed>>>0:Math.floor(rng.next()*4294967296)>>>0;
  try{const mission=generateProceduralMap(candidate,archetype,size,13);if(validateFreshMap(mission))return mission;}catch{/* Try another deterministic seed. */}
 }
 throw new Error('Mängitavat kaarti ei õnnestunud luua. Proovi uuesti.');
}

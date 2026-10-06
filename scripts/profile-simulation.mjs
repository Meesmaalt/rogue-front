// Short CPU-only profile. Does not measure browser rendering or GPU FPS.
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {World}=await server.ssrLoadModule('/src/sim/World.ts');
 const {FOCUS_MAP}=await server.ssrLoadModule('/src/sim/proceduralMap.ts');
 const height=await server.ssrLoadModule('/src/sim/heightmap.ts');
 const {worldHash}=await server.ssrLoadModule('/src/sim/Replay.ts');
 const m=FOCUS_MAP.map;height.setMapSize(m.size);height.setBases(m.bases);height.setTerrainProfile('farmland');height.setProceduralSeed(FOCUS_MAP.seed);
 const w=new World(411,false,m.resources,m.features,m.bases,true);w.networkMode=true;
 const reference=process.argv.includes('--reference-scan');
 if(reference){
  w.terrain.coverFeaturesAt=()=>w.mapFeatures;
  w.spatial.clear=function(){for(const b of this.buckets)b.length=0;this.occupied.length=0;this.version++;};
 }

 w.spawn('hq',0,m.bases[0].x,m.bases[0].z);w.spawn('hq',1,m.bases[1].x,m.bases[1].z);
 const ids=[];
 for(const team of [0,1])for(let i=0;i<48;i++){
  const x=(team?1:-1)*(310+(i%8)*8),z=(team?-1:1)*(40+Math.floor(i/8)*9);
  const kind=['tank','ifv','inf','reconInf'][i%4],p=w.nav.nearestWalkable({x,z},w.unitDefinition(kind,team).radius);
  const u=w.spawn(kind,team,p.x,p.z);if(team===0)ids.push(u.id);
 }
 for(let i=0;i<6;i++)w.tick(1/30);
 w.issue({type:'amove',ids,x:-110,z:50});
 const orderStart=performance.now();w.tick(1/30);const orderTickMs=performance.now()-orderStart;
 const samples=[];for(let i=0;i<60;i++){const t=performance.now();w.tick(1/30);samples.push(performance.now()-t);}
 const sorted=[...samples].sort((a,b)=>a-b);
 const result={referenceFullScans:reference,scenario:'Roheorg: 96 mobile units, two HQs, 48-unit attack-move',ticks:samples.length,orderTickMs,meanTickMs:samples.reduce((a,b)=>a+b,0)/samples.length,medianTickMs:sorted[Math.floor(sorted.length/2)],p95TickMs:sorted[Math.floor(sorted.length*.95)],hash:worldHash(w),note:'CPU simulation only; no browser/GPU FPS measurement'};
 const path=process.argv[2]??'docs/checks/control-profile.json';await writeFile(path,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally {await server.close();}

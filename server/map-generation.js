import {randomBytes} from 'node:crypto';
import {Worker} from 'node:worker_threads';
const archetypes=['balanced','river','highlands','urban','coastal','forest'];
const regions=['italy','siberia','canyon','desert'];
const sizes=[2048,2560,3072,4096,5120,6144];
let active=0;
/** A bounded worker keeps expensive generation and navigation checks off the lockstep loop. */
export async function generateServerMission(input={}) {
 const archetype=input?.archetype??'balanced',size=Number(input?.size??4096);
 if(input.region!=null&&!regions.includes(input.region))throw new Error('Vali toetatud maastikupiirkond.');
 if(input.options&&(typeof input.options!=='object'||Array.isArray(input.options)||['sea','mountains','forest','river','lakes'].some(key=>input.options[key]!=null&&typeof input.options[key]!=='boolean')||!regions.includes(input.options.region??input.region??'italy')))throw new Error('Maastiku valikud pole kehtivad.');
 if(input.options?.players!=null&&![2,4].includes(input.options.players))throw new Error('Vali kaks või neli stardiala.');
 if(input.options?.layout!=null&&![0,1,2].includes(input.options.layout))throw new Error('Vali toetatud paigutus.');
 if(!archetypes.includes(archetype)||!sizes.includes(size))throw new Error('Vali toetatud piirkond ja kaardi suurus.');
 if(active>=2)throw new Error('Kaardigeneraator on hõivatud. Proovi hetke pärast uuesti.');
 active++;
 try{return await new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./map-worker.js',import.meta.url),{workerData:{seed:randomBytes(4).readUInt32LE(),archetype,size,region:input.region,options:input.options}});
  const timeout=setTimeout(()=>{void worker.terminate();reject(new Error('Kaardi loomine võttis liiga kaua. Proovi uuesti.'));},90000);
  worker.once('message',data=>{clearTimeout(timeout);if(data.error)reject(new Error(data.error));else resolve(data.mission);});
  worker.once('error',error=>{clearTimeout(timeout);reject(error);});
  worker.once('exit',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('Kaardigeneraator peatus.'));});
 });}finally{active--;}
}
export function mapOptions(id){
 const match=/^procedural-v(\d+)-(balanced|river|highlands|urban|coastal|forest)-(\d+)-\d+(?:-o(\d+))?$/.exec(id??'');
 if(!match)return {};
 const result={archetype:match[2],size:sizes.includes(Number(match[3]))?Number(match[3]):4096};
 if(Number(match[1])>=17&&match[4]!=null){const mask=Number(match[4]);return {...result,region:regions[(mask>>5)&3],options:{...(mask&512?{players:4}:{}),...(Number(match[1])>=18&&(mask&384)?{layout:((mask>>7)&3)-1}:{}),sea:!!(mask&1),mountains:!!(mask&2),forest:!!(mask&4),river:!!(mask&8),lakes:!(mask&16),region:regions[(mask>>5)&3]}};}
 return result;
}

export async function generateServerMap(input={}){return (await generateServerMission(input)).id;}

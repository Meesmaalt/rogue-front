import {randomBytes} from 'node:crypto';
import {Worker} from 'node:worker_threads';
const archetypes=['balanced','river','highlands','urban','coastal','forest'];
const sizes=[2048,2560,3072,4096,5120,6144];
let active=0;
/** A bounded worker keeps expensive generation and navigation checks off the lockstep loop. */
export async function generateServerMission(input={}) {
 const archetype=input?.archetype??'balanced',size=Number(input?.size??4096);
 if(!archetypes.includes(archetype)||!sizes.includes(size))throw new Error('Vali toetatud piirkond ja kaardi suurus.');
 if(active>=2)throw new Error('Kaardigeneraator on hõivatud. Proovi hetke pärast uuesti.');
 active++;
 try{return await new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./map-worker.js',import.meta.url),{workerData:{seed:randomBytes(4).readUInt32LE(),archetype,size}});
  const timeout=setTimeout(()=>{void worker.terminate();reject(new Error('Kaardi loomine võttis liiga kaua. Proovi uuesti.'));},90000);
  worker.once('message',data=>{clearTimeout(timeout);if(data.error)reject(new Error(data.error));else resolve(data.mission);});
  worker.once('error',error=>{clearTimeout(timeout);reject(error);});
  worker.once('exit',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('Kaardigeneraator peatus.'));});
 });}finally{active--;}
}
export function mapOptions(id){
 const match=/^procedural-v\d+-(balanced|river|highlands|urban|coastal|forest)-(\d+)-\d+$/.exec(id??'');
 return match?{archetype:match[1],size:sizes.includes(Number(match[2]))?Number(match[2]):4096}:{};
}

export async function generateServerMap(input={}){return (await generateServerMission(input)).id;}

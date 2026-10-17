import {generateFreshMap,validateFreshMap} from '../sim/freshMap';
import {generateProceduralMap,type MapArchetype,type MapOptions} from '../sim/proceduralMap';
self.onmessage=(event:MessageEvent<{seed:number;archetype:MapArchetype;size:number;fixed:boolean;options?:MapOptions}>)=>{
 try{
  const {seed,archetype,size,fixed,options}=event.data;
  const preview=(mission:import('../sim/types').MissionDef)=>self.postMessage({preview:mission});
  let mission:import('../sim/types').MissionDef;
  if(fixed){mission=generateProceduralMap(seed,archetype,size,15,options);preview(mission);let reason='';if(!validateFreshMap(mission,message=>{reason=message;}))throw new Error(`${reason}. Vali uus seeme.`);}
  else mission=generateFreshMap(seed,archetype,size,options,preview);
  self.postMessage({mission});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'Kaardi loomine ebaõnnestus.'});}
};

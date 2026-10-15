import {generateFreshMap,validateFreshMap} from '../sim/freshMap';
import {generateProceduralMap,type MapArchetype} from '../sim/proceduralMap';
self.onmessage=(event:MessageEvent<{seed:number;archetype:MapArchetype;size:number;fixed:boolean}>)=>{
 try{const {seed,archetype,size,fixed}=event.data,mission=fixed?generateProceduralMap(seed,archetype,size,12):generateFreshMap(seed,archetype,size);
 if(fixed&&!validateFreshMap(mission))throw new Error('Selle seemne kaart ei läbinud kontrolli. Vali uus seeme.');
 self.postMessage({mission});}catch(error){self.postMessage({error:error instanceof Error?error.message:'Kaardi loomine ebaõnnestus.'});}
};

import {parentPort,workerData} from 'node:worker_threads';
import {generateFreshMap,regionDefaults} from './generated/map-generator.mjs';
try{const map=generateFreshMap(workerData.seed,workerData.archetype,workerData.size,{...regionDefaults(workerData.options?.region??workerData.region??'italy'),...workerData.options});parentPort.postMessage({missionId:map.id,mission:map});}
catch(error){parentPort.postMessage({error:error.message});}

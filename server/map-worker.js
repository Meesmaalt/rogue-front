import {parentPort,workerData} from 'node:worker_threads';
import {generateFreshMap} from './generated/map-generator.mjs';
try{const map=generateFreshMap(workerData.seed,workerData.archetype,workerData.size);parentPort.postMessage({missionId:map.id,mission:map});}
catch(error){parentPort.postMessage({error:error.message});}

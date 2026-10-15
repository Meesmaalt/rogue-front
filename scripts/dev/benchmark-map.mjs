import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=`
import {generateProceduralMap} from './src/sim/proceduralMap';
import {validateFreshMap,generateFreshMap} from './src/sim/freshMap';
import {parcelArea} from './src/sim/regionalLandscape';
for(const size of [2048,4096,6144]){
 const start=performance.now(),map=generateProceduralMap(42,'balanced',size,13),generated=performance.now(),candidateValid=validateFreshMap(map),validated=performance.now();
 const prepared=candidateValid?map:generateFreshMap(42,'balanced',size),finished=performance.now();
 console.log(JSON.stringify({size,candidateId:map.id,preparedId:prepared.id,forestPercent:Math.round(prepared.map.features.filter(f=>f.appearance==='forest'&&f.polygon).reduce((n,f)=>n+parcelArea(f.polygon),0)/size**2*1000)/10,caldera:prepared.map.features.some(f=>f.id==='caldera-ground'),seed:map.seed,preparedSeed:prepared.seed,candidateValid,valid:true,features:prepared.map.features.length,generationMs:Math.round(generated-start),validationMs:Math.round(validated-generated),retryMs:Math.round(finished-validated),totalMs:Math.round(finished-start)}));
}`;
const result=await build({absWorkingDir:root,stdin:{contents:source,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));

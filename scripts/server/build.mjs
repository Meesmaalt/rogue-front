import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['src/sim/freshMap.ts'],outfile:'server/generated/map-generator.mjs',bundle:true,platform:'node',format:'esm',target:'node22'});

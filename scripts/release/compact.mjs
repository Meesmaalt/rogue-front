import {readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
/** Public sources stay intact; only unreachable historical GLBs are omitted from a release. */
export async function compactRelease(directory=resolve(projectRoot,'dist')) {
 if(resolve(directory)===resolve(projectRoot,'public'))throw new Error('Refusing to prune public source assets');
 const platforms=JSON.parse(await readFile(resolve(projectRoot,'src/data/platforms.json'),'utf8'));
 const retained=new Set([...platforms.land,...platforms.air,...platforms.sea,'cargoPlane','logiTruck']);
 const art=join(directory,'models/art'),manifestPath=join(art,'manifest.json');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 const kept=manifest.models.filter(model=>retained.has(model.kind));
 // Validate the complete deployable roster before removing any files.
 const factions=[...new Set(manifest.models.map(model=>model.faction))];
 const artKinds=JSON.parse(await readFile(resolve(projectRoot,'src/data/art-models.json'),'utf8'));
 const kinds=artKinds.filter(kind=>retained.has(kind));
 for(const faction of factions)for(const kind of kinds)for(const lod of ['detail','tactical']){
  const model=kept.find(model=>model.faction===faction&&model.kind===kind&&model.lod===lod);
  if(!model)throw new Error(`Missing release model: ${faction}/${kind}/${lod}`);
  await stat(join(art,model.path));
 }
 let removedFiles=0,removedBytes=0;
 const remove=async path=>{removedBytes+=(await stat(path)).size;await rm(path);removedFiles++;};
 for(const entry of await readdir(join(directory,'models'),{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.glb'))await remove(join(directory,'models',entry.name));
 const keepPaths=new Set(kept.map(model=>model.path));
 for(const faction of factions)for(const entry of await readdir(join(art,faction),{withFileTypes:true})){
  if(entry.isFile()&&entry.name.endsWith('.glb')&&!keepPaths.has(`${faction}/${entry.name}`))await remove(join(art,faction,entry.name));
 }
 await writeFile(manifestPath,JSON.stringify({...manifest,models:kept},null,2)+'\n');
 return {retainedModels:kept.length,removedFiles,removedBytes};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Release assets:',await compactRelease(process.argv[2]));

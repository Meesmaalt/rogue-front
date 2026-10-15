import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,readdir,rm,stat,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {compactRelease} from './compact.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const walk=async directory=>(await Promise.all((await readdir(directory,{withFileTypes:true})).map(async e=>e.isDirectory()?walk(join(directory,e.name)):[join(directory,e.name)]))).flat();
test('compact releases preserve every required model, all textures, thumbnails and licences byte for byte',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'rogue-release-'));
 try{
  await cp(resolve('public'),directory,{recursive:true});
  const sourceManifest=JSON.parse(await readFile('public/models/art/manifest.json','utf8'));
  const result=await compactRelease(directory);assert.equal(result.retainedModels,66);assert.equal(result.removedFiles,83);
  const manifest=JSON.parse(await readFile(join(directory,'models/art/manifest.json'),'utf8'));
  for(const model of manifest.models){assert.ok(sourceManifest.models.some(m=>m.path===model.path));const path=`models/art/${model.path}`;
   const bytes=await readFile(join(directory,path));assert.equal(hash(bytes),hash(await readFile(join('public',path))));assert.equal(hash(gunzipSync(gzipSync(bytes))),hash(bytes));
  }
  for(const path of await walk(resolve('public'))){if(path.endsWith('.glb')||path.endsWith('manifest.json'))continue;
   const relative=path.slice(resolve('public').length+1);assert.equal(hash(await readFile(join(directory,relative))),hash(await readFile(path)),relative);
  }
  const again=await compactRelease(directory);assert.equal(again.removedFiles,0);assert.equal(again.retainedModels,66);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('incomplete model sets fail validation before any old assets are removed',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'rogue-release-incomplete-'));
 try{await cp(resolve('public'),directory,{recursive:true});await unlink(join(directory,'models/art/usa/tank.glb'));
  await assert.rejects(compactRelease(directory),/ENOENT/);assert.ok((await stat(join(directory,'models/tank.glb'))).size>0);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('the source public directory is protected from pruning',async()=>{
 await assert.rejects(compactRelease(resolve('public')),/source assets/);
});
test('missing manifest entries fail rather than silently dropping a complete chassis',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'rogue-release-manifest-'));
 try{
  await cp(resolve('public'),directory,{recursive:true});const path=join(directory,'models/art/manifest.json');
  const manifest=JSON.parse(await readFile(path,'utf8'));manifest.models=manifest.models.filter(m=>m.kind!=='tank');
  const {writeFile}=await import('node:fs/promises');await writeFile(path,JSON.stringify(manifest));
  await assert.rejects(compactRelease(directory),/Missing release model/);assert.ok((await stat(join(directory,'models/tank.glb'))).size>0);
 }finally{await rm(directory,{recursive:true,force:true});}
});

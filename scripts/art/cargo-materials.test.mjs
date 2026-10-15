import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('every cargo LOD retains UV mapped armor rather than flattening the whole plane into equipment color',async()=>{
 for(const faction of ['usa','russia','china'])for(const kind of ['cargoPlane','bomber'])for(const suffix of ['','-lod']){
  const path=`public/models/art/${faction}/${kind}${suffix}.glb`,bytes=await readFile(path);
  assert.equal(bytes.readUInt32LE(0),0x46546c67,path);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const armor=json.materials.findIndex(m=>m.name==='armor');assert.ok(armor>=0,path);
  const surfaces=json.meshes.flatMap(m=>m.primitives).filter(p=>p.material===armor);assert.ok(surfaces.length,path);
  let vertices=0;
  for(const primitive of surfaces){assert.ok(Number.isInteger(primitive.attributes.TEXCOORD_0),path);vertices+=json.accessors[primitive.attributes.POSITION].count;}
  assert.ok(vertices>200,path+' must texture the airframe, not a tiny trim piece');
 }
});

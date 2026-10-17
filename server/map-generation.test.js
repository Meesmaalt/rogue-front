import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mapOptions} from './map-generation.js';
import {isProceduralMapId} from './map-policy.js';

test('server creates fresh validated maps, stays responsive and shares one map with both players',{timeout:180000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rogue-maps-')),port=18787;
 const child=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:String(port),ROGUE_FRONT_DB:join(dir,'accounts.json')},stdio:'ignore'});
 const url=`http://127.0.0.1:${port}`;
 const request=async(path,payload,token)=>{
  const res=await fetch(url+path,{method:payload?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
  const data=await res.json();assert.equal(res.ok,true,JSON.stringify(data));return data;
 };
 try{
  let up=false;for(let i=0;i<100&&!up;i++){try{up=(await fetch(url+'/healthz')).ok;}catch{}if(!up)await new Promise(r=>setTimeout(r,50));}assert.ok(up);
  const pending=request('/api/maps/generate',{archetype:'balanced',size:2048});
  await new Promise(r=>setTimeout(r,100));const start=Date.now();assert.equal((await fetch(url+'/healthz')).status,200);assert.ok(Date.now()-start<1000,'map generation must not block the lockstep server');
  const first=await pending;assert.ok(isProceduralMapId(first.missionId));assert.match(first.missionId,/^procedural-v18-balanced-2048-/);
  assert.equal(first.mission.id,first.missionId);assert.ok(first.mission.map.features.length>100);
  const winter=await request('/api/maps/generate',{archetype:'balanced',size:2048,region:'siberia',options:{layout:2}});assert.equal(winter.mission.map.terrainProfile,'region-siberia');assert.equal(winter.mission.map.layout.id,'ridge-passes');
  const host=await request('/api/auth/register',{username:'map_host',password:'test-password',displayName:'Host'});
  const guest=await request('/api/auth/register',{username:'map_guest',password:'test-password',displayName:'Guest'});
  // Even a supplied old seed is replaced with a newly validated current-version map.
  const {room}=await request('/api/rooms',{missionId:winter.missionId,faction:'usa'},host.token);
  assert.notEqual(room.missionId,winter.missionId);assert.equal(mapOptions(room.missionId).region,'siberia');assert.equal(mapOptions(room.missionId).options.layout,2);assert.equal(mapOptions(room.missionId).archetype,'balanced');assert.equal(mapOptions(room.missionId).size,2048);
  await request(`/api/rooms/${room.id}/join`,{faction:'russia'},guest.token);
  await request(`/api/rooms/${room.id}/ready`,{ready:true,faction:'russia'},guest.token);
  await request(`/api/rooms/${room.id}/ready`,{ready:true,faction:'usa'},host.token);
  const started=await request(`/api/rooms/${room.id}/start`,{},host.token);
  const observed=await request(`/api/rooms/${room.id}`,null,guest.token);
  assert.equal(started.room.status,'started');assert.equal(observed.room.missionId,room.missionId);assert.equal(started.room.missionId,room.missionId);
 }finally{
  child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await rm(dir,{recursive:true,force:true});
 }
});

test('online map replacement preserves a region and each terrain override',()=>{
 const options=mapOptions('procedural-v17-balanced-2048-43-o118');
 assert.equal(options.region,'desert');assert.deepEqual(options.options,{sea:false,mountains:true,forest:true,river:false,lakes:false,region:'desert'});
 assert.deepEqual(mapOptions('procedural-v16-forest-2048-43'),{archetype:'forest',size:2048});
});

test('v18 room regeneration retains explicit layouts and bounds new bits',()=>{
 const options=mapOptions('procedural-v18-balanced-2048-43-o430');
 assert.equal(options.region,'siberia');assert.equal(options.options.layout,2);
 assert.equal(isProceduralMapId('procedural-v18-balanced-2048-43-o511'),true);
 assert.equal(isProceduralMapId('procedural-v18-balanced-2048-43-o1024'),false);
 assert.equal(isProceduralMapId('procedural-v17-balanced-2048-43-o128'),false);
});

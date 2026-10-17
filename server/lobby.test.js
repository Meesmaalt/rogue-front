import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request as httpRequest} from 'node:http';

test('lobby chat, faction confirmation, host transfer and start permissions',{timeout:120000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rogue-lobby-')),port=18789;
 const child=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:String(port),ROGUE_FRONT_DB:join(dir,'accounts.json')},stdio:'ignore'});
 const request=async(path,token,payload,status=200)=>{
  const res=await fetch(`http://127.0.0.1:${port}${path}`,{method:payload?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
  const data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;
 };
 try{
  let up=false;for(let i=0;i<100&&!up;i++){try{up=(await fetch(`http://127.0.0.1:${port}/healthz`)).ok;}catch{}if(!up)await new Promise(r=>setTimeout(r,50));}assert.ok(up);
  const register=name=>request('/api/auth/register',null,{username:name,password:'test-password',displayName:name},201);
  const [a,b,c]=await Promise.all(['lobby_a','lobby_b','lobby_c'].map(register));
  const {room}=await request('/api/rooms',a.token,{missionId:'procedural-v18-balanced-2048-43-o14',faction:'usa'},201),path=`/api/rooms/${room.id}`;
  await request(path+'/join',b.token,{faction:'russia'});
  await request(path+'/chat',c.token,null,403);
  await request(path+'/chat',c.token,{message:'intruder'},403);
  await request(path+'/chat',a.token,{message:'  Tere, vastane!  '});
  await request(path+'/chat',b.token,{message:'<b>Tere!</b>'});
  const {messages}=await request(path+'/chat',a.token);
  assert.deepEqual(messages.map(m=>m.message),['Tere, vastane!','<b>Tere!</b>']);assert.equal(new Set(messages.map(m=>m.id)).size,2);
  await request(path+'/chat',a.token,{message:'   '},400);
  await request(path+'/ready',b.token,{ready:true,faction:'russia',deck:{faction:'usa',slots:[]}},400);
  await request(path+'/ready',b.token,{ready:true,faction:'russia',deck:{name:'Confirmed',faction:'russia',slots:[]}});
  await request(path+'/settings',b.token,{name:'No permission'},403);
  await request(path+'/settings',a.token,{name:'Uued reeglid',rules:{income:'high',fog:'off',victory:'hq'}});
  const changed=await request(path,b.token);assert.ok(changed.room.members.every(m=>!m.ready));assert.equal(changed.room.rules.income,'high');
  await request(path+'/start',a.token,{},409);
  await request(path+'/leave',a.token,{});
  const transferred=await request(path,b.token);assert.equal(transferred.room.hostId,b.user.id);assert.equal(transferred.room.members[0].ready,false);
  const {invite}=await request('/api/invites',b.token,{userId:c.user.id,roomId:room.id},201);
  assert.equal((await request('/api/invites',c.token)).invites.length,1);
  await request('/api/invites/'+invite.id,c.token,{accept:true});
  await request('/api/invites/'+invite.id,c.token,{accept:true},404);
  assert.equal((await request('/api/invites',c.token)).invites.length,0);
  await request(path+'/ready',b.token,{ready:true});await request(path+'/ready',c.token,{ready:true});
  await request(path+'/start',c.token,{},403);
  // A request whose headers arrived before START must still recheck the lock
  // after its delayed body arrives; it cannot mutate the running match.
  let delayedRequest;
  const delayedReady=new Promise((resolve,reject)=>{
   delayedRequest=httpRequest(`http://127.0.0.1:${port}${path}/ready`,{method:'POST',headers:{authorization:`Bearer ${c.token}`,'content-type':'application/json','transfer-encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   delayedRequest.on('error',reject);delayedRequest.flushHeaders();
  });
  await new Promise(r=>setTimeout(r,50));
  const started=await request(path+'/start',b.token,{});
  delayedRequest.end(JSON.stringify({ready:false}));assert.equal(await delayedReady,409);
  assert.ok((await request(path,b.token)).room.members.every(m=>m.ready));assert.equal(started.room.status,'started');assert.equal(started.room.members[0].deck.name,'Confirmed');
  await request(path+'/leave',c.token,{},409);await request(path+'/ready',c.token,{ready:false},409);
 }finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await rm(dir,{recursive:true,force:true});}
});

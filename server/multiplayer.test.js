import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
const freePort=()=>new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
function socket(url,hello){
 const ws=new WebSocket(url),messages=[],waiters=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);messages.push(m);for(const wake of waiters.splice(0))wake();});
 const next=async(type)=>{const deadline=Date.now()+10000;for(;;){const i=messages.findIndex(m=>m.type===type);if(i>=0)return messages.splice(i,1)[0];if(Date.now()>deadline)throw new Error('Puuduv pakett: '+type);await new Promise(r=>{const t=setTimeout(r,100);waiters.push(()=>{clearTimeout(t);r();});});}};
 ws.addEventListener('open',()=>ws.send(JSON.stringify(hello)));
 return {ws,next,messages,send:m=>ws.send(JSON.stringify(m))};
}
test('server-clocked lockstep: slow clients never stall others, chat, desync checkpoints',{timeout:240000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rogue-four-')),port=await freePort(),url=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server/server.js'],{env:{...process.env,PORT:String(port),ROGUE_HASH_INTERVAL:'5',ROGUE_FRONT_DB:join(dir,'users.json')},stdio:'ignore'}),connections=[];
 const req=async(path,token,payload,status=200)=>{const r=await fetch(url+path,{method:payload?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(payload?{body:JSON.stringify(payload)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;};
 try{
  for(let i=0;i<100;i++){try{if((await fetch(url+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
  const users=await Promise.all([0,1,2,3,4].map(i=>req('/api/auth/register',null,{username:'multi_'+i,password:'test-password',displayName:'Mängija '+i},201)));
  const {room}=await req('/api/rooms',users[0].token,{format:'ffa',missionId:'procedural-v18-balanced-2048-43-o14'},201),path='/api/rooms/'+room.id;
  assert.equal(room.capacity,4);assert.ok(Number(room.missionId.split('-o')[1])&512);
  for(const u of users.slice(1,4))await req(path+'/join',u.token,{});
  await req(path+'/join',users[4].token,{},409);
  await req(path+'/bot',users[1].token,{faction:'usa'},403);
  for(const u of users.slice(0,4))await req(path+'/ready',u.token,{ready:true});
  const started=(await req(path+'/start',users[0].token,{})).room;
  assert.equal(new Set(started.members.map(m=>m.alliance)).size,4);
  for(const u of users.slice(0,4)){const c=socket(`ws://127.0.0.1:${port}/ws`,{type:'join',room:room.id,roomId:room.id,token:u.token,missionId:room.missionId});connections.push(c);}
  const welcome=await Promise.all(connections.map(c=>c.next('welcome')));assert.deepEqual(welcome.map(w=>w.team),[0,1,2,3]);
  for(const c of connections)await c.next('start');
  // The clock starts once everybody reports loaded; nobody has to acknowledge ticks afterwards.
  for(const c of connections)c.send({type:'loaded'});
  const first=await Promise.all(connections.map(c=>c.next('tick')));assert.ok(first.every(t=>t.tick>=1));
  // Connection 2 now goes silent (a "laggy" client): the others must keep receiving ticks.
  const seen=connections[0].messages.filter(m=>m.type==='tick').length;
  await new Promise(r=>setTimeout(r,600));
  assert.ok(connections[0].messages.filter(m=>m.type==='tick').length>seen+8,'ticks continue without acknowledgements');
  // The server stamps commands itself (tick + input delay) and tags the sender team.
  connections[3].send({type:'command',tick:1,command:{type:'formation',kind:'line',team:0}});
  const withCommand=async c=>{for(;;){const t=await c.next('tick');if(t.commands.length)return t;}};
  const stamped=await Promise.all(connections.map(withCommand));assert.equal(stamped[0].commands[0].team,3);assert.equal(new Set(stamped.map(t=>t.tick)).size,1);
  // Chat works in game and is delivered to every player.
  connections[1].send({type:'chat',message:'  Tere   kõigile  '});
  const chats=await Promise.all(connections.map(c=>c.next('chat')));assert.equal(chats[0].message.message,'Tere kõigile');assert.equal(chats[0].message.team,1);
  // Checkpoint hashes: matching reports are fine, a mismatch halts the room.
  for(const c of connections)c.send({type:'sync',tick:5,hash:'same'});
  await new Promise(r=>setTimeout(r,200));assert.ok(connections.every(c=>!c.messages.some(m=>m.type==='desync')));
  for(const [i,c] of connections.entries())c.send({type:'sync',tick:10,hash:i===2?'different':'same'});
  const desync=await Promise.all(connections.map(c=>c.next('desync')));assert.equal(Object.keys(desync[0].hashes).length,4);
  // A human can play with an AI ally against two AI opponents.
  const solo=users[4],created=(await req('/api/rooms',solo.token,{format:'teams',missionId:'procedural-v18-balanced-2048-44-o14'},201)).room,p='/api/rooms/'+created.id;
  await req(p+'/bot',solo.token,{alliance:0,faction:'china',difficulty:'hard'});
  await req(p+'/bot',solo.token,{alliance:0},409);
  await req(p+'/bot',solo.token,{alliance:1,faction:'russia'});
  let mixed=(await req(p+'/bot',solo.token,{alliance:1,faction:'usa',difficulty:'easy'})).room;
  assert.deepEqual(mixed.members.map(m=>m.alliance),[0,0,1,1]);assert.equal(mixed.members[1].difficulty,'hard');
  await req(p+'/ready',solo.token,{ready:true,alliance:1},409);
  await req(p+'/bot',solo.token,{remove:mixed.members[3].userId});
  await req(p+'/start',solo.token,{},409);
  mixed=(await req(p+'/bot',solo.token,{alliance:1})).room;
  await req(p+'/ready',solo.token,{ready:true,alliance:0});await req(p+'/start',solo.token,{});
  const c=socket(`ws://127.0.0.1:${port}/ws`,{type:'join',room:created.id,roomId:created.id,token:solo.token,missionId:created.missionId});connections.push(c);
  const w=await c.next('welcome');assert.equal(w.members.filter(m=>m.bot).length,3);await c.next('start');c.send({type:'loaded'});assert.equal((await c.next('tick')).tick,1);
  await req('/api/match/result',solo.token,{roomId:created.id,result:'win'});assert.equal((await req(p,solo.token)).room.status,'finished');
 }finally{for(const c of connections)c.ws.close();child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await rm(dir,{recursive:true,force:true});}
});

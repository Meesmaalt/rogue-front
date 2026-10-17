// PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node scripts/dev/check-multiplayer.mjs
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createServer as createTcpServer} from 'node:net';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const freePort=()=>new Promise(resolve=>{const s=createTcpServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
const root=fileURLToPath(new URL('../../',import.meta.url)),out=process.env.QA_OUTPUT_DIR??await mkdtemp(tmpdir()+'/rogue-multi-'),port=await freePort(),vitePort=await freePort(),apiUrl=`http://127.0.0.1:${port}`,pageUrl=`http://127.0.0.1:${vitePort}`;
const child=spawn(process.execPath,['server/server.js'],{cwd:root,env:{...process.env,PORT:String(port),ROGUE_FRONT_DB:out+'/users.json'},stdio:'ignore'});
let browser,server;
try{
 for(let i=0;i<100;i++){try{if((await fetch(apiUrl+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const request=async(path,token,body)=>{const r=await fetch(apiUrl+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw new Error(JSON.stringify(data));return data;};
 const users=await Promise.all([0,1,2,3].map(i=>request('/api/auth/register',null,{username:'browser_'+i,password:'test-password',displayName:'Mängija '+i})));
 const {createServer}=await import('vite');server=await createServer({root,server:{host:'127.0.0.1',port:vitePort,strictPort:true,hmr:false,proxy:{'/api':{target:apiUrl},'/ws':{target:apiUrl,ws:true}}}});await server.listen();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 const errors=[],pages=[];
 for(const u of users){const p=await browser.newPage({viewport:{width:1360,height:980},permissions:["local-network-access"]});p.setDefaultTimeout(120000);p.setDefaultNavigationTimeout(120000);p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text().slice(0,500));});p.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(e.payload);if(m.type==='error'||m.type==='desync')console.log('NET ERROR',m.type,m.message??m.tick);}catch{}}));await p.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await p.addInitScript(token=>{Object.defineProperty(document,'hidden',{get:()=>false});Object.defineProperty(document,'visibilityState',{get:()=>"visible"});localStorage.setItem('rogue-front.authToken',token);localStorage.setItem('rogue-front.settings.v1',JSON.stringify({quality:'low',masterVolume:0}));},u.token);pages.push(p);}
 const simulation=(roomId,limit=Infinity)=>`<div data-r="clock">0:00</div><script type="module">
 import {World} from '/src/sim/World.ts';import {createSkirmish} from '/src/sim/scenario.ts';import {worldHash} from '/src/sim/Replay.ts';import {LockstepClient} from '/src/net/LockstepClient.ts';import {getPlayableMap} from '/src/sim/proceduralMap.ts';import {setMapSize,setBases,setTerrainProfile,setTerrainFeatures,setProceduralSeed} from '/src/sim/heightmap.ts';
 const id=new URL(location.href).searchParams.get('mission'),m=getPlayableMap(id);setMapSize(m.map.size);setBases(m.map.bases);setTerrainProfile(m.map.terrainProfile,m.map.landforms);setTerrainFeatures(m.map.features);setProceduralSeed(m.seed);
 const w=new World(m.seed,true,m.map.resources,m.map.features,m.map.bases,false,true);w.metricBattle=true;w.compactBattle=true;w.platformRosterOnly=true;const q=window.qa={tick:0,error:null,hash:null};const net=new LockstepClient({assigned:(team,count,rules,members)=>{w.setNetworkMode(team);w.configureParticipants(members);w.setMatchRules(rules);createSkirmish(w);},started:()=>net.ack(worldHash(w)),tick:p=>{for(const c of p.commands)w.issue(c);w.tick(1/30);q.tick=p.tick;q.hash=worldHash(w);document.querySelector('[data-r=clock]').textContent=Math.floor(w.time/60)+':'+String(Math.floor(w.time%60)).padStart(2,'0');if(p.tick<${limit})net.ack(q.hash,p.tick);},desync:t=>q.error='DESYNC '+t,status:(s,t)=>{if(s==='error')q.error=t;}});net.connect('${roomId}',id,'${apiUrl.replace('http:','ws:')}/ws');
 </script>`;
 const [a,b]=pages,index=await readFile(root+'/index.html','utf8');
 const lobby='<div id="app"></div><script type="module">import {OnlineShell} from "/src/ui/OnlineShell.ts";window.shell=new OnlineShell(document.getElementById("app"));await window.shell.startOnline();</script>';
 for(const p of [a,b]){await p.route('**/qa-lobby.html*',r=>r.fulfill({contentType:'text/html',body:new URL(r.request().url()).searchParams.has('mission')?(p===a?index:simulation(new URL(r.request().url()).searchParams.get('room'))):lobby}));await p.goto(pageUrl+'/qa-lobby.html');await p.locator('[data-room-search]').waitFor();}
 await a.locator('[data-action=create]').click();await a.locator('[name=format]').selectOption('teams');await a.locator('[name=name]').fill('2v2 AI kontroll');await a.locator('#create-room-form button[type=submit]').click();await a.locator('[data-add-bot]').waitFor();
 await a.locator('[data-ai-faction]').selectOption('china');await a.locator('[data-ai-difficulty]').selectOption('hard');await a.locator('[data-ai-alliance]').selectOption('0');await a.locator('[data-add-bot]').click();await a.locator('[data-remove-bot]').waitFor();
 const room=(await request('/api/me',users[0].token)).activeRoom;
 await request('/api/rooms/'+room.id+'/join',users[1].token,{});await b.reload();await b.locator('[data-chat-form]').waitFor();
 await a.waitForTimeout(1800);await a.locator('[data-ai-alliance]').selectOption('1');await a.locator('[data-add-bot]').click();await a.waitForFunction(()=>document.querySelectorAll('.player-slot').length===4&&document.querySelectorAll('[data-remove-bot]').length===2);
 assert.equal(await a.locator('.player-slot').count(),4);assert.equal(await a.locator('[data-action=start]').isDisabled(),true);
 await a.locator('[name=message]').fill('Meie AI liitlane on Hiina');await a.locator('[name=message]').press('Enter');await b.locator('[data-chat]').getByText('Meie AI liitlane on Hiina',{exact:false}).waitFor();
 await a.screenshot({path:out+'/teams-lobby.png'});
 await b.locator('[data-action=ready]').click();await a.locator('[data-action=ready]').click();await a.locator('[data-action=start]:enabled').waitFor();await a.locator('[data-action=start]').click();
 await Promise.all([a,b].map(p=>p.waitForURL('**/*mission=**')));
 console.log('LAUNCHED',a.url(),b.url());await a.waitForTimeout(5000);for(const [i,p] of [a,b].entries())console.log('INITIAL',i,await p.evaluate(()=>({hidden:document.hidden,clock:document.querySelector('[data-r=clock]')?.textContent,text:document.body.innerText.slice(-1000)})));
 try{await Promise.all([a,b].map(p=>p.waitForFunction(()=>document.querySelector('[data-r=clock]')?.textContent>='0:03')));}catch(e){for(const [i,p] of [a,b].entries()){console.log('GAME STATE',i,(await p.locator('body').innerText()).slice(-3500));await p.screenshot({path:out+'/failed-'+i+'.png'});}throw e;}
 for(const p of [a,b]){const text=await p.locator('body').innerText();assert.ok(!text.includes('DESYNC'));assert.ok(!text.includes('Vigane serveri sõnum'));}
 assert.equal(await a.getByRole('button',{name:'Alusta missiooni',exact:true}).isVisible(),false);
 await a.screenshot({path:out+'/teams-battle.png'});console.log('PASS real 2v2 game launch with two human clients (one 3D renderer), Chinese AI ally, AI opponent and advancing shared clock');
 await a.close();await b.close();
 // Four independent browser contexts run the real lockstep client and simulation,
 // without four software WebGL renderers obscuring deterministic-state checks.
 const ffa=(await request('/api/rooms',users[2].token,{format:'ffa',missionId:'procedural-v18-balanced-2048-43-o14'})).room;
 // Existing users 0/1 are still in their running match. Finish their reports before reuse.
 for(const u of users.slice(0,2))await request('/api/match/result',u.token,{roomId:room.id,result:'loss'});
 for(const u of [users[0],users[1],users[3]])await request('/api/rooms/'+ffa.id+'/join',u.token,{});
 for(const u of users)await request('/api/rooms/'+ffa.id+'/ready',u.token,{ready:true});await request('/api/rooms/'+ffa.id+'/start',users[2].token,{});
 const harness=simulation(ffa.id,180);
 const peers=[];for(const u of users){const p=await browser.newPage({permissions:["local-network-access"]});p.setDefaultTimeout(120000);p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text().slice(0,500));});p.on('websocket',ws=>ws.on('framereceived',e=>{try{const m=JSON.parse(e.payload);if(m.type==='error'||m.type==='desync')console.log('NET ERROR',m.type,m.message??m.tick);}catch{}}));await p.addInitScript(token=>localStorage.setItem('rogue-front.authToken',token),u.token);await p.route('**/qa-sim*',r=>r.fulfill({contentType:'text/html',body:harness}));await p.goto(pageUrl+'/qa-sim?mission='+ffa.missionId);peers.push(p);}
 await Promise.all(peers.map(p=>p.waitForFunction(()=>window.qa?.error||window.qa?.tick>=180)));const states=await Promise.all(peers.map(p=>p.evaluate(()=>window.qa)));assert.ok(states.every(s=>!s.error&&s.tick===180),JSON.stringify(states));assert.equal(new Set(states.map(s=>s.hash)).size,1);assert.deepEqual(errors,[]);console.log('PASS four-browser FFA: 180 acknowledged ticks, identical hashes, no page errors');
}catch(e){console.error(e);process.exitCode=1;}finally{if(browser)await browser.close();if(server)await server.close();child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));if(!process.exitCode&&!process.env.QA_OUTPUT_DIR)await rm(out,{recursive:true,force:true});else console.log('QA files:',out);}

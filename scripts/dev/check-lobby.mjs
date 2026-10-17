// Run: PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium node scripts/dev/check-lobby.mjs
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createServer as createTcpServer} from 'node:net';
const freePort=()=>new Promise((resolve,reject)=>{const server=createTcpServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{
const port=await freePort(),vitePort=await freePort(),apiUrl=`http://127.0.0.1:${port}`,pageUrl=`http://127.0.0.1:${vitePort}`;
const root=fileURLToPath(new URL('../../',import.meta.url)),out=await mkdtemp(tmpdir()+'/rogue-lobby-browser-');const child=spawn(process.execPath,['server/server.js'],{cwd:root,env:{...process.env,PORT:String(port),ROGUE_FRONT_DB:out+'/qa-lobby-accounts-'+Date.now()+'.json'},stdio:'ignore'});
let server,browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(apiUrl+'/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 const request=async(path,token,payload)=>{const res=await fetch(apiUrl+path,{method:payload?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(payload?{body:JSON.stringify(payload)}:{})});const data=await res.json();assert.ok(res.ok,JSON.stringify(data));return data;};
 const host=await request('/api/auth/register',null,{username:'qa_host',password:'test-password',displayName:'QA host'}),guest=await request('/api/auth/register',null,{username:'qa_guest',password:'test-password',displayName:'QA guest'});
 const {createServer}=await import(root+'/node_modules/vite/dist/node/index.js');server=await createServer({root,server:{host:'127.0.0.1',port:vitePort,strictPort:true,hmr:false,proxy:{'/api':{target:apiUrl}}}});await server.listen();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 const pages=[];
 for(const user of [host,guest]){const page=await browser.newPage({viewport:{width:1280,height:950}});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(token=>localStorage.setItem('rogue-front.authToken',token),user.token);await page.route('**/qa-lobby.html',r=>r.fulfill({contentType:'text/html',body:'<div id="app"></div><script type="module">import {OnlineShell} from "/src/ui/OnlineShell.ts";import {api} from "/src/net/Api.ts";window.api=api;window.shell=new OnlineShell(document.getElementById("app"));await window.shell.startOnline();</script>'}));await page.goto(pageUrl+'/qa-lobby.html');await page.locator('[data-room-search]').waitFor();pages.push(page);}
 const [a,b]=pages;
 await a.locator('[data-action=create]').click();await a.locator('#create-room-form [name=name]').fill('Vestluse kontroll');
 await a.locator('#create-room-form [name=faction]').selectOption('russia');assert.equal(await a.locator('#create-room-form [name=deck]').inputValue(),'russia');
 await a.locator('#create-room-form [name=deck]').selectOption('usa');assert.equal(await a.locator('#create-room-form [name=faction]').inputValue(),'usa');
 await a.locator('#create-room-form button[type=submit]').click();await a.locator('[data-chat-form]').waitFor();
 const {activeRoom:room}=await request('/api/me',host.token);
 const search=b.locator('[data-room-search]');await search.fill('Vestluse');await search.focus();await b.waitForTimeout(2000);assert.equal(await search.inputValue(),'Vestluse');
 // Blurring allows the public room list to refresh without disturbing typing.
 await search.blur();await b.locator('[data-join]').click();await b.locator('[data-chat-form]').waitFor();
 await a.reload();await a.locator('[data-chat-form]').waitFor();
 const ai=a.locator('[name=message]'),bi=b.locator('[name=message]');
 await ai.fill('Pooleliolev sõnum säilib');await ai.focus();await a.waitForTimeout(3300);assert.equal(await ai.inputValue(),'Pooleliolev sõnum säilib');assert.ok(await ai.evaluate(el=>document.activeElement===el));
 await a.locator('[data-tab=friends]').click();await a.locator('[data-player-search]').waitFor();await a.waitForTimeout(1700);assert.equal(await a.locator('[data-chat-form]').count(),0);await a.locator('[data-tab=lobby]').click();await a.locator('[data-chat-form]').waitFor();assert.equal(await ai.inputValue(),'Pooleliolev sõnum säilib');await ai.focus();
 await b.locator('[data-action=ready]').click();await a.waitForTimeout(2200);assert.equal(await ai.inputValue(),'Pooleliolev sõnum säilib');assert.ok(await ai.evaluate(el=>document.activeElement===el));
 await ai.press('Enter');await b.locator('[data-chat]').getByText('Pooleliolev sõnum säilib',{exact:false}).waitFor();
 await bi.fill('<img src=x onerror=alert(1)>');await bi.press('Enter');await a.locator('[data-chat]').getByText('<img src=x onerror=alert(1)>',{exact:false}).waitFor();assert.equal(await a.locator('[data-chat] img').count(),0);
 // A slow send must not clear text composed while the request is in flight.
 await a.route('**/chat',async route=>{if(route.request().method()==='POST')await new Promise(r=>setTimeout(r,700));await route.continue();});
 await ai.fill('Aeglane saatmine');await ai.press('Enter');await ai.fill('Järgmine mustand');await a.waitForTimeout(1100);assert.equal(await ai.inputValue(),'Järgmine mustand');await a.unroute('**/chat');
 await a.locator('[data-faction]').selectOption('china');await a.waitForFunction(()=>document.querySelector('[data-faction]')?.value==='china'&&!document.querySelector('[data-faction]').disabled);await a.waitForTimeout(2000);assert.equal(await a.locator('[data-deck]').inputValue(),'china');
 assert.match(await a.locator('[data-side-faction] b').innerText(),/CHN/);
 const observed=await request('/api/rooms/'+room.id,host.token);assert.equal(observed.room.members[0].faction,'china');assert.equal(observed.room.members[0].deck.faction,'china');assert.equal(observed.room.members[0].ready,false);
 await a.locator('[data-action=settings]').click();await a.locator('#settings-form [name=income]').selectOption('high');await a.locator('#settings-form button[type=submit]').click();await a.waitForTimeout(2000);const changed=await request('/api/rooms/'+room.id,guest.token);assert.ok(changed.room.members.every(m=>!m.ready));assert.equal(changed.room.rules.income,'high');assert.equal(await ai.inputValue(),'Järgmine mustand');
 await a.route('**/chat',async route=>{if(route.request().method()==='POST'){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Ajutine tõrge'})});}else await route.continue();});await ai.fill('Proovin uuesti');await ai.press('Enter');await a.locator('[data-toast]').getByText('Ajutine tõrge').waitFor();assert.equal(await ai.inputValue(),'Proovin uuesti');await a.unroute('**/chat');await ai.press('Enter');await b.locator('[data-chat]').getByText('Proovin uuesti',{exact:false}).waitFor();
 await a.screenshot({path:out+'/lobby-fixed.png'});
 await a.locator('[data-action=leave]').click();await a.locator('[data-room-search]').waitFor();await a.waitForTimeout(2200);assert.equal(await a.locator('[data-chat-form]').count(),0);await b.locator('[data-action=start]').waitFor();
 await request('/api/friends/add',guest.token,{userId:host.user.id});await b.locator('[data-action=invite]').click();await b.locator('[data-invite-user]').click();await b.locator('.modal-backdrop').evaluate(el=>el.remove());await a.locator('[data-accept-invite]').click();await a.locator('[data-chat-form]').waitFor();
 await a.locator('[data-action=ready]').click();await b.locator('[data-action=ready]').click();await b.locator('[data-action=start]:not([disabled])').waitFor();
 // Inspect the real launch URL without loading the entire renderer in this lobby regression.
 for(const p of pages)await p.route('**/*mode=multiplayer*',r=>r.fulfill({contentType:'text/html',body:'<p>Battle navigation reached</p>'}));
 const launched=pages.map(p=>p.waitForURL(/mode=multiplayer/));await b.locator('[data-action=start]').click();await Promise.all(launched);assert.equal(new URL(a.url()).searchParams.get('room'),room.id);assert.equal(new URL(b.url()).searchParams.get('room'),room.id);
 assert.deepEqual(errors,[]);console.log('PASS two-player lobby: create, deck alignment, search, join, reconnect, room navigation, draft/focus, incoming chat, escaped HTML, slow-send draft, faction/deck, settings reset, failed-send retry, leave, host transfer, invite acceptance and both launch URLs; no page errors');
}finally{await browser?.close();await server?.close();child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await rm(out,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});

import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AudioManager,spatialSound,engineSound} from './Audio';
import type {Entity} from '../sim/types';
import type {GameSettings} from '../ui/Settings';
class Param{value=0;setValueAtTime(v:number,..._args:unknown[]){this.value=v;}setTargetAtTime(v:number,..._args:unknown[]){this.value=v;}exponentialRampToValueAtTime(v:number,..._args:unknown[]){this.value=v;}}
class Node{Q=new Param();gain=new Param();frequency=new Param();pan=new Param();delayTime=new Param();threshold=new Param();ratio=new Param();attack=new Param();release=new Param();buffer:unknown=null;type='';stoppedAt=0;loop=false;onended:(()=>void)|null=null;connect(n:Node){return n;}disconnect(){}start(..._args:unknown[]){}stop(at:number){this.stoppedAt=at;}}
class Context{static latest:Context;state='running';currentTime=0;sampleRate=8000;destination=new Node();gains:Node[]=[];sources:Node[]=[];constructor(){Context.latest=this;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){const n=new Node();this.gains.push(n);return n;}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}createStereoPanner(){return new Node();}createConvolver(){return new Node();}createBiquadFilter(){return new Node();}createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)};}createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}}
const settings:GameSettings={masterVolume:1,musicVolume:.4,sfxVolume:0,quality:'medium',keys:{attackMove:'a',hold:'h',patrol:'p',stop:'x',pause:'escape'}};
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('AudioContext',Context);vi.stubGlobal('window',{setInterval,setTimeout});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});
it('distance and camera orientation affect attenuation and stereo direction',()=>{
 const center=spatialSound(0,0,{x:0,z:0,yaw:0}),near=spatialSound(100,0,{x:0,z:0,yaw:0}),far=spatialSound(2000,0,{x:0,z:0,yaw:0});expect(center.gain).toBe(1);expect(near.gain).toBeGreaterThan(far.gain);expect(near.pan).toBeGreaterThan(0);expect(spatialSound(-100,0,{x:0,z:0,yaw:0}).pan).toBeLessThan(0);expect(spatialSound(6000,0,{x:0,z:0,yaw:0}).gain).toBe(0);
});
it('background score plays independently of muted effects and responds to settings',()=>{
 const audio=new AudioManager();audio.setSettings(settings);audio.unlock();audio.startMusic();const ctx=Context.latest;expect(ctx.gains[1].gain.value).toBe(0);expect(ctx.gains[2].gain.value).toBe(.4);expect(ctx.sources.length).toBeGreaterThan(4);const count=ctx.sources.length;audio.events([{type:'impact',x:0,y:0,z:0,weapon:'cannon',size:2}]);expect(ctx.sources.length).toBe(count);audio.setSettings({...settings,musicVolume:0});expect(ctx.gains[2].gain.value).toBe(0);audio.stopMusic();
});
it('a busy battle has a bounded voice pool and paused audio schedules no more sources',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;for(let i=0;i<100;i++){ctx.currentTime=i*.1;audio.events([{type:'impact',x:0,y:0,z:0,weapon:'cannon',size:2}]);}expect(ctx.sources.length).toBeLessThanOrEqual(28);audio.startMusic();audio.pause();const count=ctx.sources.length;vi.advanceTimersByTime(10000);expect(ctx.sources.length).toBe(count);audio.events([{type:'impact',x:0,y:0,z:0,weapon:'cannon',size:2}]);expect(ctx.sources.length).toBe(count);
});

it('missile launches have a sustained noise motor instead of a pitched oscillator sweep',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();
 audio.events([{type:'fire',team:0,x:0,y:0,z:0,visual:'sam'}]);const sources=Context.latest.sources;
 expect(sources.length).toBe(3);expect(sources.every(s=>s.buffer!=null)).toBe(true);
 expect(sources.some(s=>s.loop&&s.stoppedAt>1.5)).toBe(true);
 for(const source of [...sources])source.onended?.();Context.latest.currentTime=1;
 audio.events([{type:'fire',team:0,x:0,y:0,z:0,visual:'sam'}]);expect(Context.latest.sources.length).toBe(6);
});
it('score opens with low sustained tones and does not schedule a fast melody',()=>{
 const audio=new AudioManager();audio.setSettings(settings);audio.unlock();audio.startMusic();const ctx=Context.latest;
 const pitched=ctx.sources.filter(s=>s.buffer==null);expect(pitched.every(s=>s.frequency.value<200)).toBe(true);expect(pitched.filter(s=>s.stoppedAt>10).length).toBe(4);
 const initial=ctx.sources.length;vi.advanceTimersByTime(3000);expect(ctx.sources.length).toBe(initial);audio.stopMusic();
});
it('interface cues are throttled per kind and respect muted effects',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 audio.ui('click');const first=ctx.sources.length;expect(first).toBe(1);audio.ui('click');expect(ctx.sources.length).toBe(first);
 ctx.currentTime=1;audio.ui('click');expect(ctx.sources.length).toBe(first+1);
 audio.setSettings({...settings,sfxVolume:0});const muted=ctx.sources.length;ctx.currentTime=2;audio.ui('select');expect(ctx.sources.length).toBe(muted);
});
it('ambient wind bed starts with the score and stops with it',()=>{
 const audio=new AudioManager();audio.setSettings(settings);audio.unlock();audio.startMusic();const ctx=Context.latest;
 expect(ctx.sources.some(s=>s.loop)).toBe(true);audio.stopMusic();expect(ctx.sources.filter(s=>s.loop).every(s=>s.stoppedAt>=0)).toBe(true);
});

it('moving vehicles and aircraft get bounded engine voices that are released when they go away',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 const unit=(id:number,kind:string,x:number,moving:boolean)=>({id,kind,dead:false,x,z:0,px:moving?x-.1:x,pz:0,def:{speed:10}}) as unknown as Entity;
 const list=[unit(1,'tank',100,true),unit(2,'heli',200,false),unit(3,'tank',300,false),...Array.from({length:20},(_,i)=>unit(10+i,'fighter',50+i*30,true))];
 ctx.currentTime=1;audio.engines(list,.2);const count=ctx.sources.length;
 expect(count).toBeGreaterThan(0);expect(count).toBeLessThanOrEqual(8*4);
 ctx.currentTime=2;audio.engines(list,.2);expect(ctx.sources.length).toBe(count);
 audio.engines([],.2);audio.pause();audio.resume();ctx.currentTime=3;audio.engines([],.2);expect(ctx.sources.length).toBe(count);
});
it('radio acknowledgement is throttled and silent when effects are muted',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 audio.ack('tank');const n=ctx.sources.length;expect(n).toBeGreaterThan(0);audio.ack('tank');expect(ctx.sources.length).toBe(n);
 audio.setSettings({...settings,sfxVolume:0});ctx.currentTime=5;audio.ack('inf');expect(ctx.sources.length).toBe(n);
});

it('fires crackle only while visible and burning, and stop when audio is paused',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 audio.fires(()=>[{x:50,z:0},{x:80,z:0,burnt:true}],.3,()=>false);expect(ctx.sources.length).toBe(0);
 ctx.currentTime=1;audio.fires(()=>[{x:50,z:0}],.3,()=>true);expect(ctx.sources.some(s=>s.loop)).toBe(true);
 const n=ctx.sources.length;audio.pause();audio.resume();ctx.currentTime=2;audio.fires(()=>[],.3);expect(ctx.sources.length).toBe(n);
});
it('infantry steps and construction clanks are bounded per tick; low supply raises one warning',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 const inf=(id:number)=>({id,kind:'inf',team:0,dead:false,x:20+id,z:0,px:19+id,pz:0,supply:0,maxSupply:10,def:{speed:3,weapon:'bullet'}}) as unknown as Entity;
 const list=Array.from({length:40},(_,i)=>inf(i));ctx.currentTime=30;audio.engines(list,.2,0);
 expect(ctx.sources.length).toBeLessThanOrEqual(4*2+3*2+8*3+2);
 const after=ctx.sources.length;ctx.currentTime=31;audio.engines(list,.2,0);expect(ctx.sources.length-after).toBeLessThanOrEqual(4*2+2);
});
it('bird calls are scheduled only after the ambience starts and are cancelled with it',()=>{
 const audio=new AudioManager();audio.setSettings(settings);audio.unlock();audio.startMusic();const ctx=Context.latest;
 vi.advanceTimersByTime(3000);const before=ctx.sources.length;audio.stopMusic();vi.advanceTimersByTime(30000);expect(ctx.sources.length).toBe(before);
});

it('jets make a flyby whoosh only at closest approach',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 const jet=(px:number)=>[{id:1,kind:'fighter',dead:false,x:100,z:0,px,pz:0,def:{speed:10}}] as unknown as Entity[];
 ctx.currentTime=1;audio.engines(jet(101),.2);ctx.currentTime=2;audio.engines(jet(101),.2);const before=ctx.sources.length;
 ctx.currentTime=3;audio.engines(jet(99),.2);expect(ctx.sources.length).toBeGreaterThan(before);
 const after=ctx.sources.length;ctx.currentTime=4;audio.engines(jet(99),.2);expect(ctx.sources.length).toBe(after);
});
it('heavy shells whistle first and boom after a short delay; faction voices differ by pitch',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 audio.events([{type:'impact',x:50,y:0,z:0,weapon:'cannon',visual:'howitzer',size:3}]);const early=ctx.sources.length;expect(early).toBeGreaterThan(0);
 vi.advanceTimersByTime(400);expect(ctx.sources.length).toBeGreaterThan(early);
 ctx.currentTime=5;const n=ctx.sources.length;audio.ack('inf','china');audio.ack('inf','russia');expect(ctx.sources.length).toBeGreaterThan(n);
});
it('camera height muffles effects and interface hover cues defer to other cues',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 audio.setListener(0,0,0,900);audio.setListener(0,0,0,50);
 ctx.currentTime=1;audio.ui('order');const n=ctx.sources.length;audio.ui('click');expect(ctx.sources.length).toBe(n);
 ctx.currentTime=2;audio.ui('click');expect(ctx.sources.length).toBeGreaterThan(n);
});
it('new own units chime once the baseline is known; damaged own buildings raise a rate-limited siren',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 const unit=(id:number)=>({id,kind:'tank',team:0,dead:false,x:9999,z:0,px:9999,pz:0,def:{speed:5},hp:10}) as unknown as Entity;
 const base=(hp:number)=>({id:900,kind:'barracks',team:0,dead:false,x:9999,z:0,px:9999,pz:0,def:{speed:0,building:true},hp}) as unknown as Entity;
 ctx.currentTime=1;audio.engines([unit(1),base(100)],.2);const n0=ctx.sources.length;
 ctx.currentTime=2;audio.engines([unit(1),unit(2),base(100)],.2);expect(ctx.sources.length).toBeGreaterThan(n0);
 const n1=ctx.sources.length;ctx.currentTime=3;audio.engines([unit(1),unit(2),base(80)],.2);expect(ctx.sources.length).toBeGreaterThan(n1);
 const n2=ctx.sources.length;ctx.currentTime=4;audio.engines([unit(1),unit(2),base(60)],.2);expect(ctx.sources.length).toBe(n2);
});
it('resource capture cues fire on ownership change only, and result music uses delayed chords',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 const pts=(a:Array<number|null>)=>a.map((o,i)=>({x:i*10,z:0,controlledBy:o}));let owners:Array<number|null>=[null,1];audio.capture(()=>pts(owners),.3,0);const n=ctx.sources.length;
 ctx.currentTime=1;audio.capture(()=>pts(owners),.3,0);expect(ctx.sources.length).toBe(n);
 owners=[0,1];ctx.currentTime=2;audio.capture(()=>pts(owners),.3,0);expect(ctx.sources.length).toBeGreaterThan(n);
 const m=ctx.sources.length;ctx.currentTime=3;audio.ui('victory');const first=ctx.sources.length;expect(first).toBeGreaterThan(m);
 vi.advanceTimersByTime(7000);expect(ctx.sources.length).toBeGreaterThan(first);
});

it('audio cues carry positions for visuals: capture, impacts after the shell whistle',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;const cues:Array<{kind:string;x?:number}>=[];audio.onCue=c=>cues.push(c);
 const pts=(o:number|null)=>[{x:40,z:0,controlledBy:o}];audio.capture(()=>pts(null),.3,0);ctx.currentTime=1;audio.capture(()=>pts(0),.3,0);
 expect(cues.some(c=>c.kind==='capture'&&c.x===40)).toBe(true);
 audio.events([{type:'impact',x:50,y:0,z:0,weapon:'cannon',visual:'howitzer',size:3}]);expect(cues.some(c=>c.kind==='impact')).toBe(false);
 vi.advanceTimersByTime(400);const hit=cues.find(c=>c.kind==='impact') as {intensity?:number}|undefined;expect(hit?.intensity).toBeGreaterThan(.5);
});
it('visible units remain audible without selection and hidden units are silent',()=>{
 const audio=new AudioManager();audio.setSettings({...settings,sfxVolume:1});audio.unlock();const ctx=Context.latest;
 let visible=true;audio.setAudibility(()=>visible,()=>visible);
 const jet={id:1,kind:'fighter',team:0,dead:false,x:0,z:0,px:0,pz:0,airState:'airborne',def:{speed:100,category:'air'},hp:100} as Entity;
 audio.engines([jet],.2);const engineSources=[...ctx.sources];expect(engineSources.length).toBeGreaterThan(0);
 ctx.currentTime=1;audio.engines([jet],.2);expect(engineSources.every(s=>s.stoppedAt===0)).toBe(true);
 visible=false;audio.engines([jet],.2);expect(engineSources.every(s=>s.stoppedAt>0)).toBe(true);
 visible=true;ctx.currentTime=2;audio.engines([jet],.2);const nextSources=ctx.sources.slice(engineSources.length);expect(nextSources.length).toBeGreaterThan(0);
 visible=false;ctx.currentTime=3;audio.engines([jet],.2);expect(nextSources.every(s=>s.stoppedAt>0)).toBe(true);
 const count=ctx.sources.length;audio.events([{type:'fire',team:0,x:0,y:0,z:0,visual:'aam'}]);expect(ctx.sources.length).toBe(count);
});

it('zooming out reduces positional volume even with the same ground focus',()=>{const near=spatialSound(0,0,{x:0,z:0,yaw:0,distance:50}),far=spatialSound(0,0,{x:0,z:0,yaw:0,distance:900});expect(near.gain).toBeGreaterThan(far.gain*5);expect(spatialSound(800,0,{x:0,z:0,yaw:0,distance:50}).gain).toBeLessThan(near.gain);});

it('automatic resource flights fade much earlier than player aircraft, without requiring selection',()=>{
 const supply={kind:'transport',supplyDepotId:1,x:450,z:0} as Entity,player={...supply,supplyDepotId:undefined};
 const listener={x:0,z:0,yaw:0,distance:80};
 expect(engineSound(supply,listener).gain).toBeLessThan(engineSound(player,listener).gain*.15);
 expect(engineSound({...supply,x:40},listener).gain).toBeGreaterThan(engineSound(supply,listener).gain*5);
 expect(engineSound({...supply,x:1200},listener).gain).toBe(0);
 expect(engineSound({...supply,kind:'cargoPlane'},listener).gain).toBe(engineSound(supply,listener).gain);
});

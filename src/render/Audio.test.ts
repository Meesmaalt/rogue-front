import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AudioManager,spatialSound} from './Audio';
import type {GameSettings} from '../ui/Settings';
class Param{value=0;setValueAtTime(v:number,..._args:unknown[]){this.value=v;}setTargetAtTime(v:number,..._args:unknown[]){this.value=v;}exponentialRampToValueAtTime(v:number,..._args:unknown[]){this.value=v;}}
class Node{Q=new Param();gain=new Param();frequency=new Param();pan=new Param();delayTime=new Param();threshold=new Param();ratio=new Param();attack=new Param();release=new Param();buffer:unknown=null;type='';stoppedAt=0;loop=false;onended:(()=>void)|null=null;connect(n:Node){return n;}disconnect(){}start(..._args:unknown[]){}stop(at:number){this.stoppedAt=at;}}
class Context{static latest:Context;state='running';currentTime=0;sampleRate=8000;destination=new Node();gains:Node[]=[];sources:Node[]=[];constructor(){Context.latest=this;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){const n=new Node();this.gains.push(n);return n;}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}createStereoPanner(){return new Node();}createConvolver(){return new Node();}createBiquadFilter(){return new Node();}createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)};}createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}}
const settings:GameSettings={masterVolume:1,musicVolume:.4,sfxVolume:0,quality:'medium',keys:{attackMove:'a',hold:'h',patrol:'p',stop:'x',pause:'escape'}};
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('AudioContext',Context);vi.stubGlobal('window',{setInterval});});
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

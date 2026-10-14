import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AudioManager,spatialSound} from './Audio';
import type {GameSettings} from '../ui/Settings';
class Param{value=0;setValueAtTime(v:number,..._args:unknown[]){this.value=v;}setTargetAtTime(v:number,..._args:unknown[]){this.value=v;}exponentialRampToValueAtTime(v:number,..._args:unknown[]){this.value=v;}}
class Node{gain=new Param();frequency=new Param();pan=new Param();delayTime=new Param();threshold=new Param();ratio=new Param();attack=new Param();release=new Param();buffer:unknown=null;type='';onended:(()=>void)|null=null;connect(n:Node){return n;}disconnect(){}start(..._args:unknown[]){}stop(..._args:unknown[]){}}
class Context{static latest:Context;state='running';currentTime=0;sampleRate=8000;destination=new Node();gains:Node[]=[];sources:Node[]=[];constructor(){Context.latest=this;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){const n=new Node();this.gains.push(n);return n;}createDynamicsCompressor(){return new Node();}createDelay(){return new Node();}createStereoPanner(){return new Node();}createBiquadFilter(){return new Node();}createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)};}createOscillator(){const n=new Node();this.sources.push(n);return n;}createBufferSource(){return this.createOscillator();}}
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

import type {SimEvent} from '../sim/types';
import {loadSettings,type GameSettings} from '../ui/Settings';
import config from '../data/audio.json';
type Channel='sfx'|'music';
export function spatialSound(x:number,z:number,listener:{x:number;z:number;yaw:number}):{gain:number;pan:number}{
 const dx=x-listener.x,dz=z-listener.z,distance=Math.hypot(dx,dz);
 return {gain:distance>config.maxDistance?0:1/(1+(distance/config.referenceDistance)**2),pan:Math.max(-.85,Math.min(.85,(dx*Math.cos(listener.yaw)-dz*Math.sin(listener.yaw))/Math.max(1,distance)))};
}
/** Original procedural score and layered positional effects. Audio never changes simulation. */
export class AudioManager {
 private ctx:AudioContext|null=null;
 private settings:GameSettings=loadSettings();
 private master:GainNode|null=null;private sfx:GainNode|null=null;private music:GainNode|null=null;
 private musicTimer:number|null=null;private musicStep=0;private activity=0;
 private noiseBuffer:AudioBuffer|null=null;
 private listener={x:0,z:0,yaw:0};
 private readonly voices:Record<Channel,number>={sfx:0,music:0};
 private readonly lastShot=new Map<string,number>();
 private lastUnderAttack=-10;
 private ensure():AudioContext|null {
  if(!this.ctx){try{
   const ctx=this.ctx=new AudioContext(),compressor=ctx.createDynamicsCompressor();
   this.master=ctx.createGain();this.sfx=ctx.createGain();this.music=ctx.createGain();
   compressor.threshold.value=-18;compressor.ratio.value=4;compressor.attack.value=.008;compressor.release.value=.2;
   this.sfx.connect(compressor);compressor.connect(this.master);this.music.connect(this.master);this.master.connect(ctx.destination);
   const delay=ctx.createDelay(1),echo=ctx.createGain(),feedback=ctx.createGain();delay.delayTime.value=.28;echo.gain.value=.16;feedback.gain.value=.18;this.music.connect(delay);delay.connect(echo).connect(this.master);delay.connect(feedback).connect(delay);
   this.applyVolumes();
  }catch{this.ctx=null;return null;}}
  return this.ctx;
 }
 private applyVolumes():void {const t=this.ctx?.currentTime??0;this.master?.gain.setTargetAtTime(this.settings.masterVolume,t,.04);this.sfx?.gain.setTargetAtTime(this.settings.sfxVolume,t,.04);this.music?.gain.setTargetAtTime(this.settings.musicVolume*(1-this.activity*.3),t,.12);}
 setSettings(settings:GameSettings):void{this.settings=settings;this.applyVolumes();}
 setListener(x:number,z:number,yaw:number):void{this.listener={x,z,yaw};}
 unlock():void{const ctx=this.ensure();if(ctx?.state==='suspended')void ctx.resume();}
 pause():void{this.stopMusic();if(this.ctx?.state==='running')void this.ctx.suspend();}
 resume():void{if(this.ctx?.state==='suspended')void this.ctx.resume();}
 startMusic():void{if(this.musicTimer!==null)return;this.musicTick();this.musicTimer=window.setInterval(()=>this.musicTick(),config.musicStepMs);}
 stopMusic():void{if(this.musicTimer!==null){clearInterval(this.musicTimer);this.musicTimer=null;}}
 private reserve(channel:Channel):boolean{if(this.voices[channel]>=(channel==='sfx'?config.maxSfxVoices:config.maxMusicVoices))return false;this.voices[channel]++;return true;}
 private route(node:AudioNode,channel:Channel,pan:number):StereoPannerNode{
  const panner=this.ctx!.createStereoPanner();panner.pan.value=pan;node.connect(panner).connect(channel==='sfx'?this.sfx!:this.music!);return panner;
 }
 private noise(duration:number,cutoff:number,volume:number,pan=0,channel:Channel='sfx',attack=0,hold=0):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.reserve(channel))return;
  if(!this.noiseBuffer){this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const samples=this.noiseBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
  source.buffer=this.noiseBuffer;source.loop=duration>1.4;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(80,cutoff*.18),now+duration);
  gain.gain.setValueAtTime(attack>0?.0001:Math.max(.0001,volume),now);
  if(attack>0)gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+attack);
  if(hold>0)gain.gain.setValueAtTime(Math.max(.0001,volume),now+attack+hold);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter).connect(gain);const panner=this.route(gain,channel,pan);
  source.onended=()=>{this.voices[channel]--;source.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();};source.start(now,Math.random()*.5);source.stop(now+duration);
 }
 private tone(freq:number,duration:number,type:OscillatorType,volume:number,pan=0,channel:Channel='sfx',attack=.008):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.reserve(channel))return;
  const source=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;source.type=type;source.frequency.setValueAtTime(freq,now);
  if(channel==='sfx')source.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.55),now+duration);
  filter.type='lowpass';filter.frequency.value=channel==='music'?1100:2200;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+attack);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter).connect(gain);const panner=this.route(gain,channel,pan);source.onended=()=>{this.voices[channel]--;source.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();};source.start(now);source.stop(now+duration+.02);
 }
 events(events:readonly SimEvent[],playerTeam=0):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0)return;
  for(const e of events){const mix='x' in e&&'z' in e?spatialSound(e.x,e.z,this.listener):{gain:1,pan:0};if(mix.gain<.008)continue;
   if(e.type==='fire'){
    const kind=e.visual??e.weapon??'rifle',profile=(config.shots as Record<string,number[]>)[kind]??config.shots.rifle,now=ctx.currentTime;
    if(now-(this.lastShot.get(kind)??-10)<profile[4])continue;this.lastShot.set(kind,now);this.activity=Math.min(1,this.activity+mix.gain*.12);
    const distanceFilter=1+(1-mix.gain)*2;
    if(config.missiles.includes(kind)){
      // Ejection crack, rising broadband motor and low exhaust pressure: no pitched laser sweep.
      const motor=config.missileMotor;
      this.noise(.085,4300/distanceFilter,.19*mix.gain,mix.pan);
      this.noise(motor.duration,motor.cutoff/distanceFilter,motor.volume*mix.gain,mix.pan,'sfx',motor.attack,motor.hold);
      this.noise(.55,240,.13*mix.gain,mix.pan,'sfx',.018,.04);
    }else{
      this.noise(Math.min(.075,profile[0]),6500/distanceFilter,profile[2]*mix.gain,mix.pan);
      this.noise(profile[0],profile[1]/distanceFilter,profile[2]*.8*mix.gain,mix.pan);
      this.tone(profile[3],profile[0]*.75,'sine',profile[2]*.65*mix.gain,mix.pan);
      if(['sabot','howitzer','mortar'].includes(kind)){
        const tail=config.artilleryTail;this.noise(tail.duration,tail.cutoff,tail.volume*mix.gain,mix.pan,'sfx',.035,.03);
      }
    }
   }else if(e.type==='impact'){
    if(e.result==='intercept'){this.noise(.12,3000,.13*mix.gain,mix.pan);this.tone(210,.1,'triangle',.08*mix.gain,mix.pan);}
    else if(e.result==='ricochet'){this.tone(1800,.16,'sine',.06*mix.gain,mix.pan);this.noise(.12,3800,.06*mix.gain,mix.pan);}
    else if(e.weapon==='bullet')this.noise(.055,2100,.055*mix.gain,mix.pan);
    else{const heavy=['bomb','howitzer','mlrs'].includes(e.visual??'');this.noise(heavy?.85:.42,heavy?500:1000,(heavy?.3:.2)*mix.gain,mix.pan);this.tone(heavy?38:62,heavy?.7:.35,'sine',.2*mix.gain,mix.pan);}
   }else if(e.type==='death'){
    this.noise(e.big?.9:.25,e.big?650:1400,(e.big?.28:.1)*mix.gain,mix.pan);this.tone(e.big?42:85,.4,'triangle',.12*mix.gain,mix.pan);
    if(e.team===playerTeam&&ctx.currentTime-this.lastUnderAttack>4){this.lastUnderAttack=ctx.currentTime;this.tone(220,.18,'sine',.045);}
   }else if(e.type==='build-complete'&&e.team===playerTeam)this.tone(523,.28,'sine',.06);
   else if(e.type==='repair-complete'&&e.team===playerTeam)this.tone(659,.18,'sine',.04);
  }
 }
 private musicTick():void{
  if(!this.ctx||this.ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.musicVolume<=0)return;
  this.activity*=.9;this.applyVolumes();const step=this.musicStep++,root=config.roots[Math.floor(step/16)%config.roots.length];
  // Slow minor drones and restrained low percussion; no bright repeating arpeggio.
  if(step%16===0){
    config.chordRatios.forEach((r,i)=>this.tone(root*2*r,12.3,'triangle',.019,(i-1)*.36,'music',1.8));
    this.tone(root,11.8,'sine',.037,0,'music',1.2);
    this.noise(8,380,.018,-.25,'music',1.5,1);
  }
  if(step%8===0){this.tone(44,.65,'sine',.045,0,'music',.015);this.noise(.55,180,.025,.18,'music',.006,.01);}
  if(this.activity>.35&&step%8===4)this.noise(.32,460,.018,-.2,'music',.008,.02);
 }
}

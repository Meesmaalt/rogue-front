import type {SimEvent} from '../sim/types';
import {loadSettings,type GameSettings} from '../ui/Settings';
import config from '../data/audio.json';
type Channel='sfx'|'music';
export type UiSound='click'|'select'|'order'|'deny'|'queue'|'alert'|'research'|'victory'|'defeat';
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
 private ambience:{src:AudioBufferSourceNode;lfo:OscillatorNode;gain:GainNode}|null=null;
 private lastUi=new Map<string,number>();private lastSupply=-10;
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
   this.buildReverb(ctx);
   this.applyVolumes();
  }catch{this.ctx=null;return null;}}
  return this.ctx;
 }
 /** Generated stereo impulse: short outdoor tail (no audio files). */
 private buildReverb(ctx:AudioContext):void{
  if(typeof ctx.createConvolver!=='function'||!this.sfx||!this.master)return;
  const len=Math.floor(ctx.sampleRate*1.7),ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++){const t=i/len;d[i]=(Math.random()*2-1)*(1-t)**3.2*(i<ctx.sampleRate*.012?.4:1);}}
  const conv=ctx.createConvolver(),send=ctx.createGain(),out=ctx.createGain();conv.buffer=ir;send.gain.value=.2;out.gain.value=.55;
  this.sfx.connect(send);send.connect(conv);conv.connect(out);out.connect(this.master);
 }
 private getNoise():AudioBuffer|null{
  const ctx=this.ctx;if(!ctx)return null;
  if(!this.noiseBuffer){this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const samples=this.noiseBuffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;}
  return this.noiseBuffer;
 }
 /** Quiet wind bed with slow gusts; follows the music channel volume. */
 private startAmbience():void{
  const ctx=this.ctx,buf=this.getNoise();if(!ctx||!buf||!this.music||this.ambience)return;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),lfo=ctx.createOscillator(),depth=ctx.createGain();
  src.buffer=buf;src.loop=true;filter.type='bandpass';filter.frequency.value=420;filter.Q.value=.35;gain.gain.value=.022;
  lfo.type='sine';lfo.frequency.value=.07;depth.gain.value=.012;lfo.connect(depth);depth.connect(gain.gain);
  src.connect(filter);filter.connect(gain);gain.connect(this.music);src.start();lfo.start();this.ambience={src,lfo,gain};
 }
 private stopAmbience():void{
  const a=this.ambience;if(!a)return;this.ambience=null;
  const at=this.ctx?.currentTime??0;try{a.src.stop(at);a.lfo.stop(at);}catch{/* already stopped */}a.src.disconnect();a.lfo.disconnect();a.gain.disconnect();
 }
 /** Non-positional interface cues. Throttled per kind so spam-clicking stays clean. */
 ui(kind:UiSound):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0)return;
  const now=ctx.currentTime;if(now-(this.lastUi.get(kind)??-10)<.045)return;this.lastUi.set(kind,now);
  const t=(f:number,d:number,v:number,type:OscillatorType='sine',delay=0)=>{if(delay>0)window.setTimeout(()=>this.uiTone(f,d,v,type),delay*1000);else this.uiTone(f,d,v,type);};
  switch(kind){
   case'click':t(1100,.05,.045,'triangle');break;
   case'select':t(660,.07,.05);t(990,.06,.035,'sine',.045);break;
   case'order':t(440,.06,.05,'triangle');t(587,.09,.05,'triangle',.06);break;
   case'deny':t(190,.14,.07,'square');t(150,.18,.06,'square',.11);break;
   case'queue':t(784,.07,.04);t(1047,.1,.035,'sine',.07);break;
   case'research':t(523,.14,.045);t(659,.14,.045,'sine',.12);t(784,.22,.05,'sine',.24);break;
   case'alert':t(880,.12,.06,'square');t(660,.16,.06,'square',.16);t(880,.12,.06,'square',.34);break;
   case'victory':[523,659,784,1047].forEach((f,i)=>t(f,.5,.06,'triangle',i*.16));break;
   case'defeat':[392,311,247,196].forEach((f,i)=>t(f,.6,.06,'triangle',i*.22));break;
  }
 }
 /** Flat tone without the downward pitch glide used for weapon thumps. */
 private uiTone(freq:number,duration:number,volume:number,type:OscillatorType):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.reserve('sfx'))return;
  const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,now);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
  o.connect(g).connect(this.sfx!);o.onended=()=>{this.voices.sfx--;o.disconnect();g.disconnect();};o.start(now);o.stop(now+duration+.02);
 }
 private applyVolumes():void {const t=this.ctx?.currentTime??0;this.master?.gain.setTargetAtTime(this.settings.masterVolume,t,.04);this.sfx?.gain.setTargetAtTime(this.settings.sfxVolume,t,.04);this.music?.gain.setTargetAtTime(this.settings.musicVolume*(1-this.activity*.3),t,.12);}
 setSettings(settings:GameSettings):void{this.settings=settings;this.applyVolumes();}
 setListener(x:number,z:number,yaw:number):void{this.listener={x,z,yaw};}
 unlock():void{const ctx=this.ensure();if(ctx?.state==='suspended')void ctx.resume();}
 pause():void{this.stopMusic();if(this.ctx?.state==='running')void this.ctx.suspend();}
 resume():void{if(this.ctx?.state==='suspended')void this.ctx.resume();}
 startMusic():void{if(this.musicTimer!==null)return;this.startAmbience();this.musicTick();this.musicTimer=window.setInterval(()=>this.musicTick(),config.musicStepMs);}
 stopMusic():void{this.stopAmbience();if(this.musicTimer!==null){clearInterval(this.musicTimer);this.musicTimer=null;}}
 private reserve(channel:Channel):boolean{if(this.voices[channel]>=(channel==='sfx'?config.maxSfxVoices:config.maxMusicVoices))return false;this.voices[channel]++;return true;}
 private route(node:AudioNode,channel:Channel,pan:number):StereoPannerNode{
  const panner=this.ctx!.createStereoPanner();panner.pan.value=pan;node.connect(panner).connect(channel==='sfx'?this.sfx!:this.music!);return panner;
 }
 private noise(duration:number,cutoff:number,volume:number,pan=0,channel:Channel='sfx',attack=0,hold=0):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.reserve(channel))return;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
  source.buffer=this.getNoise();source.loop=duration>1.4;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(80,cutoff*.18),now+duration);
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
    else{const heavy=['bomb','howitzer','mlrs'].includes(e.visual??'');this.noise(.06,5200,(heavy?.22:.14)*mix.gain,mix.pan);this.noise(heavy?.85:.42,heavy?500:1000,(heavy?.3:.2)*mix.gain,mix.pan);this.tone(heavy?38:62,heavy?.7:.35,'sine',.2*mix.gain,mix.pan);if(heavy)this.noise(1.6,380,.12*mix.gain,mix.pan,'sfx',.08,.1);else this.noise(.3,2600,.05*mix.gain,mix.pan,'sfx',.05,.02);}
   }else if(e.type==='death'){
    this.noise(e.big?.9:.25,e.big?650:1400,(e.big?.28:.1)*mix.gain,mix.pan);this.tone(e.big?42:85,.4,'triangle',.12*mix.gain,mix.pan);
    if(e.team===playerTeam&&ctx.currentTime-this.lastUnderAttack>4){this.lastUnderAttack=ctx.currentTime;this.ui('alert');}
   }else if(e.type==='build-complete'&&e.team===playerTeam)this.ui('research');
   else if(e.type==='hit')this.noise(.04,3000,.04*mix.gain,mix.pan);
   else if(e.type==='order-rejected'&&e.team===playerTeam)this.ui('deny');
   else if(e.type==='supply-delivered'&&e.team===playerTeam&&ctx.currentTime-this.lastSupply>1.5){this.lastSupply=ctx.currentTime;this.ui('queue');}
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

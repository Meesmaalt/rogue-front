import type {Entity,SimEvent,UnitKind} from '../sim/types';
import type {AudioCue} from './AudioVisual';
import {loadSettings,type GameSettings} from '../ui/Settings';
import config from '../data/audio.json';
type Channel='sfx'|'music';
export type UiSound='ready'|'siren'|'capture'|'lost'|'hover'|'warn'|'click'|'select'|'order'|'deny'|'queue'|'alert'|'research'|'victory'|'defeat';
type EngineClass=keyof typeof config.engines;
const INFANTRY=new Set<string>(config.infantryKinds);
const ENGINE_CLASS=new Map<string,EngineClass>();
for(const [cls,kinds] of Object.entries(config.engineKinds))for(const k of kinds)ENGINE_CLASS.set(k,cls as EngineClass);
interface EngineVoice{cls:EngineClass;sources:AudioScheduledSourceNode[];osc:OscillatorNode;filter:BiquadFilterNode;gain:GainNode;panner:StereoPannerNode;lfo:OscillatorNode|null;nodes:AudioNode[];approach:number}
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
 /** Rendering hook: called together with matching sounds so visuals stay in sync. */
 onCue:(cue:AudioCue)=>void=()=>{};
 private readonly knownIds=new Set<number>();private readonly knownHp=new Map<number,number>();private baseline=false;private lastReady=-10;private lastSiren=-100;private owners:Array<number|null|undefined>|null=null;private captureClock=0;
 private listenerFilter:BiquadFilterNode|null=null;private lastAnyUi=-10;
 private fireBed:{src:AudioBufferSourceNode;gain:GainNode;panner:StereoPannerNode;filter:BiquadFilterNode}|null=null;private fireClock=0;private birdTimer:number|null=null;private lastWarn=-100;
 private readonly engineVoices=new Map<number,EngineVoice>();private engineClock=0;
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
   const lp=this.listenerFilter=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=config.muffle.nearHz;this.sfx.connect(lp);lp.connect(compressor);compressor.connect(this.master);this.music.connect(this.master);this.master.connect(ctx.destination);
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
  src.connect(filter);filter.connect(gain);gain.connect(this.music);src.start();lfo.start();this.ambience={src,lfo,gain};this.scheduleBird();
 }
 private stopAmbience():void{
  if(this.birdTimer!==null){clearTimeout(this.birdTimer);this.birdTimer=null;}
  const a=this.ambience;if(!a)return;this.ambience=null;
  const at=this.ctx?.currentTime??0;try{a.src.stop(at);a.lfo.stop(at);}catch{/* already stopped */}a.src.disconnect();a.lfo.disconnect();a.gain.disconnect();
 }
 /** Per-vehicle engine beds for the loudest nearby units (call every frame; self-throttled to ~8 Hz). */
 engines(entities:readonly Entity[],dt:number,playerTeam=0):void{
  const ctx=this.ctx;
  if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0){this.dropAllEngines();return;}
  this.engineClock+=dt;if(this.engineClock<.125)return;const step=this.engineClock;this.engineClock=0;
  const cands:Array<{e:Entity;cls:EngineClass;mix:{gain:number;pan:number};speed:number;vx:number;vz:number;score:number}>=[];
  for(const e of entities){
   if(e.dead)continue;const cls=ENGINE_CLASS.get(e.kind);if(!cls)continue;
   if(cls==='hum'&&(e as {underConstruction?:boolean}).underConstruction)continue;
   const mix=spatialSound(e.x,e.z,this.listener);if(mix.gain<.03)continue;
   const vx=(e.x-e.px)*30,vz=(e.z-e.pz)*30,speed=Math.hypot(vx,vz);
   if(!(cls==='heli'||cls==='jet'||cls==='prop'||cls==='hum')&&speed<.4)continue;
   cands.push({e,cls,mix,speed,vx,vz,score:mix.gain*(cls==='jet'||cls==='heli'?1.4:cls==='hum'?.4:1)});
  }
  this.footstepsAndWork(entities,playerTeam);
  cands.sort((a,b)=>b.score-a.score);const keep=new Set<number>();
  for(const c of cands.slice(0,config.engineVoices)){
   const voice=this.engineVoices.get(c.e.id)??this.makeEngine(c.e.id,c.cls);if(!voice)break;keep.add(c.e.id);
   const p=config.engines[c.cls],t=ctx.currentTime,air=c.cls==='heli'||c.cls==='jet'||c.cls==='prop';
   const r=c.cls==='hum'?1:Math.max(air?.45:0,Math.min(1,c.speed/Math.max(1,c.e.def.speed)));
   const dist=Math.max(1,Math.hypot(this.listener.x-c.e.x,this.listener.z-c.e.z)),approach=(c.vx*(this.listener.x-c.e.x)+c.vz*(this.listener.z-c.e.z))/dist;
   const doppler=1+Math.max(-.3,Math.min(.3,approach/config.dopplerSpeed));
   voice.osc.frequency.setTargetAtTime(p[0]*(.75+.7*r)*doppler,t,.15);
   voice.filter.frequency.setTargetAtTime(p[1]*(.7+.8*r),t,.15);
   voice.gain.gain.setTargetAtTime(p[2]*c.mix.gain*(.3+.7*r),t,.15);
   voice.panner.pan.setTargetAtTime(c.mix.pan,t,.1);
   voice.lfo?.frequency.setTargetAtTime(p[4]*(.8+.4*r),t,.2);
   if(c.cls==='ship'&&r>.3&&Math.random()<.3)this.noise(.3,950,.03*c.mix.gain,c.mix.pan,'sfx',.04,.05);
   if(c.cls==='jet'&&voice.approach>0&&approach<=0&&dist<config.flyby.maxDist&&c.speed>config.flyby.minSpeed){this.noise(1.1,2600,config.flyby.volume*c.mix.gain,c.mix.pan,'sfx',.2,.05);this.tone(70,.5,'sine',.1*c.mix.gain,c.mix.pan);}
   voice.approach=approach;
  }
  for(const [id,v] of this.engineVoices)if(!keep.has(id))this.dropEngine(id,v);void step;
 }
 /** Infantry steps, construction clanks and low-supply warning share the ~8 Hz engine tick. */
 private footstepsAndWork(entities:readonly Entity[],playerTeam:number):void{
  const ctx=this.ctx;if(!ctx)return;
  const steps:Array<{mix:{gain:number;pan:number}}>=[],works:Array<{mix:{gain:number;pan:number}}>=[];let lowSupply=false,fresh=0,baseHit=false,hitAt:{x:number;z:number}|null=null;const seen=new Set<number>();
  for(const e of entities){
   if(e.dead)continue;
   if(e.team===playerTeam){
    seen.add(e.id);const constructing=(e as {underConstruction?:boolean}).underConstruction===true;
    if(!this.knownIds.has(e.id)&&!constructing&&!e.def.building)fresh++;
    if(e.def.building){const prev=this.knownHp.get(e.id);if(prev!==undefined&&e.hp<prev-1&&!constructing){baseHit=true;hitAt={x:e.x,z:e.z};}this.knownHp.set(e.id,e.hp);}
   }
   if(e.team===playerTeam&&e.maxSupply&&e.supply!==undefined&&e.supply<e.maxSupply*config.lowSupply.ratio&&!(e as {underConstruction?:boolean}).underConstruction&&e.def.weapon!=='none')lowSupply=true;
   const building=(e as {underConstruction?:boolean}).underConstruction===true;
   if(!building&&!INFANTRY.has(e.kind))continue;
   const mix=spatialSound(e.x,e.z,this.listener);
   if(building){if(mix.gain>=config.construction.minGain)works.push({mix});}
   else if(mix.gain>=config.footsteps.minGain&&Math.hypot(e.x-e.px,e.z-e.pz)*30>.5)steps.push({mix});
  }
  steps.sort((a,b)=>b.mix.gain-a.mix.gain);works.sort((a,b)=>b.mix.gain-a.mix.gain);
  for(const s of steps.slice(0,config.footsteps.max))if(Math.random()<config.footsteps.chance){this.noise(.05,1100+Math.random()*500,config.footsteps.volume*s.mix.gain,s.mix.pan);this.tone(70+Math.random()*25,.05,'sine',config.footsteps.volume*.5*s.mix.gain,s.mix.pan);}
  for(const w of works.slice(0,config.construction.max))if(Math.random()<config.construction.chance){const f=1300+Math.random()*700;this.noise(.03,5200,config.construction.volume*w.mix.gain,w.mix.pan);this.tone(f,.07,'square',config.construction.volume*.4*w.mix.gain,w.mix.pan);}
  const now=ctx.currentTime;
  if(this.baseline){
   if(fresh>0&&fresh<=6&&now-this.lastReady>1){this.lastReady=now;this.ui('ready');}
   if(baseHit&&now-this.lastSiren>12){this.lastSiren=now;this.ui('siren');this.onCue({kind:'siren',x:hitAt?.x,z:hitAt?.z});}
  }
  this.baseline=true;this.knownIds.clear();for(const id of seen)this.knownIds.add(id);
  for(const id of [...this.knownHp.keys()])if(!seen.has(id))this.knownHp.delete(id);
  if(lowSupply&&ctx.currentTime-this.lastWarn>config.lowSupply.cooldown){this.lastWarn=ctx.currentTime;this.ui('warn');}
 }
 /** Forest fire crackle + roar from visible burning cells (self-throttled to ~4 Hz). */
 fires(cells:()=>ReadonlyArray<{x:number;z:number;burnt?:boolean}>,dt:number,visible:(x:number,z:number)=>boolean=()=>true):void{
  const ctx=this.ctx;
  if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0){this.dropFire();return;}
  this.fireClock+=dt;if(this.fireClock<.25)return;this.fireClock=0;
  const near:Array<{gain:number;pan:number}>=[];
  for(const c of cells()){if(c.burnt)continue;const mix=spatialSound(c.x,c.z,this.listener);if(mix.gain>=.04&&visible(c.x,c.z))near.push(mix);}
  near.sort((a,b)=>b.gain-a.gain);
  const total=Math.min(1,near.slice(0,12).reduce((a,m)=>a+m.gain,0)*.15),pan=near[0]?.pan??0;
  if(!this.fireBed&&near.length&&this.sfx){
   const buf=this.getNoise();if(buf){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),panner=ctx.createStereoPanner();
    src.buffer=buf;src.loop=true;filter.type='bandpass';filter.frequency.value=650;filter.Q.value=.5;gain.gain.value=.0001;src.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(this.sfx);src.start();this.fireBed={src,gain,panner,filter};}
  }
  if(this.fireBed){this.fireBed.gain.gain.setTargetAtTime(Math.max(.0001,config.fire.roar*total),ctx.currentTime,.3);this.fireBed.panner.pan.setTargetAtTime(pan,ctx.currentTime,.3);}
  for(const m of near.slice(0,config.fire.maxPops))if(Math.random()<config.fire.popChance)this.noise(.025+Math.random()*.03,3200+Math.random()*2800,.035*m.gain,m.pan);
 }
 private dropFire():void{
  const f=this.fireBed;if(!f)return;this.fireBed=null;try{f.src.stop(this.ctx?.currentTime??0);}catch{/* stopped */}
  f.src.disconnect();f.filter.disconnect();f.gain.disconnect();f.panner.disconnect();
 }
 private scheduleBird():void{
  const b=config.birds;this.birdTimer=window.setTimeout(()=>{
   this.birdTimer=null;if(!this.ambience)return;
   if(this.activity<.1)this.chirp();
   this.scheduleBird();
  },(b.minDelay+Math.random()*(b.maxDelay-b.minDelay))*1000);
 }
 /** Tiny two-note bird call on the music bus; only when the battlefield is quiet. */
 private chirp():void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.musicVolume<=0||!this.reserve('music'))return;
  const o=ctx.createOscillator(),g=ctx.createGain(),now=ctx.currentTime,base=2600+Math.random()*1800,pan=Math.random()*1.4-.7;
  o.type='sine';o.frequency.setValueAtTime(base,now);o.frequency.exponentialRampToValueAtTime(base*1.35,now+.06);o.frequency.exponentialRampToValueAtTime(base*.9,now+.16);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(config.birds.volume,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+.18);
  const panner=this.route(g,'music',pan);o.connect(g);o.onended=()=>{this.voices.music--;o.disconnect();g.disconnect();panner.disconnect();};o.start(now);o.stop(now+.2);
 }
 private makeEngine(id:number,cls:EngineClass):EngineVoice|null{
  const ctx=this.ctx,sfx=this.sfx,buf=this.getNoise();if(!ctx||!sfx||!buf)return null;
  const p=config.engines[cls],osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),chop=ctx.createGain(),gain=ctx.createGain(),panner=ctx.createStereoPanner();
  const noise=ctx.createBufferSource(),nf=ctx.createBiquadFilter(),ng=ctx.createGain(),sources:AudioScheduledSourceNode[]=[osc,noise],nodes:AudioNode[]=[osc,filter,chop,gain,panner,noise,nf,ng];
  osc.type=cls==='hum'?'sine':'sawtooth';osc.frequency.value=p[0];filter.type='lowpass';filter.frequency.value=p[1];
  noise.buffer=buf;noise.loop=true;nf.type='lowpass';nf.frequency.value=p[3];ng.gain.value=cls==='jet'?1.6:.7;
  chop.gain.value=p[4]>0?.65:1;gain.gain.value=.0001;panner.pan.value=0;
  let lfo:OscillatorNode|null=null;
  if(p[4]>0){lfo=ctx.createOscillator();const depth=ctx.createGain();lfo.type='sine';lfo.frequency.value=p[4];depth.gain.value=.35;lfo.connect(depth);depth.connect(chop.gain);sources.push(lfo);nodes.push(lfo,depth);}
  osc.connect(filter);filter.connect(chop);noise.connect(nf);nf.connect(ng);ng.connect(chop);chop.connect(gain);gain.connect(panner);panner.connect(sfx);
  const t=ctx.currentTime;for(const src of sources)src.start(t);
  const voice:EngineVoice={cls,sources,osc,filter,gain,panner,lfo,nodes,approach:0};this.engineVoices.set(id,voice);return voice;
 }
 private dropEngine(id:number,v:EngineVoice):void{
  this.engineVoices.delete(id);const at=(this.ctx?.currentTime??0)+.05;
  v.gain.gain.setTargetAtTime(.0001,this.ctx?.currentTime??0,.03);
  for(const src of v.sources){try{src.stop(at);}catch{/* already stopped */}}
  for(const n of v.nodes){try{n.disconnect();}catch{/* detached */}}
 }
 private dropAllEngines():void{this.dropFire();for(const [id,v] of [...this.engineVoices])this.dropEngine(id,v);}
 /** Radio acknowledgement: two vowel-like syllables through a narrow radio band; faction sets pitch and vowels. */
 ack(kind?:UnitKind,faction='usa',type:'select'|'order'='select'):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0)return;
  const now=ctx.currentTime;if(now-(this.lastUi.get('ack')??-10)<.15)return;this.lastUi.set('ack',now);
  const cls=kind?ENGINE_CLASS.get(kind):undefined,voices=config.voices as Record<string,{f0:number;syl:number[][]}>,v=voices[faction]??voices.usa;
  const pitch=cls==='tracked'||cls==='ship'?.85:cls==='wheeled'?.95:cls==='heli'||cls==='jet'||cls==='prop'?1.05:1.15;
  const syl=type==='order'?[...v.syl].reverse():v.syl;
  this.noise(.07,3600,.026);
  syl.forEach((f,i)=>{const run=()=>this.syllable(v.f0*pitch*(type==='order'&&i===syl.length-1?1.08:1),f[0],f[1]);if(i===0)run();else window.setTimeout(run,i*95);});
 }
 private syllable(f0:number,f1:number,f2:number):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.sfx||!this.reserve('sfx'))return;
  const now=ctx.currentTime,osc=ctx.createOscillator(),b1=ctx.createBiquadFilter(),b2=ctx.createBiquadFilter(),sum=ctx.createGain(),env=ctx.createGain();
  osc.type='sawtooth';osc.frequency.setValueAtTime(f0*1.06,now);osc.frequency.exponentialRampToValueAtTime(f0*.94,now+.1);
  b1.type='bandpass';b1.frequency.value=f1;b1.Q.value=7;b2.type='bandpass';b2.frequency.value=f2;b2.Q.value=9;sum.gain.value=1.4;
  env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(.09,now+.015);env.gain.exponentialRampToValueAtTime(.0001,now+.1);
  osc.connect(b1);osc.connect(b2);b1.connect(sum);b2.connect(sum);sum.connect(env);env.connect(this.sfx);
  osc.onended=()=>{this.voices.sfx--;for(const n of [osc,b1,b2,sum,env])n.disconnect();};osc.start(now);osc.stop(now+.12);
 }
 /** Incoming-shell whistle: falling pitch plus airy noise. */
 private whistle(pan:number,gain:number):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||!this.sfx||!this.reserve('sfx'))return;
  const now=ctx.currentTime,len=config.whistle.delay,o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.setValueAtTime(3400,now);o.frequency.exponentialRampToValueAtTime(1300,now+len);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,config.whistle.volume*gain),now+len*.9);g.gain.exponentialRampToValueAtTime(.0001,now+len);
  const panner=this.route(g,'sfx',pan);o.connect(g);o.onended=()=>{this.voices.sfx--;o.disconnect();g.disconnect();panner.disconnect();};o.start(now);o.stop(now+len+.02);
  this.noise(len,5200,config.whistle.volume*.5*gain,pan,'sfx',len*.7,.05);
 }
 /** Non-positional interface cues. Throttled per kind so spam-clicking stays clean. */
 ui(kind:UiSound):void{
  const ctx=this.ctx;if(!ctx||ctx.state!=='running'||this.settings.masterVolume<=0||this.settings.sfxVolume<=0)return;
  const now=ctx.currentTime,soft=kind==='click'||kind==='hover';if(now-(this.lastUi.get(kind)??-10)<.045||(soft&&now-this.lastAnyUi<.08))return;this.lastUi.set(kind,now);if(!soft)this.lastAnyUi=now;
  const t=(f:number,d:number,v:number,type:OscillatorType='sine',delay=0)=>{if(delay>0)window.setTimeout(()=>this.uiTone(f,d,v,type),delay*1000);else this.uiTone(f,d,v,type);};
  switch(kind){
   case'warn':t(740,.14,.055,'triangle');t(554,.2,.055,'triangle',.15);break;
   case'ready':t(523,.06,.04);t(659,.06,.04,'sine',.06);t(784,.1,.045,'sine',.12);break;
   case'siren':[600,450,600,450].forEach((f,i)=>t(f,.28,.045,'square',i*.3));break;
   case'capture':t(392,.12,.045,'triangle');t(523,.12,.045,'triangle',.11);t(659,.2,.05,'triangle',.22);break;
   case'lost':t(440,.12,.045,'triangle');t(330,.12,.045,'triangle',.11);t(262,.22,.05,'triangle',.22);break;
   case'hover':t(1800,.025,.012);break;
   case'click':t(1100,.05,.045,'triangle');break;
   case'select':t(660,.07,.05);t(990,.06,.035,'sine',.045);break;
   case'order':t(440,.06,.05,'triangle');t(587,.09,.05,'triangle',.06);break;
   case'deny':t(190,.14,.07,'square');t(150,.18,.06,'square',.11);break;
   case'queue':t(784,.07,.04);t(1047,.1,.035,'sine',.07);break;
   case'research':t(523,.14,.045);t(659,.14,.045,'sine',.12);t(784,.22,.05,'sine',.24);break;
   case'alert':t(880,.12,.06,'square');t(660,.16,.06,'square',.16);t(880,.12,.06,'square',.34);break;
   case'victory':this.stinger(true);break;
   case'defeat':this.stinger(false);break;
  }
 }
/** ~8 s result music: four pad chords and a resolving final chord (major for victory, minor for defeat). */
 private stinger(win:boolean):void{
  const chords=win?[[261.63,329.63,392],[392,493.88,587.33],[440,523.25,659.25],[349.23,440,523.25],[261.63,329.63,392,523.25]]:[[220,261.63,329.63],[174.61,220,261.63],[196,233.08,293.66],[146.83,174.61,220],[110,130.81,164.81]];
  chords.forEach((c,i)=>{
   const last=i===chords.length-1,len=last?3:1.5;
   const run=()=>{for(const f of c)this.uiTone(f,len,.035,'triangle');this.uiTone(c[0]/2,len,.05,'sine');if(last||i===0)this.noise(.6,win?2400:300,.05);};
   if(i===0)run();else window.setTimeout(run,i*1500);
  });
 }
 /** Resource-site ownership changes: rising cue when you take a site, falling cue when you lose one. */
 capture(points:()=>ReadonlyArray<{x:number;z:number;controlledBy?:number|null}>,dt:number,playerTeam=0):void{
  this.captureClock+=dt;if(this.captureClock<.25)return;this.captureClock=0;
  const now=points(),prev=this.owners;this.owners=now.map(p=>p.controlledBy);if(!prev||prev.length!==now.length)return;
  let won:{x:number;z:number}|null=null,lost:{x:number;z:number}|null=null;
  for(let i=0;i<now.length;i++){const o=now[i].controlledBy;if(o===prev[i])continue;if(o===playerTeam)won=now[i];else if(prev[i]===playerTeam)lost=now[i];}
  if(won){this.ui('capture');this.onCue({kind:'capture',x:(won as {x:number}).x,z:(won as {z:number}).z});}
  else if(lost){this.ui('lost');this.onCue({kind:'lost',x:(lost as {x:number}).x,z:(lost as {z:number}).z});}
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
 setListener(x:number,z:number,yaw:number,dist=0):void{
  this.listener={x,z,yaw};const m=config.muffle,f=this.listenerFilter,ctx=this.ctx;if(!f||!ctx)return;
  const k=Math.max(0,Math.min(1,(dist-m.nearDist)/(m.farDist-m.nearDist)));f.frequency.setTargetAtTime(m.nearHz+(m.farHz-m.nearHz)*k,ctx.currentTime,.2);
 }
 unlock():void{const ctx=this.ensure();if(ctx?.state==='suspended')void ctx.resume();}
 pause():void{this.stopMusic();this.dropAllEngines();if(this.ctx?.state==='running')void this.ctx.suspend();}
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
    else{const shell=['bomb','howitzer','mlrs','mortar'].includes(e.visual??''),boom=()=>{const heavy=['bomb','howitzer','mlrs'].includes(e.visual??'');this.noise(.06,5200,(heavy?.22:.14)*mix.gain,mix.pan);this.noise(heavy?.85:.42,heavy?500:1000,(heavy?.3:.2)*mix.gain,mix.pan);this.tone(heavy?38:62,heavy?.7:.35,'sine',.2*mix.gain,mix.pan);this.activity=Math.min(1,this.activity+(heavy?.1:.03)*mix.gain);this.onCue({kind:'impact',x:e.x,z:e.z,intensity:mix.gain*(heavy?1:.3)});if(heavy)this.noise(1.6,380,.12*mix.gain,mix.pan,'sfx',.08,.1);else this.noise(.3,2600,.05*mix.gain,mix.pan,'sfx',.05,.02);};if(shell&&mix.gain>=config.whistle.minGain){this.whistle(mix.pan,mix.gain);window.setTimeout(boom,config.whistle.delay*1000);}else boom();}
   }else if(e.type==='death'){
    this.activity=Math.min(1,this.activity+(e.big?.25:.08)*mix.gain);
    this.noise(e.big?.9:.25,e.big?650:1400,(e.big?.28:.1)*mix.gain,mix.pan);this.tone(e.big?42:85,.4,'triangle',.12*mix.gain,mix.pan);
    if(e.team===playerTeam&&ctx.currentTime-this.lastUnderAttack>4){this.lastUnderAttack=ctx.currentTime;this.ui('alert');this.onCue({kind:'alert',x:e.x,z:e.z});}
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
    (this.activity>.5?config.tenseChordRatios:config.chordRatios).forEach((r,i)=>this.tone(root*2*r,12.3,'triangle',.019,(i-1)*.36,'music',1.8));
    this.tone(root,11.8,'sine',.037,0,'music',1.2);
    this.noise(8,380,.018,-.25,'music',1.5,1);
  }
  if(step%32===24&&this.activity<.3)this.tone(root*8*config.bellRatios[(step*7)%config.bellRatios.length],3.2,'sine',.012,((step*3)%5-2)*.3,'music',.03);
  if(step%8===0){this.tone(44,.65,'sine',.045,0,'music',.015);this.noise(.55,180,.025,.18,'music',.006,.01);}
  if(this.activity>.5&&step%16===8)this.tone(root*2*1.0595,6,'sawtooth',.012,.3,'music',1.2);
  if(this.activity>.45&&step%4===0)this.tone(52,.3,'sine',.05,0,'music',.01);
  if(this.activity>.55&&step%4===2)this.noise(.14,900,.022,.15,'music',.004,.01);
  if(this.activity>.35&&step%8===4)this.noise(.32,460,.018,-.2,'music',.008,.02);
 }
}

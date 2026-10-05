import type { SimEvent } from "../sim/types";
import { loadSettings, type GameSettings } from "../ui/Settings";

/** Väike Web Audio helikiht: ei vaja binaarseid helifaile ega välist runtime-sõltuvust. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = loadSettings();
  private musicTimer: number | null = null;
  private musicStep = 0;
  private noiseBuffer:AudioBuffer|null=null;
  private lastShot=new Map<string,number>();

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = new AudioContext(); } catch { return null; }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
  setSettings(settings: GameSettings): void { this.settings = settings; }
  unlock(): void { this.ensure(); }
  pause(): void { if (this.ctx?.state === "running") void this.ctx.suspend(); }
  resume(): void { if (this.ctx?.state === "suspended") void this.ctx.resume(); }
  startMusic(): void {
    if (this.musicTimer !== null) return;
    this.musicTimer = window.setInterval(() => this.musicTick(), 1200);
  }
  stopMusic(): void { if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; } }
  private lastUnderAttack = 0;
  events(events: readonly SimEvent[], _playerTeam = 0): void {
    for (const e of events) {
      if (e.type === "fire") {
        const kind=e.weapon??"bullet",now=this.ctx?.currentTime??0;
        if(now-(this.lastShot.get(kind)??-1)<(kind==="bullet"?.055:.08))continue;this.lastShot.set(kind,now);
        if(kind==="missile")this.noise(.38,650,.16);
        else if(kind==="cannon"){this.noise(.2,(e.caliber??20)>15?450:1300,.22);this.tone(55,.18,"triangle",.14);}
        else this.noise(.065,2300,.12);
      }
      else if(e.type==="impact"){this.noise(.23,380,.16);this.tone(46,.16,"triangle",.1);}
      else if (e.type === "hit") this.tone(75, .05, "sawtooth", .1);
      else if (e.type === "death") {
        this.tone(e.big ? 48 : 62, e.big ? .24 : .12, "sawtooth", e.big ? .2 : .13);
        // Own unit death → under attack sting (throttled)
        if (performance.now() - this.lastUnderAttack > 4000) {
          this.lastUnderAttack = performance.now();
          this.tone(90, .08, "square", .14);
          this.tone(60, .18, "sawtooth", .12);
        }
      }
      else if (e.type === "build-complete") this.tone(520, .12, "sine", .12);
      else if (e.type === "repair-complete") this.tone(720, .08, "sine", .1);
    }
  }
  private noise(duration:number,cutoff:number,volume:number):void {
    const ctx=this.ensure();if(!ctx||this.settings.masterVolume<=0)return;
    if(!this.noiseBuffer){this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
    source.buffer=this.noiseBuffer;filter.type="lowpass";filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(100,now+duration);
    gain.gain.setValueAtTime(Math.max(.0001,volume*this.settings.masterVolume*this.settings.sfxVolume),now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter).connect(gain).connect(ctx.destination);source.start(now);source.stop(now+duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  private musicTick(): void {
    const notes = [110, 131, 147, 98, 123, 147, 110, 82];
    this.tone(notes[this.musicStep++ % notes.length], .16, "triangle", .055, this.settings.musicVolume);
  }
  private tone(freq: number, duration: number, type: OscillatorType, gainValue: number, channel = 1): void {
    const ctx = this.ensure(); if (!ctx || this.settings.masterVolume <= 0) return;
    const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue * this.settings.masterVolume * channel * this.settings.sfxVolume), now + .008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + duration + .02);
  }
}

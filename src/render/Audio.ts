import type { SimEvent } from "../sim/types";
import { loadSettings, type GameSettings } from "../ui/Settings";

/** Väike Web Audio helikiht: ei vaja binaarseid helifaile ega välist runtime-sõltuvust. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = loadSettings();
  private musicTimer: number | null = null;
  private musicStep = 0;

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
  events(events: readonly SimEvent[], playerTeam = 0): void {
    for (const e of events) {
      if (e.type === "fire") this.tone(110 + e.team * 35, .06, "square", .12);
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

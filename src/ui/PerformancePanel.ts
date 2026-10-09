import {loadSettings,saveSettings} from "./Settings";
import type { FrameMetrics } from "../core/GameLoop";

const CAPACITY = 600;
const STAGES = ["vaated", "3D", "udu", "HUD"] as const;
type Stage = typeof STAGES[number];
interface SceneMetrics { calls: number; triangles: number; units: number; worldTime: number; quality: string; width: number; height: number }

/** Optional bounded diagnostics. CPU submission is deliberately not labelled GPU time. */
export class PerformancePanel {
  enabled = false;
  private readonly root = document.createElement("aside");
  private readonly readout = document.createElement("pre");
  private readonly frames = new Float64Array(CAPACITY);
  private index = 0;
  private count = 0;
  private samples = 0;
  private elapsed = 0;
  private suspended = 0;
  private simulation = 0;
  private rendering = 0;
  private steps = 0;
  private spikes = 0;
  private nextRefresh = 0;
  private stamp = 0;
  private stages: Record<Stage, number> = { vaated: 0, "3D": 0, udu: 0, HUD: 0 };
  private stageTotals: Record<Stage, number> = { vaated: 0, "3D": 0, udu: 0, HUD: 0 };
  private readonly history: object[] = [];

  constructor(enabled = false) {
    this.root.className = "performance-panel";
    this.root.setAttribute("aria-label", "Jõudluse mõõtmine");
    const title = document.createElement("strong"); title.textContent = "Jõudlus · F8";
    const reset = document.createElement("button"); reset.textContent = "Uus mõõtmine"; reset.onclick = () => this.reset();
    const download = document.createElement("button"); download.textContent = "Salvesta mõõtmine";
    download.onclick = () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ gpuTiming: "not measured", snapshots: this.history }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "rogue-front-performance.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    this.root.append(title, this.readout, reset, download); document.body.append(this.root);
    addEventListener("keydown", e => { if (e.code === "F8" && !e.repeat) { e.preventDefault(); this.setEnabled(!this.enabled); const settings=loadSettings();settings.performanceOverlay=this.enabled;try{saveSettings(settings);}catch{/* Diagnostics remain usable without storage. */} } });
    this.setEnabled(enabled);
  }
  setEnabled(enabled: boolean): void {
    if (enabled && !this.enabled) this.reset();
    this.enabled = enabled; this.root.hidden = !enabled;
  }
  reset(): void {
    this.index = this.count = this.samples = this.elapsed = this.suspended = this.simulation = this.rendering = this.steps = this.spikes = this.nextRefresh = 0;
    for (const stage of STAGES) this.stageTotals[stage] = 0;
    this.history.length = 0; this.readout.textContent = "Liiguta kaamerat ja mängi lahingut. Mõõdikud uuenevad 2 korda sekundis.";
  }
  begin(): void { if (this.enabled) { this.stamp = performance.now(); for (const stage of STAGES) this.stages[stage] = 0; } }
  mark(stage: Stage): void { if (this.enabled) { const now = performance.now(); this.stages[stage] += now - this.stamp; this.stamp = now; } }
  record(frame: FrameMetrics, scene: SceneMetrics): void {
    this.suspended += frame.suspendedMs;
    if (frame.frameMs <= 0) return;
    this.frames[this.index] = frame.frameMs; this.index = (this.index + 1) % CAPACITY; this.count = Math.min(CAPACITY, this.count + 1);
    this.samples++; this.elapsed += frame.frameMs; this.simulation += frame.simulationMs; this.rendering += frame.renderMs; this.steps += frame.steps;
    for (const stage of STAGES) this.stageTotals[stage] += this.stages[stage];
    if (frame.frameMs > 100) this.spikes++;
    if (this.elapsed < this.nextRefresh) return;
    this.nextRefresh = this.elapsed + 500;
    const sorted = Array.from(this.frames.subarray(0, this.count)).sort((a,b) => a-b);
    const percentile = (p:number) => sorted[Math.min(sorted.length-1, Math.ceil(sorted.length*p)-1)];
    const stageMeans = { vaated: this.stageTotals.vaated / this.samples, "3D": this.stageTotals["3D"] / this.samples, udu: this.stageTotals.udu / this.samples, HUD: this.stageTotals.HUD / this.samples };
    const snapshot = { seconds: this.elapsed / 1000, frames: this.samples, fps: this.samples * 1000 / this.elapsed,
      median: percentile(.5), p95: percentile(.95), p99: percentile(.99), spikes: this.spikes,
      simulationMeanMs: this.simulation / this.samples, renderMeanMs: this.rendering / this.samples,
      steps: this.steps, debtMs: frame.debtMs, suspendedMs: this.suspended, stageMeanMs: stageMeans, ...scene };
    this.history.push(snapshot); if (this.history.length > 180) this.history.shift();
    const ms = (n:number) => n.toFixed(1);
    this.readout.textContent = `${scene.quality} · ${scene.width}×${scene.height} · ${scene.units} üksust\n` +
      `FPS ${Math.round(snapshot.fps)} · kaadriaeg (viimased ${this.count})\n` +
      `mediaan ${ms(snapshot.median)} · p95 ${ms(snapshot.p95)} · p99 ${ms(snapshot.p99)} ms\n` +
      `Üle 100 ms kaadreid: ${this.spikes}\n` +
      `CPU keskmine: sim ${ms(snapshot.simulationMeanMs)} · esitus ${ms(snapshot.renderMeanMs)} ms\n` +
      `CPU vaated ${ms(stageMeans.vaated)} · 3D ${ms(stageMeans["3D"])}\n` +
      `udu ${ms(stageMeans.udu)} · HUD ${ms(stageMeans.HUD)} ms\n` +
      `Joonistuskäsud ${scene.calls} · kolmnurgad ${scene.triangles}\n` +
      `Sim-sammud ${this.steps} · mahajäämus ${ms(frame.debtMs)} ms\n` +
      `Mänguaeg ${ms(scene.worldTime)} s · taustapaus ${ms(this.suspended/1000)} s\nGPU aeg: mõõtmata`;
  }
}

/** Presentation metrics; never read by the deterministic simulation. */
export interface FrameMetrics {
  frameMs: number;
  simulationMs: number;
  renderMs: number;
  steps: number;
  debtMs: number;
  suspendedMs: number;
}

/** Fixed simulation steps with bounded work per frame, without dropping active time. */
export class GameLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  private suspended = false;
  private suspendedElapsed = 0;

  constructor(
    private readonly step: number,
    private readonly update: (dt: number) => boolean | void,
    private readonly render: (alpha: number, frameDt: number) => void,
    private readonly observe?: (metrics: FrameMetrics) => void,
    private readonly measuring: () => boolean = () => false,
  ) {}

  start(): void {
    this.stop();
    this.last = performance.now();
    this.suspended = document.hidden;
    document.addEventListener("visibilitychange", this.visibilityChanged);
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      this.advance(now);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private readonly visibilityChanged = (): void => {
    if (document.hidden) this.suspended = true;
  };

  /** Exposed for a short scheduling regression without running a browser match. */
  advance(now: number): void {
    const elapsed = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    // Background tabs do not accumulate an hours-long local catch-up queue.
    // Network packets remain authoritative and are never discarded here.
    if (document.hidden) { this.suspended = true; this.suspendedElapsed += elapsed; return; }
    const suspendedMs = this.suspended ? (this.suspendedElapsed + elapsed) * 1000 : 0;
    this.suspendedElapsed = 0;
    const frame = this.suspended ? 0 : elapsed;
    this.suspended = false;
    this.acc += frame;
    const measure = this.measuring();
    const start = measure ? performance.now() : 0;
    let steps = 0, attempts = 0;
    while (this.acc + 1e-10 >= this.step && attempts < 3) {
      if (this.update(this.step) !== false) steps++;
      this.acc = Math.max(0, this.acc - this.step);
      attempts++;
    }
    const renderStart = measure ? performance.now() : 0;
    // When behind, hold the latest pose instead of extrapolating or wrapping alpha.
    this.render(Math.min(1, this.acc / this.step), Math.min(.1, frame));
    if (measure) this.observe?.({ frameMs: frame * 1000, simulationMs: renderStart - start,
      renderMs: performance.now() - renderStart, steps, debtMs: Math.max(0, this.acc - this.step) * 1000, suspendedMs });
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.visibilityChanged);
  }
}

/**
 * Fikseeritud sammuga simulatsioon + muutuva sammuga renderdus.
 * update() kutsutakse alati sama dt-ga (deterministlik), render() saab interpolatsiooni alpha.
 */
export class GameLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;

  constructor(
    private readonly step: number,
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number, frameDt: number) => void,
  ) {}

  start(): void {
    this.last = performance.now();
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick);
      const frame = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.acc += frame;
      // Cap sim steps per frame – prevents death spiral when a frame is slow
      let steps = 0;
      while (this.acc >= this.step && steps < 3) {
        this.update(this.step);
        this.acc -= this.step;
        steps++;
      }
      if (this.acc >= this.step) this.acc = this.step * 0.99;
      this.render(this.acc / this.step, frame);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }
}

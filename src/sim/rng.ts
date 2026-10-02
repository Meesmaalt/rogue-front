/** Deterministlik juhuarvugeneraator, mille olekut saab salvestada/replay jaoks taastada. */
export class Rng {
  private state: number;
  constructor(seed = 1) { this.state = seed | 0; }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  getState(): number { return this.state; }
  setState(state: number): void { this.state = state | 0; }
}

export function mulberry32(seed: number): () => number {
  const rng = new Rng(seed);
  return () => rng.next();
}

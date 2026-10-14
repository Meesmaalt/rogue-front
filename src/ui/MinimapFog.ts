import type { Vision } from "../sim/Vision";
import type { Team } from "../sim/types";

type VisibilityGrid = Pick<Vision, "width" | "height" | "revision" | "copyStates">;

/** One bulk canvas upload replaces a draw command for every visibility cell. */
export class MinimapFog {
  private readonly canvas = document.createElement("canvas");
  private readonly context: CanvasRenderingContext2D;
  private readonly states: Uint8Array;
  private readonly image: ImageData;
  private revision = -1;
  private team: Team | null = null;

  constructor(private readonly vision: VisibilityGrid) {
    this.canvas.width = vision.width;
    this.canvas.height = vision.height;
    this.context = this.canvas.getContext("2d")!;
    this.states = new Uint8Array(vision.width * vision.height);
    this.image = this.context.createImageData(vision.width, vision.height);
    const pixels = this.image.data;
    for (let i = 0; i < this.states.length; i++) {
      pixels[i * 4] = 5; pixels[i * 4 + 1] = 8; pixels[i * 4 + 2] = 9;
    }
  }

  draw(target: CanvasRenderingContext2D, team: Team, width: number, height: number): void {
    if (this.revision !== this.vision.revision || this.team !== team) {
      this.vision.copyStates(team, this.states);
      const pixels = this.image.data;
      for (let i = 0; i < this.states.length; i++) {
        pixels[i * 4 + 3] = this.states[i] === 2 ? 0 : this.states[i] === 1 ? 122 : 219;
      }
      this.context.putImageData(this.image, 0, 0);
      this.revision = this.vision.revision;
      this.team = team;
    }
    target.drawImage(this.canvas, 0, 0, width, height);
  }
}

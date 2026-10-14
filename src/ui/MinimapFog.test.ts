import { afterEach, expect, it, vi } from "vitest";
import { MinimapFog } from "./MinimapFog";

afterEach(() => vi.unstubAllGlobals());

function fixture(width: number, height: number) {
  const putImageData = vi.fn(), createImageData = vi.fn((w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }));
  const context = { createImageData, putImageData, fillRect: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: () => context };
  vi.stubGlobal("document", { createElement: () => canvas });
  const states = [new Uint8Array(width * height), new Uint8Array(width * height)];
  const vision = { width, height, revision: 1, copyStates: vi.fn((team: 0 | 1, target: Uint8Array) => target.set(states[team])) };
  const drawImage = vi.fn(), target = { drawImage } as unknown as CanvasRenderingContext2D;
  return { fog: new MinimapFog(vision), vision, states, canvas, context, target, drawImage };
}

it("preserves the visibility grid orientation and all three states without per-cell canvas draws", () => {
  const f = fixture(3, 2);
  f.states[0].set([0, 1, 2, 2, 1, 0]);
  f.fog.draw(f.target, 0, 176, 176);
  const pixels = f.context.putImageData.mock.calls[0][0].data as Uint8ClampedArray;
  expect(Array.from(pixels)).toEqual([5,8,9,219, 5,8,9,122, 5,8,9,0, 5,8,9,0, 5,8,9,122, 5,8,9,219]);
  expect(f.canvas.width).toBe(3); expect(f.canvas.height).toBe(2);
  expect(f.context.fillRect).not.toHaveBeenCalled();
  expect(f.drawImage).toHaveBeenCalledWith(f.canvas, 0, 0, 176, 176);
});

it("reuses buffers until vision changes, including team switches and a restored/reset revision", () => {
  const f = fixture(4, 4);
  f.states[0][3] = 2; f.fog.draw(f.target, 0, 176, 176);
  const image = f.context.putImageData.mock.calls[0][0];
  f.fog.draw(f.target, 0, 176, 176);
  expect(f.vision.copyStates).toHaveBeenCalledTimes(1);
  expect(f.context.putImageData).toHaveBeenCalledTimes(1);
  f.fog.draw(f.target, 1, 176, 176); expect(image.data[15]).toBe(219);
  f.fog.draw(f.target, 0, 176, 176); expect(image.data[15]).toBe(0);
  f.states[0][3] = 1; f.vision.revision++; f.fog.draw(f.target, 0, 176, 176); expect(image.data[15]).toBe(122);
  f.states[0].fill(0); f.vision.revision++; f.fog.draw(f.target, 0, 176, 176); expect(image.data[15]).toBe(219);
  expect(f.context.createImageData).toHaveBeenCalledTimes(1);
  expect(f.context.putImageData.mock.calls.every(call => call[0] === image)).toBe(true);
});

it("a 2048 m map needs one bulk upload and one composite for its 262144 fog cells", () => {
  const f = fixture(512, 512);
  f.states[0][512 * 300 + 200] = 2;
  f.fog.draw(f.target, 0, 176, 176);
  const pixels = f.context.putImageData.mock.calls[0][0].data as Uint8ClampedArray;
  expect(pixels[(512 * 300 + 200) * 4 + 3]).toBe(0);
  expect(pixels[(512 * 300 + 201) * 4 + 3]).toBe(219);
  expect(f.context.putImageData).toHaveBeenCalledTimes(1);
  expect(f.drawImage).toHaveBeenCalledTimes(1);
  expect(f.context.fillRect).not.toHaveBeenCalled();
});

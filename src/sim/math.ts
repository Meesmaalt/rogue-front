import type { Point } from "./types";
export const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};
export const turnToward = (cur: number, want: number, max: number): number => {
  const d = wrapAngle(want - cur);
  return Math.abs(d) <= max ? want : cur + Math.sign(d) * max;
};
export const dist2d = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z);

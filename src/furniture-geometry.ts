import type { Point } from "./model";
export interface Box extends Point {
  w: number;
  h: number;
  angle?: number;
}
export function localPoint(p: Point, o: Point & { angle?: number }): Point {
  const c = Math.cos(o.angle ?? 0),
    s = Math.sin(o.angle ?? 0);
  return {
    x: (p.x - o.x) * c + (p.y - o.y) * s,
    y: -(p.x - o.x) * s + (p.y - o.y) * c,
  };
}
export function worldPoint(p: Point, o: Point & { angle?: number }): Point {
  const c = Math.cos(o.angle ?? 0),
    s = Math.sin(o.angle ?? 0);
  return { x: o.x + p.x * c - p.y * s, y: o.y + p.x * s + p.y * c };
}
export function boxBounds(o: Box) {
  const c = Math.abs(Math.cos(o.angle ?? 0)),
    s = Math.abs(Math.sin(o.angle ?? 0));
  return { w: o.w * c + o.h * s, h: o.w * s + o.h * c };
}
/** Separating axes of both rectangles, including rotated corners. */
export function boxesOverlap(a: Box, b: Box, pad = 0) {
  const ac = Math.cos(a.angle ?? 0),
    as = Math.sin(a.angle ?? 0),
    bc = Math.cos(b.angle ?? 0),
    bs = Math.sin(b.angle ?? 0);
  for (const [x, y] of [
    [ac, as],
    [-as, ac],
    [bc, bs],
    [-bs, bc],
  ]) {
    const ra =
        (Math.abs(x * ac + y * as) * a.w) / 2 +
        (Math.abs(-x * as + y * ac) * a.h) / 2,
      rb =
        (Math.abs(x * bc + y * bs) * b.w) / 2 +
        (Math.abs(-x * bs + y * bc) * b.h) / 2;
    if (Math.abs((a.x - b.x) * x + (a.y - b.y) * y) >= ra + rb + pad - 1e-8)
      return false;
  }
  return true;
}
export function surfacePoint(p: Point, o: Box) {
  const q = localPoint(p, o);
  return worldPoint(
    {
      x: Math.max(-o.w / 2, Math.min(q.x, o.w / 2)),
      y: Math.max(-o.h / 2, Math.min(q.y, o.h / 2)),
    },
    o,
  );
}

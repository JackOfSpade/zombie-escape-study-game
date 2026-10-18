import { type Floor, type Furniture, type Point, distance } from "./model";
import { inFurniture, wall } from "./spatial";

export const VISION = { lit: 11, dim: 8, dark: 5.4, max: 11 };
export function sightRadius(f: Floor) {
  return f.dark > 0.8 ? VISION.dark : f.dark > 0.3 ? VISION.dim : VISION.lit;
}
export function blocksSight(o: Furniture) {
  return (
    !o.destroyed &&
    !o.open &&
    !(o.kind === "gate" && o.turning < 0) &&
    ["gate", "door", "fridge", "shelf"].includes(o.kind)
  );
}
// Slab intersection against an opaque object's real footprint. All distances
// are world-space, independent of canvas size, heading, palette, and frame rate.
export function rayBoxDistance(
  origin: Point,
  dx: number,
  dy: number,
  o: Pick<Furniture, "x" | "y" | "w" | "h">,
) {
  let near = -Infinity,
    far = Infinity;
  for (const [start, dir, lo, hi] of [
    [origin.x, dx, o.x - o.w / 2, o.x + o.w / 2],
    [origin.y, dy, o.y - o.h / 2, o.y + o.h / 2],
  ]) {
    if (Math.abs(dir) < 1e-10) {
      if (start < lo || start > hi) return Infinity;
      continue;
    }
    const a = (lo - start) / dir,
      b = (hi - start) / dir;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return Infinity;
  }
  return far < 0 ? Infinity : Math.max(0, near);
}
export function rayDistance(
  f: Floor,
  origin: Point,
  angle: number,
  range: number,
  ignore?: string,
) {
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  let x = Math.floor(origin.x),
    y = Math.floor(origin.y),
    hit = Math.max(0, range);
  if (wall(f, origin.x, origin.y)) return 0;
  const sx = dx < 0 ? -1 : 1,
    sy = dy < 0 ? -1 : 1;
  const stepX = Math.abs(dx) < 1e-10 ? Infinity : Math.abs(1 / dx),
    stepY = Math.abs(dy) < 1e-10 ? Infinity : Math.abs(1 / dy);
  let nextX =
    Math.abs(dx) < 1e-10
      ? Infinity
      : (dx > 0 ? x + 1 - origin.x : origin.x - x) / Math.abs(dx);
  let nextY =
    Math.abs(dy) < 1e-10
      ? Infinity
      : (dy > 0 ? y + 1 - origin.y : origin.y - y) / Math.abs(dy);
  while (Math.min(nextX, nextY) <= hit) {
    let d: number;
    if (nextX < nextY) {
      d = nextX;
      x += sx;
      nextX += stepX;
    } else {
      d = nextY;
      y += sy;
      nextY += stepY;
    }
    if (wall(f, x + 0.5, y + 0.5)) {
      hit = d;
      break;
    }
  }
  for (const o of f.furniture) {
    if (o.id === ignore || !blocksSight(o) || inFurniture(origin, o)) continue;
    if (distance(origin, o) > range + Math.hypot(o.w, o.h) / 2) continue;
    hit = Math.min(hit, rayBoxDistance(origin, dx, dy, o));
  }
  return hit;
}
export function canSee(
  f: Floor,
  origin: Point,
  target: Point,
  range = sightRadius(f),
  ignore?: string,
) {
  const d = distance(origin, target);
  if (d > range + 1e-7) return false;
  if (d < 1e-7) return true;
  return (
    rayDistance(
      f,
      origin,
      Math.atan2(target.y - origin.y, target.x - origin.x),
      range,
      ignore,
    ) >=
    d - 1e-6
  );
}
export function visibilityPolygon(
  f: Floor,
  origin: Point,
  range = sightRadius(f),
) {
  return Array.from({ length: 512 }, (_, i) => {
    const angle = (i / 512) * Math.PI * 2;
    // A small surface allowance makes the blocking face itself visible; it
    // cannot reveal live occupants behind it (they also need exact LOS).
    const d = Math.min(range, rayDistance(f, origin, angle, range) + 0.06);
    return {
      x: origin.x + Math.cos(angle) * d,
      y: origin.y + Math.sin(angle) * d,
    };
  });
}

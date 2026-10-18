import { boxBounds } from "./furniture-geometry";
import { canGrip } from "./handling";
import {
  type Actor,
  type Floor,
  type Furniture,
  type Point,
  distance,
} from "./model";
import { walkSegment } from "./navigation";
import { canPlace, inFurniture } from "./spatial";

export function handlingPositions(
  f: Floor,
  object: Furniture,
  to: Point,
  actor: Actor,
) {
  const dx = to.x - object.x,
    dy = to.y - object.y,
    horizontal = Math.abs(dx) >= Math.abs(dy);
  const bounds = boxBounds(object);
  const extent = (horizontal ? bounds.w : bounds.h) / 2 + 0.55;
  const along = Math.max(0, (horizontal ? bounds.h : bounds.w) / 2 - 0.3);
  const points: Point[] = [];
  for (const side of [-1, 1])
    for (const offset of [0, -along, along])
      points.push(
        horizontal
          ? { x: object.x + side * extent, y: object.y + offset }
          : { x: object.x + offset, y: object.y + side * extent },
      );
  return points
    .filter(
      (p) =>
        canGrip(f, { ...actor, ...p }, object) &&
        walkSegment(f, p, { x: p.x + dx, y: p.y + dy }, object.id) &&
        !inFurniture({ x: p.x + dx, y: p.y + dy }, { ...object, ...to }, 0.22),
    )
    .sort((a, b) => distance(a, actor) - distance(b, actor));
}
function clearTranslation(
  f: Floor,
  o: Furniture,
  from: Point,
  to: Point,
  actor: Actor,
) {
  const steps = Math.max(1, Math.ceil(distance(from, to) / 0.1));
  for (let i = 0; i <= steps; i++)
    if (
      !canPlace(f, o, {
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
      }) &&
      !(
        i === 0 &&
        distance(from, o) < 0.001 &&
        o.physics &&
        canPlace(f, o, from, o.w - 0.04, o.h - 0.04, o.angle ?? 0, 0)
      )
    )
      return false;
  return handlingPositions(f, { ...o, ...from }, to, actor).length > 0;
}
/** Plan only physical transport; no object movement, durability or reward is granted. */
export function furnitureRoute(
  f: Floor,
  o: Furniture,
  target: Point,
  actor: Actor,
): Point[] {
  if (!canPlace(f, o, target)) return [];
  for (const corner of [
    { x: target.x, y: o.y },
    { x: o.x, y: target.y },
  ]) {
    const points = [corner, target].filter(
      (p, i) => distance(p, i ? corner : o) > 0.01,
    );
    let from: Point = o;
    if (
      points.every((to) => {
        const ok = clearTranslation(f, o, from, to, actor);
        from = to;
        return ok;
      })
    )
      return points;
  }
  // Half-tile translations plus the exact target axes can navigate around
  // staging furniture. A bounded search cannot monopolize the live frame.
  const xs = [
    ...new Set([
      target.x,
      ...Array.from({ length: 57 }, (_, i) => o.x + (i - 28) * 0.5),
    ]),
  ]
    .filter((x) => x >= 1 && x <= 43)
    .sort((a, b) => a - b);
  const ys = [
    ...new Set([
      target.y,
      ...Array.from({ length: 57 }, (_, i) => o.y + (i - 28) * 0.5),
    ]),
  ]
    .filter((y) => y >= 1 && y <= 33)
    .sort((a, b) => a - b);
  const key = (x: number, y: number) => y * xs.length + x;
  const start = key(xs.indexOf(o.x), ys.indexOf(o.y)),
    goal = key(xs.indexOf(target.x), ys.indexOf(target.y));
  const point = (id: number) => ({
    x: xs[id % xs.length],
    y: ys[Math.floor(id / xs.length)],
  });
  const costs = new Map([[start, 0]]),
    previous = new Map<number, number>(),
    open = [start],
    closed = new Set<number>();
  while (open.length && closed.size < 1800) {
    open.sort(
      (a, b) =>
        costs.get(a)! +
        distance(point(a), target) -
        (costs.get(b)! + distance(point(b), target)),
    );
    const id = open.shift()!;
    if (closed.has(id)) continue;
    if (id === goal) {
      const route: Point[] = [];
      let at = id;
      while (at !== start) {
        route.unshift(point(at));
        at = previous.get(at)!;
      }
      return route;
    }
    closed.add(id);
    const x = id % xs.length,
      y = Math.floor(id / xs.length),
      from = point(id);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || nx >= xs.length || ny < 0 || ny >= ys.length) continue;
      const next = key(nx, ny),
        to = point(next),
        cost = costs.get(id)! + distance(from, to);
      if (
        closed.has(next) ||
        cost >= (costs.get(next) ?? Infinity) ||
        !clearTranslation(f, o, from, to, actor)
      )
        continue;
      costs.set(next, cost);
      previous.set(next, id);
      open.push(next);
    }
  }
  return [];
}

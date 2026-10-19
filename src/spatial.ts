import { fieldAllows } from "./force-fields";
import { boxBounds, boxesOverlap, localPoint } from "./furniture-geometry";
import { type Floor, type Furniture, H, type Point, W } from "./model";
export function inFurniture(p: Point, f: Furniture, pad = 0) {
  if (
    f.destroyed ||
    (f.open && !f.door) ||
    (f.kind === "gate" && f.turning < 0)
  )
    return false;
  // Conservative square around every rotation: reject distant props before
  // allocating local coordinates or evaluating trigonometry in navigation loops.
  const reach = (f.w + f.h) / 2 + Math.max(0, pad);
  if (Math.abs(p.x - f.x) > reach || Math.abs(p.y - f.y) > reach) return false;
  const q = localPoint(p, f);
  return pad > 0
    ? Math.hypot(
        Math.max(0, Math.abs(q.x) - f.w / 2),
        Math.max(0, Math.abs(q.y) - f.h / 2),
      ) < pad
    : Math.abs(q.x) < f.w / 2 && Math.abs(q.y) < f.h / 2;
}
export function wall(f: Floor, x: number, y: number) {
  return (
    x < 0 ||
    y < 0 ||
    x >= W ||
    y >= H ||
    f.tiles[Math.floor(y)]?.[Math.floor(x)] !== 0
  );
}
export function solid(
  f: Floor,
  p: Point,
  pad = 0.22,
  ignore?: string,
  pushDoors = false,
) {
  for (let y = Math.floor(p.y - pad); y <= Math.floor(p.y + pad); y++)
    for (let x = Math.floor(p.x - pad); x <= Math.floor(p.x + pad); x++)
      if (
        wall(f, x + 0.5, y + 0.5) &&
        Math.hypot(
          Math.max(x - p.x, 0, p.x - x - 1),
          Math.max(y - p.y, 0, p.y - y - 1),
        ) < pad
      )
        return true;
  return f.furniture.some(
    (o) =>
      o.id !== ignore &&
      !(
        pushDoors &&
        o.door &&
        !o.door.latched &&
        Math.abs(o.angle ?? 0) < 0.5
      ) &&
      !(
        o.field &&
        "access" in p &&
        fieldAllows(o, p as import("./model").Actor)
      ) &&
      inFurniture(p, o, pad),
  );
}
export function move(
  f: Floor,
  p: Point,
  dx: number,
  dy: number,
  ignore?: string,
) {
  const nx = { ...p, x: p.x + dx, y: p.y };
  if (!solid(f, nx, 0.22, ignore)) p.x = nx.x;
  const ny = { ...p, x: p.x, y: p.y + dy };
  if (!solid(f, ny, 0.22, ignore)) p.y = ny.y;
}
export function line(
  f: Floor,
  a: Point,
  b: Point,
  withFurniture = false,
  ignore?: string,
) {
  const d = Math.hypot(a.x - b.x, a.y - b.y),
    n = Math.ceil(d * 5);
  for (let i = 1; i < n; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / n,
      y: a.y + ((b.y - a.y) * i) / n,
    };
    if (
      wall(f, p.x, p.y) ||
      (withFurniture &&
        f.furniture.some((o) => o.id !== ignore && inFurniture(p, o)))
    )
      return false;
  }
  return true;
}
interface PathCache {
  signature: string;
  routes: Map<string, Point[]>;
  /** Cells whose centre lies within a body radius of intact furniture. */
  furniture?: Uint8Array;
}
const routeCache = new WeakMap<Floor, PathCache>();
export function path(f: Floor, a: Point, b: Point, breakable = false): Point[] {
  // Exact grid queries recur while a crowd waits at a barricade. Geometry is
  // authoritative, including externally loaded/edited floors; HP is not a cost.
  const signature =
    f.tiles.map((r) => r.join("")).join("") +
    f.furniture
      .map(
        (o) =>
          `${o.id}/${o.kind}/${o.x}/${o.y}/${o.w}/${o.h}/${o.angle ?? 0}/${o.destroyed}/${o.open}/${o.turning < 0}`,
      )
      .join(";");
  let cache = routeCache.get(f);
  if (cache?.signature !== signature) {
    cache = { signature, routes: new Map() };
    routeCache.set(f, cache);
  }
  const key = `${Math.floor(a.x)},${Math.floor(a.y)}/${Math.floor(b.x)},${Math.floor(b.y)}/${breakable}`;
  let route = cache.routes.get(key);
  if (!route) {
    cache.furniture ??= furnitureCells(f);
    route = computePath(f, a, b, breakable, cache.furniture);
    if (cache.routes.size >= 512)
      cache.routes.delete(cache.routes.keys().next().value!);
    cache.routes.set(key, route);
  }
  // Callers consume routes and sometimes modify individual points.
  return route.map((p) => ({ ...p }));
}
function furnitureCells(f: Floor) {
  const cells = new Uint8Array(W * H);
  for (const o of f.furniture) {
    const r = (o.w + o.h) / 2 + 0.22;
    for (
      let y = Math.max(0, Math.floor(o.y - r));
      y <= Math.min(H - 1, Math.floor(o.y + r));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(o.x - r));
        x <= Math.min(W - 1, Math.floor(o.x + r));
        x++
      )
        if (
          !cells[y * W + x] &&
          inFurniture({ x: x + 0.5, y: y + 0.5 }, o, 0.22)
        )
          cells[y * W + x] = 1;
  }
  return cells;
}
// Dijkstra with positive furniture traversal costs: zombies prefer open alternatives, then break a physical route.
function computePath(
  f: Floor,
  a: Point,
  b: Point,
  breakable: boolean,
  furniture: Uint8Array,
): Point[] {
  const start = Math.floor(a.y) * W + Math.floor(a.x),
    end = Math.floor(b.y) * W + Math.floor(b.x);
  const dist = new Float64Array(W * H).fill(Infinity),
    prev = new Int32Array(W * H).fill(-1),
    closed = new Uint8Array(W * H);
  dist[start] = 0;
  const heap: [number, number][] = [];
  const push = (id: number, cost: number) => {
    heap.push([id, cost]);
    let i = heap.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (heap[j][1] <= cost) break;
      [heap[i], heap[j]] = [heap[j], heap[i]];
      i = j;
    }
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let j = i * 2 + 1;
        if (j >= heap.length) break;
        if (j + 1 < heap.length && heap[j + 1][1] < heap[j][1]) j++;
        if (heap[i][1] <= heap[j][1]) break;
        [heap[i], heap[j]] = [heap[j], heap[i]];
        i = j;
      }
    }
    return first;
  };
  push(start, 0);
  while (heap.length) {
    const [v, cost] = pop();
    if (closed[v]) continue;
    closed[v] = 1;
    if (v === end) break;
    const x = v % W,
      y = Math.floor(v / W);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy;
      if (wall(f, xx + 0.5, yy + 0.5)) continue;
      const id = yy * W + xx;
      if (closed[id]) continue;
      const ob = furniture[id] === 1;
      if (ob && !breakable) continue;
      const nd = cost + 1 + (ob ? 18 : 0);
      if (nd < dist[id]) {
        dist[id] = nd;
        prev[id] = v;
        push(id, nd);
      }
    }
  }
  if (prev[end] < 0) return [];
  const out: Point[] = [];
  for (let v = end; v !== start; v = prev[v]) {
    if (v < 0) return [];
    out.push({ x: (v % W) + 0.5, y: Math.floor(v / W) + 0.5 });
  }
  return out.reverse();
}
export function soundGain(f: Floor, a: Point, b: Point) {
  if (line(f, a, b, true)) return 1;
  const open = path(f, a, b, false);
  return open.length ? Math.max(0.25, 1 - open.length / 100) : 0.025;
}
export function canPlace(
  f: Floor,
  o: Furniture,
  p: Point,
  w = o.w,
  h = o.h,
  angle = o.angle ?? 0,
  margin = 0.04,
) {
  if (!Number.isFinite(p.x + p.y + w + h + angle) || w <= 0 || h <= 0)
    return false;
  const box = { ...p, w, h, angle },
    bounds = boxBounds(box),
    eps = 1e-7;
  for (
    let y = Math.floor(p.y - bounds.h / 2 + eps);
    y <= Math.floor(p.y + bounds.h / 2 - eps);
    y++
  )
    for (
      let x = Math.floor(p.x - bounds.w / 2 + eps);
      x <= Math.floor(p.x + bounds.w / 2 - eps);
      x++
    )
      if (
        wall(f, x + 0.5, y + 0.5) &&
        boxesOverlap(box, { x: x + 0.5, y: y + 0.5, w: 1, h: 1 })
      )
        return false;
  return !f.furniture.some(
    (other) =>
      other.id !== o.id &&
      inFurniture(other, other) &&
      boxesOverlap(box, other, margin),
  );
}

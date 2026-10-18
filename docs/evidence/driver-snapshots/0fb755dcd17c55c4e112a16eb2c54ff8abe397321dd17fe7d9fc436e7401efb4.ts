import { W, H, distance, type Floor, type Point } from "./model";
import { solid, inFurniture, wall } from "./spatial";
import { rayBoxDistance } from "./visibility";
export interface NavStep extends Point {
  action?: "door" | "vault";
  obstacle?: string;
}
interface Edge {
  to: number;
  cost: number;
  action?: NavStep["action"];
  obstacle?: string;
}
interface Graph {
  signature: string;
  points: Point[];
  edges: Edge[][];
}
const cache = new WeakMap<Floor, Graph>();
/** Continuous swept actor footprint, including shallow corner intersections. */
export function walkSegment(f: Floor, a: Point, b: Point, ignore?: string) {
  const d = distance(a, b),
    pad = 0.22;
  if (
    !Number.isFinite(d) ||
    solid(f, a, pad, ignore) ||
    solid(f, b, pad, ignore)
  )
    return false;
  if (d < 1e-9) return true;
  const dx = (b.x - a.x) / d,
    dy = (b.y - a.y) / d;
  const minX = Math.min(a.x, b.x) - pad,
    maxX = Math.max(a.x, b.x) + pad;
  const minY = Math.min(a.y, b.y) - pad,
    maxY = Math.max(a.y, b.y) + pad;
  for (
    let y = Math.max(-1, Math.floor(minY));
    y <= Math.min(H, Math.floor(maxY));
    y++
  )
    for (
      let x = Math.max(-1, Math.floor(minX));
      x <= Math.min(W, Math.floor(maxX));
      x++
    )
      if (
        wall(f, x + 0.5, y + 0.5) &&
        rayBoxDistance(a, dx, dy, {
          x: x + 0.5,
          y: y + 0.5,
          w: 1 + 2 * pad - 1e-8,
          h: 1 + 2 * pad - 1e-8,
        }) <
          d - 1e-7
      )
        return false;
  for (const o of f.furniture) {
    if (
      o.id === ignore ||
      !inFurniture(o, o) ||
      o.x + o.w / 2 < minX ||
      o.x - o.w / 2 > maxX ||
      o.y + o.h / 2 < minY ||
      o.y - o.h / 2 > maxY
    )
      continue;
    if (
      rayBoxDistance(a, dx, dy, {
        ...o,
        w: o.w + 2 * pad - 1e-8,
        h: o.h + 2 * pad - 1e-8,
      }) <
      d - 1e-7
    )
      return false;
  }
  return true;
}

function graph(f: Floor): Graph {
  const signature = `${f.tiles.map((r) => r.join("")).join("")};${f.furniture.map((o) => `${o.id},${o.kind},${o.x},${o.y},${o.w},${o.h},${o.destroyed},${o.open},${o.turning < 0}`).join(";")}`;
  const saved = cache.get(f);
  if (saved?.signature === signature) return saved;
  const points: Point[] = [],
    edges: Edge[][] = [],
    grid = new Map<number, number>();
  const add = (p: Point) => {
    points.push(p);
    edges.push([]);
    return points.length - 1;
  };
  const link = (
    a: number,
    b: number,
    extra = 0,
    action?: NavStep["action"],
    obstacle?: string,
  ) => {
    const cost = distance(points[a], points[b]) + extra;
    edges[a].push({ to: b, cost, action, obstacle });
    edges[b].push({ to: a, cost, action, obstacle });
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      if (!solid(f, p)) grid.set(y * W + x, add(p));
    }
  for (const [key, index] of grid)
    for (const neighbor of [key + 1, key + W]) {
      const other = grid.get(neighbor);
      if (
        other !== undefined &&
        distance(points[index], points[other]) < 1.01 &&
        walkSegment(f, points[index], points[other])
      )
        link(index, other);
    }
  const nearbyGrid = (index: number) => {
    const p = points[index];
    for (let y = Math.floor(p.y) - 2; y <= Math.floor(p.y) + 2; y++)
      for (let x = Math.floor(p.x) - 2; x <= Math.floor(p.x) + 2; x++) {
        const other = grid.get(y * W + x);
        if (
          other !== undefined &&
          distance(p, points[other]) < 1.8 &&
          walkSegment(f, p, points[other])
        )
          link(index, other);
      }
  };
  // Traverse complete obstacle faces instead of treating an occupied grid cell
  // as walkable. This keeps the approach, direction and valid landing together.
  for (const o of f.furniture) {
    if (o.destroyed || o.open || o.kind === "gate") continue;
    for (const horizontal of [true, false]) {
      if (o.kind === "door" && (horizontal ? o.w > o.h : o.h > o.w)) continue;
      const span = horizontal ? o.h : o.w,
        center = horizontal ? o.y : o.x;
      const cross = horizontal ? o.w : o.h;
      if (cross + 1.1 > 4.7) continue;
      const samples = new Set([center]);
      for (
        let v = Math.ceil(center - span / 2 - 0.5);
        v + 0.5 < center + span / 2;
        v++
      )
        samples.add(v + 0.5);
      for (const along of samples) {
        const a = horizontal
          ? { x: o.x - o.w / 2 - 0.55, y: along }
          : { x: along, y: o.y - o.h / 2 - 0.55 };
        const b = horizontal
          ? { x: o.x + o.w / 2 + 0.55, y: along }
          : { x: along, y: o.y + o.h / 2 + 0.55 };
        if (
          !walkSegment(f, a, b, o.id) ||
          !inFurniture({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, o)
        )
          continue;
        const left = add(a),
          right = add(b);
        nearbyGrid(left);
        nearbyGrid(right);
        link(
          left,
          right,
          o.kind === "door" ? 0.5 : 3.2,
          o.kind === "door" ? "door" : "vault",
          o.id,
        );
      }
    }
  }
  const result = { signature, points, edges };
  cache.set(f, result);
  return result;
}
export function survivorPath(f: Floor, start: Point, end: Point): NavStep[] {
  if (solid(f, start)) return [];
  if (solid(f, end)) {
    const door = f.furniture.find(
      (o) => o.kind === "door" && inFurniture(end, o),
    );
    if (!door) return [];
    const options = [
      { x: door.x - door.w / 2 - 0.55, y: door.y },
      { x: door.x + door.w / 2 + 0.55, y: door.y },
      { x: door.x, y: door.y - door.h / 2 - 0.55 },
      { x: door.x, y: door.y + door.h / 2 + 0.55 },
    ].filter(
      (p) =>
        distance(p, door) < 1.9 &&
        !solid(f, p) &&
        walkSegment(f, p, door, door.id),
    );
    const routes = options
      .map((p) => ({ p, route: survivorPath(f, start, p) }))
      .filter((v) => v.route.length || distance(start, v.p) < 0.04);
    routes.sort(
      (a, b) =>
        a.route.reduce(
          (n, p, i) => n + distance(i ? a.route[i - 1] : start, p),
          0,
        ) -
        b.route.reduce(
          (n, p, i) => n + distance(i ? b.route[i - 1] : start, p),
          0,
        ),
    );
    const selected = routes[0];
    return selected
      ? [
          ...selected.route,
          { x: door.x, y: door.y, action: "door", obstacle: door.id },
        ]
      : [];
  }
  if (walkSegment(f, start, end)) return [{ ...end }];
  const g = graph(f),
    points = [...g.points, start, end],
    from = points.length - 2,
    to = points.length - 1;
  const starts: Edge[] = [],
    ends = new Map<number, number>();
  for (let i = 0; i < g.points.length; i++) {
    if (distance(start, points[i]) < 1.8 && walkSegment(f, start, points[i]))
      starts.push({ to: i, cost: distance(start, points[i]) });
    if (distance(end, points[i]) < 1.8 && walkSegment(f, end, points[i]))
      ends.set(i, distance(end, points[i]));
  }
  const costs = new Float64Array(points.length).fill(Infinity),
    previous = new Int32Array(points.length).fill(-1),
    via: (Edge | undefined)[] = [],
    closed = new Uint8Array(points.length);
  costs[from] = 0;
  const heap: [number, number][] = [[from, 0]];
  const push = (node: number, cost: number) => {
    heap.push([node, cost]);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][1] <= cost) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= heap.length) break;
        if (child + 1 < heap.length && heap[child + 1][1] < heap[child][1])
          child++;
        if (heap[i][1] <= heap[child][1]) break;
        [heap[i], heap[child]] = [heap[child], heap[i]];
        i = child;
      }
    }
    return first;
  };
  while (heap.length) {
    const [node, cost] = pop();
    if (closed[node]) continue;
    closed[node] = 1;
    if (node === to) break;
    const outgoing =
      node === from
        ? starts
        : [
            ...g.edges[node],
            ...(ends.has(node) ? [{ to, cost: ends.get(node)! }] : []),
          ];
    for (const e of outgoing)
      if (!closed[e.to] && cost + e.cost < costs[e.to]) {
        costs[e.to] = cost + e.cost;
        previous[e.to] = node;
        via[e.to] = e;
        push(e.to, costs[e.to]);
      }
  }
  if (previous[to] < 0) return [];
  const result: NavStep[] = [];
  for (let i = to; i !== from; i = previous[i]) {
    if (i < 0) return [];
    result.push({
      ...points[i],
      action: via[i]?.action,
      obstacle: via[i]?.obstacle,
    });
  }
  return result.reverse();
}

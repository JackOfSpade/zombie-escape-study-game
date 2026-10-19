import {
  FURNITURE,
  H,
  W,
  distance,
  type Floor,
  type Furniture,
  type FurnitureKind,
  type Point,
} from "./model";
import { canPlace, inFurniture, wall } from "./spatial";

/** Office fixtures for fresh generated floors: break areas, filing, printers,
 * plants, whiteboards and cubicle panels stand against walls, away from
 * terminals and doorways, and never cut off any reachable floor cell. Every
 * piece is an ordinary physical object with its own health. Placement is
 * deterministic and uses no world RNG; restored floors are never touched. */
export interface OfficeZone {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kinds: FurnitureKind[];
}

const DIRECTIONS = [
  { dx: 0, dy: -1, angle: 0 },
  { dx: 0, dy: 1, angle: Math.PI },
  { dx: -1, dy: 0, angle: -Math.PI / 2 },
  { dx: 1, dy: 0, angle: Math.PI / 2 },
];

/** Cells a walking body cannot enter: walls and solid furniture (doors pass). */
function blockedGrid(f: Floor, objects: Furniture[] = f.furniture) {
  const grid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (wall(f, x + 0.5, y + 0.5)) grid[y * W + x] = 1;
  for (const o of objects) markObject(grid, o);
  return grid;
}
function markObject(grid: Uint8Array, o: Furniture) {
  if (o.kind === "door" || o.field) return;
  const r = Math.hypot(o.w, o.h) / 2 + 0.3;
  for (
    let y = Math.max(0, Math.floor(o.y - r));
    y <= Math.min(H - 1, o.y + r);
    y++
  )
    for (
      let x = Math.max(0, Math.floor(o.x - r));
      x <= Math.min(W - 1, o.x + r);
      x++
    )
      if (inFurniture({ x: x + 0.5, y: y + 0.5 }, o, 0.22)) grid[y * W + x] = 1;
}
/** Open cells connected to `from`. */
function reachable(grid: Uint8Array, from: Point) {
  const seen = new Uint8Array(W * H),
    queue = [Math.floor(from.y) * W + Math.floor(from.x)];
  while (queue.length) {
    const id = queue.pop()!,
      x = id % W;
    if (id < 0 || id >= W * H || seen[id] || grid[id]) continue;
    seen[id] = 1;
    if (x + 1 < W) queue.push(id + 1);
    if (x > 0) queue.push(id - 1);
    queue.push(id + W, id - W);
  }
  return seen;
}

export function makeFurniture(
  id: string,
  floor: number,
  kind: FurnitureKind,
  p: Point,
  angle = 0,
): Furniture {
  const spec = FURNITURE[kind];
  return {
    id,
    floor,
    kind,
    x: p.x,
    y: p.y,
    w: spec.w,
    h: spec.h,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
    ...(angle ? { angle } : {}),
  };
}

/** Back-to-wall poses for one object inside a zone, nearest the zone's start. */
function candidates(f: Floor, zone: OfficeZone, kind: FurnitureKind) {
  const spec = FURNITURE[kind],
    out: { p: Point; angle: number; order: number }[] = [];
  for (let y = zone.y1; y <= zone.y2; y++)
    for (let x = zone.x1; x <= zone.x2; x++) {
      if (wall(f, x + 0.5, y + 0.5)) continue;
      for (const [i, d] of DIRECTIONS.entries()) {
        if (!wall(f, x + 0.5 + d.dx, y + 0.5 + d.dy)) continue;
        // The back faces the wall at every angle, so depth is always `h`.
        const depth = spec.h,
          // Flush against the wall face, centred on the cell along the wall.
          p = d.dx
            ? {
                x: x + (d.dx < 0 ? depth / 2 + 0.03 : 1 - depth / 2 - 0.03),
                y: y + 0.5,
              }
            : {
                x: x + 0.5,
                y: y + (d.dy < 0 ? depth / 2 + 0.03 : 1 - depth / 2 - 0.03),
              };
        out.push({
          p,
          angle: d.angle,
          order: (y - zone.y1) * 64 + (x - zone.x1) + i * 0.1,
        });
      }
    }
  return out.sort((a, b) => a.order - b.order);
}

export function furnishOffice(
  f: Floor,
  zones: OfficeZone[],
  keepClear: Point[],
  from: Point,
) {
  const stations = f.stations as Point[],
    grid = blockedGrid(f);
  let before = reachable(grid, from);
  for (const zone of zones) {
    let n = 0;
    for (const kind of zone.kinds) {
      const id = `f${f.index}-${zone.id}-office${n++}-${kind}`;
      for (const { p, angle } of candidates(f, zone, kind)) {
        const o = makeFurniture(id, f.index, kind, p, angle),
          reach = Math.hypot(o.w, o.h) / 2;
        if (
          !canPlace(f, o, p) ||
          stations.some((s) => distance(s, p) < reach + 1.25) ||
          keepClear.some((s) => distance(s, p) < reach + 1.6) ||
          // A walking gap between neighbours, never a sealed pocket.
          f.furniture.some(
            (other) =>
              other.kind !== "door" &&
              !other.field &&
              distance(other, p) <
                reach + Math.hypot(other.w, other.h) / 2 + 0.55,
          )
        )
          continue;
        const next = grid.slice();
        markObject(next, o);
        const after = reachable(next, from);
        let covered = 0;
        for (let i = 0; i < W * H; i++) if (before[i] && !after[i]) covered++;
        const cut =
          covered > Math.ceil(o.w + 0.5) * Math.ceil(o.h + 0.5) ||
          stations.some((s) => !after[Math.floor(s.y) * W + Math.floor(s.x)]);
        if (cut) continue;
        f.furniture.push(o);
        grid.set(next);
        before = after;
        break;
      }
    }
  }
}

/** Office zones for the generated (pre-redesign) floor plan. */
export function legacyOfficeZones(f: Floor): OfficeZone[] {
  const rooms: Record<number, FurnitureKind[]> = {
    // Meeting room, open-plan desks, break area, copy/storage room.
    0: ["whiteboard", "plant", "cabinet", "officeChair"],
    1: ["partition", "partition", "cabinet", "printer", "plant"],
    2: ["cooler", "plant", "officeChair", "cabinet"],
    3: ["printer", "cabinet", "cabinet", "whiteboard", "plant"],
  };
  const zones: OfficeZone[] = [
    { id: "room0", x1: 2, y1: 2, x2: 16, y2: 13, kinds: rooms[0] },
    { id: "room1", x1: 27, y1: 2, x2: 41, y2: 13, kinds: rooms[1] },
    { id: "room2", x1: 2, y1: 15, x2: 16, y2: 27, kinds: rooms[2] },
    { id: "room3", x1: 27, y1: 15, x2: 41, y2: 27, kinds: rooms[3] },
    {
      id: "lobby",
      x1: 18,
      y1: 2,
      x2: 25,
      y2: 27,
      kinds: ["plant", "plant", "cooler"],
    },
  ];
  return f.index < 4 ? zones : [];
}

/** Office zones for fresh force-field floors: each study stage and both lobbies. */
export function pursuitOfficeZones(f: Floor): OfficeZone[] {
  const stages = f.generation?.stages;
  if (f.index >= 4 || !stages) return [];
  const rooms: Record<number, FurnitureKind[]> = {
    // Rear free hall, then meeting, open-plan and storage rooms.
    2: ["cooler", "plant", "cabinet"],
    3: ["whiteboard", "cabinet", "officeChair", "plant"],
    0: ["partition", "printer", "cabinet", "plant"],
    1: ["whiteboard", "cabinet", "officeChair", "plant"],
  };
  return [
    ...stages.map((s) => ({
      id: `room${s.room}`,
      x1: 2,
      y1: s.front + 1,
      x2: 41,
      y2: s.rear - 1,
      kinds: rooms[s.room] ?? ["plant"],
    })),
    {
      id: "entry",
      x1: 2,
      y1: stages[0].rear + 1,
      x2: 41,
      y2: 27,
      kinds: ["plant", "plant"],
    },
    {
      id: "lobby",
      x1: 2,
      y1: 2,
      x2: 41,
      y2: stages[stages.length - 1].front - 1,
      kinds: ["cooler", "printer", "plant"],
    },
  ];
}
/** Points a fresh force-field floor must keep clear: every cell of every field
 * opening, the stairs and the entry, so furniture can never seal a field. */
export function fieldClearance(f: Floor): Point[] {
  const points: Point[] = [f.stairs, f.entry];
  for (const o of f.furniture)
    if (o.field)
      for (let d = -o.w / 2 + 0.5; d <= o.w / 2 - 0.5; d++)
        points.push({ x: o.x + d, y: o.y });
  return points;
}

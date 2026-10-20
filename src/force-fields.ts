import { pursuitLayout } from "./pursuit-layout";
import {
  buildingLayoutErrors,
  buildingRoof,
  createBuildingFootprint,
} from "./building-layout";
import { carveStairwells } from "./stairwell";
import {
  fieldClearance,
  furnishOffice,
  pursuitOfficeZones,
} from "./office-layout";
import { rayBodyDistance } from "./visibility";
import { inFurniture, line, solid } from "./spatial";
import { preparePracticeRooms } from "./room-questions";
import {
  CONFIG,
  type Actor,
  type Floor,
  type Furniture,
  type Game,
  type Point,
  type Roadmap,
  event,
} from "./model";

export const SWARM = { cap: 600, interval: 1, batch: 4, speedRatio: 0.5 };
export function fieldAllows(o: Furniture, a: Pick<Actor, "id" | "access">) {
  const f = o.field;
  return (
    !!f &&
    (o.destroyed ||
      f.authorized.includes(a.id) ||
      f.crossing.includes(a.id) ||
      (f.exit && a.access.includes(o.floor)) ||
      (f.limit === undefined ? !f.exit : f.used < f.limit))
  );
}
/** Whether an intact force field lies on the straight segment a->b. */
export function fieldBetween(f: Floor, a: Point, b: Point): boolean {
  const near = f.furniture.filter((o) => {
    if (!o.field || o.destroyed) return false;
    const r = (o.w + o.h) / 2;
    return (
      o.x + r >= Math.min(a.x, b.x) &&
      o.x - r <= Math.max(a.x, b.x) &&
      o.y + r >= Math.min(a.y, b.y) &&
      o.y - r <= Math.max(a.y, b.y)
    );
  });
  if (near.length === 0) return false;
  const d = Math.hypot(b.x - a.x, b.y - a.y),
    n = Math.max(1, Math.ceil(d / 0.15));
  for (let i = 0; i <= n; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / n,
      y: a.y + ((b.y - a.y) * i) / n,
    };
    if (near.some((o) => inFurniture(p, o))) return true;
  }
  return false;
}
/** Whether an actor can plan an interaction, including spending its own key. */
export function canUseField(o: Furniture, a: Actor) {
  return !o.field || fieldAllows(o, a) || (a.keys ?? 0) > 0;
}
export function fieldRouteSignature(f: Floor, a: Actor) {
  return `${(a.keys ?? 0) > 0};${f.furniture
    .filter((o) => o.field)
    .map((o) => `${o.id}:${fieldAllows(o, a)}`)
    .join(";")}`;
}
export function useField(g: Game, a: Actor, o: Furniture) {
  if (!o.field) return false;
  if (fieldAllows(o, a)) return true;
  if ((a.keys ?? 0) < 1) {
    if (a.id === "human")
      g.notice =
        "Red force field: one key required, or solve a solo terminal on this floor for access. There is no other way through this wall.";
    return false;
  }
  a.keys = (a.keys ?? 0) - 1;
  o.field.authorized.push(a.id);
  a.path = [];
  a.repath = 0;
  event(
    g,
    "field-key",
    `${a.name} spent one key for personal force field access.`,
    a.floor,
    a.id,
  );
  if (a.id === "human")
    g.notice = "Key consumed. This field is permanently green for you.";
  return true;
}

/** Fresh-run redesign; historical saves and lab fixtures retain their original rules. */
export function redesign(
  g: Game,
  roadmap?: Roadmap,
  options: { randomized?: boolean } = {},
) {
  g.rules = "force-fields";
  if (options.randomized) {
    const boundary = createBuildingFootprint(g.seed);
    for (const f of g.floors) f.boundary = structuredClone(boundary);
  }
  for (const a of g.survivors) {
    a.inventory = [];
    a.keys = 0;
    a.speed = CONFIG.playerSpeed;
  }
  const assigned = new Set<string>();
  for (const f of g.floors) {
    // Generated legacy furniture is replaced: doors become fields and the
    // office pieces are placed again for the new floor plan below.
    f.furniture = f.furniture.filter(
      (o) => o.kind === "door" || o.kind === "gate",
    );
    for (const o of f.furniture) {
      const frame = o.door?.frame ?? o;
      Object.assign(o, {
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
        angle: 0,
        open: false,
      });
      delete o.door;
      const entrance = /room(\d+)-door$/.exec(o.id);
      o.hp = o.maxHp = o.id === "main-gate" ? 600 : entrance ? 1200 : 900;
      const publicEntry = entrance?.[1] === "2";
      o.field = {
        ...(publicEntry ? { publicEntry: true } : {}),
        authorized: [],
        crossing: [],
        sides: {},
        used: 0,
        exit: !entrance && o.id !== "main-gate",
        ...(entrance && !publicEntry
          ? {
              limit: 3 + ((g.seed + f.index + Number(entrance[1])) % 3),
              direction: Number(entrance[1]) % 2 === 0 ? -1 : 1,
            }
          : {}),
      };
    }
    // Room peers share a question, with an independent one-use solo answer per station.
    for (const s of f.stations) {
      const original = g.encounters[s.encounter];
      const id = assigned.has(s.encounter) ? `${s.id}-solo` : s.encounter;
      assigned.add(s.encounter);
      g.encounters[id] = {
        ...structuredClone(original),
        id,
        questionRoom: /^(f\d+-room\d+)/.exec(s.id)?.[1],
        mode: "solo",
        reward: "stairs",
        loot: [],
      };
      s.encounter = id;
    }
  }
  // The roof's arrival staircase is carved like the ordinary floors' wells.
  const roof = g.floors[CONFIG.floors];
  if (roof && g.floors.some((f) => f.generation?.version === 2)) {
    if (roof.boundary) buildingRoof(roof);
    else carveStairwells(roof);
  }
  for (const floor of g.floors)
    if (floor.generation?.version === 2) {
      pursuitLayout(g, floor);
      // Fresh runs are furnished as an office: a few movable physical pieces
      // per room, kept clear of every field opening and terminal.
      furnishOffice(
        floor,
        pursuitOfficeZones(floor),
        fieldClearance(floor),
        floor.entry,
        g.seed,
        floor.furniture.filter((o) => /-room\d-door$/.test(o.id)),
      );
    }
  if (options.randomized) {
    const errors = buildingLayoutErrors(g);
    if (errors.length) throw Error(`Invalid building: ${errors.join("; ")}`);
  }
  const used = new Set(
    g.floors.flatMap((f) => f.stations.map((s) => s.encounter)),
  );
  for (const id of Object.keys(g.encounters))
    if (!used.has(id)) delete g.encounters[id];
  if (roadmap) preparePracticeRooms(g, roadmap);
  g.notice =
    "Green fields let you pass; zombies must break them. E uses a key on red fields. The rear study hall stays open. Solve a solo terminal for stair access and a key.";
}

const FIELD_RADIUS = 0.26;
function paidAccess(o: Furniture, a: Actor) {
  return (
    o.field!.authorized.includes(a.id) ||
    (o.field!.exit && a.access.includes(o.floor))
  );
}
function fieldSide(o: Furniture, p: Point) {
  const axis = o.h >= o.w ? "x" : "y";
  return Math.sign(p[axis] - o[axis]);
}
/** Reject toward the approach face, choosing clear nearby space in a crowded doorway. */
function ejectFromField(g: Game, o: Furniture, a: Actor, side: number) {
  const floor = g.floors[o.floor];
  const axis = o.h >= o.w ? "x" : "y";
  const along = axis === "x" ? "y" : "x";
  const half = (axis === "x" ? o.w : o.h) / 2;
  let fallback: Point | undefined;
  let chosen: Point | undefined;
  for (let depth = 0; depth <= 8 && !chosen; depth++) {
    for (const offset of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const p = {
        ...a,
        [axis]: o[axis] + side * (half + FIELD_RADIUS + 0.02 + depth * 0.55),
        [along]: a[along] + offset * 0.55,
      };
      if (solid(floor, p, FIELD_RADIUS, o.id) || !line(floor, a, p, true, o.id))
        continue;
      fallback ??= p;
      if (
        g.survivors.some(
          (b) =>
            b !== a &&
            b.alive &&
            !b.escaped &&
            b.floor === a.floor &&
            Math.hypot(b.x - p.x, b.y - p.y) < 0.52,
        ) ||
        g.zombies.some(
          (z) =>
            z.hp > 0 &&
            z.floor === a.floor &&
            Math.hypot(z.x - p.x, z.y - p.y) < 0.52,
        )
      )
        continue;
      chosen = p;
      break;
    }
  }
  chosen ??= fallback;
  if (!chosen) return;
  a.x = chosen.x;
  a.y = chosen.y;
  a.physics = { x: 0, y: 0, angular: 0, awake: true };
  a.path = [];
  a.repath = 0;
  delete a.vault;
  if (a.id === "human")
    g.notice =
      (a.keys ?? 0) > 0
        ? "Red force field. Press E to spend a key."
        : "Red force field: entry denied. A key or a solved solo terminal on this floor is required.";
  const ev = event(
    g,
    "field-denied",
    `${a.name} was pushed back by a red force field.`,
    a.floor,
    a.id,
  );
  ev.position = { x: o.x, y: o.y };
}

/** Resolve actual swept first touches atomically after every native physics substep. */
export function updateFields(g: Game, previous?: ReadonlyMap<string, Point>) {
  for (const floor of g.floors)
    for (const o of floor.furniture) {
      const f = o.field;
      if (!f || o.destroyed) continue;
      if (f.touchVersion !== 1) {
        // Old saves granted everyone in the doorway a grace pass, without reserving
        // capacity. Those uncharged passes cannot bypass the instant admission rule.
        f.crossing = [];
        if (f.limit !== undefined) f.used = Math.min(f.limit, f.used);
        f.touchVersion = 1;
      }
      const people = g.survivors.filter(
        (a) => a.alive && !a.escaped && a.floor === floor.index,
      );
      f.crossing = f.crossing.filter((id) =>
        people.some(
          (a) => a.id === id && inFurniture(a, o, FIELD_RADIUS + 0.03),
        ),
      );
      const candidates = people
        .map((a) => {
          const from = previous?.get(a.id) ?? a;
          const length = Math.hypot(a.x - from.x, a.y - from.y);
          const origin =
            f.sides[a.id] || fieldSide(o, from) || -(f.direction ?? 1);
          const hit =
            length > 1e-9
              ? rayBodyDistance(
                  from,
                  (a.x - from.x) / length,
                  (a.y - from.y) / length,
                  o,
                  FIELD_RADIUS,
                )
              : Infinity;
          const touching = inFurniture(a, o, FIELD_RADIUS + 0.001);
          const axis = o.h >= o.w ? "x" : "y";
          const penetration =
            (axis === "x" ? o.w : o.h) / 2 +
            FIELD_RADIUS -
            origin * (from[axis] - o[axis]);
          const time = inFurniture(from, o, FIELD_RADIUS)
            ? -Math.max(0, penetration)
            : hit / (length || 1);
          return {
            a,
            from,
            origin,
            time,
            contact: touching || hit <= length + 1e-8,
          };
        })
        .filter((c) => c.contact)
        .sort((a, b) => a.time - b.time || a.a.id.localeCompare(b.a.id));
      for (const { a, origin } of candidates) {
        if (paidAccess(o, a) || f.crossing.includes(a.id)) continue;
        if (
          (f.limit === undefined && f.exit) ||
          (f.limit !== undefined && f.used >= f.limit)
        ) {
          // Native contact slop at a closed face is harmless. Actual overlap is
          // removed now, before another physics step or a rendered frame.
          if (inFurniture(a, o, FIELD_RADIUS - 0.01))
            ejectFromField(g, o, a, origin);
          continue;
        }
        if (f.limit === undefined) continue;
        f.crossing.push(a.id);
        if (origin === -(f.direction ?? 1) && !f.visitors?.includes(a.id)) {
          (f.visitors ??= []).push(a.id);
          f.used++;
          const ev = event(
            g,
            "field-entry",
            `${a.name} claimed a free entrance pass on first touch.`,
            floor.index,
            a.id,
          );
          ev.position = { x: o.x, y: o.y };
          if (f.used === f.limit) {
            const sealed = event(
              g,
              "field-sealed",
              "Free passes exhausted. A personal key or a solved solo terminal on this floor is now required.",
              floor.index,
            );
            sealed.position = { x: o.x, y: o.y };
          }
        }
      }
      for (const a of people)
        if (!inFurniture(a, o, FIELD_RADIUS + 0.03))
          f.sides[a.id] = fieldSide(o, a);
    }
}
const views = new WeakMap<
  Floor,
  Map<string, { signature: string; floor: Floor }>
>();
const virtual = new WeakSet<Floor>();
/** Actor-specific navigation views keep personal access out of shared geometry. */
export function survivorFloor(f: Floor, p: Point): Floor {
  if (
    virtual.has(f) ||
    !("access" in p) ||
    !("id" in p) ||
    !f.furniture.some((o) => o.field)
  )
    return f;
  const a = p as Actor;
  // The view shares every non-field object by reference, so only fields and
  // the set of objects decide whether it must be rebuilt.
  const signature = JSON.stringify([
    (a.keys ?? 0) > 0,
    f.furniture.map((o) =>
      o.field
        ? [
            o.id,
            o.destroyed,
            o.x,
            o.y,
            o.w,
            o.h,
            o.angle,
            o.open,
            fieldAllows(o, a),
          ]
        : o.id,
    ),
  ]);
  let map = views.get(f);
  if (!map) views.set(f, (map = new Map()));
  const old = map.get(a.id);
  if (old?.signature === signature && old.floor.tiles === f.tiles)
    return old.floor;
  const view: Floor = {
    ...f,
    furniture: f.furniture
      .filter((o) => !o.field || !fieldAllows(o, a))
      .map((o) => {
        if (!o.field || (a.keys ?? 0) < 1) return o;
        return {
          ...o,
          door: {
            frame: { x: o.x, y: o.y, w: o.w, h: o.h },
            hinge: { x: o.x, y: o.y },
            latched: true,
            swung: false,
            side: 0,
          },
        } as Furniture;
      }),
  };
  virtual.add(view);
  map.set(a.id, { signature, floor: view });
  return view;
}

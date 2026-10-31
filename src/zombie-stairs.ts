import {
  type Actor,
  type Furniture,
  type Game,
  type Point,
  type WorldEvent,
  type Zombie,
  distance,
} from "./model";
import { inFurniture, line, solid, wall } from "./spatial";
import { walkSegment } from "./navigation";
import { STAIRWELL_RADIUS } from "./stairwell";
import { actorOnFloor } from "./stair-route";
import { canSee, playerCanSee, sightRadius } from "./visibility";
import type { ZombieIndex } from "./zombie-index";
export type StairArrival =
  | { kind: "wait" | "cancel" }
  | { kind: "arrive"; floor: number; position: Point }
  | { kind: "furniture"; floor: number; position: Point; object: Furniture }
  | { kind: "survivor"; floor: number; position: Point; actor: Actor };
/** Carved wells admit parallel arrivals across their width. An obstructed
 * exit retains one contact owner so queued bodies cannot multiply damage. */
export function zombieStairArrival(
  g: Game,
  z: Zombie,
  crowd?: ZombieIndex,
): StairArrival | undefined {
  if (z.stairUntil === undefined) return;
  const source = g.floors[z.floor],
    next = g.floors[z.floor + 1];
  const wellRadius = source?.layout === "pursuit" ? STAIRWELL_RADIUS : 0.8;
  if (!source || !next || distance(z, source.stairs) > wellRadius)
    return { kind: "cancel" };
  if (g.time + 1e-8 < z.stairUntil) return { kind: "wait" };
  const p = next.entry,
    floor = next.index;
  const bubbleAt = (at: Point) =>
    g.effects.some(
      (e) =>
        e.kind === "bubble" &&
        e.until > g.time &&
        e.floor === floor &&
        canSee(next, e, at, e.radius + 0.5),
    );
  const zombieAt = (at: Point) =>
    (crowd?.near(floor, at, 0.55) ?? g.zombies).some(
      (other) =>
        other !== z &&
        other.hp > 0 &&
        other.floor === floor &&
        distance(other, at) < 0.55,
    );
  const survivorAt = (at: Point) =>
    g.survivors.find(
      (a) =>
        a.alive &&
        !a.escaped &&
        actorOnFloor(g, a, floor) &&
        distance(a, at) < 0.55,
    );
  // Stay within the actual well: never skip a barricade or arrive through a
  // wall into the lobby. Body occupancy is checked afresh for every arrival.
  if (next.layout === "pursuit") {
    const points = [
      { x: p.x - 0.5, y: p.y - 0.5 },
      { x: p.x + 0.5, y: p.y - 0.5 },
      { x: p.x - 0.5, y: p.y + 0.5 },
      { x: p.x + 0.5, y: p.y + 0.5 },
      p,
    ];
    const position = points.find(
      (point) =>
        !solid(next, point, 0.25, undefined, true) &&
        walkSegment(next, p, point) &&
        !bubbleAt(point) &&
        !zombieAt(point) &&
        !survivorAt(point),
    );
    if (position) return { kind: "arrive", floor, position: { ...position } };
  }
  const ahead = (
    crowd?.near(z.floor, source.stairs, wellRadius) ?? g.zombies
  ).some(
    (other) =>
      other !== z &&
      other.floor === z.floor &&
      other.hp > 0 &&
      other.stagger <= 0 &&
      other.stairUntil !== undefined &&
      other.stairUntil <= g.time + 1e-8 &&
      distance(other, source.stairs) <= wellRadius &&
      (other.stairUntil < z.stairUntil! ||
        (other.stairUntil === z.stairUntil && other.id < z.id)),
  );
  if (ahead) return { kind: "wait" };
  if (
    [-0.22, 0.22].some((dx) =>
      [-0.22, 0.22].some((dy) => wall(next, p.x + dx, p.y + dy)),
    )
  )
    return { kind: "wait" };
  if (bubbleAt(p)) return { kind: "wait" };
  const object = next.furniture.find((o) => inFurniture(p, o, 0.22));
  if (object) return { kind: "furniture", floor, position: { ...p }, object };
  if (zombieAt(p)) return { kind: "wait" };
  // A survivor cannot become an invulnerable plug in the arrival point.
  const actor = survivorAt(p);
  if (actor)
    return canSee(next, p, actor, 0.78, actor.vault?.obstacle) &&
      line(next, p, actor, true, actor.vault?.obstacle)
      ? { kind: "survivor", floor, position: { ...p }, actor }
      : { kind: "wait" };
  return { kind: "arrive", floor, position: { ...p } };
}

/** Only the actual visible stair mouth is marked, never the body on another floor. */
export function stairContactCues(
  g: Game,
  observer: Actor,
  radius = sightRadius(g.floors[observer.floor]),
) {
  const f = g.floors[observer.floor];
  return g.events
    .slice(-80)
    .filter(
      (e): e is WorldEvent & { position: Point } =>
        !!e.stairContact &&
        !!e.position &&
        e.floor === observer.floor &&
        e.at <= g.time &&
        g.time - e.at < 0.3 &&
        (observer.id === "human" ? playerCanSee : canSee)(
          f,
          observer,
          e.position,
          radius,
        ),
    );
}

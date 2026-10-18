import {
  type Actor,
  CONFIG,
  type Furniture,
  type Game,
  type Point,
  type WorldEvent,
  type Zombie,
  distance,
} from "./model";
import { inFurniture, line, wall } from "./spatial";
import { canSee, playerCanSee, sightRadius } from "./visibility";
import type { ZombieIndex } from "./zombie-index";
export type StairArrival =
  | { kind: "wait" | "cancel" }
  | { kind: "arrive"; floor: number; position: Point }
  | { kind: "furniture"; floor: number; position: Point; object: Furniture }
  | { kind: "survivor"; floor: number; position: Point; actor: Actor };
/** The point portal is one physical exit. Oldest completed flight keeps contact
 * through its cooldown; queued bodies cannot take turns multiplying damage. */
export function zombieStairArrival(
  g: Game,
  z: Zombie,
  crowd?: ZombieIndex,
): StairArrival | undefined {
  if (z.stairUntil === undefined) return;
  const source = g.floors[z.floor],
    next = g.floors[z.floor + 1];
  if (
    !source ||
    !next ||
    z.floor >= CONFIG.floors ||
    distance(z, source.stairs) > 0.8
  )
    return { kind: "cancel" };
  if (g.time + 1e-8 < z.stairUntil) return { kind: "wait" };
  const ahead = (crowd?.near(z.floor, source.stairs, 0.8) ?? g.zombies).some(
    (other) =>
      other !== z &&
      other.floor === z.floor &&
      other.hp > 0 &&
      other.stagger <= 0 &&
      other.stairUntil !== undefined &&
      other.stairUntil <= g.time + 1e-8 &&
      distance(other, source.stairs) <= 0.8 &&
      (other.stairUntil < z.stairUntil! ||
        (other.stairUntil === z.stairUntil && other.id < z.id)),
  );
  if (ahead) return { kind: "wait" };
  const p = next.entry,
    floor = next.index;
  if (
    [-0.22, 0.22].some((dx) =>
      [-0.22, 0.22].some((dy) => wall(next, p.x + dx, p.y + dy)),
    )
  )
    return { kind: "wait" };
  if (
    g.effects.some(
      (e) =>
        e.kind === "bubble" &&
        e.until > g.time &&
        e.floor === floor &&
        canSee(next, e, p, e.radius + 0.5),
    )
  )
    return { kind: "wait" };
  const object = next.furniture.find((o) => inFurniture(p, o, 0.22));
  if (object) return { kind: "furniture", floor, position: { ...p }, object };
  if (
    (crowd?.near(floor, p, 0.55) ?? g.zombies).some(
      (other) =>
        other !== z &&
        other.hp > 0 &&
        other.floor === floor &&
        distance(other, p) < 0.55,
    )
  )
    return { kind: "wait" };
  // A survivor cannot become an invulnerable plug in the arrival point.
  const actor = g.survivors.find(
    (a) => a.alive && !a.escaped && a.floor === floor && distance(a, p) < 0.55,
  );
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

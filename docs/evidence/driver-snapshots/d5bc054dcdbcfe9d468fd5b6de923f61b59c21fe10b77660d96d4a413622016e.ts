import { type Actor, type Game, type Point, distance } from "./model";
import { inFurniture, solid } from "./spatial";
import { canSee } from "./visibility";
import { survivorPath } from "./navigation";
import { routeContacts } from "./survivor-strategy";

/** Step out of a visible teammate's imminent transport path. No furniture,
 * reservation, reward or other actor is moved by this planner. */
export function chooseFurnitureYield(g: Game, a: Actor): Point | undefined {
  if (a.defensePlan || a.handling || a.vault) return;
  const f = g.floors[a.floor];
  for (const b of g.survivors) {
    const plan = b.defensePlan;
    if (
      b === a ||
      !b.alive ||
      b.escaped ||
      b.floor !== a.floor ||
      b.activity !== "defending" ||
      !plan ||
      !canSee(f, a, b)
    )
      continue;
    const o = f.furniture.find((o) => o.id === plan.object && !o.destroyed),
      next = plan.route[0];
    if (!o || !next || !canSee(f, a, o, undefined, o.id)) continue;
    const dx = next.x - o.x,
      dy = next.y - o.y,
      length = Math.hypot(dx, dy);
    if (length < 0.025) continue;
    const scale = Math.min(0.45, length) / length,
      imminent = { ...o, x: o.x + dx * scale, y: o.y + dy * scale };
    if (!inFurniture(a, imminent, 0.28)) continue;
    // Clear the whole current transport leg, not just one step into its path.
    const left = Math.min(o.x, next.x) - o.w / 2 - 0.6,
      right = Math.max(o.x, next.x) + o.w / 2 + 0.6,
      top = Math.min(o.y, next.y) - o.h / 2 - 0.6,
      bottom = Math.max(o.y, next.y) + o.h / 2 + 0.6;
    const enemies = g.zombies.filter(
      (z) => z.hp > 0 && z.floor === a.floor && canSee(f, a, z),
    );
    const choices = [
      { x: a.x, y: top },
      { x: a.x, y: bottom },
      { x: left, y: a.y },
      { x: right, y: a.y },
    ].filter(
      (p) =>
        !solid(f, p) &&
        !g.survivors.some(
          (c) =>
            c !== a &&
            c.alive &&
            !c.escaped &&
            c.floor === a.floor &&
            distance(c, p) < 0.55,
        ),
    );
    const ranked = choices
      .map((p) => ({ p, route: survivorPath(f, a, p) }))
      .filter((v) => v.route.length && !routeContacts(a, v.route, enemies))
      .map((v) => {
        let from: Point = a,
          cost = 0;
        for (const p of v.route) {
          cost += distance(from, p) + (p.action ? 2 : 0);
          from = p;
        }
        return { p: v.p, cost };
      })
      .sort((b, c) => b.cost - c.cost);
    if (ranked.length) return ranked[0].p;
  }
}

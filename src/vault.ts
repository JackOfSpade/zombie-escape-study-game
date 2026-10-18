import { localPoint } from "./furniture-geometry";
import { type Actor, type Furniture, type Game, distance } from "./model";
import { walkSegment } from "./navigation";
import { inFurniture } from "./spatial";
import { rayBodyDistance } from "./visibility";
/** Extend across landing-blocking props until the first safe gap; walls/doors remain solid. */
export function planVault(g: Game, a: Actor, first: Furniture) {
  const f = g.floors[a.floor],
    q = localPoint(a, first),
    h = localPoint(
      { x: first.x + a.heading.x, y: first.y + a.heading.y },
      first,
    );
  const horizontal = Math.abs(h.x) > Math.abs(h.y),
    dir = Math.sign(horizontal ? h.x : h.y);
  if (!dir || dir * (horizontal ? q.x : q.y) >= 0) return;
  // Preserve the faced object's normal, including rotation and off-centre approaches.
  const angle = first.angle ?? 0;
  const dx = dir * (horizontal ? Math.cos(angle) : -Math.sin(angle)),
    dy = dir * (horizontal ? Math.sin(angle) : Math.cos(angle));
  const ignored = new Set<string>([first.id]);
  let length = 0;
  for (let pass = 0; pass <= f.furniture.length; pass++) {
    let changed = false;
    for (const o of f.furniture) {
      if (
        o.destroyed ||
        o.kind === "door" ||
        o.kind === "gate" ||
        !inFurniture(o, o)
      )
        continue;
      const hit = rayBodyDistance(a, dx, dy, o, 0.22);
      if (o === first && !Number.isFinite(hit)) return;
      if (o !== first && hit > length + 0.05) continue;
      const local = localPoint(a, o),
        direction = localPoint({ x: o.x + dx, y: o.y + dy }, o);
      let near = -Infinity,
        far = Infinity;
      for (const [start, d, half] of [
        [local.x, direction.x, o.w / 2 + 0.55],
        [local.y, direction.y, o.h / 2 + 0.55],
      ]) {
        if (Math.abs(d) < 1e-10) {
          if (Math.abs(start) > half) {
            far = -Infinity;
            break;
          }
          continue;
        }
        const lo = (-half - start) / d,
          hi = (half - start) / d;
        near = Math.max(near, Math.min(lo, hi));
        far = Math.min(far, Math.max(lo, hi));
      }
      if (far < Math.max(0, near) || far < 0) continue;
      if (!ignored.has(o.id)) {
        ignored.add(o.id);
        changed = true;
      }
      if (far > length) {
        length = far;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const to = { x: a.x + dx * length, y: a.y + dy * length };
  if (
    !length ||
    !Number.isFinite(length) ||
    !walkSegment(
      { ...f, furniture: f.furniture.filter((o) => !ignored.has(o.id)) },
      a,
      to,
    )
  )
    return;
  if (
    g.survivors.some(
      (b) =>
        b !== a &&
        b.floor === a.floor &&
        b.alive &&
        !b.escaped &&
        distance(b, to) < 0.55,
    ) ||
    g.zombies.some(
      (z) => z.floor === a.floor && z.hp > 0 && distance(z, to) < 0.55,
    )
  )
    return;
  return { to, obstacles: [...ignored] };
}

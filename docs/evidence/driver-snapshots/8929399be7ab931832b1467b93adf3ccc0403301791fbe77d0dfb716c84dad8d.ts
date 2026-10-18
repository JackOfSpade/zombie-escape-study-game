import { type Actor, type Floor, type Furniture, distance } from "./model";
import { inFurniture, solid } from "./spatial";
import { canSee, rayBoxDistance } from "./visibility";

/** Reach an exposed surface, rather than an arbitrary object-center radius. */
export function canGrip(f: Floor, a: Actor, o: Furniture) {
  if (
    !a.alive ||
    a.escaped ||
    a.stairTravel ||
    a.floor !== o.floor ||
    o.destroyed ||
    !o.speed ||
    inFurniture(a, o, 0.22) ||
    solid(f, a, 0.22, o.id)
  )
    return false;
  const contact = {
    x: Math.max(o.x - o.w / 2, Math.min(a.x, o.x + o.w / 2)),
    y: Math.max(o.y - o.h / 2, Math.min(a.y, o.y + o.h / 2)),
  };
  const reach = distance(a, contact);
  if (reach > 1.05 || !canSee({ ...f, furniture: [] }, a, contact, 1.05))
    return false;
  const dx = (contact.x - a.x) / reach,
    dy = (contact.y - a.y) / reach;
  return f.furniture.every(
    (other) =>
      other.id === o.id ||
      !inFurniture(other, other) ||
      rayBoxDistance(a, dx, dy, other) >= reach - 1e-7,
  );
}

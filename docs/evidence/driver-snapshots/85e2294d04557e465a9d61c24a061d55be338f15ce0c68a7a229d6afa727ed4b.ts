import type { Actor, Floor, Furniture, Point } from "./model";
import { solid, wall } from "./spatial";
export function rememberPlace(a: Actor, key: string) {
  if (!a.seen.includes(key)) a.seen.push(key);
}
/** Cross a visible doorway using only its local footprint and the approach
 * side. No hidden station coordinates or unseen room contents choose the goal. */
export function doorwayGoal(f: Floor, a: Point, door: Furniture) {
  const axis = door.h >= door.w ? "x" : "y";
  const sign = a[axis] < door[axis] ? 1 : -1;
  const half = (axis === "x" ? door.w : door.h) / 2;
  for (const extra of [0.8, 1.3, 1.8]) {
    const goal = { x: door.x, y: door.y };
    goal[axis] += sign * (half + extra);
    if (!solid(f, goal)) return goal;
  }
  return undefined;
}
/** Retain coarse room sampling but include every cell in a narrow passage.
 * A two-tile stride alone misses alternating one-tile corridor centerlines. */
export function explorationCell(f: Floor, x: number, y: number) {
  return (
    (x % 2 === 1 && y % 2 === 1) ||
    (wall(f, x - 0.5, y + 0.5) && wall(f, x + 1.5, y + 0.5)) ||
    (wall(f, x + 0.5, y - 0.5) && wall(f, x + 0.5, y + 1.5))
  );
}

export function observeDoorEntry(f: Floor, a: Actor) {
  const pursuit = a.exploringDoor;
  if (!pursuit) return;
  if (pursuit.floor !== a.floor) {
    delete a.exploringDoor;
    return;
  }
  const door = f.furniture.find(
    (o) => o.id === pursuit.id && o.kind === "door",
  );
  if (!door) {
    delete a.exploringDoor;
    return;
  }
  const axis = door.h >= door.w ? "x" : "y",
    lateral = axis === "x" ? "y" : "x";
  const sign = Math.sign(pursuit.goal[axis] - door[axis]),
    half = (axis === "x" ? door.w : door.h) / 2;
  const across = sign * (a[axis] - door[axis]);
  if (
    across > half + 0.22 &&
    across < half + 2 &&
    Math.abs(a[lateral] - door[lateral]) <
      (axis === "x" ? door.h : door.w) / 2 + 0.22
  ) {
    rememberPlace(a, `entered-door-${door.id}`);
    delete a.exploringDoor;
  }
}

import {
  type Actor,
  type Game,
  type Point,
  CONFIG,
  distance,
  event,
} from "./model";
import { walkSegment } from "./navigation";
import { solid } from "./spatial";
import { inStairwell } from "./stairwell";

export interface StairTravel {
  fromFloor: number;
  toFloor: number;
  origin: Point;
  destination: Point;
  until: number;
}
/** Which staircase on its floor the survivor is standing in, if any. */
export function stairwellAt(g: Game, a: Actor): "up" | "down" | undefined {
  const f = g.floors[a.floor];
  if (!f) return undefined;
  if (a.floor < CONFIG.floors && inStairwell(a, f.stairs)) return "up";
  if (a.floor > 0 && inStairwell(a, f.entry)) return "down";
  return undefined;
}
/** Walking into a staircase starts its flight. Standing in one, or arriving
 * in one from another floor, does not start another; the survivor must step
 * out and back in. A locked staircase refuses the entry and says why. */
export function enterStairs(g: Game, a: Actor) {
  const well = a.alive && !a.escaped ? stairwellAt(g, a) : undefined;
  if (well === a.stairwell) return false;
  if (well) a.stairwell = well;
  else delete a.stairwell;
  if (!well || a.stairTravel || a.vault) return false;
  return beginStairs(g, a, well === "down");
}
export function cancelStairs(g: Game, a: Actor) {
  if (!a.stairTravel) return;
  delete a.stairTravel;
  a.activity = "exploring";
  if (a.id === "human")
    g.notice = "You left the staircase. You are still on this floor.";
}
export function beginStairs(g: Game, a: Actor, down = false) {
  if (!a.alive || a.escaped || a.vault || a.stairTravel) return false;
  const source = g.floors[a.floor],
    marker = down ? source.entry : source.stairs;
  if (
    (down && a.floor === 0) ||
    (!down && a.floor >= CONFIG.floors) ||
    !inStairwell(a, marker) ||
    !walkSegment(source, a, marker)
  )
    return false;
  if (!down && !a.access.includes(a.floor)) {
    if (a.id === "human") {
      g.notice =
        "This staircase is locked for you. Solve a solo terminal on this floor for personal stair access.";
      event(
        g,
        "stairs-locked",
        "The staircase refused a survivor without personal access.",
        a.floor,
        a.id,
      );
    }
    return false;
  }
  const toFloor = a.floor + (down ? -1 : 1),
    f = g.floors[toFloor],
    destination = down ? { x: f.stairs.x, y: f.stairs.y + 1 } : { ...f.entry };
  a.stairTravel = {
    fromFloor: a.floor,
    toFloor,
    origin: { x: a.x, y: a.y },
    destination,
    until: g.time + CONFIG.stairSeconds,
  };
  delete a.station;
  delete a.handling;
  delete a.grip;
  delete a.defensePlan;
  delete a.exploringDoor;
  delete a.fleeTarget;
  delete a.fleeFloor;
  a.fleeUntil = 0;
  a.path = [];
  delete a.target;
  delete a.navTarget;
  a.repath = 0;
  a.activity = "climbing";
  event(
    g,
    "survivor-stairs",
    `${a.name} entered the ${down ? "descending" : "ascending"} stair flight.`,
    a.floor,
    a.id,
  );
  if (a.id === "human")
    g.notice = down
      ? "Taking the stairs down. Step back out to stay on this floor."
      : "Climbing the stairs. Step back out to stay on this floor.";
  return true;
}
/** The survivor stays exposed inside the staircase until a clear connected
 * landing is available. Leaving the well, or being pushed out, cancels. */
export function advanceStairs(g: Game, a: Actor) {
  const travel = a.stairTravel;
  if (!travel) return false;
  const source = g.floors[travel.fromFloor],
    marker = travel.toFloor > travel.fromFloor ? source?.stairs : source?.entry;
  if (
    !a.alive ||
    a.escaped ||
    a.floor !== travel.fromFloor ||
    !marker ||
    !inStairwell(a, marker)
  ) {
    cancelStairs(g, a);
    return false;
  }
  if (g.time + 1e-8 < travel.until) return true;
  const f = g.floors[travel.toFloor];
  const candidates = [
    { x: 0, y: 0 },
    { x: 0, y: 0.7 },
    { x: 0.7, y: 0 },
    { x: -0.7, y: 0 },
    { x: 0, y: -0.7 },
  ].map((p) => ({
    x: travel.destination.x + p.x,
    y: travel.destination.y + p.y,
  }));
  const landing = candidates.find(
    (p) =>
      !solid(f, p) &&
      walkSegment(f, travel.destination, p) &&
      !g.survivors.some(
        (b) =>
          b !== a &&
          b.alive &&
          !b.escaped &&
          b.floor === travel.toFloor &&
          distance(b, p) < 0.55,
      ) &&
      !g.zombies.some(
        (z) => z.hp > 0 && z.floor === travel.toFloor && distance(z, p) < 0.55,
      ),
  );
  if (!landing) {
    if (a.id === "human")
      g.notice = "Stair landing blocked. Step back out to stay on this floor.";
    return true;
  }
  a.floor = travel.toFloor;
  Object.assign(a, landing);
  delete a.stairTravel;
  a.path = [];
  delete a.target;
  delete a.navTarget;
  a.repath = 0;
  a.activity = "exploring";
  // Arriving inside the other well must not immediately start the return flight.
  const arrivedIn = stairwellAt(g, a);
  if (arrivedIn) a.stairwell = arrivedIn;
  else delete a.stairwell;
  const text = `${a.name} reached ${a.floor === CONFIG.floors ? "the rooftop" : `Floor ${a.floor + 1}`}.`;
  event(g, "climb", text, a.floor, a.id);
  if (a.id === "human") g.notice = text;
  return true;
}

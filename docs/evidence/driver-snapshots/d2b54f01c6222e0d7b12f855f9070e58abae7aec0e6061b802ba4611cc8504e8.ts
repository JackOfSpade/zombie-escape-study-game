import {
  type Game,
  type Actor,
  type Point,
  CONFIG,
  distance,
  event,
} from "./model";
import { solid } from "./spatial";
import { walkSegment } from "./navigation";

export interface StairTravel {
  fromFloor: number;
  toFloor: number;
  origin: Point;
  destination: Point;
  until: number;
}
export function cancelStairs(g: Game, a: Actor) {
  if (!a.stairTravel) return;
  delete a.stairTravel;
  a.activity = "exploring";
  if (a.id === "human")
    g.notice = "Stair traversal cancelled. You are still on this floor.";
}
export function beginStairs(g: Game, a: Actor, down = false) {
  if (!a.alive || a.escaped || a.vault || a.stairTravel) return false;
  const source = g.floors[a.floor],
    marker = down ? source.entry : source.stairs;
  if (
    (down && a.floor === 0) ||
    (!down && a.floor >= CONFIG.floors) ||
    distance(a, marker) > 1.8 ||
    !walkSegment(source, a, marker)
  )
    return false;
  if (!down && !a.access.includes(a.floor)) {
    if (a.id === "human")
      g.notice =
        "Personal stair access required. Complete a terminal or meaningfully defend a shared room.";
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
    g.notice = "Climbing the stairs. Move to cancel and stay on this floor.";
  return true;
}
/** The survivor stays exposed at the departure until a clear connected landing is available. */
export function advanceStairs(g: Game, a: Actor) {
  const travel = a.stairTravel;
  if (!travel) return false;
  if (
    !a.alive ||
    a.escaped ||
    a.floor !== travel.fromFloor ||
    distance(a, travel.origin) > 0.15
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
      g.notice =
        "Stair landing blocked. Move to cancel and stay on this floor.";
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
  const text = `${a.name} reached ${a.floor === CONFIG.floors ? "the rooftop" : `Floor ${a.floor + 1}`}.`;
  event(g, "climb", text, a.floor, a.id);
  if (a.id === "human") g.notice = text;
  return true;
}

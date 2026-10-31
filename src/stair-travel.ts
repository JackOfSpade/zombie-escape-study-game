import {
  type Actor,
  type Game,
  type Point,
  CONFIG,
  devPass,
  distance,
  event,
} from "./model";
import { walkSegment } from "./navigation";
import { line, solid } from "./spatial";
import { STAIRWELL_RADIUS, inStairwell, stairwell } from "./stairwell";
import {
  cityStairBase,
  sampleStairRoute,
  STAIR_ROUTE_WIDTH,
} from "./stair-route";

/** On a carved well, walking this close to the marker completes the flight. */
export const STAIRWELL_DEEP = STAIRWELL_RADIUS / 2;

export interface StairTravel {
  fromFloor: number;
  toFloor: number;
  origin: Point;
  destination: Point;
  until: number;
  /** Saved metres along the physical exterior flight. Omitted for legacy/AI flights. */
  walked?: number;
  /** A licensed walker joined the ground flight from its actual city position. */
  cityBase?: boolean;
}
const refusedCityBase = new WeakSet<Actor>();

function refuseStairs(g: Game, a: Actor) {
  if (a.id !== "human") return;
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

/** The court can meet the bottom of the visible flight directly. Join its
 * continuous motor before touching the first riser, preserving the actual
 * departure position and requiring exactly the same personal credential. */
export function enterCityStairBase(g: Game, a: Actor, input: Point) {
  const base = cityStairBase(g);
  if (
    !base ||
    a.id !== "human" ||
    a.floor !== 0 ||
    !a.alive ||
    a.escaped ||
    a.vault ||
    a.stairTravel
  )
    return false;
  const forward = base.start.y - a.y,
    lateral = Math.abs(a.x - base.start.x),
    near =
      forward > 0 &&
      forward <= 0.95 &&
      lateral <= STAIR_ROUTE_WIDTH / 2 - 0.25 &&
      Math.hypot(forward, lateral) <= 1;
  if (!near) {
    refusedCityBase.delete(a);
    return false;
  }
  const magnitude = Math.hypot(input.x, input.y);
  if (!magnitude || input.y / magnitude < 0.5) return false;
  // Only this credentialed entry may ignore the flat footprint of the rise;
  // real furniture and all other city/office geometry remain blocking.
  const floor = g.floors[0],
    approach = {
      ...floor,
      city: {
        ...floor.city!,
        obstacles: floor.city!.obstacles.filter((o) => o.kind !== "stair-base"),
      },
    };
  if (!walkSegment(approach, a, base.start)) return false;
  if (!a.access.includes(0) && !devPass(a)) {
    if (!refusedCityBase.has(a)) refuseStairs(g, a);
    refusedCityBase.add(a);
    return false;
  }
  refusedCityBase.delete(a);
  return startStairTravel(
    g,
    a,
    {
      fromFloor: 0,
      toFloor: 1,
      origin: { x: a.x, y: a.y },
      destination: { ...g.floors[1].entry },
      until: g.time + CONFIG.stairSeconds,
      walked: 0,
      cityBase: true,
    },
    false,
    true,
  );
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
export function enterStairs(g: Game, a: Actor, walking = false) {
  const well = a.alive && !a.escaped ? stairwellAt(g, a) : undefined;
  if (well === a.stairwell) return false;
  if (well) a.stairwell = well;
  else delete a.stairwell;
  if (!well || a.stairTravel || a.vault) return false;
  return beginStairs(g, a, well === "down", walking);
}
export function cancelStairs(g: Game, a: Actor) {
  if (!a.stairTravel) return;
  delete a.stairTravel;
  a.activity = "exploring";
  if (a.id === "human")
    g.notice = "You left the staircase. You are still on this floor.";
}
export function beginStairs(g: Game, a: Actor, down = false, walking = false) {
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
  if (!down && !a.access.includes(a.floor) && !devPass(a)) {
    refuseStairs(g, a);
    return false;
  }
  const toFloor = a.floor + (down ? -1 : 1),
    f = g.floors[toFloor],
    destination = down ? { x: f.stairs.x, y: f.stairs.y + 1 } : { ...f.entry };
  return startStairTravel(
    g,
    a,
    {
      fromFloor: a.floor,
      toFloor,
      origin: { x: a.x, y: a.y },
      destination,
      until: g.time + CONFIG.stairSeconds,
      ...(walking ? { walked: 0 } : {}),
    },
    down,
    walking,
  );
}

function startStairTravel(
  g: Game,
  a: Actor,
  travel: StairTravel,
  down: boolean,
  walking: boolean,
) {
  a.stairTravel = travel;
  if (walking) delete a.physics;
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
    g.notice = walking
      ? "Emergency stairs. Walk along the flight and gallery; turn at the landings."
      : down
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
    (travel.walked === undefined && !inStairwell(a, marker))
  ) {
    cancelStairs(g, a);
    return false;
  }
  if (travel.walked !== undefined) {
    if (travel.walked + 1e-8 < sampleStairRoute(g, travel).length) return true;
  } else {
    const deep =
      source.layout === "pursuit" && distance(a, marker) <= STAIRWELL_DEEP;
    if (!deep && g.time + 1e-8 < travel.until) return true;
  }
  const f = g.floors[travel.toFloor];
  if (!f) return true;
  const well = stairwell(f, travel.toFloor > travel.fromFloor ? "down" : "up");
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0.7 },
    { x: 0.7, y: 0 },
    { x: -0.7, y: 0 },
    { x: 0, y: -0.7 },
  ].map((p) => ({
    x: travel.destination.x + p.x,
    y: travel.destination.y + p.y,
  }));
  points.push({ ...well.mouth });
  for (const depth of [0.5, 1, 1.5, 2, 2.5])
    for (const lateral of [0, 0.5, -0.5])
      points.push({
        x: well.mouth.x + lateral,
        y: well.mouth.y + well.open * depth,
      });
  const destinationBlocked = solid(
    f,
    travel.destination,
    0.25,
    undefined,
    true,
  );
  const candidates = points
    .map((p, i) => ({ p, i, d: distance(p, travel.destination) }))
    .sort((u, v) => u.d - v.d || u.i - v.i)
    .map((c) => c.p)
    .filter(
      (p) =>
        !solid(f, p) &&
        (walkSegment(f, travel.destination, p) ||
          // Furniture on the destination itself: the landing only needs a
          // wall-free line from the staircase, never a spot inside furniture.
          (destinationBlocked && line(f, travel.destination, p))),
    );
  const free = (p: Point) =>
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
    );
  // A crowded landing never blocks a flight forever: physics separates bodies.
  const landing = candidates.find(free) ?? candidates[0];
  if (!landing) {
    if (a.id === "human")
      g.notice = "Stair landing blocked. Step back out to stay on this floor.";
    return true;
  }
  a.floor = travel.toFloor;
  Object.assign(a, landing);
  if (travel.walked !== undefined) delete a.physics;
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

/** A narrow, railed stair is its own continuous motor, separate from the
 * floor's flat Planck world. Looking around or standing still never advances
 * it. Both forward and backward input use the actual current flight tangent. */
export function walkStairs(g: Game, a: Actor, input: Point, dt: number) {
  const travel = a.stairTravel;
  if (!travel || travel.walked === undefined) return false;
  const pose = sampleStairRoute(g, travel),
    n = Math.max(1, Math.hypot(input.x, input.y)),
    movement =
      ((input.x * pose.tangent.x + input.y * pose.tangent.y) / n) *
      a.speed *
      dt,
    next = Math.max(0, Math.min(pose.length, travel.walked + movement));
  if (movement < 0 && next <= 1e-8) {
    Object.assign(a, travel.origin);
    delete a.physics;
    // Returning to the same doorway is an arrival, not a fresh entry. The
    // next backward step must be able to leave the well normally.
    a.stairwell = travel.toFloor > travel.fromFloor ? "up" : "down";
    cancelStairs(g, a);
    return true;
  }
  travel.walked = next;
  const stepped = sampleStairRoute(g, travel);
  a.x = stepped.x;
  a.y = stepped.z;
  if (movement !== 0) {
    a.heading = { x: input.x / n, y: input.y / n };
    a.noiseUntil = g.time + 0.4;
    a.noiseLevel = 4;
  }
  advanceStairs(g, a);
  return true;
}

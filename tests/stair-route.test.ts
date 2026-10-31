import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { parseScenario } from "../src/gametest/schema";
import type { Game, Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import {
  FLOOR_HEIGHT,
  buildStairRoute,
  sampleStairRoute,
} from "../src/stair-route";
import { beginStairs } from "../src/stair-travel";
import { outsideBuilding } from "../src/view3d/exterior-layout";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const DT = 1 / 30;
function fixture() {
  const scenario = parseScenario(
    readFileSync("tests/fixtures/gametest/stairs-continuous-idle.json", "utf8"),
  );
  const g = new TestRunner(scenario, roadmap).game,
    a = g.survivors[0];
  Object.assign(a, g.floors[0].stairs);
  step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.ok(a.stairTravel);
  assert.ok(a.elevated);
  return { g, a };
}
function bodyPose(g: Game) {
  const a = g.survivors[0];
  return { x: a.x, y: a.y, feet: a.elevated?.feet ?? a.floor * FLOOR_HEIGHT };
}
function walkTo(g: Game, x: number, y: number, maxTicks = 1000) {
  const a = g.survivors[0];
  for (
    let i = 0;
    i < maxTicks && Math.hypot(a.x - x, a.y - y) > a.speed * DT;
    i++
  ) {
    const before = bodyPose(g),
      dx = x - a.x,
      dy = y - a.y,
      n = Math.hypot(dx, dy);
    step(g, DT, { x: dx / n, y: dy / n, grab: false, stairWalk: true });
    const after = bodyPose(g);
    assert.ok(
      Math.hypot(after.x - before.x, after.y - before.y) <= a.speed * DT + 1e-6,
      "horizontal movement remains bounded and never snaps to the route",
    );
    if (a.elevated?.grounded)
      assert.ok(
        Math.abs(after.feet - before.feet) <= 0.3 + 1e-6,
        "grounded treads stay within the step height",
      );
  }
  assert.ok(
    Math.hypot(a.x - x, a.y - y) <= a.speed * DT + 1e-6,
    `walker reaches (${x}, ${y}), got (${a.x}, ${a.y})`,
  );
}
function finishWalking(g: Game) {
  const a = g.survivors[0],
    travel = a.stairTravel!,
    route = buildStairRoute(g, travel),
    segment = sampleStairRoute(g, travel).segment,
    destinationFloor = travel.toFloor;
  for (const p of route.points.slice(segment + 1)) walkTo(g, p.x, p.z);
  const f = g.floors[destinationFloor];
  walkTo(
    g,
    route.points.at(-1)!.x,
    destinationFloor > travel.fromFloor
      ? f.boundary!.bottom - 0.5
      : f.boundary!.top + 0.5,
  );
  assert.equal(
    a.stairTravel,
    undefined,
    "walking into the actual floor plate completes a flight",
  );
  assert.equal(a.floor, destinationFloor);
}

test("walkers can move across the deck instead of being pinned to its centreline", () => {
  const { g, a } = fixture(),
    x = a.x,
    y = a.y;
  for (let i = 0; i < 3; i++)
    step(g, DT, { x: 1, y: 0, grab: false, stairWalk: true });
  assert.ok(
    a.x > x + 0.3,
    "perpendicular input produces real lateral movement",
  );
  assert.ok(Math.abs(a.y - y) < 1e-8);
  assert.equal(a.hp, 100);
});

test("walkable stairs stop, save their exact body position, and require actual movement to arrive", () => {
  const { g, a } = fixture();
  walkTo(g, 22, 0);
  walkTo(g, 27, 0);
  const pose = bodyPose(g),
    metres = a.stairTravel!.walked,
    learning = JSON.stringify(g.study);
  for (let i = 0; i < 180; i++)
    step(g, DT, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel!.walked, metres);
  assert.deepEqual(bodyPose(g), pose);
  const body = structuredClone(a.elevated),
    restored = recover(decode(encode(g))),
    b = restored.survivors[0];
  assert.deepEqual(bodyPose(restored), pose);
  assert.deepEqual(b.elevated, body);
  finishWalking(restored);
  assert.equal(b.floor, 1);
  assert.equal(b.hp, 100);
  assert.equal(b.access.includes(1), false);
  assert.equal(JSON.stringify(restored.study), learning);
});

test("the emergency stair geometry wraps outside the shell and rises by exactly one storey", () => {
  const { g, a } = fixture(),
    travel = a.stairTravel!,
    route = buildStairRoute(g, travel);
  assert.ok(route.length > 40);
  assert.deepEqual(route.points[0], {
    x: travel.origin.x,
    y: 0,
    z: travel.origin.y,
  });
  assert.deepEqual(route.points.at(-1), {
    x: travel.destination.x,
    y: FLOOR_HEIGHT,
    z: travel.destination.y,
  });
  for (let walked = 0; walked < route.length; walked += 0.1) {
    const p = sampleStairRoute(g, travel, walked);
    assert.equal(
      outsideBuilding(g.floors[0], p.x, p.z),
      true,
      `route at ${walked}m cannot cut through an office`,
    );
    assert.ok(p.y >= 0 && p.y <= FLOOR_HEIGHT);
  }
});

test("reversing returns in place without a teleport and descending uses the real gallery", () => {
  const { g, a } = fixture(),
    origin = { ...a.stairTravel!.origin };
  for (let i = 0; i < 10; i++)
    step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  walkTo(g, origin.x, origin.y + 1.6);
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 0);
  assert.equal(
    g.events.some((e) => e.type === "climb"),
    false,
  );
  assert.ok(a.y > origin.y + 1, "backward input physically leaves the doorway");
  walkTo(g, origin.x, origin.y);
  assert.ok(a.stairTravel);
  finishWalking(g);
  const upper = g.floors[1];
  walkTo(g, upper.entry.x, upper.entry.y);
  if (!a.stairTravel) assert.equal(beginStairs(g, a, true, true), true);
  const down = buildStairRoute(g, a.stairTravel!);
  assert.equal(down.points[0].y, FLOOR_HEIGHT);
  assert.equal(down.points.at(-1)!.y, 0);
  finishWalking(g);
  assert.equal(a.hp, 100);
});

test("personal permission and real furniture collision enforce stair entry and blocked arrivals", () => {
  const { g, a } = fixture(),
    upper = g.floors[1],
    obstacle = upper.furniture.find(
      (o) => o.kind === "shelf" || o.kind === "cabinet",
    )!;
  assert.ok(obstacle);
  Object.assign(obstacle, { x: upper.entry.x, y: upper.entry.y, w: 1.9, h: 2 });
  // Set up a saved body just outside the upper doorway: ordinary movement must
  // hit the visible furniture, without advancing an abstract route parameter.
  Object.assign(a, { x: upper.entry.x, y: upper.entry.y + 2, floor: 1 });
  Object.assign(a.elevated!, { feet: FLOOR_HEIGHT, peak: FLOOR_HEIGHT });
  a.stairTravel!.left = true;
  for (let i = 0; i < 60; i++)
    step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.ok(
    a.y >= obstacle.y + obstacle.h / 2 + 0.25,
    "the body stops at the actual furniture face",
  );
  assert.ok(a.stairTravel);
  obstacle.destroyed = true;
  walkTo(g, upper.entry.x, upper.boundary!.bottom - 0.5);
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 1);
  Object.assign(a, upper.stairs);
  delete a.stairwell;
  step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 1);
  assert.match(g.notice, /locked for you/);
});

test("zombie contact follows the walker's actual feet height rather than a cached route position", () => {
  const { g, a } = fixture(),
    p = g.floors[1].entry;
  Object.assign(a, { x: p.x, y: p.y + 0.4 });
  Object.assign(a.elevated!, { feet: FLOOR_HEIGHT, peak: FLOOR_HEIGHT });
  a.stairTravel!.left = true;
  g.zombies = [
    {
      id: "below-gallery",
      x: a.x,
      y: a.y,
      floor: 0,
      hp: 60,
      path: [],
      repath: 100,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  step(g, DT, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(
    a.hp,
    100,
    "an enemy one storey beneath cannot land a contact attack",
  );
  const z = g.zombies[0];
  Object.assign(z, { floor: 1, x: a.x, y: a.y, cooldown: 0 });
  step(g, DT, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(
    a.hp,
    86,
    "a zombie at the actual doorway still makes ordinary damaging contact",
  );
});

test("old saved route progress restores a physical body on the nearest real tread", () => {
  const { g, a } = fixture(),
    route = buildStairRoute(g, a.stairTravel!);
  const beforeFlight =
    Math.hypot(
      route.points[1].x - route.points[0].x,
      route.points[1].z - route.points[0].z,
    ) +
    Math.hypot(
      route.points[2].x - route.points[1].x,
      route.points[2].z - route.points[1].z,
    );
  a.stairTravel!.walked = beforeFlight + 3.1;
  const oldPose = sampleStairRoute(g, a.stairTravel!);
  Object.assign(a, { x: oldPose.x, y: oldPose.z });
  delete a.elevated;
  const restored = recover(decode(encode(g))),
    b = restored.survivors[0];
  step(restored, DT, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.ok(
    b.elevated?.grounded,
    "an old ramp pose settles on the matching tread",
  );
  assert.equal(b.x, oldPose.x);
  assert.equal(b.y, oldPose.z);
  assert.ok(
    Math.abs(b.elevated.feet - oldPose.y) <= 0.3,
    "only the tread-height migration changes elevation",
  );
  assert.equal(b.hp, 100);
  assert.ok(b.stairTravel);
});

test("an unlocked portal accepts outward walking without an invisible leave-and-reenter requirement", () => {
  const scenario = parseScenario(
    readFileSync("tests/fixtures/gametest/stairs-continuous-idle.json", "utf8"),
  );
  const g = new TestRunner(scenario, roadmap).game,
    a = g.survivors[0];
  Object.assign(a, g.floors[0].stairs);
  a.access = [];
  step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.equal(a.stairTravel, undefined);
  a.access = [0];
  const before = a.y;
  for (let i = 0; i < 15; i++)
    step(g, DT, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.ok(a.stairTravel);
  assert.ok(a.y < before - 1, "the newly open portal admits actual movement");
});

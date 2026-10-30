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
function fixture() {
  const scenario = parseScenario(
    readFileSync("tests/fixtures/gametest/stairs-continuous-idle.json", "utf8"),
  );
  const runner = new TestRunner(scenario, roadmap);
  const g = runner.game,
    a = g.survivors[0];
  Object.assign(a, g.floors[0].stairs);
  step(g, 1 / 30, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.ok(a.stairTravel);
  return { g, a };
}
function finishWalking(g: Game) {
  const a = g.survivors[0];
  for (let i = 0; i < 1600 && a.stairTravel; i++) {
    const before = sampleStairRoute(g, a.stairTravel),
      previous = { x: before.x, y: before.y, z: before.z };
    step(g, 1 / 30, { ...before.tangent, grab: false, stairWalk: true });
    if (a.stairTravel) {
      const after = sampleStairRoute(g, a.stairTravel);
      assert.ok(
        Math.hypot(
          after.x - previous.x,
          after.y - previous.y,
          after.z - previous.z,
        ) <=
          a.speed / 30 + 1e-7,
      );
      assert.ok(
        Math.abs(a.x - after.x) < 1e-8 && Math.abs(a.y - after.z) < 1e-8,
        "saved body follows the same continuous route as the camera",
      );
    }
  }
  assert.equal(
    a.stairTravel,
    undefined,
    "walking through every flight and gallery reaches a real landing",
  );
}

test("walkable stairs stop, save their exact position, and only reach the landing through actual movement", () => {
  const { g, a } = fixture();
  for (let i = 0; i < 20; i++)
    step(g, 1 / 30, { x: 0, y: -1, grab: false, stairWalk: true });
  const pose = sampleStairRoute(g, a.stairTravel!),
    metres = a.stairTravel!.walked,
    learning = JSON.stringify(g.study);
  for (let i = 0; i < 180; i++)
    step(g, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel!.walked, metres);
  assert.deepEqual(sampleStairRoute(g, a.stairTravel!), pose);
  const restored = recover(decode(encode(g))),
    b = restored.survivors[0];
  assert.deepEqual(sampleStairRoute(restored, b.stairTravel!), pose);
  finishWalking(restored);
  assert.equal(b.floor, 1);
  assert.deepEqual({ x: b.x, y: b.y }, restored.floors[1].entry);
  assert.equal(b.access.includes(1), false);
  assert.equal(JSON.stringify(restored.study), learning);
});

test("the physical emergency stair wraps outside the shell and rises by exactly one storey", () => {
  const { g, a } = fixture(),
    travel = a.stairTravel!,
    route = buildStairRoute(g, travel);
  assert.ok(
    route.length > 40,
    "the route spans the real north and south doors rather than warping between them",
  );
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
  assert.deepEqual(sampleStairRoute(g, travel, route.length), {
    ...route.points.at(-1)!,
    tangent: { x: 0, y: -1 },
    segment: route.points.length - 2,
    length: route.length,
  });
});

test("a walker can reverse to the departure landing and descending uses the same real gallery", () => {
  const { g, a } = fixture(),
    origin = { ...a.stairTravel!.origin };
  for (let i = 0; i < 10; i++)
    step(g, 1 / 30, { x: 0, y: -1, grab: false, stairWalk: true });
  for (let i = 0; i < 30 && a.stairTravel; i++)
    step(g, 1 / 30, { x: 0, y: 1, grab: false, stairWalk: true });
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 0);
  assert.deepEqual({ x: a.x, y: a.y }, origin);
  assert.equal(
    g.events.some((e) => e.type === "climb"),
    false,
  );
  for (let i = 0; i < 20; i++)
    step(g, 1 / 30, { x: 0, y: 1, grab: false, stairWalk: true });
  assert.equal(
    a.stairTravel,
    undefined,
    "stepping away after reversing cannot restart a flight every frame",
  );
  assert.ok(
    a.y > origin.y + 1,
    "backward input can physically leave the doorway",
  );
  Object.assign(a, origin);
  delete a.stairwell;
  step(g, 1 / 30, { x: 0, y: -1, grab: false, stairWalk: true });
  finishWalking(g);
  const upEnd = { x: a.x, y: a.y };
  assert.equal(beginStairs(g, a, true, true), true);
  const down = buildStairRoute(g, a.stairTravel!);
  assert.deepEqual(down.points[0], { x: upEnd.x, y: FLOOR_HEIGHT, z: upEnd.y });
  assert.equal(down.points.at(-1)!.y, 0);
  finishWalking(g);
  assert.equal(a.floor, 0);
});

test("personal stair permission and a blocked physical landing remain enforced for walkable flights", () => {
  const { g, a } = fixture();
  const upper = g.floors[1],
    obstacle = upper.furniture.find(
      (o) => o.kind === "shelf" || o.kind === "cabinet",
    )!;
  assert.ok(obstacle);
  Object.assign(obstacle, { x: upper.entry.x, y: upper.entry.y, w: 9, h: 9 });
  a.stairTravel!.walked = buildStairRoute(g, a.stairTravel!).length;
  step(g, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(a.floor, 0);
  assert.ok(a.stairTravel);
  assert.match(g.notice, /landing blocked/);
  obstacle.destroyed = true;
  step(g, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(a.floor, 1);
  Object.assign(a, upper.stairs);
  delete a.stairwell;
  step(g, 1 / 30, { x: 0, y: -1, grab: false, stairWalk: true });
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 1);
  assert.match(g.notice, /locked for you/);
});

test("zombie contact uses the walker's real elevation instead of the departure floor below the gallery", () => {
  const { g, a } = fixture();
  a.stairTravel!.walked = buildStairRoute(g, a.stairTravel!).length - 0.4;
  const p = sampleStairRoute(g, a.stairTravel!);
  Object.assign(a, { x: p.x, y: p.z });
  g.zombies = [
    {
      id: "below-gallery",
      x: p.x,
      y: p.z,
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
  step(g, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(
    a.hp,
    100,
    "an enemy one storey beneath the walker cannot land a contact attack",
  );
  const z = g.zombies[0];
  Object.assign(z, { floor: 1, x: p.x, y: p.z, cooldown: 0 });
  step(g, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
  assert.equal(
    a.hp,
    86,
    "a zombie at the actual upper doorway still makes ordinary damaging contact",
  );
});

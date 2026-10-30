import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cityApproachTarget,
  cityRouteLength,
  cityZombieSpeed,
  initCityInvasion,
  spawnCityReinforcements,
} from "../src/city-invasion";
import { step } from "../src/engine";
import { type Game, type Roadmap, distance } from "../src/model";
import { checkpointPhysics } from "../src/physics";
import { solid } from "../src/spatial";
import { spawnGrace, swarmPacing } from "../src/study-pacing";
import { createGame, createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const idle = { x: 0, y: 0, grab: false };
function fixture(seed = 21) {
  const g = createPlayableGame(seed, roadmap);
  g.id = `city-invasion-test-${seed}`;
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = Number.MAX_SAFE_INTEGER;
  g.survivors = g.survivors.slice(0, 1);
  // Keep this timing witness clear of prey diversions and NPC decisions.
  Object.assign(g.survivors[0], { floor: 4, x: 21.5, y: 10.5 });
  return g;
}

test("fresh city worlds begin with physical fronts across every outward street", () => {
  for (const seed of [1, 7, 21, 31]) {
    const g = fixture(seed),
      floor = g.floors[0],
      city = floor.city!;
    assert.ok(g.zombies.length >= 60 && g.zombies.length <= 90);
    assert.ok(g.zombies.length <= swarmPacing(g).cap);
    assert.equal(new Set(g.zombies.map((z) => z.id)).size, g.zombies.length);
    for (const route of city.approaches) {
      const front = g.zombies.filter((z) => z.cityApproach?.route === route.id);
      assert.ok(front.length >= 20, `${route.id} has a broad street front`);
      assert.ok(front.every((z) => !solid(floor, z, 0.24)));
      assert.ok(
        front.every(
          (z) => distance(z, city.approaches[0].points.at(-1)!) > 200,
        ),
      );
    }
    const rng = g.rng,
      positions = JSON.stringify(g.zombies);
    assert.equal(
      initCityInvasion(g),
      0,
      "initialization cannot duplicate a live or restored invasion",
    );
    assert.equal(JSON.stringify(g.zombies), positions);
    assert.equal(
      g.rng,
      rng,
      "the city never consumes world simulation randomness",
    );
  }
});

test("the centre leader starts one grace-period walk from the real gate contact face", () => {
  const g = fixture(),
    first = g.zombies[0],
    route = g.floors[0].city!.approaches.find(
      (r) => r.id === first.cityApproach!.route,
    )!,
    endpoint = route.points.at(-1)!;
  assert.equal(first.cityApproach!.lane, 0);
  assert.ok(
    Math.abs(distance(first, endpoint) - cityZombieSpeed(g) * spawnGrace(g)) <
      1e-8,
  );
  assert.ok(route.length > cityZombieSpeed(g) * spawnGrace(g) + 12);
  assert.ok(Math.abs(cityRouteLength(route.points) - route.length) < 1e-8);
  const goal = cityApproachTarget(g, first)!;
  assert.ok(
    distance(first, goal.point) <= 2 + 1e-9,
    "the motor only ray-sweeps a bounded local lookahead",
  );
  assert.equal(goal.speed, cityZombieSpeed(g));
});

test("route intent and exact position survive a JSON/physics checkpoint", () => {
  const g = fixture(),
    z = g.zombies.find((z) => z.cityApproach?.route === "west")!;
  const before = cityApproachTarget(g, z),
    copy = JSON.parse(JSON.stringify(g)) as Game,
    restored = copy.zombies.find((other) => other.id === z.id)!;
  assert.deepEqual(cityApproachTarget(copy, restored), before);
  assert.deepEqual(restored.cityApproach, z.cityApproach);
  assert.equal(restored.x, z.x);
  assert.equal(restored.y, z.y);
  assert.equal(copy.spawned, g.spawned);
});

test("a city zombie diverted around the office physically recovers its street route across a checkpoint", () => {
  let g = fixture(21);
  const floor = g.floors[0],
    boundary = floor.boundary!,
    left = Math.min(
      ...boundary.rows.slice(boundary.top, boundary.bottom).map((r) => r.left),
    ),
    id = g.zombies[0].id;
  g.zombies = [g.zombies[0]];
  // A synthetic post-chase position on the public west service court. Its
  // former prey has left sight; the saved south-avenue waypoint is behind the
  // office, so a direct return would run into real masonry.
  Object.assign(g.zombies[0], { x: left - 5, y: boundary.top + 3 });
  assert.equal(solid(floor, g.zombies[0], 0.26), false);
  let previous = { x: g.zombies[0].x, y: g.zombies[0].y };
  let checkpointed = false;
  for (let i = 0; i < 1800; i++) {
    step(g, 1 / 30, idle);
    const z = g.zombies.find((z) => z.id === id)!;
    assert.ok(
      distance(previous, z) <= cityZombieSpeed(g) / 30 + 0.008,
      "recovery uses ordinary bounded physical walking",
    );
    assert.equal(
      solid(g.floors[0], z, 0.23),
      false,
      "the recovery never cuts through city blocks or the office",
    );
    previous = { x: z.x, y: z.y };
    if (i === 180) {
      assert.ok(
        z.cityApproach?.recovery?.length,
        "the public-street detour is still active at the checkpoint",
      );
      const intent = JSON.stringify(z.cityApproach);
      checkpointPhysics(g);
      g = JSON.parse(JSON.stringify(g)) as Game;
      assert.equal(
        JSON.stringify(g.zombies[0].cityApproach),
        intent,
        "the remaining detour is saved exactly, rather than reconstructed from a hidden target",
      );
      checkpointed = true;
    }
    if (g.events.some((e) => e.type === "barricade-hit" && e.actor === id)) {
      assert.ok(checkpointed);
      assert.ok(g.time < 60);
      return;
    }
  }
  assert.fail(
    "the diverted zombie stopped at the office wall instead of using the real service court to return to the entrance",
  );
});

test("public street recovery is bounded, deterministic, and independent of hidden survivor locations", () => {
  for (const seed of [1, 7, 21, 31]) {
    const g = fixture(seed),
      floor = g.floors[0],
      boundary = floor.boundary!,
      left = Math.min(
        ...boundary.rows
          .slice(boundary.top, boundary.bottom)
          .map((r) => r.left),
      ),
      z = g.zombies[0];
    Object.assign(z, { x: left - 5, y: boundary.top + 3 });
    const copy = JSON.parse(JSON.stringify(g)) as Game;
    Object.assign(copy.survivors[0], { floor: 3, x: 34.5, y: 10.5 });
    const rng = g.rng,
      position = { x: z.x, y: z.y },
      goal = cityApproachTarget(g, z);
    assert.deepEqual(cityApproachTarget(copy, copy.zombies[0]), goal);
    assert.deepEqual(copy.zombies[0].cityApproach, z.cityApproach);
    assert.deepEqual(
      { x: z.x, y: z.y },
      position,
      "planning never changes the physical body position",
    );
    assert.equal(g.rng, rng);
    const detour = z.cityApproach!.recovery!;
    assert.ok(detour.length >= 2 && detour.length <= 97);
    assert.ok(
      detour.every((p) => !solid(floor, p, 0.23)),
      "public waypoints never occupy a city block or office wall",
    );
  }
});

test("the actual broad horde first contacts the main gate at the configured grace time", () => {
  let g = fixture(21);
  // A visible survivor behind the intact entrance must not draw the street
  // front into a grid-only detour or a shortcut across neighbouring blocks.
  Object.assign(g.survivors[0], { floor: 0, x: 22, y: 26.5 });
  const initial = g.zombies[0],
    id = initial.id,
    expected = spawnGrace(g),
    dt = 1 / 30;
  let previous = { x: initial.x, y: initial.y };
  for (let i = 0; i < Math.ceil((expected + 1) / dt); i++) {
    step(g, dt, idle);
    const front = g.zombies.find((z) => z.id === id)!;
    assert.ok(
      distance(previous, front) <= cityZombieSpeed(g) * dt + 0.008,
      "the front walks rather than teleporting to a timed arrival",
    );
    previous = { x: front.x, y: front.y };
    if (i === 2700) {
      checkpointPhysics(g);
      g = JSON.parse(JSON.stringify(g)) as Game;
    }
    const first = g.events.find((e) => e.type === "barricade-hit");
    if (first) {
      assert.ok(
        Math.abs(first.at - expected) <= dt + 1e-5,
        `first physical contact was at ${first.at}, expected ${expected}`,
      );
      assert.equal(
        first.actor,
        id,
        "the unobstructed physical centre leader arrives first",
      );
      return;
    }
  }
  assert.fail(
    "the live physical horde did not reach the gate by the configured grace time",
  );
});

test("leaving the building to meet the visible horde is dangerous before the arrival countdown expires", () => {
  const g = fixture(),
    front = g.zombies[0],
    human = g.survivors[0];
  g.zombies = [front];
  Object.assign(human, { floor: 0, x: front.x, y: front.y - 1.5 });
  for (let i = 0; i < 90 && human.hp === 100; i++) step(g, 1 / 30, idle);
  assert.ok(g.time < spawnGrace(g));
  assert.ok(
    human.hp < 100,
    "distant zombies are real attackers, not a harmless visual countdown",
  );
  assert.ok(
    front.y > 200,
    "the attack occurs where the player actually met the front",
  );
});

test("the route carries a zombie through a broken gate without turning it back to the contact point", () => {
  const g = fixture(),
    z = g.zombies[0],
    floor = g.floors[0],
    door = floor.furniture.find((o) => o.id === "main-gate")!,
    endpoint = floor.city!.approaches[0].points.at(-1)!;
  door.destroyed = true;
  Object.assign(z, endpoint);
  z.cityApproach!.waypoint = 999;
  const target = cityApproachTarget(g, z)!;
  assert.ok(target.point.y < floor.boundary!.bottom);
  z.y -= 0.2;
  assert.deepEqual(cityApproachTarget(g, z)!.point, target.point);
  z.y = floor.boundary!.bottom - 0.1;
  assert.equal(cityApproachTarget(g, z), undefined);
  assert.equal(z.cityApproach, undefined);
});

test("reinforcements originate behind the far corner, stay bounded, and do not appear in the player's view", () => {
  const g = fixture(),
    city = g.floors[0].city!,
    route = city.approaches[0];
  g.zombies = [];
  assert.equal(spawnCityReinforcements(g, 3), 3);
  assert.ok(
    g.zombies.every(
      (z) => z.cityApproach && distance(z, route.points.at(-1)!) > 200,
    ),
  );
  const corner = route.points[0],
    next = route.points[1],
    length = distance(corner, next);
  city.approaches = [route];
  g.zombies = [];
  Object.assign(g.survivors[0], {
    floor: 0,
    x: corner.x + ((next.x - corner.x) / length) * 2,
    y: corner.y + ((next.y - corner.y) / length) * 2,
  });
  assert.equal(
    spawnCityReinforcements(g, 1),
    0,
    "an observed feeder waits instead of visibly materializing a zombie",
  );
  const stored = g.spawned;
  g.survivors[0].floor = 4;
  assert.equal(spawnCityReinforcements(g, 1), 1);
  const prototype = g.zombies[0];
  g.zombies = Array.from({ length: swarmPacing(g).cap }, (_, i) => ({
    ...prototype,
    id: `capped-${i}`,
    x: prototype.x + i,
  }));
  assert.equal(spawnCityReinforcements(g, 1), 0);
  assert.equal(g.zombies.length, swarmPacing(g).cap);
  assert.equal(
    g.spawned,
    stored + 1,
    "the cap never consumes an identity or creates a hidden body",
  );
});

test("historical worlds retain their original spawn contract", () => {
  const g = createGame(21, roadmap),
    before = JSON.stringify(g);
  assert.equal(initCityInvasion(g), 0);
  assert.equal(spawnCityReinforcements(g, 3), 0);
  assert.equal(JSON.stringify(g), before);
});

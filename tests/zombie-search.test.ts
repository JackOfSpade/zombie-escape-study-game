import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import { distance, type Roadmap } from "../src/model";
import { canSee } from "../src/visibility";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const s = emptyScenario();
  s.entities = [
    { id: "human", kind: "player", x: 35, y: 25, floor: 1 },
    { id: "searcher", kind: "zombie", x: 12.5, y: 22.5, floor: 0 },
  ];
  return new TestRunner(s, roadmap).game;
}

test("an uninformed zombie plans only within its own visible neighborhood", () => {
  const g = fixture(),
    z = g.zombies[0],
    origin = { ...z };
  step(g, 1 / 30);
  assert.ok(z.path.length > 0, "actively explores");
  assert.ok(
    z.path.every(
      (p) => distance(origin, p) <= 6.1 && canSee(g.floors[0], origin, p, 6.1),
    ),
    "no route through unseen rooms or to undiscovered stairs",
  );
});

test("moving undiscovered stairs does not change a zombie's search decision", () => {
  const a = fixture(),
    b = fixture();
  b.floors[0].stairs = { x: 2.5, y: 30.5 };
  step(a, 1 / 30);
  step(b, 1 / 30);
  assert.deepEqual(a.zombies[0].path, b.zombies[0].path);
});

test("hidden survivors and remote geometry do not influence local exploration", () => {
  const a = fixture(),
    b = fixture();
  for (const g of [a, b]) {
    g.survivors[0].floor = 0;
    for (let y = 1; y < 33; y++) g.floors[0].tiles[y][19] = 1;
  }
  b.survivors[0].x = 38;
  b.survivors[0].y = 5;
  for (let y = 2; y < 20; y++) b.floors[0].tiles[y][30] = 1;
  step(a, 1 / 30);
  step(b, 1 / 30);
  assert.equal(a.zombies[0].target, undefined);
  assert.equal(b.zombies[0].target, undefined);
  assert.deepEqual(a.zombies[0].path, b.zombies[0].path);
});

test("one zombie seeing a survivor does not tell another zombie behind a wall", () => {
  const g = fixture(),
    witness = g.zombies[0],
    a = g.survivors[0];
  Object.assign(a, { floor: 0, x: 20.5, y: 22.5 });
  for (let y = 1; y < 33; y++) g.floors[0].tiles[y][9] = 1;
  const blind = { ...witness, id: "uninformed", x: 5.5, path: [] };
  g.zombies.push(blind);
  step(g, 1 / 30);
  assert.deepEqual(witness.target, { x: a.x, y: a.y });
  assert.equal(blind.target, undefined);
  assert.notEqual(witness.search, blind.search);
  assert.notEqual(witness.search!.trail, blind.search!.trail);
});

test("a lost visual trail stays at the last seen position, then expires", () => {
  const g = fixture(),
    z = g.zombies[0],
    a = g.survivors[0];
  Object.assign(a, { floor: 0, x: 20.5, y: 22.5 });
  step(g, 1 / 30);
  const seen = { ...z.target! };
  for (let y = 1; y < 33; y++) g.floors[0].tiles[y][17] = 1;
  Object.assign(a, { x: 35, y: 25 });
  for (let i = 0; i < 90; i++) step(g, 1 / 30);
  assert.deepEqual(z.target, seen);
  assert.ok(z.x < 17, "cannot follow the live survivor through a wall");
  for (let i = 0; i < 200; i++) step(g, 1 / 30);
  assert.equal(z.target, undefined);
});

test("audible footsteps give only a rough location to the nearby listener", () => {
  const g = fixture(),
    z = g.zombies[0],
    a = g.survivors[0];
  Object.assign(z, { x: 14.5, y: 16.5 });
  Object.assign(a, {
    floor: 0,
    x: 16.5,
    y: 16.5,
    noiseUntil: 5,
    noiseLevel: 4,
  });
  for (let y = 1; y < 33; y++) g.floors[0].tiles[y][15] = 1;
  g.floors[0].tiles[18][15] = 0;
  g.zombies.push({ ...z, id: "distant", x: 4.5, path: [] });
  assert.equal(canSee(g.floors[0], z, a, 12), false);
  step(g, 1 / 30);
  assert.ok(z.target, "heard through the nearby opening");
  assert.ok(distance(z.target, a) <= Math.SQRT2);
  assert.notDeepEqual(z.target, { x: a.x, y: a.y });
  assert.equal(g.zombies[1].target, undefined);
});

test("personal searches vary without consuming the world's random sequence", async () => {
  const { planZombieRoute } = await import("../src/zombie-search");
  const g = fixture(),
    z = g.zombies[0],
    rng = g.rng;
  const destinations = new Set<string>();
  for (let i = 0; i < 8; i++) {
    const other = { ...z, id: `individual-${i}`, path: [] };
    destinations.add(JSON.stringify(planZombieRoute(g, other).at(-1)));
  }
  assert.ok(
    destinations.size >= 3,
    "individuals choose different search branches",
  );
  assert.equal(g.rng, rng);
});

test("search memory survives a save, stays bounded and resets on another floor", async () => {
  const { planZombieRoute, prepareZombieSearch, ZOMBIE_SEARCH } =
    await import("../src/zombie-search");
  const { encode, decode } = await import("../src/persistence");
  const g = fixture(),
    z = g.zombies[0];
  planZombieRoute(g, z);
  z.search!.trail = Array.from({ length: 130 }, (_, i) => i + 100);
  planZombieRoute(g, z);
  assert.equal(z.search!.trail.length, ZOMBIE_SEARCH.trail);
  const restored = decode(encode(g)),
    rz = restored.zombies[0];
  assert.deepEqual(planZombieRoute(g, z), planZombieRoute(restored, rz));
  assert.deepEqual(z.search, rz.search);
  z.floor = 1;
  prepareZombieSearch(g, z);
  assert.equal(z.search!.floor, 1);
  assert.deepEqual(z.search!.trail, []);
  assert.deepEqual(z.path, []);
});

test("an uninformed searcher turns out of a dead end and discovers a corridor around a corner", () => {
  const s = emptyScenario();
  s.entities = [
    { id: "human", kind: "player", floor: 1, x: 35, y: 25 },
    { id: "searcher", kind: "zombie", floor: 0, x: 5.5, y: 10.5 },
  ];
  const rows = Array.from({ length: 34 }, () => Array(44).fill("#"));
  for (let y = 5; y <= 20; y++) rows[y][5] = ".";
  for (let x = 5; x <= 24; x++) rows[20][x] = ".";
  s.maps = [{ floor: 0, rows: rows.map((row) => row.join("")) }];
  const g = new TestRunner(s, roadmap).game,
    z = g.zombies[0];
  let found = false;
  for (let i = 0; i < 1200; i++) {
    step(g, 1 / 30);
    if (z.x > 10 && z.y > 19) {
      found = true;
      break;
    }
  }
  assert.ok(
    found,
    `explores beyond the corner instead of getting stuck at ${z.x},${z.y}`,
  );
  assert.equal(z.target, undefined);
});

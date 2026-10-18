import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pushFurniture, rotate, step } from "../src/engine";
import { canGrip } from "../src/handling";
import {
  type Encounter,
  type Furniture,
  type Roadmap,
  distance,
} from "../src/model";
import { solid } from "../src/spatial";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function unit() {
  const g = createGame(0, r),
    f = g.floors[0],
    a = g.survivors[0];
  g.survivors = [a];
  g.zombies = [];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  const o: Furniture = {
    id: "physical",
    floor: 0,
    kind: "shelf",
    x: 12.5,
    y: 10.5,
    w: 1,
    h: 1,
    hp: 100,
    maxHp: 100,
    speed: 1,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
  };
  f.furniture = [o];
  Object.assign(a, { x: 14, y: 10.5 });
  return { g, f, a, o };
}
test("walls and closed doors prevent remote furniture movement and rotation", () => {
  for (const barrier of ["wall", "door"]) {
    const { g, f, a, o } = unit();
    Object.assign(a, { x: 10.5, y: 10.5 });
    if (barrier === "wall") for (let y = 0; y < 34; y++) f.tiles[y][11] = 1;
    else
      f.furniture.push({
        ...o,
        id: "closed-door",
        kind: "door",
        x: 11.5,
        speed: 0,
        h: 3,
      });
    const before = { x: o.x, y: o.y, w: o.w, h: o.h, hp: o.hp };
    assert.equal(canGrip(f, a, o), false);
    assert.equal(pushFurniture(g, a, 1, 0, 0.1), false);
    assert.equal(rotate(g, a), false);
    assert.deepEqual({ x: o.x, y: o.y, w: o.w, h: o.h, hp: o.hp }, before);
  }
});
test("a helper behind a closed door supplies neither speed nor motion to the furniture", () => {
  const { g, f, a, o } = unit(),
    helper = actor("helper", "Helper", 1);
  Object.assign(helper, { x: 11.4, y: 10.5, handling: o.id });
  g.survivors.push(helper);
  f.furniture.push({
    ...o,
    id: "door",
    kind: "door",
    x: 11.7,
    w: 0.15,
    h: 3,
    speed: 0,
  });
  assert.equal(canGrip(f, a, o), true);
  assert.equal(canGrip(f, helper, o), false);
  assert.equal(pushFurniture(g, a, 1, 0, 0.1), true);
  assert.ok(Math.abs(o.x - 12.6) < 1e-8);
  assert.equal(helper.x, 11.4);
});
test("furniture cannot be translated or rotated through a living zombie", () => {
  const { g, a, o } = unit();
  Object.assign(a, { x: 11.4, y: 10.5 });
  const z = {
    id: "contact",
    floor: 0,
    x: 13.3,
    y: 10.5,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside" as const,
  };
  g.zombies = [z];
  assert.equal(pushFurniture(g, a, 1, 0, 0.1), false);
  assert.equal(o.x, 12.5);
  Object.assign(o, { w: 1, h: 2.8 });
  Object.assign(a, { x: 12.5, y: 12.5 });
  z.x = 13.6;
  assert.equal(rotate(g, a), false);
  z.hp = 0;
  assert.equal(rotate(g, a), true);
});
test("physical helpers follow one shared bounded shift; a blocked helper stops the pull", () => {
  const { g, f, a, o } = unit(),
    helper = actor("helper", "Helper", 1);
  Object.assign(o, { h: 2.8 });
  Object.assign(a, { x: 14, y: 10 });
  Object.assign(helper, { x: 14, y: 11, handling: o.id });
  g.survivors.push(helper);
  const start = o.x,
    primary = a.x,
    second = helper.x;
  assert.equal(pushFurniture(g, a, 1, 0, 0.1), true);
  const shift = o.x - start;
  assert.ok(shift > 0.1 && shift <= 0.14500001);
  assert.ok(Math.abs(a.x - primary - shift) < 1e-8);
  assert.ok(Math.abs(helper.x - second - shift) < 1e-8);
  f.tiles[11][15] = 1;
  Object.assign(a, { x: 14.75, y: 10 });
  Object.assign(helper, { x: 14.75, y: 11.5 });
  // Bring the furniture to the same legal grip offset without a movement
  // claim: this is an isolated collision fixture, not a run setup policy.
  o.x = 13.5;
  const before = o.x;
  assert.equal(pushFurniture(g, a, 1, 0, 0.1), false);
  assert.equal(o.x, before);
  assert.equal(helper.x, 14.75);
});

test("a nearer object behind a thin closed door cannot steal the grab from reachable furniture", () => {
  const { g, f, a, o } = unit();
  const hidden = { ...o, id: "hidden", x: 14.9, w: 0.4 };
  f.furniture.push(hidden, {
    ...o,
    id: "door",
    kind: "door",
    x: 14.4,
    w: 0.1,
    h: 3,
    speed: 0,
  });
  assert.equal(canGrip(f, a, hidden), false);
  assert.equal(pushFurniture(g, a, -1, 0, 0.1), true);
  assert.ok(Math.abs(o.x - 12.4) < 1e-8);
  assert.equal(hidden.x, 14.9);
});

test("an explorer abandons a newly blocked destination without claiming it was visited", () => {
  const { g, a, o } = unit(),
    npc = actor("explorer", "Explorer", 2);
  a.escaped = true;
  Object.assign(npc, { x: 5.5, y: 5.5, target: { x: 6.5, y: 5.5 } });
  Object.assign(o, { x: 6.5, y: 5.5 });
  g.survivors.push(npc);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  for (const e of Object.values(g.encounters)) e.state = "consumed";
  for (let i = 0; i < 130; i++) step(g, 1 / 30);
  assert.ok(
    npc.failedExplore?.some((v) => v.point.x === 6.5 && v.point.y === 5.5),
  );
  assert.ok(!npc.seen.includes("explored-0-6.5-5.5"));
  assert.ok(!npc.target || distance(npc.target, { x: 6.5, y: 5.5 }) > 0.5);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("actor-width route sweeps cannot skip a shallow wall or furniture corner between samples", async () => {
  const { walkSegment } = await import("../src/navigation");
  for (const kind of ["wall", "furniture"]) {
    const { f, o } = unit();
    f.furniture = [];
    if (kind === "wall") f.tiles[10][10] = 1;
    else f.furniture = [{ ...o, x: 10.5, y: 10.5, w: 1, h: 1 }];
    assert.equal(
      walkSegment(f, { x: 9.6, y: 10.08 }, { x: 10.1, y: 9.58 }),
      false,
    );
    assert.equal(
      walkSegment(f, { x: 9.6, y: 9.99 }, { x: 10.1, y: 9.49 }),
      true,
    );
  }
});

test("an exploration fallback retains its destination while crossing the hall midline instead of reversing every frame", () => {
  const { g, f, a } = unit(),
    npc = actor("explorer", "Explorer", 2);
  a.escaped = true;
  f.furniture = [];
  Object.assign(npc, { x: 21.5, y: 14.95 });
  for (let y = 3; y < 28; y += 2)
    for (let x = 3; x < 42; x += 2)
      npc.seen.push(`explored-0-${x + 0.5}-${y + 0.5}`);
  g.survivors.push(npc);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  for (const e of Object.values(g.encounters)) e.state = "consumed";
  for (let i = 0; i < 30; i++) step(g, 1 / 30);
  assert.ok(npc.y > 16.5, `midline reversal persisted at ${npc.y}`);
  assert.deepEqual(npc.target, { x: 21.5, y: 23 });
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("captured survivors leave the safe-room stall by choosing a free hallway destination beside the fridge", () => {
  const fixture = JSON.parse(
    readFileSync("tests/fixtures/blocked-hall-goal.json", "utf8"),
  );
  const g = createGame(fixture.seed, r);
  g.status = "playing";
  g.time = fixture.time;
  g.rng = fixture.rng;
  g.surge = fixture.surge;
  g.floors[3] = fixture.floor;
  g.survivors = [g.survivors[0], ...fixture.survivors];
  g.survivors[0].escaped = true;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  for (const [id, state] of Object.entries(fixture.encounterStates))
    g.encounters[id].state = state as Encounter["state"];
  const recovered = new Set<string>();
  for (let i = 0; i < 1350; i++) {
    step(g, 1 / 30);
    for (const a of g.survivors.slice(1)) if (a.x > 18) recovered.add(a.id);
    if (recovered.size === fixture.survivors.length) break;
  }
  assert.equal(
    recovered.size,
    fixture.survivors.length,
    "both captured survivors must physically reach the hallway",
  );
  for (const a of g.survivors.slice(1)) {
    assert.ok(
      !a.access.includes(3),
      "leaving a room cannot grant stair access",
    );
    if (a.target) assert.equal(solid(g.floors[a.floor], a.target), false);
  }
  assert.equal(g.study.learner!.evidence.length, 0);
});

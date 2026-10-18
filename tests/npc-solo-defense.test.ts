import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { claimStation, complete, step } from "../src/engine";
import { type Roadmap, distance } from "../src/model";
import { decode, encode } from "../src/persistence";
import { canPlace, path, solid } from "../src/spatial";
import { canSee } from "../src/visibility";
import { actor, createGame } from "../src/world";

const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
function fixture(id = "f0-room2-access3", seed = 42) {
  const g = createGame(seed, roadmap),
    f = g.floors[0],
    e = g.encounters[id],
    station = f.stations.find((s) => s.encounter === id)!,
    a = actor("solo-student", "Solo", 2);
  Object.assign(a, {
    x: station.x,
    y: station.y,
    role: "analyst",
    risk: 0.2,
    social: 0.4,
    seen: [station.id],
  });
  g.status = "playing";
  g.nextSpawn = 999999;
  g.spawned = 90;
  g.surge.anchor = 999999;
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  assert.ok(claimStation(g, a, station.id));
  const room = Number(/room(\d+)/.exec(id)![1]),
    door = f.doors[room],
    mouth = f.rooms!.find((r) => r.index === room)?.innerMouth ?? door,
    target = { x: mouth.x + (mouth.x < 22 ? -1.1 : 1.1), y: mouth.y },
    cover = f.furniture.find((o) => o.id === `f0-room${room}-shelf5`)!;
  return { g, f, e, a, cover, target };
}

test("a cautious solo student physically prepares the room's cover for a suffixed private terminal, then studies without a defense credential", () => {
  for (const [id, seed] of [
    ["f0-room1-solo1", 42],
    ["f0-room2-access3", 42],
    ["f0-room1-solo3", 2],
  ] as const) {
    const { g, f, e, a, cover, target } = fixture(id, seed),
      hp = cover.hp,
      start = { x: cover.x, y: cover.y },
      learning = JSON.stringify(g.study);
    // A student can commit to a private task, then prepare from the room's
    // visible approach rather than knowing furniture hidden behind other cover.
    if (id.includes("room1"))
      Object.assign(a, { x: cover.x + 1.5, y: Math.max(2.5, cover.y - 2.4) });
    assert.equal(solid(f, a), false);
    assert.ok(canSee(f, a, cover, undefined, cover.id));
    const approach = { x: 21.5, y: target.y };
    const openDoors = () => ({
      ...f,
      furniture: f.furniture.map((o) =>
        o.kind === "door" ? { ...o, destroyed: true } : o,
      ),
    });
    assert.ok(
      path(openDoors(), approach, a).length,
      "staging cover initially permits a walking approach",
    );
    let prepared = false;
    for (let i = 0; i < 2400; i++) {
      const before = { x: cover.x, y: cover.y };
      step(g, 1 / 30);
      assert.ok(distance(before, cover) <= (cover.speed * 1.9) / 30 + 1e-7);
      assert.ok(canPlace(f, cover, cover));
      assert.equal(solid(f, a), false);
      if (
        distance(cover, target) < 0.05 &&
        a.activity === "studying" &&
        e.state === "in-progress"
      ) {
        prepared = true;
        break;
      }
    }
    assert.ok(
      distance(start, cover) > 0.8,
      `${id}/${seed}: solo student never prepared cover`,
    );
    assert.ok(prepared, `${id}/${seed}: ${JSON.stringify(a.defensePlan)}`);
    assert.equal(cover.hp, hp);
    assert.equal(
      path(openDoors(), approach, a).length,
      0,
      "the actual moved object seals a previously walkable approach",
    );
    assert.deepEqual(a.access, []);
    assert.deepEqual(cover.credited, []);
    assert.equal(e.state, "in-progress");
    assert.equal(JSON.stringify(g.study), learning);
  }
});

test("solo physical preparation survives an exact save and the student can leave after their own puzzle completion", () => {
  const original = fixture(),
    hp = original.cover.hp;
  for (let i = 0; i < 900 && !original.a.handling; i++)
    step(original.g, 1 / 30);
  assert.ok(original.a.defensePlan);
  assert.ok(original.a.handling);
  const saved = decode(encode(original.g));
  assert.deepEqual(saved.survivors[1].defensePlan, original.a.defensePlan);
  for (
    let i = 0;
    i < 1500 && distance(original.cover, original.target) > 0.05;
    i++
  ) {
    step(original.g, 1 / 30);
    step(saved, 1 / 30);
  }
  assert.deepEqual(saved.survivors[1], original.a);
  const copyCover = saved.floors[0].furniture.find(
    (o) => o.id === original.cover.id,
  )!;
  assert.deepEqual(copyCover, original.cover);
  assert.equal(copyCover.hp, hp);
  assert.ok(distance(copyCover, original.target) < 0.05);
  assert.deepEqual(saved.survivors[1].access, []);
  complete(
    saved,
    original.e.id,
    "controlled-own-puzzle",
    [original.a.id],
    "world fixture only",
  );
  for (let i = 0; i < 3000 && saved.survivors[1].floor === 0; i++)
    step(saved, 1 / 30);
  assert.equal(saved.survivors[1].floor, 1);
  assert.equal(saved.study.learner!.evidence.length, 0);
});

test("a risk-taking solo student can choose focused work without mandatory preparation", () => {
  const { g, a, cover, e } = fixture();
  a.risk = 0.9;
  const before = { x: cover.x, y: cover.y };
  for (let i = 0; i < 60; i++) step(g, 1 / 30);
  assert.ok(
    distance(cover, before) < 0.05,
    "abandoned handling can retain a small physical coast",
  );
  assert.ok(a.grip?.object !== cover.id);
  assert.equal(a.activity, "studying");
  assert.equal(a.defensePlan, undefined);
  assert.ok(a.thought > 0);
  assert.equal(e.owner, a.id);
});

test("solo preparation does not plan around an unseen room object or reserve another student's private terminal", () => {
  const { g, f, a, cover } = fixture();
  // An opaque screen hides the room's staged shelf from the student's position.
  f.furniture.push({
    ...structuredClone(cover),
    id: "opaque-screen",
    kind: "door",
    x: 12.5,
    y: 20.5,
    w: 1,
    h: 8,
    speed: 0,
  });
  const before = { x: cover.x, y: cover.y };
  for (let i = 0; i < 30; i++) step(g, 1 / 30);
  assert.equal(a.defensePlan, undefined);
  assert.ok(
    distance(cover, before) < 0.05,
    "abandoned handling can retain a small physical coast",
  );
  assert.ok(a.grip?.object !== cover.id);
  assert.equal(g.encounters["f0-room2-access4"].owner, undefined);
});

test("a solo student abandons handling immediately when an actually visible attacker is close", () => {
  const { g, f, a, cover } = fixture();
  for (let i = 0; i < 900 && !a.handling; i++) step(g, 1 / 30);
  assert.ok(a.handling);
  const p = [
    { x: a.x - 1, y: a.y },
    { x: a.x + 1, y: a.y },
    { x: a.x, y: a.y - 1 },
    { x: a.x, y: a.y + 1 },
  ].find((p) => !solid(f, p) && canSee(f, a, p));
  assert.ok(p);
  g.zombies = [
    {
      id: "visible-interruption",
      ...p,
      floor: 0,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 100,
      memory: 0,
      stagger: 100,
      origin: "outside",
    },
  ];
  const before = { x: cover.x, y: cover.y };
  step(g, 1 / 30);
  assert.equal(a.activity, "fleeing");
  assert.equal(a.handling, undefined);
  assert.ok(
    distance(cover, before) < 0.05,
    "abandoned handling can retain a small physical coast",
  );
  assert.ok(a.grip?.object !== cover.id);
  assert.deepEqual(a.access, []);
});

test("students at distinct private terminals can prepare the same room without freezing one another or sharing credentials", () => {
  const { g, f, a, cover, target } = fixture();
  const station = f.stations.find((s) => s.encounter === "f0-room2-access4")!,
    b = actor("second-private-student", "Second", 3);
  Object.assign(b, {
    x: station.x,
    y: station.y,
    role: "analyst",
    risk: 0.2,
    social: 0.4,
    seen: [station.id],
  });
  g.survivors.push(b);
  assert.ok(claimStation(g, b, station.id));
  let resumed = false;
  for (let i = 0; i < 2400; i++) {
    const before = { x: cover.x, y: cover.y };
    step(g, 1 / 30);
    assert.ok(distance(before, cover) <= (cover.speed * 1.9) / 30 + 1e-7);
    assert.ok(canPlace(f, cover, cover));
    if (
      distance(cover, target) < 0.05 &&
      [a, b].every(
        (a) =>
          a.activity === "studying" &&
          distance(
            a,
            f.stations.find((s) => s.id === a.station) ?? { x: -999, y: -999 },
          ) < 1.3,
      )
    ) {
      resumed = true;
      break;
    }
  }
  assert.ok(
    resumed,
    JSON.stringify(
      [a, b].map((a) => ({
        x: a.x,
        y: a.y,
        activity: a.activity,
        plan: a.defensePlan,
      })),
    ),
  );
  assert.deepEqual(a.access, []);
  assert.deepEqual(b.access, []);
  assert.equal(g.encounters["f0-room2-access3"].owner, a.id);
  assert.equal(g.encounters["f0-room2-access4"].owner, b.id);
  assert.equal(g.study.learner!.evidence.length, 0);
});

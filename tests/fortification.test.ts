import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { complete, step } from "../src/engine";
import { furnitureRoute, handlingPositions } from "../src/fortification";
import { type Roadmap, distance } from "../src/model";
import { canPlace, solid } from "../src/spatial";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
test("transport planning routes the full object and physical handler around staging furniture through a real opening", () => {
  const g = createGame(0, r),
    f = g.floors[0],
    a = g.survivors[0];
  const o = structuredClone(f.furniture.find((o) => o.kind === "shelf")!);
  Object.assign(o, { x: 10.5, y: 10.5, w: 1, h: 2.8 });
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let y = 0; y < 34; y++) f.tiles[y][12] = y >= 13 && y <= 15 ? 0 : 1;
  f.furniture = [
    o,
    { ...o, id: "staging-desk", kind: "desk", x: 9.5, y: 13, w: 2.2, h: 1 },
  ];
  Object.assign(a, { x: 8.5, y: 10.5 });
  const before = JSON.stringify(o),
    target = { x: 14.5, y: 14.5 };
  const route = furnitureRoute(f, o, target, a);
  assert.ok(
    route.length > 2,
    "requires more than either straight two-axis route",
  );
  let from = { x: o.x, y: o.y };
  for (const to of route) {
    assert.ok(canPlace(f, o, to));
    assert.ok(handlingPositions(f, { ...o, ...from }, to, a).length);
    from = to;
  }
  assert.deepEqual(route.at(-1), target);
  assert.equal(JSON.stringify(o), before, "planning cannot move or heal cover");
  for (let y = 0; y < 34; y++) f.tiles[y][12] = 1;
  assert.deepEqual(furnitureRoute(f, o, target, a), []);
});
test("NPC builders finish staged fortification in generated rooms using legal timed handling, then resume study", () => {
  for (const seed of [0, 1, 2]) {
    const g = createGame(seed, r),
      f = g.floors[0],
      room = seed === 2 ? 3 : 0;
    const e = g.encounters[`f0-room${room}`],
      station = f.stations.find((s) => s.encounter === e.id)!;
    const builder = actor("builder", "Builder", 1);
    Object.assign(builder, {
      role: "builder",
      intent: e.id,
      x: station.x,
      y: station.y,
      seen: [station.id],
    });
    g.survivors = [g.survivors[0], builder];
    g.survivors[0].escaped = true;
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.spawned = 90;
    g.status = "playing";
    const o = f.furniture.find((o) => o.id === `${e.id}-shelf5`)!;
    const hp = o.hp,
      start = { x: o.x, y: o.y };
    let studied = false;
    for (let i = 0; i < 3000; i++) {
      const before = { x: o.x, y: o.y };
      step(g, 1 / 30);
      assert.ok(
        distance(before, o) <= (o.speed * 1.9) / 30 + 1e-7,
        "transport is physically bounded",
      );
      assert.ok(canPlace(f, o, o));
      assert.equal(solid(f, builder), false);
      if (
        e.contributors.includes(builder.id) &&
        builder.activity === "studying"
      ) {
        studied = true;
        break;
      }
    }
    assert.ok(distance(o, start) > 0.8, `seed ${seed} did not transport cover`);
    assert.ok(
      studied,
      `seed ${seed} remained stuck in defense: ${JSON.stringify(builder.defensePlan)}`,
    );
    assert.ok(o.credited.includes(builder.id));
    assert.equal(o.hp, hp);
    assert.equal(g.study.learner!.evidence.length, 0);
  }
});

test("a credentialed NPC physically rearranges its sealing shelf to leave through the closed door instead of remaining trapped", () => {
  const g = createGame(1337, r),
    f = g.floors[1],
    room = 3,
    e = g.encounters[`f1-room${room}`];
  const station = f.stations.find((s) => s.encounter === e.id)!,
    builder = actor("builder", "Builder", 1);
  Object.assign(builder, {
    floor: 1,
    role: "builder",
    intent: e.id,
    x: station.x,
    y: station.y,
    seen: [station.id],
  });
  g.survivors = [g.survivors[0], builder];
  g.survivors[0].escaped = true;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  g.status = "playing";
  const shelf = f.furniture.find((o) => o.id === `${e.id}-shelf5`)!;
  for (
    let i = 0;
    i < 3000 &&
    !(e.contributors.includes(builder.id) && builder.activity === "studying");
    i++
  )
    step(g, 1 / 30);
  assert.ok(
    e.contributors.includes(builder.id),
    "actual physical preparation must finish first",
  );
  const sealed = shelf.x;
  complete(
    g,
    e.id,
    "npc-egress-fixture",
    [builder.id],
    "Isolated world fixture; no learning credit",
  );
  for (let i = 0; i < 3000 && builder.floor === 1; i++) step(g, 1 / 30);
  assert.equal(
    builder.floor,
    2,
    `NPC stayed trapped: ${JSON.stringify({ x: builder.x, y: builder.y, plan: builder.defensePlan })}`,
  );
  assert.ok(shelf.x > sealed + 0.2, "exit is made by moving real cover");
  assert.ok(g.events.some((ev) => ev.type === "door"));
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("an uncredentialed newcomer can rearrange another survivor's cover and leave without borrowing stair access", () => {
  const g = createGame(1337, r),
    f = g.floors[1],
    e = g.encounters["f1-room3"];
  const station = f.stations.find((s) => s.encounter === e.id)!,
    builder = actor("builder", "Builder", 1);
  Object.assign(builder, {
    floor: 1,
    role: "builder",
    intent: e.id,
    x: station.x,
    y: station.y,
    seen: [station.id],
  });
  g.survivors = [g.survivors[0], builder];
  g.survivors[0].escaped = true;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  g.status = "playing";
  for (
    let i = 0;
    i < 3000 &&
    !(e.contributors.includes(builder.id) && builder.activity === "studying");
    i++
  )
    step(g, 1 / 30);
  assert.ok(e.contributors.includes(builder.id));
  const newcomer = actor("newcomer", "Newcomer", 2);
  Object.assign(newcomer, {
    floor: 1,
    x: station.x,
    y: station.y,
    intent: e.id,
    target: { x: 24.5, y: 23.5 },
    seen: [station.id],
  });
  g.survivors.push(newcomer);
  complete(
    g,
    e.id,
    "world-only-fixture",
    [builder.id],
    "World fixture; newcomer was not a contributor",
  );
  builder.escaped = true;
  for (let i = 0; i < 3000 && newcomer.x > 26; i++) step(g, 1 / 30);
  assert.ok(
    newcomer.x < 26,
    `newcomer remained trapped: ${JSON.stringify(newcomer.defensePlan)}`,
  );
  assert.equal(newcomer.floor, 1);
  assert.deepEqual(newcomer.access, []);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("cooperative NPC transport counts motion earlier in the same tick as progress instead of timing out its second handler", () => {
  const g = createGame(0, r),
    f = g.floors[0],
    e = g.encounters["f0-room0"],
    o = f.furniture.find((o) => o.id === `${e.id}-shelf5`)!;
  const movers = [
    actor("mover1", "Mover One", 1),
    actor("mover2", "Mover Two", 2),
  ];
  for (const [i, a] of movers.entries())
    Object.assign(a, {
      x: o.x,
      y: o.y + (i ? 1 : -1) * (o.h / 2 + 0.55),
      role: "builder",
      intent: e.id,
      handling: o.id,
      defensePlan: {
        encounter: e.id,
        object: o.id,
        target: { x: 12.4, y: 8.5 },
        route: [
          { x: o.x, y: 8.5 },
          { x: 12.4, y: 8.5 },
        ],
        idle: 0,
      },
    });
  g.survivors = [g.survivors[0], ...movers];
  g.survivors[0].escaped = true;
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  const start = o.y;
  for (let i = 0; i < 210; i++) step(g, 1 / 30);
  assert.ok(o.y > start + 1);
  for (const a of movers) {
    assert.ok(a.defensePlan);
    assert.ok(a.defensePlan!.idle < 0.1);
  }
  assert.equal(o.hp, o.maxHp);
});

test("a rooftop survivor takes a viable active pickup approach under pressure instead of fleeing away until it is missed", () => {
  const g = createGame(0, r),
    npc = actor("evacuee", "Evacuee", 2);
  Object.assign(npc, { floor: 4, x: 21.5, y: 14.5 });
  g.survivors = [g.survivors[0], npc];
  g.survivors[0].escaped = true;
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  Object.assign(g.helicopter, {
    trip: 1,
    until: 20,
    next: 999,
    passengers: [],
  });
  g.zombies = [
    {
      id: "roof-pressure",
      floor: 4,
      x: 21.5,
      y: 12.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 99,
      stagger: 0,
      origin: "outside",
      target: { x: npc.x, y: npc.y },
    },
  ];
  for (let i = 0; i < 150 && !npc.escaped && npc.alive; i++) step(g, 1 / 30);
  assert.equal(
    npc.escaped,
    true,
    `missed reachable pickup at ${npc.x},${npc.y}`,
  );
  assert.equal(npc.alive, true);
  assert.deepEqual(g.helicopter.passengers, [npc.id]);
  assert.equal(g.stats.rescued, 1);
  assert.equal(g.study.learner!.evidence.length, 0);
});

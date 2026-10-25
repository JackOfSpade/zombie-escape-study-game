import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { restoreSurvivalScenario } from "../scripts/lib/survival-scenario";
import { step } from "../src/engine";
import { type Roadmap } from "../src/model";
import { THREAT_MEMORY } from "../src/npc-threat-memory";
import { beginPhysics, cancelPhysics } from "../src/physics";
import { chooseRetreat, routeExposure } from "../src/survivor-strategy";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("an urgent evacuation approach avoids a dense pack along the route even when the destination beyond it is clear", () => {
  const g = createGame(0, r),
    a = actor("runner", "Runner", 2),
    f = g.floors[4];
  Object.assign(a, { floor: 4, x: 21.5, y: 18.5 });
  f.furniture = [];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  const enemies = Array.from({ length: 20 }, (_, i) => ({
    x: 20.5 + (i % 5) * 0.5,
    y: 15.5 + Math.floor(i / 5) * 0.5,
  }));
  const unsafe = { x: 21.5, y: 12.5 };
  assert.ok(routeExposure(a, [unsafe], enemies) > 10);
  const choice = chooseRetreat(g, a, enemies, true);
  assert.ok(choice);
  assert.ok(
    routeExposure(a, [choice], enemies) < 1,
    `route crossed the pack: ${JSON.stringify(choice)}`,
  );
});

test("a chased NPC uses an actual vulnerable vault to leave a small room instead of only considering walking destinations", () => {
  const g = createGame(0, r),
    a = actor("runner", "Runner", 2),
    f = g.floors[0];
  Object.assign(a, { x: 10.5, y: 10.5 });
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  const chair = structuredClone(f.furniture.find((o) => o.kind === "chair")!);
  Object.assign(chair, { id: "exit-chair", x: 12.5, y: 10.5 });
  f.furniture = [chair];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let i = 8; i <= 12; i++) {
    f.tiles[8][i] = 1;
    f.tiles[12][i] = 1;
    f.tiles[i][8] = 1;
    f.tiles[i][12] = 1;
  }
  f.tiles[10][12] = 0;
  g.zombies = [
    {
      id: "chaser",
      floor: 0,
      x: 9.2,
      y: 10.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 9,
      stagger: 0,
      origin: "outside",
    },
  ];
  for (let i = 0; i < 150 && a.x < 12.8 && a.alive; i++) step(g, 1 / 30);
  assert.ok(a.alive);
  assert.ok(a.x > 12.8, `NPC stayed inside at ${a.x},${a.y}`);
  assert.ok(g.events.some((e) => e.type === "vault" && e.actor === a.id));
  assert.deepEqual(a.access, []);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("the captured 90-zombie rooftop miss reaches the active aircraft with physical cover, no healing or speed bonus and no learning credit", async () => {
  const { restoreRoofScenario } = await import("../scripts/lib/roof-scenario");
  const snapshot = JSON.parse(
    readFileSync("tests/fixtures/roof-pressure.json", "utf8"),
  );
  const unchangedSnapshot = JSON.stringify(snapshot);
  const { g, survivor } = restoreRoofScenario(r, snapshot),
    start = g.time,
    hp = survivor.hp;
  beginPhysics(g);
  cancelPhysics(g); // Normalize legacy door poses before measuring physical movement.
  const furniture = g.floors
    .flatMap((f) => f.furniture)
    .map((o) => ({ id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, hp: o.hp }));
  for (let i = 0; i < 900 && survivor.alive && !survivor.escaped; i++) {
    const before = { x: survivor.x, y: survivor.y, vault: !!survivor.vault };
    step(g, 1 / 30);
    if (!before.vault && !survivor.vault)
      assert.ok(
        Math.hypot(survivor.x - before.x, survivor.y - before.y) <=
          survivor.speed / 30 + 1e-7,
      );
  }
  assert.ok(survivor.alive && survivor.escaped);
  assert.ok(g.time - start < 24);
  assert.ok(survivor.hp > 0 && survivor.hp <= hp);
  assert.deepEqual(survivor.inventory, []);
  assert.equal(g.stats.rescued, snapshot.world.stats.rescued + 1);
  for (const old of furniture) {
    const now = g.floors
      .flatMap((f) => f.furniture)
      .find((o) => o.id === old.id)!;
    assert.deepEqual({ w: now.w, h: now.h }, { w: old.w, h: old.h });
    if (Math.hypot(now.x - old.x, now.y - old.y) > 0.000001) {
      assert.ok(
        now.speed > 0 || now.door,
        "only physical movable bodies can change pose",
      );
      assert.ok(now.physics && Number.isFinite(now.physics.x + now.physics.y));
      assert.ok(
        now.moved > 0,
        "movement is retained in the physical run record",
      );
    }
    assert.ok(now.hp <= old.hp);
  }
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(JSON.stringify(snapshot), unchangedSnapshot);
});

test("retreat planning does not select a vault whose landing is occupied by a living teammate", () => {
  const g = createGame(0, r),
    a = actor("runner", "Runner", 2),
    ally = actor("ally", "Ally", 3),
    f = g.floors[0];
  Object.assign(a, { x: 10.5, y: 10.5 });
  Object.assign(ally, { x: 13.45, y: 10.5 });
  g.survivors = [g.survivors[0], a, ally];
  g.survivors[0].escaped = true;
  const chair = structuredClone(f.furniture.find((o) => o.kind === "chair")!);
  Object.assign(chair, { id: "exit-chair", x: 12.5, y: 10.5 });
  f.furniture = [chair];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let i = 8; i <= 12; i++) {
    f.tiles[8][i] = 1;
    f.tiles[12][i] = 1;
    f.tiles[i][8] = 1;
    f.tiles[i][12] = 1;
  }
  f.tiles[10][12] = 0;
  const choice = chooseRetreat(g, a, [{ x: 9.2, y: 10.5 }], false);
  assert.ok(
    !choice || Math.hypot(choice.x - ally.x, choice.y - ally.y) >= 0.55,
    `selected an impossible occupied landing: ${JSON.stringify(choice)}`,
  );
});

function retreatFixture() {
  const g = createGame(0, r),
    a = actor("runner", "Runner", 2),
    f = g.floors[0];
  g.status = "playing";
  g.time = 1;
  g.surge.anchor = 10000;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  f.furniture = [];
  f.stations = [];
  Object.assign(a, {
    x: 10.5,
    y: 10.5,
    risk: 0.8,
    activity: "fleeing",
    target: { x: 3.5, y: 10.5 },
    fleeTarget: { x: 15.5, y: 10.5 },
    fleeUntil: 4,
    fleeFloor: 0,
  });
  g.zombies = [
    {
      id: "pursuer",
      x: 6.9,
      y: 10.5,
      floor: 0,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  return { g, a, f };
}

test("a newly cut-off committed route is replaced even when its endpoint remains clear", () => {
  const { g, a } = retreatFixture();
  a.path = [{ x: 15.5, y: 10.5 }];
  a.navTarget = { ...a.fleeTarget! };
  g.zombies.push({ ...g.zombies[0], id: "crossing", x: 13.5, y: 10.5 });
  const old = { ...a.fleeTarget! };
  step(g, 1 / 30);
  assert.notDeepEqual(a.fleeTarget, old);
  assert.deepEqual(a.navTarget, a.fleeTarget);
  assert.equal(a.hp, 100);
});

test("a reconsidered retreat rebuilds the physical route even for a nearby replacement endpoint", () => {
  const { g, a } = retreatFixture();
  g.zombies.push({ ...g.zombies[0], id: "crossing", x: 13.5, y: 10.5 });
  const rng = g.rng,
    choice = chooseRetreat(g, a, g.zombies, false)!;
  g.rng = rng;
  a.fleeTarget = { x: choice.x + 0.1, y: choice.y };
  a.navTarget = { ...a.fleeTarget };
  a.path = [{ x: 15.5, y: 10.5 }]; // Previously valid detour now crossed by the enemy.
  step(g, 1 / 30);
  assert.deepEqual(a.fleeTarget, choice);
  assert.deepEqual(a.navTarget, choice);
  assert.ok(!a.path.some((p) => p.x === 15.5 && p.y === 10.5));
});

test("an unavoidable known contact does not reroll a least-bad committed route on every frame, including after reload", async () => {
  const { encode, decode, recover } = await import("../src/persistence");
  const { g, a } = retreatFixture();
  a.fleeUntil = 0;
  g.zombies = Array.from({ length: 16 }, (_, i) => ({
    ...g.zombies[0],
    id: `ring-${i}`,
    x: a.x + Math.cos((i * Math.PI) / 8) * 1.5,
    y: a.y + Math.sin((i * Math.PI) / 8) * 1.5,
    stagger: 2,
    cooldown: 2,
  }));
  step(g, 1 / 30);
  const goal = { ...a.fleeTarget! },
    rng = g.rng;
  step(g, 1 / 30);
  assert.deepEqual(a.fleeTarget, goal);
  assert.equal(
    g.rng,
    rng,
    "an accounted-for threat must not cause a fresh random plan",
  );
  assert.ok(a.fleeRouteThreats!.length > 0);
  const loaded = recover(decode(encode(g))),
    resumed = loaded.survivors[1];
  assert.deepEqual(resumed.fleeRouteThreats, a.fleeRouteThreats);
  step(loaded, 1 / 30);
  assert.deepEqual(resumed.fleeTarget, goal);
  assert.equal(loaded.rng, rng);
});

test("captured moving rooftop pack: reconsideration rescues the same thirty-HP survivor during the actual pickup", () => {
  const snapshot = JSON.parse(
      readFileSync("tests/fixtures/retreat-cutoff.json", "utf8"),
    ),
    g = restoreSurvivalScenario(r, snapshot),
    a = g.survivors.find((a) => a.alive && !a.escaped)!,
    start = g.time,
    hp = a.hp;
  beginPhysics(g);
  cancelPhysics(g);
  const furniture = g.floors
    .flatMap((f) => f.furniture)
    .map((o) => ({ id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, hp: o.hp }));
  for (let i = 0; i < 900 && a.alive && !a.escaped; i++) {
    const before = { x: a.x, y: a.y };
    step(g, 1 / 30);
    assert.ok(
      Math.hypot(a.x - before.x, a.y - before.y) <= a.speed / 30 + 1e-6,
    );
  }
  assert.equal(a.alive, true);
  assert.equal(a.escaped, true);
  assert.equal(a.hp, hp);
  assert.ok(g.time - start < g.helicopter.until - start);
  assert.deepEqual(a.inventory, []);
  assert.equal(g.stats.rescued, snapshot.world.stats.rescued + 1);
  for (const old of furniture) {
    const now = g.floors
      .flatMap((f) => f.furniture)
      .find((o) => o.id === old.id)!;
    assert.deepEqual({ w: now.w, h: now.h }, { w: old.w, h: old.h });
    if (Math.hypot(now.x - old.x, now.y - old.y) > 0.000001) {
      assert.ok(
        now.speed > 0 || now.door,
        "only physical movable bodies can change pose",
      );
      assert.ok(now.physics && Number.isFinite(now.physics.x + now.physics.y));
      assert.ok(
        now.moved > 0,
        "movement is retained in the physical run record",
      );
    }
    assert.ok(now.hp <= old.hp);
  }
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
});
test("a survivor finishes a bounded retreat rather than reversing toward work each time danger crosses the threshold", () => {
  const { g, a } = retreatFixture();
  const start = a.x;
  for (let i = 0; i < 12; i++) {
    step(g, 1 / 30);
    assert.equal(a.activity, "fleeing");
  }
  assert.ok(a.x > start + 0.8);
  assert.deepEqual(a.target, { x: 3.5, y: 10.5 });
  g.zombies[0].x = a.x - 7;
  g.zombies[0].y += 6;
  g.time = a.fleeUntil! + 0.01;
  step(g, 1 / 30);
  assert.equal(
    a.activity,
    "fleeing",
    "retreat expiry cannot erase the recent actual sighting",
  );
  const lastSeen = Math.max(...a.threatMemory!.observations.map((p) => p.at));
  g.time = Math.max(a.fleeUntil!, lastSeen + THREAT_MEMORY.seconds) + 0.01;
  const before = a.x;
  step(g, 1 / 30);
  assert.equal(a.activity, "exploring");
  assert.ok(a.x < before);
  assert.equal(g.study.learner!.evidence.length, 0);
});
test("retreat commitment survives reload but cannot reuse a destination from another floor", async () => {
  const { encode, decode, recover } = await import("../src/persistence"),
    { g, a } = retreatFixture();
  step(g, 1 / 30);
  const loaded = recover(decode(encode(g))),
    resumed = loaded.survivors[1],
    before = resumed.x;
  step(loaded, 1 / 30);
  assert.equal(resumed.activity, "fleeing");
  assert.ok(resumed.x > before);
  resumed.floor = 1;
  loaded.floors[1].tiles = loaded.floors[0].tiles;
  loaded.floors[1].furniture = [];
  loaded.floors[1].stations = [];
  loaded.zombies[0].floor = 1;
  loaded.zombies[0].x = resumed.x - 2;
  step(loaded, 1 / 30);
  assert.equal(resumed.fleeFloor, 1);
  assert.equal(resumed.fleeUntil, loaded.time + 1);
  assert.equal(a.fleeFloor, 0);
});
test("a newly occupied retreat endpoint is reconsidered rather than blindly honored", () => {
  const { g, a } = retreatFixture();
  g.zombies.push({ ...g.zombies[0], id: "new danger", x: 15.5, y: 10.5 });
  step(g, 1 / 30);
  assert.ok(a.fleeTarget);
  assert.ok(Math.hypot(a.fleeTarget!.x - 15.5, a.fleeTarget!.y - 10.5) > 1.1);
});

test("reaching a short retreat waypoint does not send a survivor back across a visible pursuer", () => {
  const { g, a } = retreatFixture();
  a.fleeTarget = { x: a.x + 0.1, y: a.y };
  step(g, 1 / 30);
  assert.equal(a.activity, "fleeing");
  assert.ok(a.fleeTarget);
  assert.ok(Math.hypot(a.fleeTarget!.x - a.x, a.fleeTarget!.y - a.y) > 0.8);
});

test("an evacuation route does not cut across a single attacker's reach just to reach a clearer endpoint", () => {
  const { g, a } = retreatFixture();
  a.floor = 4;
  a.x = 21.5;
  a.y = 18.5;
  g.floors[4].tiles = g.floors[0].tiles;
  g.floors[4].furniture = [];
  g.helicopter.until = 100;
  g.helicopter.passengers = [];
  delete a.fleeTarget;
  delete a.fleeFloor;
  g.zombies = [
    { ...g.zombies[0], floor: 4, x: 20.76089637399097, y: 18.19385325410793 },
  ];
  g.rng = 123;
  step(g, 1 / 30);
  assert.equal(
    a.hp,
    100,
    "route exposed the survivor to an immediate avoidable bite",
  );
  assert.equal(a.activity, "fleeing");
  assert.equal(a.escaped, false);
});

test("retreating preserves an unfinished puzzle without remote completion or mastery", () => {
  const { g, a, f } = retreatFixture(),
    e = g.encounters["f0-room0"];
  e.state = "in-progress";
  e.npcProgress = 0.5;
  a.intent = e.id;
  a.fleeTarget = { x: a.x + 0.1, y: a.y };
  a.thought = 7;
  f.stations = [{ id: "remembered", encounter: e.id, x: 3.5, y: 10.5 }];
  a.seen.push("remembered");
  step(g, 1 / 30);
  assert.equal(a.intent, e.id);
  assert.equal(e.npcProgress, 0.5);
  assert.deepEqual(a.access, []);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("using a weapon refreshes the live threat instead of treating the killed nearest enemy as the whole threat set", () => {
  const { g, a } = retreatFixture();
  a.activity = "exploring";
  delete a.fleeTarget;
  delete a.fleeFloor;
  a.inventory = [{ id: "weapon", kind: "weapon", weight: 1, charges: 1 }];
  g.zombies = [
    { ...g.zombies[0], x: 9.5 },
    { ...g.zombies[0], id: "tougher", x: 10.5, y: 11.7, hp: 100 },
  ];
  step(g, 1 / 30);
  assert.equal(g.zombies[0].hp, 0);
  assert.equal(g.zombies[1].hp, 40);
  assert.equal(a.activity, "fleeing");
  assert.equal(a.inventory.length, 0);
  assert.equal(g.study.learner!.evidence.length, 0);
});

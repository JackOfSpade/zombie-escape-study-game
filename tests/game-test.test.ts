import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { preset } from "../src/gametest/presets";
import { loadGameTests } from "../scripts/lib/game-test-catalog";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario, parseScenario } from "../src/gametest/schema";
import { captureLayout } from "../src/gametest/world";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
for (const s of loadGameTests())
  test(`GameTest: ${s.id}`, () => {
    const result = new TestRunner(s, roadmap).run();
    assert.equal(result.status, "passed", JSON.stringify(result));
  });
test("scenario isolation and repeatability: fresh worlds, immutable inputs and equal reports", () => {
  const s = preset("push-door"),
    before = JSON.stringify(s),
    a = new TestRunner(s, roadmap),
    b = new TestRunner(s, roadmap);
  a.game.study.reviewsServed.push("test-only");
  assert.ok(!b.game.study.reviewsServed.includes("test-only"));
  const ra = a.run(),
    rb = b.run();
  assert.deepEqual(ra, rb);
  assert.equal(JSON.stringify(s), before);
});
test("always checks fail immediately; eventual checks time out with exact evidence", () => {
  const s = emptyScenario();
  s.maxTicks = 3;
  s.checks = [
    {
      name: "Impossible movement",
      mode: "always",
      query: { type: "property", id: "human", field: "x" },
      op: "gte",
      expected: 40,
    },
  ];
  const a = new TestRunner(s, roadmap).run();
  assert.equal(a.status, "failed");
  assert.equal(a.tick, 1);
  assert.equal(a.checks[0].actual, 5.5);
  s.checks[0].mode = "eventually";
  const b = new TestRunner(s, roadmap).run();
  assert.equal(b.status, "failed");
  assert.equal(b.tick, 3);
  assert.equal(b.checks[0].status, "failed");
});
test("eventually can pass before the deadline and always checks continue after that", () => {
  const s = emptyScenario();
  s.maxTicks = 3;
  s.checks = [
    {
      name: "Player exists",
      mode: "eventually",
      query: { type: "property", id: "human", field: "alive" },
      op: "eq",
      expected: true,
    },
    {
      name: "Still solid",
      mode: "always",
      query: { type: "property", id: "human", field: "hp" },
      op: "eq",
      expected: 100,
    },
  ];
  const r = new TestRunner(s, roadmap).run();
  assert.equal(r.status, "passed");
  assert.equal(r.checks[0].tick, 1);
  assert.equal(r.checks[1].tick, 3);
});
test("no-check sandboxes never claim a passing test", () => {
  const s = emptyScenario();
  s.maxTicks = 1;
  assert.equal(new TestRunner(s, roadmap).run().status, "unverified");
});
test("unreachable actions and missing assertion IDs fail instead of silently succeeding", () => {
  const s = preset("push-door");
  s.entities[0].x = 3;
  const r = new TestRunner(s, roadmap).run();
  assert.equal(r.status, "failed");
  assert.match(r.error!, /could not reach/);
  const b = emptyScenario();
  b.checks = [
    {
      name: "Missing",
      mode: "at",
      tick: 1,
      query: { type: "property", id: "missing", field: "hp" },
      op: "eq",
      expected: 100,
    },
  ];
  assert.match(new TestRunner(b, roadmap).run().error!, /Missing entity/);
});
test("bounded JSON scenarios reject malformed geometry, timelines, unknown actions and private save objects", () => {
  const s = emptyScenario();
  for (const patch of [
    { version: 2 },
    { maxTicks: Infinity },
    { maxTicks: 0 },
    { seed: -1 },
    { study: { secret: "not-a-fixture" } },
    { entities: [{ id: "human", kind: "player", x: Infinity, y: 1 }] },
    {
      entities: [
        { id: "a", kind: "npc", x: 1, y: 1 },
        { id: "a", kind: "npc", x: 2, y: 2 },
      ],
    },
    { actions: [{ tick: 0, type: "checkpoint" }] },
    { actions: [{ tick: 1, type: "evaluate", code: "anything" }] },
    { maps: [{ floor: 0, rows: ["bad"] }] },
  ])
    assert.throws(() => parseScenario({ ...s, ...patch }));
  assert.throws(() => parseScenario(" ".repeat(1_000_001)), /1 MB/);
  assert.throws(() => parseScenario({ schema: 1, payload: "private" }));
});
test("layout capture keeps door frames and poses, omits study data and remains re-importable", () => {
  const r = new TestRunner(preset("push-door"), roadmap);
  r.run();
  const layout = captureLayout(r.game, r.scenario),
    text = JSON.stringify(layout);
  assert.ok(!text.includes('"study"'));
  assert.ok(!text.includes('"encounters"'));
  assert.deepEqual(layout.actions, []);
  assert.deepEqual(layout.checks, []);
  assert.doesNotThrow(() => new TestRunner(parseScenario(text), roadmap));
  const door = layout.entities.find((e) => e.id === "test-door")!;
  assert.equal(door.w, 1);
  assert.equal(door.h, 3);
  assert.ok(Math.abs(door.angle!) <= 70);
});
test("captured force-field layouts retain keys, field kinds and directional entrance quotas", () => {
  const s = emptyScenario();
  s.rules = "force-fields";
  s.entities = [
    { id: "human", kind: "player", x: 5.5, y: 12.5, keys: 3, credential: true },
    {
      id: "quota",
      kind: "door",
      x: 10,
      y: 12.5,
      forceField: "green",
      freeLimit: 4,
    },
    { id: "locked", kind: "door", x: 15, y: 12.5, forceField: "red" },
    { id: "exit", kind: "door", x: 20, y: 12.5, forceField: "exit" },
    { id: "public-gate", kind: "gate", x: 25, y: 12.5, forceField: "green" },
  ];
  const original = new TestRunner(s, roadmap);
  original.game.floors[0].furniture.find(
    (o) => o.id === "quota",
  )!.field!.direction = -1;
  const captured = captureLayout(original.game, s);
  const replay = new TestRunner(
    parseScenario(JSON.stringify(captured)),
    roadmap,
  );
  const player = replay.game.survivors[0];
  assert.equal(player.keys, 3);
  assert.ok(player.access.includes(0));
  for (const name of ["quota", "locked", "exit", "public-gate"]) {
    const before = original.game.floors[0].furniture.find(
      (o) => o.id === name,
    )!;
    const after = replay.game.floors[0].furniture.find((o) => o.id === name)!;
    assert.ok(after.field, `${name} must remain a force field`);
    assert.equal(
      after.door,
      undefined,
      `${name} must not become a hinged door`,
    );
    assert.equal(after.field.limit, before.field!.limit);
    assert.equal(after.field.direction, before.field!.direction);
    assert.equal(after.field.exit, before.field!.exit);
  }
});
test("directional quota fields reject invalid direction values and unrelated entity flags", () => {
  const s = emptyScenario();
  for (const freeDirection of [-2, 0, 2, "-1"]) {
    assert.throws(
      () =>
        parseScenario({
          ...s,
          entities: [
            {
              id: "quota",
              kind: "door",
              x: 10,
              y: 10,
              forceField: "green",
              freeLimit: 3,
              freeDirection,
            },
          ],
        }),
      /free-entry direction/,
    );
  }
  assert.throws(
    () =>
      parseScenario({
        ...s,
        entities: [{ id: "box", kind: "box", x: 10, y: 10, freeDirection: 1 }],
      }),
    /free-entry direction/,
  );
});
test("headless CLI exposes a filter and emits failing exit status for unknown selections", () => {
  const ok = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/game-test.ts", "--filter", "room-with-gap"],
    { encoding: "utf8" },
  );
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /PASSED room-with-gap/);
  const bad = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/game-test.ts", "--filter", "missing-scenario"],
    { encoding: "utf8" },
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /No matching/);
});
test("a same-tick move sets the facing used by a subsequent Space action", () => {
  const s = preset("vault-desk");
  s.entities[0].x = 12;
  s.entities[0].y = 14.15;
  s.entities[1].x = 12;
  s.entities[1].w = 1;
  s.entities[1].h = 2.2;
  s.actions = [
    { tick: 1, type: "move", id: "human", x: 0, y: -1 },
    { tick: 1, type: "vault", id: "human", target: "auto" },
  ];
  s.checks = [
    {
      name: "Northward vault",
      mode: "at",
      tick: 60,
      query: { type: "property", id: "human", field: "y" },
      op: "lte",
      expected: 11,
    },
  ];
  const r = new TestRunner(s, roadmap).run();
  assert.equal(r.status, "passed", JSON.stringify(r));
});
test("enabling natural spawns opens the arena's outside staging lane", () => {
  const s = emptyScenario();
  s.naturalSpawns = true;
  s.maxTicks = 303;
  s.checks = [
    {
      name: "Arrival",
      mode: "at",
      tick: 303,
      query: { type: "count", kind: "zombie" },
      op: "gte",
      expected: 3,
    },
  ];
  assert.equal(new TestRunner(s, roadmap).run().status, "passed");
});

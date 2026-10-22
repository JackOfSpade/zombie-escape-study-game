import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EQUIPMENT } from "../src/equipment";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario, parseScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

test("a scripted decoy uses native acoustic radius and duration and expires normally", () => {
  const s = emptyScenario();
  s.maxTicks = 601;
  s.actions = [{ type: "decoy", tick: 1, floor: 0, x: 15, y: 15 }];
  s.checks = [
    {
      name: "World advances",
      mode: "at",
      tick: 601,
      query: { type: "worldTime" },
      op: "gte",
      expected: 20,
    },
  ];
  const runner = new TestRunner(s, roadmap);
  runner.advance(1);
  assert.deepEqual(runner.game.effects, [
    {
      kind: "decoy",
      floor: 0,
      x: 15,
      y: 15,
      radius: EQUIPMENT.decoy.radius,
      until: EQUIPMENT.decoy.seconds,
    },
  ]);
  assert.equal(runner.run().status, "passed");
  assert.deepEqual(runner.game.effects, []);
});

test("scripted decoys reject invalid positions, floors, arbitrary options and motor simulations", () => {
  const s = emptyScenario();
  const decoy = { type: "decoy", tick: 1, floor: 0, x: 15, y: 15 };
  for (const patch of [
    { x: -1 },
    { y: NaN },
    { floor: 5 },
    { radius: 100 },
    { duration: Infinity },
  ])
    assert.throws(() =>
      parseScenario({ ...s, actions: [{ ...decoy, ...patch }] }),
    );
  assert.throws(() =>
    parseScenario({ ...s, simulation: "physics", actions: [decoy] }),
  );
});

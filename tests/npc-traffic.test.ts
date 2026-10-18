import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
test("reported opening seed sends every bot to its own reachable terminal without a reservation pileup", () => {
  const scenario = emptyScenario();
  Object.assign(scenario, {
    template: "building",
    layout: "forward",
    rules: "force-fields",
    seed: 78191111,
    simulation: "game",
    maxTicks: 450,
  });
  scenario.entities = [{ id: "human", kind: "player", x: 38, y: 26.5 }];
  const runner = new TestRunner(scenario, roadmap);
  const worked = new Set<string>();
  for (let tick = 0; tick < 450; tick++) {
    runner.advance(1);
    const g = runner.game;
    for (const a of g.survivors.slice(1)) {
      const s = g.floors[a.floor].stations.find((s) => s.id === a.station);
      if (
        s &&
        a.activity === "studying" &&
        Math.hypot(a.x - s.x, a.y - s.y) < 1.3 &&
        g.encounters[s.encounter].owner === a.id
      )
        worked.add(a.id);
    }
  }
  assert.equal(
    worked.size,
    19,
    JSON.stringify(
      runner.game.survivors
        .slice(1)
        .filter((a) => !worked.has(a.id))
        .map((a) => ({
          id: a.id,
          x: a.x,
          y: a.y,
          intent: a.intent,
          activity: a.activity,
          path: a.path.slice(0, 1),
        })),
    ),
  );
  assert.equal(runner.game.study.learner!.evidence.length, 0);
});

test("close-contact passing works in every orientation and either controller order", () => {
  for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315])
    for (const reversed of [false, true]) {
      const angle = (degrees * Math.PI) / 180,
        x = Math.cos(angle),
        y = Math.sin(angle);
      const s = emptyScenario();
      Object.assign(s, {
        simulation: "physics",
        rules: "force-fields",
        maxTicks: 90,
      });
      const people = [
        { id: "one", kind: "npc" as const, x: 20, y: 16 },
        { id: "two", kind: "npc" as const, x: 20 + x * 0.52, y: 16 + y * 0.52 },
      ];
      s.entities = [
        { id: "human", kind: "player", x: 3.5, y: 3.5 },
        ...(reversed ? people.slice().reverse() : people),
      ];
      s.actions = [
        { tick: 1, type: "move", id: "one", x, y },
        { tick: 1, type: "move", id: "two", x: -x, y: -y },
        { tick: 12, type: "checkpoint" },
      ];
      const r = new TestRunner(s, roadmap);
      for (let tick = 0; tick < 90; tick++) {
        r.advance(1);
        const a = r.game.survivors.find((a) => a.id === "one")!,
          b = r.game.survivors.find((a) => a.id === "two")!;
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 0.495);
      }
      const a = r.game.survivors.find((a) => a.id === "one")!,
        b = r.game.survivors.find((a) => a.id === "two")!;
      assert.ok(
        (a.x - 20) * x + (a.y - 16) * y > 3,
        `${degrees}/${reversed}: first bot stalled`,
      );
      assert.ok(
        (b.x - people[1].x) * x + (b.y - people[1].y) * y < -3,
        `${degrees}/${reversed}: second bot stalled`,
      );
    }
});

test("restored waiting bots abandon an already-owned solo destination and physically resume their own work", () => {
  const s = emptyScenario();
  Object.assign(s, {
    template: "building",
    layout: "forward",
    rules: "force-fields",
    seed: 78191111,
    simulation: "game",
    maxTicks: 900,
  });
  s.entities = [{ id: "human", kind: "player", x: 38, y: 26.5 }];
  const r = new TestRunner(s, roadmap);
  r.advance(450);
  const g = r.game,
    owner = g.survivors.find((a) => a.station && a.activity === "studying")!;
  const blocked = g.survivors
    .filter((a) => a.id !== owner.id && a.id !== "human")
    .slice(0, 3);
  for (const [i, a] of blocked.entries())
    Object.assign(a, {
      x: 21.4 - i * 0.2,
      y: 22.95 + i * 0.6,
      activity: "waiting",
      intent: owner.intent,
      station: undefined,
      path: [{ x: 20.5, y: 23.5 }],
      repath: 10,
    });
  const worked = new Set<string>();
  for (let tick = 0; tick < 450; tick++) {
    r.advance(1);
    for (const a of blocked) {
      const station = g.floors[0].stations.find((s) => s.id === a.station);
      if (
        station &&
        a.activity === "studying" &&
        g.encounters[station.encounter].owner === a.id &&
        Math.hypot(a.x - station.x, a.y - station.y) < 1.3
      )
        worked.add(a.id);
    }
  }
  assert.equal(worked.size, 3);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("crowds flow around an idle player at the normal spawn across multiple layouts", () => {
  for (const seed of [
    0, 1, 2, 42, 78191111, 3705527980, 2219683494, 4294967295,
  ]) {
    const s = emptyScenario();
    Object.assign(s, {
      template: "building",
      layout: "forward",
      rules: "force-fields",
      seed,
      simulation: "game",
      maxTicks: 300,
    });
    s.entities = [{ id: "human", kind: "player", x: 21.5, y: 26.5 }];
    const r = new TestRunner(s, roadmap);
    r.advance(300);
    const bots = r.game.survivors.slice(1);
    assert.equal(
      bots.filter((a) => a.y < 24.9).length,
      19,
      JSON.stringify({
        seed,
        stranded: bots
          .filter((a) => a.y >= 24.9)
          .map((a) => ({ id: a.id, x: a.x, y: a.y, portal: a.doorTraffic })),
      }),
    );
    assert.ok(bots.every((a) => a.alive));
    assert.equal(r.game.study.learner!.evidence.length, 0);
  }
});

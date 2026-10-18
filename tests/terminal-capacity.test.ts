import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { claimStation, complete, human, stairs, step } from "../src/engine";
import { CONFIG, type Game, type Roadmap, distance } from "../src/model";
import { survivorPath } from "../src/navigation";
import { decode, encode } from "../src/persistence";
import { solid } from "../src/spatial";
import { createGame } from "../src/world";

const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
const mandatory = (g: Game, floor: number) =>
  Object.values(g.encounters).filter(
    (e) => e.floor === floor && e.reward === "stairs",
  );

test("initial one-use mandatory capacity covers the population even if shared puzzles finish with lone solvers", () => {
  for (const seed of [1, 2, 3, 11, 42, 1337]) {
    const g = createGame(seed, roadmap);
    for (const f of g.floors.slice(0, CONFIG.floors)) {
      const tasks = mandatory(g, f.index);
      assert.ok(
        tasks.length >= g.survivors.length,
        `seed ${seed} floor ${f.index}: ${tasks.length} tasks for ${g.survivors.length} survivors`,
      );
      assert.equal(tasks.filter((e) => e.mode === "shared").length, 2);
      assert.equal(
        Object.values(g.encounters).filter(
          (e) => e.floor === f.index && e.reward === "loot",
        ).length,
        3,
      );
      for (const e of tasks) {
        const stations = f.stations.filter((s) => s.encounter === e.id);
        assert.equal(stations.length, e.mode === "shared" ? 5 : 1);
        assert.equal(e.state, "available");
        assert.equal(e.problem, undefined);
      }
    }
    assert.equal(g.floors[CONFIG.floors].stations.length, 0);
    assert.equal(g.study.visits.length, 0);
  }
});

test("added mandatory stations have clear footprints, distinct workspaces, spacing and legal routes through the actual furniture", () => {
  for (const seed of [1, 2, 3, 11, 42, 1337]) {
    const g = createGame(seed, roadmap);
    for (const f of g.floors.slice(0, CONFIG.floors)) {
      const extras = f.stations.filter((s) => s.encounter.includes("-access"));
      assert.equal(extras.length, 12);
      for (const s of extras) {
        assert.equal(solid(f, s), false, `${seed}/${s.id} blocked`);
        assert.ok(
          survivorPath(f, f.entry, s).length,
          `${seed}/${s.id} unreachable`,
        );
        for (const other of f.stations.filter((o) => o !== s))
          assert.ok(distance(s, other) >= 1.9, `${s.id} overlaps ${other.id}`);
      }
      g.encounters[extras[0].encounter].workspace = "my unfinished work";
      assert.equal(g.encounters[extras[1].encounter].workspace, "");
    }
  }
});

test("late human has an initial independent opportunity after nineteen lone NPC completions, without borrowing access or receiving academic credit", () => {
  const g = createGame(42, roadmap),
    a = human(g),
    learning = JSON.stringify(g.study);
  for (let floor = 0; floor < CONFIG.floors; floor++) {
    a.floor = floor;
    const tasks = mandatory(g, floor);
    assert.equal(tasks.length, 20);
    for (const [i, npc] of g.survivors.slice(1).entries()) {
      npc.floor = floor;
      assert.equal(
        complete(
          g,
          tasks[i].id,
          `controlled-${floor}-${i}`,
          [npc.id],
          "capacity fixture; no human evidence",
        ),
        true,
      );
    }
    assert.equal(a.access.includes(floor), false);
    Object.assign(a, g.floors[floor].stairs);
    assert.equal(stairs(g, a), false);
    const remaining = tasks.filter((e) => e.state !== "consumed");
    assert.equal(remaining.length, 1);
    const s = g.floors[floor].stations.find(
      (s) => s.encounter === remaining[0].id,
    )!;
    Object.assign(a, { x: s.x, y: s.y });
    assert.equal(claimStation(g, a, s.id), true);
    remaining[0].workspace = `late-human-floor-${floor}`;
    const saved = decode(encode(g));
    assert.ok(saved);
    assert.equal(
      saved.encounters[remaining[0].id].workspace,
      remaining[0].workspace,
    );
    assert.equal(saved.encounters[remaining[0].id].owner, "human");
    assert.equal(
      complete(
        g,
        remaining[0].id,
        `human-fixture-${floor}`,
        [a.id],
        "world-only fixture",
      ),
      true,
    );
    assert.equal(
      complete(
        g,
        remaining[0].id,
        `duplicate-${floor}`,
        ["npc-0"],
        "duplicate",
      ),
      false,
    );
    assert.ok(a.access.includes(floor));
  }
  assert.equal(JSON.stringify(g.study), learning);
});

test("capacity is established once at generation; stepping and reload never replenish consumed tasks or backfill old worlds", () => {
  const g = createGame(11, roadmap);
  for (const e of mandatory(g, 0))
    complete(g, e.id, `fixture-${e.id}`, ["npc-0"], "consumed fixture");
  const ids = Object.keys(g.encounters),
    stations = JSON.stringify(g.floors.map((f) => f.stations));
  // A legacy world is deliberately left with its original finite opportunities.
  for (const f of g.floors)
    f.stations = f.stations.filter((s) => !s.encounter.includes("-access"));
  for (const id of ids.filter((id) => id.includes("-access")))
    delete g.encounters[id];
  const legacyIds = Object.keys(g.encounters),
    legacyStations = JSON.stringify(g.floors.map((f) => f.stations));
  const saved = decode(encode(g));
  assert.ok(saved);
  saved.status = "playing";
  saved.nextSpawn = 999999;
  saved.survivors.forEach((a) => {
    a.escaped = true;
  });
  for (let i = 0; i < 30; i++) step(saved, 1 / 30);
  assert.deepEqual(Object.keys(saved.encounters), legacyIds);
  assert.equal(
    JSON.stringify(saved.floors.map((f) => f.stations)),
    legacyStations,
  );
  assert.ok(mandatory(saved, 0).every((e) => e.state === "consumed"));
  assert.notEqual(legacyStations, stations);
});

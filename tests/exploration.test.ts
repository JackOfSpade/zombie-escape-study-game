import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  restoreExplorationScenario,
  type ExplorationScenario,
} from "../scripts/lib/exploration-scenario";
import { doorFrame } from "../src/doors";
import { step } from "../src/engine";
import { doorwayGoal } from "../src/exploration";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { canSee } from "../src/visibility";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture(seed = 11) {
  const g = createGame(seed, r);
  g.status = "playing";
  g.zombies = [];
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  g.surge.anchor = 10000;
  g.survivors[0].escaped = true;
  g.survivors = g.survivors.slice(0, 2);
  const a = g.survivors[1],
    f = g.floors[0],
    door = f.furniture.find((o) => o.id === "f0-room0-door")!;
  Object.assign(a, {
    x: 20.5,
    y: door.y,
    role: "analyst",
    seen: [],
    path: [],
    target: undefined,
    intent: undefined,
  });
  return { g, a, f, door };
}
test("a door is entered only after actual crossing, not while selected or merely opened", () => {
  const { g, a, door } = fixture();
  step(g, 1 / 30);
  assert.ok(a.exploringDoor);
  assert.ok(!a.seen.includes(`entered-door-${door.id}`));
  assert.ok(a.target!.x < door.x - 0.5);
  let crossed = false;
  for (let i = 0; i < 600; i++) {
    step(g, 1 / 30);
    if (a.seen.includes(`entered-door-${door.id}`)) {
      crossed = true;
      assert.ok(a.x < doorFrame(door).x - 0.72);
      break;
    }
  }
  assert.equal(crossed, true);
  assert.ok(
    g.events.some(
      (e) =>
        e.type === "door" && e.actor === a.id && e.text.includes("released"),
    ),
  );
  assert.equal(g.study.learner?.evidence.length, 0);
});
test("legacy door-selected memory cannot suppress discovery through an alternating narrow dark passage", () => {
  const { g, a, f, door } = fixture(0);
  f.dark = 0.95;
  // Seed0 archive has its one-tile upper-left annex; the saved legacy marker
  // records selection, not entry. Remove only loose furniture for this geometry fixture.
  f.furniture = f.furniture.filter((o) => o.kind === "door");
  a.seen = [`explored-door-${door.id}`];
  const station = f.stations.find((s) => s.encounter === "f0-room0")!;
  assert.equal(canSee(f, a, station), false);
  for (
    let i = 0;
    i < 1800 && !a.seen.some((id) => id.startsWith("f0-room0-station"));
    i++
  )
    step(g, 1 / 30);
  assert.ok(a.seen.some((id) => id.startsWith("f0-room0-station")));
  assert.ok(a.seen.includes(`entered-door-${door.id}`));
  assert.ok(a.x < doorFrame(door).x - 0.72);
  assert.ok(f.stations.some((s) => a.seen.includes(s.id) && canSee(f, a, s)));
  for (let i = 0; i < 600 && a.x >= 13.3; i++) step(g, 1 / 30);
  assert.ok(a.x < 13.3);
  assert.equal(g.study.learner?.evidence.length, 0);
});
test("blocked crossing goals are not falsely visited and can retry; memory and pursuit survive reload", () => {
  const { g, a, f, door } = fixture(0);
  step(g, 1 / 30);
  const target = { ...a.target! };
  const seen = a.seen.length;
  // A wall introduced after choosing the destination makes the crossing unreachable.
  f.tiles[Math.floor(target.y)][Math.floor(target.x)] = 1;
  for (let i = 0; i < 170; i++) step(g, 1 / 30);
  assert.ok(!a.seen.includes(`entered-door-${door.id}`));
  assert.ok(a.failedExplore?.some((v) => Math.abs(v.point.x - door.x) < 0.01));
  const loaded = recover(decode(encode(g)));
  assert.deepEqual(loaded.survivors[1].failedExplore, a.failedExplore);
  assert.ok(a.seen.length >= seen);
  const another = fixture();
  step(another.g, 1 / 30);
  const resumed = recover(decode(encode(another.g)));
  assert.deepEqual(resumed.survivors[1].exploringDoor, another.a.exploringDoor);
});
test("door crossing geometry follows either orientation without using hidden stations", () => {
  const { a, f, door } = fixture();
  const first = doorwayGoal(f, a, door);
  f.stations = [];
  assert.deepEqual(doorwayGoal(f, a, door), first);
  const horizontal = { ...door, x: 21.5, y: 20.5, w: 3, h: 1 };
  Object.assign(a, { x: 21.5, y: 22.5 });
  f.furniture = [];
  assert.ok(doorwayGoal(f, a, horizontal)!.y < horizontal.y - 0.5);
});
test("captured missed-annex survivors discover the physically reachable room without learning credit or rescue shortcuts", () => {
  const snapshot: ExplorationScenario = JSON.parse(
    readFileSync("tests/fixtures/missed-annex.json", "utf8"),
  );
  const { g, survivors } = restoreExplorationScenario(r, snapshot),
    start = g.time;
  let discovered = false;
  for (let i = 0; i < 1800; i++) {
    step(g, 1 / 30);
    if (
      survivors.some((a) =>
        a.seen.some((id) => id.startsWith("f1-room0-station")),
      )
    ) {
      discovered = true;
      break;
    }
  }
  assert.equal(discovered, true, `No discovery after ${g.time - start}s`);
  const first = survivors.find((a) =>
    a.seen.some((id) => id.startsWith("f1-room0-station")),
  )!;
  assert.ok(first.x < 17);
  assert.equal(g.study.learner?.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
  assert.equal(
    g.encounters["f0-room1"].owner,
    snapshot.world.encounters["f0-room1"].owner,
  );
});

test("repeated physical fallback exploration keeps bounded memory instead of appending duplicate visits", () => {
  const { g, a, f } = fixture(0);
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  f.furniture = [];
  f.stations = [];
  Object.assign(a, { x: 21.5, y: 14.95 });
  for (let y = 3; y < 28; y += 2)
    for (let x = 3; x < 42; x += 2)
      a.seen.push(`explored-0-${x + 0.5}-${y + 0.5}`);
  const initial = a.seen.length;
  for (let i = 0; i < 9000; i++) step(g, 1 / 30);
  assert.ok(
    a.seen.length <= initial + 2,
    `${a.seen.length - initial} duplicate or unexpected memory entries`,
  );
  assert.equal(new Set(a.seen).size, a.seen.length);
  assert.equal(g.study.learner?.evidence.length, 0);
});

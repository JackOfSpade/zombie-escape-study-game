import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { restoreSurvivalScenario } from "../scripts/lib/survival-scenario";
import { step } from "../src/engine";
import { chooseFurnitureYield } from "../src/furniture-yield";
import type { Roadmap } from "../src/model";
import { distance } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { canPlace, path as gridPath, solid } from "../src/spatial";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = restoreSurvivalScenario(
      r,
      JSON.parse(
        readFileSync("tests/fixtures/furniture-crowding.json", "utf8"),
      ),
    ),
    a = g.survivors.find((a) => a.name === "Bo")!,
    f = g.floors[0],
    o = f.furniture.find((o) => o.id === "f0-room3-shelf5")!;
  return { g, a, f, o };
}

test("captured crowded room: a waiting NPC physically yields and cooperative cover finishes without teleportation or health bonuses", () => {
  const { g, a, f, o } = fixture(),
    start = { x: a.x, y: a.y },
    hp = o.hp,
    before = JSON.stringify(g),
    target = chooseFurnitureYield(g, a);
  assert.ok(target);
  assert.equal(JSON.stringify(g), before, "planning is read-only");
  const thought = a.thought;
  for (let i = 0; i < 450; i++) {
    const actorBefore = { x: a.x, y: a.y },
      objectBefore = { x: o.x, y: o.y };
    step(g, 1 / 30);
    assert.ok(distance(a, actorBefore) <= a.speed / 30 + 0.02);
    assert.ok(distance(o, objectBefore) <= (o.speed * 1.9) / 30 + 1e-6);
    assert.equal(solid(f, a), false);
    assert.ok(canPlace(f, o, o));
  }
  assert.ok(distance(a, start) > 0.3);
  const station = f.stations.find((s) => s.encounter === "f0-room3")!;
  const geometry = {
    ...f,
    furniture: f.furniture.map((x) =>
      x.kind === "door" ? { ...x, destroyed: true } : x,
    ),
  };
  assert.equal(
    gridPath(geometry, { x: 21.5, y: 23.5 }, station).length,
    0,
    "real moved cover seals the room approach",
  );
  assert.ok(o.credited.length >= 2, "actual helpers earn world contribution");
  assert.equal(
    o.credited.includes(a.id),
    false,
    "stepping aside alone is not defensive credit",
  );
  assert.equal(o.hp, hp);
  assert.ok(a.thought >= thought);
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
});

test("yielding uses visible living present movers, not hidden plans, dead survivors or finished furniture", () => {
  const { g, a, f, o } = fixture();
  assert.ok(chooseFurnitureYield(g, a));
  for (const b of g.survivors) if (b.defensePlan) b.alive = false;
  assert.equal(chooseFurnitureYield(g, a), undefined);
  for (const b of g.survivors)
    if (b.defensePlan) {
      b.alive = true;
      b.floor = 1;
    }
  assert.equal(chooseFurnitureYield(g, a), undefined);
  for (const b of g.survivors)
    if (b.defensePlan) {
      b.floor = 0;
      b.x = 40.5;
      b.y = 2.5;
    }
  assert.equal(chooseFurnitureYield(g, a), undefined);
  for (const b of g.survivors)
    if (b.defensePlan) {
      b.x = a.x;
      b.y = a.y + 1;
    }
  o.destroyed = true;
  assert.equal(chooseFurnitureYield(g, a), undefined);
  o.destroyed = false;
  for (const b of g.survivors) if (b.defensePlan) b.defensePlan.route = [];
  assert.equal(chooseFurnitureYield(g, a), undefined);
  assert.equal(f.index, 0);
});

test("yielding preserves the same unfinished task through reload and yields to immediate survival danger", () => {
  let { g, a } = fixture();
  a.intent = "f0-room3";
  g.encounters[a.intent].state = "in-progress";
  const progress = g.encounters[a.intent].npcProgress;
  step(g, 1 / 30);
  assert.ok(a.furnitureYield);
  assert.equal(a.intent, "f0-room3");
  g = recover(decode(encode(g)));
  a = g.survivors.find((b) => b.name === "Bo")!;
  const before = { x: a.x, y: a.y };
  step(g, 1 / 30);
  assert.ok(a.furnitureYield);
  assert.ok(distance(a, before) > 0);
  assert.equal(a.intent, "f0-room3");
  assert.equal(g.encounters[a.intent].npcProgress, progress);
  g.zombies = [
    {
      id: "immediate",
      x: a.x,
      y: a.y - 0.8,
      floor: 0,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 1,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  step(g, 1 / 30);
  assert.equal(a.activity, "fleeing");
  assert.equal(a.furnitureYield, undefined);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("a stale floor-scoped yielding destination is discarded without moving the human", () => {
  const { g, a } = fixture(),
    human = g.survivors[0],
    before = { x: human.x, y: human.y };
  a.furnitureYield = { floor: 1, target: { x: 3, y: 3 }, until: g.time + 10 };
  g.survivors = [human, a];
  step(g, 1 / 30);
  assert.equal(a.furnitureYield, undefined);
  assert.deepEqual({ x: human.x, y: human.y }, before);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { step } from "../src/engine";
import type { Roadmap, Station } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { chooseTaskStation } from "../src/task-strategy";
import { canSee } from "../src/visibility";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(7, r),
    a = actor("chooser", "Chooser", 2),
    f = g.floors[0];
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  g.surge.anchor = 10000;
  g.zombies = [];
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  f.furniture = [];
  Object.assign(a, {
    x: 10.5,
    y: 10.5,
    risk: 0.8,
    role: "analyst",
    social: 0.4,
  });
  const near: Station = {
      id: "remembered-near",
      encounter: "f0-room0",
      x: 16.5,
      y: 10.5,
    },
    far: Station = {
      id: "remembered-far",
      encounter: "f0-room1",
      x: 10.5,
      y: 18.5,
    };
  f.stations = [near, far];
  a.seen = [near.id, far.id];
  for (const s of f.stations) {
    const e = g.encounters[s.encounter];
    e.reward = "stairs";
    e.state = "available";
    delete e.owner;
  }
  return { g, a, f, near, far };
}
test("new task selection prefers a farther remembered safe route over a nearer route crossing a visible attacker", () => {
  const { g, a, f, near, far } = fixture();
  g.zombies = [
    {
      id: "visible",
      x: 15.7,
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
  const before = JSON.stringify(g.study),
    rng = g.rng;
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  assert.equal(g.rng, rng);
  assert.equal(JSON.stringify(g.study), before);
  step(g, 1 / 30);
  assert.equal(a.intent, far.encounter);
  assert.ok(a.y > 10.5);
  assert.equal(g.encounters[near.encounter].npcProgress, 0);
  assert.equal(g.study.learner!.evidence.length, 0);
});
test("a hidden enemy and an unseen terminal cannot influence task selection", () => {
  const { g, a, f, near, far } = fixture();
  f.furniture = [
    {
      id: "opaque",
      floor: 0,
      kind: "door",
      x: 14.5,
      y: 10.5,
      w: 1,
      h: 3,
      hp: 100,
      maxHp: 100,
      speed: 0,
      rotation: 0,
      destroyed: false,
      open: false,
      movers: [],
      moved: 0,
      credited: [],
      turning: 0,
    },
  ];
  const before = chooseTaskStation(g, a, f.stations)?.id;
  g.zombies = [
    {
      id: "hidden",
      x: 15.7,
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
  assert.equal(canSee(f, a, g.zombies[0]), false);
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, before);
  a.seen = [far.id];
  assert.equal(chooseTaskStation(g, a, [near, far])?.id, far.id);
  a.seen = [];
  assert.equal(chooseTaskStation(g, a, f.stations), undefined);
});
test("required access competes with loot according to actual need rather than distance alone", () => {
  const { g, a, f, near, far } = fixture();
  near.x = 11.5;
  far.x = 15.5;
  far.y = 10.5;
  g.encounters[near.encounter].reward = "loot";
  a.role = "medic";
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  a.hp = 30;
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, near.id);
  a.inventory = [{ id: "full", kind: "flare", weight: 3, charges: 1 }];
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
});
test("foreign ownership, consumed encounters and unreachable stations are not new work opportunities", () => {
  const { g, a, f, near, far } = fixture();
  g.encounters[near.encounter].mode = "solo";
  g.encounters[near.encounter].owner = "dead-other";
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  delete g.encounters[near.encounter].owner;
  g.encounters[near.encounter].state = "consumed";
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  g.encounters[near.encounter].state = "available";
  for (let y = 0; y < 34; y++) f.tiles[y][12] = 1;
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
});
test("an existing unfinished intent is retained instead of rerolling whenever a different candidate scores better", () => {
  const { g, a, f, near, far } = fixture();
  a.intent = near.encounter;
  a.thought = 7;
  g.encounters[near.encounter].state = "in-progress";
  near.x = 13.5;
  far.x = 11.5;
  far.y = 10.5;
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  step(g, 1 / 30);
  assert.equal(a.intent, near.encounter);
  assert.ok(a.thought >= 7);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("the physical follower retains the selected safer seat within the same shared puzzle", () => {
  const { g, a, f, near, far } = fixture();
  far.encounter = near.encounter;
  g.zombies = [
    {
      id: "visible",
      x: 15.7,
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
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  a.station = near.id; // Stale reservation from a discarded intention.
  step(g, 1 / 30);
  assert.equal(a.station, far.id);
  assert.ok(a.y > 10.5);
});

test("without a perceived threat, a shared puzzle keeps its established closest-seat behavior", () => {
  const { g, a, f, near, far } = fixture();
  far.encounter = near.encounter;
  for (let y = 5; y <= 15; y++) f.tiles[y][13] = 1;
  // The route-cost ranking favors the farther seat, but no observed danger
  // warrants changing the normal physical seating policy.
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  step(g, 1 / 30);
  assert.equal(a.intent, near.encounter);
  assert.equal(a.station, near.id);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("retreat resumption evaluates the retained safe seat rather than another seat's hazardous route", () => {
  const { g, a, near, far } = fixture();
  far.encounter = near.encounter;
  g.zombies = [
    {
      id: "visible",
      x: 15.7,
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
  a.intent = near.encounter;
  g.encounters[near.encounter].state = "in-progress";
  a.taskSearch = { floor: 0, seen: a.seen.length, after: 0, station: far.id };
  a.activity = "fleeing";
  a.fleeFloor = 0;
  a.fleeTarget = { x: a.x + 0.1, y: a.y };
  a.fleeUntil = 3;
  const loaded = recover(decode(encode(g))),
    resumed = loaded.survivors[1];
  step(loaded, 1 / 30);
  assert.equal(resumed.activity, "studying");
  assert.equal(resumed.station, far.id);
  assert.ok(resumed.y > 10.5);
  assert.equal(loaded.encounters[near.encounter].npcProgress, 0);
  assert.equal(loaded.study.learner!.evidence.length, 0);
});

test("a visible solo reservation is unavailable rather than a small route penalty, and fleeing releases it", () => {
  const { g, a, f, near, far } = fixture();
  const b = actor("reserved-peer", "Peer", 1);
  Object.assign(b, {
    x: 12,
    y: 10.5,
    station: near.id,
    intent: near.encounter,
    activity: "studying",
  });
  g.survivors.push(b);
  near.x = 12.5;
  far.x = 30.5;
  far.y = 10.5;
  g.encounters[near.encounter].mode = "solo";
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, far.id);
  b.activity = "fleeing";
  assert.equal(chooseTaskStation(g, a, f.stations)?.id, near.id);
});
